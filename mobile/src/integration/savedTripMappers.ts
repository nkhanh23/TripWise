import type { SavedTripDetail } from "./contracts";

export type SavedTripResolutionModel = {
  id: string;
  days: {
    dayNumber: number;
    items: {
      id: string;
      placeName: string;
      resolution: "UNRESOLVED" | "VERIFIED";
      googlePlaceId?: string;
      latitude: number | null;
      longitude: number | null;
      placeAddress?: string;
      placeCategory?: string;
      placeResolvedAt?: string;
    }[];
  }[];
};

/** Node-safe domain mapper shared by production UI adapters and live smoke. */
export function mapSavedTripDetailToResolutionModel(
  detail: SavedTripDetail,
): SavedTripResolutionModel {
  return {
    id: detail.id,
    days: detail.days.map((day) => ({
      dayNumber: day.dayNumber,
      items: day.items.map((item) =>
        item.resolution === "VERIFIED"
          ? {
              id: item.id,
              placeName: item.placeName,
              resolution: "VERIFIED" as const,
              googlePlaceId: item.googlePlaceId,
              latitude: item.latitude,
              longitude: item.longitude,
              ...(item.placeAddress === undefined
                ? {}
                : { placeAddress: item.placeAddress }),
              ...(item.placeCategory === undefined
                ? {}
                : { placeCategory: item.placeCategory }),
              placeResolvedAt: item.placeResolvedAt,
            }
          : {
              id: item.id,
              placeName: item.placeName,
              resolution: "UNRESOLVED" as const,
              latitude: null,
              longitude: null,
            },
      ),
    })),
  };
}
