import { SupabaseExplorePlacesRepository } from '../src/integration/remote/supabaseExplorePlacesRepository';
import { IntegrationError, mapExplorePlacesError } from '../src/integration/errors';
import { parseExplorePlacesSuccess, validateExplorePlacesRequest } from '../src/integration/validation';
type FsModule = { readFileSync(path: string, encoding: 'utf8'): string };
declare function require(moduleName: 'fs'): FsModule;
const { readFileSync } = require('fs');

const request = { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 5000, category: 'all' as const, limit: 12 };
const response = { data: { places: [{
  googlePlaceId: 'ChIJfixture12345', name: 'Wat Arun', latitude: 13.7437, longitude: 100.4888,
  category: 'attractions', categoryLabel: 'Attraction', formattedAddress: 'Bangkok', rating: 4.8,
  userRatingCount: 120,
}] } };

describe('Explore integration boundary', () => {
  it('validates the bounded request DTO and rejects unknown input', () => {
    expect(validateExplorePlacesRequest(request)).toEqual(request);
    expect(() => validateExplorePlacesRequest({ ...request, providerUrl: 'https://example.invalid' })).toThrow();
    expect(() => validateExplorePlacesRequest({ ...request, limit: 13 })).toThrow();
  });

  it('validates unknown response and preserves provider identity and real coordinates', () => {
    const place = parseExplorePlacesSuccess(response).data.places[0];
    expect(place.googlePlaceId).toBe('ChIJfixture12345');
    expect(place.coordinate).toEqual({ latitude: 13.7437, longitude: 100.4888 });
    expect(place.category).toBe('attractions');
    expect(() => parseExplorePlacesSuccess({ data: { places: [{ ...response.data.places[0], latitude: 91 }] } })).toThrow();
  });

  it('handles unavailable optional fields without fabricating them', () => {
    const raw = { ...response.data.places[0] };
    delete (raw as Partial<typeof raw>).formattedAddress;
    delete (raw as Partial<typeof raw>).rating;
    delete (raw as Partial<typeof raw>).userRatingCount;
    expect(parseExplorePlacesSuccess({ data: { places: [raw] } }).data.places[0]).not.toHaveProperty('rating');
  });

  it('maps safe domain error codes', () => {
    expect(mapExplorePlacesError({ error: { code: 'EXPLORE_PROVIDER_RATE_LIMITED' } })).toMatchObject({ code: 'rateLimited' });
    expect(mapExplorePlacesError({ error: { code: 'EXPLORE_PROVIDER_UNAVAILABLE' } })).toMatchObject({ code: 'providerUnavailable', retryable: true });
  });

  it('repository invokes only explore-places and validates the response', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: response, error: null });
    const repository = new SupabaseExplorePlacesRepository({ functions: { invoke } } as never);
    const places = await repository.discover(request);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe('explore-places');
    expect(places[0].googlePlaceId).toBe('ChIJfixture12345');
  });

  it('does not expose an unknown provider payload as an IntegrationError message', () => {
    const error = mapExplorePlacesError({ raw: 'credential body' });
    expect(error).toBeInstanceOf(IntegrationError);
    expect(error.message).not.toContain('credential body');
  });

  it('production composition injects the real repository and map has no fixture conversion or camera fit loop', () => {
    const tabs = readFileSync('src/navigation/MainTabs.tsx', 'utf8');
    const map = readFileSync('src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');
    expect(tabs).toContain('repository={explorePlacesRepository}');
    expect(tabs).not.toContain('initialPlaces={mockExplorePlaces}');
    expect(map).not.toContain('mapFixturePlaceToCoordinate');
    expect(map).not.toContain('fitToCoordinates');
    expect(map).not.toContain('animateToRegion');
    expect(map).toContain('onRegionChangeComplete={onRegionChangeComplete}');
  });
});
