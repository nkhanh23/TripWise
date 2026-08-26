import { assertEquals } from 'jsr:@std/assert@1.0.15';
import { handleExplorePlaces, type ExplorePlacesDependencies } from './handler.ts';

const body = { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all', limit: 12 };
const request = (value: unknown = body) => new Request('http://local/explore-places', {
  method: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify(value),
});
const deps = (overrides: Partial<ExplorePlacesDependencies> = {}): ExplorePlacesDependencies => ({
  authenticate: () => Promise.resolve('user-id'), discover: () => Promise.resolve([]), ...overrides,
});

Deno.test('authenticated request invokes bounded discovery', async () => {
  let receivedLimit = 0;
  const response = await handleExplorePlaces(request(), deps({ discover: (value) => { receivedLimit = value.limit ?? 0; return Promise.resolve([]); } }));
  assertEquals(response.status, 200); assertEquals(receivedLimit, 12);
});

Deno.test('anonymous request is rejected before discovery', async () => {
  let called = false;
  const response = await handleExplorePlaces(request(), deps({ authenticate: () => Promise.resolve(null), discover: () => { called = true; return Promise.resolve([]); } }));
  assertEquals(response.status, 401); assertEquals(called, false);
  assertEquals((await response.json()).error.code, 'UNAUTHORIZED');
});

Deno.test('invalid input is rejected before provider call', async () => {
  let called = false;
  const response = await handleExplorePlaces(request({ ...body, category: 'unknown' }), deps({ discover: () => { called = true; return Promise.resolve([]); } }));
  assertEquals(response.status, 400); assertEquals(called, false);
  assertEquals((await response.json()).error.code, 'EXPLORE_INPUT_INVALID');
});
