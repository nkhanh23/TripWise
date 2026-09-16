import type { AuthenticatedSession } from '../src/integration/contracts';
import { NotificationPolicyController, type NotificationPermissionAdapter, type NotificationPolicyReconciler, type NotificationPreferencesRepository } from '../src/integration/notificationPolicyController';
import type { NotificationIntent } from '../src/integration/notificationPolicy';

const a: AuthenticatedSession = { user: { id: '11111111-1111-4111-8111-111111111111' as never, email: null, displayName: null }, expiresAt: null };
const b: AuthenticatedSession = { ...a, user: { ...a.user, id: '22222222-2222-4222-8222-222222222222' as never } };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function fixture(initial: NotificationIntent = { tripReminders: false, itineraryReminders: false }) {
  let stored = { ...initial };
  const repository = { getOwn: jest.fn(async () => ({ ...stored })), saveOwn: jest.fn(async (_session, patch) => { stored = { ...stored, ...patch }; return { ...stored }; }) } satisfies NotificationPreferencesRepository;
  const permissions: jest.Mocked<NotificationPermissionAdapter> = { get: jest.fn().mockResolvedValue('granted'), requestFromExplicitUserAction: jest.fn().mockResolvedValue('granted'), openSettings: jest.fn().mockResolvedValue(undefined) };
  const reconciler: jest.Mocked<NotificationPolicyReconciler> = { reconcile: jest.fn().mockResolvedValue(undefined) };
  return { controller: new NotificationPolicyController(repository, permissions, reconciler), repository, permissions, reconciler };
}

describe('T003 owner/session controller', () => {
  it('loads at bootstrap with no request or reconcile; ordinary resume does nothing', async () => {
    const f = fixture(); await f.controller.bindSession(a); await f.controller.appStateChanged('active'); await f.controller.load();
    expect(f.permissions.requestFromExplicitUserAction).not.toHaveBeenCalled(); expect(f.reconciler.reconcile).not.toHaveBeenCalled();
  });
  it('persists ON before asking and scheduling', async () => {
    const f = fixture(); await f.controller.bindSession(a); f.permissions.get.mockResolvedValue('unknown');
    await f.controller.setCategory('tripReminders', true);
    expect(f.repository.saveOwn.mock.invocationCallOrder[0]).toBeLessThan(f.permissions.requestFromExplicitUserAction.mock.invocationCallOrder[0]);
    expect(f.controller.policy().allowedTypes).toEqual(['TRIP_STARTING_SOON']); expect(f.controller.policy().canSchedule).toBe(true);
    expect(f.reconciler.reconcile).toHaveBeenCalledTimes(1);
  });
  it('does not prompt or enable after failed persistence', async () => {
    const f = fixture(); await f.controller.bindSession(a); f.repository.saveOwn.mockRejectedValue(new Error('private token'));
    await f.controller.setCategory('tripReminders', true);
    expect(f.controller.policy().canSchedule).toBe(false); expect(f.permissions.requestFromExplicitUserAction).not.toHaveBeenCalled();
    expect(f.controller.getSnapshot().error).toBe('sync'); expect(JSON.stringify(f.controller.getSnapshot())).not.toContain('private token');
  });
  it('retains durable intent after denial, with no nag from load/resume/retry', async () => {
    const f = fixture(); await f.controller.bindSession(a); f.permissions.get.mockResolvedValue('denied_requestable'); f.permissions.requestFromExplicitUserAction.mockResolvedValue('denied_requestable');
    await f.controller.setCategory('tripReminders', true); await f.controller.load(); await f.controller.retry(); await f.controller.appStateChanged('active');
    expect(f.controller.getSnapshot().intent.tripReminders).toBe(true); expect(f.controller.policy().canSchedule).toBe(false);
    expect(f.permissions.requestFromExplicitUserAction).toHaveBeenCalledTimes(1);
  });
  it('blocked denial never prompts', async () => {
    const f = fixture(); await f.controller.bindSession(a); f.permissions.get.mockResolvedValue('denied_blocked');
    await f.controller.setCategory('tripReminders', true); expect(f.permissions.requestFromExplicitUserAction).not.toHaveBeenCalled();
  });
  it('OFF is immediate and cancellation starts before unresolved persistence', async () => {
    const f = fixture({ tripReminders: true, itineraryReminders: true }); await f.controller.bindSession(a);
    const wait = deferred<NotificationIntent>(); f.repository.saveOwn.mockReturnValueOnce(wait.promise);
    const operation = f.controller.setCategory('tripReminders', false);
    expect(f.controller.policy().allowedTypes).toEqual(['DAY_STARTING', 'PLACE_UPCOMING', 'LEAVE_SOON', 'LATE_RISK']);
    expect(f.reconciler.reconcile).toHaveBeenCalledWith(expect.anything(), a, expect.anything(), ['TRIP_STARTING_SOON']);
    expect(f.repository.saveOwn).not.toHaveBeenCalled();
    wait.resolve({ tripReminders: false, itineraryReminders: true }); await operation;
    expect(f.permissions.requestFromExplicitUserAction).not.toHaveBeenCalled();
  });
  it('OFF survives sync failure, stale remote true, load and same-owner token refresh; explicit retry persists OFF', async () => {
    const f = fixture({ tripReminders: true, itineraryReminders: false }); await f.controller.bindSession(a);
    f.repository.saveOwn.mockRejectedValueOnce(new Error('sql-secret'));
    await f.controller.setCategory('tripReminders', false); expect(f.controller.getSnapshot().error).toBe('sync');
    await f.controller.load(); expect(f.controller.policy().canSchedule).toBe(false);
    await f.controller.bindSession({ ...a }); expect(f.controller.policy().canSchedule).toBe(false);
    await f.controller.retry(); expect(f.controller.getSnapshot().intent.tripReminders).toBe(false);
    expect(f.repository.saveOwn).toHaveBeenLastCalledWith(expect.anything(), { tripReminders: false }, expect.anything());
  });
  it('two immediate OFF actions cancel both revoked categories', async () => {
    const f = fixture({ tripReminders: true, itineraryReminders: true }); await f.controller.bindSession(a);
    await Promise.all([f.controller.setCategory('tripReminders', false), f.controller.setCategory('itineraryReminders', false)]);
    expect(f.reconciler.reconcile.mock.calls[1][3]).toHaveLength(5); expect(f.controller.policy().canSchedule).toBe(false);
  });
  it('discards stale preference load on A -> B', async () => {
    const f = fixture(); const wait = deferred<NotificationIntent>(); f.repository.getOwn.mockReturnValueOnce(wait.promise);
    const loading = f.controller.bindSession(a); await f.controller.bindSession(b); wait.resolve({ tripReminders: true, itineraryReminders: true }); await loading;
    expect(f.controller.getSnapshot().session).toBe(b); expect(f.controller.policy().canSchedule).toBe(false);
  });
  it('discards stale write and does not query permission or reconcile', async () => {
    const f = fixture(); await f.controller.bindSession(a); const wait = deferred<NotificationIntent>(); f.repository.saveOwn.mockReturnValueOnce(wait.promise);
    const operation = f.controller.setCategory('tripReminders', true); await Promise.resolve(); await Promise.resolve();
    await f.controller.bindSession(b); wait.resolve({ tripReminders: true, itineraryReminders: false }); await operation;
    expect(f.controller.policy().canSchedule).toBe(false); expect(f.reconciler.reconcile).not.toHaveBeenCalled();
  });
  it('sign-out during permission request discards grant and performs no native mutation', async () => {
    const f = fixture(); await f.controller.bindSession(a); f.permissions.get.mockResolvedValue('unknown');
    const wait = deferred<'granted'>(); f.permissions.requestFromExplicitUserAction.mockReturnValueOnce(wait.promise);
    const operation = f.controller.setCategory('tripReminders', true);
    for (let i = 0; i < 8; i++) await Promise.resolve();
    expect(f.permissions.requestFromExplicitUserAction).toHaveBeenCalledTimes(1);
    await f.controller.bindSession(null); wait.resolve('granted'); await operation;
    expect(f.controller.policy().canSchedule).toBe(false); expect(f.reconciler.reconcile).not.toHaveBeenCalled();
  });
  it('explicit system-settings return refreshes permission and reconciles once, without requesting', async () => {
    const f = fixture({ tripReminders: true, itineraryReminders: false }); await f.controller.bindSession(a);
    await f.controller.openSystemSettings(); await f.controller.appStateChanged('active');
    expect(f.reconciler.reconcile).not.toHaveBeenCalled();
    await f.controller.appStateChanged('background'); await f.controller.appStateChanged('active'); await f.controller.appStateChanged('active');
    expect(f.permissions.get).toHaveBeenCalledTimes(2); expect(f.reconciler.reconcile).toHaveBeenCalledTimes(1);
    expect(f.permissions.requestFromExplicitUserAction).not.toHaveBeenCalled();
  });
  it('account switch invalidates the system-settings return ticket', async () => {
    const f = fixture(); await f.controller.bindSession(a); await f.controller.openSystemSettings(); await f.controller.appStateChanged('background');
    await f.controller.bindSession(b); await f.controller.appStateChanged('active'); expect(f.reconciler.reconcile).not.toHaveBeenCalled();
  });
  it('native OFF failure retries cancellation without fetching a desired trip set', async () => {
    const f = fixture({ tripReminders: true, itineraryReminders: true }); await f.controller.bindSession(a);
    f.reconciler.reconcile.mockRejectedValueOnce(new Error('native unavailable'));
    await f.controller.setCategory('tripReminders', false); await f.controller.retry();
    expect(f.reconciler.reconcile).toHaveBeenLastCalledWith(expect.anything(), a, expect.anything(), ['TRIP_STARTING_SOON']);
  });
  it('discards a stale permission read when account changes', async () => {
    const f = fixture(); const wait = deferred<'granted'>(); f.permissions.get.mockReturnValueOnce(wait.promise);
    const loadA = f.controller.bindSession(a); f.permissions.get.mockResolvedValue('denied_blocked');
    await f.controller.bindSession(b); wait.resolve('granted'); await loadA;
    expect(f.controller.getSnapshot().permission).toBe('denied_blocked');
    expect(f.controller.getSnapshot().session).toBe(b);
  });
});
