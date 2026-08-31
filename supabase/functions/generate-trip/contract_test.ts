import assert from 'node:assert/strict';

import { buildGeneratedTripJsonSchema, normalizeTripPayload, validateGenerateTripRequest, validateGeneratedTrip } from './contract.ts';
import type { GenerateTripRequest } from './types.ts';

const request: GenerateTripRequest = {
  destination: 'Nha Trang',
  startDate: '2026-09-01',
  endDate: '2026-09-02',
  travelers: 2,
  preferences: ['biển', 'ẩm thực'],
};

Deno.test('validates and normalizes a generate-trip request', () => {
  const result = validateGenerateTripRequest({ ...request, currency: 'vnd' });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.currency, 'VND');
});

Deno.test('rejects absurd date ranges and oversized input', () => {
  assert.equal(validateGenerateTripRequest({ ...request, endDate: '2026-10-01' }).ok, false);
  assert.equal(validateGenerateTripRequest({ ...request, notes: 'x'.repeat(501) }).ok, false);
});

Deno.test('builds a dynamic schema with strict exact day bounds based on request', () => {
  const customRequest = { ...request, startDate: '2026-09-01', endDate: '2026-09-03' };
  const schema = buildGeneratedTripJsonSchema(customRequest);
  
  assert.equal(schema.properties.days.minItems, 3);
  assert.equal(schema.properties.days.maxItems, 3);
  
  // verify standard supported constraints
  const dayItemsSchema = schema.properties.days.items;
  if ('properties' in dayItemsSchema && dayItemsSchema.properties) {
    assert.equal(dayItemsSchema.properties.date.format, 'date');
    const itemsSchema = dayItemsSchema.properties.items;
    if ('items' in itemsSchema && itemsSchema.items && 'properties' in itemsSchema.items) {
      assert.equal(itemsSchema.items.properties.estimatedCost.maximum, 1_000_000_000);
      assert.equal(itemsSchema.items.properties.position.minimum, 1);
    }
  }
});

Deno.test('validates the complete structured itinerary', () => {
  const result = validateGeneratedTrip({
    title: 'Hai ngày khám phá Nha Trang',
    destination: 'Nha Trang',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    days: [
      { dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Bãi biển Nha Trang', startTime: '09:00' }] },
      { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Chợ Đầm', estimatedCost: 200000 }] },
    ],
  }, request);
  assert.equal(result.ok, true);
});

Deno.test('normalizes blank optional AI fields before validating the itinerary', () => {
  const result = validateGeneratedTrip({
    title: 'Hai ngày khám phá Nha Trang',
    destination: 'Nha Trang',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    summary: '   ',
    days: [
      {
        dayNumber: 1, date: '2026-09-01', summary: '\t', items: [
          { position: 1, placeName: 'Bãi biển Nha Trang', placeQuery: ' ', note: '\n', startTime: '  ', endTime: '\t' },
        ],
      },
      { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Chợ Đầm' }] },
    ],
  }, request);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.value, normalizeTripPayload(result.value));
    assert.equal('summary' in result.value, false);
    assert.equal('summary' in result.value.days[0], false);
    assert.deepEqual(result.value.days[0].items[0], { position: 1, placeName: 'Bãi biển Nha Trang' });
  }
});

Deno.test('rejects non-empty invalid optional times after normalization', () => {
  const result = validateGeneratedTrip({
    title: 'Hai ngày khám phá Nha Trang', destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02',
    days: [
      { dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Bãi biển Nha Trang', startTime: '9AM' }] },
      { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Chợ Đầm' }] },
    ],
  }, request);
  assert.equal(result.ok, false);
});

Deno.test('reports a sanitized daily-itinerary diagnostic without logging generated values', () => {
  const result = validateGeneratedTrip({
    title: 'Hai ngày khám phá Nha Trang', destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02',
    days: [
      { dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Bãi biển Nha Trang', startTime: '9AM' }] },
      { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Chợ Đầm' }] },
    ],
  }, request);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.message, 'AI response contains an invalid daily itinerary.');
    assert.equal(result.diagnostic, 'days[0].items[0].startTime must use HH:MM');
    assert.equal(result.diagnostic.includes('9AM'), false);
  }
});

Deno.test('normalizes AI ordering and trip metadata from the trusted request', () => {
  const result = validateGeneratedTrip({
    title: 'Hai ngÃ y khÃ¡m phÃ¡ Nha Trang',
    destination: 'Nha Trang, Vietnam',
    startDate: '2026-09-02',
    endDate: '2026-09-03',
    days: [
      { dayNumber: 0, date: '2026-09-02', items: [{ position: 0, placeName: 'BÃ£i biá»ƒn Nha Trang' }] },
      { dayNumber: 4, date: '2026-09-03', items: [{ position: 8, placeName: 'Chá»£ Äáº§m' }] },
    ],
  }, request);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.destination, request.destination);
    assert.equal(result.value.startDate, request.startDate);
    assert.equal(result.value.endDate, request.endDate);
    assert.deepEqual(result.value.days.map((day) => [day.dayNumber, day.date, day.items[0].position]), [
      [1, '2026-09-01', 1],
      [2, '2026-09-02', 1],
    ]);
  }
});

Deno.test('rejects invented location metadata and inconsistent days', () => {
  const result = validateGeneratedTrip({
    title: 'Nha Trang', destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-02',
    days: [{ dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Beach', latitude: 12.2 }] }],
  }, request);
  assert.equal(result.ok, false);
});

Deno.test('rejects oversized AI strings beyond Edge boundaries', () => {
  const baseTrip = {
    title: 'Hai ngày khám phá Nha Trang',
    destination: 'Nha Trang',
    startDate: '2026-09-01',
    endDate: '2026-09-02',
    days: [
      { dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Bãi biển Nha Trang' }] },
      { dayNumber: 2, date: '2026-09-02', items: [{ position: 1, placeName: 'Chợ Đầm' }] },
    ],
  };

  assert.equal(validateGeneratedTrip({ ...baseTrip, title: 'x'.repeat(161) }, request).ok, false);
  assert.equal(validateGeneratedTrip({ ...baseTrip, destination: 'x'.repeat(121) }, request).ok, false);
  assert.equal(validateGeneratedTrip({ ...baseTrip, summary: 'x'.repeat(801) }, request).ok, false);

  const oversizedDaySummary = JSON.parse(JSON.stringify(baseTrip));
  oversizedDaySummary.days[0].summary = 'x'.repeat(501);
  assert.equal(validateGeneratedTrip(oversizedDaySummary, request).ok, false);

  const oversizedPlaceName = JSON.parse(JSON.stringify(baseTrip));
  oversizedPlaceName.days[0].items[0].placeName = 'x'.repeat(161);
  assert.equal(validateGeneratedTrip(oversizedPlaceName, request).ok, false);

  const oversizedPlaceQuery = JSON.parse(JSON.stringify(baseTrip));
  oversizedPlaceQuery.days[0].items[0].placeQuery = 'x'.repeat(201);
  assert.equal(validateGeneratedTrip(oversizedPlaceQuery, request).ok, false);

  const oversizedNote = JSON.parse(JSON.stringify(baseTrip));
  oversizedNote.days[0].items[0].note = 'x'.repeat(501);
  assert.equal(validateGeneratedTrip(oversizedNote, request).ok, false);
});
