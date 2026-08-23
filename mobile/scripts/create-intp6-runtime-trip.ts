import { createClient } from '@supabase/supabase-js';

import { loadLocalEnv } from './load-local-env';
import { mapSavedTripDetailToResolutionModel } from '../src/integration/savedTripMappers';
import { buildDrivingRouteRequest } from '../src/integration/routePlanning';
import { OsrmRouteRepository } from '../src/integration/remote/publicProviderRepositories';
import { SupabasePlaceResolutionRepository } from '../src/integration/remote/supabasePlaceResolutionRepository';
import {
  SupabaseSavedTripsRepository,
  SupabaseTripPersistenceRepository,
} from '../src/integration/remote/supabaseTripRepositories';
import { asItineraryItemId, asTripId } from '../src/integration/validation';
import type { Database } from '../src/lib/supabase/database.types';

loadLocalEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.INTP6_DISPOSABLE_EMAIL;
const password = process.env.INTP6_DISPOSABLE_PASSWORD;

for (const [name, value] of [
  ['SUPABASE_URL', url],
  ['SUPABASE_PUBLISHABLE_KEY', publishableKey],
  ['SERVICE_ROLE_KEY', serviceRoleKey],
  ['DISPOSABLE_EMAIL', email],
  ['DISPOSABLE_PASSWORD', password],
] as const) process.stdout.write(`${name}=${value ? 'PRESENT' : 'MISSING'}\n`);

if (!url || !publishableKey || !serviceRoleKey || !email || !password) {
  throw new Error(
    'Missing configuration. Required names: EXPO_PUBLIC_SUPABASE_URL, '
      + 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY, '
      + 'INTP6_DISPOSABLE_EMAIL, INTP6_DISPOSABLE_PASSWORD.',
  );
}

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = createClient<Database>(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function pass(label: string): void {
  process.stdout.write(`PASS ${label}\n`);
}

async function main(): Promise<void> {
  let userId: string | undefined;
  let tripId: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Disposable user creation failed.');
    userId = created.data.user.id;
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw new Error('Disposable authentication failed.');
    pass('authenticated disposable user');

    const persistence = new SupabaseTripPersistenceRepository(client);
    tripId = await persistence.persist({
      idempotencyKey: `intp6-runtime-${suffix}`,
      graph: {
        title: 'INT-P6 runtime route',
        destination: 'Bangkok',
        startDate: '2026-08-20',
        endDate: '2026-08-20',
        days: [{
          dayNumber: 1,
          date: '2026-08-20',
          items: [
            { position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok' },
            { position: 2, placeName: 'Grand Palace', placeQuery: 'Grand Palace Bangkok' },
          ],
        }],
      },
    });
    pass('production trip persisted through create_trip_graph');

    const saved = new SupabaseSavedTripsRepository(client);
    const before = await saved.getDetail(asTripId(tripId));
    if (!before) throw new Error('Persisted trip detail was empty.');
    const unresolved = before.days.flatMap((day) => day.items)
      .filter((item) => item.resolution === 'UNRESOLVED');
    if (unresolved.length < 2) throw new Error('Trip did not contain two unresolved items.');

    const resolver = new SupabasePlaceResolutionRepository(client);
    for (const item of unresolved.slice(0, 2)) {
      await resolver.resolve({ itineraryItemId: asItineraryItemId(item.id) });
    }
    pass('two items resolved through resolve-place');

    const detail = await saved.getDetail(asTripId(tripId));
    if (!detail) throw new Error('Resolved trip detail was empty.');
    const model = mapSavedTripDetailToResolutionModel(detail);
    const verified = model.days.flatMap((day) => day.items)
      .filter((item) => item.resolution === 'VERIFIED');
    if (verified.length < 2) throw new Error('Resolved detail did not contain two VERIFIED items.');
    if (verified.some((item) => !item.placeResolvedAt
      || item.latitude === null || item.longitude === null)) {
      throw new Error('Resolved detail contained incomplete trusted provenance.');
    }
    pass('saved detail contains two VERIFIED stops with provenance and coordinates');

    const route = await new OsrmRouteRepository().getRoute(buildDrivingRouteRequest(detail, 1));
    if (route.distanceMeters <= 0 || route.durationSeconds <= 0 || route.geometry.length < 2) {
      throw new Error('OSRM returned an invalid route.');
    }
    pass('saved detail VERIFIED stops -> OSRM route');

    // UUID and non-sensitive evidence are intentionally printed so the user can open the trip.
    process.stdout.write(`TRIP_UUID=${tripId}\n`);
    process.stdout.write(`VERIFIED_STOPS=${verified.length}\n`);
    process.stdout.write(`PLACE_NAMES=${verified.map((item) => item.placeName).join('; ')}\n`);
    process.stdout.write(`OSRM=PASS distanceMeters=${Math.round(route.distanceMeters)} durationSeconds=${Math.round(route.durationSeconds)} geometryPoints=${route.geometry.length}\n`);
    process.stdout.write('DISPOSABLE_DATA=RETAINED_FOR_RUNTIME\n');
    process.stdout.write('Cleanup after emulator verification: delete this trip and auth user through the approved cleanup workflow.\n');
  } catch (error) {
    if (tripId) await admin.from('trips').delete().eq('id', tripId);
    if (userId) await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'INT-P6 runtime setup failed.'}\n`);
  process.exitCode = 1;
});
