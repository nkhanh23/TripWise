import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../lib/supabase/database.types';
import { IntegrationError, mapPostgrestError } from '../errors';
import { parseTripFxContext, type TripFxContext, type TripFxContextRepository } from '../fxContract';
import { executeWithReliability, supabaseReadPolicy } from '../reliability';
import { ContractValidationError } from '../validation';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupabaseTripFxContextRepository implements TripFxContextRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getTripFxContext(tripId: string, signal?: AbortSignal): Promise<TripFxContext> {
    if (typeof tripId !== 'string' || !uuidRegex.test(tripId)) {
      throw new ContractValidationError('trip fx context');
    }

    return executeWithReliability(async attemptSignal => {
      const { data, error } = await this.client.rpc('get_trip_fx_context', {
        p_request: { tripId } as unknown as Json,
      }).abortSignal(attemptSignal);

      if (error?.code === 'P0002') throw new IntegrationError('notFound');
      if (error) throw mapPostgrestError(error);

      const context = parseTripFxContext(data);
      if (context.tripId !== tripId.toLowerCase()) throw new IntegrationError('invalidResponse');
      return context;
    }, supabaseReadPolicy, signal);
  }
}
