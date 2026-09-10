/**
 * Deterministic Bounded Route-Aware Clustering & Optimization (FEATURE-P5-T002)
 *
 * Implements route-aware ordering of itinerary items using validated OSRM metrics:
 * 1. FIXED items: Hard anchors. Cannot move across days, times, or canonical positions.
 * 2. MUST_DO items: Retained in the plan. Cannot be dropped or downgraded.
 * 3. OPTIONAL items: Retained in the plan; positions optimized to minimize travel duration.
 * 4. Routable items: Only items with validated coordinates participate in route scoring.
 * 5. Unroutable items: Preserved in original relative order; no fake (0,0) coordinates.
 * 6. Bounded batching: Single OSRM Table request per day (up to 25 items); no N^2 HTTP requests.
 * 7. Bounded search: Nearest-neighbor + 2-opt with strict iteration cap (max 50 iterations).
 * 8. Deterministic tie-breaking: Stable item IDs / positions; zero random shuffle.
 * 9. Hard safety gate: Evaluates candidate plan with P5-T001 deterministicConstraintEngine.
 * 10. Fallback semantics: Retains original canonical order on provider failure, timeout,
 *     malformed payload, or cancellation. Never fabricates route metrics.
 * 11. Zero silent persistence: Pure in-memory computation; does not write to database.
 */

import type {
  Coordinate,
  RouteMatrix,
  WorkspaceFlexibility,
  WorkspacePriority,
} from './contracts';
import { IntegrationError } from './errors';
import type { RouteRepository } from './repositories';
import {
  evaluatePlanConstraints,
  isFixedItem,
  isMustDoItem,
  type ConstraintEvaluationResult,
  type ConstraintItem,
  type ConstraintItinerary,
  type ItineraryInput,
} from './deterministicConstraintEngine';

// ============================================================================
// Constants & Hard Bounds
// ============================================================================

export const ROUTE_OPTIMIZATION_BOUNDS = {
  MAX_ROUTABLE_ITEMS_PER_DAY: 25,
  MAX_2OPT_ITERATIONS: 50,
  MAX_PROVIDER_CALLS_PER_OPTIMIZATION: 10,
} as const;

// ============================================================================
// Types and Contracts
// ============================================================================

export type RouteOptimizationStatus =
  | 'optimized'
  | 'already_optimal'
  | 'fallback'
  | 'constraint_conflict'
  | 'invalid_input'
  | 'cancelled';

export type RouteOptimizationFallbackReason =
  | 'insufficient_items'
  | 'insufficient_coordinates'
  | 'provider_unavailable'
  | 'provider_timeout'
  | 'malformed_provider_response'
  | 'exceeded_bounds'
  | 'unroutable_items'
  | 'cancelled'
  | 'unknown';

export type RouteMetricSummary = {
  originalDurationSeconds: number | null;
  optimizedDurationSeconds: number | null;
  durationSavingsSeconds: number | null;
  originalDistanceMeters: number | null;
  optimizedDistanceMeters: number | null;
  distanceSavingsMeters: number | null;
  /** Logical RouteRepository metric requests, not guaranteed upstream HTTP attempts (cache/retries differ). */
  providerCallCount: number;
  matrixCellCount?: number;
};

export type OptimizedDayResult = {
  dayNumber: number;
  status: RouteOptimizationStatus;
  fallbackReason?: RouteOptimizationFallbackReason;
  originalItemIds: readonly string[];
  proposedItemIds: readonly string[];
  preservedFixedAnchors: readonly string[];
  preservedMustDoItems: readonly string[];
  metrics: RouteMetricSummary;
  items: readonly ConstraintItem[];
  constraintEvaluation: ConstraintEvaluationResult;
};

export type RouteOptimizationResult = {
  tripId?: string;
  status: RouteOptimizationStatus;
  days: readonly OptimizedDayResult[];
  totalSavingsSeconds: number;
  totalSavingsMeters: number;
  /** Total logical route metric requests made to the repository across all days. */
  totalProviderCalls: number;
  summary: {
    totalItems: number;
    routableItems: number;
    fixedAnchors: number;
    mustDoItems: number;
  };
  validation?: ConstraintEvaluationResult;
};

export type RouteOptimizationOptions = {
  signal?: AbortSignal;
  /** Maximum number of 2-opt improvement iterations per day segment. Default 50. */
  maxIterations?: number;
  /** Force-allow optional items dropping (defaults to false; T002 retains all items). */
  allowDroppingOptional?: boolean;
};

export type InternalRoutableItem = {
  id: string;
  originalPosition: number;
  flexibility: WorkspaceFlexibility;
  priority: WorkspacePriority;
  placeName?: string;
  dayNumber: number;
  startTime?: string | null;
  endTime?: string | null;
  latitude: number | null;
  longitude: number | null;
  isRoutable: boolean;
};

// ============================================================================
// Local Deterministic Heuristic: Haversine
// ============================================================================

/**
 * Calculates straight-line great-circle distance in meters between two coordinates.
 *
 * NOTE ON PROVENANCE:
 * This is strictly a local deterministic heuristic for tie-breaking or preliminary estimation.
 * It is NEVER labeled, returned, or presented as an OSRM provider road-network fact.
 */
export function calculateHaversineDistanceMeters(c1: Coordinate, c2: Coordinate): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const lat1 = (c1.latitude * Math.PI) / 180;
  const lat2 = (c2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// Helper: Extract Days & Items from ItineraryInput
// ============================================================================

function extractShallowTripId(input: ItineraryInput): string | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const id = (input as Record<string, unknown>).id;
  return typeof id === 'string' ? id : undefined;
}

function extractDaysAndItems(input: ItineraryInput): {
  tripId?: string;
  days: {
    dayNumber: number;
    items: InternalRoutableItem[];
  }[];
} {
  if (!input || typeof input !== 'object') {
    return { days: [] };
  }

  const rawObj = input as Record<string, unknown>;
  const tripId = typeof rawObj.id === 'string' ? rawObj.id : undefined;

  let rawDays: unknown[] = [];
  if (Array.isArray(rawObj.days)) {
    rawDays = rawObj.days;
  } else if (Array.isArray(input)) {
    rawDays = input;
  }

  const days: { dayNumber: number; items: InternalRoutableItem[] }[] = [];

  for (const rawDay of rawDays) {
    if (!rawDay || typeof rawDay !== 'object') continue;
    const dayObj = rawDay as Record<string, unknown>;
    const dayNumber = typeof dayObj.dayNumber === 'number' ? dayObj.dayNumber : 0;
    const rawItems = Array.isArray(dayObj.items) ? dayObj.items : [];

    const items: InternalRoutableItem[] = [];
    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const itemObj = rawItem as Record<string, unknown>;
      const id = typeof itemObj.id === 'string' ? itemObj.id : '';
      const position = typeof itemObj.position === 'number' ? itemObj.position : 0;
      const flexibility = (itemObj.flexibility as WorkspaceFlexibility) ?? '';
      const priority = (itemObj.priority as WorkspacePriority) ?? '';
      const placeName = typeof itemObj.placeName === 'string' ? itemObj.placeName : undefined;
      const startTime = typeof itemObj.startTime === 'string' ? itemObj.startTime : null;
      const endTime = typeof itemObj.endTime === 'string' ? itemObj.endTime : null;

      const lat = typeof itemObj.latitude === 'number' && Number.isFinite(itemObj.latitude) ? itemObj.latitude : null;
      const lon = typeof itemObj.longitude === 'number' && Number.isFinite(itemObj.longitude) ? itemObj.longitude : null;
      const isRoutable =
        lat !== null &&
        lon !== null &&
        lat >= -90 &&
        lat <= 90 &&
        lon >= -180 &&
        lon <= 180;

      items.push({
        id,
        originalPosition: position,
        flexibility,
        priority,
        placeName,
        dayNumber,
        startTime,
        endTime,
        latitude: lat,
        longitude: lon,
        isRoutable,
      });
    }

    // Sort original items strictly by position
    items.sort((a, b) => a.originalPosition - b.originalPosition);
    days.push({ dayNumber, items });
  }

  days.sort((a, b) => a.dayNumber - b.dayNumber);
  return { tripId, days };
}

// ============================================================================
// Route Metric Table Fetching with Batching
// ============================================================================

async function fetchRouteMatrixForDay(
  items: InternalRoutableItem[],
  routeRepo: RouteRepository,
  signal?: AbortSignal,
): Promise<{
  matrix: RouteMatrix;
  coordIndexMap: Map<string, number>;
  callCount: number;
}> {
  const routableItems = items.filter((item) => item.isRoutable && item.latitude !== null && item.longitude !== null);
  const uniqueCoordinates: Coordinate[] = [];
  const coordIndexMap = new Map<string, number>();

  for (const item of routableItems) {
    const lat = item.latitude!;
    const lon = item.longitude!;
    const key = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    if (!coordIndexMap.has(key)) {
      coordIndexMap.set(key, uniqueCoordinates.length);
      uniqueCoordinates.push({ latitude: lat, longitude: lon });
    }
  }

  if (uniqueCoordinates.length < 2) {
    // Trivial 1-stop matrix
    return {
      matrix: {
        profile: 'driving',
        durationsSeconds: [[0]],
        distancesMeters: [[0]],
        coordinates: uniqueCoordinates,
      },
      coordIndexMap,
      callCount: 0,
    };
  }

  // Check if getTable is available on routeRepo
  if (typeof routeRepo.getTable !== 'function') {
    throw new IntegrationError('providerUnavailable');
  }

  const matrix = await routeRepo.getTable(
    { profile: 'driving', coordinates: uniqueCoordinates },
    signal,
  );
  return { matrix, coordIndexMap, callCount: 1 };
}

// ============================================================================
// Sequence Evaluation using Real Route Matrix
// ============================================================================

function calculateSequenceCost(
  sequence: InternalRoutableItem[],
  matrix: RouteMatrix,
  coordIndexMap: Map<string, number>,
): { totalDuration: number | null; totalDistance: number | null } | null {
  if (sequence.length < 2) {
    return { totalDuration: 0, totalDistance: 0 };
  }

  let totalDuration = 0;
  let totalDistance: number | null = 0;
  let complete = true;

  for (let i = 0; i < sequence.length - 1; i++) {
    const fromItem = sequence[i];
    const toItem = sequence[i + 1];

    // Unknown transitions make full-sequence totals incomplete. Still inspect known
    // adjacent legs so unreachable durations continue to fail closed.
    if (
      !fromItem.isRoutable ||
      !toItem.isRoutable ||
      fromItem.latitude === null ||
      fromItem.longitude === null ||
      toItem.latitude === null ||
      toItem.longitude === null
    ) {
      complete = false;
      continue;
    }

    const fromKey = `${fromItem.latitude.toFixed(6)},${fromItem.longitude.toFixed(6)}`;
    const toKey = `${toItem.latitude.toFixed(6)},${toItem.longitude.toFixed(6)}`;

    const fromIdx = coordIndexMap.get(fromKey);
    const toIdx = coordIndexMap.get(toKey);

    if (fromIdx === undefined || toIdx === undefined) return null;

    const dur = matrix.durationsSeconds[fromIdx]?.[toIdx];
    const dist = matrix.distancesMeters[fromIdx]?.[toIdx];

    if (dur === null || dur === undefined) {
      return null; // unreachable segment
    }

    totalDuration += dur;
    if (dist === null || dist === undefined) {
      totalDistance = null;
    } else if (totalDistance !== null) {
      totalDistance += dist;
    }
  }

  return complete ? { totalDuration, totalDistance } : { totalDuration: null, totalDistance: null };
}

// ============================================================================
// Bounded Reordering between Fixed Anchors
// ============================================================================

function optimizeSegmentFlexibleItems(
  startAnchor: InternalRoutableItem | null,
  endAnchor: InternalRoutableItem | null,
  flexibleItems: InternalRoutableItem[],
  matrix: RouteMatrix,
  coordIndexMap: Map<string, number>,
  maxIterations: number,
): InternalRoutableItem[] {
  if (flexibleItems.length <= 1) {
    return [...flexibleItems];
  }

  // 1. Initial tour construction via Greedy Nearest-Neighbor with stable tie-breaking
  const unvisited = [...flexibleItems];
  const ordered: InternalRoutableItem[] = [];

  let currentCoordItem = startAnchor && startAnchor.isRoutable ? startAnchor : null;

  while (unvisited.length > 0) {
    let bestIdx = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      let cost = 0;
      let dist = 0;

      if (currentCoordItem && currentCoordItem.latitude !== null && currentCoordItem.longitude !== null) {
        const fromKey = `${currentCoordItem.latitude.toFixed(6)},${currentCoordItem.longitude.toFixed(6)}`;
        const toKey = `${candidate.latitude!.toFixed(6)},${candidate.longitude!.toFixed(6)}`;
        const fromIdx = coordIndexMap.get(fromKey);
        const toIdx = coordIndexMap.get(toKey);

        if (fromIdx !== undefined && toIdx !== undefined) {
          const d = matrix.durationsSeconds[fromIdx]?.[toIdx];
          const m = matrix.distancesMeters[fromIdx]?.[toIdx];
          cost = d !== null && d !== undefined ? d : Number.POSITIVE_INFINITY;
          dist = m !== null && m !== undefined ? m : Number.POSITIVE_INFINITY;
        }
      }

      // Tie-breaking:
      // 1. Lower duration
      // 2. Lower distance (only when both distances are finite and valid)
      // 3. Smaller item ID (stable string localeCompare)
      const distComparable = Number.isFinite(dist) && Number.isFinite(bestDist);
      const isBetter =
        cost < bestCost ||
        (cost === bestCost && distComparable && dist < bestDist) ||
        (cost === bestCost && (!distComparable || dist === bestDist) && candidate.id.localeCompare(unvisited[bestIdx].id) < 0);

      if (isBetter) {
        bestIdx = i;
        bestCost = cost;
        bestDist = dist;
      }
    }

    const next = unvisited.splice(bestIdx, 1)[0];
    ordered.push(next);
    currentCoordItem = next;
  }

  // 2. Local search improvement: 2-opt with strict iteration cap
  let iterations = 0;
  let improved = true;

  const fullTourCandidate = (candidateOrdered: InternalRoutableItem[]): InternalRoutableItem[] => {
    const seq: InternalRoutableItem[] = [];
    if (startAnchor) seq.push(startAnchor);
    seq.push(...candidateOrdered);
    if (endAnchor) seq.push(endAnchor);
    return seq;
  };

  let bestCostObj = calculateSequenceCost(fullTourCandidate(ordered), matrix, coordIndexMap);
  let bestDuration = bestCostObj?.totalDuration ?? Number.POSITIVE_INFINITY;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < ordered.length - 1; i++) {
      for (let j = i + 1; j < ordered.length; j++) {
        // Reverse subsegment [i..j]
        const candidateOrdered = [
          ...ordered.slice(0, i),
          ...ordered.slice(i, j + 1).reverse(),
          ...ordered.slice(j + 1),
        ];

        const costObj = calculateSequenceCost(fullTourCandidate(candidateOrdered), matrix, coordIndexMap);
        if (costObj !== null && costObj.totalDuration !== null) {
          // Strictly lower duration by at least 1 second
          if (costObj.totalDuration < bestDuration - 1.0) {
            ordered.splice(0, ordered.length, ...candidateOrdered);
            bestDuration = costObj.totalDuration;
            improved = true;
            break;
          }
        }
      }
      if (improved) break;
    }
  }

  return ordered;
}

// ============================================================================
// Day Optimizer
// ============================================================================

async function optimizeDay(
  dayNumber: number,
  items: InternalRoutableItem[],
  routeRepo: RouteRepository,
  options: RouteOptimizationOptions,
  baselineItinerary: ConstraintItinerary,
  remainingBudget: number,
): Promise<OptimizedDayResult> {
  const originalItemIds = items.map((item) => item.id);
  const fixedAnchors = items.filter((item) => isFixedItem(item));
  const mustDoItems = items.filter((item) => isMustDoItem(item));
  const routableItems = items.filter((item) => item.isRoutable);

  const emptyEvaluation: ConstraintEvaluationResult = {
    isValid: true,
    conflicts: [],
    summary: { totalItems: items.length, fixedItems: fixedAnchors.length, mustDoItems: mustDoItems.length, conflictsCount: 0 },
  };

  // Case A: 0 or 1 item -> Already optimal
  if (items.length <= 1) {
    return {
      dayNumber,
      status: 'already_optimal',
      originalItemIds,
      proposedItemIds: originalItemIds,
      preservedFixedAnchors: fixedAnchors.map((a) => a.id),
      preservedMustDoItems: mustDoItems.map((m) => m.id),
      metrics: {
        originalDurationSeconds: 0,
        optimizedDurationSeconds: 0,
        durationSavingsSeconds: 0,
        originalDistanceMeters: 0,
        optimizedDistanceMeters: 0,
        distanceSavingsMeters: 0,
        providerCallCount: 0,
      },
      items: items.map((it, idx) => ({ ...it, position: idx + 1 })),
      constraintEvaluation: emptyEvaluation,
    };
  }

  // Case B: Zero or only one routable item -> Cannot optimize route
  if (routableItems.length < 2) {
    return {
      dayNumber,
      status: routableItems.length === 0 ? 'fallback' : 'already_optimal',
      fallbackReason: routableItems.length === 0 ? 'unroutable_items' : undefined,
      originalItemIds,
      proposedItemIds: originalItemIds,
      preservedFixedAnchors: fixedAnchors.map((a) => a.id),
      preservedMustDoItems: mustDoItems.map((m) => m.id),
      metrics: {
        originalDurationSeconds: null,
        optimizedDurationSeconds: null,
        durationSavingsSeconds: null,
        originalDistanceMeters: null,
        optimizedDistanceMeters: null,
        distanceSavingsMeters: null,
        providerCallCount: 0,
      },
      items: items.map((it, idx) => ({ ...it, position: idx + 1 })),
      constraintEvaluation: emptyEvaluation,
    };
  }

  // Case C: Exceeded bound on routable items per day or provider call budget exhausted
  if (routableItems.length > ROUTE_OPTIMIZATION_BOUNDS.MAX_ROUTABLE_ITEMS_PER_DAY || remainingBudget <= 0) {
    return {
      dayNumber,
      status: 'fallback',
      fallbackReason: 'exceeded_bounds',
      originalItemIds,
      proposedItemIds: originalItemIds,
      preservedFixedAnchors: fixedAnchors.map((a) => a.id),
      preservedMustDoItems: mustDoItems.map((m) => m.id),
      metrics: {
        originalDurationSeconds: null,
        optimizedDurationSeconds: null,
        durationSavingsSeconds: null,
        originalDistanceMeters: null,
        optimizedDistanceMeters: null,
        distanceSavingsMeters: null,
        providerCallCount: 0,
      },
      items: items.map((it, idx) => ({ ...it, position: idx + 1 })),
      constraintEvaluation: emptyEvaluation,
    };
  }

  // Fetch validated route matrix from provider
  let matrix: RouteMatrix;
  let coordIndexMap: Map<string, number>;
  let providerCallCount = 0;

  try {
    const fetchResult = await fetchRouteMatrixForDay(items, routeRepo, options.signal);
    matrix = fetchResult.matrix;
    coordIndexMap = fetchResult.coordIndexMap;
    providerCallCount = fetchResult.callCount;
  } catch (error) {
    let fallbackReason: RouteOptimizationFallbackReason = 'provider_unavailable';
    if (error instanceof IntegrationError) {
      if (error.code === 'cancelled') fallbackReason = 'cancelled';
      else if (error.code === 'timeout') fallbackReason = 'provider_timeout';
      else if (error.code === 'invalidResponse') fallbackReason = 'malformed_provider_response';
    }
    return {
      dayNumber,
      status: fallbackReason === 'cancelled' ? 'cancelled' : 'fallback',
      fallbackReason,
      originalItemIds,
      proposedItemIds: originalItemIds,
      preservedFixedAnchors: fixedAnchors.map((a) => a.id),
      preservedMustDoItems: mustDoItems.map((m) => m.id),
      metrics: {
        originalDurationSeconds: null,
        optimizedDurationSeconds: null,
        durationSavingsSeconds: null,
        originalDistanceMeters: null,
        optimizedDistanceMeters: null,
        distanceSavingsMeters: null,
        providerCallCount: 0,
      },
      items: items.map((it, idx) => ({ ...it, position: idx + 1 })),
      constraintEvaluation: emptyEvaluation,
    };
  }

  // Calculate original tour cost
  const originalCost = calculateSequenceCost(items, matrix, coordIndexMap);

  // Partition items into segments between barriers (FIXED items AND unroutable items).
  // All barriers remain strictly pinned at their exact 1-based canonical positions!
  const finalItems: InternalRoutableItem[] = new Array(items.length);

  // 1. Place all barriers in their exact positions
  for (let i = 0; i < items.length; i++) {
    if (isFixedItem(items[i]) || !items[i].isRoutable) {
      finalItems[i] = items[i];
    }
  }

  // 2. Identify flexible routable slots between barriers and group them by anchor segments
  let currentStartAnchor: InternalRoutableItem | null = null;
  let currentFlexibleBatch: InternalRoutableItem[] = [];
  let currentSlotIndices: number[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const isBarrier = isFixedItem(it) || !it.isRoutable;

    if (isBarrier) {
      if (currentFlexibleBatch.length > 0) {
        const startAnchor = currentStartAnchor && currentStartAnchor.isRoutable ? currentStartAnchor : null;
        const endAnchor = it.isRoutable ? it : null;
        const optimizedBatch = optimizeSegmentFlexibleItems(
          startAnchor,
          endAnchor,
          currentFlexibleBatch,
          matrix,
          coordIndexMap,
          options.maxIterations ?? ROUTE_OPTIMIZATION_BOUNDS.MAX_2OPT_ITERATIONS,
        );
        for (let s = 0; s < currentSlotIndices.length; s++) {
          finalItems[currentSlotIndices[s]] = optimizedBatch[s];
        }
        currentFlexibleBatch = [];
        currentSlotIndices = [];
      }
      currentStartAnchor = it;
    } else {
      currentFlexibleBatch.push(it);
      currentSlotIndices.push(i);
    }
  }

  // Trailing flexible items after the last barrier
  if (currentFlexibleBatch.length > 0) {
    const startAnchor = currentStartAnchor && currentStartAnchor.isRoutable ? currentStartAnchor : null;
    const optimizedBatch = optimizeSegmentFlexibleItems(
      startAnchor,
      null,
      currentFlexibleBatch,
      matrix,
      coordIndexMap,
      options.maxIterations ?? ROUTE_OPTIMIZATION_BOUNDS.MAX_2OPT_ITERATIONS,
    );
    for (let s = 0; s < currentSlotIndices.length; s++) {
      finalItems[currentSlotIndices[s]] = optimizedBatch[s];
    }
  }

  // Map to 1-based positions
  const proposedItems: ConstraintItem[] = finalItems.map((it, idx) => ({
    id: it.id,
    position: idx + 1,
    flexibility: it.flexibility,
    priority: it.priority,
    placeName: it.placeName,
    dayNumber,
    startTime: it.startTime,
    endTime: it.endTime,
  }));

  // Calculate optimized sequence cost
  const optimizedCost = calculateSequenceCost(finalItems, matrix, coordIndexMap);

  // If candidate is unreachable (has any unreachable duration segment), fail closed to fallback
  if (optimizedCost === null) {
    return {
      dayNumber,
      status: 'fallback',
      fallbackReason: 'unroutable_items',
      originalItemIds,
      proposedItemIds: originalItemIds,
      preservedFixedAnchors: fixedAnchors.map((a) => a.id),
      preservedMustDoItems: mustDoItems.map((m) => m.id),
      metrics: {
        originalDurationSeconds: originalCost?.totalDuration ?? null,
        optimizedDurationSeconds: null,
        durationSavingsSeconds: null,
        originalDistanceMeters: originalCost?.totalDistance ?? null,
        optimizedDistanceMeters: null,
        distanceSavingsMeters: null,
        providerCallCount,
        matrixCellCount: matrix.coordinates.length * matrix.coordinates.length,
      },
      items: items.map((it, idx) => ({ ...it, position: idx + 1 })),
      constraintEvaluation: emptyEvaluation,
    };
  }

  // Construct proposed plan to evaluate with P5-T001 constraint engine
  const proposedItinerary: ConstraintItinerary = {
    days: [
      {
        dayNumber,
        items: proposedItems,
      },
    ],
  };

  const constraintEvaluation = evaluatePlanConstraints(proposedItinerary, baselineItinerary);

  // SAFETY GATE: If constraint engine rejects proposed plan, fail closed to baseline order
  if (!constraintEvaluation.isValid) {
    return {
      dayNumber,
      status: 'constraint_conflict',
      originalItemIds,
      proposedItemIds: originalItemIds,
      preservedFixedAnchors: fixedAnchors.map((a) => a.id),
      preservedMustDoItems: mustDoItems.map((m) => m.id),
      metrics: {
        originalDurationSeconds: originalCost?.totalDuration ?? null,
        optimizedDurationSeconds: null,
        durationSavingsSeconds: null,
        originalDistanceMeters: originalCost?.totalDistance ?? null,
        optimizedDistanceMeters: null,
        distanceSavingsMeters: null,
        providerCallCount,
      },
      items: items.map((it, idx) => ({ ...it, position: idx + 1 })),
      constraintEvaluation,
    };
  }

  // Determine if there was an actual improvement
  const proposedItemIds = proposedItems.map((p) => p.id);
  const orderChanged = proposedItemIds.some((id, idx) => id !== originalItemIds[idx]);

  const origDuration = originalCost?.totalDuration ?? null;
  const optDuration = optimizedCost.totalDuration;
  const durationSavings =
    origDuration !== null && optDuration !== null ? Math.max(0, origDuration - optDuration) : null;

  const origDistance = originalCost?.totalDistance ?? null;
  const optDistance = optimizedCost.totalDistance;
  const distanceSavings =
    origDistance !== null && optDistance !== null ? Math.max(0, origDistance - optDistance) : null;

  const status: RouteOptimizationStatus = orderChanged ? 'optimized' : 'already_optimal';

  return {
    dayNumber,
    status,
    originalItemIds,
    proposedItemIds,
    preservedFixedAnchors: fixedAnchors.map((a) => a.id),
    preservedMustDoItems: mustDoItems.map((m) => m.id),
    metrics: {
      originalDurationSeconds: origDuration,
      optimizedDurationSeconds: optDuration,
      durationSavingsSeconds: durationSavings,
      originalDistanceMeters: origDistance,
      optimizedDistanceMeters: optDistance,
      distanceSavingsMeters: distanceSavings,
      providerCallCount,
      matrixCellCount: matrix.coordinates.length * matrix.coordinates.length,
    },
    items: proposedItems,
    constraintEvaluation,
  };
}

// ============================================================================
// Public Entry Point: optimizeItineraryRoutes
// ============================================================================

/**
 * Optimizes the route ordering of flexible items in an itinerary using validated OSRM metrics.
 *
 * Guaranteed Invariants:
 * 1. FIXED items remain at their exact day, canonical position, and times.
 * 2. MUST_DO items are strictly retained with priority preserved.
 * 3. Proposed plan is validated against P5-T001 deterministicConstraintEngine before acceptance.
 * 4. Zero database writes or side effects (pure in-memory proposed result).
 * 5. Deterministic output: stable tie-breaking and permutation invariance.
 */
export async function optimizeItineraryRoutes(
  input: ItineraryInput,
  routeRepo: RouteRepository,
  options: RouteOptimizationOptions = {},
): Promise<RouteOptimizationResult> {
  // Validate options bounds
  if (options.maxIterations !== undefined) {
    if (
      typeof options.maxIterations !== 'number' ||
      !Number.isInteger(options.maxIterations) ||
      options.maxIterations < 0 ||
      options.maxIterations > ROUTE_OPTIMIZATION_BOUNDS.MAX_2OPT_ITERATIONS ||
      Number.isNaN(options.maxIterations) ||
      !Number.isFinite(options.maxIterations)
    ) {
      throw new IntegrationError('invalidRequest');
    }
  }

  // Step 0: Validate planning snapshot with P5-T001 deterministic constraint engine
  const initialValidation = evaluatePlanConstraints(input);
  if (!initialValidation.isValid) {
    const tripId = extractShallowTripId(input);
    return {
      tripId,
      status: 'invalid_input',
      days: [],
      totalSavingsSeconds: 0,
      totalSavingsMeters: 0,
      totalProviderCalls: 0,
      validation: initialValidation,
      summary: {
        totalItems: initialValidation.summary.totalItems,
        routableItems: 0,
        fixedAnchors: initialValidation.summary.fixedItems,
        mustDoItems: initialValidation.summary.mustDoItems,
      },
    };
  }

  const { tripId, days } = extractDaysAndItems(input);

  // Construct baseline itinerary for T001 validation
  const baselineItinerary: ConstraintItinerary = {
    id: tripId,
    days: days.map((d) => ({
      dayNumber: d.dayNumber,
      items: d.items.map((it, idx) => ({
        id: it.id,
        position: idx + 1,
        flexibility: it.flexibility,
        priority: it.priority,
        placeName: it.placeName,
        dayNumber: d.dayNumber,
        startTime: it.startTime,
        endTime: it.endTime,
      })),
    })),
  };

  const dayResults: OptimizedDayResult[] = [];
  let totalSavingsSeconds = 0;
  let totalSavingsMeters = 0;
  let totalProviderCalls = 0;
  let remainingBudget = ROUTE_OPTIMIZATION_BOUNDS.MAX_PROVIDER_CALLS_PER_OPTIMIZATION;

  let totalItemsCount = 0;
  let routableItemsCount = 0;
  let fixedAnchorsCount = 0;
  let mustDoCount = 0;

  for (const day of days) {
    if (options.signal?.aborted) {
      throw new IntegrationError('cancelled');
    }

    totalItemsCount += day.items.length;
    routableItemsCount += day.items.filter((it) => it.isRoutable).length;
    fixedAnchorsCount += day.items.filter((it) => isFixedItem(it)).length;
    mustDoCount += day.items.filter((it) => isMustDoItem(it)).length;

    // Day-level baseline
    const dayBaseline: ConstraintItinerary = {
      days: [
        {
          dayNumber: day.dayNumber,
          items: day.items.map((it, idx) => ({
            id: it.id,
            position: idx + 1,
            flexibility: it.flexibility,
            priority: it.priority,
            placeName: it.placeName,
            dayNumber: day.dayNumber,
            startTime: it.startTime,
            endTime: it.endTime,
          })),
        },
      ],
    };

    const dayResult = await optimizeDay(
      day.dayNumber,
      day.items,
      routeRepo,
      options,
      dayBaseline,
      remainingBudget,
    );

    dayResults.push(dayResult);
    if (dayResult.metrics.durationSavingsSeconds) {
      totalSavingsSeconds += dayResult.metrics.durationSavingsSeconds;
    }
    if (dayResult.metrics.distanceSavingsMeters) {
      totalSavingsMeters += dayResult.metrics.distanceSavingsMeters;
    }
    totalProviderCalls += dayResult.metrics.providerCallCount;
    remainingBudget -= dayResult.metrics.providerCallCount;

    if (dayResult.status === 'cancelled' || options.signal?.aborted) {
      break;
    }
  }

  // Full-itinerary constraint safety evaluation against baseline
  const fullProposedItinerary: ConstraintItinerary = {
    id: tripId,
    days: dayResults.map((d) => ({
      dayNumber: d.dayNumber,
      items: d.items,
    })),
  };
  const fullEvaluation = evaluatePlanConstraints(fullProposedItinerary, baselineItinerary);

  // Aggregate overall status
  let overallStatus: RouteOptimizationStatus = 'already_optimal';
  if (dayResults.some((d) => d.status === 'cancelled') || options.signal?.aborted) {
    overallStatus = 'cancelled';
  } else if (!fullEvaluation.isValid || dayResults.some((d) => d.status === 'constraint_conflict')) {
    overallStatus = 'constraint_conflict';
  } else if (dayResults.some((d) => d.status === 'optimized')) {
    overallStatus = 'optimized';
  } else if (dayResults.some((d) => d.status === 'fallback')) {
    overallStatus = 'fallback';
  }

  return {
    tripId,
    status: overallStatus,
    days: dayResults,
    totalSavingsSeconds,
    totalSavingsMeters,
    totalProviderCalls,
    summary: {
      totalItems: totalItemsCount,
      routableItems: routableItemsCount,
      fixedAnchors: fixedAnchorsCount,
      mustDoItems: mustDoCount,
    },
    validation: fullEvaluation,
  };
}
