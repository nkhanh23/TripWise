import assert from 'node:assert/strict';
import { PlacePhotoError } from './errors.ts';
import { fetchPlacePhotoFromGoogle } from './photos.ts';

const assertEquals = (actual: unknown, expected: unknown): void => assert.deepEqual(actual, expected);
const assertRejects = (
  operation: () => Promise<unknown>,
  errorClass: typeof PlacePhotoError,
  message: string,
): Promise<unknown> => assert.rejects(
  operation,
  (error: unknown) => error instanceof errorClass && error.message === message,
);

Deno.test('fetchPlacePhotoFromGoogle returns photoUri when Google Places returns photos', async () => {
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes('places/ChIJaSv_6gaZ4jARnbiUVn6Z_YY/photos/AUc7tXTest/media')) {
      return new Response(
        JSON.stringify({
          name: 'places/ChIJaSv_6gaZ4jARnbiUVn6Z_YY/photos/AUc7tXTest/media',
          photoUri: 'https://lh3.googleusercontent.com/places/AUc7tXRealPhoto.jpg',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    if (url.includes('/places/ChIJaSv_6gaZ4jARnbiUVn6Z_YY')) {
      return new Response(
        JSON.stringify({
          photos: [
            {
              name: 'places/ChIJaSv_6gaZ4jARnbiUVn6Z_YY/photos/AUc7tXTest',
              widthPx: 4000,
              heightPx: 3000,
              authorAttributions: [{ displayName: 'Alice' }],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    return new Response('Not Found', { status: 404 });
  };

  const result = await fetchPlacePhotoFromGoogle('ChIJaSv_6gaZ4jARnbiUVn6Z_YY', 1200, fetcher, {
    apiKey: 'mock-key',
    timeoutMilliseconds: 2000,
  });

  assertEquals(result.googlePlaceId, 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
  assertEquals(result.photoUri, 'https://lh3.googleusercontent.com/places/AUc7tXRealPhoto.jpg');
  assertEquals(result.authorAttribution?.displayName, 'Alice');
  assertEquals(result.diagnostic, {
    providerStatus: 200,
    hasPhotosProperty: true,
    photosIsArray: true,
    photosCount: 1,
    firstPhotoHasName: true,
  });
});

Deno.test('fetchPlacePhotoFromGoogle returns null photoUri when place has no photos', async () => {
  const fetcher: typeof fetch = async () => {
    return new Response(JSON.stringify({ photos: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const result = await fetchPlacePhotoFromGoogle('ChIJaSv_6gaZ4jARnbiUVn6Z_YY', 1200, fetcher, {
    apiKey: 'mock-key',
    timeoutMilliseconds: 2000,
  });

  assertEquals(result.googlePlaceId, 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
  assertEquals(result.photoUri, null);
  assertEquals(result.diagnostic, {
    providerStatus: 200,
    hasPhotosProperty: true,
    photosIsArray: true,
    photosCount: 0,
    firstPhotoHasName: false,
  });
});

Deno.test('fetchPlacePhotoFromGoogle handles 429 rate limit correctly', async () => {
  const fetcher: typeof fetch = async () => {
    return new Response('Rate limited', { status: 429 });
  };

  await assertRejects(
    async () => {
      await fetchPlacePhotoFromGoogle('ChIJaSv_6gaZ4jARnbiUVn6Z_YY', 1200, fetcher, {
        apiKey: 'mock-key',
        timeoutMilliseconds: 2000,
      });
    },
    PlacePhotoError,
    'Place provider rate limit was reached.'
  );
});

Deno.test('fetchPlacePhotoFromGoogle handles missing API key', async () => {
  await assertRejects(
    async () => {
      await fetchPlacePhotoFromGoogle('ChIJaSv_6gaZ4jARnbiUVn6Z_YY', 1200, fetch, {
        apiKey: undefined,
        timeoutMilliseconds: 2000,
      });
    },
    PlacePhotoError,
    'Place provider is not configured.'
  );
});
