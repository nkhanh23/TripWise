import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import type { GetPlacePhotoRequest, PlacePhoto } from '../contracts';
import { mapPlacePhotoError, readFunctionErrorPayload } from '../errors';
import type { PlacePhotoRepository } from '../repositories';
import { executeWithReliability, supabaseReadPolicy } from '../reliability';
import { parseGetPlacePhotoSuccess, validateGetPlacePhotoRequest } from '../validation';

const cacheTtlMilliseconds = 1000 * 60 * 60 * 2; // 2 hours

type CachedPhotoEntry = {
  photo: PlacePhoto;
  cachedAt: number;
};

export class SupabasePlacePhotoRepository implements PlacePhotoRepository {
  private static readonly memoryCache = new Map<string, CachedPhotoEntry>();

  constructor(private readonly client: SupabaseClient<Database>) {}

  async getPhoto(request: GetPlacePhotoRequest, signal?: AbortSignal): Promise<PlacePhoto> {
    const body = validateGetPlacePhotoRequest(request);
    const cacheKey = `${body.googlePlaceId}_${body.maxWidth ?? 1200}`;

    const cached = SupabasePlacePhotoRepository.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cacheTtlMilliseconds) {
      return cached.photo;
    }

    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client.functions.invoke('get-place-photo', {
          body,
          signal: attemptSignal,
        });

        if (error) {
          const payload = await readFunctionErrorPayload(error);
          throw mapPlacePhotoError(payload ?? error);
        }

        const parsed = parseGetPlacePhotoSuccess(data).data;
        SupabasePlacePhotoRepository.memoryCache.set(cacheKey, {
          photo: parsed,
          cachedAt: Date.now(),
        });
        return parsed;
      },
      supabaseReadPolicy,
      signal
    );
  }

  static clearCache(): void {
    SupabasePlacePhotoRepository.memoryCache.clear();
  }
}
