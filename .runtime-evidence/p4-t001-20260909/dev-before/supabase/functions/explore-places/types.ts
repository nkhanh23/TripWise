export const EXPLORE_CATEGORIES = [
  'all', 'attractions', 'restaurants', 'hotels', 'coffee', 'shopping',
] as const;

export type ExploreCategory = typeof EXPLORE_CATEGORIES[number];
export type NormalizedExploreCategory = Exclude<ExploreCategory, 'all'>;

export type ExplorePlacesRequest = {
  center: { latitude: number; longitude: number };
  radiusMeters: number;
  category: ExploreCategory;
  limit?: number;
};

export type ExplorePlaceResult = {
  googlePlaceId: string;
  name: string;
  latitude: number;
  longitude: number;
  category: NormalizedExploreCategory;
  categoryLabel: string;
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
};

export type ExplorePlacesErrorCode =
  | 'EXPLORE_INPUT_INVALID'
  | 'EXPLORE_PROVIDER_AUTH'
  | 'EXPLORE_PROVIDER_RATE_LIMITED'
  | 'EXPLORE_PROVIDER_UNAVAILABLE'
  | 'EXPLORE_PROVIDER_INVALID_RESPONSE'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';
