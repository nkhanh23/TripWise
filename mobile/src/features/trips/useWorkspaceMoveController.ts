import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ItineraryDayId, ItineraryItemId, SavedTripDetail } from '../../integration/contracts';
import type { SavedTripsRepository, TravelWorkspaceRepository } from '../../integration/repositories';

export type WorkspaceMoveController = {
  selectedItemId: string | null;
  targetDayId: string;
  targetPosition: number;
  saving: boolean;
  conflict: boolean;
  errorKey: string | null;
  mutationReady: boolean;
  selectedItemName: string;
  positions: number[];
  open: (itemId: string) => void;
  close: () => void;
  setTargetDayId: (dayId: string) => void;
  setTargetPosition: (position: number) => void;
  submit: () => Promise<void>;
};

/** P2-T002 orchestration boundary. The UI only selects a destination; this
 * hook owns CAS, one-refresh conflict handling, double-submit and stale-view
 * protection. Auth navigation unmounts this feature on session exit; a local
 * generation token prevents its old request from mutating a later view. */
export function useWorkspaceMoveController({
  detail,
  savedTripsRepository,
  workspaceRepository,
  onAuthoritativeDetail,
}: {
  detail: SavedTripDetail | null;
  savedTripsRepository: SavedTripsRepository;
  workspaceRepository: TravelWorkspaceRepository;
  onAuthoritativeDetail: (detail: SavedTripDetail | null) => void;
}): WorkspaceMoveController {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [targetDayId, setTargetDayIdState] = useState('');
  const [targetPosition, setTargetPosition] = useState(1);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const generation = useRef(0);
  const savingRef = useRef(false);
  const isCurrent = useCallback((requestGeneration: number) => generation.current === requestGeneration, []);

  useEffect(() => {
    generation.current += 1;
    savingRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaving(false);
    setConflict(false);
    setErrorKey(null);
    setSelectedItemId(null);
    return () => { generation.current += 1; };
  }, [detail?.id]);

  const selected = useMemo(() => detail?.days.flatMap((day) => day.items)
    .find((item) => item.id === selectedItemId), [detail, selectedItemId]);
  const sourceDay = useMemo(() => detail?.days.find((day) => day.items.some((item) => item.id === selectedItemId)), [detail, selectedItemId]);
  const targetDay = useMemo(() => detail?.days.find((day) => day.id === targetDayId), [detail, targetDayId]);
  const mutationReady = Number.isInteger(detail?.workspaceRevision) && (detail?.workspaceRevision ?? 0) >= 1;
  const positions = useMemo(() => {
    if (!sourceDay || !targetDay) return [];
    const maximum = targetDay.id === sourceDay.id ? targetDay.items.length : targetDay.items.length + 1;
    return Array.from({ length: maximum }, (_, index) => index + 1);
  }, [sourceDay, targetDay]);

  const open = useCallback((itemId: string) => {
    const day = detail?.days.find((candidate) => candidate.items.some((item) => item.id === itemId));
    const item = day?.items.find((candidate) => candidate.id === itemId);
    if (!day || !item) return;
    setSelectedItemId(itemId);
    setTargetDayIdState(day.id);
    setTargetPosition(item.position);
    setErrorKey(null);
    setConflict(false);
  }, [detail]);
  const close = useCallback(() => {
    if (!savingRef.current) setSelectedItemId(null);
  }, []);
  const setTargetDayId = useCallback((dayId: string) => {
    const day = detail?.days.find((candidate) => candidate.id === dayId);
    if (!day || !sourceDay) return;
    setTargetDayIdState(dayId);
    setTargetPosition(dayId === sourceDay.id ? (selected?.position ?? 1) : day.items.length + 1);
    setErrorKey(null);
  }, [detail, selected?.position, sourceDay]);

  const refreshOnce = useCallback(async (requestGeneration: number) => {
    if (!detail) return;
    const next = await savedTripsRepository.getDetail(detail.id);
    if (isCurrent(requestGeneration)) onAuthoritativeDetail(next);
  }, [detail, isCurrent, onAuthoritativeDetail, savedTripsRepository]);

  const submit = useCallback(async () => {
    if (savingRef.current || !detail || !selected || !sourceDay || !targetDay) return;
    const expectedRevision = detail.workspaceRevision;
    if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
      setErrorKey('workspaceMove.unavailable');
      return;
    }
    if (!positions.includes(targetPosition)) {
      setErrorKey('workspaceMove.invalidPosition');
      return;
    }
    const requestGeneration = generation.current;
    savingRef.current = true;
    setSaving(true);
    setConflict(false);
    setErrorKey(null);
    try {
      const result = await workspaceRepository.mutate({
        type: 'move_item', tripId: detail.id, itemId: selected.id as ItineraryItemId,
        expectedRevision, targetDayId: targetDay.id as ItineraryDayId, targetPosition,
      });
      if (!isCurrent(requestGeneration)) return;
      if (!result.noOp) await refreshOnce(requestGeneration);
      if (isCurrent(requestGeneration)) setSelectedItemId(null);
    } catch (error: unknown) {
      if (!isCurrent(requestGeneration)) return;
      if ((error as { code?: string }).code === 'conflict') {
        setConflict(true);
        // Exactly one authoritative fetch. The requested move is never replayed.
        try { await refreshOnce(requestGeneration); } catch { if (isCurrent(requestGeneration)) setErrorKey('workspaceMove.saveFailed'); }
      } else setErrorKey('workspaceMove.saveFailed');
    } finally {
      if (isCurrent(requestGeneration)) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }, [detail, isCurrent, positions, refreshOnce, selected, sourceDay, targetDay, targetPosition, workspaceRepository]);

  return {
    selectedItemId, targetDayId, targetPosition, saving, conflict, errorKey, mutationReady,
    selectedItemName: selected?.placeName ?? '', positions, open, close, setTargetDayId, setTargetPosition, submit,
  };
}
