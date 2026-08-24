import assert from 'node:assert/strict';

import { PlaceMetadataError } from './errors.ts';
import { fetchPlaceMetadataFromGoogle } from './metadata.ts';

Deno.test('maps provider failure without reading or logging the raw provider body', async () => {
  let bodyRead = false;
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...values: unknown[]) => logged.push(values);

  try {
    await assert.rejects(
      () => fetchPlaceMetadataFromGoogle('ChIJowned', async () => ({
        ok: false,
        status: 500,
        text: async () => {
          bodyRead = true;
          return 'sensitive provider body';
        },
      }) as Response, { apiKey: 'test-key', timeoutMilliseconds: 1_000 }),
      (error: unknown) => error instanceof PlaceMetadataError
        && error.code === 'PLACE_PROVIDER_UNAVAILABLE',
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(bodyRead, false);
  assert.deepEqual(logged, [[
    '[get-place-metadata] Google Places request failed',
    { status: 500, category: 'provider_5xx' },
  ]]);
});
