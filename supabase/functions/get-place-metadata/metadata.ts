import { PlaceMetadataError } from './errors.ts';

const googlePlacesApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

export async function fetchPlaceMetadataFromGoogle(
  googlePlaceId: string
): Promise<{ rating?: number; userRatingCount?: number }> {
  if (!googlePlacesApiKey) {
    throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider configuration is missing.', 503);
  }

  const endpoint = `https://places.googleapis.com/v1/places/${googlePlaceId}`;
  
  const headers = new Headers({
    'X-Goog-Api-Key': googlePlacesApiKey,
    'X-Goog-FieldMask': 'rating,userRatingCount',
    'Content-Type': 'application/json',
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (response.status === 404) {
      throw new PlaceMetadataError('PLACE_NOT_FOUND', 'Google Place not found.', 404);
    }
    
    if (response.status === 401 || response.status === 403) {
      console.error('Google Places API Auth Error:', response.status);
      throw new PlaceMetadataError('PLACE_PROVIDER_AUTH', 'Provider authentication failed.', 502);
    }
    
    if (response.status === 429) {
      throw new PlaceMetadataError('PLACE_PROVIDER_RATE_LIMITED', 'Provider rate limit exceeded.', 429);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('Google Places API Fetch Error:', response.status, errText);
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable.', 502);
    }

    const data = await response.json();
    return {
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      userRatingCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : undefined,
    };
  } catch (error: any) {
    if (error instanceof PlaceMetadataError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider request timed out.', 504);
    }
    throw new PlaceMetadataError('INTERNAL_ERROR', 'An unexpected error occurred while fetching metadata.', 500);
  }
}
