import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

import { useTripGeneration } from '../generation';
import type { PlannerGeneratedPreview } from '../generationContracts';
import { useTripPersistence } from '../persistence';
import type { CreateTripWizardState } from '../types';
import type { TripGenerationRepository, TripPersistenceRepository } from '../../../integration/repositories';
import { FPS, LIFECYCLE_BOUNDARIES } from './timeline';

export type MotionLifecycleStatus = 'IDLE' | 'SUBMITTING' | 'GENERATING' | 'GENERATION_HOLD' | 'GENERATION_SUCCESS' | 'SAVING' | 'SAVE_SUCCESS' | 'GENERATION_ERROR' | 'SAVE_ERROR';

export function useTripLifecycleCoordinator(generationRepo?: TripGenerationRepository, persistenceRepo?: TripPersistenceRepository) {
  const generation = useTripGeneration(generationRepo);
  const persistence = useTripPersistence(persistenceRepo);
  const [status, setStatus] = useState<MotionLifecycleStatus>('IDLE');
  const [frameAnim] = useState(() => new Animated.Value(0));
  const [draft, setDraft] = useState<PlannerGeneratedPreview | null>(null);
  const [tripId, setTripId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const statusRef = useRef<MotionLifecycleStatus>('IDLE');
  const frameRef = useRef(LIFECYCLE_BOUNDARIES.INITIAL);
  const wizardRef = useRef<CreateTripWizardState | null>(null);
  const draftRef = useRef<PlannerGeneratedPreview | null>(null);
  const tripIdRef = useRef<string | null>(null);
  const attemptRef = useRef(0);
  const generationStartedRef = useRef(false);
  const generationTransitionRef = useRef(false);
  const persistenceStartedRef = useRef(false);
  const savingExitRef = useRef(false);
  const successBoundaryRef = useRef(false);
  const generationErrorAttemptRef = useRef<number | null>(null);
  const persistenceErrorAttemptRef = useRef<number | null>(null);

  const setLifecycleStatus = useCallback((next: MotionLifecycleStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);
  useEffect(() => () => { mountedRef.current = false; attemptRef.current += 1; }, []);

  const resetTimelineOrigin = useCallback(() => {
    frameAnim.stopAnimation();
    frameRef.current = LIFECYCLE_BOUNDARIES.INITIAL;
    frameAnim.setValue(LIFECYCLE_BOUNDARIES.INITIAL);
  }, [frameAnim]);

  const playTo = useCallback((target: number, done?: () => void) => {
    if (!mountedRef.current) return;
    const from = frameRef.current;
    const next = Math.max(from, target);
    if (next === from) { done?.(); return; }
    Animated.timing(frameAnim, {
      toValue: next,
      duration: ((next - from) / FPS) * 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !mountedRef.current) return;
      frameRef.current = next;
      done?.();
    });
  }, [frameAnim]);

  const revealSuccess = useCallback(() => {
    if (!tripIdRef.current || !successBoundaryRef.current) return;
    setLifecycleStatus('SAVE_SUCCESS');
    playTo(LIFECYCLE_BOUNDARIES.END);
  }, [playTo, setLifecycleStatus]);

  const enterSuccessBoundary = useCallback(() => {
    successBoundaryRef.current = true;
    revealSuccess();
  }, [revealSuccess]);

  const resumeFromSavingHold = useCallback(() => {
    if (!tripIdRef.current || savingExitRef.current) return;
    savingExitRef.current = true;
    playTo(LIFECYCLE_BOUNDARIES.SAVING_HOLD_EXIT, () => {
      playTo(LIFECYCLE_BOUNDARIES.SUCCESS_REVEAL, enterSuccessBoundary);
    });
  }, [enterSuccessBoundary, playTo]);

  const acceptTripId = useCallback((id: string, attempt: number) => {
    if (!mountedRef.current || attempt !== attemptRef.current || !id) return;
    tripIdRef.current = id;
    setTripId(id);
    if (frameRef.current >= LIFECYCLE_BOUNDARIES.SAVING_HOLD_ENTRY) resumeFromSavingHold();
  }, [resumeFromSavingHold]);

  const enterSavingHold = useCallback((attempt: number) => {
    if (!mountedRef.current || attempt !== attemptRef.current) return;
    if (persistenceErrorAttemptRef.current === attempt) {
      setLifecycleStatus('SAVE_ERROR');
    } else if (tripIdRef.current) {
      resumeFromSavingHold();
    }
  }, [resumeFromSavingHold, setLifecycleStatus]);

  const startPersistence = useCallback((preview: PlannerGeneratedPreview, attempt: number, retry = false) => {
    if (!mountedRef.current || attempt !== attemptRef.current || persistenceStartedRef.current) return;
    persistenceStartedRef.current = true;
    setLifecycleStatus('SAVING');
    const saving = retry ? persistence.retry() : persistence.save(preview, wizardRef.current?.tripTitle);
    void saving.then((id) => { if (id) acceptTripId(id, attempt); });
    playTo(LIFECYCLE_BOUNDARIES.SAVING_HOLD_ENTRY, () => enterSavingHold(attempt));
  }, [acceptTripId, enterSavingHold, persistence, playTo, setLifecycleStatus]);

  const enterGenerationSuccess = useCallback((attempt: number) => {
    if (!mountedRef.current || attempt !== attemptRef.current || !draftRef.current || generationTransitionRef.current) return;
    generationTransitionRef.current = true;
    setLifecycleStatus('GENERATION_SUCCESS');
    playTo(LIFECYCLE_BOUNDARIES.PERSISTENCE_ENTRY, () => {
      if (draftRef.current) startPersistence(draftRef.current, attempt);
    });
  }, [playTo, setLifecycleStatus, startPersistence]);

  const acceptDraft = useCallback((preview: PlannerGeneratedPreview, attempt: number) => {
    if (!mountedRef.current || attempt !== attemptRef.current) return;
    draftRef.current = preview;
    setDraft(preview);
    if (frameRef.current >= LIFECYCLE_BOUNDARIES.GENERATION_LATCH) enterGenerationSuccess(attempt);
  }, [enterGenerationSuccess]);

  const startGeneration = useCallback((retry: boolean) => {
    const wizard = wizardRef.current;
    if (!wizard || generationStartedRef.current) return;
    const attempt = attemptRef.current;
    generationStartedRef.current = true;
    setLifecycleStatus('GENERATING');
    const generating = retry ? generation.retry() : generation.generate(wizard);
    void generating.then((preview) => { if (preview) acceptDraft(preview, attempt); });
    playTo(LIFECYCLE_BOUNDARIES.GENERATION_LATCH, () => {
      if (attempt !== attemptRef.current || statusRef.current === 'GENERATION_ERROR') return;
      if (draftRef.current) enterGenerationSuccess(attempt);
      else if (generationErrorAttemptRef.current === attempt) setLifecycleStatus('GENERATION_ERROR');
      else setLifecycleStatus('GENERATION_HOLD');
    });
  }, [acceptDraft, enterGenerationSuccess, generation, playTo, setLifecycleStatus]);

  useEffect(() => {
    if (generation.state.status === 'success' && generation.state.preview) acceptDraft(generation.state.preview, attemptRef.current);
    if (generation.state.status === 'error' && (statusRef.current === 'GENERATING' || statusRef.current === 'GENERATION_HOLD')) {
      generationErrorAttemptRef.current = attemptRef.current;
      setLifecycleStatus('GENERATION_ERROR');
    }
  }, [acceptDraft, generation.state, setLifecycleStatus]);

  useEffect(() => {
    if (persistence.state.status === 'success' && persistence.state.tripId) acceptTripId(persistence.state.tripId, attemptRef.current);
    if (persistence.state.status === 'error' && statusRef.current === 'SAVING') {
      persistenceErrorAttemptRef.current = attemptRef.current;
      if (frameRef.current >= LIFECYCLE_BOUNDARIES.SAVING_HOLD_ENTRY) setLifecycleStatus('SAVE_ERROR');
    }
  }, [acceptTripId, persistence.state, setLifecycleStatus]);

  const beginFreshAttempt = useCallback((wizard: CreateTripWizardState, retry: boolean) => {
    attemptRef.current += 1;
    generationStartedRef.current = false;
    generationTransitionRef.current = false;
    persistenceStartedRef.current = false;
    savingExitRef.current = false;
    successBoundaryRef.current = false;
    generationErrorAttemptRef.current = null;
    persistenceErrorAttemptRef.current = null;
    wizardRef.current = wizard;
    draftRef.current = null;
    tripIdRef.current = null;
    setDraft(null);
    setTripId(null);
    resetTimelineOrigin();
    setLifecycleStatus('SUBMITTING');
    startGeneration(retry);
  }, [resetTimelineOrigin, setLifecycleStatus, startGeneration]);

  const submit = useCallback((wizard: CreateTripWizardState) => {
    if (statusRef.current === 'IDLE' || statusRef.current === 'GENERATION_ERROR') beginFreshAttempt(wizard, false);
  }, [beginFreshAttempt]);

  const retryGeneration = useCallback(() => {
    if (statusRef.current === 'GENERATION_ERROR' && wizardRef.current) beginFreshAttempt(wizardRef.current, true);
  }, [beginFreshAttempt]);

  const retrySave = useCallback(() => {
    if (statusRef.current !== 'SAVE_ERROR' || !draftRef.current) return;
    persistenceStartedRef.current = false;
    savingExitRef.current = false;
    successBoundaryRef.current = false;
    persistenceErrorAttemptRef.current = null;
    startPersistence(draftRef.current, attemptRef.current, true);
  }, [startPersistence]);

  const cancel = useCallback(() => {
    attemptRef.current += 1;
    generation.cancel();
    persistence.cancel();
    frameAnim.stopAnimation();
    setLifecycleStatus('IDLE');
  }, [frameAnim, generation, persistence, setLifecycleStatus]);

  return { status, frameAnim, submit, retryGeneration, retrySave, cancel, draft, tripId, generationError: generation.state.error, saveError: persistence.state.error };
}
