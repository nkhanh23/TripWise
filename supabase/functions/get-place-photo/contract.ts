import { PlacePhotoError } from './errors.ts';
import type { GetPlacePhotoRequest } from './types.ts';

const placeIdRegex = /^[A-Za-z0-9_-]{10,200}$/;

export function validateGetPlacePhotoRequest(value: unknown): GetPlacePhotoRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PlacePhotoError('PHOTO_INPUT_INVALID', 'Request body must be a JSON object.', 400);
  }

  const record = value as Record<string, unknown>;
  const googlePlaceId = typeof record.googlePlaceId === 'string' ? record.googlePlaceId.trim() : '';

  if (!googlePlaceId || !placeIdRegex.test(googlePlaceId)) {
    throw new PlacePhotoError(
      'PHOTO_INPUT_INVALID',
      'googlePlaceId must be a valid Google Place ID format (10-200 alphanumeric characters).',
      400
    );
  }

  let maxWidth: number | undefined = undefined;
  if (record.maxWidth !== undefined && record.maxWidth !== null) {
    if (typeof record.maxWidth !== 'number' || !Number.isFinite(record.maxWidth) || record.maxWidth < 100 || record.maxWidth > 4800) {
      throw new PlacePhotoError(
        'PHOTO_INPUT_INVALID',
        'maxWidth must be a number between 100 and 4800 pixels.',
        400
      );
    }
    maxWidth = Math.floor(record.maxWidth);
  }

  return {
    googlePlaceId,
    maxWidth: maxWidth ?? 1200,
  };
}
