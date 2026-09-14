import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../../lib/supabase/database.types';
import type { AuthenticatedSession } from '../contracts';
import { IntegrationError, mapWorkspaceMutationError } from '../errors';
import { executeWithReliability, supabaseMutationPolicy } from '../reliability';
import {
  parseTripTimezoneMutationResult, validateSetTripTimezoneCommand,
  type SetTripTimezoneCommand, type TripTimezoneMutationResult,
} from '../tripTimezone';

/** Explicit saved-trip confirmation only. No UI mount, provider, retry or notification. */
export class SupabaseTripTimezoneRepository {
  constructor(private readonly client: SupabaseClient<Database>,
    private readonly getSession: () => AuthenticatedSession | null) {}

  async set(command: SetTripTimezoneCommand, signal?: AbortSignal): Promise<TripTimezoneMutationResult> {
    let input: SetTripTimezoneCommand;
    try { input = validateSetTripTimezoneCommand(command); }
    catch { throw new IntegrationError('invalidRequest'); }
    const session = this.getSession();
    const ownerId = session?.user.id;
    const assertSession = () => {
      const current = this.getSession();
      if (!session || !ownerId || current !== session || current.user.id !== ownerId
        || (current.expiresAt !== null && current.expiresAt * 1000 <= Date.now())) {
        throw new IntegrationError('unauthorized');
      }
    };
    assertSession();
    return executeWithReliability(async attemptSignal => {
      assertSession();
      const { data, error } = await this.client.rpc('set_trip_timezone', { p_command: input as unknown as Json })
        .abortSignal(attemptSignal);
      assertSession();
      if (error) throw mapWorkspaceMutationError(error);
      try { return parseTripTimezoneMutationResult(data,input); }
      catch { throw new IntegrationError('invalidResponse'); }
    },supabaseMutationPolicy,signal);
  }
}
