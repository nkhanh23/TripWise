import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';
import type { GooglePlaceId, PlaceMetadata } from '../contracts';
import { mapPlaceMetadataError, readFunctionErrorPayload } from '../errors';
import type {
  PlaceIntelligence,
  PlaceIntelligenceRepository,
} from '../placeIntelligenceContract';
import { validatePlaceIntelligence } from '../placeIntelligenceContract';
import type { PlaceMetadataRepository } from '../repositories';
import { asGooglePlaceId } from '../validation';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const memoryCache = new Map<string, { timestamp: number; data: PlaceMetadata }>();

export class SupabasePlaceMetadataRepository implements PlaceMetadataRepository, PlaceIntelligenceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

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
      const payload = await readFunctionErrorPayload(error);
      throw mapPlaceMetadataError(payload ?? error);
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

  async getIntelligence(googlePlaceId: GooglePlaceId, signal?: AbortSignal): Promise<PlaceIntelligence> {
    const id = asGooglePlaceId(googlePlaceId);

    if (signal?.aborted) {
      throw mapPlaceMetadataError(new DOMException('This operation was aborted', 'AbortError'));
    }

    const { data, error } = await this.supabase.functions.invoke('get-place-metadata', {
      body: { googlePlaceId: id },
      ...(signal && { signal }),
    });

    if (signal?.aborted) {
      throw mapPlaceMetadataError(new DOMException('This operation was aborted', 'AbortError'));
    }

    if (error) {
      const payload = await readFunctionErrorPayload(error);
      throw mapPlaceMetadataError(payload ?? error);
    }

    if (!data || typeof data !== 'object' || !('data' in data)) {
      throw mapPlaceMetadataError({ error: { code: 'PLACE_PROVIDER_INVALID_RESPONSE' } });
    }

    const receivedAt = new Date().toISOString();
    return validatePlaceIntelligence(data.data, receivedAt);
  }
}

export { SupabasePlaceMetadataRepository as SupabasePlaceIntelligenceRepository };