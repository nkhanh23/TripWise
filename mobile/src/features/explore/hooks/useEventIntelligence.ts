import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  EventCandidate,
  EventIntelligenceRepository,
  EventIntelligenceRequest,
} from '../../../integration/eventIntelligenceContract';
import { validateEventIntelligenceRequest } from '../../../integration/eventIntelligenceContract';
import { getCachedEventIntelligenceRepository } from '../../../integration/intelligenceComposition';
import type { IntelligenceFreshnessState } from '../../../integration/intelligenceFreshnessPolicy';
import { supabase } from '../../../lib/supabase/client';

export type UseEventIntelligenceResult = {
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  events: EventCandidate[];
  freshness: IntelligenceFreshnessState | null;
  isFallback: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function useEventIntelligence(
  request: EventIntelligenceRequest | null,
  repository?: EventIntelligenceRepository,
): UseEventIntelligenceResult {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'empty' | 'error'>('idle');
  const [events, setEvents] = useState<EventCandidate[]>([]);
  const [freshness, setFreshness] = useState<IntelligenceFreshnessState | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);
  const repo = repository ?? getCachedEventIntelligenceRepository();

  const fetchEvents = useCallback(
    async (req: EventIntelligenceRequest, signal?: AbortSignal) => {
      let validatedReq: EventIntelligenceRequest;
      try {
        validatedReq = validateEventIntelligenceRequest(req);
      } catch {
        setStatus('idle');
        return;
      }

      setStatus('loading');
      setError(null);

      try {
        if ('discoverWithFreshness' in repo && typeof (repo as any).discoverWithFreshness === 'function') {
          const classification = await (repo as any).discoverWithFreshness(validatedReq, signal);
          if (signal?.aborted) return;

          const candidates = classification.data?.events ?? [];
          setEvents(candidates);
          setFreshness(classification.state);
          setIsFallback(Boolean(classification.isFallback));
          setStatus(candidates.length === 0 ? 'empty' : 'success');
        } else {
          const result = await repo.discover(validatedReq, signal);
          if (signal?.aborted) return;

          const candidates = result?.events ?? [];
          setEvents(candidates);
          setFreshness('FRESH');
          setIsFallback(false);
          setStatus(candidates.length === 0 ? 'empty' : 'success');
        }
      } catch (err: any) {
        if (signal?.aborted) return;
        if (err?.code === 'cancelled') return;

        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [repo],
  );

  const refetch = useCallback(async () => {
    if (!request) return;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    await fetchEvents(request, controller.signal);
  }, [fetchEvents, request]);

  useEffect(() => {
    if (!request) {
      return;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        void fetchEvents(request, controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [fetchEvents, request]);

  // Purge UI state immediately on user sign-out
  useEffect(() => {
    if (!supabase?.auth?.onAuthStateChange) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        activeControllerRef.current?.abort();
        setEvents([]);
        setFreshness(null);
        setIsFallback(false);
        setStatus('idle');
        setError(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    status,
    events,
    freshness,
    isFallback,
    error,
    refetch,
  };
}
