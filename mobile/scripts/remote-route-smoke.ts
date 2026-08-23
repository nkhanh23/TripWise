import { createClient } from '@supabase/supabase-js';

import { loadLocalEnv } from './load-local-env';
import { mapSavedTripDetailToResolutionModel } from '../src/integration/savedTripMappers';
import { buildDrivingRouteRequest } from '../src/integration/routePlanning';
import { OsrmRouteRepository } from '../src/integration/remote/publicProviderRepositories';
import { SupabasePlaceResolutionRepository } from '../src/integration/remote/supabasePlaceResolutionRepository';
import { SupabaseSavedTripsRepository, SupabaseTripPersistenceRepository } from '../src/integration/remote/supabaseTripRepositories';
import { asItineraryItemId, asTripId } from '../src/integration/validation';
import type { Database } from '../src/lib/supabase/database.types';

loadLocalEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const allowProviderSetup = process.env.INTP6_ALLOW_PLACE_RESOLUTION === '1';

async function runRouteOnlySmoke() {
  const route = await new OsrmRouteRepository().getRoute({ profile: 'driving', coordinates: [
    { latitude: 13.7437, longitude: 100.4889 },
    { latitude: 13.7500, longitude: 100.4913 },
  ] });
  if (route.distanceMeters <= 0 || route.durationSeconds <= 0 || route.geometry.length < 2) {
    throw new Error('OSRM route-only smoke returned an invalid result.');
  }
  console.log('PASS direct OSRM route smoke');
}

if (process.env.INTP6_ROUTE_ONLY === '1') {
  void runRouteOnlySmoke().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'OSRM smoke failed.');
    process.exitCode = 1;
  });
} else {

  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error('Live route smoke configuration is missing.');
  }
  if (!allowProviderSetup) {
    throw new Error('Set INTP6_ALLOW_PLACE_RESOLUTION=1 only when a disposable place-resolution setup is explicitly approved.');
  }

const admin = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `tripwise-route-${suffix}@example.com`;
const password = `Route-${suffix}-Safe!`;

async function main() {
  let userId: string | undefined;
  let tripId: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('Disposable route user creation failed.');
    userId = created.data.user.id;
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw new Error('Disposable route authentication failed.');

    const persistence = new SupabaseTripPersistenceRepository(client);
    tripId = await persistence.persist({
      idempotencyKey: `route-smoke-${suffix}`,
      graph: {
        title: 'Route smoke', destination: 'Bangkok', startDate: '2026-08-20', endDate: '2026-08-20',
        days: [{ dayNumber: 1, date: '2026-08-20', items: [
          { position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok' },
          { position: 2, placeName: 'The Grand Palace', placeQuery: 'The Grand Palace Bangkok' },
        ] }],
      },
    });

    const saved = new SupabaseSavedTripsRepository(client);
    const before = await saved.getDetail(asTripId(tripId));
    if (!before) throw new Error('Route smoke detail-before was empty.');
    const unresolved = before.days.flatMap((day) => day.items)
      .filter((item) => item.resolution === 'UNRESOLVED');
    const resolver = new SupabasePlaceResolutionRepository(client);
    for (const item of unresolved.slice(0, 2)) await resolver.resolve({ itineraryItemId: asItineraryItemId(item.id) });

    const detail = await saved.getDetail(asTripId(tripId));
    if (!detail) throw new Error('Route smoke detail-after was empty.');
    const model = mapSavedTripDetailToResolutionModel(detail);
    const verifiedCount = model.days.flatMap((day) => day.items).filter((item) => item.resolution === 'VERIFIED').length;
    if (verifiedCount < 2) throw new Error('Route smoke did not produce two verified stops.');
    const route = await new OsrmRouteRepository().getRoute(buildDrivingRouteRequest(detail, 1));
    if (route.distanceMeters <= 0 || route.durationSeconds <= 0 || route.geometry.length < 2) {
      throw new Error('OSRM returned an invalid route result.');
    }
    console.log('PASS saved detail VERIFIED stops -> OSRM route');
  } finally {
    if (tripId) await admin.from('trips').delete().eq('id', tripId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
}

  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Route smoke failed.');
    process.exitCode = 1;
  });
}
