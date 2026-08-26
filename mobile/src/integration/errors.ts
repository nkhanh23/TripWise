import type { ExplorePlacesErrorCode, GenerateTripErrorCode, PersistenceErrorCode, ResolvePlaceErrorCode } from './contracts';
import { ContractValidationError, isRecord } from './validation';

export type IntegrationErrorCode =
  | 'invalidCredentials'
  | 'userAlreadyRegistered'
  | 'invalidEmail'
  | 'weakPassword'
  | 'emailNotConfirmed'
  | 'sessionExpired'
  | 'unauthorized'
  | 'forbidden'
  | 'invalidRequest'
  | 'timeout'
  | 'cancelled'
  | 'network'
  | 'rateLimited'
  | 'providerUnavailable'
  | 'invalidResponse'
  | 'conflict'
  | 'notFound'
  | 'ambiguousPlace'
  | 'noRoute'
  | 'persistenceFailed'
  | 'unknown';

const safeMessages: Record<IntegrationErrorCode, string> = {
  invalidCredentials: 'The email or password is incorrect.',
  userAlreadyRegistered: 'The email is already registered.',
  invalidEmail: 'The email address is invalid.',
  weakPassword: 'The password does not meet the security requirements.',
  emailNotConfirmed: 'The email address has not been confirmed.',
  sessionExpired: 'The session has expired.',
  unauthorized: 'Authentication is required.',
  forbidden: 'This operation is not permitted.',
  invalidRequest: 'The request is invalid.',
  timeout: 'The request timed out.',
  cancelled: 'The request was cancelled.',
  network: 'The network request failed.',
  rateLimited: 'The service rate limit was reached.',
  providerUnavailable: 'The provider is temporarily unavailable.',
  invalidResponse: 'The service returned an invalid response.',
  conflict: 'The request conflicts with an existing operation.',
  notFound: 'The requested resource was not found.',
  ambiguousPlace: 'The place could not be resolved unambiguously.',
  noRoute: 'No route is available for these coordinates.',
  persistenceFailed: 'The data could not be persisted.',
  unknown: 'The operation failed.',
};

export class IntegrationError extends Error {
  constructor(
    readonly code: IntegrationErrorCode,
    readonly retryable: boolean = false,
  ) {
    super(safeMessages[code]);
    this.name = 'IntegrationError';
  }
}

const generateCodes: readonly GenerateTripErrorCode[] = [
  'INVALID_REQUEST', 'UNAUTHORIZED', 'AI_TIMEOUT', 'AI_UNAVAILABLE', 'AI_INVALID_RESPONSE', 'INTERNAL_ERROR',
];

const persistenceCodes: readonly PersistenceErrorCode[] = ['TW001', 'TW002', 'TW003', 'TW004', 'TW005'];

const resolvePlaceCodes: readonly ResolvePlaceErrorCode[] = [
  'PLACE_INPUT_INVALID', 'PLACE_NOT_FOUND', 'PLACE_AMBIGUOUS', 'PLACE_PROVIDER_AUTH',
  'PLACE_PROVIDER_RATE_LIMITED', 'PLACE_PROVIDER_UNAVAILABLE', 'PLACE_PERSISTENCE_FAILED',
  'UNAUTHORIZED', 'INTERNAL_ERROR',
];

const explorePlacesCodes: readonly ExplorePlacesErrorCode[] = [
  'EXPLORE_INPUT_INVALID', 'EXPLORE_PROVIDER_AUTH', 'EXPLORE_PROVIDER_RATE_LIMITED',
  'EXPLORE_PROVIDER_UNAVAILABLE', 'EXPLORE_PROVIDER_INVALID_RESPONSE', 'UNAUTHORIZED', 'INTERNAL_ERROR',
];

function safeEnvelopeCode(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error) || typeof value.error.code !== 'string') return null;
  return value.error.code;
}

export function mapGenerateTripError(value: unknown): IntegrationError {
  const code = safeEnvelopeCode(value);
  if (!generateCodes.includes(code as GenerateTripErrorCode)) return new IntegrationError('unknown');
  switch (code as GenerateTripErrorCode) {
    case 'INVALID_REQUEST': return new IntegrationError('invalidRequest');
    case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
    case 'AI_TIMEOUT': return new IntegrationError('timeout');
    case 'AI_UNAVAILABLE': return new IntegrationError('providerUnavailable');
    case 'AI_INVALID_RESPONSE': return new IntegrationError('invalidResponse');
    case 'INTERNAL_ERROR': return new IntegrationError('unknown');
  }
}

export function mapPersistenceError(value: unknown): IntegrationError {
  const rawCode = isRecord(value) && typeof value.code === 'string' ? value.code : null;
  if (!persistenceCodes.includes(rawCode as PersistenceErrorCode)) return mapPostgrestError(value);
  switch (rawCode as PersistenceErrorCode) {
    case 'TW001': return new IntegrationError('invalidRequest');
    case 'TW002': return new IntegrationError('unauthorized');
    case 'TW003': return new IntegrationError('forbidden');
    case 'TW004': return new IntegrationError('conflict');
    case 'TW005': return new IntegrationError('persistenceFailed');
  }
}

export function mapResolvePlaceError(value: unknown): IntegrationError {
  const code = safeEnvelopeCode(value);
  if (!resolvePlaceCodes.includes(code as ResolvePlaceErrorCode)) return new IntegrationError('unknown');
  switch (code as ResolvePlaceErrorCode) {
    case 'PLACE_INPUT_INVALID': return new IntegrationError('invalidRequest');
    case 'PLACE_NOT_FOUND': return new IntegrationError('notFound');
    case 'PLACE_AMBIGUOUS': return new IntegrationError('ambiguousPlace');
    case 'PLACE_PROVIDER_AUTH': return new IntegrationError('forbidden');
    case 'PLACE_PROVIDER_RATE_LIMITED': return new IntegrationError('rateLimited');
    case 'PLACE_PROVIDER_UNAVAILABLE': return new IntegrationError('providerUnavailable');
    case 'PLACE_PERSISTENCE_FAILED': return new IntegrationError('persistenceFailed');
    case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
    case 'INTERNAL_ERROR': return new IntegrationError('unknown');
    default: return new IntegrationError('unknown');
  }
}

export function mapExplorePlacesError(value: unknown): IntegrationError {
  const code = safeEnvelopeCode(value);
  if (!explorePlacesCodes.includes(code as ExplorePlacesErrorCode)) return mapUnknownTransportError(value);
  switch (code as ExplorePlacesErrorCode) {
    case 'EXPLORE_INPUT_INVALID': return new IntegrationError('invalidRequest');
    case 'EXPLORE_PROVIDER_AUTH': return new IntegrationError('providerUnavailable');
    case 'EXPLORE_PROVIDER_RATE_LIMITED': return new IntegrationError('rateLimited');
    case 'EXPLORE_PROVIDER_UNAVAILABLE': return new IntegrationError('providerUnavailable', true);
    case 'EXPLORE_PROVIDER_INVALID_RESPONSE': return new IntegrationError('invalidResponse');
    case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
    case 'INTERNAL_ERROR': return new IntegrationError('unknown');
  }
}

export function mapPostgrestError(value: unknown): IntegrationError {
  const code = isRecord(value) && typeof value.code === 'string' ? value.code : null;
  switch (code) {
    case '28000': return new IntegrationError('unauthorized');
    case '42501': return new IntegrationError('forbidden');
    case '22023':
    case '22P02': return new IntegrationError('invalidRequest');
    case 'PGRST116': return new IntegrationError('notFound');
    default: return new IntegrationError('unknown');
  }
}

export function mapAuthError(value: unknown): IntegrationError {
  const status = isRecord(value) && typeof value.status === 'number' ? value.status : null;
  const code = isRecord(value) && typeof value.code === 'string' ? value.code : null;
  const name = isRecord(value) && typeof value.name === 'string' ? value.name : null;
  if (status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') return new IntegrationError('rateLimited');
  if (code === 'invalid_credentials') return new IntegrationError('invalidCredentials');
  if (code === 'email_not_confirmed') return new IntegrationError('emailNotConfirmed');
  if (code === 'user_already_exists' || code === 'email_exists') return new IntegrationError('userAlreadyRegistered');
  if (code === 'email_address_invalid') return new IntegrationError('invalidEmail');
  if (code === 'weak_password') return new IntegrationError('weakPassword');
  if (code === 'refresh_token_not_found' || code === 'refresh_token_already_used' || code === 'bad_jwt') return new IntegrationError('sessionExpired');
  if (name === 'AuthRetryableFetchError' || status === 0) return new IntegrationError('network', true);
  if (status === 401) return new IntegrationError('unauthorized');
  if (status === 422 || code === 'validation_failed') return new IntegrationError('invalidRequest');
  if (status === 409) return new IntegrationError('conflict');
  return new IntegrationError('unknown');
}

export function mapUnknownTransportError(value: unknown): IntegrationError {
  if (value instanceof IntegrationError) return value;
  if (value instanceof ContractValidationError) return new IntegrationError('invalidResponse');
  if (isRecord(value) && value.name === 'AbortError') return new IntegrationError('cancelled');
  if (value instanceof TypeError) return new IntegrationError('network', true);
  return new IntegrationError('unknown');
}

export async function readFunctionErrorPayload(value: unknown): Promise<unknown> {
  const context = isRecord(value) ? value.context : undefined;
  if (!isRecord(context) || typeof context.clone !== 'function') return null;
  try {
    const clone = (context.clone as () => unknown)();
    if (!isRecord(clone) || typeof clone.json !== 'function') return null;
    return await (clone.json as () => Promise<unknown>)();
  } catch {
    return null;
  }
}

export function mapPlacePhotoError(value: unknown): IntegrationError {
  const payload = isRecord(value) ? value.error : value;
  const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null;
  switch (code) {
    case 'PHOTO_INPUT_INVALID': return new IntegrationError('invalidRequest');
    case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
    case 'FORBIDDEN': return new IntegrationError('forbidden');
    case 'PHOTO_NOT_FOUND': return new IntegrationError('notFound');
    case 'PHOTO_PROVIDER_AUTH': return new IntegrationError('providerUnavailable');
    case 'PHOTO_PROVIDER_RATE_LIMITED': return new IntegrationError('rateLimited');
    case 'PHOTO_PROVIDER_UNAVAILABLE': return new IntegrationError('providerUnavailable', true);
    default: return mapUnknownTransportError(value);
  }
}

export function mapWikimediaImageError(value: unknown): IntegrationError {
  const payload = isRecord(value) ? value.error : value;
  const code = isRecord(payload) && typeof payload.code === 'string' ? payload.code : null;
  switch (code) {
    case 'IMAGE_INPUT_INVALID': return new IntegrationError('invalidRequest');
    case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
    case 'FORBIDDEN': return new IntegrationError('forbidden');
    case 'WIKIMEDIA_RATE_LIMITED': return new IntegrationError('rateLimited');
    case 'WIKIMEDIA_UNAVAILABLE': return new IntegrationError('providerUnavailable', true);
    default: return mapUnknownTransportError(value);
  }
}
