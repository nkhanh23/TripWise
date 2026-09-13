import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../lib/supabase/database.types';
import type { AuthenticatedSession } from '../contracts';
import { IntegrationError } from '../errors';
import { executeWithReliability, supabaseReadPolicy } from '../reliability';
import { ContractValidationError } from '../validation';
import {
  mapTripProgressError, parseProgressEventPage, parseTripProgressState, validateProgressReadRequest,
  type ProgressReadRequest, type TripProgressRepository,
} from '../tripProgress';

/** Foundation only: no UI mount, polling, cache, lifecycle write or notification side effect.
 * Session getter must return the current immutable auth-context session object. */
export class SupabaseTripProgressRepository implements TripProgressRepository {
  constructor(private readonly client: SupabaseClient<Database>,
    private readonly getSession: () => AuthenticatedSession | null) {}

  private async read<T>(input: ProgressReadRequest, parse: (value: unknown, request: ProgressReadRequest) => T, signal?: AbortSignal): Promise<T> {
    let request: ProgressReadRequest;
    try { request = validateProgressReadRequest(input); }
    catch { throw new IntegrationError('invalidRequest'); }
    const session = this.getSession();
    const userId = session?.user.id;
    const assertSession = () => {
      const current = this.getSession();
      if (!session || !userId || current !== session || current.user.id !== userId
        || (current.expiresAt !== null && current.expiresAt * 1000 <= Date.now())) {
        throw new IntegrationError('unauthorized');
      }
    };
    assertSession();
    return executeWithReliability(async attemptSignal => {
      assertSession();
      const { data,error } = await this.client.rpc('read_trip_progress', { p_request: request as unknown as Json }).abortSignal(attemptSignal);
      assertSession();
      if (error) throw mapTripProgressError(error);
      try { return parse(data, request); }
      catch (error) {
        if (error instanceof ContractValidationError) throw new IntegrationError('invalidResponse');
        throw error;
      }
    }, supabaseReadPolicy,signal);
  }
  getState(tripId: string, signal?: AbortSignal) {
    return this.read({ tripId,kind:'state' }, value => {
      const result = parseTripProgressState(value);
      if (result.tripId !== tripId.toLowerCase()) throw new IntegrationError('invalidResponse');
      return result;
    },signal);
  }
  listEvents(input: Extract<ProgressReadRequest,{kind:'events'}>, signal?: AbortSignal) {
    return this.read(input, (value, request) => {
      if (request.kind !== 'events') throw new IntegrationError('invalidRequest');
      return parseProgressEventPage(value, request);
    },signal);
  }
}
