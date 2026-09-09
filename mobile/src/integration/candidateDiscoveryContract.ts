import type { Coordinate, ExploreCategory, GooglePlaceId } from './contracts';
import { asGooglePlaceId, ContractValidationError, isRecord, validateExplorePlacesRequest } from './validation';

export const MAX_DISCOVERY_CANDIDATES = 12;
export const CANDIDATE_CATEGORIES = ['attractions', 'restaurants', 'hotels', 'coffee', 'shopping'] as const;
export type CandidateCategory = typeof CANDIDATE_CATEGORIES[number];

export type CandidateDiscoveryRequest = {
  center: Coordinate;
  radiusMeters: number;
  category: ExploreCategory;
  limit: number;
};

/** Ephemeral provider fact. This is deliberately not a saved/verified itinerary item. */
export type DiscoveryCandidate = {
  kind: 'google-place-candidate';
  status: 'DISCOVERED';
  review: 'REVIEW_REQUIRED';
  googlePlaceId: GooglePlaceId;
  name: string;
  coordinate: Coordinate;
  category: CandidateCategory;
  address?: string;
  rating?: number;
  userRatingCount?: number;
  provenance: {
    provider: 'google-places';
    boundary: 'explore-places';
    observation: 'CLIENT_RECEIVED';
    receivedAt: string;
  };
};

export type CandidateRankingContext = {
  origin: Coordinate;
  preferredCategories: CandidateCategory[];
};

export interface CandidateDiscoveryRepository {
  discover(request: CandidateDiscoveryRequest, signal?: AbortSignal): Promise<DiscoveryCandidate[]>;
}

/** Input only: array order is canonical identity order, never a recommendation rank. */
export type CandidateRankingInput = {
  version: 'TRIPWISE_CANDIDATE_RANKING_INPUT_V1';
  review: 'REVIEW_REQUIRED';
  candidates: DiscoveryCandidate[];
  context: CandidateRankingContext;
};

function only(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && Object.keys(value).every((key) => keys.includes(key));
}

export function validateCandidateDiscoveryRequest(value: unknown): CandidateDiscoveryRequest {
  const request = validateExplorePlacesRequest(value);
  if (request.limit === undefined) throw new ContractValidationError('candidate discovery request');
  return { center: { latitude: request.center.latitude, longitude: request.center.longitude }, radiusMeters: request.radiusMeters, category: request.category, limit: request.limit };
}

function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new ContractValidationError('candidate observation');
  }
  return value;
}

export function validateDiscoveryCandidate(value: unknown): DiscoveryCandidate {
  if (!only(value, ['kind', 'status', 'review', 'googlePlaceId', 'name', 'coordinate', 'category', 'address', 'rating', 'userRatingCount', 'provenance'])
    || value.kind !== 'google-place-candidate' || value.status !== 'DISCOVERED' || value.review !== 'REVIEW_REQUIRED'
    || !only(value.coordinate, ['latitude', 'longitude'])
    || !only(value.provenance, ['provider', 'boundary', 'observation', 'receivedAt'])
    || value.provenance.provider !== 'google-places' || value.provenance.boundary !== 'explore-places'
    || value.provenance.observation !== 'CLIENT_RECEIVED'
    || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 200
    || typeof value.googlePlaceId !== 'string' || !/^[A-Za-z0-9_-]{10,200}$/.test(value.googlePlaceId)
    || !CANDIDATE_CATEGORIES.includes(value.category as CandidateCategory)
    || (value.rating !== undefined && (typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 5))
    || (value.address !== undefined && (typeof value.address !== 'string' || value.address.length > 500))
    || (value.userRatingCount !== undefined && (!Number.isSafeInteger(value.userRatingCount) || (value.userRatingCount as number) < 0))) {
    throw new ContractValidationError('discovery candidate');
  }
  const receivedAt = timestamp(value.provenance.receivedAt);
  const { center: coordinate } = validateCandidateDiscoveryRequest({ center: value.coordinate, radiusMeters: 100, category: 'all', limit: 1 });
  return {
    kind: 'google-place-candidate', status: 'DISCOVERED', review: 'REVIEW_REQUIRED',
    googlePlaceId: asGooglePlaceId(value.googlePlaceId), name: value.name.trim(), coordinate, category: value.category as CandidateCategory,
    ...(value.address === undefined ? {} : { address: (value.address as string).trim() }),
    ...(value.rating === undefined ? {} : { rating: value.rating as number }),
    ...(value.userRatingCount === undefined ? {} : { userRatingCount: value.userRatingCount as number }),
    provenance: { provider: 'google-places', boundary: 'explore-places', observation: 'CLIENT_RECEIVED', receivedAt },
  };
}

export function validateDiscoveryCandidates(value: unknown, limit = MAX_DISCOVERY_CANDIDATES): DiscoveryCandidate[] {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_DISCOVERY_CANDIDATES
    || !Array.isArray(value) || value.length > limit) throw new ContractValidationError('discovery candidates');
  const candidates = value.map(validateDiscoveryCandidate);
  if (new Set(candidates.map((candidate) => candidate.googlePlaceId)).size !== candidates.length) {
    throw new ContractValidationError('duplicate candidate identity');
  }
  return candidates;
}

export function mapCandidateRankingInput(candidates: unknown, context: unknown): CandidateRankingInput {
  if (!only(context, ['origin', 'preferredCategories']) || !Array.isArray(context.preferredCategories)
    || context.preferredCategories.length > CANDIDATE_CATEGORIES.length
    || context.preferredCategories.some((category) => !CANDIDATE_CATEGORIES.includes(category as CandidateCategory))) {
    throw new ContractValidationError('candidate ranking context');
  }
  const preferences = context.preferredCategories;
  const request = validateCandidateDiscoveryRequest({ center: context.origin, radiusMeters: 100, category: 'all', limit: 1 });
  const normalized = validateDiscoveryCandidates(candidates);
  normalized.sort((left, right) => left.googlePlaceId < right.googlePlaceId ? -1 : left.googlePlaceId > right.googlePlaceId ? 1 : 0);
  return {
    version: 'TRIPWISE_CANDIDATE_RANKING_INPUT_V1', review: 'REVIEW_REQUIRED', candidates: normalized,
    context: { origin: request.center, preferredCategories: CANDIDATE_CATEGORIES.filter((category) => preferences.includes(category)) },
  };
}
