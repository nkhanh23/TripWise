import type { GeneratedTrip } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isGeneratedItem(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isInteger(value.position) &&
    isString(value.placeName) &&
    isOptionalString(value.placeQuery) &&
    isOptionalString(value.startTime) &&
    isOptionalString(value.endTime) &&
    isOptionalString(value.note) &&
    (value.estimatedCost === undefined ||
      (typeof value.estimatedCost === "number" &&
        Number.isFinite(value.estimatedCost) &&
        value.estimatedCost >= 0))
  );
}

function isGeneratedDay(value: unknown): boolean {
  return (
    isRecord(value) &&
    Number.isInteger(value.dayNumber) &&
    isString(value.date) &&
    isOptionalString(value.summary) &&
    Array.isArray(value.items) &&
    value.items.every(isGeneratedItem)
  );
}

export function parseGenerateTripResponse(
  value: unknown,
): GeneratedTrip | null {
  if (!isRecord(value) || !isRecord(value.data)) {
    return null;
  }
  const trip = value.data;
  if (
    !isString(trip.title) ||
    !isString(trip.destination) ||
    !isString(trip.startDate) ||
    !isString(trip.endDate) ||
    !isOptionalString(trip.summary) ||
    !Array.isArray(trip.days) ||
    !trip.days.every(isGeneratedDay)
  ) {
    return null;
  }
  return trip as GeneratedTrip;
}
