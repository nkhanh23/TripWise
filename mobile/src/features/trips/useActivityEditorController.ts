import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  SavedTripDetail, WorkspaceActivityStatus, WorkspaceFlexibility, WorkspaceItemKind, WorkspaceMutationCommand,
  WorkspacePriority, WorkspaceSourceLink,
} from '../../integration/contracts';
import type { SavedTripsRepository, TravelWorkspaceRepository } from '../../integration/repositories';
import { asTripId, isIsoTimestamp, isUuid } from '../../integration/validation';

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
  itemKind?: WorkspaceItemKind;
  contact: WorkspaceContactDraft;
  transport: WorkspaceTransportDraft;
  accommodation: WorkspaceAccommodationDraft;
  sourceLinks: WorkspaceSourceLinkDraft[];
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
  setContactField: (field: keyof WorkspaceContactDraft, value: string) => void;
  setTransportField: (field: keyof WorkspaceTransportDraft, value: string) => void;
  setAccommodationField: (field: keyof WorkspaceAccommodationDraft, value: string) => void;
  addSourceLink: () => void;
  updateSourceLink: (index: number, patch: Partial<WorkspaceSourceLinkDraft>) => void;
  removeSourceLink: (index: number) => void;
  saveSourceLinks: () => Promise<void>;
  clearTime: () => void;
  submit: () => Promise<void>;
  transitionStatus: (status: WorkspaceActivityStatus) => Promise<void>;
};

export type WorkspaceContactDraft = {
  name: string; phone: string; address: string; websiteUrl: string; bookingUrl: string; reservationCode: string;
};
export type WorkspaceTransportDraft = {
  mode: NonNullable<NonNullable<SavedTripDetail['days'][number]['items'][number]['transport']>['mode']>;
  originLabel: string; destinationLabel: string; operatorName: string; departureAt: string; arrivalAt: string;
  plannedCostAmount: string; plannedCostCurrency: string;
};
export type WorkspaceAccommodationDraft = { checkInAt: string; checkOutAt: string; nights: string };
export type WorkspaceSourceLinkDraft = WorkspaceSourceLink & { label: string };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const phonePattern = /^[+0-9 ().-]+$/;
const currencyPattern = /^[A-Z]{3}$/;
const emptyContact: WorkspaceContactDraft = { name: '', phone: '', address: '', websiteUrl: '', bookingUrl: '', reservationCode: '' };
const emptyTransport: WorkspaceTransportDraft = { mode: 'other', originLabel: '', destinationLabel: '', operatorName: '', departureAt: '', arrivalAt: '', plannedCostAmount: '', plannedCostCurrency: '' };
const emptyAccommodation: WorkspaceAccommodationDraft = { checkInAt: '', checkOutAt: '', nights: '' };

function nullableText(value: string): string | null { const normalized = value.trim(); return normalized || null; }
function validHttps(value: string): boolean { try { return new URL(value).protocol === 'https:' && !/\s/.test(value); } catch { return false; } }

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
  const [contact, setContact] = useState<WorkspaceContactDraft>(emptyContact);
  const [transport, setTransport] = useState<WorkspaceTransportDraft>(emptyTransport);
  const [accommodation, setAccommodation] = useState<WorkspaceAccommodationDraft>(emptyAccommodation);
  const [sourceLinks, setSourceLinks] = useState<WorkspaceSourceLinkDraft[]>([]);
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
      setContact({
        name: found.contact?.name ?? '', phone: found.contact?.phone ?? '', address: found.contact?.address ?? '',
        websiteUrl: found.contact?.websiteUrl ?? '', bookingUrl: found.contact?.bookingUrl ?? '', reservationCode: found.contact?.reservationCode ?? '',
      });
      setTransport({
        ...emptyTransport, ...found.transport, mode: found.transport?.mode ?? 'other',
        originLabel: found.transport?.originLabel ?? '', destinationLabel: found.transport?.destinationLabel ?? '',
        operatorName: found.transport?.operatorName ?? '', departureAt: found.transport?.departureAt ?? '', arrivalAt: found.transport?.arrivalAt ?? '',
        plannedCostAmount: found.transport?.plannedCostAmount?.toString() ?? '',
        plannedCostCurrency: found.transport?.plannedCostCurrency ?? '',
      });
      setAccommodation({
        checkInAt: found.accommodation?.checkInAt ?? '', checkOutAt: found.accommodation?.checkOutAt ?? '',
        nights: found.accommodation?.nights?.toString() ?? '',
      });
      setSourceLinks((found.sourceLinks ?? []).map((link) => ({ ...link, label: link.label ?? '' })));
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
    if (route.mode === 'edit') {
      if (contact.name.trim().length > 120 || contact.phone.trim().length > 64 || contact.address.trim().length > 500
        || contact.reservationCode.trim().length > 128 || (contact.phone.trim() && !phonePattern.test(contact.phone.trim()))
        || (contact.websiteUrl.trim() && !validHttps(contact.websiteUrl.trim()))
        || (contact.bookingUrl.trim() && !validHttps(contact.bookingUrl.trim()))) {
        setErrorKey('workspaceEditor.contactInvalid'); return;
      }
      if (uiItem?.itemKind === 'transport') {
        const hasDeparture = Boolean(transport.departureAt.trim()); const hasArrival = Boolean(transport.arrivalAt.trim());
        const hasCost = Boolean(transport.plannedCostAmount.trim()); const hasCurrency = Boolean(transport.plannedCostCurrency.trim());
        const parsedCost = hasCost ? Number(transport.plannedCostAmount) : null;
        if (transport.originLabel.trim().length > 160 || transport.destinationLabel.trim().length > 160 || transport.operatorName.trim().length > 160
          || hasDeparture !== hasArrival || (hasDeparture && (!isIsoTimestamp(transport.departureAt.trim()) || !isIsoTimestamp(transport.arrivalAt.trim())))
          || (hasDeparture && Date.parse(transport.arrivalAt) < Date.parse(transport.departureAt))
          || hasCost !== hasCurrency || (hasCost && (!Number.isFinite(parsedCost) || (parsedCost ?? -1) < 0 || (parsedCost ?? 0) > 1_000_000_000))
          || (hasCurrency && !currencyPattern.test(transport.plannedCostCurrency.trim()))) {
          setErrorKey('workspaceEditor.transportInvalid'); return;
        }
      }
      if (uiItem?.itemKind === 'accommodation') {
        const hasCheckIn = Boolean(accommodation.checkInAt.trim()); const hasCheckOut = Boolean(accommodation.checkOutAt.trim());
        const hasNights = Boolean(accommodation.nights.trim()); const parsedNights = hasNights ? Number(accommodation.nights) : null;
        const actualNights = hasCheckIn && hasCheckOut
          ? Math.round((Date.parse(accommodation.checkOutAt.slice(0, 10)) - Date.parse(accommodation.checkInAt.slice(0, 10))) / 86_400_000) : null;
        if (hasCheckIn !== hasCheckOut || (hasCheckIn && (!isIsoTimestamp(accommodation.checkInAt.trim()) || !isIsoTimestamp(accommodation.checkOutAt.trim())))
          || (hasCheckIn && Date.parse(accommodation.checkOutAt) <= Date.parse(accommodation.checkInAt))
          || (hasNights && (!Number.isInteger(parsedNights) || (parsedNights ?? -1) < 0 || (parsedNights ?? 366) > 365 || !hasCheckIn || parsedNights !== actualNights))) {
          setErrorKey('workspaceEditor.accommodationInvalid'); return;
        }
      }
    }
    if (route.mode === 'add') {
      if (!dayId) { setErrorKey('workspaceEditor.saveFailed'); return; }
      await executeMutation({
          type: 'create_item', tripId: detail.id, dayId: dayId as typeof detail.days[number]['id'], expectedRevision,
          item: { itemKind: 'custom_activity', title, flexibility, priority, startTime: startTime || null, endTime: endTime || null },
      });
    } else if (uiItem) {
      const metadataPatch = {
        contact: {
          name: nullableText(contact.name), phone: nullableText(contact.phone), address: nullableText(contact.address),
          websiteUrl: nullableText(contact.websiteUrl), bookingUrl: nullableText(contact.bookingUrl), reservationCode: nullableText(contact.reservationCode),
        },
        ...(uiItem.itemKind === 'transport' ? { transport: {
          mode: transport.mode, originLabel: nullableText(transport.originLabel), destinationLabel: nullableText(transport.destinationLabel),
          operatorName: nullableText(transport.operatorName), departureAt: nullableText(transport.departureAt), arrivalAt: nullableText(transport.arrivalAt),
          plannedCostAmount: transport.plannedCostAmount.trim() ? Number(transport.plannedCostAmount) : null,
          plannedCostCurrency: nullableText(transport.plannedCostCurrency),
        } } : {}),
        ...(uiItem.itemKind === 'accommodation' ? { accommodation: {
          checkInAt: nullableText(accommodation.checkInAt), checkOutAt: nullableText(accommodation.checkOutAt),
          nights: accommodation.nights.trim() ? Number(accommodation.nights) : null,
        } } : {}),
      };
      await executeMutation({
          type: 'update_item', tripId: detail.id, itemId: uiItem.id, expectedRevision,
          patch: { ...(providerLocked ? {} : { placeName: title }), flexibility, priority, note: note.trim() ? note : null, ...(scheduleEligible ? { startTime: startTime || null, endTime: endTime || null } : {}), ...metadataPatch },
      });
    }
  }, [accommodation, contact, detail, dayId, endTime, executeMutation, flexibility, note, priority, providerLocked, route.mode, scheduleEligible, startTime, title, transport, uiItem, user]);

  const saveSourceLinks = useCallback(async () => {
    if (savingRef.current || !detail || !user || route.mode !== 'edit' || !uiItem) return;
    const expectedRevision = detail.workspaceRevision;
    if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) { setErrorKey('workspaceEditor.unavailable'); return; }
    if (sourceLinks.length > 12 || sourceLinks.some((link) => !validHttps(link.url.trim()) || link.url.length > 2048
      || link.label.trim().length > 120 || (link.type === 'other' && !link.label.trim()))) {
      setErrorKey('workspaceEditor.sourceLinksInvalid'); return;
    }
    await executeMutation({
      type: 'replace_source_links', tripId: detail.id, itemId: uiItem.id, expectedRevision,
      links: sourceLinks.map((link) => ({ type: link.type, url: link.url.trim(), ...(link.label.trim() ? { label: link.label.trim() } : {}) })),
    });
  }, [detail, executeMutation, route.mode, sourceLinks, uiItem, user]);

  const transitionStatus = useCallback(async (status: WorkspaceActivityStatus) => {
    if (savingRef.current || !detail || !user || route.mode !== 'edit' || !uiItem) return;
    const expectedRevision = detail.workspaceRevision;
    if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 1) {
      setErrorKey('workspaceEditor.unavailable');
      return;
    }
    await executeMutation({ type: 'transition_item_status', tripId: detail.id, itemId: uiItem.id, expectedRevision, status });
  }, [detail, executeMutation, route.mode, uiItem, user]);

  return { detail, loading, saving, title, dayId, startTime, endTime, flexibility, priority, note, itemKind: uiItem?.itemKind,
    contact, transport, accommodation, sourceLinks, mutationReady, errorKey, conflict,
    setTitle, setDayId, setStartTime, setEndTime, setFlexibility, setPriority, setNote,
    setContactField: (field, value) => setContact((current) => ({ ...current, [field]: value })),
    setTransportField: (field, value) => setTransport((current) => ({ ...current, [field]: value })),
    setAccommodationField: (field, value) => setAccommodation((current) => ({ ...current, [field]: value })),
    addSourceLink: () => setSourceLinks((current) => current.length >= 12 ? current : [...current, { type: 'website', url: '', label: '' }]),
    updateSourceLink: (index, patch) => setSourceLinks((current) => current.map((link, candidate) => candidate === index ? { ...link, ...patch } : link)),
    removeSourceLink: (index) => setSourceLinks((current) => current.filter((_, candidate) => candidate !== index)),
    clearTime: () => { setStartTime(''); setEndTime(''); }, submit, transitionStatus, saveSourceLinks };
}
