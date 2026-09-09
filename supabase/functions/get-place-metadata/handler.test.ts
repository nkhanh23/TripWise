import assert from 'node:assert/strict';
import { handleGetPlaceMetadata, type PlaceMetadataDependencies } from './handler.ts';
import type { PlaceMetadataResult } from './types.ts';

const assertEquals = (actual: unknown, expected: unknown): void => assert.deepEqual(actual, expected);

const dummyDeps: PlaceMetadataDependencies = {
  authenticate: () => Promise.resolve(null),
  verifyOwnership: () => Promise.resolve(false),
  fetchMetadata: () => Promise.reject(new Error('not implemented')),
};

Deno.test('handleGetPlaceMetadata - OPTIONS returns CORS headers', async () => {
  const request = new Request('http://localhost', { method: 'OPTIONS' });
  const response = await handleGetPlaceMetadata(request, dummyDeps);
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('handleGetPlaceMetadata - returns 405 for GET', async () => {
  const request = new Request('http://localhost', { method: 'GET' });
  const response = await handleGetPlaceMetadata(request, dummyDeps);
  assertEquals(response.status, 405);
});

Deno.test('handleGetPlaceMetadata - returns 401 for unauthenticated request', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz123456789' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const deps: PlaceMetadataDependencies = {
    authenticate: () => Promise.resolve(null),
    verifyOwnership: () => Promise.resolve(true),
    fetchMetadata: () => Promise.reject(new Error('should not call')),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 401);
  const body = await response.json();
  assertEquals(body.error.code, 'UNAUTHORIZED');
});

Deno.test('handleGetPlaceMetadata - returns 400 for invalid, malformed, or extra fields in request body', async () => {
  const cases = [
    {},
    { googlePlaceId: '' },
    { googlePlaceId: 'short' },
    { googlePlaceId: 'has space in place id' },
    { googlePlaceId: 12345 },
    { googlePlaceId: 'ChIJxyz123456789', extraKey: 'forbidden' },
    { googlePlaceId: 'ChIJxyz123456789', rating: 5 },
    { randomKey: 'ChIJxyz123456789' },
  ];

  for (const c of cases) {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(c),
      headers: { 'Content-Type': 'application/json' },
    });

    const deps: PlaceMetadataDependencies = {
      authenticate: () => Promise.resolve('user-123'),
      verifyOwnership: () => Promise.resolve(true),
      fetchMetadata: () => Promise.reject(new Error('should not call')),
    };

    const response = await handleGetPlaceMetadata(request, deps);
    assertEquals(response.status, 400);
    const body = await response.json();
    assertEquals(body.error.code, 'PLACE_INPUT_INVALID');
  }
});

Deno.test('handleGetPlaceMetadata - rejects oversized request body (>2KB)', async () => {
  const oversized = 'x'.repeat(2049);
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz123456789', padding: oversized }),
    headers: { 'Content-Type': 'application/json' },
  });

  const deps: PlaceMetadataDependencies = {
    authenticate: () => Promise.resolve('user-123'),
    verifyOwnership: () => Promise.resolve(true),
    fetchMetadata: () => Promise.reject(new Error('should not call')),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error.code, 'PLACE_INPUT_INVALID');
});

Deno.test('handleGetPlaceMetadata - returns 403 for unowned place', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz123456789' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const deps: PlaceMetadataDependencies = {
    authenticate: () => Promise.resolve('user-123'),
    verifyOwnership: () => Promise.resolve(false),
    fetchMetadata: () => Promise.reject(new Error('should not call')),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 403);
  const body = await response.json();
  assertEquals(body.error.code, 'FORBIDDEN');
});

Deno.test('handleGetPlaceMetadata - returns full live intelligence metadata on success', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz123456789' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const mockResult: PlaceMetadataResult = {
    googlePlaceId: 'ChIJxyz123456789',
    rating: 4.6,
    userRatingCount: 1250,
    businessStatus: 'OPERATIONAL',
    openingHours: {
      periods: [
        { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } },
      ],
      weekdayDescriptions: ['Monday: 9:00 AM – 5:00 PM'],
      openNow: true,
    },
    utcOffsetMinutes: 420,
    provenance: {
      provider: 'google-places',
      boundary: 'get-place-metadata',
      fetchedAt: '2026-09-09T03:00:00.000Z',
    },
  };

  const deps: PlaceMetadataDependencies = {
    authenticate: () => Promise.resolve('user-123'),
    verifyOwnership: () => Promise.resolve(true),
    fetchMetadata: () => Promise.resolve(mockResult),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 200);

  const body = await response.json();
  assertEquals(body.data.googlePlaceId, 'ChIJxyz123456789');
  assertEquals(body.data.rating, 4.6);
  assertEquals(body.data.userRatingCount, 1250);
  assertEquals(body.data.businessStatus, 'OPERATIONAL');
  assertEquals(body.data.openingHours.periods.length, 1);
  assertEquals(body.data.openingHours.weekdayDescriptions[0], 'Monday: 9:00 AM – 5:00 PM');
  assertEquals(body.data.utcOffsetMinutes, 420);
  assertEquals(body.data.provenance.provider, 'google-places');
});

Deno.test('handleGetPlaceMetadata - handles unavailable hours and unknown status honestly', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz123456789' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const mockResult: PlaceMetadataResult = {
    googlePlaceId: 'ChIJxyz123456789',
    businessStatus: 'UNKNOWN',
    openingHours: null,
    provenance: {
      provider: 'google-places',
      boundary: 'get-place-metadata',
      fetchedAt: '2026-09-09T03:00:00.000Z',
    },
  };

  const deps: PlaceMetadataDependencies = {
    authenticate: () => Promise.resolve('user-123'),
    verifyOwnership: () => Promise.resolve(true),
    fetchMetadata: () => Promise.resolve(mockResult),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 200);

  const body = await response.json();
  assertEquals(body.data.businessStatus, 'UNKNOWN');
  assertEquals(body.data.openingHours, null);
  assertEquals(body.data.rating, undefined);
});
