import { PlaceMetadataError } from './errors.ts';
import { readBoundedJson } from './boundedJson.ts';
import {
  PLACE_BUSINESS_STATUSES,
  type PlaceBusinessStatus,
  type PlaceMetadataResult,
  type PlaceOpeningHours,
  type PlaceOpeningPeriod,
  type PlaceTimePoint,
} from './types.ts';

const defaultTimeoutMilliseconds = 10_000;
export const GOOGLE_PLACE_METADATA_FIELD_MASK = 'id,rating,userRatingCount,businessStatus,regularOpeningHours,utcOffsetMinutes';

export type GooglePlacesMetadataConfig = {
  apiKey: string | undefined;
  timeoutMilliseconds: number;
  signal?: AbortSignal;
};

function timeoutMilliseconds(): number {
  const configured = Number(Deno.env.get('GOOGLE_PLACES_TIMEOUT_MS'));
  return Number.isFinite(configured) && configured >= 1_000 && configured <= 15_000
    ? configured
    : defaultTimeoutMilliseconds;
}



function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseTimePoint(value: unknown): PlaceTimePoint {
  if (!isRecord(value)) {
    throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid time point', 502);
  }
  const day = value.day;
  const hour = value.hour;
  const minute = value.minute;

  if (
    typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6 ||
    typeof hour !== 'number' || !Number.isInteger(hour) || hour < 0 || hour > 23 ||
    typeof minute !== 'number' || !Number.isInteger(minute) || minute < 0 || minute > 59
  ) {
    throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid time point values', 502);
  }

  return { day, hour, minute };
}

function parseOpeningPeriod(value: unknown): PlaceOpeningPeriod {
  if (!isRecord(value)) {
    throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid opening period', 502);
  }
  const open = parseTimePoint(value.open);
  const close = value.close !== undefined ? parseTimePoint(value.close) : undefined;
  return { open, ...(close ? { close } : {}) };
}

export function parseOpeningHours(rawHours: unknown): PlaceOpeningHours | null {
  if (rawHours === undefined || rawHours === null) return null;
  if (!isRecord(rawHours)) {
    throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid opening hours structure', 502);
  }

  let periods: PlaceOpeningPeriod[] = [];
  if (rawHours.periods !== undefined) {
    if (!Array.isArray(rawHours.periods) || rawHours.periods.length > 28) {
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid periods list', 502);
    }
    periods = rawHours.periods.map(parseOpeningPeriod);
  }

  const weekdayDescriptions: string[] = [];
  if (rawHours.weekdayDescriptions !== undefined) {
    if (!Array.isArray(rawHours.weekdayDescriptions) || rawHours.weekdayDescriptions.length > 7) {
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid weekday descriptions list', 502);
    }
    for (const desc of rawHours.weekdayDescriptions) {
      if (typeof desc !== 'string' || desc.length > 200) {
        throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid weekday description text', 502);
      }
      weekdayDescriptions.push(desc.trim());
    }
  }

  let openNow: boolean | undefined;
  if (rawHours.openNow !== undefined) {
    if (typeof rawHours.openNow !== 'boolean') {
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid openNow value', 502);
    }
    openNow = rawHours.openNow;
  }

  return {
    periods,
    weekdayDescriptions,
    ...(openNow !== undefined ? { openNow } : {}),
  };
}

export function parseBusinessStatus(rawStatus: unknown): PlaceBusinessStatus {
  if (rawStatus === undefined || rawStatus === null) {
    return 'UNKNOWN';
  }
  if (typeof rawStatus === 'string' && (PLACE_BUSINESS_STATUSES as readonly string[]).includes(rawStatus)) {
    return rawStatus as PlaceBusinessStatus;
  }
  throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Unsupported business status from provider', 502);
}

export function parseGooglePlaceDetailsResponse(data: unknown, googlePlaceId: string): PlaceMetadataResult {
  if (!isRecord(data)) {
    throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid response body from provider', 502);
  }

  if (
    typeof data.id !== 'string' ||
    !/^[A-Za-z0-9_-]{10,200}$/.test(data.id.trim()) ||
    data.id.trim() !== googlePlaceId
  ) {
    throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Provider place ID missing, invalid, or mismatched', 502);
  }

  let rating: number | undefined;
  if (data.rating !== undefined) {
    if (typeof data.rating !== 'number' || !Number.isFinite(data.rating) || data.rating < 0 || data.rating > 5) {
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid rating value', 502);
    }
    rating = data.rating;
  }

  let userRatingCount: number | undefined;
  if (data.userRatingCount !== undefined) {
    if (typeof data.userRatingCount !== 'number' || !Number.isSafeInteger(data.userRatingCount) || data.userRatingCount < 0) {
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid user rating count', 502);
    }
    userRatingCount = data.userRatingCount;
  }

  let utcOffsetMinutes: number | undefined;
  if (data.utcOffsetMinutes !== undefined) {
    if (typeof data.utcOffsetMinutes !== 'number' || !Number.isInteger(data.utcOffsetMinutes) || data.utcOffsetMinutes < -840 || data.utcOffsetMinutes > 840) {
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Invalid UTC offset minutes', 502);
    }
    utcOffsetMinutes = data.utcOffsetMinutes;
  }

  const businessStatus = parseBusinessStatus(data.businessStatus);
  const openingHours = parseOpeningHours(data.regularOpeningHours);

  return {
    googlePlaceId,
    ...(rating !== undefined ? { rating } : {}),
    ...(userRatingCount !== undefined ? { userRatingCount } : {}),
    businessStatus,
    openingHours,
    ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),
    provenance: {
      provider: 'google-places',
      boundary: 'get-place-metadata',
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function fetchPlaceMetadataFromGoogle(
  googlePlaceId: string,
  fetcher: typeof fetch = fetch,
  config?: Partial<GooglePlacesMetadataConfig>,
): Promise<PlaceMetadataResult> {
  const googlePlacesApiKey = config?.apiKey ?? Deno.env.get('GOOGLE_PLACES_API_KEY');
  const timeoutMs = config?.timeoutMilliseconds ?? timeoutMilliseconds();

  if (!googlePlacesApiKey) {
    throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider configuration is missing.', 503);
  }

  const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(googlePlaceId)}`;
  const headers = new Headers({
    'X-Goog-Api-Key': googlePlacesApiKey,
    'X-Goog-FieldMask': GOOGLE_PLACE_METADATA_FIELD_MASK,
    'Content-Type': 'application/json',
  });

  const controller = new AbortController();
  let timedOut = false;

  const cancelProvider = () => controller.abort();
  if (config?.signal?.aborted) controller.abort();
  else config?.signal?.addEventListener('abort', cancelProvider, { once: true });

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');

    const response = await fetcher(endpoint, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new PlaceMetadataError('PLACE_NOT_FOUND', 'Google Place not found.', 404);
    }

    if (response.status === 401 || response.status === 403) {
      throw new PlaceMetadataError('PLACE_PROVIDER_AUTH', 'Provider authentication failed.', 502);
    }

    if (response.status === 429) {
      throw new PlaceMetadataError('PLACE_PROVIDER_RATE_LIMITED', 'Provider rate limit exceeded.', 429);
    }

    if (!response.ok) {
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Provider unavailable.', 502);
    }

    let payload: unknown;
    try {
      payload = await readBoundedJson(response, 32_768);
    } catch (error) {
      if (controller.signal.aborted) throw error;
      throw new PlaceMetadataError('PLACE_PROVIDER_INVALID_RESPONSE', 'Place metadata response was malformed or exceeded size bounds.', 502);
    }

    if (controller.signal.aborted) throw new DOMException('Cancelled', 'AbortError');

    return parseGooglePlaceDetailsResponse(payload, googlePlaceId);
  } catch (error: unknown) {
    if (error instanceof PlaceMetadataError) {
      throw error;
    }
    const isAbort = controller.signal.aborted ||
      (error instanceof DOMException && error.name === 'AbortError') ||
      (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError');
    if (isAbort) {
      throw new PlaceMetadataError(
        'PLACE_PROVIDER_UNAVAILABLE',
        timedOut ? 'Provider request timed out.' : 'Provider request was cancelled.',
        timedOut ? 504 : 503,
      );
    }
    throw new PlaceMetadataError('INTERNAL_ERROR', 'An unexpected error occurred while fetching metadata.', 500);
  } finally {
    clearTimeout(timeoutId);
    config?.signal?.removeEventListener('abort', cancelProvider);
  }
}
