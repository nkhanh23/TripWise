import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1.0.15';
import { readBoundedJson } from './boundedJson.ts';
import { handleExplorePlaces } from './handler.ts';
import { discoverGooglePlaces, parseGooglePlacesResponse } from './googlePlaces.ts';
import { ExplorePlacesError } from './errors.ts';

const query = { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' as const, limit: 1 };
const place = { id: 'ChIJfixture12345', displayName: { text: 'Test' }, location: query.center, types: ['cafe'] };

Deno.test('actual bytes bound rejects oversized chunked body and multibyte payload', async () => {
  for (const text of [' '.repeat(2049), JSON.stringify({ name: 'ế'.repeat(800) })]) {
    await assertRejects(() => readBoundedJson(new Response(text), 2048));
  }
  assertEquals(await readBoundedJson(new Response('{}'), 2), {});
});

Deno.test('handler rejects oversized missing/lying length and URL before provider', async () => {
  for (const body of [' '.repeat(2049) + JSON.stringify(query), JSON.stringify({ ...query, providerUrl: 'http://localhost' })]) {
    let calls = 0;
    const response = await handleExplorePlaces(new Request('https://local', {
      method: 'POST', body, headers: { 'content-length': '1' },
    }), { authenticate: () => Promise.resolve('user'), discover: () => { calls++; return Promise.resolve([]); } });
    assertEquals(response.status, 400);
    assertEquals(calls, 0);
  }
});

for (const patch of [
  { id: 'bad' }, { id: 'x'.repeat(201) }, { displayName: { text: 'x'.repeat(201) } },
  { formattedAddress: 'x'.repeat(501) }, { types: Array(51).fill('cafe') },
  { types: ['x'.repeat(101)] }, { primaryType: 'x'.repeat(101) },
  { rating: -1 }, { userRatingCount: Number.MAX_SAFE_INTEGER + 1 },
]) {
  Deno.test(`bounded provider fields ${Object.keys(patch)[0]} ${JSON.stringify(patch).length}`, () => {
    assertThrows(() => parseGooglePlacesResponse({ places: [{ ...place, ...patch }] }, 'all'), ExplorePlacesError);
  });
}

Deno.test('raw provider extras are scrubbed; absent ratings are not invented', () => {
  const result = parseGooglePlacesResponse({ places: [{ ...place, rawSecret: 'do-not-return', businessStatus: 'OPERATIONAL' }] }, 'all');
  assertEquals('rawSecret' in result[0], false);
  assertEquals('businessStatus' in result[0], false);
  assertEquals('rating' in result[0], false);
});

Deno.test('provider bounds actual body, result count, requested limit and duplicates', async () => {
  for (const body of [
    ' '.repeat(32769) + '{}', '{invalid', JSON.stringify({ places: Array(13).fill(place) }),
    JSON.stringify({ places: [place, { ...place, id: 'ChIJfixture67890' }] }),
    JSON.stringify({ places: [place, place] }),
  ]) {
    let calls = 0;
    await assertRejects(() => discoverGooglePlaces(query, (_url, init) => {
      calls++;
      assertEquals(init?.redirect, 'error');
      return Promise.resolve(new Response(body));
    }, { apiKey: 'test-only-secret' }), ExplorePlacesError);
    assertEquals(calls, 1);
  }
});

Deno.test('handler protects result count and sanitizes unknown provider error', async () => {
  const response = await handleExplorePlaces(new Request('https://local', { method: 'POST', body: JSON.stringify(query) }), {
    authenticate: () => Promise.resolve('user'),
    discover: () => Promise.reject(new Error('secret-private-provider-data')),
  });
  assertEquals(response.status, 500);
  assertEquals((await response.text()).includes('secret-private-provider-data'), false);
  const overflow = await handleExplorePlaces(new Request('https://local', { method: 'POST', body: JSON.stringify(query) }), {
    authenticate: () => Promise.resolve('user'), discover: () => Promise.resolve(Array(2).fill({})),
  });
  assertEquals(overflow.status, 502);
});

Deno.test('pre-cancelled discovery never contacts provider', async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  await assertRejects(() => discoverGooglePlaces(query, () => { calls++; return Promise.resolve(new Response('{}')); },
    { apiKey: 'test', signal: controller.signal }), ExplorePlacesError);
  assertEquals(calls, 0);
});
