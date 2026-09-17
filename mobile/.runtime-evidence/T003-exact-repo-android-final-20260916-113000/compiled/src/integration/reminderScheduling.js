"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReminderScheduler = void 0;
exports.resolveReminderRouteFacts = resolveReminderRouteFacts;
exports.planReminderReconciliation = planReminderReconciliation;
const errors_1 = require("./errors");
const reminderEngine_1 = require("./reminderEngine");
const routeMetricCache_1 = require("./routeMetricCache");
const tripTimezone_1 = require("./tripTimezone");
const validation_1 = require("./validation");
function validPresentation(value) {
    return !!value && typeof value.title === 'string' && value.title.trim().length > 0 && value.title.trim().length <= 120
        && (value.body === undefined || (typeof value.body === 'string' && value.body.length <= 240));
}
function canonicalItems(items) {
    return [...items].sort((left, right) => left.position - right.position || left.id.localeCompare(right.id));
}
function routeDayRequests(trips, now) {
    const requests = [];
    for (const trip of trips) {
        if (!(0, validation_1.isUuid)(trip.id) || !Number.isInteger(trip.workspaceRevision))
            continue;
        let timezone;
        try {
            timezone = (0, tripTimezone_1.parseTripTimezone)(trip.timezone).timezone;
        }
        catch {
            continue;
        }
        if (!timezone)
            continue;
        for (const day of [...trip.days].sort((a, b) => a.dayNumber - b.dayNumber || a.id.localeCompare(b.id))) {
            if (!day.date)
                continue;
            const all = canonicalItems(day.items);
            const verifiedScheduled = all.filter((item) => item.activityStatus === 'scheduled' && item.resolution === 'VERIFIED');
            if (verifiedScheduled.length > 25)
                continue;
            let earliestNextStart = Infinity;
            let hasTransition = false;
            for (let index = 1; index < all.length; index += 1) {
                const origin = all[index - 1];
                const destination = all[index];
                if (origin.activityStatus !== 'scheduled' || destination.activityStatus !== 'scheduled'
                    || origin.resolution !== 'VERIFIED' || destination.resolution !== 'VERIFIED' || !destination.startTime)
                    continue;
                const resolution = (0, reminderEngine_1.resolveNamedZoneWallTime)(day.date, destination.startTime, timezone);
                if (resolution.status !== 'unique' || resolution.epochMs <= now + reminderEngine_1.REMINDER_TIMING_POLICY_V1.leaveSoonBufferMs)
                    continue;
                earliestNextStart = Math.min(earliestNextStart, resolution.epochMs);
                hasTransition = true;
            }
            if (hasTransition)
                requests.push({ tripId: trip.id, dayId: day.id, earliestNextStart, items: verifiedScheduled });
        }
    }
    return requests.sort((left, right) => left.earliestNextStart - right.earliestNextStart
        || left.tripId.localeCompare(right.tripId) || left.dayId.localeCompare(right.dayId));
}
function validDuration(matrix, from, to) {
    const value = matrix.durationsSeconds[from]?.[to];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
async function resolveReminderRouteFacts(trips, repository, now, signal) {
    const facts = new Map();
    let logicalRequestCount = 0;
    let failedDayCount = 0;
    for (const request of routeDayRequests(trips, now)) {
        if (signal?.aborted)
            throw new errors_1.IntegrationError('cancelled');
        if (logicalRequestCount >= 10) {
            failedDayCount += 1;
            continue;
        }
        logicalRequestCount += 1;
        try {
            const coordinates = request.items.map((item) => ({ latitude: item.latitude, longitude: item.longitude }));
            const entry = await repository.getTableEntry({ profile: 'driving', coordinates }, signal);
            const indexByItem = new Map(request.items.map((item, index) => [item.id, index]));
            const trip = trips.find((candidate) => candidate.id === request.tripId);
            if (!trip) {
                failedDayCount += 1;
                continue;
            }
            const day = trip?.days.find((candidate) => candidate.id === request.dayId);
            if (!day) {
                failedDayCount += 1;
                continue;
            }
            const items = canonicalItems(day.items);
            for (let index = 1; index < items.length; index += 1) {
                const origin = items[index - 1];
                const destination = items[index];
                if (origin.activityStatus !== 'scheduled' || destination.activityStatus !== 'scheduled'
                    || origin.resolution !== 'VERIFIED' || destination.resolution !== 'VERIFIED')
                    continue;
                const from = indexByItem.get(origin.id);
                const to = indexByItem.get(destination.id);
                if (from === undefined || to === undefined)
                    continue;
                const durationSeconds = validDuration(entry.value, from, to);
                if (durationSeconds === null)
                    continue;
                const fact = {
                    tripId: trip.id, dayId: day.id, originItemId: origin.id, destinationItemId: destination.id,
                    profile: 'driving', durationSeconds, fetchedAt: entry.cachedAt,
                };
                facts.set((0, reminderEngine_1.reminderRouteFactKey)(trip.id, day.id, origin.id, destination.id), fact);
            }
        }
        catch (error) {
            if (signal?.aborted || (error instanceof errors_1.IntegrationError && error.code === 'cancelled'))
                throw new errors_1.IntegrationError('cancelled');
            failedDayCount += 1;
        }
    }
    return { facts, logicalRequestCount, failedDayCount };
}
function planReminderReconciliation(desired, existing, ownerScope) {
    const retain = [];
    const cancel = [];
    const schedule = [];
    const desiredById = new Map(desired.filter((item) => item.ownerScope === ownerScope).map((item) => [item.logicalId, item]));
    const existingById = new Map();
    for (const item of existing.filter((candidate) => candidate.ownerScope === ownerScope)) {
        const group = existingById.get(item.logicalId) ?? [];
        group.push(item);
        existingById.set(item.logicalId, group);
    }
    const identities = new Set([...desiredById.keys(), ...existingById.keys()]);
    for (const logicalId of [...identities].sort()) {
        const candidate = desiredById.get(logicalId);
        const scheduled = (existingById.get(logicalId) ?? []).sort((a, b) => a.nativeId.localeCompare(b.nativeId));
        if (!candidate) {
            cancel.push(...scheduled);
            continue;
        }
        const matching = scheduled.filter((item) => item.fingerprint === candidate.fingerprint && item.triggerAt === candidate.triggerAt);
        if (matching.length > 0) {
            retain.push(matching[0]);
            cancel.push(...scheduled.filter((item) => item.nativeId !== matching[0].nativeId));
        }
        else {
            cancel.push(...scheduled);
            schedule.push(candidate);
        }
    }
    return { retain, cancel, schedule };
}
function activeSession(getSession, expected) {
    const current = getSession();
    if (!current || (expected && current !== expected) || !(0, validation_1.isUuid)(current.user.id)
        || (current.expiresAt !== null && current.expiresAt * 1000 <= Date.now()))
        return null;
    return current;
}
class ReminderScheduler {
    notifications;
    getSession;
    nowProvider;
    cachedRoutes;
    active = null;
    constructor(routeRepository, notifications, getSession, nowProvider = () => Date.now()) {
        this.notifications = notifications;
        this.getSession = getSession;
        this.nowProvider = nowProvider;
        this.cachedRoutes = routeRepository instanceof routeMetricCache_1.CachedRouteRepository
            ? routeRepository
            : new routeMetricCache_1.CachedRouteRepository(routeRepository, 64, 60 * 60_000, nowProvider);
    }
    cancelActive() { this.active?.abort(); }
    async reconcile(trips, eligibility, signal) {
        this.active?.abort();
        const controller = new AbortController();
        this.active = controller;
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted)
            controller.abort();
        const initial = activeSession(this.getSession);
        const zero = (status) => ({
            status, candidateCount: 0, retainedCount: 0, cancelledCount: 0,
            scheduledCount: 0, failureCount: 0, routeRequestCount: 0,
        });
        if (!initial) {
            console.log('INITIAL IS FALSY', initial);
            return zero('stale_user');
        }
        const ownerScope = (0, reminderEngine_1.reminderOwnerScope)(initial.user.id);
        try {
            let routeResolution = { facts: new Map(), logicalRequestCount: 0, failedDayCount: 0 };
            if (eligibility?.canSchedule) {
                routeResolution = await resolveReminderRouteFacts(trips, this.cachedRoutes, this.nowProvider(), controller.signal);
                if (!activeSession(this.getSession, initial))
                    return zero('stale_user');
            }
            let candidates = eligibility?.canSchedule
                ? (0, reminderEngine_1.generateReminderCandidates)({ ownerId: initial.user.id, trips, routeFacts: routeResolution.facts, now: this.nowProvider() })
                : [];
            const presentations = new Map();
            candidates = candidates.filter((candidate) => {
                const presentation = eligibility?.presentationFor?.(candidate);
                if (!validPresentation(presentation))
                    return false;
                presentations.set(candidate.logicalId, { title: presentation.title.trim(), ...(presentation.body === undefined ? {} : { body: presentation.body }) });
                return true;
            });
            const existing = await this.notifications.list();
            if (!activeSession(this.getSession, initial))
                return zero('stale_user');
            const plan = planReminderReconciliation(candidates, existing, ownerScope);
            let cancelledCount = 0;
            let scheduledCount = 0;
            let failureCount = routeResolution.failedDayCount;
            const replacementBlocked = new Set();
            for (const item of plan.cancel) {
                if (controller.signal.aborted)
                    return zero('cancelled');
                if (!activeSession(this.getSession, initial))
                    return zero('stale_user');
                try {
                    await this.notifications.cancel(item.nativeId);
                    cancelledCount += 1;
                }
                catch {
                    failureCount += 1;
                    replacementBlocked.add(item.logicalId);
                }
            }
            if (plan.schedule.length > 0) {
                if (!activeSession(this.getSession, initial))
                    return zero('stale_user');
                try {
                    await this.notifications.prepare();
                }
                catch {
                    failureCount += plan.schedule.length;
                    return {
                        status: 'partial_failure', candidateCount: candidates.length, retainedCount: plan.retain.length,
                        cancelledCount, scheduledCount, failureCount, routeRequestCount: routeResolution.logicalRequestCount,
                    };
                }
            }
            for (const candidate of plan.schedule) {
                if (replacementBlocked.has(candidate.logicalId))
                    continue;
                if (controller.signal.aborted)
                    return zero('cancelled');
                if (!activeSession(this.getSession, initial))
                    return zero('stale_user');
                const presentation = presentations.get(candidate.logicalId);
                if (!presentation)
                    continue;
                try {
                    await this.notifications.schedule({ ...candidate, presentation });
                    scheduledCount += 1;
                }
                catch {
                    failureCount += 1;
                }
            }
            return {
                status: eligibility?.canSchedule ? (failureCount > 0 ? 'partial_failure' : 'success') : 'ineligible',
                candidateCount: candidates.length,
                retainedCount: plan.retain.length,
                cancelledCount,
                scheduledCount,
                failureCount,
                routeRequestCount: routeResolution.logicalRequestCount,
            };
        }
        catch (error) {
            if (controller.signal.aborted || (error instanceof errors_1.IntegrationError && error.code === 'cancelled'))
                return zero('cancelled');
            return { ...zero('partial_failure'), failureCount: 1 };
        }
        finally {
            signal?.removeEventListener('abort', abort);
            if (this.active === controller)
                this.active = null;
        }
    }
}
exports.ReminderScheduler = ReminderScheduler;
