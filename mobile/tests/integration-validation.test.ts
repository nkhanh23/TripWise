import {
  parseGenerateTripSuccess, parseOpenMeteoForecast, parseOsrmRoute, parseResolvePlaceSuccess,
  parseProfileStatistics, parseSavedTripDetail, parseSavedTripsPage,
  validatePersistTripCommand, validateSavedTripsPageRequest,
} from '../src/integration/validation';

const tripId = '11111111-1111-4111-8111-111111111111';
const dayId = '22222222-2222-4222-8222-222222222222';
const itemId = '33333333-3333-4333-8333-333333333333';
const createdAt = '2026-08-20T01:00:00.000Z';

describe('integration DTO validation', () => {
  it('accepts exact non-negative Profile statistics and rejects malformed values', () => {
    expect(parseProfileStatistics({ trips_count: 2, saved_places_count: 3 })).toEqual({
      tripsCount: 2,
      savedPlacesCount: 3,
    });
    expect(() => parseProfileStatistics({ trips_count: 2 })).toThrow();
    expect(() => parseProfileStatistics({ trips_count: 2, saved_places_count: -1 })).toThrow();
    expect(() => parseProfileStatistics({
      trips_count: 2,
      saved_places_count: 3,
      caller_user_id: '11111111-1111-4111-8111-111111111111',
    })).toThrow();
  });

  it('accepts a valid generate-trip success and rejects malformed ordering', () => {
    const valid = { data: {
      title: 'Nha Trang', destination: 'Nha Trang', startDate: '2026-09-01', endDate: '2026-09-01',
      days: [{ dayNumber: 1, date: '2026-09-01', items: [{ position: 1, placeName: 'Hòn Chồng' }] }],
    } };
    expect(parseGenerateTripSuccess(valid).data.title).toBe('Nha Trang');
    expect(() => parseGenerateTripSuccess({ ...valid, data: { ...valid.data, days: [
      { ...valid.data.days[0], dayNumber: 2 },
    ] } })).toThrow();
  });

  it('accepts unresolved nullable coordinate pairs and rejects half-pairs', () => {
    const base = {
      idempotencyKey: 'save-intent-0001',
      graph: {
        title: 'Trip', destination: 'Huế', startDate: '2026-09-01', endDate: '2026-09-01',
        days: [{ dayNumber: 1, date: '2026-09-01', items: [
          { position: 1, placeName: 'Đại Nội', latitude: null, longitude: null },
        ] }],
      },
    };
    expect(validatePersistTripCommand(base).graph.days[0].items[0]).toMatchObject({ latitude: null, longitude: null });
    expect(() => validatePersistTripCommand({
      ...base,
      graph: { ...base.graph, days: [{ ...base.graph.days[0], items: [
        { position: 1, placeName: 'Đại Nội', latitude: null },
      ] }] },
    })).toThrow();
  });

  it('requires protected provenance before accepting provider fields', () => {
    const common = {
      id: tripId, title: 'Trip', destination: 'Huế', startDate: '2026-09-01', endDate: '2026-09-01',
      estimatedBudget: null, currency: null, createdAt, updatedAt: createdAt,
    };
    const unresolved = { id: itemId, position: 1, placeName: 'Đại Nội', resolution: 'UNRESOLVED' };
    const detail = { ...common, days: [{ id: dayId, dayNumber: 1, date: '2026-09-01', items: [unresolved] }] };
    expect(parseSavedTripDetail(detail)?.days[0].items[0]).toMatchObject({
      resolution: 'UNRESOLVED', latitude: null, longitude: null,
    });
    expect(() => parseSavedTripDetail({
      ...detail,
      days: [{ ...detail.days[0], items: [{ ...unresolved, googlePlaceId: 'provider-looking-id' }] }],
    })).toThrow('Invalid unresolved saved trip item contract.');
  });

  it('validates keyset cursor, limit and saved page response', () => {
    const cursor = { createdAt, id: tripId };
    expect(validateSavedTripsPageRequest({ limit: 50, cursor })).toEqual({ limit: 50, cursor });
    expect(() => validateSavedTripsPageRequest({ limit: 51 })).toThrow();
    expect(() => validateSavedTripsPageRequest({ limit: 20, cursor: { createdAt, id: 'bad' } })).toThrow();
    expect(parseSavedTripsPage({ items: [{
      id: tripId, title: 'Trip', destination: 'Huế', startDate: '2026-09-01', endDate: '2026-09-01',
      estimatedBudget: null, currency: null, createdAt, dayCount: 1, itemCount: 1,
    }], nextCursor: cursor }).nextCursor).toEqual(cursor);
    expect(() => parseSavedTripsPage({ items: [{
      id: tripId, title: 'Trip', destination: 'Huế', startDate: '2026-09-01', endDate: '2026-09-01',
      estimatedBudget: -1, currency: null, createdAt, dayCount: 1, itemCount: 1,
    }], nextCursor: null })).toThrow();
  });

  it('rejects unknown resolver status and malformed provider shapes', () => {
    expect(() => parseResolvePlaceSuccess({ data: {
      itineraryItemId: itemId, resolution: 'LIKELY_VERIFIED', resolvedAt: createdAt,
    } })).toThrow();
    expect(() => parseOsrmRoute({ code: 'Ok', routes: [{
      distance: 1, duration: 1, geometry: { type: 'LineString', coordinates: [[999, 16], [108, 16]] },
    }] })).toThrow();
    expect(() => parseOpenMeteoForecast({ daily: {
      time: ['2026-09-01', '2026-09-02'],
      weather_code: [1],
      temperature_2m_max: [30, 31],
      temperature_2m_min: [24, 25],
      precipitation_probability_max: [10, 20],
    } })).toThrow();
  });
});
