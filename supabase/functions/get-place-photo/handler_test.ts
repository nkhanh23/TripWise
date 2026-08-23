import { assertEquals } from 'jsr:@std/assert@1';
import { handleGetPlacePhoto } from './handler.ts';

Deno.test('handleGetPlacePhoto rejects non-POST requests', async () => {
  const response = await handleGetPlacePhoto(new Request('http://localhost', { method: 'GET' }), {
    authenticate: async () => 'user-1',
    verifyOwnership: async () => true,
    fetchPhoto: async () => ({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', photoUri: 'https://example.com/photo.jpg' }),
  });
  assertEquals(response.status, 405);
  const body = await response.json();
  assertEquals(body.error.code, 'PHOTO_INPUT_INVALID');
});

Deno.test('handleGetPlacePhoto rejects unauthenticated requests', async () => {
  const response = await handleGetPlacePhoto(
    new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' }),
    }),
    {
      authenticate: async () => null,
      verifyOwnership: async () => true,
      fetchPhoto: async () => ({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', photoUri: 'https://example.com/photo.jpg' }),
    }
  );
  assertEquals(response.status, 401);
  const body = await response.json();
  assertEquals(body.error.code, 'UNAUTHORIZED');
});

Deno.test('handleGetPlacePhoto rejects invalid place ID format', async () => {
  const response = await handleGetPlacePhoto(
    new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ googlePlaceId: 'invalid' }),
    }),
    {
      authenticate: async () => 'user-1',
      verifyOwnership: async () => true,
      fetchPhoto: async () => ({ googlePlaceId: 'invalid', photoUri: null }),
    }
  );
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error.code, 'PHOTO_INPUT_INVALID');
});

Deno.test('handleGetPlacePhoto rejects cross-user / unowned place IDs', async () => {
  const response = await handleGetPlacePhoto(
    new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY' }),
    }),
    {
      authenticate: async () => 'user-1',
      verifyOwnership: async () => false,
      fetchPhoto: async () => ({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', photoUri: 'https://example.com/photo.jpg' }),
    }
  );
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, 'FORBIDDEN');
});

Deno.test('handleGetPlacePhoto succeeds for authenticated owner', async () => {
  const response = await handleGetPlacePhoto(
    new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ googlePlaceId: 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY', maxWidth: 800 }),
    }),
    {
      authenticate: async () => 'user-1',
      verifyOwnership: async (uid, pid) => uid === 'user-1' && pid === 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY',
      fetchPhoto: async (pid, mw) => {
        assertEquals(pid, 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
        assertEquals(mw, 800);
        return {
          googlePlaceId: pid,
          photoUri: 'https://lh3.googleusercontent.com/places/test.jpg',
          authorAttribution: { displayName: 'Photographer' },
        };
      },
    }
  );
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.data.googlePlaceId, 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
  assertEquals(body.data.photoUri, 'https://lh3.googleusercontent.com/places/test.jpg');
});
