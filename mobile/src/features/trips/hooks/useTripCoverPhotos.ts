import { useEffect, useMemo, useState } from 'react';

import type { ResolvedImage } from '../../../integration/contracts';
import { maximumConcurrentImageRequests } from '../../../integration/imageResolution';
import type { TripCoverImageRepository } from '../../../integration/repositories';
import type { TripSectionData } from '../types';

export const tripCoverMaximumCandidates = 2;
export const tripCoverMaximumConcurrency = maximumConcurrentImageRequests;
export const tripCoverThumbnailWidth = 600;

type TripCoverTask = {
  tripId: string;
  destination: string;
  googlePlaceIds: string[];
};

export function useTripCoverPhotos(
  sections: TripSectionData[],
  coverRepository?: TripCoverImageRepository,
): TripSectionData[] {
  const [coverImages, setCoverImages] = useState<Record<string, ResolvedImage>>({});
  const nextTasks = useMemo<TripCoverTask[]>(() => sections.flatMap((section) =>
    section.data.map((trip) => ({
      tripId: trip.id,
      destination: trip.destination,
      googlePlaceIds: (trip.coverGooglePlaceIds ?? []).slice(0, tripCoverMaximumCandidates),
    })),
  ), [sections]);
  const taskIdentity = useMemo(
    () => JSON.stringify(nextTasks),
    [nextTasks],
  );

  useEffect(() => {
    if (!coverRepository) return;

    const controller = new AbortController();
    const tasks = JSON.parse(taskIdentity) as TripCoverTask[];
    let nextTaskIndex = 0;

    const runWorker = async (): Promise<void> => {
      while (!controller.signal.aborted) {
        const task = tasks[nextTaskIndex];
        nextTaskIndex += 1;
        if (!task) return;

        const image = await coverRepository.getTripCover({
          googlePlaceIds: task.googlePlaceIds,
          destination: task.destination,
          maxWidth: tripCoverThumbnailWidth,
        }, controller.signal).catch(() => null);
        if (controller.signal.aborted) return;
        if (image?.uri) setCoverImages((current) => current[task.tripId]
          ? current
          : { ...current, [task.tripId]: image });
      }
    };

    const workerCount = Math.min(tripCoverMaximumConcurrency, tasks.length);
    void Promise.all(Array.from({ length: workerCount }, () => runWorker()));

    return () => controller.abort();
  }, [coverRepository, taskIdentity]);

  return useMemo(
    () => sections.map((section) => ({
      ...section,
      data: section.data.map((trip) => coverImages[trip.id]
        ? { ...trip, coverImage: coverImages[trip.id], coverImageUrl: coverImages[trip.id].uri ?? undefined }
        : trip),
    })),
    [coverImages, sections],
  );
}
