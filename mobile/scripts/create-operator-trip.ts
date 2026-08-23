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
const operatorEmail = 'sarah.j@example.com';
const operatorPassword = 'password123';

if (!url || !publishableKey) {
  process.stderr.write('Missing Supabase public configuration.\n');
  process.exit(1);
}

const operatorClient = createClient<Database>(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

async function main(): Promise<void> {
  // 1. Authenticate through normal production path as sarah.j@example.com
  const signInResult = await operatorClient.auth.signInWithPassword({
    email: operatorEmail,
    password: operatorPassword,
  });
  if (signInResult.error || !signInResult.data.session) {
    throw new Error(`Operator client authentication failed: ${signInResult.error?.message}`);
  }

  // 2. Create new disposable trip via existing create_trip_graph production contract
  const persistence = new SupabaseTripPersistenceRepository(operatorClient);
  const tripId = await persistence.persist({
    idempotencyKey: `intp6-operator-${suffix}`,
    graph: {
      title: 'Bangkok Explorer (Operator Trip)',
      destination: 'Bangkok',
      startDate: '2026-08-25',
      endDate: '2026-08-25',
      days: [
        {
          dayNumber: 1,
          date: '2026-08-25',
          items: [
            {
              position: 1,
              placeName: 'Wat Arun',
              placeQuery: 'Wat Arun Bangkok',
            },
            {
              position: 2,
              placeName: 'Grand Palace',
              placeQuery: 'Grand Palace Bangkok',
            },
          ],
        },
      ],
    },
  });

  // 3. Fetch detail to get item IDs before resolution
  const savedRepo = new SupabaseSavedTripsRepository(operatorClient);
  const detailBefore = await savedRepo.getDetail(asTripId(tripId));
  if (!detailBefore) throw new Error('Persisted trip detail was empty.');

  const unresolvedItems = detailBefore.days.flatMap((d) => d.items).filter((i) => i.resolution === 'UNRESOLVED');
  if (unresolvedItems.length < 2) throw new Error('Expected 2 unresolved items.');

  // 4. Resolve both items via protected resolve-place contract
  const resolutionRepo = new SupabasePlaceResolutionRepository(operatorClient);
  for (const item of unresolvedItems.slice(0, 2)) {
    await resolutionRepo.resolve({ itineraryItemId: asItineraryItemId(item.id) });
  }

  // 5. Refetch and verify VERIFIED status with coordinates
  const detailAfter = await savedRepo.getDetail(asTripId(tripId));
  if (!detailAfter) throw new Error('Resolved trip detail was empty.');

  const model = mapSavedTripDetailToResolutionModel(detailAfter);
  const verified = model.days.flatMap((d) => d.items).filter((i) => i.resolution === 'VERIFIED');
  if (verified.length < 2) throw new Error('Resolved detail did not contain 2 VERIFIED items.');
  if (verified.some((i) => !i.placeResolvedAt || i.latitude === null || i.longitude === null)) {
    throw new Error('Resolved detail contained incomplete coordinates or provenance.');
  }

  // 6. Route-only OSRM smoke
  const route = await new OsrmRouteRepository().getRoute(buildDrivingRouteRequest(detailAfter, 1));
  const osrmPass = route.distanceMeters > 0 && route.durationSeconds > 0 && route.geometry.length >= 2;

  // 7. Confirm visibility through list_saved_trips for sarah.j@example.com
  const list = await savedRepo.list({ limit: 50 });
  const operatorVisible = list.items.some((t) => t.id === tripId);

  // 8. Confirm old trip d26a5d6c-d54b-45b5-bcbd-5402bfc5a387 is NOT visible to sarah.j@example.com
  const oldTripRead = await savedRepo.getDetail(asTripId('d26a5d6c-d54b-45b5-bcbd-5402bfc5a387'));
  const rlsIsolationPass = operatorVisible && (oldTripRead === null);

  const placeNames = verified.map((i) => i.placeName).join('; ');

  process.stdout.write(`NEW_TRIP_UUID=${tripId}\n`);
  process.stdout.write(`TRIP_TITLE=${detailAfter.title}\n`);
  process.stdout.write(`OWNER_EMAIL=${operatorEmail}\n`);
  process.stdout.write(`VERIFIED_STOPS=${verified.length}\n`);
  process.stdout.write(`CANONICAL_PLACES=${placeNames}\n`);
  process.stdout.write(`OSRM=${osrmPass ? 'PASS' : 'FAIL'}\n`);
  process.stdout.write(`RLS_OWNER_VISIBILITY=${rlsIsolationPass ? 'PASS' : 'FAIL'}\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Operator trip creation failed.'}\n`);
  process.exit(1);
});
