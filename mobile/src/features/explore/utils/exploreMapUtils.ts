export type ExploreMapCoordinate = {
  latitude: number;
  longitude: number;
};

// Explore fixtures intentionally carry visual percentages rather than provider
// coordinates. This deterministic Bangkok viewport is demo-only and must not
// be treated as verified place metadata.
const VIEWPORT = {
  north: 13.82,
  south: 13.70,
  west: 100.42,
  east: 100.62,
};

export function mapFixturePercentToCoordinate(mapCoordinate: { topPercent: number; leftPercent: number }): ExploreMapCoordinate {
  const left = Math.min(100, Math.max(0, mapCoordinate.leftPercent)) / 100;
  const top = Math.min(100, Math.max(0, mapCoordinate.topPercent)) / 100;

  return {
    latitude: VIEWPORT.north - (VIEWPORT.north - VIEWPORT.south) * top,
    longitude: VIEWPORT.west + (VIEWPORT.east - VIEWPORT.west) * left,
  };
}

export function mapCoordinateToFixturePercent(coordinate: ExploreMapCoordinate) {
  return {
    topPercent: Math.min(95, Math.max(5, ((VIEWPORT.north - coordinate.latitude) / (VIEWPORT.north - VIEWPORT.south)) * 100)),
    leftPercent: Math.min(95, Math.max(5, ((coordinate.longitude - VIEWPORT.west) / (VIEWPORT.east - VIEWPORT.west)) * 100)),
  };
}

