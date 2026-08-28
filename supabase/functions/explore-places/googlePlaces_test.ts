import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1.0.15';
import { ExplorePlacesError } from './errors.ts';
import { discoverGooglePlaces, GOOGLE_TYPES_BY_CATEGORY, parseGooglePlacesResponse } from './googlePlaces.ts';

const candidate = {
  id: 'ChIJfixture12345', displayName: { text: 'Wat Arun' },
  location: { latitude: 13.7437, longitude: 100.4888 },
  primaryType: 'tourist_attraction', types: ['tourist_attraction'],
  formattedAddress: 'Bangkok',
};

Deno.test('category map is the approved bounded Google type set', () => {
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.restaurants, ['restaurant']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.hotels, ['hotel']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.coffee, ['cafe']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.shopping, ['shopping_mall']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.all.includes('tourist_attraction'), true);
});

Deno.test('valid provider response is normalized and preserves identity and coordinates', () => {
  assertEquals(parseGooglePlacesResponse({ places: [candidate] }, 'all'), [{
    googlePlaceId: 'ChIJfixture12345', name: 'Wat Arun', latitude: 13.7437, longitude: 100.4888,
    category: 'attractions', categoryLabel: 'Attraction', formattedAddress: 'Bangkok',
  }]);
});

Deno.test('provider ratings remain optional and normalize when supplied', () => {
  assertEquals(parseGooglePlacesResponse({
    places: [{ ...candidate, rating: 4.8, userRatingCount: 120 }],
  }, 'all')[0], {
    googlePlaceId: 'ChIJfixture12345', name: 'Wat Arun', latitude: 13.7437, longitude: 100.4888,
    category: 'attractions', categoryLabel: 'Attraction', formattedAddress: 'Bangkok', rating: 4.8,
    userRatingCount: 120,
  });
});

Deno.test('malformed provider response fails safely', () => {
  try { parseGooglePlacesResponse({ places: [{ ...candidate, location: {} }] }, 'all'); } catch (error) {
    assertEquals((error as ExplorePlacesError).code, 'EXPLORE_PROVIDER_INVALID_RESPONSE');
    return;
  }
  throw new Error('Expected validation failure');
});

for (const [status, code] of [[403, 'EXPLORE_PROVIDER_AUTH'], [429, 'EXPLORE_PROVIDER_RATE_LIMITED'], [503, 'EXPLORE_PROVIDER_UNAVAILABLE']] as const) {
  Deno.test(`provider status ${status} maps safely`, async () => {
    await assertRejects(
      () => discoverGooglePlaces({ center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all', limit: 12 },
        () => Promise.resolve(new Response(JSON.stringify({ credential: 'raw-provider-body' }), { status })),
        { apiKey: 'test-secret-never-returned', timeoutMilliseconds: 8_000 }),
      ExplorePlacesError,
    );
    try {
      await discoverGooglePlaces({ center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' },
        () => Promise.resolve(new Response('{}', { status })), {
          apiKey: 'test-secret-never-returned', timeoutMilliseconds: 8_000,
        });
    } catch (error) {
      assertEquals((error as ExplorePlacesError).code, code);
      assertEquals((error as Error).message.includes('test-secret'), false);
      assertEquals((error as Error).message.includes('raw-provider-body'), false);
    }
  });
}

Deno.test('provider request is one bounded call with fixed fields and types', async () => {
  let calls = 0;
  await discoverGooglePlaces({ center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'restaurants', limit: 12 },
    (_url, init) => {
      calls += 1;
      const body = String(init?.body);
      const fieldMask = String((init?.headers as Record<string, string>)['X-Goog-FieldMask']);
      assertStringIncludes(body, 'restaurant');
      assertStringIncludes(body, '"maxResultCount":12');
      assertEquals(fieldMask.includes('places.rating'), false);
      assertEquals(fieldMask.includes('places.userRatingCount'), false);
      return Promise.resolve(new Response(JSON.stringify({
        places: [{ ...candidate, primaryType: 'restaurant', types: ['restaurant', 'cafe'] }],
      }), { status: 200 }));
    }, { apiKey: 'test-key', timeoutMilliseconds: 8_000 });
  assertEquals(calls, 1);
});

for (const [requestedCategory, primaryType, types] of [
  ['restaurants', 'cafe', ['cafe', 'restaurant']],
  ['attractions', 'restaurant', ['restaurant', 'tourist_attraction']],
  ['hotels', 'restaurant', ['restaurant', 'cafe', 'hotel']],
] as const) {
  Deno.test(`specific ${requestedCategory} request owns mixed-type normalization`, () => {
    const [result] = parseGooglePlacesResponse({ places: [{ ...candidate, primaryType, types }] }, requestedCategory);
    assertEquals(result.category, requestedCategory);
  });
}

Deno.test('all uses primaryType before deterministic supported-type fallback', () => {
  const hotel = parseGooglePlacesResponse({
    places: [{ ...candidate, primaryType: 'hotel', types: ['restaurant', 'cafe', 'hotel'] }],
  }, 'all')[0];
  const attraction = parseGooglePlacesResponse({
    places: [{ ...candidate, primaryType: undefined, types: ['restaurant', 'tourist_attraction'] }],
  }, 'all')[0];
  assertEquals(hotel.category, 'hotels');
  assertEquals(attraction.category, 'attractions');
});

Deno.test('specific request rejects a result outside its approved server-owned types', () => {
  try {
    parseGooglePlacesResponse({ places: [{ ...candidate, primaryType: 'cafe', types: ['cafe'] }] }, 'hotels');
  } catch (error) {
    assertEquals((error as ExplorePlacesError).code, 'EXPLORE_PROVIDER_INVALID_RESPONSE');
    return;
  }
  throw new Error('Expected category validation failure');
});

Deno.test('provider timeout aborts once and maps safely without leaking credentials', async () => {
  let providerSignal: AbortSignal | undefined;
  try {
    await discoverGooglePlaces(
      { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' },
      (_url, init) => new Promise((_resolve, reject) => {
        providerSignal = init?.signal ?? undefined;
        providerSignal?.addEventListener('abort', () => reject(new DOMException('secret detail', 'AbortError')));
      }),
      { apiKey: 'test-secret-never-returned', timeoutMilliseconds: 1 },
    );
  } catch (error) {
    assertEquals((error as ExplorePlacesError).code, 'EXPLORE_PROVIDER_UNAVAILABLE');
    assertEquals((error as ExplorePlacesError).status, 504);
    assertEquals((error as Error).message.includes('test-secret'), false);
  }
  assertEquals(providerSignal?.aborted, true);
});

Deno.test('incoming cancellation aborts provider work and maps AbortError safely', async () => {
  const incoming = new AbortController();
  const operation = discoverGooglePlaces(
    { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' },
    (_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('raw body'), { name: 'AbortError' })));
    }),
    { apiKey: 'test-key', timeoutMilliseconds: 1_000, signal: incoming.signal },
  );
  incoming.abort();
  try { await operation; } catch (error) {
    assertEquals((error as ExplorePlacesError).code, 'EXPLORE_PROVIDER_UNAVAILABLE');
    assertEquals((error as ExplorePlacesError).status, 503);
    assertEquals((error as Error).message.includes('raw body'), false);
  }
});

Deno.test('successful request clears timeout before it can abort the provider signal', async () => {
  let providerSignal: AbortSignal | undefined;
  await discoverGooglePlaces(
    { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' },
    (_url, init) => {
      providerSignal = init?.signal ?? undefined;
      return Promise.resolve(new Response(JSON.stringify({ places: [candidate] }), { status: 200 }));
    },
    { apiKey: 'test-key', timeoutMilliseconds: 5 },
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  assertEquals(providerSignal?.aborted, false);
});
