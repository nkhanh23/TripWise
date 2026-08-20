import { validateGenerateTripRequest } from './contract.ts';
import { GenerateTripError } from './errors.ts';
import type { GenerateTripErrorResponse, GenerateTripRequest, GenerateTripSuccessResponse, GeneratedTrip } from './types.ts';

const maximumBodyBytes = 16_384;
const responseHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };

export type GenerateTripDependencies = {
  authenticate: (request: Request) => Promise<boolean>;
  generate: (request: GenerateTripRequest) => Promise<GeneratedTrip>;
};

function jsonResponse(body: GenerateTripSuccessResponse | GenerateTripErrorResponse, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function errorResponse(error: GenerateTripError): Response {
  return jsonResponse({ error: { code: error.code, message: error.message } }, error.status);
}

export async function handleGenerateTrip(request: Request, dependencies: GenerateTripDependencies): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(new GenerateTripError('INVALID_REQUEST', 'Only POST requests are supported.', 405));
  }

  let authenticated = false;
  try {
    authenticated = await dependencies.authenticate(request);
  } catch {
    authenticated = false;
  }
  if (!authenticated) {
    return errorResponse(new GenerateTripError('UNAUTHORIZED', 'Authentication is required.', 401));
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBodyBytes) {
    return errorResponse(new GenerateTripError('INVALID_REQUEST', 'Request body is too large.', 413));
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(new GenerateTripError('INVALID_REQUEST', 'Request body could not be read.', 400));
  }
  if (new TextEncoder().encode(rawBody).byteLength > maximumBodyBytes) {
    return errorResponse(new GenerateTripError('INVALID_REQUEST', 'Request body is too large.', 413));
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse(new GenerateTripError('INVALID_REQUEST', 'Request body must be valid JSON.', 400));
  }

  const validation = validateGenerateTripRequest(payload);
  if (!validation.ok) {
    return errorResponse(new GenerateTripError('INVALID_REQUEST', validation.message, 400));
  }

  try {
    const generatedTrip = await dependencies.generate(validation.value);
    return jsonResponse({ data: generatedTrip }, 200);
  } catch (error) {
    if (error instanceof GenerateTripError) {
      return errorResponse(error);
    }
    return errorResponse(new GenerateTripError('INTERNAL_ERROR', 'Trip generation failed.', 500));
  }
}
