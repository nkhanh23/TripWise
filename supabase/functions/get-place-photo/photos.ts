import { PlacePhotoError } from './errors.ts';
import type { PlacePhotoResult } from './types.ts';

const defaultTimeoutMilliseconds = 8_000;
const maximumAttempts = 2;

type GooglePhotoMetadata = {
  name?: unknown;
  widthPx?: unknown;
  heightPx?: unknown;
  authorAttributions?: Array<{
    displayName?: unknown;
    uri?: unknown;
    photoUri?: unknown;
  }>;
};

type GooglePlaceDetailResponse = {
  photos?: unknown;
};

type GooglePhotoMediaResponse = {
  name?: unknown;
  photoUri?: unknown;
};

function timeoutMilliseconds(): number {
  const configured = Number(Deno.env.get('GOOGLE_PLACES_TIMEOUT_MS'));
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 15_000
    ? configured
    : defaultTimeoutMilliseconds;
}

function providerError(status: number): PlacePhotoError {
  if (status === 401 || status === 403) {
    return new PlacePhotoError('PHOTO_PROVIDER_AUTH', 'Place provider authentication is unavailable.', 503);
  }
  if (status === 429) {
    return new PlacePhotoError('PHOTO_PROVIDER_RATE_LIMITED', 'Place provider rate limit was reached.', 429);
  }
  return new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Place provider is temporarily unavailable.', 503);
}

export type GooglePlacesPhotoConfig = {
  apiKey: string | undefined;
  timeoutMilliseconds: number;
};

export async function fetchPlacePhotoFromGoogle(
  googlePlaceId: string,
  maxWidth: number = 1200,
  fetcher: typeof fetch = fetch,
  config?: Partial<GooglePlacesPhotoConfig>,
): Promise<PlacePhotoResult> {
  const apiKey = config?.apiKey ?? Deno.env.get('GOOGLE_PLACES_API_KEY');
  const timeoutMs = config?.timeoutMilliseconds ?? timeoutMilliseconds();

  if (!apiKey) {
    throw new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Place provider is not configured.', 503);
  }

  // 1. Fetch Place Details with photos fieldmask
  const placeUrl = `https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}`;
  let photoMetadata: GooglePhotoMetadata | null = null;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(placeUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
          'x-goog-fieldmask': 'photos',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { googlePlaceId, photoUri: null };
        }
        const mapped = providerError(response.status);
        if (attempt < maximumAttempts && response.status >= 500) continue;
        throw mapped;
      }

      const body = (await response.json()) as GooglePlaceDetailResponse;
      if (Array.isArray(body.photos) && body.photos.length > 0) {
        const first = body.photos[0];
        if (typeof first === 'object' && first !== null && typeof (first as GooglePhotoMetadata).name === 'string') {
          photoMetadata = first as GooglePhotoMetadata;
        }
      }
      break;
    } catch (error) {
      if (error instanceof PlacePhotoError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < maximumAttempts) continue;
        throw new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Place provider timed out.', 504);
      }
      if (attempt < maximumAttempts) continue;
      throw new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Place provider is temporarily unavailable.', 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!photoMetadata || typeof photoMetadata.name !== 'string') {
    return { googlePlaceId, photoUri: null };
  }

  // 2. Fetch Photo Media URI with skipHttpRedirect=true
  const photoResourceName = photoMetadata.name;
  const mediaUrl = `https://places.googleapis.com/v1/${photoResourceName}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(mediaUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
        },
      });

      if (!response.ok) {
        const mapped = providerError(response.status);
        if (attempt < maximumAttempts && response.status >= 500) continue;
        throw mapped;
      }

      const mediaBody = (await response.json()) as GooglePhotoMediaResponse;
      const photoUri = typeof mediaBody.photoUri === 'string' ? mediaBody.photoUri : null;

      let authorAttribution: PlacePhotoResult['authorAttribution'] = undefined;
      if (Array.isArray(photoMetadata.authorAttributions) && photoMetadata.authorAttributions.length > 0) {
        const firstAttr = photoMetadata.authorAttributions[0];
        authorAttribution = {
          displayName: typeof firstAttr.displayName === 'string' ? firstAttr.displayName : undefined,
          uri: typeof firstAttr.uri === 'string' ? firstAttr.uri : undefined,
          photoUri: typeof firstAttr.photoUri === 'string' ? firstAttr.photoUri : undefined,
        };
      }

      return {
        googlePlaceId,
        photoUri,
        authorAttribution,
      };
    } catch (error) {
      if (error instanceof PlacePhotoError) throw error;
      if (error instanceof DOMException && error.name === 'AbortError') {
        if (attempt < maximumAttempts) continue;
        throw new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Place provider timed out.', 504);
      }
      if (attempt < maximumAttempts) continue;
      throw new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Place provider is temporarily unavailable.', 503);
    } finally {
      clearTimeout(timeout);
    }
  }

  return { googlePlaceId, photoUri: null };
}
