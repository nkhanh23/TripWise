import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SavedTripDetail, WorkspaceActivityStatus, WorkspaceFlexibility, WorkspaceMutationCommand, WorkspacePriority } from '../../integration/contracts';
import type { SavedTripsRepository, TravelWorkspaceRepository } from '../../integration/repositories';
import { asTripId, isUuid } from '../../integration/validation';

type EditorRoute =
  | { tripId: string; mode: 'add'; dayId?: string }
  | { tripId: string; mode: 'edit'; itemId: string };

type EditorUser = { id: string } | null | undefined;

export type ActivityEditorController = {
  detail: SavedTripDetail | null;
  loading: boolean;
  saving: boolean;
  title: string;
  dayId: string;
  startTime: string;
  endTime: string;
  flexibility: WorkspaceFlexibility;
  priority: WorkspacePriority;
  note: string;
  mutationReady: boolean;
  errorKey: string | null;
  conflict: boolean;
  setTitle: (value: string) => void;
  setDayId: (value: string) => void;
  setStartTime: (value: string) => void;
  setEndTime: (value: string) => void;
  setFlexibility: (value: WorkspaceFlexibility) => void;
  setPriority: (value: WorkspacePriority) => void;
  setNote: (value: string) => void;
  clearTime: () => void;
  submit: () => Promise<void>;
  transitionStatus: (status: WorkspaceActivityStatus) => Promise<void>;
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Narrow P2-T001 orchestration boundary. The screen owns only presentation and
 * form wiring; this hook owns repository commands, CAS state, and session-safe
 * async behaviour. A generation token is deliberately used instead of a cached
 * owner id so an old account cannot update a newly authenticated editor.
 */
export function useActivityEditorController({
  route,
  user,
  savedTripsRepository,
  workspaceRepository,
  onSuccess,
}: {
  route: EditorRoute;
  user: EditorUser;
  savedTripsRepository: SavedTripsRepository;
  workspaceRepository: TravelWorkspaceRepository;
  onSuccess: () => void;
}): ActivityEditorController {
  const [detail, setDetail] = useState<SavedTripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [dayId, setDayId] = useState(route.mode === 'add' ? route.dayId ?? '' : '');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [flexibility, setFlexibility] = useState<WorkspaceFlexibility>('fixed');
  const [priority, setPriority] = useState<WorkspacePriority>('must_do');
  const [note, setNote] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const generation = useRef(0);
  const savingRef = useRef(false);

  const isCurrent = useCallback((requestGeneration: number) => generation.current === requestGeneration, []);

  const initializeDraft = useCallback((next: SavedTripDetail | null) => {
    const requestedItemId = route.mode === 'edit' ? route.itemId : undefined;
    const found = requestedItemId ? next?.days.flatMap((day) => day.items).find((item) => item.id === requestedItemId) : undefined;
    if (found) {
      setTitle(found.placeName);
      setStartTime(found.startTime ?? '');
      setEndTime(found.endTime ?? '');
      setFlexibility(found.flexibility);
      setPriority(found.priority);
      setNote(found.note ?? '');
      setDayId(next?.days.find((day) => day.items.some((item) => item.id === found.id))?.id ?? '');
    } else if (route.mode === 'add') {
      setDayId((current) => current || next?.days[0]?.id || '');
    }
  }, [route]);

  const fetchAuthoritative = useCallback(async (initialize: boolean, requestGeneration: number) => {
    if (!isUuid(route.tripId) || !user) return;
    try {
      const next = await savedTripsRepository.getDetail(asTripId(route.tripId));
      if (!isCurrent(requestGeneration)) return;
      setDetail(next);
      // Conflict refresh updates only authoritative state/revision. It never
      // replaces user-owned draft controls with server values.
      if (initialize) initializeDraft(next);
    } catch {
      if (isCurrent(requestGeneration)) setErrorKey('workspaceEditor.saveFailed');
    }
  }, [initializeDraft, isCurrent, route.tripId, savedTripsRepository, user]);

  useEffect(() => {
    generation.current += 1;
    const requestGeneration = generation.current;
    savingRef.current = false;
    void (async () => {
      if (!isCurrent(requestGeneration)) return;
      setSaving(false);
      setConflict(false);
      setErrorKey(null);
      setDetail(null);
      if (!user || !isUuid(route.tripId)) {
        setLoading(false);
        return;
      }
      setLoading(true);
      await fetchAuthoritative(true, requestGeneration);
      if (isCurrent(requestGeneration)) setLoading(false);
    })();
    return () => { generation.current += 1; };
  }, [fetchAuthoritative, isCurrent, route.tripId, user, user?.id]);

  const uiItem = useMemo(() => route.mode === 'edit'
    ? detail?.days.flatMap((day) => day.items).find((item) => item.id === route.itemId)
    : undefined, [detail, route]);
  const scheduleEligible = !uiItem || (uiItem.itemKind !== 'note' && uiItem.itemKind !== 'transport');
  const providerLocked = uiItem?.resolution === 'VERIFIED';
  const mutationReady = Number.isInteger(detail?.workspaceRevision) && (detail?.workspaceRevision ?? 0) >= 1;

  const executeMutation = useCallback(async (command: WorkspaceMutationCommand) => {
    if (savingRef.current || !user) return;
    const requestGeneration = generation.current;
    savingRef.current = true;
    setSaving(true);
    setErrorKey(null);
    setConflict(false);
    try {
      await workspaceRepository.mutate(command);
      if (isCurrent(requestGeneration)) onSuccess();
    } catch (error: unknown) {
      if (!isCurrent(requestGeneration)) return;
      if ((error as { code?: string }).code === 'conflict') {
        setConflict(true);
        // Exactly one authoritative refresh after TW009; the mutation is never replayed.
        await fetchAuthoritative(false, requestGeneration);
      } else setErrorKey('workspaceEditor.saveFailed');
    } finally {
      if (isCurrent(requestGeneration)) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  }, [fetchAuthoritative, isCurrent, onSuccess, user, workspaceRepository]);

  const submit = useCallback(async () => {
    if (savingRef.current || !detail || !user) return;
    const expectedRevision = detail.workspaceRevision;
    if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
      setErrorKey('workspaceEditor.unavailable');
      return;
    }
    if (!title.trim()) { setErrorKey('workspaceEditor.titleRequired'); return; }
    if (scheduleEligible && ((startTime && !timePattern.test(startTime)) || (endTime && !timePattern.test(endTime)))) {
      setErrorKey('workspaceEditor.timeInvalid'); return;
    }
    if (scheduleEligible && startTime && endTime && endTime < startTime) {
      setErrorKey('workspaceEditor.timeRange'); return;
    }
    if (note.trim().length > 500) { setErrorKey('workspaceEditor.noteTooLong'); return; }
    if (route.mode === 'add') {
      if (!dayId) { setErrorKey('workspaceEditor.saveFailed'); return; }
      await executeMutation({
          type: 'create_item', tripId: detail.id, dayId: dayId as typeof detail.days[number]['id'], expectedRevision,
          item: { itemKind: 'custom_activity', title, flexibility, priority, startTime: startTime || null, endTime: endTime || null },
      });
    } else if (uiItem) {
      await executeMutation({
          type: 'update_item', tripId: detail.id, itemId: uiItem.id, expectedRevision,
          patch: { ...(providerLocked ? {} : { placeName: title }), flexibility, priority, note: note.trim() ? note : null, ...(scheduleEligible ? { startTime: startTime || null, endTime: endTime || null } : {}) },
      });
    }
  }, [detail, dayId, endTime, executeMutation, flexibility, note, priority, providerLocked, route.mode, scheduleEligible, startTime, title, uiItem, user]);

  const transitionStatus = useCallback(async (status: WorkspaceActivityStatus) => {
    if (savingRef.current || !detail || !user || route.mode !== 'edit' || !uiItem) return;
    const expectedRevision = detail.workspaceRevision;
    if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
      setErrorKey('workspaceEditor.unavailable');
      return;
    }
    await executeMutation({ type: 'transition_item_status', tripId: detail.id, itemId: uiItem.id, expectedRevision, status });
  }, [detail, executeMutation, route.mode, uiItem, user]);

  return { detail, loading, saving, title, dayId, startTime, endTime, flexibility, priority, note, mutationReady, errorKey, conflict,
    setTitle, setDayId, setStartTime, setEndTime, setFlexibility, setPriority, setNote,
    clearTime: () => { setStartTime(''); setEndTime(''); }, submit, transitionStatus };
}
