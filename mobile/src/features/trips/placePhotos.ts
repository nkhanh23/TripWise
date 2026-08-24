import { useEffect, useState } from 'react';

import type { ResolvedImage } from '../../integration/contracts';
import type { PlaceImageRepository, TripCoverImageRepository } from '../../integration/repositories';
import type { TripDetailData } from './types';

export function useTripPlacePhotos(
  tripData: TripDetailData | null,
  placeRepository?: PlaceImageRepository,
  coverRepository?: TripCoverImageRepository,
) {
  const [heroImage, setHeroImage] = useState<ResolvedImage | null>(null);
  const [itemImages, setItemImages] = useState<Record<string, ResolvedImage>>({});

  useEffect(() => {
    if (!tripData?.days?.length) return;
    const activeTrip = tripData;
    const controller = new AbortController();
    const verifiedIds = [...new Set(activeTrip.days.flatMap((day) => day.items)
      .filter((item) => item.resolution === 'VERIFIED' && item.googlePlaceId)
      .map((item) => item.googlePlaceId as string))];

    async function load(): Promise<void> {
      if (!activeTrip.heroImageUrl && coverRepository) {
        const image = await coverRepository.getTripCover({
          googlePlaceIds: verifiedIds,
          destination: activeTrip.destination,
          maxWidth: 1200,
        }, controller.signal).catch(() => null);
        if (image?.uri && !controller.signal.aborted) setHeroImage(image);
      }
      if (!placeRepository) return;
      for (const googlePlaceId of verifiedIds) {
        if (controller.signal.aborted) return;
        const image = await placeRepository.getPlaceImage({ googlePlaceId, maxWidth: 600 }, controller.signal)
          .catch(() => null);
        if (image?.uri && !controller.signal.aborted) {
          setItemImages((current) => ({ ...current, [googlePlaceId]: image }));
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [coverRepository, placeRepository, tripData]);

  return {
    heroImage,
    heroPhotoUrl: tripData?.heroImageUrl || heroImage?.uri || null,
    itemImages,
  };
}
