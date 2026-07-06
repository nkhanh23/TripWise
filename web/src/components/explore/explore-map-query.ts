import type { PlaceMapMarkerResponse } from "../../lib/api/contracts.js";

export type ExplorePlaceGroup = "ALL" | "ATTRACTION" | "FOOD" | "HOTEL" | "SERVICE";

export type ExploreViewportBounds = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
};

export type ExploreViewportPreset = {
  key: string;
  center: [number, number];
  bounds: ExploreViewportBounds;
};

export const DEFAULT_EXPLORE_PLACE_GROUP: ExplorePlaceGroup = "ALL";
export const MAP_MARKER_FETCH_DEBOUNCE_MS = 350;
export const VIETNAM_BOUNDS: ExploreViewportBounds = {
  minLat: 8.18,
  minLng: 102.14,
  maxLat: 23.39,
  maxLng: 109.47,
};

export const HO_CHI_MINH_VIEWPORT_PRESET: ExploreViewportPreset = {
  key: "ho-chi-minh",
  center: [10.7769, 106.7009],
  bounds: {
    minLat: 10.6,
    minLng: 106.4,
    maxLat: 10.95,
    maxLng: 106.9,
  },
};

export type ExploreSearchQueryParams = {
  province?: string;
  city?: string;
  placeType?: ExplorePlaceGroup;
  keyword?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
};

export type ExploreMarkerQueryParams = {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
  province?: string;
  city?: string;
  placeType?: ExplorePlaceGroup;
  limit?: number;
};

type BuildPlaceSearchParamsInput = {
  province?: string;
  city?: string;
  keyword?: string;
  sortBy: string;
  sortDirection: string;
  page: number;
  size: number;
  placeType?: ExplorePlaceGroup;
};

type BuildMarkerParamsInput = {
  viewportBounds: ExploreViewportBounds;
  province?: string;
  city?: string;
  limit: number;
  placeType?: ExplorePlaceGroup;
};

const HO_CHI_MINH_ALIASES = new Set([
  "ho chi minh",
  "ho chi minh city",
  "thanh pho ho chi minh",
  "tp ho chi minh",
  "tphcm",
  "hcm",
  "saigon",
  "sai gon",
  "thu duc",
]);

function normalizeLocationAlias(value?: string): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();
}

function isHoChiMinhAlias(value?: string): boolean {
  const normalizedValue = normalizeLocationAlias(value);
  return normalizedValue.length > 0 && HO_CHI_MINH_ALIASES.has(normalizedValue);
}

export function buildExplorePlaceSearchParams(
  input: BuildPlaceSearchParamsInput,
): ExploreSearchQueryParams {
  return {
    province: input.province || undefined,
    city: input.city || undefined,
    placeType: input.placeType ?? DEFAULT_EXPLORE_PLACE_GROUP,
    keyword: input.keyword || undefined,
    sortBy: input.sortBy,
    sortDirection: input.sortDirection,
    page: input.page,
    size: input.size,
  };
}

export function buildExploreMarkerParams(
  input: BuildMarkerParamsInput,
): ExploreMarkerQueryParams {
  return {
    minLat: input.viewportBounds.minLat,
    minLng: input.viewportBounds.minLng,
    maxLat: input.viewportBounds.maxLat,
    maxLng: input.viewportBounds.maxLng,
    province: input.province || undefined,
    city: input.city || undefined,
    placeType: input.placeType ?? DEFAULT_EXPLORE_PLACE_GROUP,
    limit: input.limit,
  };
}

export function resolveLocationViewport(input: {
  province?: string;
  city?: string;
}): ExploreViewportPreset | null {
  if (isHoChiMinhAlias(input.city) || isHoChiMinhAlias(input.province)) {
    return HO_CHI_MINH_VIEWPORT_PRESET;
  }

  return null;
}

export function areViewportBoundsEqual(
  left: ExploreViewportBounds,
  right: ExploreViewportBounds,
): boolean {
  return left.minLat === right.minLat
    && left.minLng === right.minLng
    && left.maxLat === right.maxLat
    && left.maxLng === right.maxLng;
}

export function filterMarkersByVisiblePlaces(
  markers: PlaceMapMarkerResponse[],
  visiblePlaceIds: readonly string[],
): PlaceMapMarkerResponse[] {
  const visibleIds = new Set(visiblePlaceIds);
  return markers.filter((marker) => visibleIds.has(marker.id.toString()));
}
