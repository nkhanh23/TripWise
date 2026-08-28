import { SearchDestinationsError } from './errors.ts';
import type { DestinationResult } from './types.ts';

const endpoint = 'https://places.googleapis.com/v1/places:searchText';
const fieldMask = 'places.id,places.displayName,places.location,places.formattedAddress';
const defaultTimeoutMilliseconds = 8_000;

type GooglePlace = {
  id?: unknown;
  displayName?: { text?: unknown };
  location?: { latitude?: unknown; longitude?: unknown };
  formattedAddress?: unknown;
};

type GoogleResponse = { places?: unknown };

export type GooglePlacesConfig = { apiKey?: string; timeoutMilliseconds?: number; signal?: AbortSignal };

export async function searchGooglePlaces(
  query: string,
  fetcher: typeof fetch = fetch,
  config: GooglePlacesConfig = {},
): Promise<DestinationResult[]> {
  const apiKey = config.apiKey ?? Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) throw new SearchDestinationsError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is not configured.', 503);

  const controller = new AbortController();
  const timeoutMs = config.timeoutMilliseconds ?? defaultTimeoutMilliseconds;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  if (config.signal) {
    config.signal.addEventListener('abort', () => controller.abort(), { once: true });
    if (config.signal.aborted) controller.abort();
  }

  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey, 'x-goog-fieldmask': fieldMask },
      body: JSON.stringify({
        textQuery: query,
        includedType: 'locality',
        languageCode: 'en',
        pageSize: 10,
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new SearchDestinationsError('PLACE_PROVIDER_AUTH', 'Auth failed', 503);
      if (response.status === 429) throw new SearchDestinationsError('PLACE_PROVIDER_RATE_LIMITED', 'Rate limited', 429);
      throw new SearchDestinationsError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable', 503);
    }

    const body = await response.json() as GoogleResponse;
    if (!Array.isArray(body.places)) return [];

    return body.places.filter((value): value is GooglePlace => typeof value === 'object' && value !== null)
      .map((place) => {
        const id = typeof place.id === 'string' ? place.id.trim() : '';
        const name = typeof place.displayName?.text === 'string' ? place.displayName.text.trim() : '';
        const latitude = place.location?.latitude;
        const longitude = place.location?.longitude;
        if (!id || !name || typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
          || typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
        return {
          googlePlaceId: id,
          name,
          formattedAddress: typeof place.formattedAddress === 'string' ? place.formattedAddress : '',
          latitude,
          longitude,
        };
      }).filter((v): v is DestinationResult => v !== null).slice(0, 10);

  } catch (error) {
    if (error instanceof SearchDestinationsError) throw error;
    throw new SearchDestinationsError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable', 503);
  } finally {
    clearTimeout(timeout);
  }
}

