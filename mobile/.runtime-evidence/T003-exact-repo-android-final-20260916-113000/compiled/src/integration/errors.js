"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationError = void 0;
exports.mapGenerateTripError = mapGenerateTripError;
exports.mapPersistenceError = mapPersistenceError;
exports.mapResolvePlaceError = mapResolvePlaceError;
exports.mapWorkspaceMutationError = mapWorkspaceMutationError;
exports.mapTripRefreshApplyError = mapTripRefreshApplyError;
exports.mapExplorePlacesError = mapExplorePlacesError;
exports.mapPostgrestError = mapPostgrestError;
exports.mapAuthError = mapAuthError;
exports.mapUnknownTransportError = mapUnknownTransportError;
exports.readFunctionErrorPayload = readFunctionErrorPayload;
exports.mapPlacePhotoError = mapPlacePhotoError;
exports.mapWikimediaImageError = mapWikimediaImageError;
exports.mapPlaceMetadataError = mapPlaceMetadataError;
const validation_1 = require("./validation");
const safeMessages = {
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
class IntegrationError extends Error {
    code;
    retryable;
    constructor(code, retryable = false) {
        super(safeMessages[code]);
        this.code = code;
        this.retryable = retryable;
        this.name = 'IntegrationError';
    }
}
exports.IntegrationError = IntegrationError;
const generateCodes = [
    'INVALID_REQUEST', 'UNAUTHORIZED', 'AI_TIMEOUT', 'AI_UNAVAILABLE', 'AI_INVALID_RESPONSE', 'INTERNAL_ERROR',
];
const persistenceCodes = ['TW001', 'TW002', 'TW003', 'TW004', 'TW005'];
const workspaceMutationCodes = ['TW006', 'TW007', 'TW008', 'TW009', 'TW010', 'TW011', 'TW012', 'TW013', 'TW014'];
const tripRefreshApplyCodes = ['TW015', 'TW016', 'TW017', 'TW018', 'TW019', 'TW020', 'TW021'];
const resolvePlaceCodes = [
    'PLACE_INPUT_INVALID', 'PLACE_NOT_FOUND', 'PLACE_AMBIGUOUS', 'PLACE_PROVIDER_AUTH',
    'PLACE_PROVIDER_RATE_LIMITED', 'PLACE_PROVIDER_UNAVAILABLE', 'PLACE_PERSISTENCE_FAILED',
    'UNAUTHORIZED', 'INTERNAL_ERROR',
];
const explorePlacesCodes = [
    'EXPLORE_INPUT_INVALID', 'EXPLORE_PROVIDER_AUTH', 'EXPLORE_PROVIDER_RATE_LIMITED',
    'EXPLORE_PROVIDER_UNAVAILABLE', 'EXPLORE_PROVIDER_INVALID_RESPONSE', 'UNAUTHORIZED', 'INTERNAL_ERROR',
];
function safeEnvelopeCode(value) {
    if (!(0, validation_1.isRecord)(value) || !(0, validation_1.isRecord)(value.error) || typeof value.error.code !== 'string')
        return null;
    return value.error.code;
}
function mapGenerateTripError(value) {
    const code = safeEnvelopeCode(value);
    if (!generateCodes.includes(code))
        return new IntegrationError('unknown');
    switch (code) {
        case 'INVALID_REQUEST': return new IntegrationError('invalidRequest');
        case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
        case 'AI_TIMEOUT': return new IntegrationError('timeout');
        case 'AI_UNAVAILABLE': return new IntegrationError('providerUnavailable');
        case 'AI_INVALID_RESPONSE': return new IntegrationError('invalidResponse');
        case 'INTERNAL_ERROR': return new IntegrationError('unknown');
    }
}
function mapPersistenceError(value) {
    const rawCode = (0, validation_1.isRecord)(value) && typeof value.code === 'string' ? value.code : null;
    if (!persistenceCodes.includes(rawCode))
        return mapPostgrestError(value);
    switch (rawCode) {
        case 'TW001': return new IntegrationError('invalidRequest');
        case 'TW002': return new IntegrationError('unauthorized');
        case 'TW003': return new IntegrationError('forbidden');
        case 'TW004': return new IntegrationError('conflict');
        case 'TW005': return new IntegrationError('persistenceFailed');
    }
}
function mapResolvePlaceError(value) {
    const code = safeEnvelopeCode(value);
    if (!resolvePlaceCodes.includes(code))
        return new IntegrationError('unknown');
    switch (code) {
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
/** Maps only stable SQLSTATEs emitted by mutate_travel_workspace. */
function mapWorkspaceMutationError(value) {
    const rawCode = (0, validation_1.isRecord)(value) && typeof value.code === 'string' ? value.code : null;
    if (rawCode === 'TW024')
        return new IntegrationError('persistenceFailed');
    if (!workspaceMutationCodes.includes(rawCode))
        return mapPostgrestError(value);
    switch (rawCode) {
        case 'TW006': return new IntegrationError('unauthorized');
        case 'TW007': return new IntegrationError('invalidRequest');
        case 'TW008': return new IntegrationError('notFound');
        case 'TW009': return new IntegrationError('conflict');
        case 'TW010': return new IntegrationError('invalidRequest');
        case 'TW011': return new IntegrationError('invalidRequest');
        case 'TW012': return new IntegrationError('invalidRequest');
        case 'TW013': return new IntegrationError('invalidRequest');
        case 'TW014': return new IntegrationError('invalidRequest');
    }
}
/** Maps only stable SQLSTATEs emitted by apply_trip_refresh. */
function mapTripRefreshApplyError(value) {
    const rawCode = (0, validation_1.isRecord)(value) && typeof value.code === 'string' ? value.code : null;
    if (!tripRefreshApplyCodes.includes(rawCode)) {
        return mapPostgrestError(value);
    }
    switch (rawCode) {
        case 'TW015': return new IntegrationError('unauthorized');
        case 'TW016': return new IntegrationError('invalidRequest');
        case 'TW017': return new IntegrationError('notFound');
        case 'TW018': return new IntegrationError('conflict');
        case 'TW019': return new IntegrationError('conflict');
        case 'TW020': return new IntegrationError('invalidRequest');
        case 'TW021': return new IntegrationError('persistenceFailed');
        default: return new IntegrationError('unknown');
    }
}
function mapExplorePlacesError(value) {
    const code = safeEnvelopeCode(value);
    if (!explorePlacesCodes.includes(code))
        return mapUnknownTransportError(value);
    switch (code) {
        case 'EXPLORE_INPUT_INVALID': return new IntegrationError('invalidRequest');
        case 'EXPLORE_PROVIDER_AUTH': return new IntegrationError('providerUnavailable');
        case 'EXPLORE_PROVIDER_RATE_LIMITED': return new IntegrationError('rateLimited');
        case 'EXPLORE_PROVIDER_UNAVAILABLE': return new IntegrationError('providerUnavailable', true);
        case 'EXPLORE_PROVIDER_INVALID_RESPONSE': return new IntegrationError('invalidResponse');
        case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
        case 'INTERNAL_ERROR': return new IntegrationError('unknown');
    }
}
function mapPostgrestError(value) {
    const code = (0, validation_1.isRecord)(value) && typeof value.code === 'string' ? value.code : null;
    switch (code) {
        case '28000': return new IntegrationError('unauthorized');
        case '42501': return new IntegrationError('forbidden');
        case '22023':
        case '22P02': return new IntegrationError('invalidRequest');
        case 'PGRST116': return new IntegrationError('notFound');
        default: return new IntegrationError('unknown');
    }
}
function mapAuthError(value) {
    const status = (0, validation_1.isRecord)(value) && typeof value.status === 'number' ? value.status : null;
    const code = (0, validation_1.isRecord)(value) && typeof value.code === 'string' ? value.code : null;
    const name = (0, validation_1.isRecord)(value) && typeof value.name === 'string' ? value.name : null;
    if (status === 429 || code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit')
        return new IntegrationError('rateLimited');
    if (code === 'invalid_credentials')
        return new IntegrationError('invalidCredentials');
    if (code === 'email_not_confirmed')
        return new IntegrationError('emailNotConfirmed');
    if (code === 'user_already_exists' || code === 'email_exists')
        return new IntegrationError('userAlreadyRegistered');
    if (code === 'email_address_invalid')
        return new IntegrationError('invalidEmail');
    if (code === 'weak_password')
        return new IntegrationError('weakPassword');
    if (code === 'refresh_token_not_found' || code === 'refresh_token_already_used' || code === 'bad_jwt')
        return new IntegrationError('sessionExpired');
    if (name === 'AuthRetryableFetchError' || status === 0)
        return new IntegrationError('network', true);
    if (status === 401)
        return new IntegrationError('unauthorized');
    if (status === 422 || code === 'validation_failed')
        return new IntegrationError('invalidRequest');
    if (status === 409)
        return new IntegrationError('conflict');
    return new IntegrationError('unknown');
}
function mapUnknownTransportError(value) {
    if (value instanceof IntegrationError)
        return value;
    if (value instanceof validation_1.ContractValidationError)
        return new IntegrationError('invalidResponse');
    if ((0, validation_1.isRecord)(value)) {
        if (value.name === 'AbortError')
            return new IntegrationError('cancelled');
        if ((0, validation_1.isRecord)(value.context) && value.context.name === 'AbortError')
            return new IntegrationError('cancelled');
    }
    if (value instanceof TypeError)
        return new IntegrationError('network', true);
    return new IntegrationError('unknown');
}
async function readFunctionErrorPayload(value) {
    const context = (0, validation_1.isRecord)(value) ? value.context : undefined;
    if (!(0, validation_1.isRecord)(context))
        return null;
    const target = typeof context.clone === 'function' ? context.clone() : context;
    if (!(0, validation_1.isRecord)(target) || typeof target.json !== 'function')
        return null;
    try {
        return await target.json();
    }
    catch {
        return null;
    }
}
function mapPlacePhotoError(value) {
    const payload = (0, validation_1.isRecord)(value) ? value.error : value;
    const code = (0, validation_1.isRecord)(payload) && typeof payload.code === 'string' ? payload.code : null;
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
function mapWikimediaImageError(value) {
    const payload = (0, validation_1.isRecord)(value) ? value.error : value;
    const code = (0, validation_1.isRecord)(payload) && typeof payload.code === 'string' ? payload.code : null;
    switch (code) {
        case 'IMAGE_INPUT_INVALID': return new IntegrationError('invalidRequest');
        case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
        case 'FORBIDDEN': return new IntegrationError('forbidden');
        case 'WIKIMEDIA_RATE_LIMITED': return new IntegrationError('rateLimited');
        case 'WIKIMEDIA_UNAVAILABLE': return new IntegrationError('providerUnavailable', true);
        default: return mapUnknownTransportError(value);
    }
}
function mapPlaceMetadataError(value) {
    const payload = (0, validation_1.isRecord)(value) ? value.error : value;
    const code = (0, validation_1.isRecord)(payload) && typeof payload.code === 'string' ? payload.code : null;
    switch (code) {
        case 'INVALID_REQUEST':
        case 'PLACE_INPUT_INVALID': return new IntegrationError('invalidRequest');
        case 'UNAUTHORIZED': return new IntegrationError('unauthorized');
        case 'FORBIDDEN': return new IntegrationError('forbidden');
        case 'PLACE_NOT_FOUND': return new IntegrationError('notFound');
        case 'PLACE_PROVIDER_AUTH': return new IntegrationError('providerUnavailable');
        case 'PLACE_PROVIDER_RATE_LIMITED': return new IntegrationError('rateLimited');
        case 'PLACE_PROVIDER_UNAVAILABLE': return new IntegrationError('providerUnavailable', true);
        case 'PLACE_PROVIDER_INVALID_RESPONSE': return new IntegrationError('invalidResponse');
        default: return mapUnknownTransportError(value);
    }
}
