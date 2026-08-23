import { assertEquals, assertRejects } from 'jsr:@std/assert@1.0.15';
import { ResolvePlaceError } from './errors.ts';
import { resolveWithGooglePlaces } from './places.ts';

const context = { itemId: '00000000-0000-4000-8000-000000000001', placeName: 'Wat Arun', placeQuery: 'Wat Arun', destination: 'Bangkok', wasResolved: false };
const config = { apiKey: 'test-key', timeoutMilliseconds: 20 };
const candidate = { id: 'google-1', displayName: { text: 'Wat Arun' }, location: { latitude: 13.7437, longitude: 100.4888 }, formattedAddress: 'Bangkok, Thailand', primaryType: 'tourist_attraction', types: ['tourist_attraction'] };
const response = (status: number, body: unknown) => () => Promise.resolve(new Response(JSON.stringify(body), { status }));

Deno.test('resolves exactly one complete high-confidence provider result', async () => {
  const result = await resolveWithGooglePlaces(context, response(200, { places: [candidate] }), config);
  assertEquals(result, { googlePlaceId: 'google-1', placeName: 'Wat Arun', latitude: 13.7437, longitude: 100.4888, placeAddress: 'Bangkok, Thailand', placeCategory: 'landmark' });
});

Deno.test('accepts localized canonical name when provider address proves requested landmark and locality', async () => {
  const localizedContext = { ...context, placeQuery: 'Wat Arun, Bangkok, Thailand', destination: 'Bangkok, Thailand' };
  const localized = {
    ...candidate,
    displayName: { text: 'Chùa Arun' },
    formattedAddress: '158 Wang Doem Road, Wat Arun, Bangkok Yai, Bangkok 10600, Thái Lan',
  };
  const result = await resolveWithGooglePlaces(localizedContext, response(200, { places: [localized] }), config);
  assertEquals(result.placeName, 'Chùa Arun');
  assertEquals(result.googlePlaceId, 'google-1');
});

for (const [name, body] of [
  ['no result', { places: [] }],
  ['missing place id', { places: [{ ...candidate, id: undefined }] }],
  ['missing coordinates', { places: [{ ...candidate, location: {} }] }],
  ['invalid coordinates', { places: [{ ...candidate, location: { latitude: 91, longitude: 100 } }] }],
  ['unknown category is allowed but does not invent one', { places: [{ ...candidate, primaryType: 'establishment', types: ['establishment'] }] }],
] as const) {
  Deno.test(name, async () => {
    if (name.startsWith('unknown')) {
      const result = await resolveWithGooglePlaces(context, response(200, body), config);
      assertEquals(result.placeCategory, undefined);
      return;
    }
    await assertRejects(() => resolveWithGooglePlaces(context, response(200, body), config), ResolvePlaceError, 'No verified place match was found.');
  });
}

Deno.test('ambiguous candidates are not persisted', async () => {
  await assertRejects(() => resolveWithGooglePlaces(context, response(200, { places: [candidate, { ...candidate, id: 'google-2' }] }), config), ResolvePlaceError, 'Place match is ambiguous.');
});

for (const [name, status, expected] of [['provider auth', 403, 'PLACE_PROVIDER_AUTH'], ['quota', 429, 'PLACE_PROVIDER_RATE_LIMITED']] as const) {
  Deno.test(name, async () => {
    try { await resolveWithGooglePlaces(context, response(status, {}), config); } catch (error) {
      assertEquals((error as ResolvePlaceError).code, expected);
    }
  });
}

Deno.test('5xx retries once and then maps to provider unavailable', async () => {
  let attempts = 0;
  await assertRejects(() => resolveWithGooglePlaces(context, () => { attempts += 1; return Promise.resolve(new Response('{}', { status: 500 })); }, config), ResolvePlaceError);
  assertEquals(attempts, 2);
});

Deno.test('timeout is bounded and maps without persisting a candidate', async () => {
  const timeoutFetcher: typeof fetch = (_input, init) => new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
  await assertRejects(() => resolveWithGooglePlaces(context, timeoutFetcher, { apiKey: 'test-key', timeoutMilliseconds: 1 }), ResolvePlaceError, 'Place provider timed out.');
});

Deno.test('malformed provider response is unavailable and no first result is trusted', async () => {
  await assertRejects(() => resolveWithGooglePlaces(context, response(200, { places: 'not-an-array' }), config), ResolvePlaceError, 'Place provider returned an invalid response.');
});
