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
import { BoundedLruCache, PLACE_METADATA_LEGACY_TTL_MS } from '../intelligenceFreshnessPolicy';

// Bounded LRU cache replacing unbounded Map for legacy metadata. Capacity 64.
const memoryCache = new BoundedLruCache<{ timestamp: number; data: PlaceMetadata }>(64);

export class SupabasePlaceMetadataRepository implements PlaceMetadataRepository, PlaceIntelligenceRepository {
  private readonly authSubscription?: { unsubscribe: () => void };

  constructor(private readonly supabase: SupabaseClient<Database>) {
    if (this.supabase?.auth?.onAuthStateChange) {
      const { data } = this.supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          this.clearCache();
        }
      });
      this.authSubscription = data?.subscription;
    }
  }

  dispose(): void {
    this.authSubscription?.unsubscribe();
  }

  static clearCache(): void {
    memoryCache.clear();
  }

  clearCache(): void {
    memoryCache.clear();
  }

  async getMetadata(googlePlaceId: string, signal?: AbortSignal): Promise<PlaceMetadata> {
    const cached = memoryCache.get(googlePlaceId);
    if (cached && (Date.now() - cached.timestamp < PLACE_METADATA_LEGACY_TTL_MS)) {
      return { ...cached.data };
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
      data: { ...metadata },
    });

    return { ...metadata };
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
