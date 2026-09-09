import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../lib/supabase/database.types';
import { type CandidateDiscoveryRepository, type CandidateDiscoveryRequest, type DiscoveryCandidate, validateCandidateDiscoveryRequest, validateDiscoveryCandidates } from '../candidateDiscoveryContract';
import { IntegrationError } from '../errors';
import { SupabaseExplorePlacesRepository } from './supabaseExplorePlacesRepository';

/** Reuses only normalized discovery transport; Explore UI/review semantics remain separate. */
export class SupabaseCandidateDiscoveryRepository implements CandidateDiscoveryRepository {
  private readonly transport: SupabaseExplorePlacesRepository;

  constructor(private readonly client: SupabaseClient<Database>) {
    this.transport = new SupabaseExplorePlacesRepository(client);
  }

  async discover(request: CandidateDiscoveryRequest, signal?: AbortSignal): Promise<DiscoveryCandidate[]> {
    const body = validateCandidateDiscoveryRequest(request);
    if (signal?.aborted) throw new IntegrationError('cancelled');
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    // Any session transition invalidates this ephemeral operation, including A -> B -> A.
    const { data: { subscription } } = this.client.auth.onAuthStateChange((event) => {
      if (event !== 'INITIAL_SESSION' && event !== 'TOKEN_REFRESHED') controller.abort();
    });
    try {
      const places = await this.transport.discover(body, controller.signal);
      if (controller.signal.aborted) throw new IntegrationError('cancelled');
      const receivedAt = new Date().toISOString();
      const candidates = validateDiscoveryCandidates(places.map(({ categoryLabel: _label, ...place }) => ({
        ...place, kind: 'google-place-candidate', status: 'DISCOVERED', review: 'REVIEW_REQUIRED',
        provenance: { provider: 'google-places', boundary: 'explore-places', observation: 'CLIENT_RECEIVED', receivedAt },
      })), body.limit);
      if (body.category !== 'all' && candidates.some((candidate) => candidate.category !== body.category)) {
        throw new IntegrationError('invalidResponse');
      }
      return candidates;
    } finally {
      subscription.unsubscribe();
      signal?.removeEventListener('abort', cancel);
    }
  }
}
