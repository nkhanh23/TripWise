export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ValidationErrorDetail {
  field: string;
  issue: string;
}

export interface ErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  errorCode?: string;
  correlationId?: string;
  details?: ValidationErrorDetail[];
  detailsData?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface UserResponse {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTripRequest {
  request: string;
}

export interface PlaceResponse {
  id: number;
  name: string;
  province?: string;
  city: string;
  district?: string;
  ward?: string;
  displayAddress?: string;
  categoryId?: number;
  categoryName?: string;
  categorySlug?: string;
  description?: string;
  estimatedCost?: number;
  durationMinutes?: number;
  indoor?: boolean;
  verified?: boolean;
  priceLevel?: string;
  rating?: number;
  verificationStatus?: string;
  popularityScore?: number;
  primaryImageUrl?: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  tags?: string[];
}

export interface PlaceMapMarkerResponse {
  id: number;
  name: string;
  province?: string;
  city: string;
  categoryName?: string;
  categorySlug?: string;
  rating?: number;
  primaryImageUrl?: string;
  verificationStatus?: string;
  popularityScore?: number;
  latitude: number;
  longitude: number;
}

export interface StagingPlaceResponse {
  id: number;
  importRunId?: number;
  name: string;
  placeTypeDraft?: string;
  latitude?: number;
  longitude?: number;
  region?: string;
  locality?: string;
  address?: string;
  source?: string;
  sourcePlaceId?: string;
  dedupStatus?: string;
  coordinateStatus?: string;
  validationStatus?: string;
  moderationStatus?: string;
  needsAdminReview?: boolean;
  applied?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryResponse {
  sourceCategoryId?: string;
  categoryLabel?: string;
  categoryPath?: string;
  isPrimary?: boolean;
}

export interface DedupCandidateResponse {
  id: number;
  existingPlaceId?: number;
  matchedStagingPlaceId?: number;
  matchType?: string;
  matchConfidence?: string;
  distanceMeters?: number;
  nameSimilarity?: number;
  categorySimilarity?: number;
  evidence?: string;
  decision?: string;
  existingPlaceName?: string;
  existingPlaceType?: string;
  existingPlaceCity?: string;
}

export interface StagingPlaceDetailResponse {
  stagingPlace?: StagingPlaceResponse;
  categories?: CategoryResponse[];
  candidates?: DedupCandidateResponse[];
  existingPublicDuplicate?: {
    existingPublicType: "PLACE" | "HOTEL";
    existingPublicId: number;
    existingName: string;
    existingCity?: string;
    existingProvince?: string;
    existingSource: string;
    existingSourcePlaceId: string;
  };
}

export interface AdminPlaceReviewResponse {
  id: number;
  name: string;
  source: string;
  sourceExternalId?: string;
  province?: string;
  city?: string;
  district?: string;
  ward?: string;
  placeType?: string;
  verificationStatus?: string;
  recommendable?: boolean;
  qualityScore?: number;
  rejectReason?: string;
  durationMinutes?: number;
  latitude?: number;
  longitude?: number;
  tags?: string[];
  rawTags?: string;
  updatedAt?: string;
}

export interface TransportSuggestionResponse {
  mode: string;
  reason: string;
}

export interface RouteRequest {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  profile: "driving" | "walking" | "cycling";
}

export interface RouteResponse {
  distanceMeters: number;
  durationSeconds: number;
  geometry: string;
}

export interface ItineraryItemResponse {
  orderIndex: number;
  startTime?: string;
  endTime?: string;
  timeSlot?: string;
  reason?: string;
  aiDescription?: string;
  estimatedCost?: number;
  distanceFromPreviousMeters?: number;
  durationFromPreviousSeconds?: number;
  place?: PlaceResponse;
  transportSuggestion?: TransportSuggestionResponse;
}

export interface ItineraryDayResponse {
  dayNumber: number;
  dayTitle?: string;
  weatherSummary?: string;
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
  items: ItineraryItemResponse[];
}

export interface GeneratedItineraryResponse {
  id: number;
  destination: string;
  startDate?: string;
  days?: number;
  nights?: number;
  budget?: string;
  travelStyle?: string;
  interests?: string[];
  preferences?: string;
  status: string;
  aiMetadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  itineraryDays: ItineraryDayResponse[];
}

export interface TripResponse {
  id: number;
  destination: string;
  startDate?: string;
  days?: number;
  nights?: number;
  budget?: string;
  travelStyle?: string;
  interests?: string[];
  preferences?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageResponse<T> {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  content: T[];
}

export interface ItineraryResponse {
  days: ItineraryDayResponse[];
}

export interface TripDetailResponse {
  id: number;
  destination: string;
  startDate?: string;
  days?: number;
  nights?: number;
  budget?: string;
  travelStyle?: string;
  interests?: string[];
  preferences?: string;
  status: string;
  aiMetadata?: Record<string, unknown>;
  itinerary: ItineraryResponse;
  createdAt?: string;
  updatedAt?: string;
}

export interface CityPipelineRunRequest {
  source: "FOURSQUARE_OS_PLACES" | "OSM_GEOFABRIK";
  province: string;
  city: string;
  inputPath?: string;
  importRunId?: number;
  releaseDate?: string;
  bbox?: string;
  limit?: number;
  step?: "all" | "import" | "dedup" | "moderation" | "report";
  dryRun?: boolean;
  confirmWriteStaging?: boolean;
}

export interface CityPipelineRunResponse {
  id: number;
  source: string;
  province: string;
  city: string;
  inputPath?: string;
  importRunId?: number;
  releaseDate?: string;
  bbox?: string;
  limitCount?: number;
  step: string;
  dryRun: boolean;
  confirmWriteStaging: boolean;
  status: string;
  summaryText?: string;
  adminQueueUrl?: string;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  createdAt?: string;
  updatedAt?: string;
}
