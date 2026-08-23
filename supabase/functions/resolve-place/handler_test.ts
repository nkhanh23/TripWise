import { assertEquals } from 'jsr:@std/assert@1.0.15';
import { ResolvePlaceError } from './errors.ts';
import { handleResolvePlace } from './handler.ts';
import type { ResolvePlaceDependencies } from './handler.ts';

const itemId = '00000000-0000-4000-8000-000000000001';
const context = { itemId, placeName: 'Wat Arun', placeQuery: 'Wat Arun', destination: 'Bangkok', wasResolved: false };
const snapshot = { googlePlaceId: 'google-1', placeName: 'Wat Arun', latitude: 13.7, longitude: 100.4 };
const request = () => new Request('http://local/resolve-place', { method: 'POST', body: JSON.stringify({ itineraryItemId: itemId }) });

function dependencies(overrides: Partial<ResolvePlaceDependencies> = {}): ResolvePlaceDependencies {
  return {
    authenticate: () => Promise.resolve('owner-a'),
    loadContext: () => Promise.resolve(context),
    resolve: () => Promise.resolve(snapshot),
    persist: () => Promise.resolve('2026-08-20T00:00:00.000Z'),
    ...overrides,
  };
}

async function errorCode(result: Response): Promise<string> {
  return ((await result.json()) as { error: { code: string } }).error.code;
}

Deno.test('success loads owner-scoped context and persists only verified snapshot', async () => {
  let persisted = false;
  const result = await handleResolvePlace(request(), dependencies({
    loadContext: (owner, id) => Promise.resolve(owner === 'owner-a' && id === itemId ? context : null),
    persist: (owner, id, value) => { persisted = owner === 'owner-a' && id === itemId && value.googlePlaceId === 'google-1'; return Promise.resolve('2026-08-20T00:00:00.000Z'); },
  }));
  assertEquals(result.status, 200); assertEquals(persisted, true);
  assertEquals((await result.json()).data.resolution, 'VERIFIED');
});

Deno.test('successful refresh is reported without accepting a client snapshot', async () => {
  const result = await handleResolvePlace(request(), dependencies({
    loadContext: () => Promise.resolve({ ...context, wasResolved: true }),
  }));
  assertEquals(result.status, 200);
  assertEquals((await result.json()).data.resolution, 'VERIFIED_REFRESHED');
});

Deno.test('refresh provider failure does not invoke persistence', async () => {
  let persisted = false;
  const result = await handleResolvePlace(request(), dependencies({
    loadContext: () => Promise.resolve({ ...context, wasResolved: true }),
    resolve: () => Promise.reject(new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is unavailable.', 503)),
    persist: () => { persisted = true; return Promise.resolve('2026-08-20T00:00:00.000Z'); },
  }));
  assertEquals(result.status, 503);
  assertEquals(await errorCode(result), 'PLACE_PROVIDER_UNAVAILABLE');
  assertEquals(persisted, false);
});

Deno.test('unauthenticated request is rejected', async () => {
  const result = await handleResolvePlace(request(), dependencies({ authenticate: () => Promise.resolve(null) }));
  assertEquals(result.status, 401); assertEquals(await errorCode(result), 'UNAUTHORIZED');
});

Deno.test('cross-user/not-found context is not resolved', async () => {
  const result = await handleResolvePlace(request(), dependencies({ loadContext: () => Promise.resolve(null) }));
  assertEquals(result.status, 404); assertEquals(await errorCode(result), 'PLACE_NOT_FOUND');
});

Deno.test('no match leaves item unchanged', async () => {
  const result = await handleResolvePlace(request(), dependencies({
    resolve: () => Promise.reject(new ResolvePlaceError('PLACE_NOT_FOUND', 'No verified place match was found.', 404)),
  }));
  assertEquals(result.status, 404); assertEquals(await errorCode(result), 'PLACE_NOT_FOUND');
});

Deno.test('persistence failure is sanitized', async () => {
  const result = await handleResolvePlace(request(), dependencies({ persist: () => Promise.reject(new Error('internal detail')) }));
  assertEquals(result.status, 500); assertEquals(await errorCode(result), 'PLACE_PERSISTENCE_FAILED');
});
