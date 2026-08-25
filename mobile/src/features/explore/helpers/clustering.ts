import type {
  ExploreMarkerItem,
  ExplorePlace,
  SinglePlaceMarker,
} from "../types";

/**
 * Deterministic spatial grouping of places into clusters or single markers
 * based on normalized map coordinate proximity (% distances).
 */
export function clusterPlaces(
  places: ExplorePlace[],
  thresholdPercent = 8,
): ExploreMarkerItem[] {
  // If list is small, render individual markers directly
  if (places.length <= 12) {
    return places.map((place): SinglePlaceMarker => ({
      type: "place",
      id: place.id,
      place,
    }));
  }

  const clusters: {
    id: string;
    places: ExplorePlace[];
    totalTop: number;
    totalLeft: number;
  }[] = [];

  for (const place of places) {
    let assigned = false;

    for (const cluster of clusters) {
      const avgTop = cluster.totalTop / cluster.places.length;
      const avgLeft = cluster.totalLeft / cluster.places.length;

      const dTop = place.mapCoordinate.topPercent - avgTop;
      const dLeft = place.mapCoordinate.leftPercent - avgLeft;
      const dist = Math.sqrt(dTop * dTop + dLeft * dLeft);

      if (dist <= thresholdPercent) {
        cluster.places.push(place);
        cluster.totalTop += place.mapCoordinate.topPercent;
        cluster.totalLeft += place.mapCoordinate.leftPercent;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.push({
        id: `cluster_${place.id}`,
        places: [place],
        totalTop: place.mapCoordinate.topPercent,
        totalLeft: place.mapCoordinate.leftPercent,
      });
    }
  }

  return clusters.map((c): ExploreMarkerItem => {
    if (c.places.length === 1) {
      const singlePlace = c.places[0];
      return {
        type: "place",
        id: singlePlace.id,
        place: singlePlace,
      };
    }

    const avgTop = Math.round(c.totalTop / c.places.length);
    const avgLeft = Math.round(c.totalLeft / c.places.length);

    return {
      type: "cluster",
      id: c.id,
      count: c.places.length,
      places: c.places,
      mapCoordinate: {
        topPercent: avgTop,
        leftPercent: avgLeft,
      },
    };
  });
}
