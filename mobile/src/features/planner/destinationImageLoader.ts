import type { ResolvedImage } from '../../integration/contracts';
import { maximumConcurrentImageRequests } from '../../integration/imageResolution';
import type { DestinationCoverRepository } from '../../integration/repositories';
import type { DestinationOption } from './types';

export const maximumDestinationImageResults = 6;

type LoadDestinationImagesArgs = {
  destinations: DestinationOption[];
  repository: DestinationCoverRepository;
  requestedIds: Set<string>;
  signal: AbortSignal;
  onResolved: (destinationId: string, image: ResolvedImage) => void;
};

export async function loadDestinationImages({
  destinations,
  repository,
  requestedIds,
  signal,
  onResolved,
}: LoadDestinationImagesArgs): Promise<void> {
  const scheduledIds = new Set<string>();
  const missing = destinations
    .filter((destination) => {
      if (destination.imageUrl || requestedIds.has(destination.id) || scheduledIds.has(destination.id)) return false;
      scheduledIds.add(destination.id);
      return true;
    })
    .slice(0, maximumDestinationImageResults);
  let next = 0;

  const resolveNext = async () => {
    while (!signal.aborted && next < missing.length) {
      const destination = missing[next++];
      requestedIds.add(destination.id);
      try {
        const image = await repository.getDestinationCover(
          destination.imageQuery ?? [destination.name, destination.formattedAddress].filter(Boolean).join(', '),
          160,
          signal,
        );
        if (!signal.aborted) onResolved(destination.id, image);
        // A safe no-match is not an in-flight request. A later user action can
        // retry it, while the repository TTL still bounds provider work.
        if (!image.uri) requestedIds.delete(destination.id);
      } catch {
        requestedIds.delete(destination.id);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(maximumConcurrentImageRequests, missing.length) }, resolveNext));
}