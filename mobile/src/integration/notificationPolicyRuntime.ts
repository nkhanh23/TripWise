import type { Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase/client';
import type { AuthenticatedSession, SavedTripDetail } from './contracts';
import { IntegrationError, mapPostgrestError } from './errors';
import { mapAuthenticatedSession } from './mappers';
import { asReminderEligibility } from './notificationPolicy';
import { NotificationPolicyController, type NotificationPolicyReconciler } from './notificationPolicyController';
import { ReminderScheduler, type ReminderNotificationRepository } from './reminderScheduling';
import { ExpoNotificationPermissionAdapter } from './remote/expoNotificationPermissionAdapter';
import { ExpoReminderNotificationRepository } from './remote/expoNotificationRepository';
import { OsrmRouteRepository } from './remote/publicProviderRepositories';
import { SupabaseNotificationPreferencesRepository } from './remote/supabaseNotificationPreferencesRepository';
import { SupabaseSavedTripsRepository } from './remote/supabaseTripRepositories';
import { asTripId } from './validation';
import { executeWithReliability, supabaseMutationPolicy } from './reliability';

let session: AuthenticatedSession | null = null;
const getSession = () => session;

export function createNotificationPolicyReconciler(
  native: ReminderNotificationRepository,
  currentSession: () => AuthenticatedSession | null,
  loadTrips: (signal: AbortSignal) => Promise<readonly SavedTripDetail[]>,
  routes = new OsrmRouteRepository(),
): NotificationPolicyReconciler {
  // Drain an already dispatched native mutation before a newer OFF enumeration.
  // Network trip reads never hold this queue. Stale queued work is checked at dispatch.
  let nativeWork: Promise<unknown> = Promise.resolve();
  const serialized = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = nativeWork.catch(() => undefined).then(operation);
    nativeWork = result;
    return result;
  };
  return {
    async reconcile(policy, expected, signal, revokeTypes) {
      const guard = () => {
        if (signal.aborted || currentSession() !== expected
          || (expected.expiresAt !== null && expected.expiresAt * 1000 <= Date.now())) throw new IntegrationError('cancelled');
      };
      guard();
      const revoked = revokeTypes ? new Set(revokeTypes) : null;
      const scoped: ReminderNotificationRepository = {
        list: () => serialized(async () => { guard(); const values = await native.list(); guard(); return revoked ? values.filter((value) => revoked.has(value.type)) : values; }),
        prepare: () => serialized(async () => { guard(); await native.prepare(); guard(); }),
        schedule: (request) => serialized(async () => { guard(); return native.schedule(request); }),
        cancel: (id) => serialized(async () => { guard(); await native.cancel(id); }),
      };
      // A revocation needs only native enumeration, never a network trip read or route acquisition.
      const trips = revoked || !policy.canSchedule ? [] : await loadTrips(signal);
      guard();
      const scheduler = new ReminderScheduler(routes, scoped, currentSession);
      const result = await scheduler.reconcile(trips, revoked ? { canSchedule: false } : asReminderEligibility(policy), signal);
      guard();
      if (result.failureCount > 0 || result.status === 'partial_failure') throw new IntegrationError('providerUnavailable');
    },
  };
}

async function loadRelevantTrips(signal: AbortSignal): Promise<SavedTripDetail[]> {
  const expected = session;
  if (!expected) throw new IntegrationError('unauthorized');
  const now = Date.now();
  // Broad UTC date envelope includes every IANA local date in the locked seven-day T002 window.
  const from = new Date(now - 2 * 86_400_000).toISOString().slice(0, 10);
  const to = new Date(now + 9 * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await executeWithReliability(async (bounded) => await supabase.from('trips').select('id').eq('user_id', expected.user.id)
    .gte('end_date', from).lte('start_date', to).order('id').limit(61).abortSignal(bounded), supabaseMutationPolicy, signal);
  if (signal.aborted || session !== expected) throw new IntegrationError('cancelled');
  if (error) throw mapPostgrestError(error);
  // Do not reconcile a truncated desired set: it could cancel reminders outside the loaded page.
  if (!data || data.length > 60) throw new IntegrationError('invalidResponse');
  const repository = new SupabaseSavedTripsRepository(supabase);
  const details: SavedTripDetail[] = [];
  for (const row of data) {
    if (signal.aborted || session !== expected) throw new IntegrationError('cancelled');
    const detail = await repository.getDetail(asTripId(row.id), signal);
    if (!detail) throw new IntegrationError('notFound');
    details.push(detail);
  }
  return details;
}

export const notificationPolicyController = new NotificationPolicyController(
  new SupabaseNotificationPreferencesRepository(supabase, getSession),
  new ExpoNotificationPermissionAdapter(),
  createNotificationPolicyReconciler(new ExpoReminderNotificationRepository(), getSession, loadRelevantTrips),
);

/** Auth invalidation is policy isolation only. No sign-out native cleanup or generic resume reconciliation. */
export function startNotificationPolicyRuntime(): () => void {
  let eventVersion = 0;
  let stopped = false;
  const accept = (value: Session | null) => {
    if (stopped) return;
    try { session = value ? mapAuthenticatedSession(value) : null; } catch { session = null; }
    void notificationPolicyController.bindSession(session);
  };
  const subscription = supabase.auth.onAuthStateChange((_event, value) => { eventVersion += 1; accept(value); }).data.subscription;
  const version = eventVersion;
  void supabase.auth.getSession().then(({ data, error }) => {
    if (eventVersion === version) accept(error ? null : data.session);
  }).catch(() => { if (eventVersion === version) accept(null); });
  const appState = AppState.addEventListener('change', (state) => { void notificationPolicyController.appStateChanged(state); });
  return () => {
    stopped = true; subscription.unsubscribe(); appState.remove(); session = null;
    void notificationPolicyController.bindSession(null);
  };
}
