import { PlaceMetadataError } from './errors.ts';

const defaultTimeoutMilliseconds = 10_000;

type GooglePlacesMetadataConfig = {
  apiKey: string | undefined;
  timeoutMilliseconds: number;
};

function providerCategory(status: number): string {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'provider_5xx';
  return 'provider_4xx';
}

export async function fetchPlaceMetadataFromGoogle(
  googlePlaceId: string,
  fetcher: typeof fetch = fetch,
  config?: Partial<GooglePlacesMetadataConfig>,
): Promise<{ rating?: number; userRatingCount?: number }> {
  const googlePlacesApiKey = config?.apiKey ?? Deno.env.get('GOOGLE_PLACES_API_KEY');
  const timeoutMilliseconds = config?.timeoutMilliseconds ?? defaultTimeoutMilliseconds;

  if (!googlePlacesApiKey) {
    throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider configuration is missing.', 503);
  }

  const endpoint = `https://places.googleapis.com/v1/places/${googlePlaceId}`;
  
  const headers = new Headers({
    'X-Goog-Api-Key': googlePlacesApiKey,
    'X-Goog-FieldMask': 'rating,userRatingCount',
    'Content-Type': 'application/json',
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMilliseconds);

  try {
    const response = await fetcher(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    
    if (response.status === 404) {
      throw new PlaceMetadataError('PLACE_NOT_FOUND', 'Google Place not found.', 404);
    }
    
    if (response.status === 401 || response.status === 403) {
      console.error('[get-place-metadata] Google Places request failed', {
        status: response.status,
        category: providerCategory(response.status),
      });
      throw new PlaceMetadataError('PLACE_PROVIDER_AUTH', 'Provider authentication failed.', 502);
    }
    
    if (response.status === 429) {
      throw new PlaceMetadataError('PLACE_PROVIDER_RATE_LIMITED', 'Provider rate limit exceeded.', 429);
    }

    if (!response.ok) {
      console.error('[get-place-metadata] Google Places request failed', {
        status: response.status,
        category: providerCategory(response.status),
      });
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable.', 502);
    }

    const data = await response.json();
    return {
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      userRatingCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : undefined,
    };
  } catch (error: unknown) {
    if (error instanceof PlaceMetadataError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider request timed out.', 504);
    }
    throw new PlaceMetadataError('INTERNAL_ERROR', 'An unexpected error occurred while fetching metadata.', 500);
  } finally {
    clearTimeout(timeoutId);
  }
}
