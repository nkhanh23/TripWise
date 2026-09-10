import { useCallback, useEffect, useRef, useState } from 'react';
import type { GooglePlaceId } from '../../../integration/contracts';
import { getCachedPlaceIntelligenceRepository } from '../../../integration/intelligenceComposition';
import type { IntelligenceFreshnessState } from '../../../integration/intelligenceFreshnessPolicy';
import type {
  PlaceIntelligence,
  PlaceIntelligenceRepository,
} from '../../../integration/placeIntelligenceContract';
import { asGooglePlaceId } from '../../../integration/validation';
import { supabase } from '../../../lib/supabase/client';

export type UsePlaceIntelligenceResult = {
  status: 'idle' | 'loading' | 'success' | 'error';
  intelligence: PlaceIntelligence | null;
  freshness: IntelligenceFreshnessState | null;
  isFallback: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

export function usePlaceIntelligence(
  placeId: string | undefined,
  repository?: PlaceIntelligenceRepository,
): UsePlaceIntelligenceResult {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [intelligence, setIntelligence] = useState<PlaceIntelligence | null>(null);
  const [freshness, setFreshness] = useState<IntelligenceFreshnessState | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const activeControllerRef = useRef<AbortController | null>(null);
  const activePlaceIdRef = useRef<string | undefined>(placeId);

  const repo = repository ?? getCachedPlaceIntelligenceRepository();

  const fetchIntelligence = useCallback(
    async (targetPlaceId: string, signal?: AbortSignal) => {
      // Validate place ID format before initiating network call
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(targetPlaceId)) {
        setStatus('idle');
        setIntelligence(null);
        setFreshness(null);
        setIsFallback(false);
        setError(null);
        return;
      }

      setStatus('loading');
      setError(null);

      try {
        let validId: GooglePlaceId;
        try {
          validId = asGooglePlaceId(targetPlaceId);
        } catch {
          setStatus('idle');
          return;
        }

        // Check if repo supports freshness classification directly
        if ('getIntelligenceWithFreshness' in repo && typeof (repo as any).getIntelligenceWithFreshness === 'function') {
          const classification = await (repo as any).getIntelligenceWithFreshness(validId, signal);
          if (signal?.aborted || activePlaceIdRef.current !== targetPlaceId) return;

          setIntelligence(classification.data);
          setFreshness(classification.state);
          setIsFallback(Boolean(classification.isFallback));
          setStatus('success');
        } else {
          const data = await repo.getIntelligence(validId, signal);
          if (signal?.aborted || activePlaceIdRef.current !== targetPlaceId) return;

          setIntelligence(data);
          setFreshness('FRESH');
          setIsFallback(false);
          setStatus('success');
        }
      } catch (err: any) {
        if (signal?.aborted || activePlaceIdRef.current !== targetPlaceId) return;
        if (err?.code === 'cancelled') return;

        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    },
    [repo],
  );

  const refetch = useCallback(async () => {
    if (!placeId) return;
    activeControllerRef.current?.abort();
    const controller = new AbortController();
    activeControllerRef.current = controller;
    await fetchIntelligence(placeId, controller.signal);
  }, [fetchIntelligence, placeId]);

  useEffect(() => {
    activePlaceIdRef.current = placeId;
    if (!placeId) {
      return;
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        void fetchIntelligence(placeId, controller.signal);
      }
    });

    return () => {
      controller.abort();
    };
  }, [fetchIntelligence, placeId]);

  // Purge UI state immediately on user sign-out
  useEffect(() => {
    if (!supabase?.auth?.onAuthStateChange) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        activeControllerRef.current?.abort();
        setIntelligence(null);
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
    intelligence,
    freshness,
    isFallback,
    error,
    refetch,
  };
}
