import type { ExploreMapPlace, ExploreMarkerItem, SinglePlaceMarker } from '../types';

/**
 * Deterministic spatial grouping of places into clusters or single markers
 * based on real coordinate proximity.
 */
export function clusterPlaces(
  places: ExploreMapPlace[],
  thresholdKilometers = 1.5
): ExploreMarkerItem[] {
  // If list is small, render individual markers directly
  if (places.length <= 12) {
    return places.map(
      (place): SinglePlaceMarker => ({
        type: 'place',
        id: place.id,
        place,
      })
    );
  }

  const clusters: {
    id: string;
    places: ExploreMapPlace[];
    totalLatitude: number;
    totalLongitude: number;
  }[] = [];

  for (const place of places) {
    let assigned = false;

    for (const cluster of clusters) {
      const avgLatitude = cluster.totalLatitude / cluster.places.length;
      const avgLongitude = cluster.totalLongitude / cluster.places.length;
      const dLatitude = (place.coordinate.latitude - avgLatitude) * 111;
      const dLongitude = (place.coordinate.longitude - avgLongitude) * 111 * Math.cos(avgLatitude * Math.PI / 180);
      const dist = Math.sqrt(dLatitude * dLatitude + dLongitude * dLongitude);

      if (dist <= thresholdKilometers) {
        cluster.places.push(place);
        cluster.totalLatitude += place.coordinate.latitude;
        cluster.totalLongitude += place.coordinate.longitude;
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters.push({
        id: `cluster_${place.id}`,
        places: [place],
        totalLatitude: place.coordinate.latitude,
        totalLongitude: place.coordinate.longitude,
      });
    }
  }

  return clusters.map((c): ExploreMarkerItem => {
    if (c.places.length === 1) {
      const singlePlace = c.places[0];
      return {
        type: 'place',
        id: singlePlace.id,
        place: singlePlace,
      };
    }

    return {
      type: 'cluster',
      id: c.id,
      count: c.places.length,
      places: c.places,
      coordinate: {
        latitude: c.totalLatitude / c.places.length,
        longitude: c.totalLongitude / c.places.length,
      },
    };
  });
}
