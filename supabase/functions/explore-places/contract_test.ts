import { assertEquals, assertThrows } from 'jsr:@std/assert@1.0.15';
import { parseExplorePlacesRequest } from './contract.ts';
import { ExplorePlacesError } from './errors.ts';

const valid = { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 5_000, category: 'all' as const, limit: 12 };

Deno.test('accepts the bounded discovery contract', () => assertEquals(parseExplorePlacesRequest(valid), valid));

for (const [name, value] of [
  ['invalid latitude', { ...valid, center: { ...valid.center, latitude: 91 } }],
  ['invalid longitude', { ...valid, center: { ...valid.center, longitude: -181 } }],
  ['invalid radius', { ...valid, radiusMeters: 5_001 }],
  ['invalid category', { ...valid, category: 'nightlife' }],
  ['unbounded limit', { ...valid, limit: 13 }],
  ['unknown field', { ...valid, providerUrl: 'https://example.invalid' }],
] as const) {
  Deno.test(name, () => { assertThrows(() => parseExplorePlacesRequest(value), ExplorePlacesError); });
}
