"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMINDER_TIMING_POLICY_V1 = void 0;
exports.reminderOwnerScope = reminderOwnerScope;
exports.resolveNamedZoneWallTime = resolveNamedZoneWallTime;
exports.reminderRouteFactKey = reminderRouteFactKey;
exports.generateReminderCandidates = generateReminderCandidates;
const routeMetricCache_1 = require("./routeMetricCache");
const tripTimezone_1 = require("./tripTimezone");
const validation_1 = require("./validation");
exports.REMINDER_TIMING_POLICY_V1 = {
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
};
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TYPE_PRIORITY = {
    LATE_RISK: 0,
    LEAVE_SOON: 1,
    PLACE_UPCOMING: 2,
    DAY_STARTING: 3,
    TRIP_STARTING_SOON: 4,
};
function stableValue(value) {
    if (value === undefined)
        return 'u';
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
        return `[${value.map(stableValue).join(',')}]`;
    const record = value;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(',')}}`;
}
function digest(value) {
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
function reminderOwnerScope(ownerId) {
    return `tw-owner-${digest(['owner', ownerId])}`;
}
function partsAt(formatter, instant) {
    const parts = formatter.formatToParts(new Date(instant));
    const read = (type) => {
        const value = parts.find((part) => part.type === type)?.value;
        return value === undefined ? NaN : Number(value);
    };
    const result = { year: read('year'), month: read('month'), day: read('day'), hour: read('hour'), minute: read('minute') };
    return Object.values(result).every(Number.isInteger) ? result : null;
}
function sameWall(left, right) {
    return left !== null && left.year === right.year && left.month === right.month && left.day === right.day
        && left.hour === right.hour && left.minute === right.minute;
}
/** Resolves a local wall clock through named-zone rules without consulting the device timezone.
 * Zero matches is a DST/calendar gap; multiple matches is a DST overlap. Both fail closed. */
function resolveNamedZoneWallTime(date, time, timezone) {
    if (!(0, validation_1.isIsoDate)(date) || !TIME.test(time) || !(0, tripTimezone_1.isSupportedTripTimezone)(timezone))
        return { status: 'invalid' };
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const wall = { year, month, day, hour, minute };
    const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);
    try {
        const formatter = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
            timeZone: timezone, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        const offsets = new Set();
        for (let deltaHours = -48; deltaHours <= 48; deltaHours += 6) {
            const sample = naiveUtc + deltaHours * 60 * 60_000;
            const local = partsAt(formatter, sample);
            if (local)
                offsets.add(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute) - sample);
        }
        const matches = new Set();
        for (const offset of offsets) {
            const candidate = naiveUtc - offset;
            if (sameWall(partsAt(formatter, candidate), wall))
                matches.add(candidate);
        }
        if (matches.size === 1)
            return { status: 'unique', epochMs: [...matches][0] };
        return { status: matches.size === 0 ? 'gap' : 'overlap' };
    }
    catch {
        return { status: 'invalid' };
    }
}
function previousCalendarDate(date) {
    if (!(0, validation_1.isIsoDate)(date))
        return null;
    const [year, month, day] = date.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
}
function reminderRouteFactKey(tripId, dayId, originItemId, destinationItemId) {
    return [tripId, dayId, originItemId, destinationItemId].join(':');
}
function compareCandidate(left, right) {
    return left.triggerAt - right.triggerAt
        || TYPE_PRIORITY[left.type] - TYPE_PRIORITY[right.type]
        || left.tripId.localeCompare(right.tripId)
        || (left.dayId ?? '').localeCompare(right.dayId ?? '')
        || (left.itemId ?? '').localeCompare(right.itemId ?? '')
        || (left.originItemId ?? '').localeCompare(right.originItemId ?? '')
        || (left.destinationItemId ?? '').localeCompare(right.destinationItemId ?? '')
        || left.logicalId.localeCompare(right.logicalId);
}
function canonicalDays(trip) {
    return [...trip.days].sort((left, right) => left.dayNumber - right.dayNumber || left.id.localeCompare(right.id));
}
function canonicalItems(day) {
    return [...day.items].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
}
function createCandidate(ownerId, trip, type, triggerAt, refs, authoritativeInputs) {
    const identity = [exports.REMINDER_TIMING_POLICY_V1.policyVersion, ownerId, trip.id, type,
        refs.dayId ?? null, refs.itemId ?? null, refs.originItemId ?? null, refs.destinationItemId ?? null];
    return {
        logicalId: `tw-r1-${digest(identity)}`,
        fingerprint: digest({
            policyVersion: exports.REMINDER_TIMING_POLICY_V1.policyVersion,
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
function resolvedEpoch(date, time, timezone, resolver) {
    if (!date || !time)
        return null;
    const result = resolver(date, time, timezone);
    return result.status === 'unique' ? result.epochMs : null;
}
function eligibleTrigger(triggerAt, now) {
    return triggerAt > now && triggerAt <= now + exports.REMINDER_TIMING_POLICY_V1.schedulingHorizonMs;
}
function generateReminderCandidates(input) {
    if (!(0, validation_1.isUuid)(input.ownerId) || !Number.isFinite(input.now))
        return [];
    const routeFacts = input.routeFacts ?? new Map();
    const wallTimeResolver = input.wallTimeResolver ?? resolveNamedZoneWallTime;
    const candidates = [];
    const trips = [...input.trips].sort((left, right) => left.id.localeCompare(right.id));
    for (const trip of trips) {
        if (!(0, validation_1.isUuid)(trip.id) || !Number.isInteger(trip.workspaceRevision) || (trip.workspaceRevision ?? 0) < 1)
            continue;
        let timezoneTuple;
        try {
            timezoneTuple = (0, tripTimezone_1.parseTripTimezone)(trip.timezone);
        }
        catch {
            continue;
        }
        const timezone = timezoneTuple.timezone;
        if (!timezone)
            continue;
        const precedingDate = previousCalendarDate(trip.startDate);
        const tripTrigger = precedingDate
            ? resolvedEpoch(precedingDate, exports.REMINDER_TIMING_POLICY_V1.tripStartingSoonClock, timezone, wallTimeResolver)
            : null;
        if (tripTrigger !== null && eligibleTrigger(tripTrigger, input.now)) {
            candidates.push(createCandidate(input.ownerId, trip, 'TRIP_STARTING_SOON', tripTrigger, {}, {
                startDate: trip.startDate,
                rule: exports.REMINDER_TIMING_POLICY_V1.tripStartingSoonLead,
            }));
        }
        for (const day of canonicalDays(trip)) {
            const dayTrigger = resolvedEpoch(day.date, exports.REMINDER_TIMING_POLICY_V1.dayStartingClock, timezone, wallTimeResolver);
            if (dayTrigger !== null && eligibleTrigger(dayTrigger, input.now)) {
                candidates.push(createCandidate(input.ownerId, trip, 'DAY_STARTING', dayTrigger, { dayId: day.id }, {
                    date: day.date, clock: exports.REMINDER_TIMING_POLICY_V1.dayStartingClock,
                }));
            }
            const items = canonicalItems(day);
            for (const item of items) {
                if (item.activityStatus !== 'scheduled')
                    continue;
                const start = resolvedEpoch(day.date, item.startTime, timezone, wallTimeResolver);
                if (start === null)
                    continue;
                const triggerAt = start - exports.REMINDER_TIMING_POLICY_V1.placeUpcomingLeadMs;
                if (eligibleTrigger(triggerAt, input.now)) {
                    candidates.push(createCandidate(input.ownerId, trip, 'PLACE_UPCOMING', triggerAt, { dayId: day.id, itemId: item.id }, { date: day.date, startTime: item.startTime, activityStatus: item.activityStatus }));
                }
            }
            for (let index = 1; index < items.length; index += 1) {
                const origin = items[index - 1];
                const destination = items[index];
                if (origin.activityStatus !== 'scheduled' || destination.activityStatus !== 'scheduled'
                    || origin.resolution !== 'VERIFIED' || destination.resolution !== 'VERIFIED')
                    continue;
                const nextStart = resolvedEpoch(day.date, destination.startTime, timezone, wallTimeResolver);
                if (nextStart === null)
                    continue;
                const key = reminderRouteFactKey(trip.id, day.id, origin.id, destination.id);
                const fact = routeFacts.get(key);
                if (!fact || fact.profile !== 'driving' || !Number.isFinite(fact.durationSeconds) || fact.durationSeconds < 0
                    || !Number.isFinite(fact.fetchedAt) || fact.fetchedAt > input.now
                    || input.now - fact.fetchedAt > routeMetricCache_1.DEFAULT_ROUTE_CACHE_TTL_MS)
                    continue;
                const requiredDeparture = nextStart - fact.durationSeconds * 1000 - exports.REMINDER_TIMING_POLICY_V1.leaveSoonBufferMs;
                if (!eligibleTrigger(requiredDeparture, input.now))
                    continue;
                let type = 'LEAVE_SOON';
                if (origin.endTime !== undefined) {
                    const priorEnd = resolvedEpoch(day.date, origin.endTime, timezone, wallTimeResolver);
                    if (priorEnd === null)
                        continue;
                    if (priorEnd - requiredDeparture > exports.REMINDER_TIMING_POLICY_V1.lateRiskToleranceMs)
                        type = 'LATE_RISK';
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
    const perTrip = new Map();
    for (const candidate of candidates.sort(compareCandidate)) {
        const group = perTrip.get(candidate.tripId) ?? [];
        if (group.length < exports.REMINDER_TIMING_POLICY_V1.maxPendingPerTrip)
            group.push(candidate);
        perTrip.set(candidate.tripId, group);
    }
    return [...perTrip.values()].flat().sort(compareCandidate).slice(0, exports.REMINDER_TIMING_POLICY_V1.maxPendingPerUser);
}
