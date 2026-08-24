import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import type { ResolvedImage, WikimediaImageRequest } from '../contracts';
import { mapWikimediaImageError, readFunctionErrorPayload } from '../errors';
import type { DestinationCoverRepository, WikimediaImageRepository } from '../repositories';
import { executeWithReliability, supabaseReadPolicy } from '../reliability';
import { parseWikimediaImageSuccess, validateWikimediaImageRequest } from '../validation';

const cacheTtlMilliseconds = 1000 * 60 * 60 * 6;

type CachedImage = { image: ResolvedImage; cachedAt: number };

export class SupabaseWikimediaImageRepository
implements WikimediaImageRepository, DestinationCoverRepository {
  private static readonly memoryCache = new Map<string, CachedImage>();

  constructor(private readonly client: SupabaseClient<Database>) {}

  async getImage(request: WikimediaImageRequest, signal?: AbortSignal): Promise<ResolvedImage> {
    const body = validateWikimediaImageRequest(request);
    const identity = body.kind === 'PLACE' ? body.googlePlaceId : body.destination.toLocaleLowerCase();
    const cacheKey = `${body.kind}_${identity}_${body.maxWidth ?? 800}`;
    const cached = SupabaseWikimediaImageRepository.memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < cacheTtlMilliseconds) return cached.image;

    return executeWithReliability(async (attemptSignal) => {
      const { data, error } = await this.client.functions.invoke('get-wikimedia-image', {
        body,
        signal: attemptSignal,
      });
      if (error) {
        const payload = await readFunctionErrorPayload(error);
        throw mapWikimediaImageError(payload ?? error);
      }
      const image = parseWikimediaImageSuccess(data).data;
      SupabaseWikimediaImageRepository.memoryCache.set(cacheKey, { image, cachedAt: Date.now() });
      return image;
    }, supabaseReadPolicy, signal);
  }

  getDestinationCover(
    destination: string,
    maxWidth?: number,
    signal?: AbortSignal,
  ): Promise<ResolvedImage> {
    return this.getImage({ kind: 'DESTINATION', destination, ...(maxWidth ? { maxWidth } : {}) }, signal);
  }

  static clearCache(): void {
    SupabaseWikimediaImageRepository.memoryCache.clear();
  }
}
