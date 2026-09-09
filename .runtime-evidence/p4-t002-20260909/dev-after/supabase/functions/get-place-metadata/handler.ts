import { PlaceMetadataError } from './errors.ts';
import { readBoundedJson } from './boundedJson.ts';
import type { PlaceMetadataResponseEnvelope, PlaceMetadataResult } from './types.ts';

export interface PlaceMetadataDependencies {
  authenticate: (request: Request) => Promise<string | null>;
  verifyOwnership: (ownerId: string, googlePlaceId: string) => Promise<boolean>;
  fetchMetadata: (googlePlaceId: string, signal?: AbortSignal) => Promise<PlaceMetadataResult>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function handleGetPlaceMetadata(
  request: Request,
  deps: PlaceMetadataDependencies,
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw new PlaceMetadataError('INVALID_REQUEST', 'Method not allowed', 405);
    }

    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 2_048) {
      throw new PlaceMetadataError('PLACE_INPUT_INVALID', 'Invalid request body size.', 400);
    }

    let body: unknown;
    try {
      body = await readBoundedJson(request, 2_048);
    } catch {
      throw new PlaceMetadataError('PLACE_INPUT_INVALID', 'Invalid JSON body.', 400);
    }

    if (
      !isRecord(body) ||
      Object.keys(body).length !== 1 ||
      typeof body.googlePlaceId !== 'string' ||
      !/^[A-Za-z0-9_-]{10,200}$/.test(body.googlePlaceId.trim())
    ) {
      throw new PlaceMetadataError('PLACE_INPUT_INVALID', 'Missing, invalid, or extra fields in request body.', 400);
    }

    const googlePlaceId = body.googlePlaceId.trim();

    const ownerId = await deps.authenticate(request);
    if (!ownerId) {
      throw new PlaceMetadataError('UNAUTHORIZED', 'Missing or invalid authorization header.', 401);
    }

    if (request.signal.aborted) {
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Request was cancelled.', 503);
    }

    const isOwned = await deps.verifyOwnership(ownerId, googlePlaceId);
    if (!isOwned) {
      throw new PlaceMetadataError('FORBIDDEN', 'Cannot access metadata for this place.', 403);
    }

    if (request.signal.aborted) {
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Request was cancelled.', 503);
    }

    const metadata = await deps.fetchMetadata(googlePlaceId, request.signal);

    if (request.signal.aborted) {
      throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Request was cancelled.', 503);
    }

    const responseEnvelope: PlaceMetadataResponseEnvelope = {
      data: metadata,
    };

    return new Response(JSON.stringify(responseEnvelope), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    let status = 500;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred.';

    if (error instanceof PlaceMetadataError) {
      status = error.status;
      code = error.code;
      message = error.message;
    } else {
      console.error('Unhandled get-place-metadata error');
    }

    return new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
