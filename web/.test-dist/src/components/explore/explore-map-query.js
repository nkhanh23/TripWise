export const DEFAULT_EXPLORE_PLACE_GROUP = "ALL";
export const MAP_MARKER_FETCH_DEBOUNCE_MS = 350;
export const VIETNAM_BOUNDS = {
    minLat: 8.18,
    minLng: 102.14,
    maxLat: 23.39,
    maxLng: 109.47,
};
export const HO_CHI_MINH_VIEWPORT_PRESET = {
    key: "ho-chi-minh",
    center: [10.7769, 106.7009],
    bounds: {
        minLat: 10.6,
        minLng: 106.4,
        maxLat: 10.95,
        maxLng: 106.9,
    },
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
function normalizeLocationAlias(value) {
    return (value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/gi, "d")
        .replace(/[^\p{L}\p{N}]+/gu, " ")
        .trim()
        .toLowerCase();
}
function isHoChiMinhAlias(value) {
    const normalizedValue = normalizeLocationAlias(value);
    return normalizedValue.length > 0 && HO_CHI_MINH_ALIASES.has(normalizedValue);
}
export function buildExplorePlaceSearchParams(input) {
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
export function buildExploreMarkerParams(input) {
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
export function resolveLocationViewport(input) {
    if (isHoChiMinhAlias(input.city) || isHoChiMinhAlias(input.province)) {
        return HO_CHI_MINH_VIEWPORT_PRESET;
    }
    return null;
}
export function areViewportBoundsEqual(left, right) {
    return left.minLat === right.minLat
        && left.minLng === right.minLng
        && left.maxLat === right.maxLat
        && left.maxLng === right.maxLng;
}
export function filterMarkersByVisiblePlaces(markers, visiblePlaceIds) {
    const visibleIds = new Set(visiblePlaceIds);
    return markers.filter((marker) => visibleIds.has(marker.id.toString()));
}
