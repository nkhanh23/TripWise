"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseNotificationPreferencesRepository = void 0;
exports.parseNotificationIntent = parseNotificationIntent;
const errors_1 = require("../errors");
const notificationPolicy_1 = require("../notificationPolicy");
const validation_1 = require("../validation");
const reliability_1 = require("../reliability");
function parseNotificationIntent(value, ownerId) {
    if (!(0, validation_1.isRecord)(value) || value.user_id !== ownerId || typeof value.trip_reminders !== 'boolean'
        || typeof value.itinerary_reminders !== 'boolean')
        throw new errors_1.IntegrationError('invalidResponse');
    return { tripReminders: value.trip_reminders, itineraryReminders: value.itinerary_reminders };
}
class SupabaseNotificationPreferencesRepository {
    client;
    getSession;
    constructor(client, getSession) {
        this.client = client;
        this.getSession = getSession;
    }
    guard(session, signal) {
        if (signal.aborted)
            throw new errors_1.IntegrationError('cancelled');
        if (this.getSession() !== session || !(0, validation_1.isUuid)(session.user.id)
            || (session.expiresAt !== null && session.expiresAt * 1000 <= Date.now()))
            throw new errors_1.IntegrationError('sessionExpired');
    }
    async getOwn(session, signal) {
        return (0, reliability_1.executeWithReliability)((bounded) => this.read(session, bounded), reliability_1.supabaseMutationPolicy, signal);
    }
    async read(session, signal) {
        this.guard(session, signal);
        try {
            const { data, error } = await this.client.from('notification_preferences')
                .select('user_id,trip_reminders,itinerary_reminders').eq('user_id', session.user.id).abortSignal(signal).maybeSingle();
            this.guard(session, signal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return data === null ? { ...notificationPolicy_1.DEFAULT_NOTIFICATION_INTENT } : parseNotificationIntent(data, session.user.id);
        }
        catch (error) {
            throw error instanceof errors_1.IntegrationError ? error : new errors_1.IntegrationError('network');
        }
    }
    async saveOwn(session, patch, signal) {
        return (0, reliability_1.executeWithReliability)((bounded) => this.save(session, patch, bounded), reliability_1.supabaseMutationPolicy, signal);
    }
    async save(session, patch, signal) {
        this.guard(session, signal);
        if (!(0, validation_1.isRecord)(patch) || Object.keys(patch).length === 0
            || Object.entries(patch).some(([key, value]) => !['tripReminders', 'itineraryReminders'].includes(key) || typeof value !== 'boolean')) {
            throw new errors_1.IntegrationError('invalidRequest');
        }
        try {
            // Server default auth.uid() supplies identity. Missing rows are created OFF; concurrent creation is harmless.
            const created = await this.client.from('notification_preferences')
                .upsert({}, { onConflict: 'user_id', ignoreDuplicates: true }).abortSignal(signal);
            this.guard(session, signal);
            if (created.error)
                throw (0, errors_1.mapPostgrestError)(created.error);
            const payload = {
                ...(patch.tripReminders === undefined ? {} : { trip_reminders: patch.tripReminders }),
                ...(patch.itineraryReminders === undefined ? {} : { itinerary_reminders: patch.itineraryReminders }),
            };
            const { data, error } = await this.client.from('notification_preferences').update(payload)
                .eq('user_id', session.user.id).select('user_id,trip_reminders,itinerary_reminders').abortSignal(signal).single();
            this.guard(session, signal);
            if (error)
                throw (0, errors_1.mapPostgrestError)(error);
            return parseNotificationIntent(data, session.user.id);
        }
        catch (error) {
            throw error instanceof errors_1.IntegrationError ? error : new errors_1.IntegrationError('network');
        }
    }
}
exports.SupabaseNotificationPreferencesRepository = SupabaseNotificationPreferencesRepository;
