import { ExplorePlacesError } from './errors.ts';
import type { ExploreCategory, ExplorePlaceResult, NormalizedExploreCategory } from './types.ts';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchNearby';
const DEFAULT_TIMEOUT_MILLISECONDS = 8_000;
export const GOOGLE_PLACES_FIELD_MASK = [
  'places.id', 'places.displayName', 'places.location', 'places.primaryType', 'places.types',
  'places.formattedAddress',
].join(',');

export const GOOGLE_TYPES_BY_CATEGORY: Readonly<Record<ExploreCategory, readonly string[]>> = {
  all: ['tourist_attraction', 'museum', 'historical_landmark', 'park', 'restaurant', 'hotel', 'cafe', 'shopping_mall'],
  attractions: ['tourist_attraction', 'museum', 'historical_landmark', 'park'],
  restaurants: ['restaurant'],
  hotels: ['hotel'],
  coffee: ['cafe'],
  shopping: ['shopping_mall'],
};

const labels: Record<NormalizedExploreCategory, string> = {
  attractions: 'Attraction', restaurants: 'Restaurant', hotels: 'Hotel', coffee: 'Coffee', shopping: 'Shopping',
};

export type GooglePlacesDiscoveryConfig = {
  apiKey: string | undefined;
  timeoutMilliseconds: number;
  signal?: AbortSignal;
};

function timeoutMilliseconds(): number {
  const configured = Number(Deno.env.get('GOOGLE_PLACES_TIMEOUT_MS'));
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 15_000
    ? configured
    : DEFAULT_TIMEOUT_MILLISECONDS;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function categoryForType(type: string): NormalizedExploreCategory | null {
  if (type === 'hotel' || type === 'lodging') return 'hotels';
  if (GOOGLE_TYPES_BY_CATEGORY.attractions.includes(type)) return 'attractions';
  if (type === 'restaurant' || type.endsWith('_restaurant')) return 'restaurants';
  if (type === 'cafe') return 'coffee';
  if (type === 'shopping_mall') return 'shopping';
  return null;
}

function categoryFromProvider(
  primaryType: string | undefined,
  types: readonly string[],
  requestedCategory: ExploreCategory,
): NormalizedExploreCategory | null {
  if (requestedCategory !== 'all') {
    const approvedTypes = GOOGLE_TYPES_BY_CATEGORY[requestedCategory];
    const matchesRequest = (primaryType !== undefined && approvedTypes.includes(primaryType))
      || types.some((type) => approvedTypes.includes(type)
        || (requestedCategory === 'restaurants' && type.endsWith('_restaurant')));
    return matchesRequest ? requestedCategory : null;
  }
  const primaryCategory = primaryType === undefined ? null : categoryForType(primaryType);
  if (primaryCategory) return primaryCategory;
  const fallbackOrder: readonly NormalizedExploreCategory[] = [
    'hotels', 'attractions', 'restaurants', 'coffee', 'shopping',
  ];
  return fallbackOrder.find((category) => types.some((type) =>
    GOOGLE_TYPES_BY_CATEGORY[category].includes(type)
      || (category === 'restaurants' && type.endsWith('_restaurant')))) ?? null;
}

export function parseGooglePlacesResponse(value: unknown, requestedCategory: ExploreCategory): ExplorePlaceResult[] {
  if (!isRecord(value)) throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned invalid data.', 502);
  if (value.places === undefined) return [];
  if (!Array.isArray(value.places) || value.places.length > 12) {
    throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned invalid data.', 502);
  }
  return value.places.map((raw) => {
    if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.trim().length < 10
      || !isRecord(raw.displayName) || typeof raw.displayName.text !== 'string' || !raw.displayName.text.trim()
      || !isRecord(raw.location) || typeof raw.location.latitude !== 'number' || typeof raw.location.longitude !== 'number'
      || !Number.isFinite(raw.location.latitude) || raw.location.latitude < -90 || raw.location.latitude > 90
      || !Number.isFinite(raw.location.longitude) || raw.location.longitude < -180 || raw.location.longitude > 180
      || !Array.isArray(raw.types) || raw.types.some((type) => typeof type !== 'string')) {
      throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned invalid data.', 502);
    }
    if (raw.primaryType !== undefined && typeof raw.primaryType !== 'string') {
      throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned invalid data.', 502);
    }
    const category = categoryFromProvider(raw.primaryType as string | undefined, raw.types as string[], requestedCategory);
    if (!category) throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned unsupported data.', 502);
    if (raw.formattedAddress !== undefined && typeof raw.formattedAddress !== 'string'
      || raw.rating !== undefined && (typeof raw.rating !== 'number' || !Number.isFinite(raw.rating) || raw.rating < 0 || raw.rating > 5)
      || raw.userRatingCount !== undefined && (!Number.isInteger(raw.userRatingCount) || (raw.userRatingCount as number) < 0)) {
      throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned invalid data.', 502);
    }
    return {
      googlePlaceId: raw.id.trim(),
      name: raw.displayName.text.trim(),
      latitude: raw.location.latitude,
      longitude: raw.location.longitude,
      category,
      categoryLabel: labels[category],
      ...(raw.formattedAddress ? { formattedAddress: raw.formattedAddress } : {}),
      ...(raw.rating === undefined ? {} : { rating: raw.rating as number }),
      ...(raw.userRatingCount === undefined ? {} : { userRatingCount: raw.userRatingCount as number }),
    };
  });
}

export async function discoverGooglePlaces(
  request: { center: { latitude: number; longitude: number }; radiusMeters: number; category: ExploreCategory; limit?: number },
  fetcher: typeof fetch = fetch,
  config: Partial<GooglePlacesDiscoveryConfig> = {},
): Promise<ExplorePlaceResult[]> {
  const apiKey = config.apiKey ?? Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) throw new ExplorePlacesError('EXPLORE_PROVIDER_UNAVAILABLE', 'Place discovery is unavailable.', 503);
  const controller = new AbortController();
  let timedOut = false;
  const cancelProvider = () => controller.abort();
  if (config.signal?.aborted) controller.abort();
  else config.signal?.addEventListener('abort', cancelProvider, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, config.timeoutMilliseconds ?? timeoutMilliseconds());
  try {
    const response = await fetcher(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK },
      body: JSON.stringify({
        includedTypes: GOOGLE_TYPES_BY_CATEGORY[request.category],
        maxResultCount: request.limit ?? 12,
        rankPreference: 'POPULARITY',
        locationRestriction: { circle: { center: request.center, radius: request.radiusMeters } },
      }),
    });
    if (response.status === 401 || response.status === 403) {
      throw new ExplorePlacesError('EXPLORE_PROVIDER_AUTH', 'Place discovery is unavailable.', 502);
    }
    if (response.status === 429) {
      throw new ExplorePlacesError('EXPLORE_PROVIDER_RATE_LIMITED', 'Place discovery is busy.', 429);
    }
    if (!response.ok) {
      throw new ExplorePlacesError('EXPLORE_PROVIDER_UNAVAILABLE', 'Place discovery is unavailable.', 503);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new ExplorePlacesError('EXPLORE_PROVIDER_INVALID_RESPONSE', 'Place discovery returned invalid data.', 502);
    }
    return parseGooglePlacesResponse(payload, request.category);
  } catch (error) {
    if (error instanceof ExplorePlacesError) throw error;
    const isAbort = controller.signal.aborted
      || (error instanceof DOMException && error.name === 'AbortError')
      || (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError');
    if (isAbort) {
      throw new ExplorePlacesError(
        'EXPLORE_PROVIDER_UNAVAILABLE',
        timedOut ? 'Place discovery timed out.' : 'Place discovery was cancelled.',
        timedOut ? 504 : 503,
      );
    }
    throw new ExplorePlacesError('EXPLORE_PROVIDER_UNAVAILABLE', 'Place discovery is unavailable.', 503);
  } finally {
    clearTimeout(timeout);
    config.signal?.removeEventListener('abort', cancelProvider);
  }
}
