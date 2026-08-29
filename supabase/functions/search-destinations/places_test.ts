import { assertEquals, assertRejects } from 'jsr:@std/assert@1.0.15';
import { SearchDestinationsError } from './errors.ts';
import { searchGooglePlaces } from './places.ts';

const cityPrediction = { placeId: 'city-id', text: { text: 'Singapore' }, structuredFormat: { mainText: { text: 'Singapore' }, secondaryText: { text: 'Singapore' } }, types: ['locality', 'political'] };
const countryPrediction = { placeId: 'country-id', text: { text: 'Vietnam' }, structuredFormat: { mainText: { text: 'Vietnam' }, secondaryText: { text: 'Vietnam' } }, types: ['country', 'political'] };
const businessPrediction = { placeId: 'business-id', text: { text: 'Singa Karaoke' }, structuredFormat: { mainText: { text: 'Singa Karaoke' }, secondaryText: { text: 'Singapore' } }, types: ['karaoke', 'establishment'] };
const fetchWith = (status: number, body: unknown = { suggestions: [{ placePrediction: cityPrediction }] }) => async () => new Response(JSON.stringify(body), { status });

Deno.test('requires Edge-only key', () => assertRejects(() => searchGooglePlaces('Singapore', fetchWith(200), { apiKey: '' }), SearchDestinationsError));
for (const [status, code] of [[401, 'PLACE_PROVIDER_AUTH'], [403, 'PLACE_PROVIDER_AUTH'], [429, 'PLACE_PROVIDER_RATE_LIMITED'], [500, 'PLACE_PROVIDER_UNAVAILABLE']] as const) Deno.test(`maps ${status}`, async () => assertEquals((await assertRejects(() => searchGooglePlaces('Singapore', fetchWith(status), { apiKey: 'test' }), SearchDestinationsError)).code, code));
Deno.test('uses autocomplete primary-type filtering and returns only cities/countries', async () => {
  let request: RequestInit | undefined;
  const result = await searchGooglePlaces('singa', async (_url, init) => { request = init; return new Response(JSON.stringify({ suggestions: [{ placePrediction: cityPrediction }, { placePrediction: countryPrediction }, { placePrediction: businessPrediction }] })); }, { apiKey: 'test' });
  assertEquals(JSON.parse(String(request?.body)), { input: 'singa', includedPrimaryTypes: ['locality', 'country'], languageCode: 'en' });
  assertEquals(result, [{ googlePlaceId: 'city-id', name: 'Singapore', formattedAddress: 'Singapore', destinationType: 'CITY' }, { googlePlaceId: 'country-id', name: 'Vietnam', formattedAddress: 'Vietnam', destinationType: 'COUNTRY' }]);
});
Deno.test('filters missing or non-city/country primary types and bounds output to six', async () => {
  const malformed = { ...cityPrediction, types: ['neighborhood'] };
  const result = await searchGooglePlaces('tok', fetchWith(200, { suggestions: [...Array(7).fill({ placePrediction: cityPrediction }), { placePrediction: businessPrediction }, { placePrediction: malformed }] }), { apiKey: 'test' });
  assertEquals(result.length, 6);
  assertEquals(result.every((item) => item.destinationType === 'CITY' || item.destinationType === 'COUNTRY'), true);
});
Deno.test('propagates caller abort without provider fan-out', async () => { const controller = new AbortController(); let signal: AbortSignal | undefined; const pending = searchGooglePlaces('Singapore', async (_url, init) => { signal = init?.signal as AbortSignal; return await new Promise<Response>(() => {}); }, { apiKey: 'test', signal: controller.signal, timeoutMilliseconds: 10_000 }); controller.abort(); await assertRejects(() => pending, SearchDestinationsError); assertEquals(signal?.aborted, true); });
