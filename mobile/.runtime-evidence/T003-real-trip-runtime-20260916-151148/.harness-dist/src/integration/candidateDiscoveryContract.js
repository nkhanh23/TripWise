"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CANDIDATE_CATEGORIES = exports.MAX_DISCOVERY_CANDIDATES = void 0;
exports.validateCandidateDiscoveryRequest = validateCandidateDiscoveryRequest;
exports.validateDiscoveryCandidate = validateDiscoveryCandidate;
exports.validateDiscoveryCandidates = validateDiscoveryCandidates;
exports.mapCandidateRankingInput = mapCandidateRankingInput;
const validation_1 = require("./validation");
exports.MAX_DISCOVERY_CANDIDATES = 12;
exports.CANDIDATE_CATEGORIES = ['attractions', 'restaurants', 'hotels', 'coffee', 'shopping'];
function only(value, keys) {
    return (0, validation_1.isRecord)(value) && Object.keys(value).every((key) => keys.includes(key));
}
function validateCandidateDiscoveryRequest(value) {
    const request = (0, validation_1.validateExplorePlacesRequest)(value);
    if (request.limit === undefined)
        throw new validation_1.ContractValidationError('candidate discovery request');
    return { center: { latitude: request.center.latitude, longitude: request.center.longitude }, radiusMeters: request.radiusMeters, category: request.category, limit: request.limit };
}
function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
        || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
        throw new validation_1.ContractValidationError('candidate observation');
    }
    return value;
}
function validateDiscoveryCandidate(value) {
    if (!only(value, ['kind', 'status', 'review', 'googlePlaceId', 'name', 'coordinate', 'category', 'address', 'rating', 'userRatingCount', 'provenance'])
        || value.kind !== 'google-place-candidate' || value.status !== 'DISCOVERED' || value.review !== 'REVIEW_REQUIRED'
        || !only(value.coordinate, ['latitude', 'longitude'])
        || !only(value.provenance, ['provider', 'boundary', 'observation', 'receivedAt'])
        || value.provenance.provider !== 'google-places' || value.provenance.boundary !== 'explore-places'
        || value.provenance.observation !== 'CLIENT_RECEIVED'
        || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200
        || typeof value.googlePlaceId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(value.googlePlaceId)
        || !exports.CANDIDATE_CATEGORIES.includes(value.category)
        || (value.rating !== undefined && (typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 5))
        || (value.address !== undefined && (typeof value.address !== 'string' || value.address.length > 500))
        || (value.userRatingCount !== undefined && (!Number.isSafeInteger(value.userRatingCount) || value.userRatingCount < 0))) {
        throw new validation_1.ContractValidationError('discovery candidate');
    }
    const receivedAt = timestamp(value.provenance.receivedAt);
    const { center: coordinate } = validateCandidateDiscoveryRequest({ center: value.coordinate, radiusMeters: 100, category: 'all', limit: 1 });
    return {
        kind: 'google-place-candidate', status: 'DISCOVERED', review: 'REVIEW_REQUIRED',
        googlePlaceId: (0, validation_1.asGooglePlaceId)(value.googlePlaceId), name: value.name.trim(), coordinate, category: value.category,
        ...(value.address === undefined ? {} : { address: value.address.trim() }),
        ...(value.rating === undefined ? {} : { rating: value.rating }),
        ...(value.userRatingCount === undefined ? {} : { userRatingCount: value.userRatingCount }),
        provenance: { provider: 'google-places', boundary: 'explore-places', observation: 'CLIENT_RECEIVED', receivedAt },
    };
}
function validateDiscoveryCandidates(value, limit = exports.MAX_DISCOVERY_CANDIDATES) {
    if (!Number.isInteger(limit) || limit < 1 || limit > exports.MAX_DISCOVERY_CANDIDATES
        || !Array.isArray(value) || value.length > limit)
        throw new validation_1.ContractValidationError('discovery candidates');
    const candidates = value.map(validateDiscoveryCandidate);
    if (new Set(candidates.map((candidate) => candidate.googlePlaceId)).size !== candidates.length) {
        throw new validation_1.ContractValidationError('duplicate candidate identity');
    }
    return candidates;
}
function mapCandidateRankingInput(candidates, context) {
    if (!only(context, ['origin', 'preferredCategories']) || !Array.isArray(context.preferredCategories)
        || context.preferredCategories.length > exports.CANDIDATE_CATEGORIES.length
        || context.preferredCategories.some((category) => !exports.CANDIDATE_CATEGORIES.includes(category))) {
        throw new validation_1.ContractValidationError('candidate ranking context');
    }
    const preferences = context.preferredCategories;
    const request = validateCandidateDiscoveryRequest({ center: context.origin, radiusMeters: 100, category: 'all', limit: 1 });
    const normalized = validateDiscoveryCandidates(candidates);
    normalized.sort((left, right) => left.googlePlaceId < right.googlePlaceId ? -1 : left.googlePlaceId > right.googlePlaceId ? 1 : 0);
    return {
        version: 'TRIPWISE_CANDIDATE_RANKING_INPUT_V1', review: 'REVIEW_REQUIRED', candidates: normalized,
        context: { origin: request.center, preferredCategories: exports.CANDIDATE_CATEGORIES.filter((category) => preferences.includes(category)) },
    };
}
