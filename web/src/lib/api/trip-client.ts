import type {
  CreateTripRequest,
  GeneratedItineraryResponse,
  PageResponse,
  TripResponse,
  TripDetailResponse
} from "./contracts";
import { httpClient } from "./http-client";

export function generateTrip(request: CreateTripRequest) {
  return httpClient.post<GeneratedItineraryResponse>("/trips/generate", request, {
    requiresAuth: true
  });
}

export function getTripDetail(tripId: number | string) {
  return httpClient.get<TripDetailResponse>(`/trips/${tripId}`, {
    requiresAuth: true
  });
}

export function listTrips(page = 0, size = 6) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size)
  });

  return httpClient.get<PageResponse<TripResponse>>(`/trips?${params.toString()}`, {
    requiresAuth: true
  });
}

export function deleteTrip(tripId: number | string) {
  return httpClient.delete<void>(`/trips/${tripId}`, {
    requiresAuth: true
  });
}
