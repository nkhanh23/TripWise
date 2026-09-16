import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';
import type { AuthenticatedSession } from '../contracts';
import { IntegrationError, mapPostgrestError } from '../errors';
import { DEFAULT_NOTIFICATION_INTENT, type NotificationIntent } from '../notificationPolicy';
import type { NotificationPreferencesRepository } from '../notificationPolicyController';
import { isRecord, isUuid } from '../validation';
import { executeWithReliability, supabaseMutationPolicy } from '../reliability';

export function parseNotificationIntent(value: unknown, ownerId: string): NotificationIntent {
  if (!isRecord(value) || value.user_id !== ownerId || typeof value.trip_reminders !== 'boolean'
    || typeof value.itinerary_reminders !== 'boolean') throw new IntegrationError('invalidResponse');
  return { tripReminders: value.trip_reminders, itineraryReminders: value.itinerary_reminders };
}

export class SupabaseNotificationPreferencesRepository implements NotificationPreferencesRepository {
  constructor(private readonly client: SupabaseClient<Database>, private readonly getSession: () => AuthenticatedSession | null) {}
  private guard(session: AuthenticatedSession, signal: AbortSignal): void {
    if (signal.aborted) throw new IntegrationError('cancelled');
    if (this.getSession() !== session || !isUuid(session.user.id)
      || (session.expiresAt !== null && session.expiresAt * 1000 <= Date.now())) throw new IntegrationError('sessionExpired');
  }
  async getOwn(session: AuthenticatedSession, signal: AbortSignal): Promise<NotificationIntent> {
    return executeWithReliability((bounded) => this.read(session, bounded), supabaseMutationPolicy, signal);
  }
  private async read(session: AuthenticatedSession, signal: AbortSignal): Promise<NotificationIntent> {
    this.guard(session, signal);
    try {
      const { data, error } = await this.client.from('notification_preferences')
        .select('user_id,trip_reminders,itinerary_reminders').eq('user_id', session.user.id).abortSignal(signal).maybeSingle();
      this.guard(session, signal);
      if (error) throw mapPostgrestError(error);
      return data === null ? { ...DEFAULT_NOTIFICATION_INTENT } : parseNotificationIntent(data, session.user.id);
    } catch (error) { throw error instanceof IntegrationError ? error : new IntegrationError('network'); }
  }
  async saveOwn(session: AuthenticatedSession, patch: Partial<NotificationIntent>, signal: AbortSignal): Promise<NotificationIntent> {
    return executeWithReliability((bounded) => this.save(session, patch, bounded), supabaseMutationPolicy, signal);
  }
  private async save(session: AuthenticatedSession, patch: Partial<NotificationIntent>, signal: AbortSignal): Promise<NotificationIntent> {
    this.guard(session, signal);
    if (!isRecord(patch) || Object.keys(patch).length === 0
      || Object.entries(patch).some(([key, value]) => !['tripReminders', 'itineraryReminders'].includes(key) || typeof value !== 'boolean')) {
      throw new IntegrationError('invalidRequest');
    }
    try {
      // Server default auth.uid() supplies identity. Missing rows are created OFF; concurrent creation is harmless.
      const created = await this.client.from('notification_preferences')
        .upsert({}, { onConflict: 'user_id', ignoreDuplicates: true }).abortSignal(signal);
      this.guard(session, signal);
      if (created.error) throw mapPostgrestError(created.error);
      const payload = {
        ...(patch.tripReminders === undefined ? {} : { trip_reminders: patch.tripReminders }),
        ...(patch.itineraryReminders === undefined ? {} : { itinerary_reminders: patch.itineraryReminders }),
      };
      const { data, error } = await this.client.from('notification_preferences').update(payload)
        .eq('user_id', session.user.id).select('user_id,trip_reminders,itinerary_reminders').abortSignal(signal).single();
      this.guard(session, signal);
      if (error) throw mapPostgrestError(error);
      return parseNotificationIntent(data, session.user.id);
    } catch (error) { throw error instanceof IntegrationError ? error : new IntegrationError('network'); }
  }
}
