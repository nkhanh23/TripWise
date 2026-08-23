import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError } from '../src/integration/errors';
import { mapGeneratedTripToGraph } from '../src/integration/mappers';
import { SupabasePlaceResolutionRepository } from '../src/integration/remote/supabasePlaceResolutionRepository';
import { SupabaseSavedTripsRepository, SupabaseTripPersistenceRepository } from '../src/integration/remote/supabaseTripRepositories';
import type { GeneratedTrip } from '../src/integration/contracts';
import { mapSavedTripDetailToResolutionModel } from '../src/integration/savedTripMappers';

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`Smoke assertion failed: ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceRoleKey) throw new Error('Live place smoke configuration is missing.');

const admin = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const accounts = [
  { email: `tripwise-int-p5-a-${suffix}@gmail.com`, password: `Tw!${suffix}A1` },
  { email: `tripwise-int-p5-b-${suffix}@gmail.com`, password: `Tw!${suffix}B1` },
];
const userIds: string[] = [];
const generated: GeneratedTrip = {
  title: 'Wat Arun Resolution Smoke', destination: 'Bangkok', startDate: '2026-11-01', endDate: '2026-11-01',
  days: [{ dayNumber: 1, date: '2026-11-01', items: [{ position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok Thailand' }] }],
};

async function createAndSignIn(index: number) {
  const account = accounts[index];
  const created = await admin.auth.admin.createUser({ email: account.email, password: account.password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error('Disposable user creation failed.');
  userIds.push(created.data.user.id);
  const client = createClient<Database>(url!, publishableKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await client.auth.signInWithPassword(account);
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error('Disposable sign-in failed.');
  return { client, persistence: new SupabaseTripPersistenceRepository(client), saved: new SupabaseSavedTripsRepository(client), resolver: new SupabasePlaceResolutionRepository(client) };
}

async function run(): Promise<void> {
  const userA = await createAndSignIn(0);
  const userB = await createAndSignIn(1);
  try {
    const tripId = await userA.persistence.persist({
      idempotencyKey: `p5-smoke-${suffix}-key`,
      graph: mapGeneratedTripToGraph(generated),
    });
    const before = await userA.saved.getDetail(tripId);
    const itemId = before?.days[0]?.items[0]?.id;
    assert(Boolean(itemId), 'persisted unresolved itinerary item exists');
    assert(before?.days[0]?.items[0]?.resolution === 'UNRESOLVED'
      && before.days[0].items[0].latitude === null
      && before.days[0].items[0].longitude === null,
    'detail BEFORE shows unresolved item without trusted metadata');

    const resolved = await userA.resolver.resolve({ itineraryItemId: itemId! });
    assert(resolved.resolution === 'VERIFIED' || resolved.resolution === 'VERIFIED_REFRESHED', 'resolve-place returned verified status');

    const after = await userA.saved.getDetail(tripId);
    const item = after?.days[0]?.items[0];
    assert(item?.resolution === 'VERIFIED' && Boolean(item.placeResolvedAt) && Boolean(item.googlePlaceId), 'refetched detail contains persisted verified provenance and identity');
    assert(typeof item?.latitude === 'number' && typeof item.longitude === 'number'
      && item.latitude >= -90 && item.latitude <= 90 && item.longitude >= -180 && item.longitude <= 180,
    'refetched detail contains a valid coordinate pair');
    assert(mapSavedTripDetailToResolutionModel(after!).days[0].items[0].resolution === 'VERIFIED', 'production domain mapper sees VERIFIED item');

    assert(await userB.saved.getDetail(tripId) === null, 'User B cannot read User A resolved detail');
    try {
      await userB.resolver.resolve({ itineraryItemId: itemId! });
      throw new Error('Cross-user resolve unexpectedly succeeded.');
    } catch (error) {
      assert(error instanceof IntegrationError, 'User B resolve is rejected with semantic error');
    }
    assert(await userB.saved.getDetail(tripId) === null, 'User B still cannot read trusted snapshot');
  } finally {
    for (const userId of userIds) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
    process.stdout.write('PASS disposable users cleaned up\n');
  }
}

void run().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';
  process.stderr.write(`FAIL place resolution smoke: ${name} code=${code}\n`);
  process.exitCode = 1;
});
