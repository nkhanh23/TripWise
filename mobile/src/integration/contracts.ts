export type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type UserId = Brand<string, 'UserId'>;
export type TripId = Brand<string, 'TripId'>;
export type ItineraryDayId = Brand<string, 'ItineraryDayId'>;
export type ItineraryItemId = Brand<string, 'ItineraryItemId'>;
export type GooglePlaceId = Brand<string, 'GooglePlaceId'>;
export type SavedPlaceId = Brand<string, 'SavedPlaceId'>;
export type FixtureId = Brand<string, 'FixtureId'>;

export type AuthenticatedUser = {
  id: UserId;
  email: string | null;
  displayName: string | null;
};

export type AuthenticatedSession = {
  user: AuthenticatedUser;
  expiresAt: number | null;
};

export type ProfileStatistics = {
  tripsCount: number;
  savedPlacesCount: number;
};

export type ProfileTransport = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  home_country: string;
  created_at: string;
  updated_at: string;
};

export type ProfileUpdate = {
  displayName?: string | null;
  avatarUrl?: string | null;
  homeCountry?: string;
};

export type Profile = {
  id: UserId;
  displayName: string | null;
  avatarUrl: string | null;
  homeCountry: string;
  createdAt: string;
  updatedAt: string;
};

export type GenerateTripRequest = {
  destination: string;
  startDate: string;
  endDate: string;
  travelers?: number;
  budget?: number;
  currency?: string;
  preferences?: string[];
  notes?: string;
};

export type GeneratedTripItem = {
  position: number;
  placeName: string;
  placeQuery?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
  estimatedCost?: number;
};

export type GeneratedTripDay = {
  dayNumber: number;
  date: string;
  summary?: string;
  items: GeneratedTripItem[];
};

export type GeneratedTrip = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  summary?: string;
  days: GeneratedTripDay[];
};

export type GenerateTripSuccessEnvelope = { data: GeneratedTrip };

export type GenerateTripErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_INVALID_RESPONSE'
  | 'INTERNAL_ERROR';

export type SafeErrorEnvelope<Code extends string> = {
  error: { code: Code; message: string };
};

export type UnresolvedPersistenceItem = {
  position: number;
  placeName: string;
  placeQuery?: string;
  latitude?: null;
  longitude?: null;
  startTime?: string;
  endTime?: string;
  note?: string;
};

export type PersistenceDay = {
  dayNumber: number;
  date: string;
  summary?: string;
  items: UnresolvedPersistenceItem[];
};

export type TripGraphPayload = {
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  estimatedBudget?: number | null;
  currency?: string | null;
  days: PersistenceDay[];
};

export type PersistTripCommand = {
  idempotencyKey: string;
  graph: TripGraphPayload;
};

export type PersistenceErrorCode = 'TW001' | 'TW002' | 'TW003' | 'TW004' | 'TW005';

export type WorkspaceMutationErrorCode =
  | 'TW006' | 'TW007' | 'TW008' | 'TW009' | 'TW010' | 'TW011' | 'TW012' | 'TW013' | 'TW014';

export type WorkspaceRevision = number;
export type WorkspaceItemKind = 'place' | 'custom_activity' | 'restaurant' | 'transport' | 'accommodation' | 'reservation' | 'note';
export type WorkspaceFlexibility = 'fixed' | 'flexible';
export type WorkspacePriority = 'must_do' | 'want_to_do' | 'optional';
export type WorkspaceActivityStatus = 'scheduled' | 'completed' | 'skipped';

export type WorkspaceContactPatch = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  reservationCode?: string | null;
};

export type WorkspaceTransportPatch = {
  mode?: 'walk' | 'drive' | 'transit' | 'bus' | 'train' | 'flight' | 'motorbike' | 'ferry' | 'other' | null;
  originLabel?: string | null;
  destinationLabel?: string | null;
  operatorName?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  plannedCostAmount?: number | null;
  plannedCostCurrency?: string | null;
};

export type WorkspaceAccommodationPatch = {
  checkInAt?: string | null;
  checkOutAt?: string | null;
  nights?: number | null;
};

export type WorkspaceItemPatch = {
  kind?: WorkspaceItemKind;
  placeName?: string;
  placeQuery?: string | null;
  flexibility?: WorkspaceFlexibility;
  priority?: WorkspacePriority;
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
  contact?: WorkspaceContactPatch;
  transport?: WorkspaceTransportPatch;
  accommodation?: WorkspaceAccommodationPatch;
};

export type WorkspaceSourceLink = {
  type: 'google_maps' | 'facebook' | 'instagram' | 'tiktok' | 'website' | 'booking' | 'other';
  url: string;
  label?: string;
};

export type UpdateWorkspaceItemCommand = {
  type: 'update_item'; tripId: TripId; itemId: ItineraryItemId; expectedRevision: WorkspaceRevision; patch: WorkspaceItemPatch;
};
export type TransitionWorkspaceItemStatusCommand = {
  type: 'transition_item_status'; tripId: TripId; itemId: ItineraryItemId; expectedRevision: WorkspaceRevision; status: WorkspaceActivityStatus;
};
export type ReplaceWorkspaceSourceLinksCommand = {
  type: 'replace_source_links'; tripId: TripId; itemId: ItineraryItemId; expectedRevision: WorkspaceRevision; links: WorkspaceSourceLink[];
};
export type WorkspaceMutationCommand = UpdateWorkspaceItemCommand | TransitionWorkspaceItemStatusCommand | ReplaceWorkspaceSourceLinksCommand;
export type WorkspaceMutationResult = { revision: WorkspaceRevision };

export type SavedTripCursor = {
  createdAt: string;
  id: TripId;
};

export type SavedTripsPageRequest = {
  limit?: number;
  cursor?: SavedTripCursor | null;
};

export type SavedTripSummary = {
  id: TripId;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number | null;
  currency: string | null;
  createdAt: string;
  dayCount: number;
  itemCount: number;
  coverGooglePlaceIds: GooglePlaceId[];
};

export type SavedTripsPage = {
  items: SavedTripSummary[];
  nextCursor: SavedTripCursor | null;
};

export type SavedTripItemBase = {
  id: ItineraryItemId;
  position: number;
  placeName: string;
  placeQuery?: string;
  startTime?: string;
  endTime?: string;
  note?: string;
};

export type UnresolvedSavedTripItem = SavedTripItemBase & {
  resolution: 'UNRESOLVED';
  latitude: null;
  longitude: null;
};

export type VerifiedSavedTripItem = SavedTripItemBase & {
  resolution: 'VERIFIED';
  googlePlaceId: GooglePlaceId;
  latitude: number;
  longitude: number;
  placeAddress?: string;
  placeCategory?: string;
  placeResolvedAt: string;
};

export type SavedTripItem = UnresolvedSavedTripItem | VerifiedSavedTripItem;

export type SavedTripDay = {
  id: ItineraryDayId;
  dayNumber: number;
  date?: string;
  summary?: string;
  items: SavedTripItem[];
};

export type SavedTripDetail = {
  id: TripId;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number | null;
  currency: string | null;
  createdAt: string;
  updatedAt: string;
  days: SavedTripDay[];
};

export type ResolvePlaceRequest = { itineraryItemId: ItineraryItemId };

export type ResolvePlaceResult = {
  itineraryItemId: ItineraryItemId;
  resolution: 'VERIFIED' | 'VERIFIED_REFRESHED';
  resolvedAt: string;
};

export type ResolvePlaceSuccessEnvelope = { data: ResolvePlaceResult };

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

export type Coordinate = { latitude: number; longitude: number };

export type ExploreCategory =
  | 'all'
  | 'attractions'
  | 'restaurants'
  | 'hotels'
  | 'coffee'
  | 'shopping';

export type ExplorePlacesRequest = {
  center: Coordinate;
  radiusMeters: number;
  category: ExploreCategory;
  limit?: number;
};

export type ExploreDiscoveredPlace = {
  googlePlaceId: GooglePlaceId;
  name: string;
  coordinate: Coordinate;
  category: Exclude<ExploreCategory, 'all'>;
  categoryLabel: string;
  address?: string;
  rating?: number;
  userRatingCount?: number;
};

export type ExplorePlacesSuccessEnvelope = { data: { places: ExploreDiscoveredPlace[] } };

export type ExplorePlacesErrorCode =
  | 'EXPLORE_INPUT_INVALID'
  | 'EXPLORE_PROVIDER_AUTH'
  | 'EXPLORE_PROVIDER_RATE_LIMITED'
  | 'EXPLORE_PROVIDER_UNAVAILABLE'
  | 'EXPLORE_PROVIDER_INVALID_RESPONSE'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

export type RouteRequest = {
  profile: 'driving';
  coordinates: readonly Coordinate[];
};

export type OsrmRouteTransport = {
  code: 'Ok';
  routes: {
    distance: number;
    duration: number;
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
  }[];
};

export type Route = {
  profile: 'driving';
  distanceMeters: number;
  durationSeconds: number;
  geometry: Coordinate[];
};

export type WeatherRequest = Coordinate & { forecastDays: number };

export type OpenMeteoTransport = {
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
  };
};

export type DailyWeather = {
  date: string;
  weatherCode: number | null;
  maximumTemperatureCelsius: number | null;
  minimumTemperatureCelsius: number | null;
  maximumPrecipitationProbability: number | null;
};

export type WeatherForecast = {
  days: DailyWeather[];
};

export type GetPlacePhotoRequest = {
  googlePlaceId: string;
  maxWidth?: number;
};

export type PlacePhoto = {
  googlePlaceId: string;
  photoUri: string | null;
  diagnostic?: {
    providerStatus: number;
    hasPhotosProperty: boolean;
    photosIsArray: boolean;
    photosCount: number;
    firstPhotoHasName: boolean;
  };
  authorAttribution?: {
    displayName?: string;
    uri?: string;
    photoUri?: string;
  };
};

export type PlacePhotoErrorCode =
  | 'PHOTO_INPUT_INVALID'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PHOTO_NOT_FOUND'
  | 'PHOTO_PROVIDER_AUTH'
  | 'PHOTO_PROVIDER_RATE_LIMITED'
  | 'PHOTO_PROVIDER_UNAVAILABLE';

export type ImageSource =
  | 'GOOGLE_PLACE'
  | 'WIKIMEDIA_PLACE'
  | 'DESTINATION_COVER'
  | 'PLACEHOLDER';

export type ImageAttribution = {
  displayName: string;
  sourceUrl: string;
  license?: string;
  licenseUrl?: string;
};

export type ResolvedImage = {
  uri: string | null;
  source: ImageSource;
  attribution?: ImageAttribution;
  matchedEntity?: string;
  confidence?: number;
};

export type WikimediaImageRequest =
  | { kind: 'PLACE'; googlePlaceId: string; maxWidth?: number }
  | { kind: 'DESTINATION'; destination: string; maxWidth?: number };

export type PlaceImageRequest = GetPlacePhotoRequest;

export type TripCoverImageRequest = {
  googlePlaceIds: string[];
  destination: string;
  maxWidth?: number;
};

export type SavedPlaceTransport = {
  id: string;
  googlePlaceId: string;
  placeName: string;
  latitude: number;
  longitude: number;
  placeAddress?: string | null;
  placeCategory?: string | null;
  createdAt: string;
};

export type SavedPlace = {
  id: SavedPlaceId;
  googlePlaceId: GooglePlaceId;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  category?: string | null;
  createdAt: string;
};

export type SavedPlacesPage = {
  items: SavedPlace[];
  nextCursor: { createdAt: string; id: string } | null;
};

export type SavePlaceCommand = {
  googlePlaceId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  category?: string | null;
};






export type PlaceMetadata = { googlePlaceId: string; rating?: number; userRatingCount?: number; };
