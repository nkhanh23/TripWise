import { validateWikimediaImageRequest } from './contract.ts';
import { WikimediaImageError } from './errors.ts';
import type {
  TrustedPlaceContext,
  WikimediaImageErrorResponse,
  WikimediaImageResult,
  WikimediaImageSuccessResponse,
} from './types.ts';

const maximumBodyBytes = 2_048;
const headers = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'private, max-age=300',
};

export type WikimediaImageDependencies = {
  authenticate: (request: Request) => Promise<string | null>;
  loadOwnedPlace: (ownerId: string, googlePlaceId: string) => Promise<TrustedPlaceContext | null>;
  fetchPlaceImage: (context: TrustedPlaceContext, maxWidth?: number) => Promise<WikimediaImageResult>;
  fetchDestinationCover: (destination: string, maxWidth?: number) => Promise<WikimediaImageResult>;
};

function response(body: WikimediaImageSuccessResponse | WikimediaImageErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function failure(error: WikimediaImageError): Response {
  return response({ error: { code: error.code, message: error.message } }, error.status);
}

export async function handleGetWikimediaImage(
  request: Request,
  dependencies: WikimediaImageDependencies,
): Promise<Response> {
  if (request.method !== 'POST') {
    return failure(new WikimediaImageError('IMAGE_INPUT_INVALID', 'Only POST requests are supported.', 405));
  }
  const ownerId = await dependencies.authenticate(request).catch(() => null);
  if (!ownerId) {
    return failure(new WikimediaImageError('UNAUTHORIZED', 'Authentication is required.', 401));
  }
  const raw = await request.text().catch(() => '');
  if (new TextEncoder().encode(raw).byteLength > maximumBodyBytes) {
    return failure(new WikimediaImageError('IMAGE_INPUT_INVALID', 'Request body is too large.', 413));
  }
  try {
    const input = validateWikimediaImageRequest(JSON.parse(raw));
    if (input.kind === 'PLACE') {
      const context = await dependencies.loadOwnedPlace(ownerId, input.googlePlaceId);
      if (!context) {
        throw new WikimediaImageError('FORBIDDEN', 'The verified place is not owned by this user.', 403);
      }
      return response({ data: await dependencies.fetchPlaceImage(context, input.maxWidth) }, 200);
    }
    return response({ data: await dependencies.fetchDestinationCover(input.destination, input.maxWidth) }, 200);
  } catch (error) {
    if (error instanceof WikimediaImageError) return failure(error);
    return failure(new WikimediaImageError('WIKIMEDIA_UNAVAILABLE', 'Image enrichment is unavailable.', 503));
  }
}
