import type {
  AuthenticatedSession, Route, RouteMatrix, RouteRequest, RouteTableRequest, SavedTripDetail, SavedTripItem,
} from '../src/integration/contracts';
import { IntegrationError } from '../src/integration/errors';
import {
  generateReminderCandidates,
  REMINDER_TIMING_POLICY_V1,
  reminderRouteFactKey,
  resolveNamedZoneWallTime,
  type ReminderRouteFact,
} from '../src/integration/reminderEngine';
import {
  planReminderReconciliation,
  ReminderScheduler,
  resolveReminderRouteFacts,
  type ReminderNotificationRepository,
  type ReminderScheduleRequest,
  type ScheduledReminder,
} from '../src/integration/reminderScheduling';
import { CachedRouteRepository } from '../src/integration/routeMetricCache';
import type { RouteRepository } from '../src/integration/repositories';

const uuid = (value: number) => `10000000-0000-4000-8000-${value.toString(16).padStart(12, '0')}`;
const OWNER = uuid(1);
const TIMEZONE = { timezone: 'Asia/Bangkok', provenance: 'USER_CONFIRMED', confirmedAt: '2027-12-01T00:00:00Z' } as const;

function epoch(date: string, time: string, timezone = 'Asia/Bangkok'): number {
  const result = resolveNamedZoneWallTime(date, time, timezone);
  if (result.status !== 'unique') throw new Error(`Expected unique ${date} ${time} ${timezone}`);
  return result.epochMs;
}

function unresolved(id: number, position: number, startTime?: string, endTime?: string): SavedTripItem {
  return {
    id: uuid(id) as SavedTripItem['id'], position, itemKind: 'place', flexibility: 'flexible', priority: 'optional',
    activityStatus: 'scheduled', placeName: `private-${id}`, ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}), resolution: 'UNRESOLVED', latitude: null, longitude: null,
  };
}

function verified(id: number, position: number, startTime?: string, endTime?: string): SavedTripItem {
  return {
    id: uuid(id) as SavedTripItem['id'], position, itemKind: 'place', flexibility: 'flexible', priority: 'optional',
    activityStatus: 'scheduled', placeName: `private-${id}`, ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}), resolution: 'VERIFIED', googlePlaceId: `provider-${id}` as never,
    latitude: 13.7 + id / 10000, longitude: 100.4 + id / 10000, placeResolvedAt: '2027-12-01T00:00:00Z',
  };
}

function trip(items: SavedTripItem[] = [], options: Partial<SavedTripDetail> = {}): SavedTripDetail {
  return {
    id: uuid(10) as SavedTripDetail['id'], title: 'Trip', destination: 'Destination', startDate: '2028-01-02', endDate: '2028-01-02',
    estimatedBudget: null, currency: null, createdAt: '2027-12-01T00:00:00Z', updatedAt: '2027-12-01T00:00:00Z',
    workspaceRevision: 7, timezone: TIMEZONE,
    days: [{ id: uuid(11) as SavedTripDetail['days'][number]['id'], dayNumber: 1, date: '2028-01-02', items }],
    ...options,
  };
}

function fact(detail: SavedTripDetail, durationSeconds = 25 * 60, fetchedAt = epoch('2028-01-01', '08:00')): Map<string, ReminderRouteFact> {
  const day = detail.days[0];
  const [origin, destination] = day.items;
  const value: ReminderRouteFact = {
    tripId: detail.id, dayId: day.id, originItemId: origin.id, destinationItemId: destination.id,
    profile: 'driving', durationSeconds, fetchedAt,
  };
  return new Map([[reminderRouteFactKey(detail.id, day.id, origin.id, destination.id), value]]);
}

describe('REMINDER_TIMING_V1 named-zone and calendar policy', () => {
  it('uses the previous local calendar date at 18:00 rather than elapsed 24-hour arithmetic', () => {
    const detail = trip([], { startDate: '2028-03-12', endDate: '2028-03-12', timezone: {
      timezone: 'America/New_York', provenance: 'USER_CONFIRMED', confirmedAt: TIMEZONE.confirmedAt,
    }, days: [] });
    const candidate = generateReminderCandidates({ ownerId: OWNER, trips: [detail], now: epoch('2028-03-10', '12:00', 'America/New_York') })
      .find((value) => value.type === 'TRIP_STARTING_SOON');
    expect(candidate?.triggerAt).toBe(epoch('2028-03-11', '18:00', 'America/New_York'));
    expect(candidate?.triggerAt).not.toBe(epoch('2028-03-12', '18:00', 'America/New_York') - 24 * 60 * 60_000);
  });

  it('detects DST gaps and overlaps and fails both closed', () => {
    expect(resolveNamedZoneWallTime('2028-03-12', '02:30', 'America/New_York').status).toBe('gap');
    expect(resolveNamedZoneWallTime('2028-11-05', '01:30', 'America/New_York').status).toBe('overlap');
  });

  it.each(['gap', 'overlap'] as const)('does not emit trip/day candidates when the local occurrence is a DST %s', (status) => {
    const resolver = (date: string, time: string, timezone: string) =>
      time === '18:00' || time === '07:00' ? { status } as const : resolveNamedZoneWallTime(date, time, timezone);
    const candidates = generateReminderCandidates({ ownerId: OWNER, trips: [trip()], now: epoch('2028-01-01', '08:00'), wallTimeResolver: resolver });
    expect(candidates.filter((value) => value.type === 'TRIP_STARTING_SOON' || value.type === 'DAY_STARTING')).toEqual([]);
  });

  it('emits DAY_STARTING at 07:00 and omits it when past', () => {
    const detail = trip();
    const future = generateReminderCandidates({ ownerId: OWNER, trips: [detail], now: epoch('2028-01-01', '08:00') });
    expect(future.find((value) => value.type === 'DAY_STARTING')?.triggerAt).toBe(epoch('2028-01-02', '07:00'));
    const past = generateReminderCandidates({ ownerId: OWNER, trips: [detail], now: epoch('2028-01-02', '07:00') });
    expect(past.some((value) => value.type === 'DAY_STARTING')).toBe(false);
  });

  it('fails the whole trip closed without a confirmed timezone', () => {
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [trip([], {
      timezone: { timezone: null, provenance: null, confirmedAt: null },
    })], now: Date.UTC(2028, 0, 1) })).toEqual([]);
  });
});

describe('PLACE_UPCOMING policy', () => {
  it('uses exactly a fifteen-minute lead', () => {
    const candidate = generateReminderCandidates({ ownerId: OWNER, trips: [trip([unresolved(20, 1, '10:00')])], now: epoch('2028-01-01', '08:00') })
      .find((value) => value.type === 'PLACE_UPCOMING');
    expect(candidate?.triggerAt).toBe(epoch('2028-01-02', '10:00') - 15 * 60_000);
  });

  it.each([
    ['missing time', unresolved(20, 1)],
    ['completed', { ...unresolved(20, 1, '10:00'), activityStatus: 'completed' }],
    ['skipped', { ...unresolved(20, 1, '10:00'), activityStatus: 'skipped' }],
  ] as const)('omits %s item', (_name, item) => {
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [trip([item])], now: epoch('2028-01-01', '08:00') })
      .some((value) => value.type === 'PLACE_UPCOMING')).toBe(false);
  });

  it('omits a past item and an item whose local start is ambiguous', () => {
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [trip([unresolved(20, 1, '10:00')])], now: epoch('2028-01-02', '10:00') })
      .some((value) => value.type === 'PLACE_UPCOMING')).toBe(false);
    const ambiguous = trip([unresolved(20, 1, '01:30')], { startDate: '2028-11-05', endDate: '2028-11-05', timezone: {
      timezone: 'America/New_York', provenance: 'USER_CONFIRMED', confirmedAt: TIMEZONE.confirmedAt,
    }, days: [{ id: uuid(11) as never, dayNumber: 1, date: '2028-11-05', items: [unresolved(20, 1, '01:30')] }] });
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [ambiguous], now: epoch('2028-11-04', '08:00', 'America/New_York') })
      .some((value) => value.type === 'PLACE_UPCOMING')).toBe(false);
  });
});

describe('LEAVE_SOON and LATE_RISK approved truth table', () => {
  const cases: [string, string | undefined, 'LEAVE_SOON' | 'LATE_RISK'][] = [
    ['before required departure', '09:20', 'LEAVE_SOON'],
    ['exactly required departure', '09:25', 'LEAVE_SOON'],
    ['five minutes after', '09:30', 'LEAVE_SOON'],
    ['exactly tolerance after', '09:35', 'LEAVE_SOON'],
    ['more than tolerance after', '09:36', 'LATE_RISK'],
    ['missing prior end', undefined, 'LEAVE_SOON'],
  ];
  it.each(cases)('%s produces only %s', (_name, priorEnd, expected) => {
    const detail = trip([verified(20, 1, '08:30', priorEnd), verified(21, 2, '10:00')]);
    const route = generateReminderCandidates({ ownerId: OWNER, trips: [detail], routeFacts: fact(detail), now: epoch('2028-01-01', '08:00') })
      .filter((value) => value.type === 'LEAVE_SOON' || value.type === 'LATE_RISK');
    expect(route).toHaveLength(1);
    expect(route[0].type).toBe(expected);
    expect(route[0].triggerAt).toBe(epoch('2028-01-02', '09:25'));
  });

  it('emits neither after required departure and never catches up', () => {
    const detail = trip([verified(20, 1, '08:30', '09:36'), verified(21, 2, '10:00')]);
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [detail], routeFacts: fact(detail, 25 * 60, epoch('2028-01-02', '09:25')), now: epoch('2028-01-02', '09:25') })
      .filter((value) => value.type === 'LEAVE_SOON' || value.type === 'LATE_RISK')).toEqual([]);
  });

  it('fails closed for missing/stale route, non-scheduled item, and unresolved coordinates', () => {
    const detail = trip([verified(20, 1, '08:30', '09:20'), verified(21, 2, '10:00')]);
    const stale = fact(detail, 25 * 60, epoch('2027-12-31', '08:00'));
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [detail], now: epoch('2028-01-01', '08:00') })
      .filter((value) => value.type.endsWith('SOON') || value.type === 'LATE_RISK')).not.toContainEqual(expect.objectContaining({ type: 'LEAVE_SOON' }));
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [detail], routeFacts: stale, now: epoch('2028-01-01', '10:00') })
      .some((value) => value.type === 'LEAVE_SOON' || value.type === 'LATE_RISK')).toBe(false);
    const completed = { ...detail, days: [{ ...detail.days[0], items: [{ ...detail.days[0].items[0], activityStatus: 'completed' }, detail.days[0].items[1]] }] } as SavedTripDetail;
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [completed], routeFacts: fact(completed), now: epoch('2028-01-01', '08:00') })
      .some((value) => value.type === 'LEAVE_SOON' || value.type === 'LATE_RISK')).toBe(false);
    const unresolvedDetail = trip([unresolved(20, 1, '08:30', '09:20'), verified(21, 2, '10:00')]);
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [unresolvedDetail], routeFacts: fact(unresolvedDetail), now: epoch('2028-01-01', '08:00') })
      .some((value) => value.type === 'LEAVE_SOON' || value.type === 'LATE_RISK')).toBe(false);
  });
});

class RouteRepo implements RouteRepository {
  calls = 0;
  fail = false;
  async getRoute(request: RouteRequest): Promise<Route> {
    return { profile: 'driving', distanceMeters: 1, durationSeconds: 1, geometry: [...request.coordinates] };
  }
  async getTable(request: RouteTableRequest): Promise<RouteMatrix> {
    this.calls += 1;
    if (this.fail) throw new IntegrationError('providerUnavailable');
    const count = request.coordinates.length;
    return { profile: 'driving', coordinates: request.coordinates,
      durationsSeconds: Array.from({ length: count }, (_, row) => Array.from({ length: count }, (_, column) => row === column ? 0 : 1500)),
      distancesMeters: Array.from({ length: count }, () => Array(count).fill(1000)) };
  }
}

describe('bounded OSRM route fact acquisition', () => {
  it('uses one table request per day and reuses a valid one-hour cache entry', async () => {
    const repo = new RouteRepo();
    let now = epoch('2028-01-01', '08:00');
    const cached = new CachedRouteRepository(repo, 64, 60 * 60_000, () => now);
    const detail = trip([verified(20, 1, '08:30', '09:20'), verified(21, 2, '10:00')]);
    const first = await resolveReminderRouteFacts([detail], cached, now);
    now += 60 * 60_000;
    const second = await resolveReminderRouteFacts([detail], cached, now);
    expect(repo.calls).toBe(1);
    expect(first.facts.size).toBe(1);
    expect(second.facts.size).toBe(1);
    expect([...second.facts.values()][0].fetchedAt).toBe([...first.facts.values()][0].fetchedAt);
  });

  it('refreshes stale cache and fails closed when refresh fails', async () => {
    const repo = new RouteRepo();
    let now = epoch('2028-01-01', '08:00');
    const cached = new CachedRouteRepository(repo, 64, 60 * 60_000, () => now);
    const detail = trip([verified(20, 1, '08:30', '09:20'), verified(21, 2, '10:00')]);
    await resolveReminderRouteFacts([detail], cached, now);
    now += 60 * 60_000 + 1;
    repo.fail = true;
    const stale = await resolveReminderRouteFacts([detail], cached, now);
    expect(repo.calls).toBe(2);
    expect(stale.facts.size).toBe(0);
    expect(stale.failedDayCount).toBe(1);
  });

  it('skips a day above 25 routable items and never guesses durations', async () => {
    const repo = new RouteRepo();
    const items = Array.from({ length: 26 }, (_, index) => verified(100 + index, index + 1, `${String(8 + Math.floor(index / 4)).padStart(2, '0')}:${String((index % 4) * 15).padStart(2, '0')}`));
    const result = await resolveReminderRouteFacts([trip(items)], new CachedRouteRepository(repo), epoch('2028-01-01', '08:00'));
    expect(repo.calls).toBe(0);
    expect(result.facts.size).toBe(0);
  });

  it('caps logical table requests at ten per reconcile', async () => {
    const repo = new RouteRepo();
    const base = trip();
    const days = Array.from({ length: 11 }, (_, index) => ({
      id: uuid(200 + index) as never, dayNumber: index + 1, date: `2028-01-${String(index + 2).padStart(2, '0')}`,
      items: [verified(300 + index * 2, 1, '08:00', '09:00'), verified(301 + index * 2, 2, '10:00')],
    }));
    const result = await resolveReminderRouteFacts([{ ...base, endDate: '2028-01-12', days }], new CachedRouteRepository(repo), epoch('2028-01-01', '08:00'));
    expect(repo.calls).toBe(10);
    expect(result.logicalRequestCount).toBe(10);
    expect(result.failedDayCount).toBe(1);

    // Reversing input array ordering does not change which ten days are selected
    repo.calls = 0;
    const reversedResult = await resolveReminderRouteFacts([{ ...base, endDate: '2028-01-12', days: [...days].reverse() }], new CachedRouteRepository(repo), epoch('2028-01-01', '08:00'));
    expect(repo.calls).toBe(10);
    expect([...result.facts.keys()]).toEqual([...reversedResult.facts.keys()]);
  });

  it('bounds route fact acquisition strictly by the leaveSoonBuffer lower bound', async () => {
    const repo = new RouteRepo();
    const now = epoch('2028-01-02', '08:00'); // match trip() default date of 2028-01-02
    
    // Exactly at lower bound: nextStart <= now + buffer
    const exactlyAtBound = trip([verified(20, 1, '07:00', '08:00'), verified(21, 2, '08:10')]);
    const resultAtBound = await resolveReminderRouteFacts([exactlyAtBound], new CachedRouteRepository(repo), now);
    expect(repo.calls).toBe(0);
    expect(resultAtBound.facts.size).toBe(0);

    // Just above lower bound: nextStart > now + buffer
    const justAboveBound = trip([verified(20, 1, '07:00', '08:00'), verified(21, 2, '08:11')]);
    const resultAboveBound = await resolveReminderRouteFacts([justAboveBound], new CachedRouteRepository(repo), now);
    expect(repo.calls).toBe(1);
    expect(resultAboveBound.facts.size).toBe(1);
  });
});

describe('candidate caps, identity, and reconcile planning', () => {
  function denseTrip(id: number): SavedTripDetail {
    const base = trip([], { id: uuid(id) as never });
    return { ...base, days: Array.from({ length: 7 }, (_, dayIndex) => ({
      id: uuid(id * 100 + dayIndex) as never, dayNumber: dayIndex + 1, date: `2028-01-${String(dayIndex + 2).padStart(2, '0')}`,
      items: Array.from({ length: 10 }, (_, itemIndex) => unresolved(id * 1000 + dayIndex * 10 + itemIndex, itemIndex + 1,
        `${String(8 + itemIndex).padStart(2, '0')}:00`)),
    })) };
  }

  it('applies the 48 per-trip and 60 per-user limits deterministically', () => {
    const now = epoch('2028-01-01', '08:00');
    const one = generateReminderCandidates({ ownerId: OWNER, trips: [denseTrip(30)], now });
    const both = generateReminderCandidates({ ownerId: OWNER, trips: [denseTrip(31), denseTrip(30)], now });
    expect(one).toHaveLength(48);
    expect(both).toHaveLength(60);
    expect(generateReminderCandidates({ ownerId: OWNER, trips: [denseTrip(30), denseTrip(31)], now })).toEqual(both);
    expect(both.every((value) => value.triggerAt <= now + 7 * 24 * 60 * 60_000)).toBe(true);
  });

  it('keeps logical identity stable while revision changes the fingerprint and exposes no sensitive fields', () => {
    const detail = trip([unresolved(20, 1, '10:00')]);
    const now = epoch('2028-01-01', '08:00');
    const first = generateReminderCandidates({ ownerId: OWNER, trips: [detail], now }).find((value) => value.type === 'PLACE_UPCOMING')!;
    const second = generateReminderCandidates({ ownerId: OWNER, trips: [{ ...detail, workspaceRevision: 8 }], now }).find((value) => value.type === 'PLACE_UPCOMING')!;
    expect(second.logicalId).toBe(first.logicalId);
    expect(second.fingerprint).not.toBe(first.fingerprint);
    expect(JSON.stringify(first)).not.toContain('private-20');
    expect(JSON.stringify(first)).not.toContain('provider-20');
    expect(JSON.stringify(first)).not.toContain('13.7');
  });

  it('retains exact matches, cancels duplicates, and explicitly replaces changed fingerprints', () => {
    const candidate = generateReminderCandidates({ ownerId: OWNER, trips: [trip([unresolved(20, 1, '10:00')])], now: epoch('2028-01-01', '08:00') })
      .find((value) => value.type === 'PLACE_UPCOMING')!;
    const exact: ScheduledReminder = { ...candidate, nativeId: 'native-a' };
    const duplicate: ScheduledReminder = { ...candidate, nativeId: 'native-b' };
    const retained = planReminderReconciliation([candidate], [duplicate, exact], candidate.ownerScope);
    expect(retained.retain.map((value) => value.nativeId)).toEqual(['native-a']);
    expect(retained.cancel.map((value) => value.nativeId)).toEqual(['native-b']);
    const changed = planReminderReconciliation([{ ...candidate, fingerprint: 'f'.repeat(32) }], [exact], candidate.ownerScope);
    expect(changed.cancel).toEqual([exact]);
    expect(changed.schedule).toHaveLength(1);
  });

  it('uses semantic priority for identical trigger instants and cancels disappeared candidates', () => {
    const detail = trip([verified(20, 1, '06:00', '09:56'), verified(21, 2, '10:00')]);
    const now = epoch('2028-01-01', '08:00');
    const routeFacts = fact(detail, 5 * 60);
    const candidates = generateReminderCandidates({ ownerId: OWNER, trips: [detail], routeFacts, now });
    const at0945 = candidates.filter((value) => value.triggerAt === epoch('2028-01-02', '09:45'));
    expect(at0945.map((value) => value.type)).toEqual(['LATE_RISK', 'PLACE_UPCOMING']);
    const obsolete: ScheduledReminder = { ...at0945[0], nativeId: 'obsolete' };
    expect(planReminderReconciliation([], [obsolete], obsolete.ownerScope).cancel).toEqual([obsolete]);
  });
});

class NotificationRepo implements ReminderNotificationRepository {
  existing: ScheduledReminder[] = [];
  prepared = 0;
  cancelled: string[] = [];
  scheduled: ReminderScheduleRequest[] = [];
  cancelFails = false;
  async prepare() { this.prepared += 1; }
  async list() { return this.existing; }
  async schedule(request: ReminderScheduleRequest) { this.scheduled.push(request); return request.logicalId; }
  async cancel(nativeId: string) { if (this.cancelFails) throw new Error('native'); this.cancelled.push(nativeId); }
}

describe('scheduler eligibility and stale-user safety', () => {
  const session = (): AuthenticatedSession => ({ user: { id: OWNER as never, email: null, displayName: null }, expiresAt: null });

  it('performs no new scheduling when T003 eligibility is absent', async () => {
    const notifications = new NotificationRepo();
    const current = session();
    const scheduler = new ReminderScheduler(new RouteRepo(), notifications, () => current, () => epoch('2028-01-01', '08:00'));
    const result = await scheduler.reconcile([trip([unresolved(20, 1, '10:00')])]);
    expect(result.status).toBe('ineligible');
    expect(notifications.scheduled).toEqual([]);
    expect(notifications.prepared).toBe(0);
  });

  it('suppresses native mutations when the authenticated session changes during route resolution', async () => {
    const initial = session();
    let current: AuthenticatedSession | null = initial;
    const repo = new RouteRepo();
    repo.getTable = async (request) => {
      current = { ...initial, user: { ...initial.user, id: uuid(2) as never } };
      const count = request.coordinates.length;
      return { profile: 'driving', coordinates: request.coordinates, durationsSeconds: Array.from({ length: count }, () => Array(count).fill(1500)), distancesMeters: Array.from({ length: count }, () => Array(count).fill(1000)) };
    };
    const notifications = new NotificationRepo();
    const scheduler = new ReminderScheduler(repo, notifications, () => current, () => epoch('2028-01-01', '08:00'));
    const result = await scheduler.reconcile([trip([verified(20, 1, '08:30', '09:20'), verified(21, 2, '10:00')])], {
      canSchedule: true, presentationFor: () => ({ title: 'controlled' }),
    });
    expect(result.status).toBe('stale_user');
    expect(notifications.prepared).toBe(0);
    expect(notifications.cancelled).toEqual([]);
    expect(notifications.scheduled).toEqual([]);
  });

  it('does not schedule a replacement when cancellation fails', async () => {
    const current = session();
    const notifications = new NotificationRepo();
    const scheduler = new ReminderScheduler(new RouteRepo(), notifications, () => current, () => epoch('2028-01-01', '08:00'));
    const detail = trip([unresolved(20, 1, '10:00')]);
    const candidate = generateReminderCandidates({ ownerId: OWNER, trips: [detail], now: epoch('2028-01-01', '08:00') })
      .find((value) => value.type === 'PLACE_UPCOMING')!;
    notifications.existing = [{ ...candidate, nativeId: 'old', fingerprint: '0'.repeat(32) }];
    notifications.cancelFails = true;
    const result = await scheduler.reconcile([detail], { canSchedule: true, presentationFor: () => ({ title: 'controlled' }) });
    expect(result.status).toBe('partial_failure');
    expect(notifications.scheduled.some((value) => value.logicalId === candidate.logicalId)).toBe(false);
  });
});

expect(REMINDER_TIMING_POLICY_V1.androidDeliveryMode).toBe('OS_MANAGED_INEXACT');
