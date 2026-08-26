import { ExplorePlacesError } from './errors.ts';
import { EXPLORE_CATEGORIES, type ExplorePlacesRequest } from './types.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

export function parseExplorePlacesRequest(value: unknown): ExplorePlacesRequest {
  if (!isRecord(value) || !hasOnlyKeys(value, ['center', 'radiusMeters', 'category', 'limit'])
    || !isRecord(value.center) || !hasOnlyKeys(value.center, ['latitude', 'longitude'])) {
    throw new ExplorePlacesError('EXPLORE_INPUT_INVALID', 'Invalid request.', 400);
  }
  const { latitude, longitude } = value.center;
  const radiusMeters = value.radiusMeters;
  const limit = value.limit;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || typeof radiusMeters !== 'number' || !Number.isFinite(radiusMeters) || radiusMeters < 100 || radiusMeters > 5_000
    || typeof value.category !== 'string' || !EXPLORE_CATEGORIES.includes(value.category as never)
    || (limit !== undefined && (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 12))) {
    throw new ExplorePlacesError('EXPLORE_INPUT_INVALID', 'Invalid request.', 400);
  }
  return {
    center: { latitude, longitude },
    radiusMeters,
    category: value.category as ExplorePlacesRequest['category'],
    ...(limit === undefined ? {} : { limit: limit as number }),
  };
}
