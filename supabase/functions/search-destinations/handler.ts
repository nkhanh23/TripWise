import { SearchDestinationsError } from './errors.ts';
import type { SearchDestinationsRequest, DestinationResult } from './types.ts';

const maximumBodyBytes = 16_384;
const responseHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export type SearchDestinationsDependencies = {
  authenticate: (request: Request) => Promise<boolean>;
  search: (query: string, signal?: AbortSignal) => Promise<DestinationResult[]>;
};

function errorResponse(error: SearchDestinationsError): Response {
  return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), { status: error.status, headers: responseHeaders });
}

export async function handleSearchDestinations(request: Request, dependencies: SearchDestinationsDependencies): Promise<Response> {
  if (request.method !== 'POST') return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Only POST', 405));

  try {
    const authenticated = await dependencies.authenticate(request);
    if (!authenticated) return errorResponse(new SearchDestinationsError('UNAUTHORIZED', 'Auth required', 401));
  } catch {
    return errorResponse(new SearchDestinationsError('UNAUTHORIZED', 'Auth required', 401));
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > maximumBodyBytes) {
      return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Payload too large', 413));
    }
    
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).length > maximumBodyBytes) {
      return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Payload too large', 413));
    }
    
    const payload = JSON.parse(rawbody) as SearchDestinationsRequest;
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Invalid body', 400));
    }
    if (typeof payload.query !== 'string' || payload.query.trim().length < 2 || payload.query.trim().length > 100) {
      return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Invalid query', 400));
    }
    
    const results = await dependencies.search(payload.query.trim(), request.signal);
    const validResults = results.filter(r => 
        r && typeof r.googlePlaceId === 'string' &&
        typeof r.name === 'string' &&
        typeof r.latitude === 'number' && !isNaN(r.latitude) && r.latitude >= -90 && r.latitude <= 90 &&
        typeof r.longitude === 'number' && !isNaN(r.longitude) && r.longitude >= -180 && r.longitude <= 180i
    );
    return new Response(JSON.stringify({ data: validResults }), { status: 200, headers: responseHeaders });
  } catch (error) {
    if (error instanceof SearchDestinationsError) return errorResponse(error);
    return errorResponse(new SearchDestinationsError('INTERNAL_ERROR', 'Failed', 500));
  }
}
