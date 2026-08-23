import { useEffect, useRef, useState } from 'react';

import type { PlacePhotoRepository } from '../../integration/repositories';
import type { TripDetailData } from './types';

const maximumHeroCandidates = 3;

export function useTripPlacePhotos(
  tripData: TripDetailData | null,
  photoRepository?: PlacePhotoRepository
) {
  const [fetchedHeroUrl, setFetchedHeroUrl] = useState<string | null>(null);
  const [itemPhotos, setItemPhotos] = useState<Record<string, string | null>>({});
  const activeControllers = useRef(new Map<string, AbortController>());

  const heroPhotoUrl = tripData?.heroImageUrl || fetchedHeroUrl;

  useEffect(() => {
    if (!photoRepository || !tripData || !tripData.days || tripData.days.length === 0) {
      return;
    }

    const controllersMap = activeControllers.current;
    const controller = new AbortController();
    controllersMap.set('trip_photos', controller);

    // Collect verified items with valid googlePlaceId across the trip
    const verifiedItems = tripData.days
      .flatMap((day) => day.items)
      .filter((item) => item.resolution === 'VERIFIED' && Boolean(item.googlePlaceId));

    const uniquePlaceIds = Array.from(new Set(verifiedItems.map((item) => item.googlePlaceId!)));

    if (uniquePlaceIds.length === 0) {
      return () => {
        controller.abort();
        controllersMap.delete('trip_photos');
      };
    }

    async function loadPhotos() {
      // 1. Determine Hero Photo if not already set by custom/mock data
      if (!tripData?.heroImageUrl) {
        const heroCandidates = uniquePlaceIds.slice(0, maximumHeroCandidates);
        for (const placeId of heroCandidates) {
          if (controller.signal.aborted) return;
          try {
            const result = await photoRepository!.getPhoto(
              { googlePlaceId: placeId, maxWidth: 1200 },
              controller.signal
            );
            if (result.photoUri) {
              setFetchedHeroUrl(result.photoUri);
              setItemPhotos((prev) => ({ ...prev, [placeId]: result.photoUri }));
              break;
            }
          } catch {
            // Fall through to next candidate
          }
        }
      }

      // 2. Fetch item photos for verified places in the trip (bounded sequence)
      for (const placeId of uniquePlaceIds) {
        if (controller.signal.aborted) return;
        try {
          const result = await photoRepository!.getPhoto(
            { googlePlaceId: placeId, maxWidth: 600 },
            controller.signal
          );
          if (result.photoUri) {
            setItemPhotos((prev) => ({ ...prev, [placeId]: result.photoUri }));
          }
        } catch {
          // Ignore individual photo fetch failure
        }
      }
    }

    void loadPhotos();

    return () => {
      controller.abort();
      controllersMap.delete('trip_photos');
    };
  }, [tripData, photoRepository]);

  return {
    heroPhotoUrl,
    itemPhotos,
  };
}
