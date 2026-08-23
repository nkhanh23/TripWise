import { useCallback, useEffect, useRef, useState } from 'react';

import { IntegrationError, mapUnknownTransportError } from '../../integration/errors';
import { SupabaseTripGenerationRepository } from '../../integration/remote/supabaseTripRepositories';
import type { TripGenerationRepository } from '../../integration/repositories';
import { mapGeneratedTripToPlannerPreview, mapWizardStateToGenerateTripRequest } from './generationContracts';
import type { CreateTripWizardState } from './types';
import type { PlannerGeneratedPreview } from './generationContracts';

export { mapGeneratedTripToPlannerPreview, mapWizardStateToGenerateTripRequest } from './generationContracts';
export type { PlannerGeneratedPreview } from './generationContracts';

export type TripGenerationState =
  | { status: 'idle'; preview: null; error: null }
  | { status: 'generating'; preview: null; error: null }
  | { status: 'success'; preview: PlannerGeneratedPreview; error: null }
  | { status: 'error'; preview: null; error: IntegrationError };

export function useTripGeneration(repository?: TripGenerationRepository) {
  const [state, setState] = useState<TripGenerationState>({ status: 'idle', preview: null, error: null });
  const controllerRef = useRef<AbortController | null>(null);
  const lastIntentRef = useRef<CreateTripWizardState | null>(null);
  const mountedRef = useRef(true);

  const cancel = useCallback(() => controllerRef.current?.abort(), []);

  useEffect(() => () => {
    mountedRef.current = false;
    controllerRef.current?.abort();
  }, []);

  const generate = useCallback(async (intent: CreateTripWizardState) => {
    if (controllerRef.current) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    lastIntentRef.current = intent;
    setState({ status: 'generating', preview: null, error: null });
    try {
      const activeRepository = repository ?? new SupabaseTripGenerationRepository(
        (await import('../../lib/supabase/client')).supabase,
      );
      const generated = await activeRepository.generate(mapWizardStateToGenerateTripRequest(intent), controller.signal);
      const preview = mapGeneratedTripToPlannerPreview(generated);
      if (mountedRef.current) setState({ status: 'success', preview, error: null });
      return preview;
    } catch (error) {
      const mapped = mapUnknownTransportError(error);
      if (mountedRef.current && mapped.code !== 'cancelled') {
        setState({ status: 'error', preview: null, error: mapped });
      }
      return null;
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [repository]);

  const retry = useCallback(async () => {
    if (!lastIntentRef.current) return null;
    return generate(lastIntentRef.current);
  }, [generate]);

  return { state, generate, retry, cancel };
}
