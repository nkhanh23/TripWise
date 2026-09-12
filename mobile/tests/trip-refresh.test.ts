import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import type { SavedTripDetail, TripId, UnresolvedSavedTripItem, UserId } from '../src/integration/contracts';
import { evaluatePlanConstraints } from '../src/integration/deterministicConstraintEngine';
import { IntegrationError } from '../src/integration/errors';
import { SupabaseAtomicTripRefreshApplyRepository } from '../src/integration/remote/supabaseTripRepositories';
import { optimizeItineraryRoutes } from '../src/integration/routeOptimization';
import {
  LatestTripRefreshProposalGenerator,
  TripRefreshCoordinator,
  createTripRefreshDiff,
  createTripRefreshProposal,
  type AtomicTripRefreshApplyCommand,
  type AtomicTripRefreshApplyRepository,
  type RefreshSessionContext,
  type TripRefreshProposal,
} from '../src/integration/tripRefresh';
import { applyWeatherSchedulingPolicy } from '../src/integration/weatherSchedulingPolicy';
import type { SavedTripsRepository } from '../src/integration/repositories';
import { parseSavedTripDetail } from '../src/integration/validation';

const OWNER_A = '11111111-1111-4111-8111-111111111111' as UserId;
const OWNER_B = '22222222-2222-4222-8222-222222222222' as UserId;
const TRIP = '33333333-3333-4333-8333-333333333333' as TripId;
const DAY_1 = '44444444-4444-4444-8444-444444444441' as never;
const DAY_2 = '44444444-4444-4444-8444-444444444442' as never;
const ITEM_A = '55555555-5555-4555-8555-555555555551' as never;
const ITEM_B = '55555555-5555-4555-8555-555555555552' as never;
const ITEM_C = '55555555-5555-4555-8555-555555555553' as never;
const ITEM_D = '55555555-5555-4555-8555-555555555554' as never;
const sessionA: RefreshSessionContext = { ownerId: OWNER_A, sessionId: 'session-owner-a' };
const sessionB: RefreshSessionContext = { ownerId: OWNER_B, sessionId: 'session-owner-b' };
const CREATED_AT = '2028-01-01T00:00:00.000Z';

function item(
  id: string,
  position: number,
  overrides: Partial<Omit<UnresolvedSavedTripItem, 'id' | 'position' | 'resolution' | 'latitude' | 'longitude'>> = {},
): UnresolvedSavedTripItem {
  return {
    id: id as never,
    position,
    itemKind: 'custom_activity',
    flexibility: 'flexible',
    priority: 'want_to_do',
    activityStatus: 'scheduled',
    placeName: `Item ${id.slice(-1)}`,
    resolution: 'UNRESOLVED',
    latitude: null,
    longitude: null,
    ...overrides,
  };
}

function baseline(revision: number | undefined = 7): SavedTripDetail {
  return {
    id: TRIP,
    title: 'Reviewed trip',
    destination: 'Hue',
    startDate: '2028-01-01',
    endDate: '2028-01-02',
    estimatedBudget: null,
    currency: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...(revision === undefined ? {} : { workspaceRevision: revision }),
    days: [
      {
        id: DAY_1,
        dayNumber: 1,
        date: '2028-01-01',
        items: [
          item(ITEM_A, 1, { flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' }),
          item(ITEM_B, 2),
          item(ITEM_C, 3, { priority: 'must_do' }),
        ],
      },
      { id: DAY_2, dayNumber: 2, date: '2028-01-02', items: [item(ITEM_D, 1, { priority: 'optional' })] },
    ],
  };
}

function movedFlexible(source = baseline()): SavedTripDetail {
  const proposed = structuredClone(source);
  const moved = proposed.days[0].items.splice(1, 1)[0];
  proposed.days[0].items.forEach((value, index) => { value.position = index + 1; });
  moved.position = 2;
  proposed.days[1].items.push(moved);
  return proposed;
}

function proposalInput(proposed = movedFlexible(), source = baseline()) {
  return { session: sessionA, baseline: source, proposed, createdAt: CREATED_AT };
}

function savedTrips(getDetail = jest.fn().mockResolvedValue(baseline())): SavedTripsRepository {
  return {
    getDetail,
    list: jest.fn(),
    updateItemNote: jest.fn(),
    deleteTrip: jest.fn(),
    getStats: jest.fn(),
  };
}

function applyRepo(applyReviewedProposal = jest.fn().mockResolvedValue({ revision: 8 })): AtomicTripRefreshApplyRepository {
  return { applyReviewedProposal };
}

function command(proposal: TripRefreshProposal) {
  return {
    proposalId: proposal.proposalId,
    confirmationId: proposal.confirmationId,
    tripId: proposal.tripId,
    expectedBaselineRevision: proposal.baselineWorkspaceRevision,
  };
}

function opened(coordinator: TripRefreshCoordinator, proposed = movedFlexible()): TripRefreshProposal {
  const result = coordinator.open(proposalInput(proposed));
  if (!result.proposal) throw new Error(`Expected proposal, got ${result.status}`);
  return result.proposal;
}

describe('P5-T004 proposal, version and deterministic diff', () => {
  it('1. valid baseline creates a proposal with no repository writes', () => {
    const persist = jest.fn();
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(persist));
    expect(coordinator.open(proposalInput()).status).toBe('ready');
    expect(persist).not.toHaveBeenCalled();
  });

  it('1a. normalized repository output remains valid at the proposal boundary without persistence', () => {
    const raw = structuredClone(baseline()) as unknown as {
      days: Array<{ items: Array<Record<string, unknown>> }>;
    };
    for (const day of raw.days) {
      for (const rawItem of day.items) {
        delete rawItem.latitude;
        delete rawItem.longitude;
      }
    }
    const normalized = parseSavedTripDetail(raw);
    expect(normalized).not.toBeNull();
    expect(normalized!.days.flatMap((day) => day.items).every((candidate) =>
      candidate.resolution === 'UNRESOLVED' && candidate.latitude === null && candidate.longitude === null)).toBe(true);
    const persist = jest.fn();
    const result = new TripRefreshCoordinator(savedTrips(), applyRepo(persist)).open(
      proposalInput(movedFlexible(normalized!), normalized!),
    );
    expect(result.status).toBe('ready');
    expect(result.proposal).not.toBeNull();
    expect(persist).not.toHaveBeenCalled();
  });

  it('2. proposal is tied to the exact trip ID', () => {
    const result = createTripRefreshProposal(proposalInput());
    expect(result.proposal?.tripId).toBe(TRIP);
  });

  it('3. proposal is tied to the exact workspace revision', () => {
    expect(createTripRefreshProposal(proposalInput()).proposal?.baselineWorkspaceRevision).toBe(7);
  });

  it('4. missing workspace revision fails safely', () => {
    const source = baseline();
    delete source.workspaceRevision;
    const result = createTripRefreshProposal(proposalInput(movedFlexible(source), source));
    expect(result).toMatchObject({ status: 'invalid_input', proposal: null });
  });

  it('5. diff is deterministic and ordered by stable item ID', () => {
    const first = createTripRefreshDiff(baseline(), movedFlexible());
    const second = createTripRefreshDiff(structuredClone(baseline()), structuredClone(movedFlexible()));
    expect(first).toEqual(second);
    expect(first.items.map((value) => value.itemId)).toEqual([ITEM_A, ITEM_B, ITEM_C, ITEM_D]);
  });

  it('6. unchanged proposal has a machine-readable no-op diff', () => {
    const result = createTripRefreshProposal(proposalInput(baseline()));
    expect(result).toMatchObject({ status: 'no_op', proposal: { diff: { isNoOp: true } } });
    expect(result.proposal?.diff.items.every((value) => value.changeKinds[0] === 'retained')).toBe(true);
  });

  it.each([
    ['7. FIXED move', (candidate: SavedTripDetail) => {
      const fixed = candidate.days[0].items.shift()!;
      candidate.days[0].items.forEach((value, index) => { value.position = index + 1; });
      fixed.position = 2;
      candidate.days[1].items.push(fixed);
    }, 'FIXED_DAY_CHANGED'],
    ['8. FIXED removal', (candidate: SavedTripDetail) => {
      candidate.days[0].items.shift();
      candidate.days[0].items.forEach((value, index) => { value.position = index + 1; });
    }, 'FIXED_ITEM_DROPPED'],
    ['9. MUST_DO removal', (candidate: SavedTripDetail) => {
      candidate.days[0].items.splice(2, 1);
    }, 'MUST_DO_DROPPED'],
    ['10. MUST_DO downgrade', (candidate: SavedTripDetail) => {
      candidate.days[0].items[2].priority = 'optional';
    }, 'MUST_DO_DOWNGRADED'],
  ] as const)('%s is rejected by T001', (_name, mutate, conflict) => {
    const candidate = baseline();
    mutate(candidate);
    const result = createTripRefreshProposal(proposalInput(candidate));
    expect(result.status).toBe('protected_constraint_conflict');
    expect(result.conflicts.some((value) => value.code === conflict)).toBe(true);
  });

  it('11. valid flexible movement becomes confirmable', () => {
    expect(createTripRefreshProposal(proposalInput())).toMatchObject({
      status: 'ready', proposal: { status: 'confirmable', diff: { isNoOp: false } },
    });
  });

  it('12. opening a proposal performs no read or write', () => {
    const read = jest.fn(); const write = jest.fn();
    new TripRefreshCoordinator(savedTrips(read), applyRepo(write)).open(proposalInput());
    expect(read).not.toHaveBeenCalled(); expect(write).not.toHaveBeenCalled();
  });

  it('13. recomputing a proposal performs no persistence and keeps identity stable', () => {
    const write = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(write));
    const first = coordinator.open(proposalInput()).proposal;
    const second = coordinator.open({ ...proposalInput(), createdAt: '2028-01-01T01:00:00.000Z' }).proposal;
    expect(second?.proposalId).toBe(first?.proposalId);
    expect(write).not.toHaveBeenCalled();
  });

  it('14. confirm is required before the apply boundary is crossed', () => {
    const write = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(write));
    opened(coordinator);
    expect(write).not.toHaveBeenCalled();
  });

  it('15. diff classifies add, remove, movement, time and metadata changes', () => {
    const candidate = movedFlexible();
    candidate.days[0].items[1].startTime = '11:00';
    candidate.days[0].items[1].placeName = 'Changed';
    candidate.days[1].items.splice(0, 1);
    candidate.days[1].items.push(item('66666666-6666-4666-8666-666666666666', 2));
    const diff = createTripRefreshDiff(baseline(), candidate);
    expect(diff.items.find((value) => value.itemId === ITEM_B)?.changeKinds).toContain('moved');
    expect(diff.items.find((value) => value.itemId === ITEM_C)?.changeKinds).toEqual(expect.arrayContaining(['scheduling_time_changed', 'metadata_changed']));
    expect(diff.items.find((value) => value.itemId === ITEM_D)?.changeKinds).toEqual(['removed']);
    expect(diff.items.at(-1)?.changeKinds).toEqual(['added']);
  });

  it('16. metadata changes are rejected instead of receiving a new executable identity', () => {
    const candidate = movedFlexible(); candidate.days[1].items[1].placeName = 'Different reviewed data';
    expect(createTripRefreshProposal(proposalInput(candidate))).toMatchObject({ status: 'invalid_proposal', proposal: null });
  });

  it.each(['title', 'trip_id', 'day_identity', 'day_summary'] as const)('17. unsupported envelope tampering %s is an invalid proposal', (kind) => {
    const candidate = movedFlexible();
    if (kind === 'title') candidate.title = 'Arbitrary replacement';
    if (kind === 'trip_id') candidate.id = '77777777-7777-4777-8777-777777777777' as TripId;
    if (kind === 'day_identity') candidate.days[0].id = '77777777-7777-4777-8777-777777777771' as never;
    if (kind === 'day_summary') candidate.days[0].summary = 'Changed outside narrow refresh graph';
    expect(createTripRefreshProposal(proposalInput(candidate)).status).toBe('invalid_proposal');
  });

  it('18. returned proposal snapshot is frozen against post-review mutation', () => {
    const proposal = createTripRefreshProposal(proposalInput()).proposal!;
    expect(Object.isFrozen(proposal)).toBe(true);
    expect(Object.isFrozen(proposal.proposed.days[0].items[0])).toBe(true);
  });

  it('19. provider snapshot tampering, self-certification, item-kind and lifecycle changes are invalid proposals', () => {
    const verifiedBaseline = baseline();
    verifiedBaseline.days[0].items[1] = {
      ...item(ITEM_B, 2),
      itemKind: 'place', resolution: 'VERIFIED', googlePlaceId: 'google-place-b' as never, latitude: 16.1, longitude: 108.1,
      placeAddress: 'Verified address', placeCategory: 'museum', placeResolvedAt: CREATED_AT,
    };
    const providerSpoof = movedFlexible(verifiedBaseline); providerSpoof.days[1].items[1].latitude = 15.9;
    expect(createTripRefreshProposal(proposalInput(providerSpoof, verifiedBaseline)).status).toBe('invalid_proposal');

    const unresolvedSpoof = movedFlexible();
    Object.assign(unresolvedSpoof.days[1].items[1] as object, {
      resolution: 'VERIFIED', googlePlaceId: 'forged', latitude: 1, longitude: 1, placeResolvedAt: CREATED_AT,
    });
    expect(createTripRefreshProposal(proposalInput(unresolvedSpoof)).status).toBe('invalid_proposal');

    const kindSpoof = movedFlexible(); kindSpoof.days[1].items[1].itemKind = 'note';
    expect(createTripRefreshProposal(proposalInput(kindSpoof)).status).toBe('invalid_proposal');
    const lifecycleSpoof = movedFlexible(); lifecycleSpoof.days[1].items[1].activityStatus = 'completed';
    expect(createTripRefreshProposal(proposalInput(lifecycleSpoof)).status).toBe('invalid_proposal');
  });

  it('20. timed and confirmed-reservation items are schedule barriers', () => {
    const timed = baseline(); timed.days[0].items[1].startTime = '11:00';
    expect(createTripRefreshProposal(proposalInput(movedFlexible(timed), timed)).status).toBe('invalid_proposal');
    const reserved = baseline(); reserved.days[0].items[1].contact = { reservationCode: 'CONFIRMED-42' };
    expect(createTripRefreshProposal(proposalInput(movedFlexible(reserved), reserved)).status).toBe('invalid_proposal');
  });
});

describe('P5-T004 explicit confirmation, idempotency and conflict', () => {
  it('19. confirm applies the exact reviewed snapshot once', async () => {
    const apply = jest.fn().mockResolvedValue({ revision: 8 });
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'success', revision: 8, mutationCount: 1 });
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({
      proposalId: proposal.proposalId,
      confirmationId: proposal.confirmationId,
      idempotencyKey: proposal.confirmationId,
      reviewedMutation: proposal.mutation,
    }), expect.any(AbortSignal));
  });

  it('20. stale authoritative revision returns conflict and performs zero mutation', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(jest.fn().mockResolvedValue(baseline(8))), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'stale_baseline_revision', mutationCount: 0 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('21. stale conflict is never automatically replayed', async () => {
    const read = jest.fn().mockResolvedValue(baseline(8)); const apply = jest.fn();
    const coordinator = new TripRefreshCoordinator(savedTrips(read), applyRepo(apply));
    const proposal = opened(coordinator);
    await coordinator.confirm(command(proposal), sessionA);
    expect(read).toHaveBeenCalledTimes(1); expect(apply).not.toHaveBeenCalled();
  });

  it('22. exact duplicate confirm after success does not apply twice', async () => {
    const apply = jest.fn().mockResolvedValue({ revision: 8 }); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await coordinator.confirm(command(proposal), sessionA);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'proposal_already_applied', revision: 8, mutationCount: 0 });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('23. concurrent duplicate confirms produce one read and one effective apply', async () => {
    let resolve!: (value: { revision: number }) => void;
    const apply = jest.fn().mockImplementation(() => new Promise((done) => { resolve = done; }));
    const read = jest.fn().mockResolvedValue(baseline());
    const coordinator = new TripRefreshCoordinator(savedTrips(read), applyRepo(apply));
    const proposal = opened(coordinator);
    const first = coordinator.confirm(command(proposal), sessionA);
    const second = coordinator.confirm(command(proposal), sessionA);
    await Promise.resolve(); await Promise.resolve();
    expect(first).toBe(second);
    resolve({ revision: 8 });
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ status: 'success' }), expect.objectContaining({ status: 'success' }),
    ]);
    expect(read).toHaveBeenCalledTimes(1); expect(apply).toHaveBeenCalledTimes(1);
  });

  it('24. retry after ambiguous failure preserves the exact idempotency identity', async () => {
    const apply = jest.fn().mockRejectedValueOnce(new IntegrationError('network')).mockResolvedValueOnce({ revision: 8 });
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'persistence_failure' });
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'success' });
    expect(apply.mock.calls[0][0].idempotencyKey).toBe(proposal.confirmationId);
    expect(apply.mock.calls[1][0].idempotencyKey).toBe(proposal.confirmationId);
  });

  it.each(['proposal', 'confirmation', 'trip', 'revision'] as const)('25. altered %s identifier is rejected before read/apply', async (field) => {
    const read = jest.fn(); const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(read), applyRepo(apply));
    const proposal = opened(coordinator); const altered = { ...command(proposal) };
    if (field === 'proposal') altered.proposalId = 'refresh-v1-deadbeefdeadbeef';
    if (field === 'confirmation') altered.confirmationId = 'confirm-v1-deadbeefdeadbeef';
    if (field === 'trip') altered.tripId = '77777777-7777-4777-8777-777777777777' as TripId;
    if (field === 'revision') altered.expectedBaselineRevision += 1;
    await expect(coordinator.confirm(altered, sessionA)).resolves.toMatchObject({
      status: field === 'proposal' ? 'proposal_not_found' : 'invalid_confirmation', mutationCount: 0,
    });
    expect(read).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
  });

  it('26. a no-op proposal confirms without a mutation', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator, baseline());
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'no_op', revision: 7, mutationCount: 0 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('27. repository CAS conflict is stale and never retried', async () => {
    const apply = jest.fn().mockRejectedValue(new IntegrationError('conflict'));
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'stale_baseline_revision', mutationCount: 0 });
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('28. persistence failure retains the authoritative baseline and reports no success', async () => {
    const source = baseline(); const apply = jest.fn().mockRejectedValue(new IntegrationError('persistenceFailed'));
    const coordinator = new TripRefreshCoordinator(savedTrips(jest.fn().mockResolvedValue(source)), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'persistence_failure', mutationCount: 0 });
    expect(source).toEqual(baseline());
  });

  it('29. no partial client-side atomic sequence exists', async () => {
    const apply = jest.fn().mockResolvedValue({ revision: 8 }); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator); await coordinator.confirm(command(proposal), sessionA);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0]).toHaveProperty('reviewedMutation', proposal.mutation);
  });

  it('30. invalid current session is rejected before persistence', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), { ...sessionA, sessionId: 'x' })).resolves.toMatchObject({ status: 'invalid_confirmation' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('31. an effective result with unchanged revision is a persistence failure, while explicit server no-op is accepted', async () => {
    const unchanged = jest.fn().mockResolvedValue({ revision: 7 });
    const failed = new TripRefreshCoordinator(savedTrips(), applyRepo(unchanged));
    await expect(failed.confirm(command(opened(failed)), sessionA)).resolves.toMatchObject({ status: 'persistence_failure', mutationCount: 0 });

    const noOp = jest.fn().mockResolvedValue({ revision: 7, noOp: true });
    const accepted = new TripRefreshCoordinator(savedTrips(), applyRepo(noOp));
    await expect(accepted.confirm(command(opened(accepted)), sessionA)).resolves.toMatchObject({ status: 'no_op', revision: 7, mutationCount: 0 });
  });
});

describe('P5-T004 cancellation, stale user and accepted-stage compatibility', () => {
  it('31. pre-cancelled generation never invokes a stage builder', async () => {
    const generator = new LatestTripRefreshProposalGenerator(); const builder = jest.fn(); const controller = new AbortController(); controller.abort();
    await expect(generator.generate({ session: sessionA, baseline: baseline(), createdAt: CREATED_AT }, builder, controller.signal)).resolves.toMatchObject({ status: 'cancelled', proposal: null });
    expect(builder).not.toHaveBeenCalled();
  });

  it('32. in-flight cancelled generation cannot publish a proposal', async () => {
    let resolve!: (value: { proposed: SavedTripDetail }) => void;
    const generator = new LatestTripRefreshProposalGenerator();
    const pending = generator.generate({ session: sessionA, baseline: baseline(), createdAt: CREATED_AT }, () => new Promise((done) => { resolve = done; }));
    generator.cancel(); resolve({ proposed: movedFlexible() });
    await expect(pending).resolves.toMatchObject({ status: 'cancelled', proposal: null });
  });

  it('33. late older generation result is superseded by newer result', async () => {
    let resolveOld!: (value: { proposed: SavedTripDetail }) => void;
    const generator = new LatestTripRefreshProposalGenerator();
    const old = generator.generate({ session: sessionA, baseline: baseline(), createdAt: CREATED_AT }, () => new Promise((done) => { resolveOld = done; }));
    const current = generator.generate({ session: sessionA, baseline: baseline(), createdAt: CREATED_AT }, async () => ({ proposed: movedFlexible() }));
    await expect(current).resolves.toMatchObject({ status: 'ready' });
    resolveOld({ proposed: baseline() });
    await expect(old).resolves.toMatchObject({ status: 'superseded', proposal: null });
  });

  it('34. owner change cannot confirm owner A proposal', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionB)).resolves.toMatchObject({ status: 'invalid_confirmation' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('35. session rotation cannot confirm an old reviewed proposal', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), { ownerId: OWNER_A, sessionId: 'new-session-a' })).resolves.toMatchObject({ status: 'invalid_confirmation' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('36. clearing a signed-out session expires its in-memory proposal', async () => {
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo()); const proposal = opened(coordinator);
    coordinator.clearSession(sessionA);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'proposal_not_found' });
  });

  it('37. T001 validates the final proposal against its exact baseline', () => {
    const proposal = createTripRefreshProposal(proposalInput()).proposal!;
    expect(evaluatePlanConstraints(proposal.proposed, proposal.baseline).isValid).toBe(true);
  });

  it('38. accepted T002 can evaluate the snapshot without refresh duplicating OSRM', async () => {
    const proposal = createTripRefreshProposal(proposalInput()).proposal!;
    const routes = { getRoute: jest.fn(), getTable: jest.fn() };
    const result = await optimizeItineraryRoutes(proposal.proposed, routes);
    expect(result.validation?.isValid).toBe(true);
    expect(routes.getTable).not.toHaveBeenCalled();
  });

  it('39. accepted T003 can evaluate explicit normalized input without refresh duplicating weather fetch', () => {
    const proposal = createTripRefreshProposal(proposalInput()).proposal!;
    const result = applyWeatherSchedulingPolicy(proposal.proposed, [], { localToday: '2028-01-01' }, {
      coordinate: { latitude: 16, longitude: 107 }, forecast: null,
    });
    expect(result.status).toBe('no_weather_sensitive_items');
  });

  it('40. route/weather stage provenance is bound into proposal identity without provider refetch', () => {
    const stages = [{ stage: 'route_aware' as const, outcome: 'already_optimal' }, { stage: 'weather_aware' as const, outcome: 'forecast_unavailable' }];
    const result = createTripRefreshProposal({ ...proposalInput(), stages });
    expect(result.proposal?.stages).toEqual(stages);
    expect(result.proposal?.proposalId).not.toBe(createTripRefreshProposal(proposalInput()).proposal?.proposalId);
  });

  it('41. failed provider stage cannot silently rewrite or persist baseline', async () => {
    const source = baseline(); const generator = new LatestTripRefreshProposalGenerator();
    const result = await generator.generate({ session: sessionA, baseline: source, createdAt: CREATED_AT }, async () => { throw new IntegrationError('providerUnavailable'); });
    expect(result).toMatchObject({ status: 'invalid_proposal', proposal: null });
    expect(source).toEqual(baseline());
  });

  it('42. pre-cancelled confirmation performs zero reads and writes', async () => {
    const read = jest.fn(); const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(read), applyRepo(apply));
    const proposal = opened(coordinator); const controller = new AbortController(); controller.abort();
    await expect(coordinator.confirm(command(proposal), sessionA, controller.signal)).resolves.toMatchObject({ status: 'cancelled', mutationCount: 0 });
    expect(read).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
  });

  it('43. authoritative trip disappearance is a stale-baseline conflict', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(jest.fn().mockResolvedValue(null)), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'stale_baseline_revision', mutationCount: 0 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('44. authoritative read failure never crosses the mutation boundary', async () => {
    const apply = jest.fn(); const coordinator = new TripRefreshCoordinator(savedTrips(jest.fn().mockRejectedValue(new IntegrationError('network'))), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'persistence_failure', mutationCount: 0 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('45. identical reviewed input returns an identical proposal result', () => {
    expect(createTripRefreshProposal(proposalInput())).toEqual(createTripRefreshProposal(proposalInput()));
  });

  it('46. invalid canonical proposal input is classified without throwing', () => {
    const candidate = movedFlexible();
    candidate.days[0].items[1].position = 99;
    expect(createTripRefreshProposal(proposalInput(candidate))).toMatchObject({ status: 'invalid_proposal', proposal: null });
  });

  it('47. invalid apply response cannot be published as success', async () => {
    const apply = jest.fn().mockResolvedValue({ revision: Number.NaN });
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    await expect(coordinator.confirm(command(proposal), sessionA)).resolves.toMatchObject({ status: 'persistence_failure', mutationCount: 0 });
  });

  it('48. clearing the active owner session aborts and suppresses an in-flight confirmation result', async () => {
    let resolve!: (value: { revision: number }) => void;
    const apply = jest.fn().mockImplementation((_command, signal?: AbortSignal) => new Promise((done, reject) => {
      resolve = done;
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const coordinator = new TripRefreshCoordinator(savedTrips(), applyRepo(apply));
    const proposal = opened(coordinator);
    const pending = coordinator.confirm(command(proposal), sessionA);
    await Promise.resolve(); await Promise.resolve();
    coordinator.clearSession(sessionA);
    await expect(pending).resolves.toMatchObject({ status: 'cancelled', mutationCount: 0 });
    resolve({ revision: 8 });
  });

  it('49. stage metadata has an explicit hard bound', () => {
    const stages = Array.from({ length: 9 }, (_, index) => ({ stage: 'caller_provided' as const, outcome: `stage-${index}` }));
    expect(createTripRefreshProposal({ ...proposalInput(), stages })).toMatchObject({ status: 'invalid_input', proposal: null });
  });
});

describe('SupabaseAtomicTripRefreshApplyRepository production adapter', () => {
  const sampleApplyCommand: AtomicTripRefreshApplyCommand = {
    proposalId: 'refresh-v1-test-proposal',
    confirmationId: 'confirm-v1-test-proposal',
    idempotencyKey: 'confirm-v1-test-proposal',
    tripId: TRIP,
    expectedRevision: 7,
    reviewedMutation: {
      items: [
        { itemId: ITEM_A, dayId: DAY_1, position: 1 },
        { itemId: ITEM_B, dayId: DAY_1, position: 2 },
      ],
    },
  };

  it('50. calls exact apply_trip_refresh RPC with exact schedule-only payload', async () => {
    const rpc = jest.fn().mockReturnValue({
      abortSignal: jest.fn().mockResolvedValue({ data: { revision: 8, noOp: false }, error: null }),
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

    const result = await repository.applyReviewedProposal(sampleApplyCommand);

    expect(result).toEqual({ revision: 8 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('apply_trip_refresh', {
      p_command: {
        tripId: TRIP,
        expectedRevision: 7,
        proposalId: 'refresh-v1-test-proposal',
        confirmationId: 'confirm-v1-test-proposal',
        idempotencyKey: 'confirm-v1-test-proposal',
        items: [
          { itemId: ITEM_A, dayId: DAY_1, position: 1 },
          { itemId: ITEM_B, dayId: DAY_1, position: 2 },
        ],
      },
    });
  });

  it('51. preserves noOp boolean in result when server returns no-op', async () => {
    const rpc = jest.fn().mockReturnValue({
      abortSignal: jest.fn().mockResolvedValue({ data: { revision: 7, noOp: true }, error: null }),
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

    const result = await repository.applyReviewedProposal(sampleApplyCommand);
    expect(result).toEqual({ revision: 7, noOp: true });
  });

  it('52. propagates AbortSignal and rejects when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const rpc = jest.fn();
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

    await expect(repository.applyReviewedProposal(sampleApplyCommand, controller.signal))
      .rejects.toMatchObject({ code: 'cancelled' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('53. maps TW015 through TW021 to safe sanitized IntegrationErrors', async () => {
    const cases: Array<[string, string]> = [
      ['TW015', 'unauthorized'],
      ['TW016', 'invalidRequest'],
      ['TW017', 'notFound'],
      ['TW018', 'conflict'],
      ['TW019', 'conflict'],
      ['TW020', 'invalidRequest'],
      ['TW021', 'persistenceFailed'],
    ];

    for (const [sqlstate, expectedCode] of cases) {
      const rpc = jest.fn().mockReturnValue({
        abortSignal: jest.fn().mockResolvedValue({ data: null, error: { code: sqlstate, message: 'DB message' } }),
      });
      const client = { rpc } as unknown as SupabaseClient<Database>;
      const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

      await expect(repository.applyReviewedProposal(sampleApplyCommand))
        .rejects.toMatchObject({ code: expectedCode });
    }
  });

  it('54. rejects invalid or malformed server responses', async () => {
    const badResponses = [
      null,
      'invalid',
      [],
      { revision: 'not-a-number' },
      { revision: 0 },
      { revision: -1 },
      { revision: 8, noOp: 'not-a-boolean' },
    ];

    for (const data of badResponses) {
      const rpc = jest.fn().mockReturnValue({
        abortSignal: jest.fn().mockResolvedValue({ data, error: null }),
      });
      const client = { rpc } as unknown as SupabaseClient<Database>;
      const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

      await expect(repository.applyReviewedProposal(sampleApplyCommand))
        .rejects.toMatchObject({ code: 'invalidResponse' });
    }
  });

  it('55. never retries a revision conflict (TW018)', async () => {
    let callCount = 0;
    const rpc = jest.fn().mockImplementation(() => {
      callCount += 1;
      return {
        abortSignal: jest.fn().mockResolvedValue({ data: null, error: { code: 'TW018', message: 'Stale' } }),
      };
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

    await expect(repository.applyReviewedProposal(sampleApplyCommand))
      .rejects.toMatchObject({ code: 'conflict' });
    expect(callCount).toBe(1);
  });

  it('56. never retries invalid request (TW016/TW020) or idempotency conflict (TW019)', async () => {
    for (const code of ['TW016', 'TW019', 'TW020']) {
      let callCount = 0;
      const rpc = jest.fn().mockImplementation(() => {
        callCount += 1;
        return {
          abortSignal: jest.fn().mockResolvedValue({ data: null, error: { code, message: 'Err' } }),
        };
      });
      const client = { rpc } as unknown as SupabaseClient<Database>;
      const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

      await expect(repository.applyReviewedProposal(sampleApplyCommand))
        .rejects.toBeInstanceOf(IntegrationError);
      expect(callCount).toBe(1);
    }
  });

  it('57. retries ambiguous transport error with the exact same idempotency identity and payload', async () => {
    const calls: Array<{ functionName: string; args: unknown }> = [];
    let attempt = 0;
    const rpc = jest.fn((functionName: string, args: unknown) => {
      calls.push({ functionName, args });
      attempt += 1;
      return {
        abortSignal: async () => attempt === 1
          ? Promise.reject(new TypeError('network timeout'))
          : { data: { revision: 8, noOp: false }, error: null },
      };
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseAtomicTripRefreshApplyRepository(client);

    const result = await repository.applyReviewedProposal(sampleApplyCommand);

    expect(result).toEqual({ revision: 8 });
    expect(calls).toHaveLength(2);
    expect(calls[0].functionName).toBe('apply_trip_refresh');
    expect(calls[1].functionName).toBe('apply_trip_refresh');
    expect(calls[0].args).toEqual(calls[1].args);
    const firstPayload = (calls[0].args as { p_command: Record<string, unknown> }).p_command;
    expect(firstPayload.confirmationId).toBe('confirm-v1-test-proposal');
    expect(firstPayload.idempotencyKey).toBe('confirm-v1-test-proposal');
  });
});
