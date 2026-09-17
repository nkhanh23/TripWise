"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_BOUNDS = void 0;
exports.validateEventIntelligenceRequest = validateEventIntelligenceRequest;
exports.parseEventIntelligenceResponse = parseEventIntelligenceResponse;
const validation_1 = require("./validation");
exports.EVENT_BOUNDS = { limit: 3, venues: 3, windowMs: 7 * 86400000, requestBytes: 2048, responseBytes: 16384 };
function invalid() { throw new validation_1.ContractValidationError('event intelligence'); }
function object(v, keys) {
    if (!(0, validation_1.isRecord)(v) || Object.keys(v).some(key => !keys.includes(key)))
        return invalid();
    return v;
}
function text(v, max) {
    if (typeof v !== 'string' || !v.trim() || v.length > max || Array.from(v).some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127))
        return invalid();
    return v;
}
function id(v) {
    const s = text(v, 200);
    if (!/^[A-Za-z0-9_-]+$/.test(s))
        return invalid();
    return s;
}
function utc(v) {
    const s = text(v, 24);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(s) || !Number.isFinite(Date.parse(s)) || new Date(s).toISOString() !== (s.length === 20 ? s.replace('Z', '.000Z') : s))
        return invalid();
    return s;
}
function date(v) {
    const s = text(v, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(Date.parse(s + 'T00:00:00Z')) || new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) !== s)
        return invalid();
    return s;
}
function integer(v, min, max = Number.MAX_SAFE_INTEGER) {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max)
        return invalid();
    return v;
}
// UTF-8 bytes of the serialized transport, without a browser TextEncoder dependency.
function bounded(value, max) {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== 'string')
        return invalid();
    let bytes = 0;
    for (const char of serialized) {
        const n = char.codePointAt(0);
        bytes += n <= 0x7f ? 1 : n <= 0x7ff ? 2 : n <= 0xffff ? 3 : 4;
        if (bytes > max)
            return invalid();
    }
}
function validateEventIntelligenceRequest(value) {
    const v = object(value, ['city', 'countryCode', 'startDateTime', 'endDateTime', 'limit']);
    const city = text(v.city, 100), countryCode = text(v.countryCode, 2);
    if (city !== city.trim() || !/^[\p{L}\p{M} .'-]+$/u.test(city) || !/^[A-Z]{2}$/.test(countryCode))
        return invalid();
    const startDateTime = utc(v.startDateTime), endDateTime = utc(v.endDateTime);
    const span = Date.parse(endDateTime) - Date.parse(startDateTime);
    if (span <= 0 || span > exports.EVENT_BOUNDS.windowMs)
        return invalid();
    const result = { city, countryCode, startDateTime, endDateTime, limit: integer(v.limit, 1, 3) };
    bounded(result, exports.EVENT_BOUNDS.requestBytes);
    return result;
}
function time(value) {
    const v = object(value, ['kind', 'dateTime', 'localDate', 'localTime', 'timezone', 'dateTBD', 'dateTBA', 'timeTBA', 'noSpecificTime']);
    let result;
    if (v.kind === 'UTC')
        result = { kind: 'UTC', dateTime: utc(v.dateTime), ...(v.localDate === undefined ? {} : { localDate: date(v.localDate) }) };
    else if (v.kind === 'PROVIDER_LOCAL' && v.dateTime === undefined)
        result = { kind: 'PROVIDER_LOCAL', localDate: date(v.localDate) };
    else
        return invalid();
    if (v.localTime !== undefined) {
        const localTime = text(v.localTime, 8);
        if (!result.localDate || !/^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(localTime))
            return invalid();
        result.localTime = localTime;
    }
    if (v.timezone !== undefined) {
        result.timezone = text(v.timezone, 100);
        try {
            new Intl.DateTimeFormat('en', { timeZone: result.timezone });
        }
        catch {
            return invalid();
        }
    }
    for (const flag of ['dateTBD', 'dateTBA', 'timeTBA', 'noSpecificTime']) {
        if (v[flag] !== undefined) {
            if (typeof v[flag] !== 'boolean')
                return invalid();
            result[flag] = v[flag];
        }
    }
    if (result.kind === 'UTC' && (result.dateTBD || result.dateTBA || result.timeTBA || result.noSpecificTime))
        return invalid();
    return result;
}
function venue(value) {
    const v = object(value, ['providerVenueId', 'name', 'location']);
    const result = {};
    if (v.providerVenueId !== undefined)
        result.providerVenueId = id(v.providerVenueId);
    if (v.name !== undefined)
        result.name = text(v.name, 200);
    if (v.location !== undefined) {
        const c = object(v.location, ['latitude', 'longitude']);
        if (typeof c.latitude !== 'number' || !Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || typeof c.longitude !== 'number' || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180)
            return invalid();
        result.location = { latitude: c.latitude, longitude: c.longitude };
    }
    return result;
}
function candidate(value) {
    const v = object(value, ['provider', 'providerEventId', 'title', 'start', 'end', 'venues', 'review', 'attribution', 'provenance']);
    if (v.provider !== 'ticketmaster' || v.review !== 'REVIEW_REQUIRED')
        return invalid();
    const providerEventId = id(v.providerEventId), title = text(v.title, 300), start = time(v.start);
    const end = v.end === undefined ? undefined : time(v.end);
    if (end) {
        if (start.dateTime && end.dateTime && Date.parse(end.dateTime) < Date.parse(start.dateTime))
            return invalid();
        if (start.localDate && end.localDate && end.localDate < start.localDate)
            return invalid();
        if (start.localDate === end.localDate && start.localTime && end.localTime && end.localTime < start.localTime)
            return invalid();
    }
    let venues;
    if (v.venues !== undefined) {
        if (!Array.isArray(v.venues) || v.venues.length > 3)
            return invalid();
        venues = v.venues.map(venue);
    }
    const a = object(v.attribution, ['providerName', 'displayRequirement']);
    if (a.providerName !== 'Ticketmaster' || a.displayRequirement !== 'REQUIRES_FINAL_T005_REVIEW')
        return invalid();
    const p = object(v.provenance, ['provider', 'providerEventId', 'boundary', 'observation', 'observedAt']);
    if (p.provider !== 'ticketmaster' || p.providerEventId !== providerEventId || p.boundary !== 'discover-events' || p.observation !== 'SERVER_RECEIVED')
        return invalid();
    return { kind: 'live-event-candidate', provider: 'ticketmaster', providerEventId, title, start, ...(end ? { end } : {}), ...(venues ? { venues } : {}), review: 'REVIEW_REQUIRED',
        attribution: { providerName: 'Ticketmaster', displayRequirement: 'REQUIRES_FINAL_T005_REVIEW' },
        provenance: { provider: 'ticketmaster', providerEventId, boundary: 'discover-events', observation: 'SERVER_RECEIVED', observedAt: utc(p.observedAt) } };
}
/** Validate the Edge wire envelope; the local kind discriminant is added only after validation. */
function parseEventIntelligenceResponse(value, limit) {
    integer(limit, 1, 3);
    const envelope = object(value, ['data']);
    const v = object(envelope.data, ['events', 'pagination', 'providerAccess']);
    if (!Array.isArray(v.events) || v.events.length > limit)
        return invalid();
    const events = v.events.map(candidate);
    if (new Set(events.map(e => e.providerEventId)).size !== events.length)
        return invalid();
    const p = object(v.pagination, ['size', 'number', 'totalElements', 'totalPages']);
    const size = integer(p.size, 0, limit), totalElements = integer(p.totalElements, 0), totalPages = integer(p.totalPages, 0);
    if (p.number !== 0 || events.length > size || events.length > totalElements || (!events.length && totalElements !== 0) || (totalElements === 0 ? totalPages !== 0 : totalPages < 1))
        return invalid();
    const access = object(v.providerAccess, ['httpStatus', 'completedProviderCalls', 'rateLimitHeaders']);
    const httpStatus = integer(access.httpStatus, 200, 299);
    if (access.completedProviderCalls !== 1)
        return invalid();
    const headers = object(access.rateLimitHeaders, ['rate-limit', 'rate-limit-available', 'rate-limit-over', 'rate-limit-reset', 'retry-after']);
    const rateLimitHeaders = {};
    for (const [key, val] of Object.entries(headers)) {
        if (typeof val !== 'string' || !/^\d{1,16}$/.test(val))
            return invalid();
        rateLimitHeaders[key] = val;
    }
    bounded(value, exports.EVENT_BOUNDS.responseBytes);
    return { events, pagination: { size, number: 0, totalElements, totalPages }, providerAccess: { httpStatus, completedProviderCalls: 1, rateLimitHeaders } };
}
