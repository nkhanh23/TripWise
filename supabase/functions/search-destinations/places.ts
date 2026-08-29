import { SearchDestinationsError } from './errors.ts';
import type { DestinationResult } from './types.ts';

const endpoint = 'https://places.googleapis.com/v1/places:autocomplete';
const fieldMask = 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types';
const defaultTimeoutMilliseconds = 8_000;

type GooglePrediction = {
  placeId?: unknown;
  text?: { text?: unknown };
  structuredFormat?: { mainText?: { text?: unknown }; secondaryText?: { text?: unknown } };
  types?: unknown;
};
type GoogleResponse = { suggestions?: unknown };
export type GooglePlacesConfig = { apiKey?: string; timeoutMilliseconds?: number; signal?: AbortSignal };

export async function searchGooglePlaces(query: string, fetcher: typeof fetch = fetch, config: GooglePlacesConfig = {}): Promise<DestinationResult[]> {
  const apiKey = config.apiKey ?? Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) throw new SearchDestinationsError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is not configured.', 503);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMilliseconds ?? defaultTimeoutMilliseconds);
  if (config.signal) {
    config.signal.addEventListener('abort', () => controller.abort(), { once: true });
    if (config.signal.aborted) controller.abort();
  }
  try {
    const response = await fetcher(endpoint, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey, 'x-goog-fieldmask': fieldMask },
      body: JSON.stringify({ input: query, includedPrimaryTypes: ['locality', 'country'], languageCode: 'en' }),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new SearchDestinationsError('PLACE_PROVIDER_AUTH', 'Auth failed', 503);
      if (response.status === 429) throw new SearchDestinationsError('PLACE_PROVIDER_RATE_LIMITED', 'Rate limited', 429);
      throw new SearchDestinationsError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable', 503);
    }
    const body = await response.json() as GoogleResponse;
    if (!Array.isArray(body.suggestions)) return [];
    return body.suggestions
      .filter((value): value is { placePrediction?: unknown } => typeof value === 'object' && value !== null)
      .map((suggestion) => {
        const raw = suggestion.placePrediction;
        if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
        const prediction = raw as GooglePrediction;
        const googlePlaceId = typeof prediction.placeId === 'string' ? prediction.placeId.trim() : '';
        const name = typeof prediction.structuredFormat?.mainText?.text === 'string' ? prediction.structuredFormat.mainText.text.trim() : '';
        const formattedAddress = typeof prediction.structuredFormat?.secondaryText?.text === 'string'
          ? prediction.structuredFormat.secondaryText.text.trim()
          : typeof prediction.text?.text === 'string' ? prediction.text.text.trim() : '';
        const types = Array.isArray(prediction.types) ? prediction.types.filter((type): type is string => typeof type === 'string') : [];
        const destinationType = types.includes('locality') ? 'CITY' : types.includes('country') ? 'COUNTRY' : undefined;
        return googlePlaceId && name && destinationType ? { googlePlaceId, name, formattedAddress, destinationType } : null;
      })
      .filter((value): value is DestinationResult => value !== null)
      .slice(0, 6);
  } catch (error) {
    if (error instanceof SearchDestinationsError) throw error;
    throw new SearchDestinationsError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable', 503);
  } finally { clearTimeout(timeout); }
}
