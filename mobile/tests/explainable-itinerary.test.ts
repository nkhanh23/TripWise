import {
  EXPLANATION_BOUNDS,
  LatestExplanationComposer,
  buildInitialGenerationReasons,
  buildRefreshReasons,
  composeItineraryExplanation,
  fallbackText,
  matchesExplanationBinding,
  validateCompositionOutput,
  validateReasonSet,
  type ItineraryReasonSet,
} from '../src/integration/explainableItinerary';
import type { OptimizedDayResult } from '../src/integration/routeOptimization';
import type { TripRefreshProposal } from '../src/integration/tripRefresh';
import type { SavedTripDetail } from '../src/integration/contracts';
import { WEATHER_SCHEDULING_POLICY, type WeatherSchedulingResult } from '../src/integration/weatherSchedulingPolicy';

const ids = {
  owner: '11111111-1111-4111-8111-111111111111',
  trip: '22222222-2222-4222-8222-222222222222',
  day: '33333333-3333-4333-8333-333333333333',
  fixed: '44444444-4444-4444-8444-444444444444',
  movable: '55555555-5555-4555-8555-555555555555',
};

function detail(order: 'baseline' | 'moved'): SavedTripDetail {
  const fixed = { id: ids.fixed, position: 1, itemKind: 'activity' as const, flexibility: 'fixed' as const,
    priority: 'must_do' as const, activityStatus: 'planned' as const, placeName: 'Museum',
    resolution: 'UNRESOLVED' as const, latitude: null, longitude: null, startTime: null, endTime: null };
  const movable = { id: ids.movable, position: 2, itemKind: 'activity' as const, flexibility: 'flexible' as const,
    priority: 'optional' as const, activityStatus: 'planned' as const, placeName: 'Park',
    resolution: 'UNRESOLVED' as const, latitude: null, longitude: null, startTime: null, endTime: null };
  return {
    id: ids.trip, title: 'Review', destination: 'Tokyo', startDate: '2026-10-01', endDate: '2026-10-01',
    workspaceRevision: 4, estimatedBudget: null, currency: null,
    createdAt: '2026-09-12T00:00:00.000Z', updatedAt: '2026-09-12T00:00:00.000Z',
    days: [{ id: ids.day, dayNumber: 1, date: '2026-10-01',
      items: order === 'baseline' ? [fixed, movable] : [fixed, { ...movable, position: 2 }] }],
  } as unknown as SavedTripDetail;
}

function proposal(): TripRefreshProposal {
  const baseline = detail('baseline');
  return {
    proposalId: 'refresh-v1-test', confirmationId: 'confirm-v1-test', tripId: baseline.id,
    ownerId: ids.owner as TripRefreshProposal['ownerId'], sessionId: 'session-123',
    baselineWorkspaceRevision: 4 as TripRefreshProposal['baselineWorkspaceRevision'],
    createdAt: '2026-09-12T00:00:00.000Z', status: 'confirmable', baseline, proposed: detail('moved'),
    diff: { isNoOp: true, items: baseline.days[0].items.map((item) => ({
      itemId: item.id, changeKinds: ['retained'], before: {
        dayId: baseline.days[0].id, dayNumber: 1, position: item.position, startTime: null, endTime: null,
      }, after: {
        dayId: baseline.days[0].id, dayNumber: 1, position: item.position, startTime: null, endTime: null,
      }, changedMetadataFields: [],
    })) },
    mutation: { items: baseline.days[0].items.map((item) => ({ itemId: item.id, dayId: baseline.days[0].id, position: item.position })) },
    stages: [],
  };
}

const initial = () => buildInitialGenerationReasons({ tripId: 'draft:2026-10-01:2026-10-03', dayCount: 3, preferenceCount: 2 });

describe('FEATURE-P5-T005 factual reason contract', () => {
  it('is deterministic for identical input', () => expect(initial()).toEqual(initial()));
  it('normalizes and freezes a valid reason set', () => expect(Object.isFrozen(validateReasonSet(initial()))).toBe(true));
  it('creates honest initial-generation facts with user preference provenance', () => {
    expect(initial().reasons[0]).toMatchObject({ type: 'generated_from_preferences', provenance: 'user_preferences', facts: { dayCount: 3, preferenceCount: 2 } });
  });
  it.each([
    ['unsupported type', { ...initial().reasons[0], type: 'invented' }],
    ['Gemini factual provenance', { ...initial().reasons[0], provenance: 'gemini' }],
    ['unknown field', { ...initial().reasons[0], rawProviderPayload: {} }],
    ['NaN fact', { ...initial().reasons[0], facts: { dayCount: NaN, preferenceCount: 2 } }],
    ['Infinity fact', { ...initial().reasons[0], facts: { dayCount: Infinity, preferenceCount: 2 } }],
    ['negative fact', { ...initial().reasons[0], facts: { dayCount: 3, preferenceCount: -1 } }],
  ])('rejects %s', (_label, reason) => expect(() => validateReasonSet({ tripId: 'draft:one', reasons: [reason] })).toThrow());
  it('rejects an unsupported locale', async () => {
    await expect(composeItineraryExplanation(initial(), 'fr' as 'en')).rejects.toThrow();
  });
  it('enforces the proposal identity pair', () => {
    expect(() => validateReasonSet({ ...initial(), proposalId: 'proposal:1' })).toThrow();
  });
  it('enforces the total reason bound before composition', () => {
    const reason = initial().reasons[0];
    expect(() => validateReasonSet({ tripId: 'draft:many', reasons: Array.from({ length: EXPLANATION_BOUNDS.maxReasons + 1 }, (_, i) => ({ ...reason, reasonId: `reason:${i}` })) })).toThrow();
  });
  it('enforces the per-item reason bound', () => {
    const reasons = Array.from({ length: EXPLANATION_BOUNDS.maxReasonsPerItem + 1 }, (_, i) => ({
      reasonId: `reason:fixed:${i}`, type: 'fixed_item_preserved', scope: 'item', itemId: ids.fixed,
      provenance: 'deterministic_constraint', facts: { position: i + 1 },
    }));
    expect(() => validateReasonSet({ tripId: ids.trip, reasons })).toThrow();
  });
  it('rejects raw provider payload fields', () => {
    expect(() => validateReasonSet({ tripId: 'draft:one', reasons: [{ ...initial().reasons[0], facts: { ...initial().reasons[0].facts, raw: { arbitrary: true } } }] })).toThrow();
  });
});

describe('FEATURE-P5-T005 owned T001-T004 facts', () => {
  it('creates FIXED and MUST_DO preservation reasons from T001-owned fields', () => {
    const reasons = buildRefreshReasons({ proposal: proposal() }).reasons;
    expect(reasons).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'fixed_item_preserved', itemId: ids.fixed }),
      expect.objectContaining({ type: 'must_do_preserved', itemId: ids.fixed }),
    ]));
  });
  it('keeps stable ordering independent of supplied route-day order', () => {
    const day = (dayNumber: number) => ({ dayNumber, status: 'fallback', fallbackReason: 'provider_unavailable',
      metrics: { originalDurationSeconds: null, optimizedDurationSeconds: null, durationSavingsSeconds: null,
        originalDistanceMeters: null, optimizedDistanceMeters: null, distanceSavingsMeters: null, providerCallCount: 1 } }) as OptimizedDayResult;
    expect(buildRefreshReasons({ proposal: proposal(), routeDays: [day(2), day(1)] }).reasons.map(x => x.reasonId))
      .toEqual(buildRefreshReasons({ proposal: proposal(), routeDays: [day(1), day(2)] }).reasons.map(x => x.reasonId));
  });
  it('uses only complete positive OSRM duration savings', () => {
    const route = { dayNumber: 1, status: 'optimized', metrics: { originalDurationSeconds: 900, optimizedDurationSeconds: 600,
      durationSavingsSeconds: 300, originalDistanceMeters: 8000, optimizedDistanceMeters: 7000, distanceSavingsMeters: 1000, providerCallCount: 1 } } as OptimizedDayResult;
    expect(buildRefreshReasons({ proposal: proposal(), routeDays: [route] }).reasons).toContainEqual(expect.objectContaining({
      type: 'route_duration_improved', provenance: 'osrm', facts: { previousDurationSeconds: 900, proposedDurationSeconds: 600, savingsSeconds: 300 },
    }));
  });
  it('turns null OSRM metrics into availability, never zero savings', () => {
    const route = { dayNumber: 1, status: 'fallback', fallbackReason: 'unroutable_items', metrics: {
      originalDurationSeconds: null, optimizedDurationSeconds: null, durationSavingsSeconds: null,
      originalDistanceMeters: null, optimizedDistanceMeters: null, distanceSavingsMeters: null, providerCallCount: 0,
    } } as OptimizedDayResult;
    const found = buildRefreshReasons({ proposal: proposal(), routeDays: [route] }).reasons.find(x => x.type === 'route_fallback');
    expect(found).toMatchObject({ facts: { availability: 'partial', reason: 'unroutable_items' } });
    expect(JSON.stringify(found)).not.toContain('savingsSeconds');
  });
  it('creates weather-applied reason from T003 decisions and TripWise policy', () => {
    const weather = { status: 'applied', reason: 'lower_precipitation', decisions: [{
      itemId: ids.movable, fromDayNumber: 1, toDayNumber: 2, fromDate: '2026-10-01', toDate: '2026-10-02',
      originalPrecipitationPercent: 80, proposedPrecipitationPercent: 20,
    }] } as WeatherSchedulingResult;
    expect(buildRefreshReasons({ proposal: proposal(), weatherResult: weather }).reasons).toContainEqual(expect.objectContaining({
      type: 'weather_rescheduled', provenance: 'open_meteo', facts: expect.objectContaining({ policyThresholdPercent: 60 }),
    }));
  });
  it('does not call missing weather good weather', () => {
    const weather = { status: 'forecast_unavailable', reason: 'provider_failure', decisions: [] } as unknown as WeatherSchedulingResult;
    const reason = buildRefreshReasons({ proposal: proposal(), weatherResult: weather }).reasons.find(x => x.type === 'weather_unavailable');
    expect(fallbackText(reason!, 'en')).toContain('unavailable');
    expect(fallbackText(reason!, 'en')).not.toContain('good weather');
  });
  it('creates moved reasons only for T004 moved diff records', () => {
    const p = proposal();
    const moved = { ...p, diff: { isNoOp: false, items: [{ itemId: ids.movable, changeKinds: ['moved'] as const,
      before: { dayId: ids.day, dayNumber: 1, position: 2, startTime: null, endTime: null },
      after: { dayId: ids.day, dayNumber: 1, position: 1, startTime: null, endTime: null }, changedMetadataFields: [] }] } } as unknown as TripRefreshProposal;
    expect(buildRefreshReasons({ proposal: moved }).reasons).toContainEqual(expect.objectContaining({ type: 'item_moved', itemId: ids.movable }));
  });
  it('never describes a retained T004 item as moved', () => {
    const reasons = buildRefreshReasons({ proposal: proposal() }).reasons;
    expect(reasons.find(x => x.type === 'item_moved')).toBeUndefined();
  });
  it('binds refresh explanations to exact trip, proposal and baseline revision', () => {
    const p = proposal();
    expect(buildRefreshReasons({ proposal: p })).toMatchObject({ tripId: p.tripId, proposalId: p.proposalId, baselineWorkspaceRevision: p.baselineWorkspaceRevision });
  });
  it('rejects stale proposal explanation reuse through exact binding comparison', () => {
    const set = buildRefreshReasons({ proposal: proposal() });
    expect(matchesExplanationBinding(set, { tripId: set.tripId, proposalId: set.proposalId, baselineWorkspaceRevision: set.baselineWorkspaceRevision })).toBe(true);
    expect(matchesExplanationBinding(set, { tripId: set.tripId, proposalId: 'refresh-v1-new', baselineWorkspaceRevision: set.baselineWorkspaceRevision })).toBe(false);
    expect(matchesExplanationBinding(set, { tripId: set.tripId, proposalId: set.proposalId, baselineWorkspaceRevision: 5 })).toBe(false);
  });
  it('rejects cross-trip explanation reuse', () => {
    const set = initial();
    expect(matchesExplanationBinding(set, { tripId: 'draft:another' })).toBe(false);
  });
  it('uses canonical T003 weather policy threshold constant', () => {
    const weather = { status: 'applied', reason: 'lower_precipitation', decisions: [{
      itemId: ids.movable, fromDayNumber: 1, toDayNumber: 2, fromDate: '2026-10-01', toDate: '2026-10-02',
      originalPrecipitationPercent: 80, proposedPrecipitationPercent: 20,
    }] } as WeatherSchedulingResult;
    const res = buildRefreshReasons({ proposal: proposal(), weatherResult: weather });
    const weatherReason = res.reasons.find((r) => r.type === 'weather_rescheduled');
    expect(weatherReason?.facts).toMatchObject({
      policyThresholdPercent: WEATHER_SCHEDULING_POLICY.HIGH_PRECIPITATION_PERCENT,
    });
  });
  it('emits truthful refresh_no_op reason when proposal diff isNoOp is true', () => {
    const baseProposal = proposal();
    const emptyDetail: SavedTripDetail = {
      ...baseProposal.baseline,
      days: [{ id: ids.day, dayNumber: 1, date: '2026-10-01', items: [] }],
    } as unknown as SavedTripDetail;
    const noOpProposal: TripRefreshProposal = {
      ...baseProposal,
      baseline: emptyDetail,
      proposed: emptyDetail,
      diff: { isNoOp: true, items: [] },
      mutation: { items: [] },
    };
    const res = buildRefreshReasons({ proposal: noOpProposal });
    expect(res.reasons).toHaveLength(1);
    expect(res.reasons[0]).toMatchObject({
      type: 'refresh_no_op',
      provenance: 'refresh_diff',
      facts: { isNoOp: true },
    });
    expect(fallbackText(res.reasons[0], 'en')).toContain('No material schedule changes');
    expect(fallbackText(res.reasons[0], 'vi')).toContain('không có thay đổi đáng kể');
  });
  it('truthfully withholds preservation reasons when constraintResult is invalid', () => {
    const p = proposal();
    const invalidConstraints = { isValid: false, conflicts: [{ code: 'FIXED_ITEM_MOVED' }] } as any;
    const reasons = buildRefreshReasons({ proposal: p, constraintResult: invalidConstraints }).reasons;
    expect(reasons.find((r) => r.type === 'fixed_item_preserved')).toBeUndefined();
    expect(reasons.find((r) => r.type === 'must_do_preserved')).toBeUndefined();
  });
  it('truthfully withholds fixed_item_preserved when item moved in proposed', () => {
    const base = proposal();
    const movedProposed: SavedTripDetail = {
      ...base.proposed,
      days: [{
        id: ids.day,
        dayNumber: 1,
        date: '2026-10-01',
        items: [{
          ...(base.proposed.days[0].items[0]),
          position: 5, // moved from position 1
        }],
      }],
    } as unknown as SavedTripDetail;
    const p = { ...base, proposed: movedProposed };
    const reasons = buildRefreshReasons({ proposal: p }).reasons;
    expect(reasons.find((r) => r.type === 'fixed_item_preserved')).toBeUndefined();
  });
  it('truthfully withholds must_do_preserved when item is missing in proposed', () => {
    const base = proposal();
    const droppedProposed: SavedTripDetail = {
      ...base.proposed,
      days: [{ id: ids.day, dayNumber: 1, date: '2026-10-01', items: [] }],
    } as unknown as SavedTripDetail;
    const p = { ...base, proposed: droppedProposed };
    const reasons = buildRefreshReasons({ proposal: p }).reasons;
    expect(reasons.find((r) => r.type === 'must_do_preserved')).toBeUndefined();
  });
  it('deterministically bounds valid large input above 50 reasons without throwing', () => {
    const largeDays = Array.from({ length: 15 }, (_, dayIdx) => ({
      id: `day-${dayIdx + 1}`,
      dayNumber: dayIdx + 1,
      date: `2026-10-${String(dayIdx + 1).padStart(2, '0')}`,
      items: Array.from({ length: 4 }, (_, itemIdx) => ({
        id: `item-${dayIdx + 1}-${itemIdx + 1}`,
        position: itemIdx + 1,
        itemKind: 'activity' as const,
        flexibility: 'fixed' as const,
        priority: 'must_do' as const,
        activityStatus: 'planned' as const,
        placeName: `Place ${dayIdx + 1}-${itemIdx + 1}`,
        resolution: 'UNRESOLVED' as const,
        latitude: null,
        longitude: null,
        startTime: null,
        endTime: null,
      })),
    }));

    // 15 days * 4 items = 60 items. Each item has fixed + must_do = 120 candidate preservation reasons!
    const largeDetail: SavedTripDetail = {
      id: ids.trip,
      title: 'Large Trip',
      destination: 'Tokyo',
      startDate: '2026-10-01',
      endDate: '2026-10-15',
      workspaceRevision: 4,
      estimatedBudget: null,
      currency: null,
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
      days: largeDays,
    } as unknown as SavedTripDetail;

    // Add a moved diff item and route improvement
    const largeProposal: TripRefreshProposal = {
      proposalId: 'refresh-large',
      confirmationId: 'confirm-large',
      tripId: ids.trip as any,
      ownerId: ids.owner as any,
      sessionId: 'session-123',
      baselineWorkspaceRevision: 4 as any,
      createdAt: '2026-09-12T00:00:00.000Z',
      status: 'confirmable',
      baseline: largeDetail,
      proposed: largeDetail,
      diff: {
        isNoOp: false,
        items: [{
          itemId: 'item-1-1' as any,
          changeKinds: ['moved'] as const,
          before: { dayId: 'day-1' as any, dayNumber: 1, position: 1, startTime: null, endTime: null },
          after: { dayId: 'day-1' as any, dayNumber: 1, position: 2, startTime: null, endTime: null },
          changedMetadataFields: [],
        }],
      },
      mutation: { items: [] },
      stages: [],
    };

    const routeDay = {
      dayNumber: 1,
      status: 'optimized',
      metrics: {
        originalDurationSeconds: 1000,
        optimizedDurationSeconds: 700,
        durationSavingsSeconds: 300,
        originalDistanceMeters: 5000,
        optimizedDistanceMeters: 4000,
        distanceSavingsMeters: 1000,
        providerCallCount: 1,
      },
    } as OptimizedDayResult;

    // This should NOT throw even though >120 reasons are available
    expect(() => buildRefreshReasons({ proposal: largeProposal, routeDays: [routeDay] })).not.toThrow();

    const res = buildRefreshReasons({ proposal: largeProposal, routeDays: [routeDay] });
    expect(res.reasons.length).toBeLessThanOrEqual(EXPLANATION_BOUNDS.maxReasons);
    expect(res.reasons.length).toBe(EXPLANATION_BOUNDS.maxReasons); // exactly capped at 50

    // Verify prioritized items are present (moved item and route improvement prioritized over repetitive fixed)
    expect(res.reasons).toContainEqual(expect.objectContaining({ type: 'item_moved', itemId: 'item-1-1' }));
    expect(res.reasons).toContainEqual(expect.objectContaining({ type: 'route_duration_improved', dayNumber: 1 }));
  });
});

describe('FEATURE-P5-T005 bounded composition and fallback', () => {
  it.each(['en', 'vi'] as const)('provides deterministic %s fallback without a composer', async (locale) => {
    const result = await composeItineraryExplanation(initial(), locale);
    expect(result.composer).toBe('deterministic_fallback');
    expect(result.entries).toHaveLength(1);
  });
  it('changing locale changes wording but not factual records', async () => {
    const en = await composeItineraryExplanation(initial(), 'en');
    const vi = await composeItineraryExplanation(initial(), 'vi');
    expect(en.reasons).toEqual(vi.reasons);
    expect(en.entries).not.toEqual(vi.entries);
  });
  it('makes one bounded composition request for the set, never one per reason', async () => {
    const compose = jest.fn().mockResolvedValue({ entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'Known wording.' }] });
    const result = await composeItineraryExplanation(initial(), 'en', { compose });
    expect(result.composer).toBe('gemini');
    expect(compose).toHaveBeenCalledTimes(1);
  });
  it.each([
    ['unknown reason ID', { entries: [{ reasonId: 'reason:unknown', localizedText: 'Text' }] }],
    ['duplicate/missing reason', { entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'Text' }, { reasonId: initial().reasons[0].reasonId, localizedText: 'Again' }] }],
    ['malformed JSON-shaped value', 'not-json'],
    ['unknown output field', { entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'Text', url: 'https://bad.test' }] }],
    ['URL prose', { entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'See https://bad.test' }] }],
    ['oversized prose', { entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'x'.repeat(EXPLANATION_BOUNDS.maxComposedTextLength + 1) }] }],
  ])('rejects %s', (_label, output) => expect(() => validateCompositionOutput(output, initial())).toThrow());
  it.each(['timeout', 'rate limit', 'provider unavailable', 'invalid JSON'])('falls back when composer reports %s', async () => {
    const result = await composeItineraryExplanation(initial(), 'en', { compose: async () => { throw new Error('provider'); } });
    expect(result.composer).toBe('deterministic_fallback');
  });
  it('falls back when already cancelled without calling composer', async () => {
    const controller = new AbortController(); controller.abort();
    const compose = jest.fn();
    expect((await composeItineraryExplanation(initial(), 'en', { compose }, controller.signal)).composer).toBe('deterministic_fallback');
    expect(compose).not.toHaveBeenCalled();
  });
  it('ignores late composition from an old request', async () => {
    let release!: (value: unknown) => void;
    const first = new Promise<unknown>((resolve) => { release = resolve; });
    const repository = { compose: jest.fn().mockReturnValueOnce(first).mockResolvedValueOnce({ entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'Current' }] }) };
    const latest = new LatestExplanationComposer(repository);
    const stale = latest.compose(initial(), 'en');
    const current = latest.compose(initial(), 'en');
    release({ entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'Stale' }] });
    expect(await stale).toBeNull();
    expect((await current)?.entries[0].localizedText).toBe('Current');
  });
  it('cancellation invalidates an in-flight composition', async () => {
    let release!: (value: unknown) => void;
    const pending = new Promise<unknown>((resolve) => { release = resolve; });
    const latest = new LatestExplanationComposer({ compose: async () => pending });
    const result = latest.compose(initial(), 'en'); latest.cancel();
    release({ entries: [{ reasonId: initial().reasons[0].reasonId, localizedText: 'Late' }] });
    expect(await result).toBeNull();
  });
  it('cannot alter authoritative numeric facts through composed wording', async () => {
    const facts = initial();
    const result = await composeItineraryExplanation(facts, 'en', { compose: async () => ({ entries: [{ reasonId: facts.reasons[0].reasonId, localizedText: 'A concise explanation.' }] }) });
    expect(result.reasons).toEqual(facts.reasons);
  });
});
