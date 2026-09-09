import assert from 'node:assert/strict';

import { PlaceMetadataError } from './errors.ts';
import {
  fetchPlaceMetadataFromGoogle,
  parseBusinessStatus,
  parseGooglePlaceDetailsResponse,
  parseOpeningHours,
} from './metadata.ts';

Deno.test('parseBusinessStatus - maps supported statuses and unknown accurately', () => {
  assert.equal(parseBusinessStatus('OPERATIONAL'), 'OPERATIONAL');
  assert.equal(parseBusinessStatus('CLOSED_TEMPORARILY'), 'CLOSED_TEMPORARILY');
  assert.equal(parseBusinessStatus('CLOSED_PERMANENTLY'), 'CLOSED_PERMANENTLY');
  assert.equal(parseBusinessStatus('UNKNOWN'), 'UNKNOWN');
  assert.equal(parseBusinessStatus(undefined), 'UNKNOWN');
  assert.equal(parseBusinessStatus(null), 'UNKNOWN');
});

Deno.test('parseBusinessStatus - fails closed on unsupported or malformed provider status', () => {
  assert.throws(
    () => parseBusinessStatus('UNRECOGNIZED_STATUS'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
  assert.throws(
    () => parseBusinessStatus('OPEN'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
  assert.throws(
    () => parseBusinessStatus(123),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
  assert.throws(
    () => parseBusinessStatus({}),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
});

Deno.test('parseOpeningHours - normalizes valid regularOpeningHours', () => {
  const raw = {
    openNow: true,
    periods: [
      {
        open: { day: 0, hour: 8, minute: 30 },
        close: { day: 0, hour: 17, minute: 0 },
      },
      {
        open: { day: 1, hour: 0, minute: 0 }, // 24/7 without close
      },
    ],
    weekdayDescriptions: [
      'Sunday: 8:30 AM – 5:00 PM',
      'Monday: Open 24 hours',
    ],
  };

  const parsed = parseOpeningHours(raw);
  assert.ok(parsed);
  assert.equal(parsed.openNow, true);
  assert.equal(parsed.periods.length, 2);
  assert.deepEqual(parsed.periods[0], {
    open: { day: 0, hour: 8, minute: 30 },
    close: { day: 0, hour: 17, minute: 0 },
  });
  assert.deepEqual(parsed.periods[1], {
    open: { day: 1, hour: 0, minute: 0 },
  });
  assert.equal(parsed.weekdayDescriptions.length, 2);
});

Deno.test('parseOpeningHours - returns null for missing or null hours', () => {
  assert.equal(parseOpeningHours(undefined), null);
  assert.equal(parseOpeningHours(null), null);
});

Deno.test('parseOpeningHours - handles openNow field variations', () => {
  const withoutOpenNow = parseOpeningHours({ periods: [], weekdayDescriptions: [] });
  assert.ok(withoutOpenNow);
  assert.equal(withoutOpenNow.openNow, undefined);

  const withFalse = parseOpeningHours({ openNow: false, periods: [], weekdayDescriptions: [] });
  assert.ok(withFalse);
  assert.equal(withFalse.openNow, false);

  assert.throws(
    () => parseOpeningHours({ openNow: 'yes', periods: [], weekdayDescriptions: [] }),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseOpeningHours({ openNow: null, periods: [], weekdayDescriptions: [] }),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseOpeningHours({ openNow: 1, periods: [], weekdayDescriptions: [] }),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
});

Deno.test('parseOpeningHours - fails closed on malformed hours structure', () => {
  assert.throws(
    () => parseOpeningHours('not an object'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseOpeningHours({ periods: [{ open: { day: 7, hour: 10, minute: 0 } }] }), // day out of range
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseOpeningHours({ periods: [{ open: { day: 1, hour: 25, minute: 0 } }] }), // hour out of range
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseOpeningHours({ periods: [{ open: { day: 1, hour: 10, minute: 65 } }] }), // minute out of range
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
});

Deno.test('parseGooglePlaceDetailsResponse - validates provider identity binding', () => {
  const basePayload = {
    id: 'ChIJxyz123456789',
    rating: 4.8,
    userRatingCount: 3200,
    businessStatus: 'OPERATIONAL',
    utcOffsetMinutes: 420,
  };

  // Matching valid ID
  const result = parseGooglePlaceDetailsResponse(basePayload, 'ChIJxyz123456789');
  assert.equal(result.googlePlaceId, 'ChIJxyz123456789');

  // Missing provider ID
  assert.throws(
    () => parseGooglePlaceDetailsResponse({ ...basePayload, id: undefined }, 'ChIJxyz123456789'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  // Wrong type / invalid provider ID
  assert.throws(
    () => parseGooglePlaceDetailsResponse({ ...basePayload, id: 12345 }, 'ChIJxyz123456789'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  assert.throws(
    () => parseGooglePlaceDetailsResponse({ ...basePayload, id: 'bad ID with spaces' }, 'ChIJxyz123456789'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );

  // Mismatched provider ID
  assert.throws(
    () => parseGooglePlaceDetailsResponse({ ...basePayload, id: 'ChIJdifferentPlace999' }, 'ChIJxyz123456789'),
    (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_INVALID_RESPONSE',
  );
});

Deno.test('parseGooglePlaceDetailsResponse - parses complete place details', () => {
  const payload = {
    id: 'ChIJxyz123456789',
    rating: 4.8,
    userRatingCount: 3200,
    businessStatus: 'OPERATIONAL',
    utcOffsetMinutes: 420,
    regularOpeningHours: {
      openNow: false,
      periods: [{ open: { day: 2, hour: 9, minute: 0 }, close: { day: 2, hour: 18, minute: 0 } }],
      weekdayDescriptions: ['Tuesday: 9:00 AM – 6:00 PM'],
    },
  };

  const result = parseGooglePlaceDetailsResponse(payload, 'ChIJxyz123456789');
  assert.equal(result.googlePlaceId, 'ChIJxyz123456789');
  assert.equal(result.rating, 4.8);
  assert.equal(result.userRatingCount, 3200);
  assert.equal(result.businessStatus, 'OPERATIONAL');
  assert.equal(result.utcOffsetMinutes, 420);
  assert.ok(result.openingHours);
  assert.equal(result.provenance.provider, 'google-places');
  assert.equal(result.provenance.boundary, 'get-place-metadata');
  assert.ok(result.provenance.fetchedAt);
});

Deno.test('maps provider failure without reading or logging the raw provider body', async () => {
  let bodyRead = false;
  const originalError = console.error;
  const logged: unknown[][] = [];
  console.error = (...values: unknown[]) => logged.push(values);

  try {
    await assert.rejects(
      () => fetchPlaceMetadataFromGoogle('ChIJowned', () => Promise.resolve({
        ok: false,
        status: 500,
        text: () => {
          bodyRead = true;
          return Promise.resolve('sensitive provider body');
        },
      } as unknown as Response), { apiKey: 'test-key', timeoutMilliseconds: 1_000 }),
      (err: unknown) => err instanceof PlaceMetadataError && err.code === 'PLACE_PROVIDER_UNAVAILABLE',
    );
  } finally {
    console.error = originalError;
  }

  assert.equal(bodyRead, false);
  assert.equal(logged.length, 0);
});
