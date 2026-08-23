export type ResolvePlaceRequest = { itineraryItemId: string };

export type PlaceSnapshot = {
  googlePlaceId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  placeAddress?: string;
  placeCategory?: string;
};

export type StoredPlaceContext = {
  itemId: string;
  placeName: string;
  placeQuery?: string;
  destination: string;
  wasResolved: boolean;
};

export type ResolvePlaceErrorCode =
  | 'PLACE_INPUT_INVALID'
  | 'PLACE_NOT_FOUND'
  | 'PLACE_AMBIGUOUS'
  | 'PLACE_PROVIDER_AUTH'
  | 'PLACE_PROVIDER_RATE_LIMITED'
  | 'PLACE_PROVIDER_UNAVAILABLE'
  | 'PLACE_PERSISTENCE_FAILED'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

export type ResolvePlaceSuccessResponse = { data: { itineraryItemId: string; resolution: 'VERIFIED' | 'VERIFIED_REFRESHED'; resolvedAt: string } };
export type ResolvePlaceErrorResponse = { error: { code: ResolvePlaceErrorCode; message: string } };
