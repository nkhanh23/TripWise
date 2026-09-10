/**
 * Deterministic Constraint Engine for TripWise (FEATURE-P5-T001-S001)
 *
 * Enforces zero-silent-repair constraints for travel itineraries:
 * 1. FIXED items:
 *    - Day immutability (cannot move across days)
 *    - Time immutability (start time and end time cannot be altered)
 *    - Retention (cannot be dropped/omitted from proposed plan)
 *    - Non-overlap (two fixed items on the same day cannot overlap in time)
 *    - Time range validity (endTime >= startTime)
 * 2. MUST_DO items:
 *    - Retention (must survive planning, cannot be omitted)
 *    - Priority protection (cannot be downgraded to want_to_do or optional)
 *    - Moveable across days/times only if flexibility is not 'fixed'
 * 3. OPTIONAL / WANT_TO_DO items:
 *    - Reschedulable, movable across days, reorderable, or droppable without conflict.
 * 4. Purity & Determinism:
 *    - Pure in-memory computation (zero network, zero DB, zero async).
 *    - Canonical deterministic conflict sorting (day -> time -> itemId -> code -> conflictingItemId).
 *    - Identical inputs or permuted order yield identical conflict lists.
 */

import type {
  SavedTripDay,
  SavedTripDetail,
  WorkspaceFlexibility,
  WorkspacePriority,
} from './contracts';

// ============================================================================
// Planning Bounds
// ============================================================================

export const PLANNING_BOUNDS = {
  MAX_DAYS: 60,
  MAX_ITEMS_PER_DAY: 50,
  MAX_TOTAL_ITEMS: 500,
} as const;

// ============================================================================
// Types and Contracts
// ============================================================================

export type ConflictOrigin = 'baseline' | 'proposed';

export type ConstraintConflictCode =
  | 'FIXED_ITEM_DROPPED'
  | 'FIXED_DAY_CHANGED'
  | 'FIXED_START_TIME_CHANGED'
  | 'FIXED_END_TIME_CHANGED'
  | 'FIXED_POSITION_CHANGED'
  | 'FIXED_TIME_OVERLAP'
  | 'FIXED_INVALID_TIME_RANGE'
  | 'INVALID_TIME_RANGE'
  | 'MUST_DO_DROPPED'
  | 'MUST_DO_DOWNGRADED'
  | 'DUPLICATE_ITEM_ID'
  | 'MALFORMED_INPUT';

export type ConstraintConflict = {
  code: ConstraintConflictCode;
  itemId: string;
  dayNumber?: number;
  conflictingItemId?: string;
  origin?: ConflictOrigin;
  message: string;
  details?: Record<string, unknown>;
};

export type ConstraintItem = {
  id: string;
  position: number;
  flexibility: WorkspaceFlexibility;
  priority: WorkspacePriority;
  placeName?: string;
  dayNumber?: number;
  startTime?: string | null;
  endTime?: string | null;
};

export type ConstraintDay = {
  id?: string;
  dayNumber: number;
  date?: string;
  items: readonly ConstraintItem[];
};

export type ConstraintItinerary = {
  id?: string;
  days: readonly ConstraintDay[];
};

export type ConstraintEngineSummary = {
  totalItems: number;
  fixedItems: number;
  mustDoItems: number;
  conflictsCount: number;
};

export type ConstraintEvaluationResult = {
  isValid: boolean;
  conflicts: readonly ConstraintConflict[];
  summary: ConstraintEngineSummary;
};

/**
 * Canonical itinerary input accepted by the deterministic constraint engine.
 *
 * NOTE ON RUNTIME SAFETY:
 * While strongly typed variants (SavedTripDetail, ConstraintItinerary, etc.) are provided
 * for developer convenience, ItineraryInput intentionally includes `unknown` because this
 * engine serves as the untrusted runtime boundary for dynamic JSON payloads, local storage,
 * and database snapshots before any scheduling logic executes.
 */
export type ItineraryInput =
  | SavedTripDetail
  | readonly SavedTripDay[]
  | ConstraintItinerary
  | { days: readonly ConstraintDay[] }
  | readonly ConstraintDay[]
  | unknown;

// ============================================================================
// Regex & Helpers
// ============================================================================

const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Validates whether a string matches standard 24-hour military time 'HH:MM'.
 * Strict scalar validation: rejects leading/trailing whitespace, non-strings, etc.
 */
export function isValidTimeString(timeStr: unknown): boolean {
  if (typeof timeStr !== 'string') return false;
  return TIME_FORMAT_REGEX.test(timeStr);
}

/**
 * Converts 'HH:MM' string to minutes from midnight (0..1439).
 * Returns null if invalid, absent, or contains whitespace padding.
 */
export function timeToMinutes(timeStr: unknown): number | null {
  if (typeof timeStr !== 'string') return null;
  if (!TIME_FORMAT_REGEX.test(timeStr)) return null;
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const minutes = Number.parseInt(minutesStr, 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Checks whether an item is designated as FIXED.
 */
export function isFixedItem(item: { flexibility?: unknown }): boolean {
  return item.flexibility === 'fixed';
}

/**
 * Checks whether an item is designated as MUST_DO.
 */
export function isMustDoItem(item: { priority?: unknown }): boolean {
  return item.priority === 'must_do';
}

/**
 * Validates canonical WorkspaceFlexibility enum strictly.
 */
export function isValidFlexibility(val: unknown): val is WorkspaceFlexibility {
  return val === 'fixed' || val === 'flexible';
}

/**
 * Validates canonical WorkspacePriority enum strictly.
 */
export function isValidPriority(val: unknown): val is WorkspacePriority {
  return val === 'must_do' || val === 'want_to_do' || val === 'optional';
}

/**
 * Validates a strict time scalar (startTime or endTime).
 * - undefined or null: absent / no fact (valid, returns undefined value).
 * - exact string matching HH:MM: valid, returns string value.
 * - numbers, booleans, objects, arrays, empty strings, whitespace-only strings,
 *   or padded strings (" 09:00 "): invalid, returns conflict with MALFORMED_INPUT.
 */
function parseStrictTimeScalar(
  rawVal: unknown,
  fieldName: 'startTime' | 'endTime',
  itemId: string,
  dayNumber: number,
  origin: ConflictOrigin,
  placeName?: string
): { value: string | undefined; conflict?: ConstraintConflict } {
  if (rawVal === undefined || rawVal === null) {
    return { value: undefined };
  }
  if (typeof rawVal !== 'string' || !isValidTimeString(rawVal)) {
    return {
      value: undefined,
      conflict: {
        code: 'MALFORMED_INPUT',
        itemId,
        dayNumber,
        origin,
        message: `Item "${placeName || itemId}" has invalid ${fieldName} scalar: ${typeof rawVal === 'string' ? `"${rawVal}"` : JSON.stringify(rawVal)} (expected null, undefined, or strict HH:MM string)`,
        details: { field: fieldName, invalidValue: rawVal },
      },
    };
  }
  return { value: rawVal };
}

// ============================================================================
// Deterministic Sorting
// ============================================================================

/**
 * Sorts conflicts deterministically using a strict canonical comparator:
 * 1. origin ASC ('baseline' before 'proposed')
 * 2. dayNumber ASC (undefined last)
 * 3. startTime ASC (undefined last)
 * 4. itemId ASC (alphabetical)
 * 5. code ASC (alphabetical)
 * 6. conflictingItemId ASC (undefined last, then alphabetical)
 * 7. message ASC (alphabetical)
 */
export function sortConflictsDeterministically(
  conflicts: readonly ConstraintConflict[],
  itemStartTimeMap?: ReadonlyMap<string, string | undefined>
): ConstraintConflict[] {
  return [...conflicts].sort((a, b) => {
    // 1. origin
    const origA = a.origin ?? 'proposed';
    const origB = b.origin ?? 'proposed';
    if (origA !== origB) {
      return origA.localeCompare(origB);
    }

    // 2. dayNumber
    const dayA = a.dayNumber ?? Number.MAX_SAFE_INTEGER;
    const dayB = b.dayNumber ?? Number.MAX_SAFE_INTEGER;
    if (dayA !== dayB) return dayA - dayB;

    // 3. startTime
    if (itemStartTimeMap) {
      const timeA = itemStartTimeMap.get(a.itemId) ?? '';
      const timeB = itemStartTimeMap.get(b.itemId) ?? '';
      if (timeA !== timeB) {
        if (!timeA) return 1;
        if (!timeB) return -1;
        const cmp = timeA.localeCompare(timeB);
        if (cmp !== 0) return cmp;
      }
    }

    // 4. itemId
    const itemCmp = a.itemId.localeCompare(b.itemId);
    if (itemCmp !== 0) return itemCmp;

    // 5. code
    const codeCmp = a.code.localeCompare(b.code);
    if (codeCmp !== 0) return codeCmp;

    // 6. conflictingItemId
    const confA = a.conflictingItemId ?? '';
    const confB = b.conflictingItemId ?? '';
    if (confA !== confB) {
      if (!confA) return 1;
      if (!confB) return -1;
      return confA.localeCompare(confB);
    }

    // 7. message
    return a.message.localeCompare(b.message);
  });
}

// ============================================================================
// Input Extraction & Normalization
// ============================================================================

type NormalizedDay = {
  id?: string;
  dayNumber: number;
  date?: string;
  items: ConstraintItem[];
};

type NormalizedItinerary = {
  days: NormalizedDay[];
  malformedConflicts: ConstraintConflict[];
};

/**
 * Extracts and strictly runtime-validates days and items from input shapes.
 * Zero silent repairs:
 * - Rejects missing/invalid dayNumber (must be positive integer >= 1)
 * - Rejects duplicate day numbers (reason: 'DUPLICATE_DAY_NUMBER')
 * - Rejects non-contiguous day numbers (must form exactly 1..N, reason: 'NON_CONTIGUOUS_DAY_NUMBERS')
 * - Rejects missing/non-array items
 * - Rejects missing/invalid position (must be positive integer >= 1, reason: 'INVALID_POSITION_DOMAIN')
 * - Rejects duplicate positions per day (reason: 'DUPLICATE_ITEM_POSITION')
 * - Rejects non-contiguous item positions per day (must form exactly 1..M, reason: 'NON_CONTIGUOUS_ITEM_POSITIONS')
 * - Rejects invalid flexibility/priority enums
 * - Rejects non-scalar / non-HH:MM time fields (no auto-trim, no type-coercion)
 * - Rejects inputs exceeding PLANNING_BOUNDS.
 */
export function normalizeItineraryInput(
  input: unknown,
  origin: ConflictOrigin = 'proposed'
): NormalizedItinerary {
  const malformedConflicts: ConstraintConflict[] = [];

  if (!input || typeof input !== 'object') {
    malformedConflicts.push({
      code: 'MALFORMED_INPUT',
      itemId: 'itinerary',
      origin,
      message: 'Itinerary input must be a non-null object or array of days',
    });
    return { days: [], malformedConflicts };
  }

  let rawDays: unknown[] = [];
  if (Array.isArray(input)) {
    rawDays = input;
  } else if ('days' in input && Array.isArray((input as { days: unknown }).days)) {
    rawDays = (input as { days: unknown[] }).days;
  } else {
    malformedConflicts.push({
      code: 'MALFORMED_INPUT',
      itemId: 'itinerary',
      origin,
      message: 'Itinerary input must contain an array of days',
    });
    return { days: [], malformedConflicts };
  }

  // Fail-fast bounds check: maximum planning days (DEFECT A)
  // If input exceeds MAX_DAYS, fail-fast immediately without iterating any days!
  if (rawDays.length > PLANNING_BOUNDS.MAX_DAYS) {
    malformedConflicts.push({
      code: 'MALFORMED_INPUT',
      itemId: 'itinerary',
      origin,
      message: `Itinerary exceeds maximum allowed planning days (${rawDays.length} > ${PLANNING_BOUNDS.MAX_DAYS})`,
      details: { maxDays: PLANNING_BOUNDS.MAX_DAYS, actualDays: rawDays.length },
    });
    return { days: [], malformedConflicts };
  }

  const dayMap = new Map<number, NormalizedDay>();
  const seenDayNumbers = new Set<number>();
  const dayNumbersInOrder: number[] = [];
  let totalItemsCount = 0;
  let hasDuplicateDayNumber = false;
  let hasInvalidDayNumber = false;

  for (let dIdx = 0; dIdx < rawDays.length; dIdx++) {
    const rawDay = rawDays[dIdx];
    if (!rawDay || typeof rawDay !== 'object') {
      hasInvalidDayNumber = true;
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: `day-idx-${dIdx}`,
        origin,
        message: `Day at array index ${dIdx} is not an object`,
      });
      continue;
    }

    const dayObj = rawDay as Record<string, unknown>;
    const rawDayNumber = dayObj.dayNumber;

    // Strict validation of dayNumber: MUST be a positive integer >= 1.
    // NO silent fallback to dIdx + 1!
    if (typeof rawDayNumber !== 'number' || !Number.isInteger(rawDayNumber) || rawDayNumber < 1) {
      hasInvalidDayNumber = true;
      const fallbackId = typeof dayObj.id === 'string' && dayObj.id.trim() ? dayObj.id.trim() : `day-idx-${dIdx}`;
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: fallbackId,
        origin,
        message: `Day at array index ${dIdx} has missing or invalid dayNumber: ${String(rawDayNumber)} (expected positive integer >= 1)`,
        details: { invalidDayNumber: rawDayNumber },
      });
      continue;
    }

    const dayNumber = rawDayNumber;

    // Strict check for duplicate dayNumber across itinerary (DEFECT B)
    if (seenDayNumbers.has(dayNumber)) {
      hasDuplicateDayNumber = true;
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: `day-${dayNumber}`,
        dayNumber,
        origin,
        message: `Duplicate dayNumber ${dayNumber} found in itinerary`,
        details: { reason: 'DUPLICATE_DAY_NUMBER', dayNumber },
      });
      // DEFECT B: Duplicate day is already invalid. Do NOT iterate or merge duplicate-day
      // items into dayMap, preventing aggregate logical day items from exceeding MAX_ITEMS_PER_DAY.
      continue;
    } else {
      seenDayNumbers.add(dayNumber);
      dayNumbersInOrder.push(dayNumber);
    }

    // Strict validation of items array: MUST be present and an Array.
    // NO silent fallback to []!
    if (!('items' in dayObj) || !Array.isArray(dayObj.items)) {
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: `day-${dayNumber}`,
        dayNumber,
        origin,
        message: `Day ${dayNumber} is missing required array property 'items'`,
      });
      continue;
    }

    const rawItems = dayObj.items;

    // Fail-fast bounds check: maximum items per day (DEFECT A)
    // If rawItems exceeds MAX_ITEMS_PER_DAY, fail-fast on this day without iterating its items!
    if (rawItems.length > PLANNING_BOUNDS.MAX_ITEMS_PER_DAY) {
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: `day-${dayNumber}`,
        dayNumber,
        origin,
        message: `Day ${dayNumber} exceeds maximum allowed items per day (${rawItems.length} > ${PLANNING_BOUNDS.MAX_ITEMS_PER_DAY})`,
        details: { maxItemsPerDay: PLANNING_BOUNDS.MAX_ITEMS_PER_DAY, actualItems: rawItems.length },
      });
      continue;
    }

    // Fail-fast bounds check: running total items across itinerary (DEFECT A)
    // If running total + rawItems would exceed MAX_TOTAL_ITEMS, fail-fast immediately!
    if (totalItemsCount + rawItems.length > PLANNING_BOUNDS.MAX_TOTAL_ITEMS) {
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: 'itinerary',
        origin,
        message: `Itinerary exceeds maximum allowed total items (${totalItemsCount + rawItems.length} > ${PLANNING_BOUNDS.MAX_TOTAL_ITEMS})`,
        details: {
          maxTotalItems: PLANNING_BOUNDS.MAX_TOTAL_ITEMS,
          actualTotalItems: totalItemsCount + rawItems.length,
        },
      });
      return { days: [], malformedConflicts };
    }

    totalItemsCount += rawItems.length;

    const items: ConstraintItem[] = [];
    const seenPositionsOnDay = new Set<number>();
    const positionsOnDay: number[] = [];
    let hasInvalidPositionOnDay = false;
    let hasDuplicatePositionOnDay = false;

    for (let iIdx = 0; iIdx < rawItems.length; iIdx++) {
      const rawItem = rawItems[iIdx];
      if (!rawItem || typeof rawItem !== 'object') {
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: `day-${dayNumber}-item-idx-${iIdx}`,
          dayNumber,
          origin,
          message: `Item at index ${iIdx} on day ${dayNumber} is not an object`,
        });
        continue;
      }

      const itemObj = rawItem as Record<string, unknown>;
      const rawId = itemObj.id;
      if (typeof rawId !== 'string' || rawId.trim().length === 0) {
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: `day-${dayNumber}-item-idx-${iIdx}`,
          dayNumber,
          origin,
          message: `Item at index ${iIdx} on day ${dayNumber} is missing valid string id`,
        });
        continue;
      }

      const id = rawId.trim();
      const placeName = typeof itemObj.placeName === 'string' ? itemObj.placeName.trim() : undefined;

      // Strict validation of position: MUST be positive integer >= 1 (Defect A).
      // NO silent fallback or 0-based positions!
      const rawPos = itemObj.position;
      if (typeof rawPos !== 'number' || !Number.isInteger(rawPos) || rawPos < 1) {
        hasInvalidPositionOnDay = true;
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: id,
          dayNumber,
          origin,
          message: `Item "${placeName || id}" on day ${dayNumber} has missing or invalid canonical position: ${String(rawPos)} (expected positive integer >= 1)`,
          details: { reason: 'INVALID_POSITION_DOMAIN', invalidPosition: rawPos },
        });
        continue;
      }
      const position = rawPos;

      // Check duplicate position on same day
      if (seenPositionsOnDay.has(position)) {
        hasDuplicatePositionOnDay = true;
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: id,
          dayNumber,
          origin,
          message: `Duplicate position ${position} found on day ${dayNumber}`,
          details: { reason: 'DUPLICATE_ITEM_POSITION', dayNumber, position },
        });
      } else {
        seenPositionsOnDay.add(position);
        positionsOnDay.push(position);
      }

      // Strict validation of flexibility: MUST be 'fixed' or 'flexible'.
      const rawFlex = itemObj.flexibility;
      if (!isValidFlexibility(rawFlex)) {
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: id,
          dayNumber,
          origin,
          message: `Item "${placeName || id}" on day ${dayNumber} has invalid flexibility: ${JSON.stringify(rawFlex)} (expected "fixed" | "flexible")`,
          details: { invalidFlexibility: rawFlex },
        });
        continue;
      }
      const flexibility: WorkspaceFlexibility = rawFlex;

      // Strict validation of priority: MUST be 'must_do', 'want_to_do', or 'optional'.
      const rawPriority = itemObj.priority;
      if (!isValidPriority(rawPriority)) {
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: id,
          dayNumber,
          origin,
          message: `Item "${placeName || id}" on day ${dayNumber} has invalid priority: ${JSON.stringify(rawPriority)} (expected "must_do" | "want_to_do" | "optional")`,
          details: { invalidPriority: rawPriority },
        });
        continue;
      }
      const priority: WorkspacePriority = rawPriority;

      // Strict scalar time parsing (Defect D): no silent trimming, no type coercion
      const startParse = parseStrictTimeScalar(itemObj.startTime, 'startTime', id, dayNumber, origin, placeName);
      if (startParse.conflict) {
        malformedConflicts.push(startParse.conflict);
      }

      const endParse = parseStrictTimeScalar(itemObj.endTime, 'endTime', id, dayNumber, origin, placeName);
      if (endParse.conflict) {
        malformedConflicts.push(endParse.conflict);
      }

      if (startParse.conflict || endParse.conflict) {
        continue;
      }

      items.push({
        id,
        placeName,
        dayNumber,
        position,
        flexibility,
        priority,
        startTime: startParse.value,
        endTime: endParse.value,
      });
    }

    // Check item position contiguity 1..M on this day (Defect C)
    if (rawItems.length > 0 && !hasInvalidPositionOnDay && !hasDuplicatePositionOnDay) {
      const sortedPositions = [...positionsOnDay].sort((a, b) => a - b);
      let isItemContiguous = true;
      for (let p = 0; p < sortedPositions.length; p++) {
        if (sortedPositions[p] !== p + 1) {
          isItemContiguous = false;
          break;
        }
      }
      if (!isItemContiguous) {
        malformedConflicts.push({
          code: 'MALFORMED_INPUT',
          itemId: `day-${dayNumber}`,
          dayNumber,
          origin,
          message: `Item positions on day ${dayNumber} must be contiguous 1..N (found [${sortedPositions.join(', ')}], expected 1..${sortedPositions.length})`,
          details: {
            reason: 'NON_CONTIGUOUS_ITEM_POSITIONS',
            dayNumber,
            expectedCount: sortedPositions.length,
            actualPositions: sortedPositions,
          },
        });
      }
    }

    // Assign to dayMap (DEFECT B: duplicate day was skipped above, so each entry has items <= 50)
    dayMap.set(dayNumber, {
      id: typeof dayObj.id === 'string' ? dayObj.id : undefined,
      dayNumber,
      date: typeof dayObj.date === 'string' ? dayObj.date : undefined,
      items,
    });
  }

  // Check day contiguity 1..N across itinerary (Defect B)
  if (rawDays.length > 0 && !hasInvalidDayNumber && !hasDuplicateDayNumber) {
    const sortedDayNumbers = [...dayNumbersInOrder].sort((a, b) => a - b);
    let isDayContiguous = true;
    for (let d = 0; d < sortedDayNumbers.length; d++) {
      if (sortedDayNumbers[d] !== d + 1) {
        isDayContiguous = false;
        break;
      }
    }
    if (!isDayContiguous) {
      malformedConflicts.push({
        code: 'MALFORMED_INPUT',
        itemId: 'itinerary',
        origin,
        message: `Itinerary dayNumbers must be contiguous 1..N (found [${sortedDayNumbers.join(', ')}], expected 1..${sortedDayNumbers.length})`,
        details: {
          reason: 'NON_CONTIGUOUS_DAY_NUMBERS',
          expectedCount: sortedDayNumbers.length,
          actualDayNumbers: sortedDayNumbers,
        },
      });
    }
  }

  // Canonical sort: days by dayNumber ASC, items by position ASC
  const days: NormalizedDay[] = Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber);
  for (const day of days) {
    day.items.sort((a, b) => a.position - b.position);
  }

  return { days, malformedConflicts };
}

// ============================================================================
// Bounded Sweep Overlap Detection
// ============================================================================

/**
 * Detects overlapping FIXED items on a single day using a deterministic bounded sweep.
 *
 * COMPUTATIONAL COMPLEXITY & BOUND SPECIFICATION:
 *
 * 1. VALID CANONICAL INPUT:
 *    - Processed days D <= PLANNING_BOUNDS.MAX_DAYS = 60.
 *    - Processed items per day K <= PLANNING_BOUNDS.MAX_ITEMS_PER_DAY = 50.
 *    - Total items across itinerary <= PLANNING_BOUNDS.MAX_TOTAL_ITEMS = 500.
 *    - FIXED overlap list size entering sweep: K <= 50.
 *    - Sorting per day: O(K log K).
 *    - Overlap enumeration (bounded sweep): output-sensitive, worst-case O(K^2) pairs,
 *      hard-bounded by K <= 50 (maximum possible pair checks per day <= 50 * 49 / 2 = 1,225).
 *    - Overall valid-plan evaluation complexity: O(D * (K log K + K^2)).
 *
 * 2. MALFORMED / OVERSIZED INPUT:
 *    - Rejected fail-fast BEFORE expensive normalization or sweep traversal:
 *      * rawDays > 60: rejected immediately without traversing any days.
 *      * rawItems > 50: rejected immediately on that day without traversing its items.
 *      * running total items > 500: rejected immediately as soon as threshold would be crossed.
 *      * duplicate dayNumber: rejected fail-fast without merging duplicate-day items into dayMap.
 *    - No code path processes an unbounded raw array before rejection.
 *
 * Algorithm details:
 * 1. Collect scheduled fixed items and sort by startMin ASC, endMin ASC, itemId ASC.
 * 2. Sweep: For item i, check subsequent items j. Because items are sorted by start time,
 *    once startB >= endA (or startB > startA for point items), no subsequent items can overlap,
 *    so the inner loop breaks early.
 * 3. Adjacent touching intervals (e.g. 10:00-11:00 and 11:00-12:00) do NOT overlap.
 */
function findFixedOverlapsOnDay(
  fixedItemsOnDay: ConstraintItem[],
  dayNumber: number,
  origin: ConflictOrigin
): ConstraintConflict[] {
  const overlaps: ConstraintConflict[] = [];

  // Filter items that have a valid startTime
  const scheduledFixed = fixedItemsOnDay.filter(item => isValidTimeString(item.startTime));

  // Sort deterministically: startMin ASC, (endMin ?? startMin) ASC, itemId ASC
  scheduledFixed.sort((a, b) => {
    const startA = timeToMinutes(a.startTime)!;
    const startB = timeToMinutes(b.startTime)!;
    if (startA !== startB) return startA - startB;

    const endA = timeToMinutes(a.endTime) ?? startA;
    const endB = timeToMinutes(b.endTime) ?? startB;
    if (endA !== endB) return endA - endB;

    return a.id.localeCompare(b.id);
  });

  for (let i = 0; i < scheduledFixed.length; i++) {
    const itemA = scheduledFixed[i];
    const startA = timeToMinutes(itemA.startTime)!;
    const endA = timeToMinutes(itemA.endTime);

    // Bounded sweep over subsequent items
    for (let j = i + 1; j < scheduledFixed.length; j++) {
      const itemB = scheduledFixed[j];
      const startB = timeToMinutes(itemB.startTime)!;
      const endB = timeToMinutes(itemB.endTime);

      // Early break check:
      if (endA !== null) {
        // itemA is interval [startA, endA)
        // Since list is sorted by startMin, all items after j have start >= startB.
        // If startB >= endA, itemB and all following items cannot overlap itemA!
        if (startB >= endA) {
          break;
        }
      } else {
        // itemA is point event at startA
        // If startB > startA, following items cannot overlap point startA!
        if (startB > startA) {
          break;
        }
      }

      let isOverlap = false;

      if (endA !== null && endB !== null) {
        // Both are intervals: overlap iff startA < endB && startB < endA
        if (startA < endB && startB < endA) {
          isOverlap = true;
        }
      } else if (endA !== null && endB === null) {
        // itemA is interval [startA, endA), itemB is point startB
        // Overlap if point falls strictly inside interval [startA, endA)
        if (startA <= startB && startB < endA) {
          isOverlap = true;
        }
      } else if (endA === null && endB !== null) {
        // itemA is point startA, itemB is interval [startB, endB)
        if (startB <= startA && startA < endB) {
          isOverlap = true;
        }
      } else {
        // Both are point events: overlap iff exact same time
        if (startA === startB) {
          isOverlap = true;
        }
      }

      if (isOverlap) {
        // Canonical ordering: item with smaller ID is itemId, larger is conflictingItemId
        const [first, second] = itemA.id.localeCompare(itemB.id) <= 0
          ? [itemA, itemB]
          : [itemB, itemA];

        overlaps.push({
          code: 'FIXED_TIME_OVERLAP',
          itemId: first.id,
          conflictingItemId: second.id,
          dayNumber,
          origin,
          message: `Fixed activity "${first.placeName || first.id}" overlaps in time with fixed activity "${second.placeName || second.id}" on day ${dayNumber}`,
          details: {
            itemATime: `${first.startTime ?? 'none'}-${first.endTime ?? 'none'}`,
            itemBTime: `${second.startTime ?? 'none'}-${second.endTime ?? 'none'}`,
          },
        });
      }
    }
  }

  return overlaps;
}

// ============================================================================
// Intra-Schedule Validation (Self-consistency of a single plan)
// ============================================================================

/**
 * Checks a single schedule's internal validity:
 * 1. Duplicate item IDs across entire itinerary (permutation-invariant detection).
 * 2. Time range validity (endTime >= startTime):
 *    - Emits FIXED_INVALID_TIME_RANGE for fixed items
 *    - Emits INVALID_TIME_RANGE for non-fixed items
 * 3. Non-overlap of FIXED items on the same day via bounded sweep.
 */
function evaluateIntraSchedule(
  normalized: NormalizedItinerary,
  itemStartTimeMap: Map<string, string | undefined>,
  origin: ConflictOrigin = 'proposed'
): {
  conflicts: ConstraintConflict[];
  flattenedItems: Map<string, { item: ConstraintItem; dayNumber: number }>;
  fixedCount: number;
  mustDoCount: number;
} {
  const conflicts: ConstraintConflict[] = [...normalized.malformedConflicts];
  const flattenedItems = new Map<string, { item: ConstraintItem; dayNumber: number }>();

  // 1. Permutation-invariant duplicate ID detection:
  // Collect all occurrences of every ID, sort occurrences by (dayNumber ASC, position ASC).
  // The first occurrence is the canonical original; all subsequent occurrences receive DUPLICATE_ITEM_ID.
  const idOccurrences = new Map<string, { dayNumber: number; position: number; item: ConstraintItem }[]>();

  for (const day of normalized.days) {
    for (const item of day.items) {
      itemStartTimeMap.set(item.id, item.startTime ?? undefined);
      let list = idOccurrences.get(item.id);
      if (!list) {
        list = [];
        idOccurrences.set(item.id, list);
      }
      list.push({ dayNumber: day.dayNumber, position: item.position, item });
    }
  }

  let fixedCount = 0;
  let mustDoCount = 0;

  for (const [id, occurrences] of idOccurrences.entries()) {
    // Sort occurrences deterministically
    occurrences.sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      return a.position - b.position;
    });

    // Primary canonical entry
    const primary = occurrences[0];
    flattenedItems.set(id, { item: primary.item, dayNumber: primary.dayNumber });

    if (isFixedItem(primary.item)) fixedCount++;
    if (isMustDoItem(primary.item)) mustDoCount++;

    // Flag any duplicate occurrences deterministically
    if (occurrences.length > 1) {
      for (let o = 1; o < occurrences.length; o++) {
        const dup = occurrences[o];
        conflicts.push({
          code: 'DUPLICATE_ITEM_ID',
          itemId: id,
          dayNumber: dup.dayNumber,
          origin,
          message: `Duplicate item id "${id}" found in itinerary on day ${dup.dayNumber}`,
          details: { canonicalDay: primary.dayNumber, duplicateDay: dup.dayNumber },
        });
      }
    }
  }

  // 2. Time range validity and fixed overlap check per day
  for (const day of normalized.days) {
    const fixedItemsOnDay: ConstraintItem[] = [];

    for (const item of day.items) {
      const isFixed = isFixedItem(item);
      if (isFixed) {
        fixedItemsOnDay.push(item);
      }

      // Time range check
      const startMin = timeToMinutes(item.startTime);
      const endMin = timeToMinutes(item.endTime);

      if (startMin !== null && endMin !== null) {
        if (endMin < startMin) {
          // FIXED items get FIXED_INVALID_TIME_RANGE; non-fixed get INVALID_TIME_RANGE
          const code: ConstraintConflictCode = isFixed ? 'FIXED_INVALID_TIME_RANGE' : 'INVALID_TIME_RANGE';
          conflicts.push({
            code,
            itemId: item.id,
            dayNumber: day.dayNumber,
            origin,
            message: `Activity "${item.placeName || item.id}" has invalid time range: endTime (${item.endTime}) is earlier than startTime (${item.startTime})`,
            details: { startTime: item.startTime, endTime: item.endTime, flexibility: item.flexibility },
          });
        }
      }
    }

    // 3. Bounded sweep non-overlap check among FIXED items on the same day
    const dayOverlaps = findFixedOverlapsOnDay(fixedItemsOnDay, day.dayNumber, origin);
    conflicts.push(...dayOverlaps);
  }

  return { conflicts, flattenedItems, fixedCount, mustDoCount };
}

// ============================================================================
// Modification Evaluation (Baseline vs Proposed Plan)
// ============================================================================

/**
 * Compares baseline itinerary against proposed plan to enforce:
 * - FIXED retention, day immutability, time immutability
 * - MUST_DO retention, priority protection
 */
function evaluatePlanDelta(
  baselineItems: Map<string, { item: ConstraintItem; dayNumber: number }>,
  proposedItems: Map<string, { item: ConstraintItem; dayNumber: number }>
): ConstraintConflict[] {
  const deltaConflicts: ConstraintConflict[] = [];

  for (const [id, baseEntry] of baselineItems.entries()) {
    const baseItem = baseEntry.item;
    const baseDayNumber = baseEntry.dayNumber;
    const propEntry = proposedItems.get(id);

    const isFixed = isFixedItem(baseItem);
    const isMustDo = isMustDoItem(baseItem);

    if (!propEntry) {
      // Item was omitted / dropped in proposed
      if (isFixed) {
        deltaConflicts.push({
          code: 'FIXED_ITEM_DROPPED',
          itemId: id,
          dayNumber: baseDayNumber,
          origin: 'proposed',
          message: `Fixed activity "${baseItem.placeName || id}" cannot be removed from itinerary`,
          details: { originalDay: baseDayNumber },
        });
      }
      if (isMustDo) {
        deltaConflicts.push({
          code: 'MUST_DO_DROPPED',
          itemId: id,
          dayNumber: baseDayNumber,
          origin: 'proposed',
          message: `Must-do activity "${baseItem.placeName || id}" cannot be removed from itinerary`,
          details: { originalDay: baseDayNumber },
        });
      }
      continue;
    }

    const propItem = propEntry.item;
    const propDayNumber = propEntry.dayNumber;

    // Rules for FIXED items:
    if (isFixed) {
      // 1. Day immutability
      if (propDayNumber !== baseDayNumber) {
        deltaConflicts.push({
          code: 'FIXED_DAY_CHANGED',
          itemId: id,
          dayNumber: propDayNumber,
          origin: 'proposed',
          message: `Fixed activity "${baseItem.placeName || id}" cannot be moved from day ${baseDayNumber} to day ${propDayNumber}`,
          details: { baselineDay: baseDayNumber, proposedDay: propDayNumber },
        });
      }

      // 2. Start time immutability
      const baseStart = baseItem.startTime ?? null;
      const propStart = propItem.startTime ?? null;
      if (baseStart !== propStart) {
        deltaConflicts.push({
          code: 'FIXED_START_TIME_CHANGED',
          itemId: id,
          dayNumber: propDayNumber,
          origin: 'proposed',
          message: `Fixed activity "${baseItem.placeName || id}" start time cannot be changed from "${baseStart ?? 'none'}" to "${propStart ?? 'none'}"`,
          details: { baselineStart: baseStart, proposedStart: propStart },
        });
      }

      // 3. End time immutability
      const baseEnd = baseItem.endTime ?? null;
      const propEnd = propItem.endTime ?? null;
      if (baseEnd !== propEnd) {
        deltaConflicts.push({
          code: 'FIXED_END_TIME_CHANGED',
          itemId: id,
          dayNumber: propDayNumber,
          origin: 'proposed',
          message: `Fixed activity "${baseItem.placeName || id}" end time cannot be changed from "${baseEnd ?? 'none'}" to "${propEnd ?? 'none'}"`,
          details: { baselineEnd: baseEnd, proposedEnd: propEnd },
        });
      }

      // 4. Position immutability (DEFECT D)
      if (propItem.position !== baseItem.position) {
        deltaConflicts.push({
          code: 'FIXED_POSITION_CHANGED',
          itemId: id,
          dayNumber: propDayNumber,
          origin: 'proposed',
          message: `Fixed activity "${baseItem.placeName || id}" position cannot be changed from ${baseItem.position} to ${propItem.position}`,
          details: { baselinePosition: baseItem.position, proposedPosition: propItem.position },
        });
      }
    }

    // Rules for MUST_DO items:
    if (isMustDo) {
      // Priority cannot be downgraded
      if (propItem.priority !== 'must_do') {
        deltaConflicts.push({
          code: 'MUST_DO_DOWNGRADED',
          itemId: id,
          dayNumber: propDayNumber,
          origin: 'proposed',
          message: `Must-do activity "${baseItem.placeName || id}" priority cannot be downgraded to "${propItem.priority ?? 'none'}"`,
          details: { baselinePriority: 'must_do', proposedPriority: propItem.priority },
        });
      }
    }
  }

  return deltaConflicts;
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Pure deterministic constraint engine evaluation.
 *
 * @param proposed The candidate/proposed itinerary to evaluate.
 * @param baseline Optional original baseline itinerary. When provided, evaluates
 *                 baseline validity first (fails closed if invalid), then evaluates
 *                 plan modifications (retention, day/time/position immutability, downgrade prevention).
 * @returns ConstraintEvaluationResult with deterministic canonical ordering.
 */
export function evaluatePlanConstraints(
  proposed: ItineraryInput,
  baseline?: ItineraryInput
): ConstraintEvaluationResult {
  const itemStartTimeMap = new Map<string, string | undefined>();

  // 1. Normalize and evaluate proposed plan internal consistency
  const normProposed = normalizeItineraryInput(proposed, 'proposed');
  const proposedAnalysis = evaluateIntraSchedule(normProposed, itemStartTimeMap, 'proposed');

  const allConflicts: ConstraintConflict[] = [...proposedAnalysis.conflicts];

  // 2. If baseline provided, evaluate baseline validity first (DEFECT C)
  if (baseline !== undefined) {
    const normBaseline = normalizeItineraryInput(baseline, 'baseline');
    const baselineAnalysis = evaluateIntraSchedule(normBaseline, itemStartTimeMap, 'baseline');

    // DEFECT C: Baseline must fail closed!
    // If baseline has ANY conflicts (malformed input, invalid range, duplicate ID, fixed overlap, etc.),
    // return immediately with isValid = false and baseline conflicts. Do NOT run delta checks on corrupt baseline.
    if (baselineAnalysis.conflicts.length > 0) {
      allConflicts.push(...baselineAnalysis.conflicts);
      const sortedConflicts = sortConflictsDeterministically(allConflicts, itemStartTimeMap);

      return {
        isValid: false,
        conflicts: sortedConflicts,
        summary: {
          totalItems: proposedAnalysis.flattenedItems.size,
          fixedItems: proposedAnalysis.fixedCount,
          mustDoItems: proposedAnalysis.mustDoCount,
          conflictsCount: sortedConflicts.length,
        },
      };
    }

    // Baseline is completely valid: proceed with delta checks
    const deltaConflicts = evaluatePlanDelta(
      baselineAnalysis.flattenedItems,
      proposedAnalysis.flattenedItems
    );
    allConflicts.push(...deltaConflicts);
  }

  // 3. Deterministic canonical sorting
  const sortedConflicts = sortConflictsDeterministically(allConflicts, itemStartTimeMap);

  return {
    isValid: sortedConflicts.length === 0,
    conflicts: sortedConflicts,
    summary: {
      totalItems: proposedAnalysis.flattenedItems.size,
      fixedItems: proposedAnalysis.fixedCount,
      mustDoItems: proposedAnalysis.mustDoCount,
      conflictsCount: sortedConflicts.length,
    },
  };
}

/**
 * Convenience alias to evaluate a proposed modification against a baseline plan.
 */
export function evaluatePlanModification(
  baseline: ItineraryInput,
  proposed: ItineraryInput
): ConstraintEvaluationResult {
  return evaluatePlanConstraints(proposed, baseline);
}
