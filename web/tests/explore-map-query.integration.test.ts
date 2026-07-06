import test from "node:test";
import assert from "node:assert/strict";

import {
  HO_CHI_MINH_VIEWPORT_PRESET,
  buildExploreMarkerParams,
  buildExplorePlaceSearchParams,
  DEFAULT_EXPLORE_PLACE_GROUP,
  filterMarkersByVisiblePlaces,
  MAP_MARKER_FETCH_DEBOUNCE_MS,
  resolveLocationViewport,
  VIETNAM_BOUNDS,
} from "../src/components/explore/explore-map-query.js";

test("Explore defaults place search to the frontend default placeType", () => {
  const params = buildExplorePlaceSearchParams({
    sortBy: "popularityScore",
    sortDirection: "desc",
    page: 0,
    size: 20,
  });

  assert.equal(params.placeType, DEFAULT_EXPLORE_PLACE_GROUP);
  assert.equal(params.page, 0);
  assert.equal(params.size, 20);
});

test("Explore sends explicit placeType values for every chip state", () => {
  const groups = ["ALL", "ATTRACTION", "FOOD", "HOTEL", "SERVICE"] as const;

  for (const placeType of groups) {
    const placeParams = buildExplorePlaceSearchParams({
      placeType,
      sortBy: "popularityScore",
      sortDirection: "desc",
      page: 0,
      size: 20,
    });
    const markerParams = buildExploreMarkerParams({
      viewportBounds: VIETNAM_BOUNDS,
      placeType,
      limit: 200,
    });

    assert.equal(placeParams.placeType, placeType);
    assert.equal(markerParams.placeType, placeType);
  }
});

test("Explore marker query uses the active viewport bounds and keeps the default placeType", () => {
  const params = buildExploreMarkerParams({
    viewportBounds: {
      minLat: 12.1,
      minLng: 109.1,
      maxLat: 12.4,
      maxLng: 109.4,
    },
    city: "Nha Trang",
    limit: 200,
  });

  assert.deepEqual(
    {
      minLat: params.minLat,
      minLng: params.minLng,
      maxLat: params.maxLat,
      maxLng: params.maxLng,
    },
    {
      minLat: 12.1,
      minLng: 109.1,
      maxLat: 12.4,
      maxLng: 109.4,
    },
  );
  assert.equal(params.city, "Nha Trang");
  assert.equal(params.placeType, DEFAULT_EXPLORE_PLACE_GROUP);
});

test("Explore marker sync removes markers that are not present in the current list page", () => {
  const filtered = filterMarkersByVisiblePlaces(
    [
      { id: 101, name: "Po Nagar", city: "Nha Trang", latitude: 12.264, longitude: 109.195 },
      { id: 202, name: "Hon Chong", city: "Nha Trang", latitude: 12.273, longitude: 109.201 },
      { id: 999, name: "Rac marker", city: "Nha Trang", latitude: 12.299, longitude: 109.221 },
    ],
    ["101", "202"],
  );

  assert.deepEqual(
    filtered.map((marker) => marker.id),
    [101, 202],
  );
});

test("Explore marker debounce constant stays explicit for viewport-driven fetches", () => {
  assert.equal(MAP_MARKER_FETCH_DEBOUNCE_MS, 350);
  assert.deepEqual(VIETNAM_BOUNDS, {
    minLat: 8.18,
    minLng: 102.14,
    maxLat: 23.39,
    maxLng: 109.47,
  });
});

test("Explore resolves Ho Chi Minh viewport preset from city and province aliases", () => {
  const byCity = resolveLocationViewport({ city: "Hồ Chí Minh" });
  const byAlias = resolveLocationViewport({ city: "Thủ Đức" });
  const byProvince = resolveLocationViewport({ province: "TP. Hồ Chí Minh" });

  assert.deepEqual(byCity, HO_CHI_MINH_VIEWPORT_PRESET);
  assert.deepEqual(byAlias, HO_CHI_MINH_VIEWPORT_PRESET);
  assert.deepEqual(byProvince, HO_CHI_MINH_VIEWPORT_PRESET);
});

test("Explore keeps non-HCM filters on existing viewport behavior", () => {
  const viewport = resolveLocationViewport({ city: "Nha Trang", province: "Khánh Hòa" });

  assert.equal(viewport, null);
});
