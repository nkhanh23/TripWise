import assert from 'node:assert/strict';

import { GenerateTripError } from './errors.ts';
import { handleGenerateTrip } from './handler.ts';
import type { GeneratedTrip } from './types.ts';

const generatedTrip: GeneratedTrip = {
  title: 'Nha Trang hai ngày', destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02',
  days: [
    { dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Bãi biển Nha Trang' }] },
    { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Chợ Đầm' }] },
  ],
};

Deno.test('requires authentication before processing input', async () => {
  const response = await handleGenerateTrip(new Request('http://localhost/generate-trip', { method: 'POST', body: '{}' }), {
    authenticate: () => Promise.resolve(false),
    generate: () => Promise.resolve(generatedTrip),
  });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'UNAUTHORIZED');
});

Deno.test('returns the stable success contract without database writes', async () => {
  const response = await handleGenerateTrip(new Request('http://localhost/generate-trip', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02' }),
  }), {
    authenticate: () => Promise.resolve(true),
    generate: () => Promise.resolve(generatedTrip),
  });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data, generatedTrip);
});

Deno.test('rejects invalid input before calling Gemini', async () => {
  let generateCalled = false;
  const response = await handleGenerateTrip(new Request('http://localhost/generate-trip', {
    method: 'POST', body: JSON.stringify({ destination: 'Nha Trang', startDate: 'invalid', endDate: '2026-09-02' }),
  }), {
    authenticate: () => Promise.resolve(true),
    generate: () => {
      generateCalled = true;
      return Promise.resolve(generatedTrip);
    },
  });
  assert.equal(response.status, 400);
  assert.equal(generateCalled, false);
  assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
});

Deno.test('maps AI timeout without exposing provider internals', async () => {
  const response = await handleGenerateTrip(new Request('http://localhost/generate-trip', {
    method: 'POST', body: JSON.stringify({ destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02' }),
  }), {
    authenticate: () => Promise.resolve(true),
    generate: () => Promise.reject(new GenerateTripError('AI_TIMEOUT', 'AI generation timed out.', 504)),
  });
  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), { error: { code: 'AI_TIMEOUT', message: 'AI generation timed out.' } });
});
