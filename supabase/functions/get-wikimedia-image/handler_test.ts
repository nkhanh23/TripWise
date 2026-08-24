import assert from 'node:assert/strict';
import { handleGetWikimediaImage } from './handler.ts';
import type { WikimediaImageDependencies } from './handler.ts';

const context = {
  placeName: 'Wat Arun',
  destination: 'Bangkok, Thailand',
  latitude: 13.7437,
  longitude: 100.4889,
};
const dependencies: WikimediaImageDependencies = {
  authenticate: async () => 'user-1',
  loadOwnedPlace: async () => context,
  fetchPlaceImage: async () => ({ uri: null, source: 'WIKIMEDIA_PLACE' }),
  fetchDestinationCover: async () => ({ uri: null, source: 'DESTINATION_COVER' }),
};

Deno.test('Wikimedia handler rejects unauthenticated requests', async () => {
  const response = await handleGetWikimediaImage(new Request('http://local', {
    method: 'POST',
    body: JSON.stringify({ kind: 'DESTINATION', destination: 'Bangkok, Thailand' }),
  }), { ...dependencies, authenticate: async () => null });
  assert.equal(response.status, 401);
});

Deno.test('Wikimedia handler rejects unowned place identity', async () => {
  const response = await handleGetWikimediaImage(new Request('http://local', {
    method: 'POST',
    body: JSON.stringify({ kind: 'PLACE', googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' }),
  }), { ...dependencies, loadOwnedPlace: async () => null });
  assert.equal(response.status, 403);
});

Deno.test('Wikimedia handler returns only typed place image metadata', async () => {
  const response = await handleGetWikimediaImage(new Request('http://local', {
    method: 'POST',
    body: JSON.stringify({ kind: 'PLACE', googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' }),
  }), {
    ...dependencies,
    fetchPlaceImage: async () => ({
      uri: 'https://upload.wikimedia.org/example.jpg',
      source: 'WIKIMEDIA_PLACE',
      matchedEntity: 'File:Wat Arun.jpg',
      confidence: 0.99,
      attribution: {
        displayName: 'Jane Photographer',
        sourceUrl: 'https://commons.wikimedia.org/wiki/File:Wat_Arun.jpg',
        license: 'CC BY-SA 4.0',
      },
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body.data).sort(), ['attribution', 'confidence', 'matchedEntity', 'source', 'uri']);
});
