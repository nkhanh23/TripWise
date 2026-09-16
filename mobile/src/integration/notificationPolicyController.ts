import type { AuthenticatedSession } from './contracts';
import { IntegrationError } from './errors';
import { createEffectiveReminderPolicy, DEFAULT_NOTIFICATION_INTENT, type EffectiveReminderPolicy, type NotificationIntent, type NotificationLocale, type NotificationPermissionState } from './notificationPolicy';
import type { ReminderType } from './reminderEngine';

export type NotificationCategory = keyof NotificationIntent;
export interface NotificationPreferencesRepository {
  getOwn(session: AuthenticatedSession, signal: AbortSignal): Promise<NotificationIntent>;
  saveOwn(session: AuthenticatedSession, patch: Partial<NotificationIntent>, signal: AbortSignal): Promise<NotificationIntent>;
}
export interface NotificationPermissionAdapter {
  get(): Promise<NotificationPermissionState>;
  requestFromExplicitUserAction(isCurrent: () => boolean): Promise<NotificationPermissionState>;
  openSettings(): Promise<void>;
}
export interface NotificationPolicyReconciler {
  reconcile(policy: EffectiveReminderPolicy, session: AuthenticatedSession, signal: AbortSignal, revokeTypes?: readonly ReminderType[]): Promise<void>;
}
export type NotificationPolicySnapshot = {
  session: AuthenticatedSession | null;
  intent: NotificationIntent;
  permission: NotificationPermissionState;
  loading: boolean;
  busy: boolean;
  stale: boolean;
  error: 'load' | 'sync' | 'permission' | 'reconcile' | null;
};

/** Session-owned policy state survives Settings unmounts. No lifecycle native cleanup. */
export class NotificationPolicyController {
  private state: NotificationPolicySnapshot = {
    session: null, intent: { ...DEFAULT_NOTIFICATION_INTENT }, permission: 'unknown', loading: true, busy: false, stale: false, error: null,
  };
  private listeners = new Set<() => void>();
  private operation = new AbortController();
  private revoked = new Set<NotificationCategory>();
  private pendingOff = new Set<NotificationCategory>();
  private pendingNativeRevocation = false;
  private writes: Promise<unknown> = Promise.resolve();
  private settingsReturn: { session: AuthenticatedSession; departed: boolean } | null = null;
  private locale: NotificationLocale = 'en';

  constructor(private readonly repository: NotificationPreferencesRepository,
    private readonly permissions: NotificationPermissionAdapter,
    private readonly reconciler: NotificationPolicyReconciler) {}

  getSnapshot = (): NotificationPolicySnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(patch: Partial<NotificationPolicySnapshot>): void {
    this.state = { ...this.state, ...patch };
    const session = this.state.session;
    this.state.stale = !!session && session.expiresAt !== null && session.expiresAt * 1000 <= Date.now();
    this.listeners.forEach((listener) => listener());
  }
  setLocale(locale: NotificationLocale): void { this.locale = locale; }
  private current(session: AuthenticatedSession, signal: AbortSignal): boolean {
    return !signal.aborted && this.state.session === session
      && (session.expiresAt === null || session.expiresAt * 1000 > Date.now());
  }
  private begin(): AbortSignal { this.operation.abort(); this.operation = new AbortController(); return this.operation.signal; }
  private overlay(intent: NotificationIntent): NotificationIntent {
    return { tripReminders: intent.tripReminders && !this.revoked.has('tripReminders'),
      itineraryReminders: intent.itineraryReminders && !this.revoked.has('itineraryReminders') };
  }
  policy(): EffectiveReminderPolicy {
    return createEffectiveReminderPolicy({ authenticated: !!this.state.session && !this.state.loading,
      stale: !!this.state.session && !this.current(this.state.session, this.operation.signal),
      intent: this.overlay(this.state.intent), permission: this.state.permission, locale: this.locale });
  }
  async bindSession(session: AuthenticatedSession | null): Promise<void> {
    if (session === this.state.session && !this.state.loading) return;
    const sameOwner = session !== null && session.user.id === this.state.session?.user.id;
    this.begin();
    this.settingsReturn = null;
    if (!sameOwner) { this.revoked.clear(); this.pendingOff.clear(); this.pendingNativeRevocation = false; }
    this.publish({ session, intent: { ...DEFAULT_NOTIFICATION_INTENT }, permission: 'unknown', loading: !!session, busy: false, error: null });
    if (session) await this.load();
  }
  async load(): Promise<void> {
    const session = this.state.session;
    if (!session || this.state.busy) return;
    const signal = this.begin();
    this.publish({ loading: true, error: null });
    try {
      const [intent, permission] = await Promise.all([this.repository.getOwn(session, signal), this.permissions.get()]);
      if (this.current(session, signal)) this.publish({ intent: this.overlay(intent), permission, loading: false,
        error: this.pendingOff.size ? 'sync' : null });
    } catch {
      if (this.current(session, signal)) this.publish({ intent: { ...DEFAULT_NOTIFICATION_INTENT }, permission: 'unknown', loading: false, error: 'load' });
    }
  }
  private write(session: AuthenticatedSession, patch: Partial<NotificationIntent>, signal: AbortSignal): Promise<NotificationIntent> {
    // Serialize writes: an earlier enable cannot complete after a later OFF write.
    const result = this.writes.catch(() => undefined).then(() => {
      if (!this.current(session, signal)) throw new IntegrationError('cancelled');
      return this.repository.saveOwn(session, patch, signal);
    });
    this.writes = result;
    return result;
  }
  async setCategory(category: NotificationCategory, enabled: boolean): Promise<void> {
    const session = this.state.session;
    if (!session || (enabled && (this.state.loading || this.state.busy))) return;
    const signal = this.begin();
    this.publish({ busy: true, error: null });
    if (!enabled) {
      this.revoked.add(category);
      this.pendingOff.add(category);
      this.publish({ intent: { ...this.state.intent, [category]: false } });
      const types: readonly ReminderType[] = [
        ...(this.revoked.has('tripReminders') ? ['TRIP_STARTING_SOON' as const] : []),
        ...(this.revoked.has('itineraryReminders') ? ['DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK'] as const : []),
      ];
      // Start native cancellation before initiating persistence; neither waits for the network.
      const cancellation = this.reconciler.reconcile(this.policy(), session, signal, types)
        .then(() => { if (this.current(session, signal)) this.pendingNativeRevocation = false; })
        .catch(() => { if (this.current(session, signal)) { this.pendingNativeRevocation = true; this.publish({ error: 'reconcile' }); } });
      try {
        const saved = await this.write(session, { [category]: false }, signal);
        if (this.current(session, signal)) {
          this.pendingOff.delete(category);
          this.publish({ intent: this.overlay(saved), error: this.pendingOff.size ? 'sync' : this.state.error });
        }
      } catch { if (this.current(session, signal)) this.publish({ error: 'sync' }); }
      await cancellation;
    } else {
      try {
        const saved = await this.write(session, { [category]: true }, signal);
        if (!this.current(session, signal)) return;
        this.revoked.delete(category);
        this.pendingOff.delete(category);
        // Durable intent is visible even if the OS denies or its query fails.
        this.publish({ intent: this.overlay(saved), permission: 'unknown' });
        try {
          let permission = await this.permissions.get();
          if (!this.current(session, signal)) return;
          if (permission === 'unknown' || permission === 'denied_requestable') {
            permission = await this.permissions.requestFromExplicitUserAction(() => this.current(session, signal));
          }
          if (!this.current(session, signal)) return;
          this.publish({ permission });
        } catch {
          if (this.current(session, signal)) this.publish({ permission: 'unknown', error: 'permission' });
          return;
        }
        try { await this.reconciler.reconcile(this.policy(), session, signal); }
        catch { if (this.current(session, signal)) this.publish({ error: 'reconcile' }); }
      } catch { if (this.current(session, signal)) this.publish({ error: 'sync' }); }
      finally { if (this.current(session, signal)) this.publish({ busy: false }); }
    }
    if (this.current(session, signal)) this.publish({ busy: false });
  }
  async retry(): Promise<void> {
    if (this.state.busy) return;
    if (this.pendingOff.size || this.pendingNativeRevocation) {
      const categories = this.pendingNativeRevocation ? this.revoked : this.pendingOff;
      for (const category of [...categories]) await this.setCategory(category, false);
    } else if (this.state.error === 'reconcile') {
      const session = this.state.session;
      if (!session) return;
      const signal = this.begin();
      this.publish({ busy: true, error: null });
      try { await this.reconciler.reconcile(this.policy(), session, signal); }
      catch { if (this.current(session, signal)) this.publish({ error: 'reconcile' }); }
      finally { if (this.current(session, signal)) this.publish({ busy: false }); }
    } else await this.load();
  }
  async openSystemSettings(): Promise<void> {
    const session = this.state.session;
    if (!session || this.state.busy || this.settingsReturn) return;
    this.settingsReturn = { session, departed: false };
    try { await this.permissions.openSettings(); }
    catch { if (this.settingsReturn?.session === session) { this.settingsReturn = null; this.publish({ error: 'permission' }); } }
  }
  async appStateChanged(state: string): Promise<void> {
    const ticket = this.settingsReturn;
    if (!ticket) return;
    if (state !== 'active') { ticket.departed = true; return; }
    if (!ticket.departed) return;
    this.settingsReturn = null;
    const signal = this.begin();
    if (!this.current(ticket.session, signal)) return;
    this.publish({ busy: true });
    try {
      const permission = await this.permissions.get();
      if (!this.current(ticket.session, signal)) return;
      this.publish({ permission });
      await this.reconciler.reconcile(this.policy(), ticket.session, signal);
    } catch { if (this.current(ticket.session, signal)) this.publish({ permission: 'unknown', error: 'permission' }); }
    finally { if (this.current(ticket.session, signal)) this.publish({ busy: false }); }
  }
}
