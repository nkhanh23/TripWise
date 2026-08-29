import { SearchDestinationsError } from './errors.ts';
import type { DestinationResult, SearchDestinationsRequest } from './types.ts';

export const maximumBodyBytes = 16_384;
const responseHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export type SearchDestinationsDependencies = {
  authenticate: (request: Request) => Promise<boolean>;
  search: (query: string, signal?: AbortSignal) => Promise<DestinationResult[]>;
};

function errorResponse(error: SearchDestinationsError): Response {
  return new Response(JSON.stringify({ error: { code: error.code, message: error.message } }), {
    status: error.status,
    headers: responseHeaders,
  });
}

function isValidDestinationResult(value: unknown): value is DestinationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return typeof result.googlePlaceId === 'string' && result.googlePlaceId.trim().length > 0
    && typeof result.name === 'string' && result.name.trim().length > 0
    && typeof result.formattedAddress === 'string'
    && (result.destinationType === 'CITY' || result.destinationType === 'COUNTRY')
    && (result.latitude === undefined || (typeof result.latitude === 'number' && Number.isFinite(result.latitude) && result.latitude >= -90 && result.latitude <= 90))
    && (result.longitude === undefined || (typeof result.longitude === 'number' && Number.isFinite(result.longitude) && result.longitude >= -180 && result.longitude <= 180));
}

export async function handleSearchDestinations(request: Request, dependencies: SearchDestinationsDependencies): Promise<Response> {
  if (request.method !== 'POST') return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Only POST requests are supported.', 405));

  const authenticated = await dependencies.authenticate(request).catch(() => false);
  if (!authenticated) return errorResponse(new SearchDestinationsError('UNAUTHORIZED', 'Authentication is required.', 401));

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Request body is too large.', 413));
  }

  const rawBody = await request.text().catch(() => null);
  if (rawBody === null) return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Request body could not be read.', 400));
  if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) {
    return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Request body is too large.', 413));
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Request body must be valid JSON.', 400));
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Request body must be an object.', 400));
  }
  if (Object.keys(payload).length !== 1 || !Object.prototype.hasOwnProperty.call(payload, 'query')) {
    return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Request body must contain only query.', 400));
  }
  const query = (payload as SearchDestinationsRequest).query;
  if (typeof query !== 'string' || query.trim().length < 2 || query.trim().length > 100) {
    return errorResponse(new SearchDestinationsError('INVALID_REQUEST', 'Query must contain between 2 and 100 characters.', 400));
  }

  try {
    const results = await dependencies.search(query.trim(), request.signal);
    const validResults = Array.isArray(results) ? results.filter(isValidDestinationResult).slice(0, 6) : [];
    return new Response(JSON.stringify({ data: validResults }), { status: 200, headers: responseHeaders });
  } catch (error) {
    if (error instanceof SearchDestinationsError) return errorResponse(error);
    return errorResponse(new SearchDestinationsError('INTERNAL_ERROR', 'Destination search failed.', 500));
  }
}