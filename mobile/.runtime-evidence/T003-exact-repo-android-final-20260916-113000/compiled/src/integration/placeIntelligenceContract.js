"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLACE_BUSINESS_STATUSES = void 0;
exports.validatePlaceIntelligenceRequest = validatePlaceIntelligenceRequest;
exports.validatePlaceBusinessStatus = validatePlaceBusinessStatus;
exports.validatePlaceOpeningHours = validatePlaceOpeningHours;
exports.validatePlaceIntelligence = validatePlaceIntelligence;
const validation_1 = require("./validation");
exports.PLACE_BUSINESS_STATUSES = [
    'OPERATIONAL',
    'CLOSED_TEMPORARILY',
    'CLOSED_PERMANENTLY',
    'UNKNOWN',
];
function only(value, keys) {
    return (0, validation_1.isRecord)(value) && Object.keys(value).every((key) => keys.includes(key));
}
function timestamp(value, name) {
    if (typeof value !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value) ||
        !Number.isFinite(Date.parse(value))) {
        throw new validation_1.ContractValidationError(name);
    }
    return value;
}
function validatePlaceIntelligenceRequest(value) {
    if (!(0, validation_1.isRecord)(value) || !only(value, ['googlePlaceId']) || typeof value.googlePlaceId !== 'string') {
        throw new validation_1.ContractValidationError('place intelligence request');
    }
    return {
        googlePlaceId: (0, validation_1.asGooglePlaceId)(value.googlePlaceId),
    };
}
function validatePlaceBusinessStatus(value) {
    if (value === null || value === undefined) {
        return 'UNKNOWN';
    }
    if (typeof value === 'string' && exports.PLACE_BUSINESS_STATUSES.includes(value)) {
        return value;
    }
    throw new validation_1.ContractValidationError('place business status');
}
function validateTimePoint(value) {
    if (!(0, validation_1.isRecord)(value) ||
        !only(value, ['day', 'hour', 'minute']) ||
        typeof value.day !== 'number' || !Number.isInteger(value.day) || value.day < 0 || value.day > 6 ||
        typeof value.hour !== 'number' || !Number.isInteger(value.hour) || value.hour < 0 || value.hour > 23 ||
        typeof value.minute !== 'number' || !Number.isInteger(value.minute) || value.minute < 0 || value.minute > 59) {
        throw new validation_1.ContractValidationError('opening hours time point');
    }
    return { day: value.day, hour: value.hour, minute: value.minute };
}
function validateOpeningPeriod(value) {
    if (!(0, validation_1.isRecord)(value) || !only(value, ['open', 'close'])) {
        throw new validation_1.ContractValidationError('opening hours period');
    }
    const open = validateTimePoint(value.open);
    const close = value.close !== undefined ? validateTimePoint(value.close) : undefined;
    return { open, ...(close ? { close } : {}) };
}
function validatePlaceOpeningHours(value) {
    if (value === null || value === undefined)
        return null;
    if (!(0, validation_1.isRecord)(value) || !only(value, ['periods', 'weekdayDescriptions', 'openNow'])) {
        throw new validation_1.ContractValidationError('opening hours');
    }
    if (!Array.isArray(value.periods) || value.periods.length > 28) {
        throw new validation_1.ContractValidationError('opening hours periods');
    }
    const periods = value.periods.map(validateOpeningPeriod);
    if (!Array.isArray(value.weekdayDescriptions) || value.weekdayDescriptions.length > 7) {
        throw new validation_1.ContractValidationError('opening hours weekday descriptions');
    }
    const weekdayDescriptions = [];
    for (const desc of value.weekdayDescriptions) {
        if (typeof desc !== 'string' || desc.length > 200) {
            throw new validation_1.ContractValidationError('opening hours weekday description item');
        }
        weekdayDescriptions.push(desc.trim());
    }
    if (value.openNow !== undefined && typeof value.openNow !== 'boolean') {
        throw new validation_1.ContractValidationError('opening hours openNow');
    }
    return {
        periods,
        weekdayDescriptions,
        ...(value.openNow !== undefined ? { openNow: value.openNow } : {}),
    };
}
function validatePlaceIntelligence(value, fallbackReceivedAt) {
    if (!(0, validation_1.isRecord)(value)) {
        throw new validation_1.ContractValidationError('place intelligence');
    }
    const allowedKeys = [
        'kind',
        'googlePlaceId',
        'businessStatus',
        'openingHours',
        'utcOffsetMinutes',
        'rating',
        'userRatingCount',
        'provenance',
    ];
    if (!only(value, allowedKeys)) {
        throw new validation_1.ContractValidationError('place intelligence payload keys');
    }
    if (value.kind !== undefined && value.kind !== 'live-place-intelligence') {
        throw new validation_1.ContractValidationError('place intelligence kind');
    }
    const googlePlaceId = (0, validation_1.asGooglePlaceId)(value.googlePlaceId);
    const businessStatus = validatePlaceBusinessStatus(value.businessStatus);
    const openingHours = validatePlaceOpeningHours(value.openingHours);
    let utcOffsetMinutes;
    if (value.utcOffsetMinutes !== undefined) {
        if (typeof value.utcOffsetMinutes !== 'number' ||
            !Number.isInteger(value.utcOffsetMinutes) ||
            value.utcOffsetMinutes < -840 ||
            value.utcOffsetMinutes > 840) {
            throw new validation_1.ContractValidationError('place intelligence utcOffsetMinutes');
        }
        utcOffsetMinutes = value.utcOffsetMinutes;
    }
    let rating;
    if (value.rating !== undefined) {
        if (typeof value.rating !== 'number' || !Number.isFinite(value.rating) || value.rating < 0 || value.rating > 5) {
            throw new validation_1.ContractValidationError('place intelligence rating');
        }
        rating = value.rating;
    }
    let userRatingCount;
    if (value.userRatingCount !== undefined) {
        if (typeof value.userRatingCount !== 'number' ||
            !Number.isSafeInteger(value.userRatingCount) ||
            value.userRatingCount < 0) {
            throw new validation_1.ContractValidationError('place intelligence userRatingCount');
        }
        userRatingCount = value.userRatingCount;
    }
    if (!(0, validation_1.isRecord)(value.provenance) ||
        !only(value.provenance, ['provider', 'boundary', 'observation', 'fetchedAt', 'receivedAt']) ||
        value.provenance.provider !== 'google-places' ||
        value.provenance.boundary !== 'get-place-metadata') {
        throw new validation_1.ContractValidationError('place intelligence provenance');
    }
    const fetchedAt = timestamp(value.provenance.fetchedAt, 'place intelligence fetchedAt');
    const receivedAt = timestamp(value.provenance.receivedAt ?? fallbackReceivedAt ?? new Date().toISOString(), 'place intelligence receivedAt');
    return {
        kind: 'live-place-intelligence',
        googlePlaceId,
        businessStatus,
        openingHours,
        ...(utcOffsetMinutes !== undefined ? { utcOffsetMinutes } : {}),
        ...(rating !== undefined ? { rating } : {}),
        ...(userRatingCount !== undefined ? { userRatingCount } : {}),
        provenance: {
            provider: 'google-places',
            boundary: 'get-place-metadata',
            observation: 'CLIENT_RECEIVED',
            fetchedAt,
            receivedAt,
        },
    };
}
