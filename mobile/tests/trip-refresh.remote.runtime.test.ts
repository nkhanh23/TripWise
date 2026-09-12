import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import type { SavedTripDetail, TripId, UserId } from '../src/integration/contracts';
import { IntegrationError } from '../src/integration/errors';
import {
  SupabaseAtomicTripRefreshApplyRepository,
  SupabaseSavedTripsRepository,
  SupabaseTravelWorkspaceRepository,
  SupabaseTripPersistenceRepository,
} from '../src/integration/remote/supabaseTripRepositories';
import {
  TripRefreshCoordinator,
  type AtomicTripRefreshApplyCommand,
} from '../src/integration/tripRefresh';
import { isUuid, parseSavedTripDetail } from '../src/integration/validation';

const runRemote = process.env.TRIPWISE_T004_REMOTE_RUN === '1';
const remoteDescribe = runRemote ? describe : describe.skip;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function clientFor(url: string, key: string, token: string): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: async (input, init) => {
        const response = await fetch(input, init);
        if (!response.ok) {
          try {
            const body = await response.clone().json() as { code?: unknown; message?: unknown };
            console.error(`T004_REMOTE_HTTP_ERROR ${JSON.stringify({ status: response.status, code: body.code, message: body.message })}`);
          } catch {
            console.error(`T004_REMOTE_HTTP_ERROR ${JSON.stringify({ status: response.status })}`);
          }
        }
        return response;
      },
    },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function selectIdempotency(url: string, key: string, token: string, confirmations: readonly string[]) {
  const filter = confirmations.length === 1
    ? `eq.${encodeURIComponent(confirmations[0])}`
    : `in.(${confirmations.map(encodeURIComponent).join(',')})`;
  const response = await fetch(`${url}/rest/v1/trip_refresh_apply_idempotency?select=confirmation_id,result&confirmation_id=${filter}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Idempotency SELECT failed with HTTP ${response.status}.`);
  return await response.json() as Array<{ confirmation_id: string; result?: unknown }>;
}

function instrumentApplyRpc(client: SupabaseClient<Database>, counter: { calls: number }): SupabaseClient<Database> {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'rpc') {
        return (name: string, args?: unknown, options?: unknown) => {
          if (name === 'apply_trip_refresh') counter.calls += 1;
          return (target.rpc as Function).call(target, name, args, options);
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as SupabaseClient<Database>;
}

function schedule(detail: SavedTripDetail) {
  return detail.days.flatMap((day) => day.items.map((item) => ({
    itemId: item.id, dayId: day.id, dayNumber: day.dayNumber, position: item.position,
  }))).sort((a, b) => a.itemId.localeCompare(b.itemId));
}

function nonScheduling(detail: SavedTripDetail) {
  return detail.days.flatMap((day) => day.items.map((item) => {
    const { position: _position, ...fields } = item;
    return { itemId: item.id, fields };
  })).sort((a, b) => a.itemId.localeCompare(b.itemId));
}

function proposalWithSwap(baseline: SavedTripDetail, firstName: string, secondName: string): SavedTripDetail {
  const proposed = JSON.parse(JSON.stringify(baseline)) as SavedTripDetail;
  const day = proposed.days.find((candidate) =>
    candidate.items.some((item) => item.placeName === firstName)
    && candidate.items.some((item) => item.placeName === secondName));
  if (!day) throw new Error('Movable pair was not found in one day.');
  const first = day.items.find((item) => item.placeName === firstName)!;
  const second = day.items.find((item) => item.placeName === secondName)!;
  const firstPosition = first.position;
  first.position = second.position;
  second.position = firstPosition;
  day.items.sort((a, b) => a.position - b.position);
  return proposed;
}

remoteDescribe('FEATURE-P5-T004 functional remote runtime closure', () => {
  jest.setTimeout(120_000);

  it('proves zero-write proposal, owner apply, durable retry, stale CAS, isolation and provenance', async () => {
    const url = required('TRIPWISE_T004_SUPABASE_URL');
    const anonKey = required('TRIPWISE_T004_ANON_KEY');
    const tokenA = required('TRIPWISE_T004_USER_A_TOKEN');
    const tokenB = required('TRIPWISE_T004_USER_B_TOKEN');
    const ownerA = required('TRIPWISE_T004_USER_A_ID') as UserId;
    const runId = required('TRIPWISE_T004_RUN_ID');

    const clientA = clientFor(url, anonKey, tokenA);
    const clientB = clientFor(url, anonKey, tokenB);
    const savedA = new SupabaseSavedTripsRepository(clientA);
    const persistenceA = new SupabaseTripPersistenceRepository(clientA);
    const workspaceA = new SupabaseTravelWorkspaceRepository(clientA);
    const firstCounter = { calls: 0 };
    const firstApply = new SupabaseAtomicTripRefreshApplyRepository(instrumentApplyRpc(clientA, firstCounter));

    const tripId = await persistenceA.persist({
      idempotencyKey: `t004-${runId}-fixture`,
      graph: {
        title: `T004 disposable ${runId}`,
        destination: 'Contract fixture',
        startDate: '2028-10-01',
        endDate: '2028-10-02',
        days: [
          { dayNumber: 1, date: '2028-10-01', summary: 'Refresh day', items: [
            { position: 1, placeName: 'Bound anchor', placeQuery: 'custom unresolved anchor', startTime: '09:00', endTime: '10:00', note: 'must stay' },
            { position: 2, placeName: 'Flexible alpha', placeQuery: 'custom unresolved alpha', note: 'alpha' },
            { position: 3, placeName: 'Flexible beta', placeQuery: 'custom unresolved beta', note: 'beta' },
          ] },
          { dayNumber: 2, date: '2028-10-02', summary: 'Second day', items: [
            { position: 1, placeName: 'Second-day anchor', placeQuery: 'custom unresolved second' },
          ] },
        ],
      },
    });

    let detail = await savedA.getDetail(tripId);
    expect(detail).not.toBeNull();
    const alphaId = detail!.days[0].items.find((item) => item.placeName === 'Flexible alpha')!.id;
    const betaId = detail!.days[0].items.find((item) => item.placeName === 'Flexible beta')!.id;
    const boundBeforeSetup = detail!.days[0].items.find((item) => item.placeName === 'Bound anchor')!;
    expect(boundBeforeSetup.resolution).toBe('UNRESOLVED');

    let mutation = await workspaceA.mutate({
      type: 'update_item', tripId, itemId: alphaId,
      expectedRevision: detail!.workspaceRevision!, patch: { flexibility: 'flexible', priority: 'want_to_do' },
    });
    detail = await savedA.getDetail(tripId);
    expect(detail!.workspaceRevision).toBe(mutation.revision);
    mutation = await workspaceA.mutate({
      type: 'update_item', tripId, itemId: betaId,
      expectedRevision: detail!.workspaceRevision!, patch: { flexibility: 'flexible', priority: 'optional' },
    });
    const baseline = await savedA.getDetail(tripId);
    expect(baseline!.workspaceRevision).toBe(mutation.revision);

    const baselineSchedule = schedule(baseline!);
    const baselineFields = nonScheduling(baseline!);
    const baselineRevision = baseline!.workspaceRevision!;
    const proposed = proposalWithSwap(baseline!, 'Flexible alpha', 'Flexible beta');
    const coordinator = new TripRefreshCoordinator(savedA, firstApply);
    const session = { ownerId: ownerA, sessionId: `runtime-${runId}` };
    const reparsed = { baseline: false, proposed: false };
    const parseErrors: string[] = [];
    try { reparsed.baseline = parseSavedTripDetail(baseline) !== null; } catch (error) { parseErrors.push(`baseline:${error instanceof Error ? error.message : 'unknown'}`); }
    try { reparsed.proposed = parseSavedTripDetail(proposed) !== null; } catch (error) { parseErrors.push(`proposed:${error instanceof Error ? error.message : 'unknown'}`); }
    const proposalResult = coordinator.open({
      session, baseline: baseline!, proposed, createdAt: '2028-01-01T00:00:00.000Z',
      stages: [{ stage: 'caller_provided', outcome: 'reviewed schedule swap' }],
    });
    if (proposalResult.status !== 'ready') {
      console.error(`T004_PROPOSAL_DIAGNOSTIC ${JSON.stringify({
        status: proposalResult.status,
        baselineRevision,
        ownerIdIsUuid: isUuid(ownerA),
        sessionIdLength: session.sessionId.length,
        reparsed,
        parseErrors,
        conflicts: proposalResult.conflicts.map((conflict) => ({
          code: conflict.code,
          origin: conflict.origin,
          itemIdSuffix: conflict.itemId?.slice(-8),
        })),
      })}`);
    }
    expect(proposalResult.status).toBe('ready');
    const proposal = proposalResult.proposal!;

    const afterProposal = await savedA.getDetail(tripId);
    expect(afterProposal!.workspaceRevision).toBe(baselineRevision);
    expect(schedule(afterProposal!)).toEqual(baselineSchedule);
    expect(firstCounter.calls).toBe(0);
    const zeroWriteRows = await selectIdempotency(url, anonKey, tokenA, [proposal.confirmationId]);
    expect(zeroWriteRows).toHaveLength(0);

    const firstResult = await coordinator.confirm({
      proposalId: proposal.proposalId, confirmationId: proposal.confirmationId,
      tripId, expectedBaselineRevision: proposal.baselineWorkspaceRevision,
    }, session);
    expect(firstResult.status).toBe('success');
    if (firstResult.status !== 'success') throw new Error(`Owner confirmation returned ${firstResult.status}.`);
    expect(firstResult.mutationCount).toBe(1);
    expect(firstCounter.calls).toBe(1);

    const afterApply = await savedA.getDetail(tripId);
    expect(afterApply!.workspaceRevision).toBeGreaterThan(baselineRevision);
    expect(afterApply!.workspaceRevision).toBe(firstResult.revision);
    expect(schedule(afterApply!)).toEqual(schedule(proposed));
    expect(nonScheduling(afterApply!)).toEqual(baselineFields);
    const boundBefore = baseline!.days[0].items.find((item) => item.placeName === 'Bound anchor')!;
    const boundAfter = afterApply!.days[0].items.find((item) => item.id === boundBefore.id)!;
    expect({ dayId: baseline!.days[0].id, position: boundBefore.position, fields: nonScheduling(baseline!).find((x) => x.itemId === boundBefore.id) })
      .toEqual({ dayId: afterApply!.days[0].id, position: boundAfter.position, fields: nonScheduling(afterApply!).find((x) => x.itemId === boundAfter.id) });
    expect(afterApply!.days.flatMap((day) => day.items).every((item) => {
      const record = item as unknown as Record<string, unknown>;
      return item.resolution === 'UNRESOLVED' && record.googlePlaceId === undefined
        && item.latitude === null && item.longitude === null;
    })).toBe(true);

    const duplicateCounter = { calls: 0 };
    const freshClientA = clientFor(url, anonKey, tokenA);
    const freshApply = new SupabaseAtomicTripRefreshApplyRepository(instrumentApplyRpc(freshClientA, duplicateCounter));
    const exactCommand: AtomicTripRefreshApplyCommand = {
      proposalId: proposal.proposalId, confirmationId: proposal.confirmationId,
      idempotencyKey: proposal.confirmationId, tripId,
      expectedRevision: proposal.baselineWorkspaceRevision, reviewedMutation: proposal.mutation,
    };
    const duplicatePayload = JSON.parse(JSON.stringify(exactCommand)) as AtomicTripRefreshApplyCommand;
    expect(duplicatePayload).toEqual(exactCommand);
    const duplicateResult = await freshApply.applyReviewedProposal(duplicatePayload);
    expect(duplicateCounter.calls).toBe(1);
    expect(duplicateResult).toEqual({ revision: firstResult.revision });
    const afterDuplicate = await savedA.getDetail(tripId);
    expect(afterDuplicate!.workspaceRevision).toBe(afterApply!.workspaceRevision);
    expect(schedule(afterDuplicate!)).toEqual(schedule(afterApply!));
    const ownerRows = await selectIdempotency(url, anonKey, tokenA, [proposal.confirmationId]);
    expect(ownerRows).toHaveLength(1);
    const foreignRows = await selectIdempotency(url, anonKey, tokenB, [proposal.confirmationId]);
    expect(foreignRows).toHaveLength(0);

    const noOpConfirmation = `confirm-v1-noop-${runId}`;
    const noOpCommand: AtomicTripRefreshApplyCommand = {
      proposalId: `refresh-v1-noop-${runId}`, confirmationId: noOpConfirmation,
      idempotencyKey: noOpConfirmation, tripId,
      expectedRevision: afterApply!.workspaceRevision!,
      reviewedMutation: { items: schedule(afterApply!).map(({ itemId, dayId, position }) => ({ itemId, dayId, position })) },
    };
    const noOpCounter = { calls: 0 };
    const noOpApply = new SupabaseAtomicTripRefreshApplyRepository(instrumentApplyRpc(clientFor(url, anonKey, tokenA), noOpCounter));
    const noOpResult = await noOpApply.applyReviewedProposal(noOpCommand);
    const noOpDuplicate = await new SupabaseAtomicTripRefreshApplyRepository(clientFor(url, anonKey, tokenA)).applyReviewedProposal(noOpCommand);
    expect(noOpCounter.calls).toBe(1);
    expect(noOpResult).toEqual({ revision: afterApply!.workspaceRevision, noOp: true });
    expect(noOpDuplicate).toEqual(noOpResult);
    expect((await savedA.getDetail(tripId))!.workspaceRevision).toBe(afterApply!.workspaceRevision);

    const staleBaseline = await savedA.getDetail(tripId);
    const staleProposed = proposalWithSwap(staleBaseline!, 'Flexible alpha', 'Flexible beta');
    const staleCoordinator = new TripRefreshCoordinator(savedA, new SupabaseAtomicTripRefreshApplyRepository(clientA));
    const staleOpen = staleCoordinator.open({
      session, baseline: staleBaseline!, proposed: staleProposed, createdAt: '2028-01-02T00:00:00.000Z',
    });
    expect(staleOpen.status).toBe('ready');
    const staleProposal = staleOpen.proposal!;
    const advance = await workspaceA.mutate({
      type: 'update_item', tripId, itemId: alphaId,
      expectedRevision: staleBaseline!.workspaceRevision!, patch: { note: `newer-${runId}` },
    });
    const newerBeforeStale = await savedA.getDetail(tripId);
    expect(newerBeforeStale!.workspaceRevision).toBe(advance.revision);
    const staleCounter = { calls: 0 };
    const staleApply = new SupabaseAtomicTripRefreshApplyRepository(instrumentApplyRpc(clientFor(url, anonKey, tokenA), staleCounter));
    let staleError: IntegrationError | null = null;
    try {
      await staleApply.applyReviewedProposal({
        proposalId: staleProposal.proposalId, confirmationId: staleProposal.confirmationId,
        idempotencyKey: staleProposal.confirmationId, tripId,
        expectedRevision: staleProposal.baselineWorkspaceRevision, reviewedMutation: staleProposal.mutation,
      });
    } catch (error) {
      staleError = error as IntegrationError;
    }
    expect(staleCounter.calls).toBe(1);
    expect(staleError).toBeInstanceOf(IntegrationError);
    expect(staleError!.code).toBe('conflict');
    const afterStale = await savedA.getDetail(tripId);
    expect(afterStale!.workspaceRevision).toBe(advance.revision);
    expect(schedule(afterStale!)).toEqual(schedule(newerBeforeStale!));
    expect(afterStale!.days.flatMap((day) => day.items).find((item) => item.id === alphaId)!.note).toBe(`newer-${runId}`);
    const staleRows = await selectIdempotency(url, anonKey, tokenA, [staleProposal.confirmationId]);
    expect(staleRows).toHaveLength(0);

    const crossConfirmation = `confirm-v1-cross-${runId}`;
    const crossCounter = { calls: 0 };
    const crossApply = new SupabaseAtomicTripRefreshApplyRepository(instrumentApplyRpc(clientFor(url, anonKey, tokenB), crossCounter));
    let crossError: IntegrationError | null = null;
    try {
      await crossApply.applyReviewedProposal({
        proposalId: `refresh-v1-cross-${runId}`, confirmationId: crossConfirmation,
        idempotencyKey: crossConfirmation, tripId,
        expectedRevision: afterStale!.workspaceRevision!,
        reviewedMutation: { items: schedule(afterStale!).map(({ itemId, dayId, position }) => ({ itemId, dayId, position })) },
      });
    } catch (error) {
      crossError = error as IntegrationError;
    }
    expect(crossCounter.calls).toBe(1);
    expect(crossError).toBeInstanceOf(IntegrationError);
    expect(crossError!.code).toBe('notFound');
    const afterCross = await savedA.getDetail(tripId);
    expect(afterCross!.workspaceRevision).toBe(afterStale!.workspaceRevision);
    expect(schedule(afterCross!)).toEqual(schedule(afterStale!));
    const crossRowsB = await selectIdempotency(url, anonKey, tokenB, [proposal.confirmationId, crossConfirmation]);
    expect(crossRowsB).toHaveLength(0);

    const durableRows = await selectIdempotency(url, anonKey, tokenA, [proposal.confirmationId, noOpConfirmation, staleProposal.confirmationId, crossConfirmation]);
    expect(durableRows).toHaveLength(2);

    const privateSchema = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${tokenA}`, 'Accept-Profile': 'tripwise_private' },
    });
    expect(privateSchema.status).toBeGreaterThanOrEqual(400);

    console.log(`T004_REMOTE_RESULT ${JSON.stringify({
      status: 'PASS', tripIdSuffix: tripId.slice(-8), proposalId: proposal.proposalId,
      confirmationId: proposal.confirmationId, baselineRevision,
      finalRevision: afterApply!.workspaceRevision, postStaleRevision: afterStale!.workspaceRevision,
      zeroWriteProposal: true, ownerConfirm: firstResult.status,
      firstLogicalApplyCalls: firstCounter.calls, duplicateServerCalls: duplicateCounter.calls,
      duplicateSameResult: true, effectiveRefreshMutations: 1,
      legitimateWorkspaceMutations: 3, staleAttempts: staleCounter.calls,
      crossUserAttempts: crossCounter.calls, workspaceRevisionAdvances: 4,
      primaryDurableRows: ownerRows.length, totalT004DurableRows: durableRows.length,
      ownerIdSuffix: ownerA.slice(-8), userBIdSuffix: required('TRIPWISE_T004_USER_B_ID').slice(-8),
      provenancePreserved: true, boundItemPreserved: true, noOp: true,
      actualAmbiguousRetry: false, privateSchemaBlocked: true,
      authenticatedAuthoritativeReads: 9, proposalGenerations: 2,
    })}`);
  });
});
