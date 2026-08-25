import type { Coordinate, RouteRequest, SavedTripDetail } from "./contracts";
import { IntegrationError } from "./errors";
import { validateRouteRequest } from "./validation";

/**
 * Builds the only route input accepted by the mobile OSRM boundary.
 * Coordinates are taken from the persisted, server-verified snapshot and
 * retain the database day/item ordering. Unresolved suggestions are skipped;
 * they are never converted into guessed coordinates.
 */
export function buildDrivingRouteRequest(
  detail: SavedTripDetail,
  dayNumber?: number,
): RouteRequest {
  const days = detail.days
    .filter((day) => dayNumber === undefined || day.dayNumber === dayNumber)
    .sort((a, b) => a.dayNumber - b.dayNumber);
  const coordinates: Coordinate[] = [];

  for (const day of days) {
    const items = [...day.items].sort((a, b) => a.position - b.position);
    for (const item of items) {
      if (item.resolution !== "VERIFIED") continue;
      coordinates.push({ latitude: item.latitude, longitude: item.longitude });
    }
  }

  if (coordinates.length < 2) {
    throw new IntegrationError("invalidRequest");
  }
  return validateRouteRequest({ profile: "driving", coordinates });
}

export function hasVerifiedRouteStops(
  detail: SavedTripDetail,
  dayNumber?: number,
): boolean {
  try {
    buildDrivingRouteRequest(detail, dayNumber);
    return true;
  } catch {
    return false;
  }
}
