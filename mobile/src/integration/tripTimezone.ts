import { ContractValidationError, isIsoDate, isRecord, isUuid } from './validation';

export type TripTimezone =
  | { timezone: null; provenance: null; confirmedAt: null }
  | { timezone: string; provenance: 'USER_CONFIRMED'; confirmedAt: string };
export type SetTripTimezoneCommand = { tripId: string; expectedRevision: number; timezone: string | null };
export type TripTimezoneMutationResult = { tripId: string; revision: number } & TripTimezone;

const geographicZone = /^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Za-z_]+(-[A-Za-z_]+)*(\/[A-Za-z_]+(-[A-Za-z_]+)*)?$/;
/** Named geographic IANA zones only; no offsets, abbreviations, POSIX or implicit device zone.
 * PostgreSQL independently checks exact membership in pg_timezone_names on writes. */
export function isSupportedTripTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 100 || !geographicZone.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
    return true;
  } catch { return false; }
}

function invalid(): never { throw new ContractValidationError('trip timezone'); }
function isConfirmationTimestamp(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40
    && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value)
    && !/[+-]14:(?!00)/.test(value) && isIsoDate(value.slice(0,10)) && Number.isFinite(Date.parse(value));
}
/** Absent field is the frozen legacy transport. Present tuples must be complete. */
export function parseTripTimezone(value: unknown): TripTimezone {
  if (value === undefined || value === null) return { timezone: null, provenance: null, confirmedAt: null };
  if (!isRecord(value) || Object.keys(value).length !== 3
    || !['timezone','provenance','confirmedAt'].every(key => Object.hasOwn(value,key))) return invalid();
  if (value.timezone === null && value.provenance === null && value.confirmedAt === null) {
    return { timezone: null, provenance: null, confirmedAt: null };
  }
  if (!isSupportedTripTimezone(value.timezone) || value.provenance !== 'USER_CONFIRMED'
    || !isConfirmationTimestamp(value.confirmedAt)) return invalid();
  return { timezone: value.timezone, provenance: 'USER_CONFIRMED', confirmedAt: value.confirmedAt };
}
export function validateSetTripTimezoneCommand(value: unknown): SetTripTimezoneCommand {
  if (!isRecord(value) || Object.keys(value).length !== 3
    || !['tripId','expectedRevision','timezone'].every(key => Object.hasOwn(value,key))
    || !isUuid(value.tripId) || typeof value.expectedRevision !== 'number'
    || !Number.isInteger(value.expectedRevision) || value.expectedRevision < 1 || value.expectedRevision > 2147483647
    || (value.timezone !== null && !isSupportedTripTimezone(value.timezone))) return invalid();
  return { tripId: value.tripId.toLowerCase(), expectedRevision: value.expectedRevision, timezone: value.timezone };
}
export function parseTripTimezoneMutationResult(value: unknown, command: SetTripTimezoneCommand): TripTimezoneMutationResult {
  if (!isRecord(value) || Object.keys(value).length !== 5 || value.tripId !== command.tripId
    || (value.revision !== command.expectedRevision && value.revision !== command.expectedRevision + 1)
    || value.timezone !== command.timezone) return invalid();
  return { tripId: command.tripId, revision: value.revision as number,
    ...parseTripTimezone({ timezone: value.timezone, provenance: value.provenance, confirmedAt: value.confirmedAt }) };
}
