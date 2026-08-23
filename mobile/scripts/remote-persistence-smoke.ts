import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError } from '../src/integration/errors';
import { mapGeneratedTripToGraph } from '../src/integration/mappers';
import { IdempotencyKeyFactory } from '../src/integration/idempotency';
import {
  SupabaseSavedTripsRepository,
  SupabaseTripPersistenceRepository,
} from '../src/integration/remote/supabaseTripRepositories';
import type { GeneratedTrip } from '../src/integration/contracts';

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`Smoke assertion failed: ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceRoleKey) throw new Error('Live persistence smoke configuration is missing.');

const admin = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const publicClient = () => createClient<Database>(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const accounts = [
  { email: `tripwise-int-p4-a-${suffix}@gmail.com`, password: `Tw!${suffix}A1` },
  { email: `tripwise-int-p4-b-${suffix}@gmail.com`, password: `Tw!${suffix}B1` },
];
const userIds: string[] = [];

const generated: GeneratedTrip = {
  title: 'Bangkok Persistence Smoke', destination: 'Bangkok', startDate: '2026-10-01', endDate: '2026-10-02',
  days: [
    { dayNumber: 1, date: '2026-10-01', items: [{ position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok', note: 'Morning visit' }] },
    { dayNumber: 2, date: '2026-10-02', items: [{ position: 1, placeName: 'Grand Palace', placeQuery: 'Grand Palace Bangkok' }] },
  ],
};
const graph = mapGeneratedTripToGraph(generated, { userEnteredTitle: 'Bangkok Persistence Smoke' });
const key = new IdempotencyKeyFactory(() => `p4-smoke-${suffix}-key`).createSaveIntent().key();

async function createAndSignIn(index: number) {
  const account = accounts[index];
  const { data, error } = await admin.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true });
  if (error || !data.user) throw error ?? new Error('Disposable user creation failed.');
  userIds.push(data.user.id);
  const client = publicClient();
  const signIn = await client.auth.signInWithPassword(account);
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error('Disposable sign-in failed.');
  return { client, repository: new SupabaseTripPersistenceRepository(client), saved: new SupabaseSavedTripsRepository(client) };
}

async function run(): Promise<void> {
  const userA = await createAndSignIn(0);
  const userB = await createAndSignIn(1);
  assert(true, 'disposable User A and User B authenticated');
  try {
    const before = (await userA.client.from('trips').select('id', { count: 'exact', head: true })).count;
    const tripId = await userA.repository.persist({ idempotencyKey: key, graph });
    assert(Boolean(tripId), 'create_trip_graph returned persisted UUID');
    const after = (await userA.client.from('trips').select('id', { count: 'exact', head: true })).count;
    assert(after === (before ?? 0) + 1, 'owner trip count increased by exactly one');

    const page = await userA.saved.list({ limit: 50 });
    assert(page.items.some((item) => item.id === tripId), 'list_saved_trips contains saved trip');
    const detail = await userA.saved.getDetail(tripId);
    assert(detail?.id === tripId && detail.days.length === 2, 'get_saved_trip_detail matches persisted graph');
    assert(detail?.days.every((day, dayIndex) => day.dayNumber === dayIndex + 1
      && day.items.every((item, itemIndex) => item.position === itemIndex + 1 && item.resolution === 'UNRESOLVED')),
    'reopened graph preserves ordered unresolved items');

    const retryId = await userA.repository.persist({ idempotencyKey: key, graph });
    assert(retryId === tripId, 'same key and same payload return same UUID');
    const conflictGraph = { ...graph, title: 'Changed payload' };
    await expectConflict(userA.repository.persist({ idempotencyKey: key, graph: conflictGraph }));

    const bPage = await userB.saved.list({ limit: 50 });
    assert(!bPage.items.some((item) => item.id === tripId), 'User B list excludes User A trip');
    assert(await userB.saved.getDetail(tripId) === null, 'User B detail cannot read User A trip');
    const itemId = detail?.days[0]?.items[0]?.id;
    if (itemId) assert(await userB.saved.updateItemNote(itemId, 'cross-user') === false, 'User B cannot update User A item');
    assert(await userB.saved.deleteTrip(tripId) === false, 'User B cannot delete User A trip');

    if (itemId) {
      assert(await userA.saved.updateItemNote(itemId, 'updated note') === true, 'owner note update succeeds');
    }
    assert(await userA.saved.deleteTrip(tripId) === true, 'owner delete succeeds');
    assert(await userA.saved.getDetail(tripId) === null, 'deleted trip cannot be reopened');
    const final = (await userA.client.from('trips').select('id', { count: 'exact', head: true })).count;
    assert(final === before, 'trip count returns to original after cleanup delete');
  } finally {
    for (const userId of userIds) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
    process.stdout.write('PASS disposable users cleaned up\n');
  }
}

async function expectConflict(operation: Promise<unknown>): Promise<void> {
  try { await operation; } catch (error) {
    assert(error instanceof IntegrationError && error.code === 'conflict', 'same key different payload returns TW004 conflict');
    return;
  }
  throw new Error('Expected idempotency conflict.');
}

void run().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';
  process.stderr.write(`FAIL persistence smoke: ${name} code=${code}\n`);
  process.exitCode = 1;
});
