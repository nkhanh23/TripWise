jest.mock('../src/lib/supabase/client', () => ({ supabase: { auth: { onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })), getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }) } } }));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn() }));
import * as Notifications from 'expo-notifications';
import type { AuthenticatedSession } from '../src/integration/contracts';
import { createEffectiveReminderPolicy } from '../src/integration/notificationPolicy';
import { createNotificationPolicyReconciler, startNotificationPolicyRuntime } from '../src/integration/notificationPolicyRuntime';
import { reminderOwnerScope } from '../src/integration/reminderEngine';
import type { ReminderNotificationRepository, ScheduledReminder } from '../src/integration/reminderScheduling';

const session: AuthenticatedSession = { user: { id: '11111111-1111-4111-8111-111111111111' as never, email: null, displayName: null }, expiresAt: null };
const policy = createEffectiveReminderPolicy({ authenticated: true, intent: { tripReminders: false, itineraryReminders: true }, permission: 'granted', locale: 'en' });
const reminders: ScheduledReminder[] = ['TRIP_STARTING_SOON', 'DAY_STARTING'].map((type, index) => ({ nativeId: String(index), type: type as ScheduledReminder['type'], ownerScope: reminderOwnerScope(session.user.id), tripId: 'trip', triggerAt: Date.now() + 100000, logicalId: String(index), fingerprint: 'opaque' }));
function fixture() {
  let current: AuthenticatedSession | null = session;
  const native: jest.Mocked<ReminderNotificationRepository> = { prepare: jest.fn(), list: jest.fn().mockResolvedValue(reminders), schedule: jest.fn(), cancel: jest.fn().mockResolvedValue(undefined) };
  const load = jest.fn().mockRejectedValue(new Error('offline'));
  return { native, load, switchUser: () => { current = null; }, reconcile: createNotificationPolicyReconciler(native, () => current, load) };
}
describe('T003 uses real T002 reconciliation', () => {
  it('OFF cancels only affected types without a network read or schedule', async () => {
    const f = fixture(); await f.reconcile.reconcile(policy, session, new AbortController().signal, ['TRIP_STARTING_SOON']);
    expect(f.native.cancel.mock.calls).toEqual([['0']]); expect(f.native.schedule).not.toHaveBeenCalled(); expect(f.load).not.toHaveBeenCalled();
  });
  it('permission denied removes own reminders and schedules none', async () => {
    const f = fixture(); await f.reconcile.reconcile({ ...policy, canSchedule: false }, session, new AbortController().signal);
    expect(f.native.cancel).toHaveBeenCalledTimes(2); expect(f.native.schedule).not.toHaveBeenCalled(); expect(f.load).not.toHaveBeenCalled();
  });
  it('does not mutate native after a stale enumeration', async () => {
    const f = fixture(); f.native.list.mockImplementation(async () => { f.switchUser(); return reminders; });
    await expect(f.reconcile.reconcile(policy, session, new AbortController().signal, ['TRIP_STARTING_SOON'])).rejects.toThrow();
    expect(f.native.cancel).not.toHaveBeenCalled(); expect(f.native.schedule).not.toHaveBeenCalled();
  });
  it('launch/bootstrap and cleanup do not request permission', async () => {
    const stop = startNotificationPolicyRuntime(); await Promise.resolve(); stop();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
  it('new OFF enumeration waits for an already-dispatched native mutation', async () => {
    const f = fixture(); let finish!: () => void;
    f.native.cancel.mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve; }));
    const firstSignal = new AbortController();
    const first = f.reconcile.reconcile(policy, session, firstSignal.signal, ['TRIP_STARTING_SOON']).catch(() => undefined);
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(f.native.cancel).toHaveBeenCalledTimes(1);
    firstSignal.abort();
    const second = f.reconcile.reconcile(policy, session, new AbortController().signal, ['DAY_STARTING']);
    for (let i = 0; i < 10; i++) await Promise.resolve();
    expect(f.native.list).toHaveBeenCalledTimes(1);
    finish(); await Promise.all([first, second]); expect(f.native.list).toHaveBeenCalledTimes(2);
  });
});
