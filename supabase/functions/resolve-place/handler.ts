import { validateResolvePlaceRequest } from './contract.ts';
import { ResolvePlaceError } from './errors.ts';
import type { PlaceSnapshot, ResolvePlaceErrorResponse, ResolvePlaceSuccessResponse, StoredPlaceContext } from './types.ts';

const maximumBodyBytes = 2_048;
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export type ResolvePlaceDependencies = {
  authenticate: (request: Request) => Promise<string | null>;
  loadContext: (ownerId: string, itemId: string) => Promise<StoredPlaceContext | null>;
  resolve: (context: StoredPlaceContext) => Promise<PlaceSnapshot>;
  persist: (ownerId: string, itemId: string, snapshot: PlaceSnapshot) => Promise<string>;
};

function response(body: ResolvePlaceSuccessResponse | ResolvePlaceErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

function failure(error: ResolvePlaceError): Response {
  return response({ error: { code: error.code, message: error.message } }, error.status);
}

export async function handleResolvePlace(request: Request, dependencies: ResolvePlaceDependencies): Promise<Response> {
  if (request.method !== 'POST') return failure(new ResolvePlaceError('PLACE_INPUT_INVALID', 'Only POST requests are supported.', 405));
  const ownerId = await dependencies.authenticate(request).catch(() => null);
  if (!ownerId) return failure(new ResolvePlaceError('UNAUTHORIZED', 'Authentication is required.', 401));
  const raw = await request.text().catch(() => '');
  if (new TextEncoder().encode(raw).byteLength > maximumBodyBytes) return failure(new ResolvePlaceError('PLACE_INPUT_INVALID', 'Request body is too large.', 413));
  try {
    const input = validateResolvePlaceRequest(JSON.parse(raw));
    const context = await dependencies.loadContext(ownerId, input.itineraryItemId);
    if (!context) throw new ResolvePlaceError('PLACE_NOT_FOUND', 'Itinerary item was not found.', 404);
    const verified = await dependencies.resolve(context);
    const resolvedAt = await dependencies.persist(ownerId, input.itineraryItemId, verified);
    return response({
      data: {
        itineraryItemId: input.itineraryItemId,
        resolution: context.wasResolved ? 'VERIFIED_REFRESHED' : 'VERIFIED',
        resolvedAt,
      },
    }, 200);
  } catch (error) {
    if (error instanceof ResolvePlaceError) return failure(error);
    return failure(new ResolvePlaceError('PLACE_PERSISTENCE_FAILED', 'Verified place snapshot could not be saved.', 500));
  }
}
