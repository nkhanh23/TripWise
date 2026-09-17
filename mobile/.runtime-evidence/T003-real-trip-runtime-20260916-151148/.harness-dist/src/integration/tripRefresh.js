"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripRefreshCoordinator = exports.LatestTripRefreshProposalGenerator = exports.TRIP_REFRESH_BOUNDS = void 0;
exports.validateAtomicTripRefreshApplyCommand = validateAtomicTripRefreshApplyCommand;
exports.createTripRefreshDiff = createTripRefreshDiff;
exports.createTripRefreshProposal = createTripRefreshProposal;
const deterministicConstraintEngine_1 = require("./deterministicConstraintEngine");
const errors_1 = require("./errors");
const tripTimezone_1 = require("./tripTimezone");
const validation_1 = require("./validation");
exports.TRIP_REFRESH_BOUNDS = {
    maxStages: 8,
    maxOpenProposals: 32,
    maxScheduleItems: 400,
};
const CHANGE_ORDER = [
    'retained', 'moved', 'added', 'removed', 'scheduling_time_changed', 'metadata_changed',
];
const METADATA_FIELDS = [
    'itemKind', 'flexibility', 'priority', 'activityStatus', 'placeName', 'placeQuery', 'note',
    'contact', 'transport', 'accommodation', 'sourceLinks', 'resolution', 'googlePlaceId',
    'latitude', 'longitude', 'placeAddress', 'placeCategory', 'placeResolvedAt',
];
function ordinalCompare(left, right) {
    return left < right ? -1 : left > right ? 1 : 0;
}
function isValidTimestamp(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
}
function isValidSession(session) {
    return (0, validation_1.isUuid)(session?.ownerId)
        && typeof session.sessionId === 'string'
        && session.sessionId.length >= 8
        && session.sessionId.length <= 128
        && /^[A-Za-z0-9._:-]+$/.test(session.sessionId);
}
function stableValue(value) {
    if (value === undefined)
        return 'u';
    if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        return JSON.stringify(value);
    }
    if (Array.isArray(value))
        return `[${value.map(stableValue).join(',')}]`;
    const record = value;
    return `{${Object.keys(record).sort(ordinalCompare).map((key) => `${JSON.stringify(key)}:${stableValue(record[key])}`).join(',')}}`;
}
function stableFingerprint(value) {
    const input = stableValue(value);
    let first = 0x811c9dc5;
    let second = 0x9e3779b9;
    for (let index = 0; index < input.length; index += 1) {
        const code = input.charCodeAt(index);
        first = Math.imul(first ^ code, 0x01000193) >>> 0;
        second = Math.imul(second ^ code, 0x85ebca6b) >>> 0;
    }
    return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
}
function deepFreeze(value) {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        Object.values(value).forEach(deepFreeze);
    }
    return value;
}
function locateItems(detail) {
    const items = new Map();
    detail.days.forEach((day) => day.items.forEach((item) => {
        items.set(item.id, {
            item,
            location: {
                dayId: day.id,
                dayNumber: day.dayNumber,
                position: item.position,
                startTime: item.startTime ?? null,
                endTime: item.endTime ?? null,
            },
        });
    }));
    return items;
}
function metadataChanges(before, after) {
    const beforeRecord = before;
    const afterRecord = after;
    return METADATA_FIELDS
        .filter((field) => stableValue(beforeRecord[field]) !== stableValue(afterRecord[field]))
        .map(String)
        .sort(ordinalCompare);
}
function hasConfirmedReservation(item) {
    return typeof item.contact?.reservationCode === 'string'
        && item.contact.reservationCode.trim().length > 0;
}
/** Bound workspace records have an existing user commitment and cannot move. */
function isBoundScheduleItem(item) {
    return item.flexibility === 'fixed'
        || item.startTime != null
        || item.endTime != null
        || item.itemKind === 'transport'
        || item.itemKind === 'accommodation'
        || item.itemKind === 'reservation'
        || item.activityStatus === 'completed'
        || item.activityStatus === 'skipped'
        || hasConfirmedReservation(item);
}
function hasSupportedScheduleOnlyMutation(baseline, diff) {
    const baselineItems = locateItems(baseline);
    if (baselineItems.size > exports.TRIP_REFRESH_BOUNDS.maxScheduleItems)
        return false;
    return diff.items.every((change) => {
        if (change.changeKinds.includes('added')
            || change.changeKinds.includes('removed')
            || change.changeKinds.includes('scheduling_time_changed')
            || change.changeKinds.includes('metadata_changed'))
            return false;
        const existing = baselineItems.get(change.itemId);
        if (!existing)
            return false;
        if (change.changeKinds.includes('moved') && isBoundScheduleItem(existing.item))
            return false;
        return true;
    });
}
function toScheduleMutation(proposed) {
    return deepFreeze({
        items: [...locateItems(proposed).values()]
            .map(({ item, location }) => ({ itemId: item.id, dayId: location.dayId, position: location.position }))
            .sort((left, right) => ordinalCompare(left.itemId, right.itemId)),
    });
}
function isOpaqueIdempotencyKey(value) {
    return typeof value === 'string'
        && value.length >= 8
        && value.length <= 128
        && /^[A-Za-z0-9._:-]+$/.test(value);
}
/** Boundary validation shared by the production RPC adapter and focused tests. */
function validateAtomicTripRefreshApplyCommand(command) {
    const record = command;
    if (!record || typeof record !== 'object'
        || Object.keys(record).some((key) => ![
            'proposalId', 'confirmationId', 'idempotencyKey', 'tripId', 'expectedRevision', 'reviewedMutation',
        ].includes(key))
        || !isOpaqueIdempotencyKey(command.proposalId)
        || !isOpaqueIdempotencyKey(command.confirmationId)
        || command.idempotencyKey !== command.confirmationId
        || !isOpaqueIdempotencyKey(command.idempotencyKey)
        || !(0, validation_1.isUuid)(command.tripId)
        || !Number.isInteger(command.expectedRevision)
        || command.expectedRevision < 1
        || !command.reviewedMutation
        || typeof command.reviewedMutation !== 'object') {
        throw new errors_1.IntegrationError('invalidRequest');
    }
    const mutation = command.reviewedMutation;
    if (Object.keys(mutation).some((key) => key !== 'items')
        || !Array.isArray(mutation.items)
        || mutation.items.length < 1
        || mutation.items.length > exports.TRIP_REFRESH_BOUNDS.maxScheduleItems) {
        throw new errors_1.IntegrationError('invalidRequest');
    }
    const seenItems = new Set();
    for (const value of mutation.items) {
        const item = value;
        if (!item || typeof item !== 'object'
            || Object.keys(item).some((key) => !['itemId', 'dayId', 'position'].includes(key))
            || !(0, validation_1.isUuid)(item.itemId)
            || !(0, validation_1.isUuid)(item.dayId)
            || !Number.isInteger(item.position)
            || item.position < 1
            || seenItems.has(item.itemId)) {
            throw new errors_1.IntegrationError('invalidRequest');
        }
        seenItems.add(item.itemId);
    }
    return deepFreeze({
        ...command,
        reviewedMutation: {
            items: mutation.items.map((item) => ({
                itemId: item.itemId,
                dayId: item.dayId,
                position: item.position,
            })).sort((left, right) => ordinalCompare(left.itemId, right.itemId)),
        },
    });
}
function createTripRefreshDiff(baseline, proposed) {
    const beforeItems = locateItems(baseline);
    const afterItems = locateItems(proposed);
    const itemIds = [...new Set([...beforeItems.keys(), ...afterItems.keys()])].sort(ordinalCompare);
    const items = itemIds.map((itemId) => {
        const before = beforeItems.get(itemId);
        const after = afterItems.get(itemId);
        const kinds = [];
        let changedMetadataFields = [];
        if (!before)
            kinds.push('added');
        else if (!after)
            kinds.push('removed');
        else {
            if (before.location.dayId !== after.location.dayId
                || before.location.dayNumber !== after.location.dayNumber
                || before.location.position !== after.location.position)
                kinds.push('moved');
            if (before.location.startTime !== after.location.startTime
                || before.location.endTime !== after.location.endTime)
                kinds.push('scheduling_time_changed');
            changedMetadataFields = metadataChanges(before.item, after.item);
            if (changedMetadataFields.length > 0)
                kinds.push('metadata_changed');
            if (kinds.length === 0)
                kinds.push('retained');
        }
        return {
            itemId: itemId,
            changeKinds: kinds.sort((left, right) => CHANGE_ORDER.indexOf(left) - CHANGE_ORDER.indexOf(right)),
            before: before?.location ?? null,
            after: after?.location ?? null,
            changedMetadataFields,
        };
    });
    return deepFreeze({
        isNoOp: items.every((item) => item.changeKinds.length === 1 && item.changeKinds[0] === 'retained'),
        items,
    });
}
function hasStableEnvelope(baseline, proposed) {
    const baselineEnvelope = {
        id: baseline.id, title: baseline.title, destination: baseline.destination,
        startDate: baseline.startDate, endDate: baseline.endDate,
        estimatedBudget: baseline.estimatedBudget, currency: baseline.currency,
        createdAt: baseline.createdAt, updatedAt: baseline.updatedAt,
        timezone: (0, tripTimezone_1.parseTripTimezone)(baseline.timezone),
    };
    const proposedEnvelope = {
        id: proposed.id, title: proposed.title, destination: proposed.destination,
        startDate: proposed.startDate, endDate: proposed.endDate,
        estimatedBudget: proposed.estimatedBudget, currency: proposed.currency,
        createdAt: proposed.createdAt, updatedAt: proposed.updatedAt,
        timezone: (0, tripTimezone_1.parseTripTimezone)(proposed.timezone),
    };
    if (stableValue(baselineEnvelope) !== stableValue(proposedEnvelope))
        return false;
    if (proposed.workspaceRevision !== undefined && proposed.workspaceRevision !== baseline.workspaceRevision)
        return false;
    if (baseline.days.length !== proposed.days.length)
        return false;
    return baseline.days.every((day, index) => {
        const candidate = proposed.days[index];
        return candidate !== undefined
            && day.id === candidate.id
            && day.dayNumber === candidate.dayNumber
            && (day.date ?? null) === (candidate.date ?? null)
            && (day.summary ?? null) === (candidate.summary ?? null);
    });
}
function createTripRefreshProposal(input) {
    if (!isValidSession(input.session) || !isValidTimestamp(input.createdAt)) {
        return { status: 'invalid_input', proposal: null, conflicts: [] };
    }
    const baselineConstraints = (0, deterministicConstraintEngine_1.evaluatePlanConstraints)(input.baseline);
    if (!baselineConstraints.isValid) {
        return { status: 'invalid_input', proposal: null, conflicts: baselineConstraints.conflicts };
    }
    if (!Number.isInteger(input.baseline.workspaceRevision) || (input.baseline.workspaceRevision ?? 0) < 1) {
        return { status: 'invalid_input', proposal: null, conflicts: [] };
    }
    const proposalConstraints = (0, deterministicConstraintEngine_1.evaluatePlanConstraints)(input.proposed, input.baseline);
    if (!proposalConstraints.isValid) {
        const malformed = proposalConstraints.conflicts.some((conflict) => conflict.origin === 'proposed'
            && (conflict.code === 'MALFORMED_INPUT' || conflict.code === 'DUPLICATE_ITEM_ID'));
        if (malformed)
            return { status: 'invalid_proposal', proposal: null, conflicts: [] };
        return { status: 'protected_constraint_conflict', proposal: null, conflicts: proposalConstraints.conflicts };
    }
    let baseline;
    let proposed;
    try {
        const parsedBaseline = (0, validation_1.parseSavedTripDetail)(input.baseline);
        const parsedProposed = (0, validation_1.parseSavedTripDetail)(input.proposed);
        if (!parsedBaseline || !parsedProposed) {
            return { status: 'invalid_input', proposal: null, conflicts: [] };
        }
        baseline = parsedBaseline;
        proposed = parsedProposed;
    }
    catch {
        return { status: 'invalid_input', proposal: null, conflicts: [] };
    }
    if (!hasStableEnvelope(baseline, proposed)) {
        return { status: 'invalid_proposal', proposal: null, conflicts: [] };
    }
    const stages = [...(input.stages ?? [])];
    if (stages.length > exports.TRIP_REFRESH_BOUNDS.maxStages
        || stages.some((stage) => !['route_aware', 'weather_aware', 'caller_provided'].includes(stage.stage)
            || typeof stage.outcome !== 'string' || stage.outcome.length < 1 || stage.outcome.length > 80)) {
        return { status: 'invalid_input', proposal: null, conflicts: [] };
    }
    const diff = createTripRefreshDiff(baseline, proposed);
    if (!hasSupportedScheduleOnlyMutation(baseline, diff)) {
        return { status: 'invalid_proposal', proposal: null, conflicts: [] };
    }
    const mutation = toScheduleMutation(proposed);
    const identity = {
        ownerId: input.session.ownerId,
        sessionId: input.session.sessionId,
        tripId: baseline.id,
        baselineWorkspaceRevision: baseline.workspaceRevision,
        proposed,
        diff,
        mutation,
        stages,
    };
    const fingerprint = stableFingerprint(identity);
    const proposalId = `refresh-v1-${fingerprint}`;
    const confirmationId = `confirm-v1-${stableFingerprint({ proposalId, fingerprint })}`;
    const proposal = deepFreeze({
        proposalId,
        confirmationId,
        tripId: baseline.id,
        ownerId: input.session.ownerId,
        sessionId: input.session.sessionId,
        baselineWorkspaceRevision: baseline.workspaceRevision,
        createdAt: input.createdAt,
        status: 'confirmable',
        baseline,
        proposed,
        diff,
        mutation,
        stages,
    });
    return { status: diff.isNoOp ? 'no_op' : 'ready', proposal, conflicts: [] };
}
class LatestTripRefreshProposalGenerator {
    generation = 0;
    active = null;
    async generate(input, buildCandidate, signal) {
        this.active?.abort();
        const generation = ++this.generation;
        const controller = new AbortController();
        this.active = controller;
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted)
            controller.abort();
        try {
            if (controller.signal.aborted)
                return { status: 'cancelled', proposal: null, conflicts: [] };
            const candidate = await buildCandidate(controller.signal);
            if (generation !== this.generation)
                return { status: 'superseded', proposal: null, conflicts: [] };
            if (controller.signal.aborted)
                return { status: 'cancelled', proposal: null, conflicts: [] };
            return createTripRefreshProposal({ ...input, ...candidate });
        }
        catch (error) {
            const mapped = (0, errors_1.mapUnknownTransportError)(error);
            if (controller.signal.aborted || mapped.code === 'cancelled') {
                return { status: generation === this.generation ? 'cancelled' : 'superseded', proposal: null, conflicts: [] };
            }
            return { status: 'invalid_proposal', proposal: null, conflicts: [] };
        }
        finally {
            signal?.removeEventListener('abort', abort);
            if (generation === this.generation)
                this.active = null;
        }
    }
    cancel() {
        this.active?.abort();
    }
}
exports.LatestTripRefreshProposalGenerator = LatestTripRefreshProposalGenerator;
class TripRefreshCoordinator {
    savedTrips;
    applyRepository;
    proposals = new Map();
    applied = new Map();
    inFlight = new Map();
    confirmationControllers = new Map();
    constructor(savedTrips, applyRepository) {
        this.savedTrips = savedTrips;
        this.applyRepository = applyRepository;
    }
    open(input) {
        const result = createTripRefreshProposal(input);
        if (result.proposal) {
            if (!this.proposals.has(result.proposal.proposalId)
                && this.proposals.size >= exports.TRIP_REFRESH_BOUNDS.maxOpenProposals) {
                const oldestProposalId = this.proposals.keys().next().value;
                if (oldestProposalId) {
                    this.confirmationControllers.get(oldestProposalId)?.abort();
                    this.proposals.delete(oldestProposalId);
                    this.applied.delete(oldestProposalId);
                }
            }
            this.proposals.set(result.proposal.proposalId, result.proposal);
        }
        return result;
    }
    clearSession(session) {
        for (const [proposalId, proposal] of this.proposals) {
            if (proposal.ownerId === session.ownerId && proposal.sessionId === session.sessionId) {
                this.confirmationControllers.get(proposalId)?.abort();
                this.proposals.delete(proposalId);
                this.applied.delete(proposalId);
            }
        }
    }
    confirm(command, session, signal) {
        const proposal = this.proposals.get(command.proposalId);
        if (!proposal)
            return Promise.resolve({ status: 'proposal_not_found', proposalId: command.proposalId, mutationCount: 0 });
        if (!isValidSession(session)
            || proposal.ownerId !== session.ownerId
            || proposal.sessionId !== session.sessionId
            || proposal.confirmationId !== command.confirmationId
            || proposal.tripId !== command.tripId
            || proposal.baselineWorkspaceRevision !== command.expectedBaselineRevision) {
            return Promise.resolve({ status: 'invalid_confirmation', proposalId: command.proposalId, mutationCount: 0 });
        }
        const prior = this.applied.get(proposal.proposalId);
        if (prior) {
            return Promise.resolve({
                status: 'proposal_already_applied', proposalId: proposal.proposalId,
                revision: prior.revision, mutationCount: 0,
            });
        }
        const pending = this.inFlight.get(proposal.proposalId);
        if (pending)
            return pending;
        const controller = new AbortController();
        const abort = () => controller.abort();
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted)
            controller.abort();
        this.confirmationControllers.set(proposal.proposalId, controller);
        const operation = this.confirmOnce(proposal, controller.signal).finally(() => {
            signal?.removeEventListener('abort', abort);
            this.inFlight.delete(proposal.proposalId);
            this.confirmationControllers.delete(proposal.proposalId);
        });
        this.inFlight.set(proposal.proposalId, operation);
        return operation;
    }
    async confirmOnce(proposal, signal) {
        if (signal?.aborted)
            return { status: 'cancelled', proposalId: proposal.proposalId, mutationCount: 0 };
        const finalConstraints = (0, deterministicConstraintEngine_1.evaluatePlanConstraints)(proposal.proposed, proposal.baseline);
        if (!finalConstraints.isValid) {
            return { status: 'protected_constraint_conflict', proposalId: proposal.proposalId, mutationCount: 0 };
        }
        let authoritative;
        try {
            authoritative = await this.savedTrips.getDetail(proposal.tripId, signal);
        }
        catch (error) {
            const mapped = (0, errors_1.mapUnknownTransportError)(error);
            return {
                status: mapped.code === 'cancelled' ? 'cancelled' : 'persistence_failure',
                proposalId: proposal.proposalId,
                mutationCount: 0,
            };
        }
        if (signal?.aborted)
            return { status: 'cancelled', proposalId: proposal.proposalId, mutationCount: 0 };
        if (!authoritative
            || authoritative.id !== proposal.tripId
            || authoritative.workspaceRevision !== proposal.baselineWorkspaceRevision) {
            return { status: 'stale_baseline_revision', proposalId: proposal.proposalId, mutationCount: 0 };
        }
        if (proposal.diff.isNoOp) {
            const result = { revision: proposal.baselineWorkspaceRevision, noOp: true };
            this.applied.set(proposal.proposalId, result);
            return { status: 'no_op', proposalId: proposal.proposalId, revision: result.revision, mutationCount: 0 };
        }
        try {
            const applied = await this.applyRepository.applyReviewedProposal({
                proposalId: proposal.proposalId,
                confirmationId: proposal.confirmationId,
                idempotencyKey: proposal.confirmationId,
                tripId: proposal.tripId,
                expectedRevision: proposal.baselineWorkspaceRevision,
                reviewedMutation: proposal.mutation,
            }, signal);
            if (signal?.aborted || !this.proposals.has(proposal.proposalId)) {
                return { status: 'cancelled', proposalId: proposal.proposalId, mutationCount: 0 };
            }
            if (!Number.isInteger(applied.revision)
                || (applied.noOp === true
                    ? applied.revision !== proposal.baselineWorkspaceRevision
                    : applied.revision <= proposal.baselineWorkspaceRevision)) {
                return { status: 'persistence_failure', proposalId: proposal.proposalId, mutationCount: 0 };
            }
            const record = { revision: applied.revision, noOp: applied.noOp === true };
            this.applied.set(proposal.proposalId, record);
            return applied.noOp
                ? { status: 'no_op', proposalId: proposal.proposalId, revision: applied.revision, mutationCount: 0 }
                : { status: 'success', proposalId: proposal.proposalId, revision: applied.revision, mutationCount: 1 };
        }
        catch (error) {
            const mapped = error instanceof errors_1.IntegrationError ? error : (0, errors_1.mapUnknownTransportError)(error);
            if (mapped.code === 'conflict') {
                return { status: 'stale_baseline_revision', proposalId: proposal.proposalId, mutationCount: 0 };
            }
            return {
                status: mapped.code === 'cancelled' ? 'cancelled' : 'persistence_failure',
                proposalId: proposal.proposalId,
                mutationCount: 0,
            };
        }
    }
}
exports.TripRefreshCoordinator = TripRefreshCoordinator;
