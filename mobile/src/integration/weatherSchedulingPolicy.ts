import type { Coordinate, WeatherForecast, WeatherRequest, WorkspaceContactPatch } from './contracts';
import {
  evaluatePlanConstraints, PLANNING_BOUNDS,
  type ConstraintEvaluationResult, type ConstraintItem,
} from './deterministicConstraintEngine';
import { isRecord, isValidCoordinate } from './validation';

/** TripWise product policy, not provider advice. Temperature/WMO code are informational. */
export const WEATHER_SCHEDULING_POLICY = {
  HIGH_PRECIPITATION_PERCENT: 60,
  LOW_PRECIPITATION_PERCENT: 30, // strictly below 30
  MAX_FORECAST_DAYS: 16,
  MAX_SENSITIVE_ITEMS: 20,
  MAX_LOGICAL_FORECAST_REQUESTS: 1,
} as const;

/** Caller must obtain explicit user input; never derive this from category/title/coordinates. */
export type ExplicitWeatherPreference = {
  itemId: string;
  source: 'user_explicit';
  sensitivity: 'avoid_precipitation';
  allowedDayNumbers: readonly number[];
};
export type WeatherScheduleItem = ConstraintItem & {
  resolution?: 'VERIFIED' | 'UNRESOLVED';
  latitude?: number | null;
  longitude?: number | null;
  itemKind?: string;
  activityStatus?: string;
  contact?: WorkspaceContactPatch;
  transport?: unknown;
  accommodation?: unknown;
};
export type WeatherSchedule = {
  id?: string;
  days: { dayNumber: number; date?: string; items: WeatherScheduleItem[] }[];
};
export type WeatherSchedulingStatus =
  | 'applied' | 'no_weather_sensitive_items' | 'no_change'
  | 'forecast_unavailable' | 'forecast_out_of_horizon' | 'incomplete_forecast_facts'
  | 'location_unavailable' | 'protected_constraint_conflict' | 'cancelled' | 'invalid_input';
export type WeatherSchedulingReason =
  | 'empty_itinerary' | 'no_explicit_preferences' | 'below_threshold' | 'no_lower_risk_day'
  | 'missing_verified_coordinate' | 'invalid_coordinate' | 'multiple_locations'
  | 'missing_calendar_date' | 'invalid_calendar_date' | 'outside_16_days'
  | 'missing_forecast' | 'missing_forecast_date' | 'missing_precipitation'
  | 'invalid_forecast' | 'fixed_item' | 'timed_or_bound_activity' | 'constraint_rejected'
  | 'provider_failure' | 'invalid_preferences' | 'invalid_itinerary' | 'aborted' | 'lower_precipitation';
export type WeatherSchedulingDecision = {
  itemId: string;
  fromDayNumber: number;
  toDayNumber: number;
  fromDate: string;
  toDate: string;
  originalPrecipitationPercent: number;
  proposedPrecipitationPercent: number;
};
export type WeatherSchedulingResult = {
  status: WeatherSchedulingStatus;
  reason: WeatherSchedulingReason;
  /** null only when canonical itinerary is invalid; never repaired. */
  schedule: WeatherSchedule | null;
  decisions: WeatherSchedulingDecision[];
  validation: ConstraintEvaluationResult;
  rejectedValidation?: ConstraintEvaluationResult;
  /** Repository requests, not upstream HTTP attempts. */
  logicalForecastRequestCount: number;
};
export type WeatherSchedulingContext = {
  /** Explicit current calendar date AT the verified forecast location; not device/UTC today. */
  localToday: string;
};
export type LocatedWeatherFacts = {
  coordinate: Coordinate;
  forecast: WeatherForecast | null;
};
export type PreparedWeatherScheduling = {
  baseline: WeatherSchedule;
  preferences: ExplicitWeatherPreference[];
  request: WeatherRequest;
  validation: ConstraintEvaluationResult;
};

/** Gregorian calendar ordinal only: no timestamps, timezone conversion, or hidden clock. */
function calendarOrdinal(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > lengths[month - 1]) return null;
  const y = year - 1;
  return 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
    + lengths.slice(0, month - 1).reduce((sum, count) => sum + count, 0) + day;
}

export function weatherSchedulingFallback(
  schedule: WeatherSchedule | null, validation: ConstraintEvaluationResult,
  status: WeatherSchedulingStatus, reason: WeatherSchedulingReason,
): WeatherSchedulingResult {
  return { status, reason, schedule, validation, decisions: [], logicalForecastRequestCount: 0 };
}

/** T001 is first: never project rejected days/items, including oversized payloads. */
export function prepareWeatherScheduling(
  input: unknown, preferences: unknown, context: WeatherSchedulingContext,
): PreparedWeatherScheduling | WeatherSchedulingResult {
  const validation = evaluatePlanConstraints(input);
  if (!validation.isValid) return weatherSchedulingFallback(null, validation, 'invalid_input', 'invalid_itinerary');
  const raw = (Array.isArray(input) ? { days: input } : input) as WeatherSchedule;
  // Copy the accepted snapshot before any await; retain item metadata, never mutate the caller.
  const baseline: WeatherSchedule = { ...raw, days: raw.days.map(day => ({
    ...day, items: day.items.map(item => ({ ...item,
      ...(item.contact === undefined ? {} : { contact: { ...item.contact } }),
    })).sort((a, b) => a.position - b.position),
  })).sort((a, b) => a.dayNumber - b.dayNumber) };
  const fallback = (status: WeatherSchedulingStatus, reason: WeatherSchedulingReason) =>
    weatherSchedulingFallback(baseline, validation, status, reason);
  if (!Array.isArray(preferences) || preferences.length > WEATHER_SCHEDULING_POLICY.MAX_SENSITIVE_ITEMS) {
    return fallback('invalid_input', 'invalid_preferences');
  }
  const items = new Map(baseline.days.flatMap(day => day.items.map(item => [item.id, item] as const)));
  for (const item of items.values()) {
    const code = item.contact?.reservationCode;
    // Same nullable bounded-string semantics as the canonical workspace boundary.
    if (code != null && (typeof code !== 'string' || !code.trim() || code.trim().length > 128)) {
      return fallback('invalid_input', 'invalid_itinerary');
    }
  }
  const dayNumbers = new Set(baseline.days.map(day => day.dayNumber));
  const seen = new Set<string>();
  const parsed: ExplicitWeatherPreference[] = [];
  for (const pref of preferences) {
    if (!isRecord(pref) || typeof pref.itemId !== 'string' || !items.has(pref.itemId) || seen.has(pref.itemId)
      || pref.source !== 'user_explicit' || pref.sensitivity !== 'avoid_precipitation'
      || !Array.isArray(pref.allowedDayNumbers) || pref.allowedDayNumbers.length > 16
      || pref.allowedDayNumbers.some(day => !Number.isInteger(day) || !dayNumbers.has(day))
      || new Set(pref.allowedDayNumbers).size !== pref.allowedDayNumbers.length) {
      return fallback('invalid_input', 'invalid_preferences');
    }
    seen.add(pref.itemId);
    parsed.push({ itemId: pref.itemId, source: 'user_explicit', sensitivity: 'avoid_precipitation',
      allowedDayNumbers: [...pref.allowedDayNumbers].sort((a, b) => a - b) });
  }
  if (!parsed.length) return fallback('no_weather_sensitive_items', items.size ? 'no_explicit_preferences' : 'empty_itinerary');
  parsed.sort((a, b) => a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0);
  const today = calendarOrdinal(context.localToday);
  if (today === null) return fallback('invalid_input', 'invalid_calendar_date');
  let forecastDays = 1;
  const seenDates = new Set<string>();
  for (const day of baseline.days) {
    if (day.date === undefined) return fallback('incomplete_forecast_facts', 'missing_calendar_date');
    const ordinal = calendarOrdinal(day.date);
    if (ordinal === null || seenDates.has(day.date)) return fallback('invalid_input', 'invalid_calendar_date');
    seenDates.add(day.date);
    const offset = ordinal - today + 1;
    if (offset < 1 || offset > 16) return fallback('forecast_out_of_horizon', 'outside_16_days');
    forecastDays = Math.max(forecastDays, offset);
  }
  let coordinate: Coordinate | undefined;
  for (const pref of parsed) {
    const item = items.get(pref.itemId)!;
    if (item.resolution !== 'VERIFIED') return fallback('location_unavailable', 'missing_verified_coordinate');
    const candidate = { latitude: item.latitude, longitude: item.longitude };
    if (!isValidCoordinate(candidate)) return fallback('location_unavailable', 'invalid_coordinate');
    if (coordinate && (coordinate.latitude !== candidate.latitude || coordinate.longitude !== candidate.longitude)) {
      return fallback('location_unavailable', 'multiple_locations');
    }
    coordinate = candidate;
  }
  return { baseline, validation, preferences: parsed, request: { ...coordinate!, forecastDays } };
}

/** Public final safety boundary for proposals; protected conflict always returns baseline. */
export function validateWeatherScheduleProposal(baseline: WeatherSchedule, proposed: WeatherSchedule): WeatherSchedulingResult {
  const original = evaluatePlanConstraints(baseline);
  if (!original.isValid) return weatherSchedulingFallback(null, original, 'invalid_input', 'invalid_itinerary');
  const validation = evaluatePlanConstraints(proposed, baseline);
  if (!validation.isValid) return { ...weatherSchedulingFallback(baseline, original,
    'protected_constraint_conflict', 'constraint_rejected'), rejectedValidation: validation };
  return weatherSchedulingFallback(proposed, validation, 'no_change', 'below_threshold');
}

/** Pure normalized-fact policy. Daily probability supports date moves, never time-of-day advice. */
export function applyWeatherSchedulingPolicy(
  input: unknown, preferences: unknown, context: WeatherSchedulingContext, facts: LocatedWeatherFacts,
): WeatherSchedulingResult {
  const prepared = prepareWeatherScheduling(input, preferences, context);
  if ('status' in prepared) return prepared;
  return applyPreparedWeatherScheduling(prepared, facts);
}

export function applyPreparedWeatherScheduling(
  prepared: PreparedWeatherScheduling, facts: LocatedWeatherFacts,
): WeatherSchedulingResult {
  const { baseline, validation, preferences, request } = prepared;
  const fallback = (status: WeatherSchedulingStatus, reason: WeatherSchedulingReason) =>
    weatherSchedulingFallback(baseline, validation, status, reason);
  if (!isValidCoordinate(facts.coordinate) || facts.coordinate.latitude !== request.latitude
    || facts.coordinate.longitude !== request.longitude) return fallback('location_unavailable', 'invalid_coordinate');
  if (facts.forecast === null) return fallback('forecast_unavailable', 'missing_forecast');
  const forecast = facts.forecast;
  // Validate normalized facts only. No Open-Meteo JSON keys or UI descriptions enter the policy.
  if (!forecast || !Array.isArray(forecast.days) || forecast.days.length > 16) {
    return fallback('incomplete_forecast_facts', 'invalid_forecast');
  }
  const probabilities = new Map<string, number | null>();
  for (const day of forecast.days) {
    if (!day || calendarOrdinal(day.date) === null || probabilities.has(day.date)
      || (day.maximumPrecipitationProbability !== null && (typeof day.maximumPrecipitationProbability !== 'number'
        || !Number.isFinite(day.maximumPrecipitationProbability)
        || day.maximumPrecipitationProbability < 0 || day.maximumPrecipitationProbability > 100))) {
      return fallback('incomplete_forecast_facts', 'invalid_forecast');
    }
    probabilities.set(day.date, day.maximumPrecipitationProbability);
  }
  const relevantDays = new Set(preferences.flatMap(pref => [
    baseline.days.find(day => day.items.some(item => item.id === pref.itemId))!.dayNumber,
    ...pref.allowedDayNumbers,
  ]));
  for (const day of baseline.days.filter(day => relevantDays.has(day.dayNumber))) {
    if (!probabilities.has(day.date!)) return fallback('incomplete_forecast_facts', 'missing_forecast_date');
    if (probabilities.get(day.date!) === null) return fallback('incomplete_forecast_facts', 'missing_precipitation');
  }
  let proposed: WeatherSchedule = { ...baseline, days: baseline.days.map(day => ({ ...day, items: [...day.items] })) };
  const decisions: WeatherSchedulingDecision[] = [];
  let reason: WeatherSchedulingReason = 'below_threshold';
  for (const pref of preferences) {
    const from = proposed.days.find(day => day.items.some(item => item.id === pref.itemId))!;
    const item = from.items.find(item => item.id === pref.itemId)!;
    const probability = probabilities.get(from.date!)!;
    if (probability === null || probability < WEATHER_SCHEDULING_POLICY.HIGH_PRECIPITATION_PERCENT) continue;
    if (item.flexibility === 'fixed') return fallback('protected_constraint_conflict', 'fixed_item');
    // Do not reinterpret booked/timed/completed activities as freely movable dates.
    if (item.startTime != null || item.endTime != null || item.transport != null || item.accommodation != null
      || (typeof item.contact?.reservationCode === 'string' && item.contact.reservationCode.trim().length > 0)
      || ['transport', 'accommodation', 'reservation'].includes(item.itemKind ?? '')
      || (item.activityStatus !== undefined && item.activityStatus !== 'scheduled')) {
      return fallback('no_change', 'timed_or_bound_activity');
    }
    const target = proposed.days.filter(day => day.dayNumber !== from.dayNumber
      && pref.allowedDayNumbers.includes(day.dayNumber)
      && day.items.length < PLANNING_BOUNDS.MAX_ITEMS_PER_DAY
      && probabilities.get(day.date!)! < WEATHER_SCHEDULING_POLICY.LOW_PRECIPITATION_PERCENT)
      .sort((a, b) => probabilities.get(a.date!)! - probabilities.get(b.date!)! || a.dayNumber - b.dayNumber)[0];
    if (!target) { reason = 'no_lower_risk_day'; continue; }
    const candidate: WeatherSchedule = { ...proposed, days: proposed.days.map(day => ({ ...day,
      items: (day.dayNumber === from.dayNumber ? day.items.filter(value => value.id !== item.id)
        : day.dayNumber === target.dayNumber ? [...day.items, { ...item, dayNumber: target.dayNumber }] : day.items)
        .map((value, index) => ({ ...value, position: index + 1 })),
    })) };
    // Moving another item must not indirectly shift a reservation's canonical slot.
    if (baseline.days.some(day => day.items.some(value => {
      if (!value.contact?.reservationCode) return false;
      const retained = candidate.days.find(next => next.dayNumber === day.dayNumber)
        ?.items.find(next => next.id === value.id);
      return !retained || retained.position !== value.position;
    }))) return fallback('no_change', 'timed_or_bound_activity');
    const safe = validateWeatherScheduleProposal(baseline, candidate);
    if (safe.status === 'protected_constraint_conflict') return safe;
    proposed = candidate;
    decisions.push({ itemId: item.id, fromDayNumber: from.dayNumber, toDayNumber: target.dayNumber,
      fromDate: from.date!, toDate: target.date!, originalPrecipitationPercent: probability,
      proposedPrecipitationPercent: probabilities.get(target.date!)! });
  }
  const safe = validateWeatherScheduleProposal(baseline, proposed);
  if (safe.status === 'protected_constraint_conflict' || safe.status === 'invalid_input') return safe;
  return { ...safe, status: decisions.length ? 'applied' : 'no_change',
    reason: decisions.length ? 'lower_precipitation' : reason, decisions };
}
