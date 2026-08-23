import { validateGetPlacePhotoRequest } from './contract.ts';
import { PlacePhotoError } from './errors.ts';
import type { GetPlacePhotoErrorResponse, GetPlacePhotoSuccessResponse, PlacePhotoResult } from './types.ts';

const maximumBodyBytes = 2_048;
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export type GetPlacePhotoDependencies = {
  authenticate: (request: Request) => Promise<string | null>;
  verifyOwnership: (ownerId: string, googlePlaceId: string) => Promise<boolean>;
  fetchPhoto: (googlePlaceId: string, maxWidth?: number) => Promise<PlacePhotoResult>;
};

function response(body: GetPlacePhotoSuccessResponse | GetPlacePhotoErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function failure(error: PlacePhotoError): Response {
  return response({ error: { code: error.code, message: error.message } }, error.status);
}

export async function handleGetPlacePhoto(
  request: Request,
  dependencies: GetPlacePhotoDependencies,
): Promise<Response> {
  if (request.method !== 'POST') {
    return failure(new PlacePhotoError('PHOTO_INPUT_INVALID', 'Only POST requests are supported.', 405));
  }

  const ownerId = await dependencies.authenticate(request).catch(() => null);
  if (!ownerId) {
    return failure(new PlacePhotoError('UNAUTHORIZED', 'Authentication is required.', 401));
  }

  const raw = await request.text().catch(() => '');
  if (new TextEncoder().encode(raw).byteLength > maximumBodyBytes) {
    return failure(new PlacePhotoError('PHOTO_INPUT_INVALID', 'Request body is too large.', 413));
  }

  try {
    const input = validateGetPlacePhotoRequest(JSON.parse(raw));

    // Security: Ensure the user actually owns a verified place with this googlePlaceId
    const isOwner = await dependencies.verifyOwnership(ownerId, input.googlePlaceId);
    if (!isOwner) {
      throw new PlacePhotoError('FORBIDDEN', 'User is not authorized to access photos for this place.', 403);
    }

    const photoResult = await dependencies.fetchPhoto(input.googlePlaceId, input.maxWidth);
    return response({ data: photoResult }, 200);
  } catch (error) {
    if (error instanceof PlacePhotoError) return failure(error);
    return failure(new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Failed to retrieve place photo.', 500));
  }
}
