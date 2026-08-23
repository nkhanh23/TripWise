import { PlaceMetadataError } from './errors.ts';

export type PlaceMetadataRequest = {
  googlePlaceId: string;
};

export type PlaceMetadataResult = {
  googlePlaceId: string;
  rating?: number;
  userRatingCount?: number;
};

export type PlaceMetadataResponseEnvelope = {
  data: PlaceMetadataResult;
};

export interface PlaceMetadataDependencies {
  authenticate: (request: Request) => Promise<string | null>;
  verifyOwnership: (ownerId: string, googlePlaceId: string) => Promise<boolean>;
  fetchMetadata: (googlePlaceId: string) => Promise<{ rating?: number; userRatingCount?: number }>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function handleGetPlaceMetadata(
  request: Request,
  deps: PlaceMetadataDependencies
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (request.method !== 'POST') {
      throw new PlaceMetadataError('INVALID_REQUEST', 'Method not allowed', 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new PlaceMetadataError('PLACE_INPUT_INVALID', 'Invalid JSON body', 400);
    }

    if (
      !body ||
      typeof body !== 'object' ||
      typeof (body as any).googlePlaceId !== 'string' ||
      !(body as any).googlePlaceId.trim()
    ) {
      throw new PlaceMetadataError('PLACE_INPUT_INVALID', 'Missing or invalid googlePlaceId', 400);
    }

    const googlePlaceId = (body as any).googlePlaceId.trim();

    const ownerId = await deps.authenticate(request);
    if (!ownerId) {
      throw new PlaceMetadataError('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const isOwned = await deps.verifyOwnership(ownerId, googlePlaceId);
    if (!isOwned) {
      throw new PlaceMetadataError('FORBIDDEN', 'Cannot access metadata for this place', 403);
    }

    const metadata = await deps.fetchMetadata(googlePlaceId);

    const responseEnvelope: PlaceMetadataResponseEnvelope = {
      data: {
        googlePlaceId,
        rating: metadata.rating,
        userRatingCount: metadata.userRatingCount,
      },
    };

    return new Response(JSON.stringify(responseEnvelope), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
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
      console.error('Unhandled get-place-metadata error:', error);
    }

    return new Response(JSON.stringify({ error: { code, message } }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
