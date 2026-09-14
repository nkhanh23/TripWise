import type { SavedTripDay, SavedTripDetail, SavedTripItem } from './contracts';
import { DEFAULT_ROUTE_CACHE_TTL_MS } from './routeMetricCache';
import { isSupportedTripTimezone, parseTripTimezone } from './tripTimezone';
import { isIsoDate, isUuid } from './validation';

export const REMINDER_TIMING_POLICY_V1 = {
  policyVersion: 'REMINDER_TIMING_V1',
  tripStartingSoonStartClockSource: 'NONE_DATE_BASED',
  tripStartingSoonLead: 'PREVIOUS_LOCAL_CALENDAR_DATE_AT_18_00',
  tripStartingSoonClock: '18:00',
  dayStartingClock: '07:00',
  dayStartingConfigurable: false,
  placeUpcomingLeadMs: 15 * 60_000,
  leaveSoonRouteProfile: 'driving',
  leaveSoonBufferMs: 10 * 60_000,
  lateRiskToleranceMs: 10 * 60_000,
  schedulingHorizonMs: 7 * 24 * 60 * 60_000,
  maxPendingPerTrip: 48,
  maxPendingPerUser: 60,
  androidDeliveryMode: 'OS_MANAGED_INEXACT',
  dstGapRule: 'UNSCHEDULABLE',
  dstOverlapRule: 'UNSCHEDULABLE',
} as const;

export type ReminderType =
  | 'TRIP_STARTING_SOON'
  | 'DAY_STARTING'
  | 'PLACE_UPCOMING'
  | 'LEAVE_SOON'
  | 'LATE_RISK';

export type ReminderRouteFact = {
  tripId: string;
  dayId: string;
  originItemId: string;
  destinationItemId: string;
  profile: 'driving';
  durationSeconds: number;
  fetchedAt: number;
};

export type ReminderCandidate = {
  logicalId: string;
  fingerprint: string;
  ownerScope: string;
  tripId: string;
  type: ReminderType;
  triggerAt: number;
  dayId?: string;
  itemId?: string;
  originItemId?: string;
  destinationItemId?: string;
};

export type LocalWallTimeResolution =
  | { status: 'unique'; epochMs: number }
  | { status: 'gap' | 'overlap' | 'invalid' };

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TYPE_PRIORITY: Record<ReminderType, number> = {
  LATE_RISK: 0,
  LEAVE_SOON: 1,
  PLACE_UPCOMING: 2,
  DAY_STARTING: 3,
  TRIP_STARTING_SOON: 4,
};

function stableValue(value: unknown): string {
  if (value === undefined) return 'u';
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(',')}}`;
}

function digest(value: unknown): string {
  const input = stableValue(value);
  const state = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const primes = [0x01000193, 0x27d4eb2d, 0x165667b1, 0x9e3779b1];
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    for (let lane = 0; lane < state.length; lane += 1) {
      state[lane] = Math.imul(state[lane] ^ (code + lane * 31), primes[lane]) >>> 0;
    }
  }
  return state.map((part) => part.toString(16).padStart(8, '0')).join('');
}

export function reminderOwnerScope(ownerId: string): string {
  return `tw-owner-${digest(['owner', ownerId])}`;
}

type WallParts = { year: number; month: number; day: number; hour: number; minute: number };

function partsAt(formatter: Intl.DateTimeFormat, instant: number): WallParts | null {
  const parts = formatter.formatToParts(new Date(instant));
  const read = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;
    return value === undefined ? NaN : Number(value);
  };
  const result = { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute') };
  return Object.values(result).every(Number.isInteger) ? result : null;
}

function sameWall(left: WallParts | null, right: WallParts): boolean {
  return left !== null && left.year === right.year && left.month === right.month && left.day === right.day
    && left.hour === right.hour && left.minute === right.minute;
}

/** Resolves a local wall clock through named-zone rules without consulting the device timezone.
 * Zero matches is a DST/calendar gap; multiple matches is a DST overlap. Both fail closed. */
export function resolveNamedZoneWallTime(date: string, time: string, timezone: string): LocalWallTimeResolution {
  if (!isIsoDate(date) || !TIME.test(time) || !isSupportedTripTimezone(timezone)) return { status: 'invalid' };
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const wall = { year, month, day, hour, minute };
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
  try {
    const formatter = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
      timeZone: timezone, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    const offsets = new Set<number>();
    for (let deltaHours = -48; deltaHours <= 48; deltaHours += 6) {
      const sample = naiveUtc + deltaHours * 60 * 60_000;
      const local = partsAt(formatter, sample);
      if (local) offsets.add(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - sample);
    }
    const matches = new Set<number>();
    for (const offset of offsets) {
      const candidate = naiveUtc - offset;
      if (sameWall(partsAt(formatter, candidate), wall)) matches.add(candidate);
    }
    if (matches.size === 1) return { status: 'unique', epochMs: [...matches][0] };
    return { status: matches.size === 0 ? 'gap' : 'overlap' };
  } catch {
    return { status: 'invalid' };
  }
}

function previousCalendarDate(date: string): string | null {
  if (!isIsoDate(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}

export function reminderRouteFactKey(
  tripId: string, dayId: string, originItemId: string, destinationItemId: string,
): string {
  return [tripId, dayId, originItemId, destinationItemId].join(':');
}

function compareCandidate(left: ReminderCandidate, right: ReminderCandidate): number {
  return left.triggerAt - right.triggerAt
    || TYPE_PRIORITY[left.type] - TYPE_PRIORITY[right.type]
    || left.tripId.localeCompare(right.tripId)
    || (left.dayId ?? '').localeCompare(right.dayId ?? '')
    || (left.itemId ?? '').localeCompare(right.itemId ?? '')
    || (left.originItemId ?? '').localeCompare(right.originItemId ?? '')
    || (left.destinationItemId ?? '').localeCompare(right.destinationItemId ?? '')
    || left.logicalId.localeCompare(right.logicalId);
}

function canonicalDays(trip: SavedTripDetail): SavedTripDay[] {
  return [...trip.days].sort((left, right) => left.dayNumber - right.dayNumber || left.id.localeCompare(right.id));
}

function canonicalItems(day: SavedTripDay): SavedTripItem[] {
  return [...day.items].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
}

type CandidateRefs = Pick<ReminderCandidate, 'dayId' | 'itemId' | 'originItemId' | 'destinationItemId'>;

function createCandidate(
  ownerId: string,
  trip: SavedTripDetail,
  type: ReminderType,
  triggerAt: number,
  refs: CandidateRefs,
  authoritativeInputs: unknown,
): ReminderCandidate {
  const identity = [REMINDER_TIMING_POLICY_V1.policyVersion, ownerId, trip.id, type,
    refs.dayId ?? null, refs.itemId ?? null, refs.originItemId ?? null, refs.destinationItemId ?? null];
  return {
    logicalId: `tw-r1-${digest(identity)}`,
    fingerprint: digest({
      policyVersion: REMINDER_TIMING_POLICY_V1.policyVersion,
      workspaceRevision: trip.workspaceRevision,
      timezone: trip.timezone,
      triggerAt,
      authoritativeInputs,
    }),
    ownerScope: reminderOwnerScope(ownerId),
    tripId: trip.id,
    type,
    triggerAt,
    ...refs,
  };
}

export type NamedZoneWallTimeResolver = typeof resolveNamedZoneWallTime;

function resolvedEpoch(
  date: string | undefined,
  time: string | undefined,
  timezone: string,
  resolver: NamedZoneWallTimeResolver,
): number | null {
  if (!date || !time) return null;
  const result = resolver(date, time, timezone);
  return result.status === 'unique' ? result.epochMs : null;
}

function eligibleTrigger(triggerAt: number, now: number): boolean {
  return triggerAt > now && triggerAt <= now + REMINDER_TIMING_POLICY_V1.schedulingHorizonMs;
}

export type GenerateReminderCandidatesInput = {
  ownerId: string;
  trips: readonly SavedTripDetail[];
  routeFacts?: ReadonlyMap<string, ReminderRouteFact>;
  now: number;
  wallTimeResolver?: NamedZoneWallTimeResolver;
};

export function generateReminderCandidates(input: GenerateReminderCandidatesInput): ReminderCandidate[] {
  if (!isUuid(input.ownerId) || !Number.isFinite(input.now)) return [];
  const routeFacts = input.routeFacts ?? new Map<string, ReminderRouteFact>();
  const wallTimeResolver = input.wallTimeResolver ?? resolveNamedZoneWallTime;
  const candidates: ReminderCandidate[] = [];
  const trips = [...input.trips].sort((left, right) => left.id.localeCompare(right.id));
  for (const trip of trips) {
    if (!isUuid(trip.id) || !Number.isInteger(trip.workspaceRevision) || (trip.workspaceRevision ?? 0) < 1) continue;
    let timezoneTuple;
    try { timezoneTuple = parseTripTimezone(trip.timezone); } catch { continue; }
    const timezone = timezoneTuple.timezone;
    if (!timezone) continue;

    const precedingDate = previousCalendarDate(trip.startDate);
    const tripTrigger = precedingDate
      ? resolvedEpoch(precedingDate, REMINDER_TIMING_POLICY_V1.tripStartingSoonClock, timezone, wallTimeResolver)
      : null;
    if (tripTrigger !== null && eligibleTrigger(tripTrigger, input.now)) {
      candidates.push(createCandidate(input.ownerId, trip, 'TRIP_STARTING_SOON', tripTrigger, {}, {
        startDate: trip.startDate,
        rule: REMINDER_TIMING_POLICY_V1.tripStartingSoonLead,
      }));
    }

    for (const day of canonicalDays(trip)) {
      const dayTrigger = resolvedEpoch(day.date, REMINDER_TIMING_POLICY_V1.dayStartingClock, timezone, wallTimeResolver);
      if (dayTrigger !== null && eligibleTrigger(dayTrigger, input.now)) {
        candidates.push(createCandidate(input.ownerId, trip, 'DAY_STARTING', dayTrigger, { dayId: day.id }, {
          date: day.date, clock: REMINDER_TIMING_POLICY_V1.dayStartingClock,
        }));
      }
      const items = canonicalItems(day);
      for (const item of items) {
        if (item.activityStatus !== 'scheduled') continue;
        const start = resolvedEpoch(day.date, item.startTime, timezone, wallTimeResolver);
        if (start === null) continue;
        const triggerAt = start - REMINDER_TIMING_POLICY_V1.placeUpcomingLeadMs;
        if (eligibleTrigger(triggerAt, input.now)) {
          candidates.push(createCandidate(input.ownerId, trip, 'PLACE_UPCOMING', triggerAt,
            { dayId: day.id, itemId: item.id },
            { date: day.date, startTime: item.startTime, activityStatus: item.activityStatus }));
        }
      }

      for (let index = 1; index < items.length; index += 1) {
        const origin = items[index - 1];
        const destination = items[index];
        if (origin.activityStatus !== 'scheduled' || destination.activityStatus !== 'scheduled'
          || origin.resolution !== 'VERIFIED' || destination.resolution !== 'VERIFIED') continue;
        const nextStart = resolvedEpoch(day.date, destination.startTime, timezone, wallTimeResolver);
        if (nextStart === null) continue;
        const key = reminderRouteFactKey(trip.id, day.id, origin.id, destination.id);
        const fact = routeFacts.get(key);
        if (!fact || fact.profile !== 'driving' || !Number.isFinite(fact.durationSeconds) || fact.durationSeconds < 0
          || !Number.isFinite(fact.fetchedAt) || fact.fetchedAt > input.now
          || input.now - fact.fetchedAt > DEFAULT_ROUTE_CACHE_TTL_MS) continue;
        const requiredDeparture = nextStart - fact.durationSeconds * 1000 - REMINDER_TIMING_POLICY_V1.leaveSoonBufferMs;
        if (!eligibleTrigger(requiredDeparture, input.now)) continue;
        let type: Extract<ReminderType, 'LEAVE_SOON' | 'LATE_RISK'> = 'LEAVE_SOON';
        if (origin.endTime !== undefined) {
          const priorEnd = resolvedEpoch(day.date, origin.endTime, timezone, wallTimeResolver);
          if (priorEnd === null) continue;
          if (priorEnd - requiredDeparture > REMINDER_TIMING_POLICY_V1.lateRiskToleranceMs) type = 'LATE_RISK';
        }
        candidates.push(createCandidate(input.ownerId, trip, type, requiredDeparture, {
          dayId: day.id, originItemId: origin.id, destinationItemId: destination.id,
        }, {
          date: day.date,
          originStatus: origin.activityStatus,
          destinationStatus: destination.activityStatus,
          originEndTime: origin.endTime ?? null,
          destinationStartTime: destination.startTime,
          route: fact,
        }));
      }
    }
  }

  const perTrip = new Map<string, ReminderCandidate[]>();
  for (const candidate of candidates.sort(compareCandidate)) {
    const group = perTrip.get(candidate.tripId) ?? [];
    if (group.length < REMINDER_TIMING_POLICY_V1.maxPendingPerTrip) group.push(candidate);
    perTrip.set(candidate.tripId, group);
  }
  return [...perTrip.values()].flat().sort(compareCandidate).slice(0, REMINDER_TIMING_POLICY_V1.maxPendingPerUser);
}
