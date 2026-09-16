import type { AuthenticatedSession } from '../src/integration/contracts';
import { SupabaseNotificationPreferencesRepository, parseNotificationIntent } from '../src/integration/remote/supabaseNotificationPreferencesRepository';

const session: AuthenticatedSession = { user: { id: '11111111-1111-4111-8111-111111111111' as never, email: null, displayName: null }, expiresAt: null };
const row = { user_id: session.user.id, trip_reminders: true, itinerary_reminders: false };
function fixture() {
  let current: AuthenticatedSession | null = session;
  const query = { select: jest.fn(), eq: jest.fn(), abortSignal: jest.fn(), maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }), single: jest.fn().mockResolvedValue({ data: row, error: null }), upsert: jest.fn(), update: jest.fn() };
  for (const method of ['select', 'eq', 'abortSignal', 'upsert', 'update'] as const) query[method].mockReturnValue(query);
  const client = { from: jest.fn().mockReturnValue(query) };
  return { query, client, switchUser: () => { current = null; }, repository: new SupabaseNotificationPreferencesRepository(client as never, () => current), signal: new AbortController().signal };
}
describe('T003 validated owner preference repository', () => {
  it('defaults absent rows OFF with explicit owner filtering', async () => {
    const f = fixture(); f.query.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(f.repository.getOwn(session, f.signal)).resolves.toEqual({ tripReminders: false, itineraryReminders: false });
    expect(f.query.eq).toHaveBeenCalledWith('user_id', session.user.id);
  });
  it('sends no client owner override and updates only the selected category', async () => {
    const f = fixture(); await f.repository.saveOwn(session, { tripReminders: true }, f.signal);
    expect(f.query.upsert).toHaveBeenCalledWith({}, { onConflict: 'user_id', ignoreDuplicates: true });
    expect(f.query.update).toHaveBeenCalledWith({ trip_reminders: true });
  });
  it.each([{}, { tripReminders: 'true' }, { user_id: session.user.id }, { permission: 'granted' }])('rejects untrusted patch %j', async (patch) => {
    const f = fixture(); await expect(f.repository.saveOwn(session, patch as never, f.signal)).rejects.toMatchObject({ code: 'invalidRequest' });
    expect(f.client.from).not.toHaveBeenCalled();
  });
  it.each([{ ...row, user_id: 'another-owner' }, { ...row, trip_reminders: 'true' }, null])('rejects malformed or cross-owner responses', (value) => {
    expect(() => parseNotificationIntent(value, session.user.id)).toThrow();
  });
  it('stale owner is rejected before transport', async () => {
    const f = fixture(); f.switchUser(); await expect(f.repository.getOwn(session, f.signal)).rejects.toMatchObject({ code: 'sessionExpired' });
    expect(f.client.from).not.toHaveBeenCalled();
  });
  it('stale response cannot be consumed', async () => {
    const f = fixture(); f.query.maybeSingle.mockImplementation(async () => { f.switchUser(); return { data: row, error: null }; });
    await expect(f.repository.getOwn(session, f.signal)).rejects.toMatchObject({ code: 'sessionExpired' });
  });
  it('does not expose raw server errors', async () => {
    const f = fixture(); f.query.maybeSingle.mockRejectedValue(new Error('private-secret'));
    await expect(f.repository.getOwn(session, f.signal)).rejects.not.toThrow('private-secret');
  });
});
