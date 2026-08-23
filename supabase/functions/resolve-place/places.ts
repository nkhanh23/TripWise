import { ResolvePlaceError } from './errors.ts';
import type { PlaceSnapshot, StoredPlaceContext } from './types.ts';

const endpoint = 'https://places.googleapis.com/v1/places:searchText';
const fieldMask = 'places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.types';
const defaultTimeoutMilliseconds = 8_000;
const maximumAttempts = 2;

type GooglePlace = {
  id?: unknown;
  displayName?: { text?: unknown };
  location?: { latitude?: unknown; longitude?: unknown };
  formattedAddress?: unknown;
  primaryType?: unknown;
  types?: unknown;
};

type GoogleResponse = { places?: unknown };

function timeoutMilliseconds(): number {
  const configured = Number(Deno.env.get('GOOGLE_PLACES_TIMEOUT_MS'));
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 15_000
    ? configured
    : defaultTimeoutMilliseconds;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

function category(primaryType: unknown, types: unknown): string | undefined {
  const source = typeof primaryType === 'string' ? primaryType : Array.isArray(types)
    ? types.find((value): value is string => typeof value === 'string')
    : undefined;
  if (!source) return undefined;
  if (source.includes('museum')) return 'museum';
  if (source.includes('park')) return 'park';
  if (source.includes('restaurant') || source.includes('food')) return 'restaurant';
  if (source.includes('lodging') || source.includes('hotel')) return 'hotel';
  if (source.includes('tourist') || source.includes('landmark') || source.includes('place_of_worship')) return 'landmark';
  return undefined;
}

function snapshot(place: GooglePlace): PlaceSnapshot | null {
  const id = typeof place.id === 'string' ? place.id.trim() : '';
  const name = typeof place.displayName?.text === 'string' ? place.displayName.text.trim() : '';
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (!id || !name || typeof latitude !== 'number' || typeof longitude !== 'number'
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  const address = typeof place.formattedAddress === 'string' && place.formattedAddress.trim()
    ? place.formattedAddress.trim() : undefined;
  return { googlePlaceId: id, placeName: name, latitude, longitude, placeAddress: address, placeCategory: category(place.primaryType, place.types) };
}

function isHighConfidence(candidate: PlaceSnapshot, context: StoredPlaceContext): boolean {
  const requested = normalize(context.placeName);
  const canonical = normalize(candidate.placeName);
  const query = normalize(context.placeQuery ?? '');
  const destination = normalize(context.destination.split(',')[0] ?? context.destination);
  const address = normalize(candidate.placeAddress ?? '');
  const nameMatch = canonical === requested || (requested.length >= 4
    && (canonical.includes(requested) || address.includes(requested)));
  const queryMatch = query.length >= 4 && (canonical.includes(query) || address.includes(query));
  const localityMatch = destination.length >= 3 && address.includes(destination);
  return (nameMatch && localityMatch) || (nameMatch && queryMatch);
}

function providerError(status: number): ResolvePlaceError {
  if (status === 401 || status === 403) return new ResolvePlaceError('PLACE_PROVIDER_AUTH', 'Place provider authentication is unavailable.', 503);
  if (status === 429) return new ResolvePlaceError('PLACE_PROVIDER_RATE_LIMITED', 'Place provider rate limit was reached.', 429);
  return new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is temporarily unavailable.', 503);
}

export type GooglePlacesConfig = { apiKey: string | undefined; timeoutMilliseconds: number };

export async function resolveWithGooglePlaces(
  context: StoredPlaceContext,
  fetcher: typeof fetch = fetch,
  config: GooglePlacesConfig = { apiKey: Deno.env.get('GOOGLE_PLACES_API_KEY'), timeoutMilliseconds: timeoutMilliseconds() },
): Promise<PlaceSnapshot> {
  const apiKey = config.apiKey;
  if (!apiKey) throw new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is not configured.', 503);

  const textQuery = `${context.placeQuery?.trim() || context.placeName.trim()}, ${context.destination.trim()}`;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMilliseconds);
    try {
      const response = await fetcher(endpoint, {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey, 'x-goog-fieldmask': fieldMask },
        body: JSON.stringify({ textQuery, languageCode: 'vi', pageSize: 5 }),
      });
      if (!response.ok) {
        const mapped = providerError(response.status);
        if (attempt < maximumAttempts && response.status >= 500) continue;
        throw mapped;
      }
      const body = await response.json() as GoogleResponse;
      if (!Array.isArray(body.places)) throw new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider returned an invalid response.', 502);
      const candidates = body.places.filter((value): value is GooglePlace => typeof value === 'object' && value !== null)
        .map(snapshot).filter((value): value is PlaceSnapshot => value !== null).filter((value) => isHighConfidence(value, context));
      if (candidates.length === 0) throw new ResolvePlaceError('PLACE_NOT_FOUND', 'No verified place match was found.', 404);
      if (candidates.length !== 1) throw new ResolvePlaceError('PLACE_AMBIGUOUS', 'Place match is ambiguous.', 409);
      return candidates[0];
    } catch (error) {
      if (error instanceof ResolvePlaceError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < maximumAttempts) continue;
        throw new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider timed out.', 504);
      }
      if (attempt < maximumAttempts) continue;
      throw new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is temporarily unavailable.', 503);
    } finally { clearTimeout(timeout); }
  }
  throw new ResolvePlaceError('PLACE_PROVIDER_UNAVAILABLE', 'Place provider is temporarily unavailable.', 503);
}
