import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlaceMetadata } from '../contracts';
import type { PlaceMetadataRepository } from '../repositories';

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
}