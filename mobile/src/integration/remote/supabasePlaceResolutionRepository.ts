import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import type { ResolvePlaceRequest, ResolvePlaceResult } from '../contracts';
import { mapResolvePlaceError, readFunctionErrorPayload } from '../errors';
import type { PlaceResolutionRepository } from '../repositories';
import { executeWithReliability, supabaseMutationPolicy } from '../reliability';
import { parseResolvePlaceSuccess, validateResolvePlaceRequest } from '../validation';

export class SupabasePlaceResolutionRepository implements PlaceResolutionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async resolve(request: ResolvePlaceRequest, signal?: AbortSignal): Promise<ResolvePlaceResult> {
    const body = validateResolvePlaceRequest(request);
    return executeWithReliability(async (attemptSignal) => {
      const { data, error } = await this.client.functions.invoke('resolve-place', { body, signal: attemptSignal });
      if (error) throw mapResolvePlaceError(await readFunctionErrorPayload(error));
      return parseResolvePlaceSuccess(data).data;
    }, supabaseMutationPolicy, signal);
  }
}
