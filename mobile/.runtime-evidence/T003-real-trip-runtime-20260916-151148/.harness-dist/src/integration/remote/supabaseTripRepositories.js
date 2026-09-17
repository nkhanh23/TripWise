"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAtomicTripRefreshApplyRepository = exports.SupabaseTravelWorkspaceRepository = exports.SupabaseSavedTripsRepository = exports.SupabaseTripPersistenceRepository = exports.SupabaseTripGenerationRepository = void 0;
const errors_1 = require("../errors");
const reliability_1 = require("../reliability");
const validation_1 = require("../validation");
const tripRefresh_1 = require("../tripRefresh");
class SupabaseTripGenerationRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async generate(request, signal) {
        const body = (0, validation_1.validateGenerateTripRequest)(request);
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.functions.invoke('generate-trip', { body, signal: attemptSignal });
            if (error)
                throw (0, errors_1.mapGenerateTripError)(await (0, errors_1.readFunctionErrorPayload)(error));
            return (0, validation_1.parseGenerateTripSuccess)(data).data;
        }, reliability_1.tripGenerationPolicy, signal);
    }
}
exports.SupabaseTripGenerationRepository = SupabaseTripGenerationRepository;
class SupabaseTripPersistenceRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async persist(command, signal) {
        const stableCommand = (0, validation_1.validatePersistTripCommand)(command);
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('create_trip_graph', {
                p_idempotency_key: stableCommand.idempotencyKey,
                p_graph: stableCommand.graph,
            }).abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapPersistenceError)(error);
            return (0, validation_1.asTripId)(data);
        }, reliability_1.idempotentPersistencePolicy, signal);
    }
}
exports.SupabaseTripPersistenceRepository = SupabaseTripPersistenceRepository;
class SupabaseSavedTripsRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async list(request = {}, signal) {
        const normalized = (0, validation_1.validateSavedTripsPageRequest)(request);
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('list_saved_trips', {
                p_limit: normalized.limit,
                p_cursor_created_at: normalized.cursor?.createdAt,
                p_cursor_id: normalized.cursor?.id,
            }).abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return (0, validation_1.parseSavedTripsPage)(data);
        }, reliability_1.supabaseReadPolicy, signal);
    }
    async getDetail(tripId, signal) {
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('get_saved_trip_detail', { p_trip_id: tripId })
                .abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return (0, validation_1.parseSavedTripDetail)(data);
        }, reliability_1.supabaseReadPolicy, signal);
    }
    /** Legacy note-only API remains read-compatible; new P1 workspace edits use CAS mutate(). */
    async updateItemNote(itemId, note, signal) {
        const normalized = note === null ? null : note.trim();
        if (normalized !== null && normalized.length > 500)
            throw new errors_1.IntegrationError('invalidRequest');
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('update_itinerary_item_note', {
                p_item_id: itemId, p_note: (normalized === '' ? null : normalized),
            }).abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return data;
        }, reliability_1.supabaseMutationPolicy, signal);
    }
    async getStats(signal) {
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('get_user_trip_stats').abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return (0, validation_1.parseProfileStatistics)(data);
        }, reliability_1.supabaseReadPolicy, signal);
    }
    async deleteTrip(tripId, signal) {
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('delete_saved_trip', { p_trip_id: tripId })
                .abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return data;
        }, reliability_1.supabaseMutationPolicy, signal);
    }
}
exports.SupabaseSavedTripsRepository = SupabaseSavedTripsRepository;
/**
 * FEATURE-P1-T003 write boundary. Mutations are single-attempt CAS commands:
 * a revision conflict is returned to the caller and is never retried/overwritten.
 */
class SupabaseTravelWorkspaceRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async mutate(command, signal) {
        const stableCommand = (0, validation_1.validateWorkspaceMutationCommand)(command);
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = stableCommand.type === 'create_item'
                ? await this.client.rpc('create_travel_workspace_item', {
                    p_command: stableCommand,
                }).abortSignal(attemptSignal)
                : stableCommand.type === 'move_item'
                    ? await this.client.rpc('move_travel_workspace_item', {
                        p_command: stableCommand,
                    }).abortSignal(attemptSignal)
                    : await this.client.rpc('mutate_travel_workspace', {
                        p_command: stableCommand,
                    }).abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapWorkspaceMutationError)(error);
            return (0, validation_1.parseWorkspaceMutationResult)(data);
        }, reliability_1.supabaseMutationPolicy, signal);
    }
}
exports.SupabaseTravelWorkspaceRepository = SupabaseTravelWorkspaceRepository;
/**
 * T004's only production write boundary. The server owns CAS, durable
 * idempotency and the whole graph transaction; this adapter makes one RPC call.
 */
class SupabaseAtomicTripRefreshApplyRepository {
    client;
    constructor(client) {
        this.client = client;
    }
    async applyReviewedProposal(command, signal) {
        const stableCommand = (0, tripRefresh_1.validateAtomicTripRefreshApplyCommand)(command);
        const rpcPayload = {
            tripId: stableCommand.tripId,
            expectedRevision: stableCommand.expectedRevision,
            proposalId: stableCommand.proposalId,
            confirmationId: stableCommand.confirmationId,
            idempotencyKey: stableCommand.idempotencyKey,
            items: stableCommand.reviewedMutation.items.map((entry) => ({
                itemId: entry.itemId,
                dayId: entry.dayId,
                position: entry.position,
            })),
        };
        return (0, reliability_1.executeWithReliability)(async (attemptSignal) => {
            const { data, error } = await this.client.rpc('apply_trip_refresh', {
                p_command: rpcPayload,
            }).abortSignal(attemptSignal);
            if (error)
                throw (0, errors_1.mapTripRefreshApplyError)(error);
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new errors_1.IntegrationError('invalidResponse');
            }
            const record = data;
            if (!Number.isInteger(record.revision) || record.revision < 1
                || (record.noOp !== undefined && typeof record.noOp !== 'boolean')) {
                throw new errors_1.IntegrationError('invalidResponse');
            }
            return {
                revision: record.revision,
                ...(record.noOp === true ? { noOp: true } : {}),
            };
        }, reliability_1.tripRefreshApplyPolicy, signal);
    }
}
exports.SupabaseAtomicTripRefreshApplyRepository = SupabaseAtomicTripRefreshApplyRepository;
