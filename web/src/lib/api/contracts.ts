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
  city: string;
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
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  tags?: string[];
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
