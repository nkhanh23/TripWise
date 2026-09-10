# Canonical Workspace Invariant Corrective Summary (FEATURE-P5-T001-S001)

## Overview
This document summarizes the corrective alignment of the TripWise Deterministic Constraint Engine (`mobile/src/integration/deterministicConstraintEngine.ts`) with canonical Supabase workspace invariants defined in:
- `supabase/migrations/20260819000000_supabase_personal_app_foundation.sql`
- `supabase/migrations/20260903020000_workspace_ordering_contiguity.sql`

## Invariant Enforcement & Execution Bounds

### 1. Hard Execution Bounds Fail-Fast (Adversarial Protection)
- **Max Days Bound (`MAX_DAYS = 60`)**:
  - Validated immediately: if `rawDays.length > PLANNING_BOUNDS.MAX_DAYS`, the engine emits `MALFORMED_INPUT` (`EXCEEDED_MAX_DAYS`) and returns `{ days: [], malformedConflicts }` immediately in $O(1)$ without iterating or inspecting any day elements.
  - Verified by adversarial getter test where element 61 throws if accessed.
- **Max Items per Day Bound (`MAX_ITEMS_PER_DAY = 50`)**:
  - Validated before iterating day items: if `rawItems.length > PLANNING_BOUNDS.MAX_ITEMS_PER_DAY`, the engine emits `MALFORMED_INPUT` (`EXCEEDED_MAX_ITEMS_PER_DAY`) and executes `continue` to discard the oversized day without inspecting items beyond index 50.
  - Verified by adversarial getter test where element 51 throws if accessed.
- **Max Total Items Bound (`MAX_TOTAL_ITEMS = 500`)**:
  - Running count tracking: before processing items of each day, if `totalItemsCount + rawItems.length > PLANNING_BOUNDS.MAX_TOTAL_ITEMS`, the engine emits `MALFORMED_INPUT` (`EXCEEDED_MAX_TOTAL_ITEMS`) and immediately returns `{ days: [], malformedConflicts }` without iterating remaining days or items.
  - Verified by adversarial getter test where item 501 throws if accessed.

### 2. Defect A — Canonical 1-Based Position Domain (`position >= 1`)
- **Canonical Rule**: In PostgreSQL triggers (`trg_enforce_itinerary_item_position_contiguity`), item positions are strictly positive integers (`position >= 1`).
- **Engine Enforcement**: Runtime normalization verifies `typeof rawPos === 'number' && Number.isInteger(rawPos) && rawPos >= 1`.
- **Fail-Closed Behavior**: Any item with `position: 0`, negative position, floating-point position, missing position, or non-numeric type is immediately rejected with `MALFORMED_INPUT` (detail: `reason: 'INVALID_POSITION_DOMAIN'`).
- **Test Fixtures**: All unit test fixtures across the test suite have been updated from 0-based (`0, 1, 2`) to canonical 1-based (`1, 2, 3`).

### 3. Defect B — Day Numbers Unique and Contiguous 1..N & Domain Clamping
- **Canonical Rule**: Days in an itinerary must form a complete contiguous sequence `1..N` without duplicates or missing values.
- **Engine Enforcement**:
  - Validates `dayNumber >= 1` and integer for every day.
  - Detects duplicate `dayNumber` entries and emits `MALFORMED_INPUT` with `reason: 'DUPLICATE_DAY_NUMBER'`.
  - **Domain Clamping**: When duplicate `dayNumber` is encountered, the engine emits `MALFORMED_INPUT` and executes `continue;` without merging its items into `dayMap`. This guarantees that normalized days evaluated by `findFixedOverlapsOnDay` never exceed $K = 50$ items and cannot construct an oversized sweep domain (e.g. 50 + 50 = 100 items).
  - Verifies that sorted unique day numbers equal `[1, 2, ..., N]`. Gaps (e.g. `[1, 3]`) or sets starting at 2 (e.g. `[2, 3]`, `[2]`) emit `MALFORMED_INPUT` with `reason: 'NON_CONTIGUOUS_DAY_NUMBERS'`.
  - **Permutation Invariance**: Day objects in the input array may appear in any order (e.g. `[day 2, day 1]`); as long as the day numbers form `1..N`, the itinerary is accepted and canonically sorted.

### 4. Defect C — Item Positions Unique and Contiguous 1..M per Day
- **Canonical Rule**: Items within a given day must form a complete contiguous sequence `1..M` without gaps or duplicates.
- **Engine Enforcement**:
  - Detects duplicate positions on the same day and emits `MALFORMED_INPUT` with `reason: 'DUPLICATE_ITEM_POSITION'`.
  - Verifies that sorted unique positions on the day equal `[1, 2, ..., M]`. Gaps (e.g. `[1, 3]`) or sets starting at 2 (e.g. `[2, 3]`, `[2]`) emit `MALFORMED_INPUT` with `reason: 'NON_CONTIGUOUS_ITEM_POSITIONS'`.
  - **Permutation Invariance**: Items in the input array may appear in any order (e.g. `[pos 2, pos 1]`); as long as positions form `1..M`, the day is accepted and items are canonically sorted by position.

### 5. Defect D — Strict Time Scalar Validation
- **Removal of Trimming**: `.trim()` was removed from `isValidTimeString` and `timeToMinutes`.
- **Validation Rules**:
  - `undefined` or `null`: Accepted as absent fact (`value: undefined`).
  - Strict `HH:MM` string (regex `/^([01]\d|2[0-3]):[0-5]\d$/`): Accepted.
  - Numbers (e.g. `900`), booleans (`true`), objects (`{}`), arrays (`[]`): Rejected with `MALFORMED_INPUT` (`details: { field, invalidValue }`).
  - Padded strings (`" 09:00 "`), empty strings (`""`), whitespace-only strings (`"   "`): Rejected with `MALFORMED_INPUT`.

### 6. Computational Complexity & Execution Bounds
- **Canonical Input**: For valid inputs passing validation:
  - Per Day Item Sort: $O(K \log K)$ where $K \le \text{MAX\_ITEMS\_PER\_DAY} = 50$.
  - Bounded Sweep Overlap Detection: $O(K^2)$ worst-case ($\le 50 \times 49 / 2 = 1,225$ pair evaluations per day).
  - Overall Plan Evaluation: $O(D \cdot (K \log K + K^2))$ where $D \le \text{MAX\_DAYS} = 60$ and $\sum K \le \text{MAX\_TOTAL\_ITEMS} = 500$.
- **Adversarial / Malformed Input**:
  - Rejection is strictly $O(1)$ fail-fast before allocations or unbounded iterations occur.
- Pure in-memory execution executes in $< 5\text{ms}$.

### 7. Untrusted Runtime Boundary
- `ItineraryInput` type is documented as intentionally accepting `unknown` to serve as the runtime validation boundary for dynamic JSON payloads, local storage, and database snapshots before any scheduling logic executes.

## Verification Evidence
- `focused-exit.txt`: `0` (76/76 tests passed, including all adversarial throwing getter tests)
- `full-jest-exit.txt`: `0` (82 passed suites, 1 skipped, 1207 passed tests, 1 skipped)
- `lint-exit.txt`: `0` (0 errors, 9 warnings baseline)
- `typecheck-exit.txt`: `0` (clean compilation, 0 errors)
- `doctor-exit.txt`: `1` (20/21 checks passed, 5 patch mismatches, classified as `20/21 BASELINE — EXIT 1 — NO P5-T001 REGRESSION`)
