import type { RouteRequest, RouteResponse } from "./contracts";
import { httpClient } from "./http-client";

function toQueryString(request: RouteRequest) {
  const params = new URLSearchParams({
    originLat: request.originLat.toString(),
    originLng: request.originLng.toString(),
    destLat: request.destLat.toString(),
    destLng: request.destLng.toString(),
    profile: request.profile
  });

  return params.toString();
}

export function getRoute(request: RouteRequest) {
  return httpClient.get<RouteResponse>(`/routes?${toQueryString(request)}`, {
    requiresAuth: true
  });
}
