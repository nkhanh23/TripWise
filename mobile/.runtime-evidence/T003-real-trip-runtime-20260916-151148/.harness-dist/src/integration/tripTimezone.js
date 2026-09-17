"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedTripTimezone = isSupportedTripTimezone;
exports.parseTripTimezone = parseTripTimezone;
exports.validateSetTripTimezoneCommand = validateSetTripTimezoneCommand;
exports.parseTripTimezoneMutationResult = parseTripTimezoneMutationResult;
const validation_1 = require("./validation");
const geographicZone = /^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)\/[A-Za-z_]+(-[A-Za-z_]+)*(\/[A-Za-z_]+(-[A-Za-z_]+)*)?$/;
/** Named geographic IANA zones only; no offsets, abbreviations, POSIX or implicit device zone.
 * PostgreSQL independently checks exact membership in pg_timezone_names on writes. */
function isSupportedTripTimezone(value) {
    if (typeof value !== 'string' || value.length > 100 || !geographicZone.test(value))
        return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: value }).format(0);
        return true;
    }
    catch {
        return false;
    }
}
function invalid() { throw new validation_1.ContractValidationError('trip timezone'); }
function isConfirmationTimestamp(value) {
    return typeof value === 'string' && value.length <= 40
        && /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.test(value)
        && !/[+-]14:(?!00)/.test(value) && (0, validation_1.isIsoDate)(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
}
/** Absent field is the frozen legacy transport. Present tuples must be complete. */
function parseTripTimezone(value) {
    if (value === undefined || value === null)
        return { timezone: null, provenance: null, confirmedAt: null };
    if (!(0, validation_1.isRecord)(value) || Object.keys(value).length !== 3
        || !['timezone', 'provenance', 'confirmedAt'].every(key => Object.hasOwn(value, key)))
        return invalid();
    if (value.timezone === null && value.provenance === null && value.confirmedAt === null) {
        return { timezone: null, provenance: null, confirmedAt: null };
    }
    if (!isSupportedTripTimezone(value.timezone) || value.provenance !== 'USER_CONFIRMED'
        || !isConfirmationTimestamp(value.confirmedAt))
        return invalid();
    return { timezone: value.timezone, provenance: 'USER_CONFIRMED', confirmedAt: value.confirmedAt };
}
function validateSetTripTimezoneCommand(value) {
    if (!(0, validation_1.isRecord)(value) || Object.keys(value).length !== 3
        || !['tripId', 'expectedRevision', 'timezone'].every(key => Object.hasOwn(value, key))
        || !(0, validation_1.isUuid)(value.tripId) || typeof value.expectedRevision !== 'number'
        || !Number.isInteger(value.expectedRevision) || value.expectedRevision < 1 || value.expectedRevision > 2147483647
        || (value.timezone !== null && !isSupportedTripTimezone(value.timezone)))
        return invalid();
    return { tripId: value.tripId.toLowerCase(), expectedRevision: value.expectedRevision, timezone: value.timezone };
}
function parseTripTimezoneMutationResult(value, command) {
    if (!(0, validation_1.isRecord)(value) || Object.keys(value).length !== 5 || value.tripId !== command.tripId
        || (value.revision !== command.expectedRevision && value.revision !== command.expectedRevision + 1)
        || value.timezone !== command.timezone)
        return invalid();
    return { tripId: command.tripId, revision: value.revision,
        ...parseTripTimezone({ timezone: value.timezone, provenance: value.provenance, confirmedAt: value.confirmedAt }) };
}
