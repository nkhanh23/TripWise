import type { ConstraintEvaluationResult } from './deterministicConstraintEngine';
import type { OptimizedDayResult } from './routeOptimization';
import type { TripRefreshProposal } from './tripRefresh';
import { WEATHER_SCHEDULING_POLICY, type WeatherSchedulingResult } from './weatherSchedulingPolicy';

export const EXPLANATION_BOUNDS = {
  maxReasons: 50,
  maxReasonsPerItem: 4,
  maxComposedTextLength: 320,
  maxRequestBytes: 32_768,
} as const;

export type ExplanationLocale = 'en' | 'vi';
export type ExplanationScope = 'trip' | 'day' | 'item' | 'change';
export type FactProvenance =
  | 'deterministic_constraint'
  | 'osrm'
  | 'open_meteo'
  | 'refresh_diff'
  | 'user_preferences';

type ReasonBase = {
  reasonId: string;
  scope: ExplanationScope;
  itemId?: string;
  dayId?: string;
  dayNumber?: number;
};

export type ItineraryReason =
  | (ReasonBase & { type: 'fixed_item_preserved'; provenance: 'deterministic_constraint'; facts: { position: number } })
  | (ReasonBase & { type: 'must_do_preserved'; provenance: 'deterministic_constraint'; facts: { priority: 'must_do' } })
  | (ReasonBase & { type: 'route_duration_improved'; provenance: 'osrm'; facts: { previousDurationSeconds: number; proposedDurationSeconds: number; savingsSeconds: number } })
  | (ReasonBase & { type: 'route_fallback'; provenance: 'osrm'; facts: { availability: 'unavailable' | 'partial'; reason: string } })
  | (ReasonBase & { type: 'weather_rescheduled'; provenance: 'open_meteo'; facts: { fromDate: string; toDate: string; previousPrecipitationPercent: number; proposedPrecipitationPercent: number; policyThresholdPercent: number } })
  | (ReasonBase & { type: 'weather_unavailable'; provenance: 'open_meteo'; facts: { availability: 'unavailable'; reason: string } })
  | (ReasonBase & { type: 'item_moved'; provenance: 'refresh_diff'; facts: { fromDayNumber: number; fromPosition: number; toDayNumber: number; toPosition: number } })
  | (ReasonBase & { type: 'refresh_no_op'; provenance: 'refresh_diff'; facts: { isNoOp: true } })
  | (ReasonBase & { type: 'generated_from_preferences'; provenance: 'user_preferences'; facts: { preferenceCount: number; dayCount: number } });

export type ExplanationBinding = {
  tripId: string;
  proposalId?: string;
  baselineWorkspaceRevision?: number;
};

export type ItineraryReasonSet = ExplanationBinding & {
  reasons: readonly ItineraryReason[];
};

export type ComposedReason = { reasonId: string; localizedText: string };
export type ExplanationComposition = ItineraryReasonSet & {
  locale: ExplanationLocale;
  composer: 'gemini' | 'deterministic_fallback';
  entries: readonly ComposedReason[];
};

export function matchesExplanationBinding(
  explanation: Pick<ItineraryReasonSet, 'tripId' | 'proposalId' | 'baselineWorkspaceRevision'>,
  binding: ExplanationBinding,
): boolean {
  return explanation.tripId === binding.tripId
    && explanation.proposalId === binding.proposalId
    && explanation.baselineWorkspaceRevision === binding.baselineWorkspaceRevision;
}

export interface ExplanationComposerRepository {
  compose(request: { locale: ExplanationLocale; reasonSet: ItineraryReasonSet }, signal?: AbortSignal): Promise<unknown>;
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const idPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const reasonTypes = new Set([
  'fixed_item_preserved', 'must_do_preserved', 'route_duration_improved', 'route_fallback',
  'weather_rescheduled', 'weather_unavailable', 'item_moved', 'refresh_no_op', 'generated_from_preferences',
]);
const scopes = new Set(['trip', 'day', 'item', 'change']);
const provenances = new Set(['deterministic_constraint', 'osrm', 'open_meteo', 'refresh_diff', 'user_preferences']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function boundedFinite(value: unknown, min = 0, max = 1_000_000_000): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function positiveInteger(value: unknown, max = 1_000_000): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= max;
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateFacts(reason: Record<string, unknown>): boolean {
  if (!isRecord(reason.facts)) return false;
  const facts = reason.facts;
  switch (reason.type) {
    case 'fixed_item_preserved':
      return onlyKeys(facts, ['position']) && positiveInteger(facts.position);
    case 'must_do_preserved':
      return onlyKeys(facts, ['priority']) && facts.priority === 'must_do';
    case 'route_duration_improved':
      return onlyKeys(facts, ['previousDurationSeconds', 'proposedDurationSeconds', 'savingsSeconds'])
        && boundedFinite(facts.previousDurationSeconds) && boundedFinite(facts.proposedDurationSeconds)
        && boundedFinite(facts.savingsSeconds)
        && facts.savingsSeconds === facts.previousDurationSeconds - facts.proposedDurationSeconds
        && facts.savingsSeconds > 0;
    case 'route_fallback':
      return onlyKeys(facts, ['availability', 'reason'])
        && (facts.availability === 'unavailable' || facts.availability === 'partial')
        && typeof facts.reason === 'string' && idPattern.test(facts.reason);
    case 'weather_rescheduled':
      return onlyKeys(facts, ['fromDate', 'toDate', 'previousPrecipitationPercent', 'proposedPrecipitationPercent', 'policyThresholdPercent'])
        && validDate(facts.fromDate) && validDate(facts.toDate)
        && boundedFinite(facts.previousPrecipitationPercent, 0, 100)
        && boundedFinite(facts.proposedPrecipitationPercent, 0, 100)
        && boundedFinite(facts.policyThresholdPercent, 0, 100);
    case 'weather_unavailable':
      return onlyKeys(facts, ['availability', 'reason']) && facts.availability === 'unavailable'
        && typeof facts.reason === 'string' && idPattern.test(facts.reason);
    case 'item_moved':
      return onlyKeys(facts, ['fromDayNumber', 'fromPosition', 'toDayNumber', 'toPosition'])
        && positiveInteger(facts.fromDayNumber) && positiveInteger(facts.fromPosition)
        && positiveInteger(facts.toDayNumber) && positiveInteger(facts.toPosition);
    case 'refresh_no_op':
      return onlyKeys(facts, ['isNoOp']) && facts.isNoOp === true;
    case 'generated_from_preferences':
      return onlyKeys(facts, ['preferenceCount', 'dayCount'])
        && Number.isInteger(facts.preferenceCount) && (facts.preferenceCount as number) >= 0 && (facts.preferenceCount as number) <= 20
        && positiveInteger(facts.dayCount, 60);
    default:
      return false;
  }
}

export function validateReasonSet(value: unknown): ItineraryReasonSet {
  if (!isRecord(value) || !onlyKeys(value, ['tripId', 'proposalId', 'baselineWorkspaceRevision', 'reasons'])
    || typeof value.tripId !== 'string' || !idPattern.test(value.tripId)
    || (value.proposalId !== undefined && (typeof value.proposalId !== 'string' || !idPattern.test(value.proposalId)))
    || (value.baselineWorkspaceRevision !== undefined && !positiveInteger(value.baselineWorkspaceRevision))
    || ((value.proposalId === undefined) !== (value.baselineWorkspaceRevision === undefined))
    || !Array.isArray(value.reasons) || value.reasons.length < 1 || value.reasons.length > EXPLANATION_BOUNDS.maxReasons) {
    throw new Error('Invalid itinerary reason set.');
  }
  const seen = new Set<string>();
  const perItem = new Map<string, number>();
  const reasons = value.reasons.map((candidate) => {
    if (!isRecord(candidate) || !onlyKeys(candidate, ['reasonId', 'type', 'scope', 'itemId', 'dayId', 'dayNumber', 'provenance', 'facts'])
      || typeof candidate.reasonId !== 'string' || !idPattern.test(candidate.reasonId) || seen.has(candidate.reasonId)
      || typeof candidate.type !== 'string' || !reasonTypes.has(candidate.type)
      || typeof candidate.scope !== 'string' || !scopes.has(candidate.scope)
      || typeof candidate.provenance !== 'string' || !provenances.has(candidate.provenance)
      || candidate.provenance === 'gemini'
      || (candidate.itemId !== undefined && (typeof candidate.itemId !== 'string' || !idPattern.test(candidate.itemId)))
      || (candidate.dayId !== undefined && (typeof candidate.dayId !== 'string' || !idPattern.test(candidate.dayId)))
      || (candidate.dayNumber !== undefined && !positiveInteger(candidate.dayNumber, 60))
      || !validateFacts(candidate)) throw new Error('Invalid itinerary reason.');
    const expected: Record<string, FactProvenance> = {
      fixed_item_preserved: 'deterministic_constraint', must_do_preserved: 'deterministic_constraint',
      route_duration_improved: 'osrm', route_fallback: 'osrm', weather_rescheduled: 'open_meteo',
      weather_unavailable: 'open_meteo', item_moved: 'refresh_diff', refresh_no_op: 'refresh_diff', generated_from_preferences: 'user_preferences',
    };
    if (candidate.provenance !== expected[candidate.type]) throw new Error('Invalid factual provenance.');
    if (candidate.scope === 'item' || candidate.scope === 'change') {
      if (typeof candidate.itemId !== 'string') throw new Error('Item-scoped reason requires itemId.');
      const count = (perItem.get(candidate.itemId) ?? 0) + 1;
      if (count > EXPLANATION_BOUNDS.maxReasonsPerItem) throw new Error('Too many reasons for item.');
      perItem.set(candidate.itemId, count);
    }
    seen.add(candidate.reasonId);
    return candidate as unknown as ItineraryReason;
  });
  return Object.freeze({
    tripId: value.tripId,
    ...(value.proposalId === undefined ? {} : { proposalId: value.proposalId as string, baselineWorkspaceRevision: value.baselineWorkspaceRevision as number }),
    reasons: Object.freeze(reasons.map((reason) => Object.freeze({ ...reason, facts: Object.freeze({ ...reason.facts }) }))),
  }) as ItineraryReasonSet;
}

const ordinal = (left: string, right: string) => left < right ? -1 : left > right ? 1 : 0;
const compareReason = (left: ItineraryReason, right: ItineraryReason) =>
  ordinal(left.type, right.type) || (left.dayNumber ?? 0) - (right.dayNumber ?? 0)
  || ordinal(left.itemId ?? '', right.itemId ?? '') || ordinal(left.reasonId, right.reasonId);

const REASON_PRIORITY_ORDER: Record<string, number> = {
  item_moved: 1,
  weather_rescheduled: 2,
  weather_unavailable: 3,
  route_duration_improved: 4,
  route_fallback: 5,
  fixed_item_preserved: 6,
  must_do_preserved: 7,
  refresh_no_op: 8,
  generated_from_preferences: 9,
};

function selectBoundedReasons(reasons: readonly ItineraryReason[]): ItineraryReason[] {
  const sorted = [...reasons].sort((a, b) => {
    const pA = REASON_PRIORITY_ORDER[a.type] ?? 99;
    const pB = REASON_PRIORITY_ORDER[b.type] ?? 99;
    if (pA !== pB) return pA - pB;
    return compareReason(a, b);
  });

  const selected: ItineraryReason[] = [];
  const perItemCount = new Map<string, number>();

  for (const reason of sorted) {
    if (selected.length >= EXPLANATION_BOUNDS.maxReasons) break;

    if (reason.scope === 'item' || reason.scope === 'change') {
      const itemId = reason.itemId;
      if (itemId) {
        const count = perItemCount.get(itemId) ?? 0;
        if (count >= EXPLANATION_BOUNDS.maxReasonsPerItem) continue;
        perItemCount.set(itemId, count + 1);
      }
    }

    selected.push(reason);
  }

  return selected.sort(compareReason);
}

export function buildInitialGenerationReasons(input: { tripId: string; dayCount: number; preferenceCount: number }): ItineraryReasonSet {
  return validateReasonSet({ tripId: input.tripId, reasons: [{
    reasonId: 'reason:generated:preferences', type: 'generated_from_preferences', scope: 'trip',
    provenance: 'user_preferences', facts: { preferenceCount: input.preferenceCount, dayCount: input.dayCount },
  }] });
}

export function buildRefreshReasons(input: {
  proposal: TripRefreshProposal;
  constraintResult?: ConstraintEvaluationResult;
  routeDays?: readonly OptimizedDayResult[];
  weatherResult?: WeatherSchedulingResult;
}): ItineraryReasonSet {
  const reasons: ItineraryReason[] = [];

  // T001 truthfulness: only claim preservation if constraintResult is not invalid
  // and item is actually present in proposed at expected position (for fixed) or anywhere in proposed (for must_do)
  const isConstraintValid = input.constraintResult ? input.constraintResult.isValid : true;
  if (isConstraintValid) {
    const proposedItemsByDayAndPosition = new Map<string, string>();
    const proposedItemIds = new Set<string>();
    for (const day of input.proposal.proposed.days) {
      for (const item of day.items) {
        proposedItemIds.add(item.id);
        proposedItemsByDayAndPosition.set(`${day.dayNumber}:${item.position}`, item.id);
      }
    }

    const baselineItems = input.proposal.baseline.days.flatMap((day) => day.items.map((item) => ({ item, day })));
    for (const { item, day } of baselineItems) {
      if (item.flexibility === 'fixed' && proposedItemsByDayAndPosition.get(`${day.dayNumber}:${item.position}`) === item.id) {
        reasons.push({ reasonId: `reason:fixed:${item.id}`, type: 'fixed_item_preserved', scope: 'item', itemId: item.id, dayId: day.id, dayNumber: day.dayNumber, provenance: 'deterministic_constraint', facts: { position: item.position } });
      }
      if (item.priority === 'must_do' && proposedItemIds.has(item.id)) {
        reasons.push({ reasonId: `reason:must:${item.id}`, type: 'must_do_preserved', scope: 'item', itemId: item.id, dayId: day.id, dayNumber: day.dayNumber, provenance: 'deterministic_constraint', facts: { priority: 'must_do' } });
      }
    }
  }

  for (const day of input.routeDays ?? []) {
    const metrics = day.metrics;
    if (metrics.originalDurationSeconds !== null && metrics.optimizedDurationSeconds !== null && metrics.durationSavingsSeconds !== null && metrics.durationSavingsSeconds > 0) {
      reasons.push({ reasonId: `reason:route:${day.dayNumber}`, type: 'route_duration_improved', scope: 'day', dayNumber: day.dayNumber, provenance: 'osrm', facts: { previousDurationSeconds: metrics.originalDurationSeconds, proposedDurationSeconds: metrics.optimizedDurationSeconds, savingsSeconds: metrics.durationSavingsSeconds } });
    } else if (day.status === 'fallback' || metrics.durationSavingsSeconds === null) {
      reasons.push({ reasonId: `reason:route-fallback:${day.dayNumber}`, type: 'route_fallback', scope: 'day', dayNumber: day.dayNumber, provenance: 'osrm', facts: { availability: metrics.durationSavingsSeconds === null ? 'partial' : 'unavailable', reason: day.fallbackReason ?? 'metric_unavailable' } });
    }
  }

  if (input.weatherResult?.status === 'applied') {
    for (const decision of input.weatherResult.decisions) {
      reasons.push({
        reasonId: `reason:weather:${decision.itemId}`,
        type: 'weather_rescheduled',
        scope: 'change',
        itemId: decision.itemId,
        dayNumber: decision.toDayNumber,
        provenance: 'open_meteo',
        facts: {
          fromDate: decision.fromDate,
          toDate: decision.toDate,
          previousPrecipitationPercent: decision.originalPrecipitationPercent,
          proposedPrecipitationPercent: decision.proposedPrecipitationPercent,
          policyThresholdPercent: WEATHER_SCHEDULING_POLICY.HIGH_PRECIPITATION_PERCENT,
        },
      });
    }
  } else if (input.weatherResult && ['forecast_unavailable', 'forecast_out_of_horizon', 'incomplete_forecast_facts', 'location_unavailable'].includes(input.weatherResult.status)) {
    reasons.push({ reasonId: 'reason:weather:unavailable', type: 'weather_unavailable', scope: 'trip', provenance: 'open_meteo', facts: { availability: 'unavailable', reason: input.weatherResult.reason } });
  }

  for (const diff of input.proposal.diff.items) {
    if (diff.changeKinds.includes('moved') && diff.before && diff.after) {
      reasons.push({ reasonId: `reason:moved:${diff.itemId}`, type: 'item_moved', scope: 'change', itemId: diff.itemId, dayId: diff.after.dayId, dayNumber: diff.after.dayNumber, provenance: 'refresh_diff', facts: { fromDayNumber: diff.before.dayNumber, fromPosition: diff.before.position, toDayNumber: diff.after.dayNumber, toPosition: diff.after.position } });
    }
  }

  if (input.proposal.diff.isNoOp || reasons.length === 0) {
    reasons.push({
      reasonId: 'reason:refresh:no-op',
      type: 'refresh_no_op',
      scope: 'trip',
      provenance: 'refresh_diff',
      facts: { isNoOp: true },
    });
  }

  const boundedReasons = selectBoundedReasons(reasons);

  return validateReasonSet({
    tripId: input.proposal.tripId,
    proposalId: input.proposal.proposalId,
    baselineWorkspaceRevision: input.proposal.baselineWorkspaceRevision,
    reasons: boundedReasons,
  });
}

export function fallbackText(reason: ItineraryReason, locale: ExplanationLocale): string {
  const vi = locale === 'vi';
  switch (reason.type) {
    case 'generated_from_preferences': return vi ? `Bản nháp ${reason.facts.dayCount} ngày dựa trên ${reason.facts.preferenceCount} sở thích bạn đã chọn.` : `${reason.facts.dayCount}-day draft based on ${reason.facts.preferenceCount} preferences you selected.`;
    case 'fixed_item_preserved': return vi ? `Mục cố định được giữ ở vị trí ${reason.facts.position}.` : `Fixed item kept at position ${reason.facts.position}.`;
    case 'must_do_preserved': return vi ? 'Mục phải làm được giữ trong lịch trình.' : 'Must-do item remains in the itinerary.';
    case 'route_duration_improved': return vi ? `Dữ liệu OSRM cho thấy giảm ${reason.facts.savingsSeconds} giây di chuyển.` : `OSRM route data shows ${reason.facts.savingsSeconds} seconds less travel time.`;
    case 'route_fallback': return vi ? 'Chưa có đủ dữ liệu OSRM để nêu mức cải thiện tuyến đường.' : 'OSRM data is insufficient for a numeric route improvement claim.';
    case 'weather_rescheduled': return vi ? `Open-Meteo ghi nhận xác suất mưa từ ${reason.facts.previousPrecipitationPercent}% xuống ${reason.facts.proposedPrecipitationPercent}%; TripWise áp dụng ngưỡng chính sách ${reason.facts.policyThresholdPercent}%.` : `Open-Meteo precipitation changes from ${reason.facts.previousPrecipitationPercent}% to ${reason.facts.proposedPrecipitationPercent}%; TripWise applies a ${reason.facts.policyThresholdPercent}% policy threshold.`;
    case 'weather_unavailable': return vi ? 'Dữ liệu thời tiết Open-Meteo hiện không khả dụng; TripWise không suy đoán điều kiện thời tiết.' : 'Open-Meteo weather data is unavailable; TripWise does not infer weather conditions.';
    case 'item_moved': return vi ? `Mục được chuyển từ ngày ${reason.facts.fromDayNumber}, vị trí ${reason.facts.fromPosition} sang ngày ${reason.facts.toDayNumber}, vị trí ${reason.facts.toPosition}.` : `Item moved from day ${reason.facts.fromDayNumber}, position ${reason.facts.fromPosition} to day ${reason.facts.toDayNumber}, position ${reason.facts.toPosition}.`;
    case 'refresh_no_op': return vi ? 'Lịch trình không có thay đổi đáng kể nào cần áp dụng.' : 'No material schedule changes were required for this itinerary.';
  }
}

function fallback(reasonSet: ItineraryReasonSet, locale: ExplanationLocale): ExplanationComposition {
  return { ...reasonSet, locale, composer: 'deterministic_fallback', entries: reasonSet.reasons.map((reason) => ({ reasonId: reason.reasonId, localizedText: fallbackText(reason, locale) })) };
}

export function validateCompositionOutput(value: unknown, reasonSet: ItineraryReasonSet): readonly ComposedReason[] {
  if (!isRecord(value) || !onlyKeys(value, ['entries']) || !Array.isArray(value.entries) || value.entries.length !== reasonSet.reasons.length) throw new Error('Invalid composition.');
  const expected = new Set(reasonSet.reasons.map((reason) => reason.reasonId));
  const seen = new Set<string>();
  return value.entries.map((entry) => {
    if (!isRecord(entry) || !onlyKeys(entry, ['reasonId', 'localizedText']) || typeof entry.reasonId !== 'string'
      || !expected.has(entry.reasonId) || seen.has(entry.reasonId) || typeof entry.localizedText !== 'string'
      || entry.localizedText.trim().length < 1 || entry.localizedText.length > EXPLANATION_BOUNDS.maxComposedTextLength
      || /https?:\/\//i.test(entry.localizedText)) throw new Error('Invalid composed reason.');
    seen.add(entry.reasonId);
    return { reasonId: entry.reasonId, localizedText: entry.localizedText.trim() };
  });
}

export async function composeItineraryExplanation(
  reasonSetInput: unknown,
  locale: ExplanationLocale,
  repository?: ExplanationComposerRepository,
  signal?: AbortSignal,
): Promise<ExplanationComposition> {
  const reasonSet = validateReasonSet(reasonSetInput);
  if (locale !== 'en' && locale !== 'vi') throw new Error('Unsupported explanation locale.');
  if (new TextEncoder().encode(JSON.stringify({ locale, reasonSet })).byteLength > EXPLANATION_BOUNDS.maxRequestBytes) throw new Error('Explanation request is too large.');
  if (!repository || signal?.aborted) return fallback(reasonSet, locale);
  try {
    const result = await repository.compose({ locale, reasonSet }, signal);
    if (signal?.aborted) return fallback(reasonSet, locale);
    return { ...reasonSet, locale, composer: 'gemini', entries: validateCompositionOutput(result, reasonSet) };
  } catch {
    return fallback(reasonSet, locale);
  }
}

export class LatestExplanationComposer {
  private generation = 0;
  private active?: AbortController;
  constructor(private readonly repository?: ExplanationComposerRepository) {}
  async compose(reasonSet: ItineraryReasonSet, locale: ExplanationLocale): Promise<ExplanationComposition | null> {
    this.active?.abort();
    const generation = ++this.generation;
    const controller = new AbortController();
    this.active = controller;
    const result = await composeItineraryExplanation(reasonSet, locale, this.repository, controller.signal);
    if (generation !== this.generation) return null;
    if (this.active === controller) this.active = undefined;
    return result;
  }
  cancel(): void { this.generation += 1; this.active?.abort(); this.active = undefined; }
}
