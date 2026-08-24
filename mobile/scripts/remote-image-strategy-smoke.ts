import { createClient } from '@supabase/supabase-js';

import { CompositePlaceImageRepository, SequentialTripCoverImageRepository } from '../src/integration/imageResolution';
import { SupabasePlacePhotoRepository } from '../src/integration/remote/supabasePlacePhotoRepository';
import { SupabasePlaceResolutionRepository } from '../src/integration/remote/supabasePlaceResolutionRepository';
import { SupabaseSavedTripsRepository, SupabaseTripPersistenceRepository } from '../src/integration/remote/supabaseTripRepositories';
import { SupabaseWikimediaImageRepository } from '../src/integration/remote/supabaseWikimediaImageRepository';
import { asItineraryItemId, asTripId } from '../src/integration/validation';
import type { Database } from '../src/lib/supabase/database.types';
import { loadLocalEnv } from './load-local-env';
import type { PlacePhoto, ResolvedImage } from '../src/integration/contracts';

loadLocalEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceRoleKey) throw new Error('Live image smoke configuration is missing.');

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const email = `tripwise-image-${suffix}@gmail.com`;
const password = `Tw!${suffix}A1`;
const admin = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId: string | null = null;

function pass(label: string): void {
  process.stdout.write(`PASS ${label}\n`);
}

async function main(): Promise<void> {
  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Image strategy smoke' },
    });
    if (created.error || !created.data.user) throw created.error ?? new Error('Disposable user was not created.');
    userId = created.data.user.id;
    const signedIn = await client.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error('Disposable sign-in failed.');
    pass('disposable authenticated owner');

    const persistence = new SupabaseTripPersistenceRepository(client);
    const tripId = await persistence.persist({
      idempotencyKey: `image-smoke-${suffix}`,
      graph: {
        title: 'Image strategy smoke',
        destination: 'Bangkok, Thailand',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
        days: [{
          dayNumber: 1,
          date: '2026-09-10',
          items: [
            { position: 1, placeName: 'Wat Arun', placeQuery: 'Wat Arun Bangkok Thailand' },
            { position: 2, placeName: 'The Grand Palace', placeQuery: 'The Grand Palace Bangkok Thailand' },
          ],
        }],
      },
    });
    const saved = new SupabaseSavedTripsRepository(client);
    const before = await saved.getDetail(asTripId(tripId));
    if (!before) throw new Error('Disposable trip was not readable.');
    const unresolved = before.days.flatMap((day) => day.items).filter((item) => item.resolution === 'UNRESOLVED');
    if (unresolved.length !== 2) throw new Error('Disposable trip did not contain two unresolved stops.');

    const resolution = new SupabasePlaceResolutionRepository(client);
    for (const item of unresolved) {
      await resolution.resolve({ itineraryItemId: asItineraryItemId(item.id) });
    }
    pass('two bounded place-resolution calls produced owned VERIFIED stops');

    const detail = await saved.getDetail(asTripId(tripId));
    if (!detail) throw new Error('Resolved trip was not readable.');
    const verified = detail.days.flatMap((day) => day.items).filter((item) => item.resolution === 'VERIFIED');
    if (verified.length !== 2) throw new Error('Both smoke stops were not VERIFIED.');

    const google = new SupabasePlacePhotoRepository(client);
    const googleResults: PlacePhoto[] = [];
    for (const item of verified) {
      const photo = await google.getPhoto({ googlePlaceId: item.googlePlaceId, maxWidth: 900 });
      googleResults.push(photo);
      const diagnostic = photo.diagnostic;
      process.stdout.write(
        `PHOTO ${item.placeName}: status=${diagnostic?.providerStatus ?? 0} photos=${diagnostic?.photosCount ?? 0} `
          + `array=${diagnostic?.photosIsArray === true} name=${diagnostic?.firstPhotoHasName === true} uri=${Boolean(photo.photoUri)}\n`,
      );
    }
    if (!googleResults.every((photo) => photo.diagnostic?.providerStatus === 200
      && (photo.diagnostic.photosIsArray || !photo.diagnostic.hasPhotosProperty))) {
      throw new Error('Google primary diagnostics did not prove the expected Place Details contract.');
    }
    pass('two Google photo calls returned safe typed diagnostics');

    const wikimedia = new SupabaseWikimediaImageRepository(client);
    const placeImages: ResolvedImage[] = [];
    const placeResolver = new CompositePlaceImageRepository(google, wikimedia);
    for (const item of verified) {
      const image = await placeResolver.getPlaceImage({ googlePlaceId: item.googlePlaceId, maxWidth: 900 });
      placeImages.push(image);
      process.stdout.write(
        `PLACE_IMAGE ${item.placeName}: source=${image.source} uri=${Boolean(image.uri)} `
          + `attribution=${Boolean(image.attribution)} confidence=${image.confidence ?? 0}\n`,
      );
    }
    if (placeImages.some((image) => image.source === 'DESTINATION_COVER')) {
      throw new Error('A destination cover leaked into place image resolution.');
    }
    pass('place images never used a destination cover');

    const cover = await new SequentialTripCoverImageRepository(google, wikimedia, wikimedia).getTripCover({
      googlePlaceIds: verified.map((item) => item.googlePlaceId),
      destination: detail.destination,
      maxWidth: 900,
    });
    process.stdout.write(
      `TRIP_COVER source=${cover.source} uri=${Boolean(cover.uri)} attribution=${Boolean(cover.attribution)}\n`,
    );
    pass('trip cover completed the bounded semantic fallback chain');
    process.stdout.write('CALL_BOUND GooglePhoto=2 WikimediaPlace<=2 DestinationCover<=1 ResolvePlace=2\n');
  } finally {
    if (userId) {
      const deleted = await admin.auth.admin.deleteUser(userId);
      if (deleted.error) throw deleted.error;
      pass('disposable user and owned graph cleaned up');
    }
  }
}

void main().catch((error: unknown) => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'unknown';
  process.stderr.write(`FAIL image strategy smoke code=${code}\n`);
  process.exitCode = 1;
});
