import type { GenerateTripRequest, GeneratedTrip, GeneratedTripDay, GeneratedTripItem } from './types.ts';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const currencyPattern = /^[A-Za-z]{3}$/;
const dayMilliseconds = 86_400_000;
const maximumTripDays = 14;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

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

function validateItem(value: unknown): value is GeneratedTripItem {
  if (!isRecord(value) || !hasOnlyKeys(value, ['position', 'placeName', 'placeQuery', 'startTime', 'endTime', 'note', 'estimatedCost'])) {
    return false;
  }
  if (!Number.isInteger(value.position) || !isNonEmptyString(value.placeName, 160)) {
    return false;
  }
  if (!isOptionalString(value.placeQuery, 200) || !isOptionalString(value.note, 500)) {
    return false;
  }
  if (value.startTime !== undefined && (typeof value.startTime !== 'string' || !timePattern.test(value.startTime))) {
    return false;
  }
  if (value.endTime !== undefined && (typeof value.endTime !== 'string' || !timePattern.test(value.endTime))) {
    return false;
  }
  if (typeof value.startTime === 'string' && typeof value.endTime === 'string' && value.endTime < value.startTime) {
    return false;
  }
  return value.estimatedCost === undefined || (typeof value.estimatedCost === 'number' && Number.isFinite(value.estimatedCost) && value.estimatedCost >= 0 && value.estimatedCost <= 1_000_000_000);
}

function validateDay(value: unknown): value is GeneratedTripDay {
  if (!isRecord(value) || !hasOnlyKeys(value, ['dayNumber', 'date', 'summary', 'items'])) {
    return false;
  }
  if (!Number.isInteger(value.dayNumber) || !parseIsoDate(value.date) || !isOptionalString(value.summary, 500)) {
    return false;
  }
  return Array.isArray(value.items) && value.items.length >= 1 && value.items.length <= 6 && value.items.every(validateItem);
}

export function validateGeneratedTrip(value: unknown, request: GenerateTripRequest): ValidationResult<GeneratedTrip> {
  if (!isRecord(value) || !hasOnlyKeys(value, ['title', 'destination', 'startDate', 'endDate', 'summary', 'days'])) {
    return { ok: false, message: 'AI response does not match the itinerary contract.' };
  }
  if (!isNonEmptyString(value.title, 160) || !isNonEmptyString(value.destination, 120)
    || !parseIsoDate(value.startDate) || !parseIsoDate(value.endDate) || !isOptionalString(value.summary, 800)) {
    return { ok: false, message: 'AI response contains inconsistent trip metadata.' };
  }
  const startDate = parseIsoDate(request.startDate)!;
  const endDate = parseIsoDate(request.endDate)!;
  const duration = dateDifferenceInDays(startDate, endDate);
  if (!Array.isArray(value.days) || value.days.length !== duration || !value.days.every(validateDay)) {
    return { ok: false, message: 'AI response contains an invalid daily itinerary.' };
  }

  const generated = value as GeneratedTrip;
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
    startDate: { type: 'string', description: 'Trip start date in YYYY-MM-DD format.' },
    endDate: { type: 'string', description: 'Trip end date in YYYY-MM-DD format.' },
    summary: { type: 'string', description: 'Short Vietnamese overview of the itinerary.' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          dayNumber: { type: 'integer' },
          date: { type: 'string', description: 'Calendar date in YYYY-MM-DD format.' },
          summary: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            maxItems: 6,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                position: { type: 'integer' },
                placeName: { type: 'string', description: 'AI-suggested place name; not verified place metadata.' },
                placeQuery: { type: 'string', description: 'Search phrase for later Google Places resolution.' },
                startTime: { type: 'string', description: 'Approximate local time in HH:MM format.' },
                endTime: { type: 'string', description: 'Approximate local time in HH:MM format.' },
                note: { type: 'string' },
                estimatedCost: { type: 'number', minimum: 0, description: 'Non-authoritative estimated cost.' },
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
