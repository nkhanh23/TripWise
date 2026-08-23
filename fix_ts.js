const fs = require('fs');

const repoContent = `import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlaceMetadata, PlaceMetadataRepository } from '../contracts';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const memoryCache = new Map<string, { timestamp: number, data: PlaceMetadata }>();

export class SupabasePlaceMetadataRepository implements PlaceMetadataRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getMetadata(googlePlaceId: string, signal?: AbortSignal): Promise<PlaceMetadata> {
    const cached = memoryCache.get(googlePlaceId);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return cached.data;
    }

    const { data, error } = await this.supabase.functions.invoke('get-place-metadata', {
      body: { googlePlaceId },
      ...(signal && { signal }),
    });

    if (error) {
      throw error;
    }

    const metadata: PlaceMetadata = {
      googlePlaceId: data?.data?.googlePlaceId ?? googlePlaceId,
      rating: data?.data?.rating,
      userRatingCount: data?.data?.userRatingCount,
    };

    memoryCache.set(googlePlaceId, {
      timestamp: Date.now(),
      data: metadata,
    });

    return metadata;
  }
}`;
fs.writeFileSync('mobile/src/integration/remote/supabasePlaceMetadataRepository.ts', repoContent, 'utf8');

let hookContent = fs.readFileSync('mobile/src/features/saved/hooks/useSavedPlaces.ts', 'utf8');

hookContent = hookContent.replace(
  '{ customPlaces, repository, photoRepository, metadataRepository } = {}',
  '{ customPlaces, repository, photoRepository, metadataRepository }: UseSavedPlacesOptions = {}'
);

hookContent = hookContent.replace(
  /type UseSavedPlacesOptions = \{[\s\S]*?\};/,
  'type UseSavedPlacesOptions = { customPlaces?: import(\'../../../../src/features/saved/hooks/useSavedPlaces\').SavedPlaceUIItem[]; repository?: import(\'../../../integration/repositories\').SavedPlacesRepository; photoRepository?: import(\'../../../integration/repositories\').PlacePhotoRepository; metadataRepository?: import(\'../../../integration/repositories\').PlaceMetadataRepository; };'
);

hookContent = hookContent.replace(
  '}, [normalizedCustomPlaces, isFixture, effectiveRepository, effectivePhotoRepository, photoUrls]);',
  '}, [normalizedCustomPlaces, isFixture, effectiveRepository, effectivePhotoRepository, effectiveMetadataRepository, photoUrls, ratings]);'
);

hookContent = hookContent.replace(
  '}, [normalizedCustomPlaces, isFixture, effectiveRepository, effectivePhotoRepository]);',
  '}, [normalizedCustomPlaces, isFixture, effectiveRepository, effectivePhotoRepository, effectiveMetadataRepository]);'
);

hookContent = hookContent.replace(
  '}, [activePlaces, photoUrls, ratings]);',
  '}, [activePlaces, photoUrls, ratings, metadataRepository]);'
);

fs.writeFileSync('mobile/src/features/saved/hooks/useSavedPlaces.ts', hookContent, 'utf8');

