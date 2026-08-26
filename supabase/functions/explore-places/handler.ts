import { parseExplorePlacesRequest } from './contract.ts';
import { ExplorePlacesError } from './errors.ts';
import type { ExplorePlaceResult, ExplorePlacesRequest } from './types.ts';

export type ExplorePlacesDependencies = {
  authenticate(request: Request): Promise<string | null>;
  discover(request: ExplorePlacesRequest): Promise<ExplorePlaceResult[]>;
};

const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };

export async function handleExplorePlaces(request: Request, deps: ExplorePlacesDependencies): Promise<Response> {
  try {
    if (request.method !== 'POST') throw new ExplorePlacesError('EXPLORE_INPUT_INVALID', 'Invalid request.', 405);
    if (!await deps.authenticate(request)) throw new ExplorePlacesError('UNAUTHORIZED', 'Authentication is required.', 401);
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 2_048) throw new ExplorePlacesError('EXPLORE_INPUT_INVALID', 'Invalid request.', 400);
    let body: unknown;
    try { body = await request.json(); } catch { throw new ExplorePlacesError('EXPLORE_INPUT_INVALID', 'Invalid request.', 400); }
    const parsed = parseExplorePlacesRequest(body);
    const places = await deps.discover(parsed);
    return new Response(JSON.stringify({ data: { places } }), { status: 200, headers });
  } catch (error) {
    const safe = error instanceof ExplorePlacesError
      ? error
      : new ExplorePlacesError('INTERNAL_ERROR', 'Place discovery failed.', 500);
    if (!(error instanceof ExplorePlacesError)) console.error('Unhandled explore-places error');
    return new Response(JSON.stringify({ error: { code: safe.code, message: safe.message } }), {
      status: safe.status,
      headers,
    });
  }
}
