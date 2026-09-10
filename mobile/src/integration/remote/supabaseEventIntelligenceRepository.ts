import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../lib/supabase/database.types';
import { type EventIntelligenceRepository, type EventIntelligenceRequest, parseEventIntelligenceResponse, validateEventIntelligenceRequest } from '../eventIntelligenceContract';
import { IntegrationError, type IntegrationErrorCode, readFunctionErrorPayload } from '../errors';
import { executeWithReliability, supabaseMutationPolicy } from '../reliability';
import { isRecord } from '../validation';

const errors: Record<string, IntegrationErrorCode> = {
  EVENT_INPUT_INVALID: 'invalidRequest', UNAUTHORIZED: 'unauthorized',
  EVENT_PROVIDER_CONFIG_MISSING: 'providerUnavailable', EVENT_PROVIDER_AUTH: 'providerUnavailable',
  EVENT_PROVIDER_RATE_LIMITED: 'rateLimited', EVENT_PROVIDER_UNAVAILABLE: 'providerUnavailable',
  EVENT_PROVIDER_TIMEOUT: 'timeout', EVENT_CANCELLED: 'cancelled',
  EVENT_PROVIDER_INVALID_RESPONSE: 'invalidResponse', INTERNAL_ERROR: 'providerUnavailable',
};
export function mapEventIntelligenceError(value: unknown, status?: number): IntegrationError {
  const code = isRecord(value) && isRecord(value.error) && typeof value.error.code === 'string' ? value.error.code : '';
  if (Object.prototype.hasOwnProperty.call(errors, code)) return new IntegrationError(errors[code]);
  if (status === 401) return new IntegrationError('unauthorized');
  if (status === 403) return new IntegrationError('forbidden');
  if (status === 429) return new IntegrationError('rateLimited');
  if (status && status >= 500) return new IntegrationError(status === 504 ? 'timeout' : 'providerUnavailable');
  return new IntegrationError('invalidResponse');
}

/** One active operation per repository instance. No completed-result retention. */
export class SupabaseEventIntelligenceRepository implements EventIntelligenceRepository {
  private active?: AbortController;
  constructor(private readonly client: SupabaseClient<Database>) {}
  cancel(): void { this.active?.abort(); }
  async discover(request: EventIntelligenceRequest, signal?: AbortSignal) {
    let body: EventIntelligenceRequest;
    try { body = validateEventIntelligenceRequest(request); } catch { throw new IntegrationError('invalidRequest'); }
    if (signal?.aborted) throw new IntegrationError('cancelled');
    this.cancel();
    const controller = new AbortController(); this.active = controller;
    const cancel = () => controller.abort(); signal?.addEventListener('abort', cancel, { once: true });
    const { data: { subscription } } = this.client.auth.onAuthStateChange((event) => {
      if (event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') controller.abort();
    });
    try {
      return await executeWithReliability(async (attemptSignal) => {
        const { data, error } = await this.client.functions.invoke('discover-events', { body, signal: attemptSignal });
        if (attemptSignal.aborted) throw new IntegrationError('cancelled');
        if (error) {
          const status = isRecord(error.context) && typeof error.context.status === 'number' ? error.context.status : undefined;
          const payload = await readFunctionErrorPayload(error);
          if (attemptSignal.aborted) throw new IntegrationError('cancelled');
          throw mapEventIntelligenceError(payload, status);
        }
        try { return parseEventIntelligenceResponse(data, body.limit); } catch { throw new IntegrationError('invalidResponse'); }
      }, supabaseMutationPolicy, controller.signal);
    } finally {
      subscription.unsubscribe(); signal?.removeEventListener('abort', cancel);
      if (this.active === controller) this.active = undefined;
    }
  }
}
