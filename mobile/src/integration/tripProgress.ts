import type { SavedTripDetail, WorkspaceActivityStatus } from './contracts';
import { IntegrationError } from './errors';
import { ContractValidationError, isIsoDate, isRecord, isUuid } from './validation';

/** Lifecycle facts, never physical presence. The destination timezone is unknown. */
export type ProgressTransition =
  | { fromStatus: 'scheduled'; toStatus: 'completed' | 'skipped' }
  | { fromStatus: 'completed' | 'skipped'; toStatus: 'scheduled' };
export type TripProgressEvent = ProgressTransition & {
  id: string; tripId: string; itemId: string; revision: number;
  idempotencyKey: string; occurredAt: string;
};
export type ProgressCounts = { scheduled: number; completed: number; skipped: number };
export type TripProgressState = {
  tripId: string; revision: number | null;
  calendar: 'unavailable_timezone';
  counts: ProgressCounts;
  days: (ProgressCounts & { dayId: string })[];
};
export type ProgressReadRequest = { tripId: string; kind: 'state' }
  | { tripId: string; kind: 'events'; limit: number; beforeRevision?: number };
export type ProgressEventPage = { events: TripProgressEvent[]; nextBeforeRevision: number | null };
export interface TripProgressRepository {
  getState(tripId: string, signal?: AbortSignal): Promise<TripProgressState>;
  listEvents(request: Extract<ProgressReadRequest, { kind: 'events' }>, signal?: AbortSignal): Promise<ProgressEventPage>;
}

function invalid(): never { throw new ContractValidationError('trip progress'); }
function object(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).some(key => !keys.includes(key))) return invalid();
  return value;
}
function uuid(value: unknown): string { return isUuid(value) ? value.toLowerCase() : invalid(); }
function integer(value: unknown, min = 1, max = 2147483647): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : invalid();
}
export function isProgressTransition(from: unknown, to: unknown): boolean {
  return (from === 'scheduled' && (to === 'completed' || to === 'skipped'))
    || ((from === 'completed' || from === 'skipped') && to === 'scheduled');
}
/** Explicit offsets only. Validate calendar before Date.parse (which normalizes invalid days). */
function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value)
    || !isIsoDate(value.slice(0, 10)) || !Number.isFinite(Date.parse(value))
    || /[+-]14:(?!00)/.test(value)) return invalid();
  return value;
}
export function parseTripProgressEvent(value: unknown): TripProgressEvent {
  const v = object(value, ['id','tripId','itemId','revision','idempotencyKey','fromStatus','toStatus','occurredAt']);
  const itemId = uuid(v.itemId); const revision = integer(v.revision);
  if (!isProgressTransition(v.fromStatus, v.toStatus) || v.idempotencyKey !== `${itemId}:${revision}`) return invalid();
  return { id: uuid(v.id), tripId: uuid(v.tripId), itemId, revision, idempotencyKey: v.idempotencyKey,
    occurredAt: timestamp(v.occurredAt), fromStatus: v.fromStatus, toStatus: v.toStatus } as TripProgressEvent;
}
export function validateProgressReadRequest(value: unknown): ProgressReadRequest {
  const v = object(value, ['tripId','kind','limit','beforeRevision']); const tripId = uuid(v.tripId);
  if (v.kind === 'state' && !('limit' in v) && !('beforeRevision' in v)) return { tripId, kind: 'state' };
  if (v.kind !== 'events') return invalid();
  return { tripId, kind: 'events', limit: integer(v.limit, 1, 50),
    ...('beforeRevision' in v ? { beforeRevision: integer(v.beforeRevision) } : {}) };
}
const zero = (): ProgressCounts => ({ scheduled: 0, completed: 0, skipped: 0 });
function state(tripId: string, revision: number | null, days: TripProgressState['days']): TripProgressState {
  const counts = zero();
  for (const day of days) {
    counts.scheduled += day.scheduled; counts.completed += day.completed; counts.skipped += day.skipped;
  }
  return { tripId, revision, calendar: 'unavailable_timezone', counts,
    days: days.sort((a,b) => a.dayId < b.dayId ? -1 : a.dayId > b.dayId ? 1 : 0) };
}
export function parseTripProgressState(value: unknown): TripProgressState {
  const v = object(value, ['tripId','revision','days']);
  if (!Array.isArray(v.days) || v.days.length > 60) return invalid();
  const seen = new Set<string>();
  const days = v.days.map(raw => {
    const day = object(raw, ['dayId','scheduled','completed','skipped']); const dayId = uuid(day.dayId);
    if (seen.has(dayId)) return invalid(); seen.add(dayId);
    return { dayId, scheduled: integer(day.scheduled,0), completed: integer(day.completed,0), skipped: integer(day.skipped,0) };
  });
  return state(uuid(v.tripId),integer(v.revision),days);
}
/** O(items), pure, no event-history requirement. Existing validated graph is the authority. */
export function projectTripProgress(detail: SavedTripDetail): TripProgressState {
  const tripId = uuid(detail.id);
  if (!Array.isArray(detail.days) || detail.days.length > 60) return invalid();
  const seenDays = new Set<string>(); const seenItems = new Set<string>();
  const days = detail.days.map(day => {
    const dayId = uuid(day.id);
    if (seenDays.has(dayId) || !Array.isArray(day.items) || day.items.length > 400) return invalid();
    seenDays.add(dayId); const counts = zero();
    for (const item of day.items) {
      const itemId = uuid(item.id);
      if (seenItems.has(itemId) || !['scheduled','completed','skipped'].includes(item.activityStatus)) return invalid();
      seenItems.add(itemId); counts[item.activityStatus as WorkspaceActivityStatus] += 1;
    }
    return { dayId, ...counts };
  });
  return state(tripId,detail.workspaceRevision === undefined ? null : integer(detail.workspaceRevision),days);
}
export function parseProgressEventPage(value: unknown, request: Extract<ProgressReadRequest,{kind:'events'}>): ProgressEventPage {
  if (!Array.isArray(value) || value.length > request.limit + 1) return invalid();
  let previous = request.beforeRevision ?? Infinity;
  const ids = new Set<string>();
  const events = value.map(raw => {
    const event = parseTripProgressEvent(raw);
    if (event.tripId !== request.tripId || event.revision >= previous || ids.has(event.id)) return invalid();
    previous = event.revision; ids.add(event.id); return event;
  });
  return { events: events.slice(0,request.limit),
    nextBeforeRevision: events.length > request.limit ? events[request.limit-1].revision : null };
}
/** Stable typed reason supplements IntegrationError without changing accepted workspace mappings. */
export class TripProgressError extends IntegrationError {
  constructor(readonly reason: 'invalidTransition' | 'staleRevision' | 'idempotencyConflict') {
    super(reason === 'invalidTransition' ? 'invalidRequest' : 'conflict');
  }
}
export function mapTripProgressError(error: unknown): IntegrationError {
  const code = isRecord(error) ? error.code : null;
  switch (code) {
    case 'TW006': case 'PGRST301': case 'PGRST303': return new IntegrationError('unauthorized');
    case 'TW008': return new IntegrationError('notFound');
    case 'TW009': return new TripProgressError('staleRevision');
    case 'TW012': return new TripProgressError('invalidTransition');
    case 'TW023': return new TripProgressError('idempotencyConflict');
    case 'TW022': case 'TW007': case 'TW013': case 'TW014': return new IntegrationError('invalidRequest');
    default: return new IntegrationError('persistenceFailed');
  }
}
