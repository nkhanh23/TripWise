import { useEffect, useMemo, useState } from 'react';

import type { ResolvedImage } from '../../integration/contracts';
import type { PlaceImageRepository, TripCoverImageRepository } from '../../integration/repositories';
import type { TripDetailData } from './types';

type TripImageResolutionInput = {
  destination: string;
  hasDays: boolean;
  heroImageUrl: string;
  tripId: string;
  verifiedIds: string[];
};

export function useTripPlacePhotos(
  tripData: TripDetailData | null,
  placeRepository?: PlaceImageRepository,
  coverRepository?: TripCoverImageRepository,
) {
  const [heroImage, setHeroImage] = useState<ResolvedImage | null>(null);
  const [itemImages, setItemImages] = useState<Record<string, ResolvedImage>>({});
  const verifiedIds = useMemo(() => tripData
    ? [...new Set(tripData.days.flatMap((day) => day.items)
      .filter((item) => item.resolution === 'VERIFIED' && item.googlePlaceId)
      .map((item) => item.googlePlaceId as string))]
    : [], [tripData]);
  const resolutionIdentity = useMemo(() => JSON.stringify(tripData ? {
    destination: tripData.destination,
    hasDays: tripData.days.length > 0,
    heroImageUrl: tripData.heroImageUrl,
    tripId: tripData.id,
    verifiedIds,
  } satisfies TripImageResolutionInput : null), [tripData, verifiedIds]);

  useEffect(() => {
    const input = JSON.parse(resolutionIdentity) as TripImageResolutionInput | null;
    if (!input?.hasDays) return;
    const activeInput = input;
    const activeVerifiedIds = activeInput.verifiedIds;
    const controller = new AbortController();

    async function loadHero(): Promise<void> {
      if (!activeInput.heroImageUrl && coverRepository) {
        const image = await coverRepository.getTripCover({
          googlePlaceIds: activeVerifiedIds,
          destination: activeInput.destination,
          maxWidth: 1200,
        }, controller.signal).catch(() => null);
        if (image?.uri && !controller.signal.aborted) setHeroImage(image);
      }
    }

    async function loadItems(): Promise<void> {
      if (!placeRepository) return;
      for (const googlePlaceId of activeVerifiedIds) {
        if (controller.signal.aborted) return;
        const image = await placeRepository.getPlaceImage({ googlePlaceId, maxWidth: 600 }, controller.signal)
          .catch(() => null);
        if (image?.uri && !controller.signal.aborted) {
          setItemImages((current) => ({ ...current, [googlePlaceId]: image }));
        }
      }
    }
    void Promise.all([loadHero(), loadItems()]);
    return () => controller.abort();
  }, [coverRepository, placeRepository, resolutionIdentity]);

  return {
    heroImage,
    heroPhotoUrl: tripData?.heroImageUrl || heroImage?.uri || null,
    itemImages,
  };
}
