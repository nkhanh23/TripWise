import { buildDrivingRouteRequest, hasVerifiedRouteStops } from '../src/integration/routePlanning';
import type { SavedTripDetail } from '../src/integration/contracts';

const detail = {
  id: '11111111-1111-4111-8111-111111111111', title: 'Trip', destination: 'Bangkok',
  startDate: '2026-08-20', endDate: '2026-08-21', estimatedBudget: null, currency: null,
  createdAt: '2026-08-20T00:00:00.000Z', updatedAt: '2026-08-20T00:00:00.000Z',
  days: [{ id: '22222222-2222-4222-8222-222222222222', dayNumber: 1, date: '2026-08-20', items: [
    { id: '33333333-3333-4333-8333-333333333333', position: 2, placeName: 'Second', resolution: 'VERIFIED', googlePlaceId: 'ChIJAAAAAAAAAAAAAAAAAA', latitude: 13.75, longitude: 100.50, placeResolvedAt: '2026-08-20T00:00:00.000Z' },
    { id: '44444444-4444-4444-8444-444444444444', position: 1, placeName: 'First', resolution: 'VERIFIED', googlePlaceId: 'ChIJBBBBBBBBBBBBBBBBBB', latitude: 13.74, longitude: 100.49, placeResolvedAt: '2026-08-20T00:00:00.000Z' },
    { id: '55555555-5555-4555-8555-555555555555', position: 3, placeName: 'Unresolved', resolution: 'UNRESOLVED', latitude: null, longitude: null },
  ] }],
} as unknown as SavedTripDetail;

describe('route planning boundary', () => {
  it('uses verified coordinates in persisted item order and driving only', () => {
    expect(buildDrivingRouteRequest(detail)).toEqual({
      profile: 'driving',
      coordinates: [
        { latitude: 13.74, longitude: 100.49 },
        { latitude: 13.75, longitude: 100.50 },
      ],
    });
  });

  it('does not create a route from fewer than two verified stops', () => {
    const one = { ...detail, days: [{ ...detail.days[0], items: [detail.days[0].items[0]] }] } as SavedTripDetail;
    expect(hasVerifiedRouteStops(one)).toBe(false);
    expect(() => buildDrivingRouteRequest(one)).toThrow();
  });
});
