import { WikimediaImageError } from './errors.ts';
import type { WikimediaImageRequest } from './types.ts';

const googlePlaceIdPattern = /^[A-Za-z0-9_-]{10,200}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function width(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 100 || value > 1600) {
    throw new WikimediaImageError('IMAGE_INPUT_INVALID', 'Image width is invalid.', 400);
  }
  return Math.floor(value);
}

export function validateWikimediaImageRequest(value: unknown): WikimediaImageRequest {
  if (!isRecord(value) || (value.kind !== 'PLACE' && value.kind !== 'DESTINATION')) {
    throw new WikimediaImageError('IMAGE_INPUT_INVALID', 'Image request is invalid.', 400);
  }
  const maxWidth = width(value.maxWidth);
  if (value.kind === 'PLACE') {
    if (Object.keys(value).some((key) => !['kind', 'googlePlaceId', 'maxWidth'].includes(key))
      || typeof value.googlePlaceId !== 'string'
      || !googlePlaceIdPattern.test(value.googlePlaceId)) {
      throw new WikimediaImageError('IMAGE_INPUT_INVALID', 'Place image request is invalid.', 400);
    }
    return { kind: 'PLACE', googlePlaceId: value.googlePlaceId, ...(maxWidth ? { maxWidth } : {}) };
  }
  if (Object.keys(value).some((key) => !['kind', 'destination', 'maxWidth'].includes(key))
    || typeof value.destination !== 'string') {
    throw new WikimediaImageError('IMAGE_INPUT_INVALID', 'Destination image request is invalid.', 400);
  }
  const destination = value.destination.trim();
  if (destination.length < 2 || destination.length > 120 || /[\u0000-\u001f]/u.test(destination)) {
    throw new WikimediaImageError('IMAGE_INPUT_INVALID', 'Destination image request is invalid.', 400);
  }
  return { kind: 'DESTINATION', destination, ...(maxWidth ? { maxWidth } : {}) };
}
