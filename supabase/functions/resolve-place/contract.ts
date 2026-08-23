import { ResolvePlaceError } from './errors.ts';
import type { ResolvePlaceRequest } from './types.ts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateResolvePlaceRequest(value: unknown): ResolvePlaceRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)
    || Object.keys(value).length !== 1 || !('itineraryItemId' in value)
    || typeof value.itineraryItemId !== 'string' || !uuidPattern.test(value.itineraryItemId)) {
    throw new ResolvePlaceError('PLACE_INPUT_INVALID', 'itineraryItemId must be a UUID.', 400);
  }
  return { itineraryItemId: value.itineraryItemId };
}
