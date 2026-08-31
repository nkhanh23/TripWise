import type { GenerateTripRequest, GeneratedTrip } from './types.ts';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const currencyPattern = /^[A-Za-z]{3}$/;
const dayMilliseconds = 86_400_000;
const maximumTripDays = 14;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string; diagnostic?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonEmptyString(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximumLength;
}

function isOptionalString(value: unknown, maximumLength: number): value is string | undefined {
  return value === undefined || (typeof value === 'string' && value.length <= maximumLength);
}

function normalizeOptionalString(value: unknown): unknown {
  return typeof value === 'string' && value.trim().length === 0 ? undefined : value;
}

function omitUndefinedValues(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

export function normalizeTripPayload(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return omitUndefinedValues({
    ...value,
    summary: normalizeOptionalString(value.summary),
    days: Array.isArray(value.days)
      ? value.days.map((day) => !isRecord(day) ? day : omitUndefinedValues({
        ...day,
        summary: normalizeOptionalString(day.summary),
        items: Array.isArray(day.items)
          ? day.items.map((item) => !isRecord(item) ? item : omitUndefinedValues({
            ...item,
            placeQuery: normalizeOptionalString(item.placeQuery),
            note: normalizeOptionalString(item.note),
            startTime: normalizeOptionalString(item.startTime),
            endTime: normalizeOptionalString(item.endTime),
          }))
          : day.items,
      }))
      : value.days,
  });
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !datePattern.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function dateDifferenceInDays(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / dayMilliseconds) + 1;
}

function addDays(date: Date, days: number): string {
  return new Date(date.getTime() + days * dayMilliseconds).toISOString().slice(0, 10);
}

export function validateGenerateTripRequest(value: unknown): ValidationResult<GenerateTripRequest> {
  if (!isRecord(value) || !hasOnlyKeys(value, ['destination', 'startDate', 'endDate', 'travelers', 'budget', 'currency', 'preferences', 'notes'])) {
    return { ok: false, message: 'Request body contains unsupported fields.' };
  }
  if (!isNonEmptyString(value.destination, 120)) {
    return { ok: false, message: 'Destination is required and must not exceed 120 characters.' };
  }
  const startDate = parseIsoDate(value.startDate);
  const endDate = parseIsoDate(value.endDate);
  if (!startDate || !endDate) {
    return { ok: false, message: 'startDate and endDate must use valid YYYY-MM-DD dates.' };
  }
  const duration = dateDifferenceInDays(startDate, endDate);
  if (duration < 1 || duration > maximumTripDays) {
    return { ok: false, message: `Trip duration must be between 1 and ${maximumTripDays} days.` };
  }
  if (value.travelers !== undefined && (!Number.isInteger(value.travelers) || (value.travelers as number) < 1 || (value.travelers as number) > 20)) {
    return { ok: false, message: 'travelers must be an integer from 1 to 20.' };
  }
  if (value.budget !== undefined && (typeof value.budget !== 'number' || !Number.isFinite(value.budget) || value.budget < 0 || value.budget > 1_000_000_000)) {
    return { ok: false, message: 'budget must be a non-negative number no greater than 1,000,000,000.' };
  }
  if (value.currency !== undefined && (typeof value.currency !== 'string' || !currencyPattern.test(value.currency))) {
    return { ok: false, message: 'currency must be a three-letter code.' };
  }
  if (value.preferences !== undefined && (!Array.isArray(value.preferences) || value.preferences.length > 10 || value.preferences.some((item) => !isNonEmptyString(item, 60)))) {
    return { ok: false, message: 'preferences must contain at most 10 non-empty values of 60 characters or fewer.' };
  }
  if (!isOptionalString(value.notes, 500)) {
    return { ok: false, message: 'notes must not exceed 500 characters.' };
  }

  return {
    ok: true,
    value: {
      destination: value.destination.trim(),
      startDate: value.startDate as string,
      endDate: value.endDate as string,
      ...(value.travelers === undefined ? {} : { travelers: value.travelers as number }),
      ...(value.budget === undefined ? {} : { budget: value.budget }),
      ...(value.currency === undefined ? {} : { currency: (value.currency as string).toUpperCase() }),
      ...(value.preferences === undefined ? {} : { preferences: (value.preferences as string[]).map((item) => item.trim()) }),
      ...(value.notes === undefined ? {} : { notes: value.notes }),
    },
  };
}

function getItemValidationDiagnostic(value: unknown, path: string): string | null {
  if (!isRecord(value)) return `${path} must be an object`;
  if (!hasOnlyKeys(value, ['position', 'placeName', 'placeQuery', 'startTime', 'endTime', 'note', 'estimatedCost'])) {
    return `${path} contains unsupported fields`;
  }
  if (!Number.isInteger(value.position)) return `${path}.position must be an integer`;
  if (!isNonEmptyString(value.placeName, 160)) return `${path}.placeName must be a non-empty string up to 160 characters`;
  if (!isOptionalString(value.placeQuery, 200)) return `${path}.placeQuery must be a string up to 200 characters`;
  if (!isOptionalString(value.note, 500)) return `${path}.note must be a string up to 500 characters`;
  if (value.startTime !== undefined && (typeof value.startTime !== 'string' || !timePattern.test(value.startTime))) {
    return `${path}.startTime must use HH:MM`;
  }
  if (value.endTime !== undefined && (typeof value.endTime !== 'string' || !timePattern.test(value.endTime))) {
    return `${path}.endTime must use HH:MM`;
  }
  if (typeof value.startTime === 'string' && typeof value.endTime === 'string' && value.endTime < value.startTime) {
    return `${path}.endTime must not precede startTime`;
  }
  if (value.estimatedCost !== undefined && (typeof value.estimatedCost !== 'number' || !Number.isFinite(value.estimatedCost) || value.estimatedCost < 0 || value.estimatedCost > 1_000_000_000)) {
    return `${path}.estimatedCost must be a finite non-negative number within the allowed range`;
  }
  return null;
}

function getDayValidationDiagnostic(value: unknown, dayIndex: number): string | null {
  const path = `days[${dayIndex}]`;
  if (!isRecord(value)) return `${path} must be an object`;
  if (!hasOnlyKeys(value, ['dayNumber', 'date', 'summary', 'items'])) return `${path} contains unsupported fields`;
  if (!Number.isInteger(value.dayNumber)) return `${path}.dayNumber must be an integer`;
  if (!parseIsoDate(value.date)) return `${path}.date must use YYYY-MM-DD`;
  if (!isOptionalString(value.summary, 500)) return `${path}.summary must be a string up to 500 characters`;
  if (!Array.isArray(value.items) || value.items.length < 1 || value.items.length > 6) {
    return `${path}.items must contain 1 to 6 entries`;
  }
  for (let itemIndex = 0; itemIndex < value.items.length; itemIndex += 1) {
    const diagnostic = getItemValidationDiagnostic(value.items[itemIndex], `${path}.items[${itemIndex}]`);
    if (diagnostic) return diagnostic;
  }
  return null;
}


export function validateGeneratedTrip(value: unknown, request: GenerateTripRequest): ValidationResult<GeneratedTrip> {
  const normalized = normalizeTripPayload(value);
  if (!isRecord(normalized) || !hasOnlyKeys(normalized, ['title', 'destination', 'startDate', 'endDate', 'summary', 'days'])) {
    return { ok: false, message: 'AI response does not match the itinerary contract.' };
  }
  if (!isNonEmptyString(normalized.title, 160) || !isNonEmptyString(normalized.destination, 120)
    || !parseIsoDate(normalized.startDate) || !parseIsoDate(normalized.endDate) || !isOptionalString(normalized.summary, 800)) {
    return { ok: false, message: 'AI response contains inconsistent trip metadata.' };
  }
  const startDate = parseIsoDate(request.startDate)!;
  const endDate = parseIsoDate(request.endDate)!;
  const duration = dateDifferenceInDays(startDate, endDate);
  if (!Array.isArray(normalized.days)) {
    return { ok: false, message: 'AI response contains an invalid daily itinerary.', diagnostic: 'days must be an array' };
  }
  if (normalized.days.length !== duration) {
    return { ok: false, message: 'AI response contains an invalid daily itinerary.', diagnostic: `days must contain exactly ${duration} entries` };
  }
  for (let dayIndex = 0; dayIndex < normalized.days.length; dayIndex += 1) {
    const diagnostic = getDayValidationDiagnostic(normalized.days[dayIndex], dayIndex);
    if (diagnostic) return { ok: false, message: 'AI response contains an invalid daily itinerary.', diagnostic };
  }

  const generated = normalized as GeneratedTrip;
  return {
    ok: true,
    value: {
      ...generated,
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      days: generated.days.map((day, dayIndex) => ({
        ...day,
        dayNumber: dayIndex + 1,
        date: addDays(startDate, dayIndex),
        items: day.items.map((item, itemIndex) => ({ ...item, position: itemIndex + 1 })),
      })),
    },
  };
}

export const generatedTripJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string', description: 'Concise Vietnamese trip title.' },
    destination: { type: 'string', description: 'Destination exactly as provided in the request.' },
    startDate: { type: 'string', format: 'date', description: 'Trip start date in YYYY-MM-DD format.' },
    endDate: { type: 'string', format: 'date', description: 'Trip end date in YYYY-MM-DD format.' },
    summary: { type: 'string', description: 'Short Vietnamese overview of the itinerary.' },
    days: {
      type: 'array',
      minItems: 1,
      maxItems: 14,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dayNumber: { type: 'integer', minimum: 1 },
          date: { type: 'string', format: 'date', description: 'Calendar date in YYYY-MM-DD format.' },
          summary: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 6,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                position: { type: 'integer', minimum: 1 },
                placeName: { type: 'string', description: 'AI-suggested place name; not verified place metadata.' },
                placeQuery: { type: 'string', description: 'Search phrase for later Google Places resolution.' },
                startTime: { type: 'string', description: 'Approximate local time in HH:MM format.' },
                endTime: { type: 'string', description: 'Approximate local time in HH:MM format.' },
                note: { type: 'string' },
                estimatedCost: { type: 'number', minimum: 0, maximum: 1_000_000_000, description: 'Non-authoritative estimated cost.' },
              },
              required: ['position', 'placeName'],
            },
          },
        },
        required: ['dayNumber', 'date', 'items'],
      },
    },
  },
  required: ['title', 'destination', 'startDate', 'endDate', 'days'],
} as const;

export function buildGeneratedTripJsonSchema(request: GenerateTripRequest) {
  const startDate = parseIsoDate(request.startDate);
  const endDate = parseIsoDate(request.endDate);
  const duration = (startDate && endDate) ? dateDifferenceInDays(startDate, endDate) : 1;
  const bound = Math.max(1, Math.min(duration, maximumTripDays));

  return {
    ...generatedTripJsonSchema,
    properties: {
      ...generatedTripJsonSchema.properties,
      days: {
        ...generatedTripJsonSchema.properties.days,
        minItems: bound,
        maxItems: bound,
      },
    },
  } as const;
}
