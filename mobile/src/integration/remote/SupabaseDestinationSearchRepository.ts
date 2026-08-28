import { supabase } from '../../lib/supabase/client';
import type { DestinationOption } from '../../features/planner/types';
import type { DestinationSearchRepository } from '../repositories/DestinationSearchRepository';
import { IntegrationError } from '../errors';

export class SupabaseDestinationSearchRepository implements DestinationSearchRepository {
  async search(query: string, signal?: AbortSignal): Promise<DestinationOption[]> {
    const { data, error } = await supabase.functions.invoke('search-destinations', {
      body: { query },
      signal,
    });
    if (error) {
      if (error.name === 'AbortError') throw error;
      throw new IntegrationError('unavailable');
    }
    return (data?.data || []).map((item: any) => ({
      id: item.googlePlaceId || item.id,
      name: item.name,
      country: item.formattedAddress || item.country,
      imageUrl: '',
    }));
  }
}

