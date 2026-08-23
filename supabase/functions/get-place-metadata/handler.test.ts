import { assertEquals } from 'https://deno.land/std@0.222.1/assert/mod.ts';
import { handleGetPlaceMetadata } from './handler.ts';

Deno.test('handleGetPlaceMetadata - OPTIONS returns CORS headers', async () => {
  const request = new Request('http://localhost', { method: 'OPTIONS' });
  const response = await handleGetPlaceMetadata(request, {} as any);
  assertEquals(response.status, 200);
  assertEquals(response.headers.get('Access-Control-Allow-Origin'), '*');
});

Deno.test('handleGetPlaceMetadata - returns 405 for GET', async () => {
  const request = new Request('http://localhost', { method: 'GET' });
  const response = await handleGetPlaceMetadata(request, {} as any);
  assertEquals(response.status, 405);
});

Deno.test('handleGetPlaceMetadata - returns metadata on success', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const deps = {
    authenticate: async () => 'user-123',
    verifyOwnership: async () => true,
    fetchMetadata: async () => ({ rating: 4.5, userRatingCount: 100 }),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.data.googlePlaceId, 'ChIJxyz');
  assertEquals(body.data.rating, 4.5);
  assertEquals(body.data.userRatingCount, 100);
});

Deno.test('handleGetPlaceMetadata - handles missing metadata gracefully', async () => {
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ googlePlaceId: 'ChIJxyz' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const deps = {
    authenticate: async () => 'user-123',
    verifyOwnership: async () => true,
    fetchMetadata: async () => ({ rating: undefined, userRatingCount: undefined }),
  };

  const response = await handleGetPlaceMetadata(request, deps);
  assertEquals(response.status, 200);
  
  const body = await response.json();
  assertEquals(body.data.googlePlaceId, 'ChIJxyz');
  assertEquals(body.data.rating, undefined);
  assertEquals(body.data.userRatingCount, undefined);
});
