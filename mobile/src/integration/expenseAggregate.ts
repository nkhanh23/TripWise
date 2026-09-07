import type { ExpenseCategory, TripId } from './contracts';
import { ContractValidationError } from './validation';

export type ExpenseAggregateRequest = {
  tripId: TripId;
  groupBy: 'currency' | 'category' | 'day';
  limit?: number;
  cursor?: string;
};
/** Canonical decimal text, never an authoritative JavaScript number. */
export type AccountingDecimal = string & { readonly __accountingDecimal: unique symbol };
export type ExpenseAggregateRow = {
  key: string;
  currency: string;
  category: ExpenseCategory | null;
  day: { kind: 'itinerary' | 'spentDate' | 'unassigned'; itineraryDayId: string | null; date: string | null } | null;
  planned: AccountingDecimal;
  actual: AccountingDecimal;
  unplanned: AccountingDecimal;
  actualPlusUnplanned: AccountingDecimal;
  variance: AccountingDecimal;
};
export type ExpenseAggregatePage = {
  tripId: TripId;
  groupBy: ExpenseAggregateRequest['groupBy'];
  items: ExpenseAggregateRow[];
  nextCursor: string | null;
};
export interface TripExpenseAggregateRepository {
  getAggregate(request: ExpenseAggregateRequest, signal?: AbortSignal): Promise<ExpenseAggregatePage>;
}
const categories = ['food', 'transport', 'accommodation', 'activity', 'shopping', 'ticket', 'personal', 'reservation', 'other'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (): never => { throw new ContractValidationError('expense aggregate'); };
function object(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) return fail();
  return value as Record<string, unknown>;
}
function cursor(value: unknown, group: ExpenseAggregateRequest['groupBy']): string {
  if (typeof value !== 'string' || value.length > 80) return fail();
  const parts = value.split('|');
  if (parts.length !== 2 || !/^[A-Z]{3}$/.test(parts[1])) return fail();
  const key = parts[0];
  if (group === 'currency' ? key !== 'c' : group === 'category' ? !categories.includes(key.slice(2)) || !key.startsWith('k:')
    : !(key === 'u' || (key.startsWith('i:') && uuid.test(key.slice(2))) || (key.startsWith('s:') && validDate(key.slice(2))))) return fail();
  return value;
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function validateExpenseAggregateRequest(value: unknown): ExpenseAggregateRequest {
  const r = object(value, ['tripId', 'groupBy', 'limit', 'cursor']);
  if (typeof r.tripId !== 'string' || !uuid.test(r.tripId) || !['currency', 'category', 'day'].includes(String(r.groupBy))) return fail();
  const groupBy = r.groupBy as ExpenseAggregateRequest['groupBy'];
  const limit = r.limit === undefined ? 20 : r.limit;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 50) return fail();
  return { tripId: r.tripId.toLowerCase() as TripId, groupBy, limit, ...(r.cursor === undefined ? {} : { cursor: cursor(r.cursor, groupBy) }) };
}
export function parseAccountingDecimal(value: unknown, signed = false): AccountingDecimal {
  if (typeof value !== 'string' || !(signed ? /^-?(0|[1-9]\d{0,21})\.\d{2}$/ : /^(0|[1-9]\d{0,21})\.\d{2}$/).test(value) || value === '-0.00') return fail();
  return value as AccountingDecimal;
}
/** Exact minor-unit conversion for validation/formatting, not client aggregation. */
export function accountingMinorUnits(value: AccountingDecimal): bigint {
  return BigInt(value.replace('.', ''));
}
export function parseExpenseAggregatePage(value: unknown, request: ExpenseAggregateRequest): ExpenseAggregatePage {
  const r = validateExpenseAggregateRequest(request);
  const page = object(value, ['tripId', 'groupBy', 'items', 'nextCursor']);
  if (page.tripId !== r.tripId || page.groupBy !== r.groupBy || !Array.isArray(page.items) || page.items.length > r.limit!) return fail();
  let previous = r.cursor ?? '';
  const items = page.items.map((raw): ExpenseAggregateRow => {
    const row = object(raw, ['key', 'currency', 'category', 'day', 'planned', 'actual', 'unplanned', 'actualPlusUnplanned', 'variance']);
    const key = cursor(row.key, r.groupBy);
    if (key <= previous || row.currency !== key.split('|')[1]) return fail();
    previous = key;
    const category = r.groupBy === 'category' ? key.slice(2).split('|')[0] as ExpenseCategory : null;
    if (row.category !== category) return fail();
    let day: ExpenseAggregateRow['day'] = null;
    if (r.groupBy === 'day') {
      const d = object(row.day, ['kind', 'itineraryDayId', 'date']);
      const kind = key.startsWith('i:') ? 'itinerary' : key.startsWith('s:') ? 'spentDate' : 'unassigned';
      if (d.kind !== kind || (d.date !== null && !validDate(d.date))) return fail();
      if (kind === 'itinerary' ? d.itineraryDayId !== key.slice(2).split('|')[0]
        : d.itineraryDayId !== null || (kind === 'spentDate' ? d.date !== key.slice(2).split('|')[0] : d.date !== null)) return fail();
      day = { kind, itineraryDayId: d.itineraryDayId as string | null, date: d.date as string | null };
    } else if (row.day !== null) return fail();
    const planned = parseAccountingDecimal(row.planned);
    const actual = parseAccountingDecimal(row.actual);
    const unplanned = parseAccountingDecimal(row.unplanned);
    const actualPlusUnplanned = parseAccountingDecimal(row.actualPlusUnplanned);
    const variance = parseAccountingDecimal(row.variance, true);
    if (accountingMinorUnits(actual) + accountingMinorUnits(unplanned) !== accountingMinorUnits(actualPlusUnplanned)
      || accountingMinorUnits(actualPlusUnplanned) - accountingMinorUnits(planned) !== accountingMinorUnits(variance)) return fail();
    return { key, currency: row.currency as string, category, day, planned, actual, unplanned, actualPlusUnplanned, variance };
  });
  if (page.nextCursor !== null && (items.length !== r.limit || page.nextCursor !== items[items.length - 1]?.key)) return fail();
  return { tripId: r.tripId, groupBy: r.groupBy, items, nextCursor: page.nextCursor as string | null };
}
