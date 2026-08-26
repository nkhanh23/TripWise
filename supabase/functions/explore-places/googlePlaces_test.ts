import { assertEquals, assertRejects, assertStringIncludes } from 'jsr:@std/assert@1.0.15';
import { ExplorePlacesError } from './errors.ts';
import { discoverGooglePlaces, GOOGLE_TYPES_BY_CATEGORY, parseGooglePlacesResponse } from './googlePlaces.ts';

const candidate = {
  id: 'ChIJfixture12345', displayName: { text: 'Wat Arun' },
  location: { latitude: 13.7437, longitude: 100.4888 },
  primaryType: 'tourist_attraction', types: ['tourist_attraction'],
  formattedAddress: 'Bangkok', rating: 4.8, userRatingCount: 120,
};

Deno.test('category map is the approved bounded Google type set', () => {
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.restaurants, ['restaurant']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.hotels, ['hotel']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.coffee, ['cafe']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.shopping, ['shopping_mall']);
  assertEquals(GOOGLE_TYPES_BY_CATEGORY.all.includes('tourist_attraction'), true);
});

Deno.test('valid provider response is normalized and preserves identity and coordinates', () => {
  assertEquals(parseGooglePlacesResponse({ places: [candidate] }), [{
    googlePlaceId: 'ChIJfixture12345', name: 'Wat Arun', latitude: 13.7437, longitude: 100.4888,
    category: 'attractions', categoryLabel: 'Attraction', formattedAddress: 'Bangkok', rating: 4.8,
    userRatingCount: 120,
  }]);
});

Deno.test('malformed provider response fails safely', () => {
  try { parseGooglePlacesResponse({ places: [{ ...candidate, location: {} }] }); } catch (error) {
    assertEquals((error as ExplorePlacesError).code, 'EXPLORE_PROVIDER_INVALID_RESPONSE');
    return;
  }
  throw new Error('Expected validation failure');
});

for (const [status, code] of [[403, 'EXPLORE_PROVIDER_AUTH'], [429, 'EXPLORE_PROVIDER_RATE_LIMITED'], [503, 'EXPLORE_PROVIDER_UNAVAILABLE']] as const) {
  Deno.test(`provider status ${status} maps safely`, async () => {
    await assertRejects(
      () => discoverGooglePlaces({ center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all', limit: 12 },
        () => Promise.resolve(new Response(JSON.stringify({ credential: 'raw-provider-body' }), { status })), 'test-secret-never-returned'),
      ExplorePlacesError,
    );
    try {
      await discoverGooglePlaces({ center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' },
        () => Promise.resolve(new Response('{}', { status })), 'test-secret-never-returned');
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
      assertStringIncludes(body, 'restaurant');
      assertStringIncludes(body, '"maxResultCount":12');
      return Promise.resolve(new Response(JSON.stringify({ places: [candidate] }), { status: 200 }));
    }, 'test-key');
  assertEquals(calls, 1);
});
