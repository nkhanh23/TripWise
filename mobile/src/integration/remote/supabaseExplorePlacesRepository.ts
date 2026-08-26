import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import type { ExploreDiscoveredPlace, ExplorePlacesRequest } from '../contracts';
import { mapExplorePlacesError, readFunctionErrorPayload } from '../errors';
import type { ExplorePlacesRepository } from '../repositories';
import { executeWithReliability, supabaseMutationPolicy } from '../reliability';
import { parseExplorePlacesSuccess, validateExplorePlacesRequest } from '../validation';

export class SupabaseExplorePlacesRepository implements ExplorePlacesRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async discover(request: ExplorePlacesRequest, signal?: AbortSignal): Promise<ExploreDiscoveredPlace[]> {
    const body = validateExplorePlacesRequest(request);
    return executeWithReliability(async (attemptSignal) => {
      const { data, error } = await this.client.functions.invoke('explore-places', {
        body,
        signal: attemptSignal,
      });
      if (error) throw mapExplorePlacesError(await readFunctionErrorPayload(error));
      return parseExplorePlacesSuccess(data).data.places;
    }, supabaseMutationPolicy, signal);
  }
}
