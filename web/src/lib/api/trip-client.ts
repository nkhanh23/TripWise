import type {
  CreateTripRequest,
  GeneratedItineraryResponse,
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
