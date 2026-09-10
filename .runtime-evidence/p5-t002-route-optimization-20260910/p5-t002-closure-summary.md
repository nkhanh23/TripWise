# FEATURE-P5-T002 Closure Summary: Bounded Route-Aware Clustering & Optimization

## 1. Overview & Scope
- **Task**: `FEATURE-P5-T002 — Gom cụm/tối ưu route-aware`
- **Subtask**: `FEATURE-P5-T002-S001 — Dùng OSRM metrics đã validate cho clustering/optimization bounded`
- **Checklist Target**: `Batching/cache/fallback route PASS`
- **Scope Limit**: Exclusively route-aware ordering and clustering using validated OSRM facts. No weather rules (T003), no Gemini factual truth, no automatic DB writes.

---

## 2. Architecture & Design Principles

### A. Authoritative Safety Gate (P5-T001 Integration)
- Every input snapshot is evaluated at Step 0 via `evaluatePlanConstraints(input)`. Malformed baseline inputs fail closed with `status: 'invalid_input'` and 0 provider calls.
- Every candidate reordered itinerary produced by the optimizer is strictly validated through `evaluatePlanConstraints(proposedPlan, baselinePlan)`.
- If the proposal violates any constraint (e.g., attempt to move a `FIXED` anchor or drop a `MUST_DO` item), the optimizer rejects the proposal and returns `status: 'constraint_conflict'`, preserving the baseline order.

### B. OSRM Fact Boundary & Batching
- **OSRM Table API (`/table/v1/driving/{coords}?annotations=duration,distance`)**:
  - Implemented on `OsrmRouteRepository.getTable(request: RouteTableRequest)`.
  - For $M$ routable stops on a day ($M \le 25$), exactly **1 single HTTP request** fetches the full $M \times M$ duration (seconds) and distance (meters) matrix.
  - Production `getTable` strictly validates `{ requireDistances: true }`, rejecting payloads missing distances with `ContractValidationError`.
  - Replaces $N^2$ independent pair calls, preventing fan-out amplification.
- **Strict Distance & Null Semantics**:
  - Null duration cells are treated as unreachable paths; sequences containing unreachable legs fail closed to `unroutable_items`.
  - Partial null distance retains `totalDistance = null` for the sequence without inventing fake 0m distances.
  - Straight-line Haversine heuristic is documented strictly as a local heuristic for preliminary tie-breaking and never returned as an OSRM fact.

### C. In-Memory LRU Route Metric Cache
- `CachedRouteRepository` wraps the route repository with `BoundedLruCache` (capacity 64, TTL 1 hour).
- Canonical profile-isolated keys: `table:driving:<coords>` and `route:driving:<coords>`.
- Deep-cloning on both write and read ensures mutations outside the repository never corrupt cached entries.
- Abort-safe: aborted or failed requests never poison or commit partial entries to the cache.

### D. Anchor & Barrier Partitioning & Bounded Optimization
- **FIXED Anchors & Unroutable Items**: Items with `flexibility: 'fixed'` OR `!item.isRoutable` act as immovable barriers remaining strictly pinned at their 1-based canonical positions.
- **Adjacent-Leg Scoring**: Only adjacent pairs $(i \to i+1)$ where both items are routable contribute to route scores. No route scores are attributed across unroutable items.
- **Flexible Routable Items**: Reordered using:
  1. Greedy Nearest-Neighbor initial tour with stable tie-breaking.
  2. Bounded 2-opt local search with a strict cap of `MAX_2OPT_ITERATIONS = 50`.
- **Deterministic Tie-Breaking**:
  - Lower duration $\to$ lower distance $\to$ smaller item ID (`id_A.localeCompare(id_B)`).
  - Permuted inputs with identical positions yield identical canonical outputs.

### E. Cancellation & Fail-Closed Fallback Semantics
- In-flight Table cancellation returns `status: 'cancelled'`, halts execution of subsequent days, and sets overall `status = 'cancelled'` with highest precedence.
- If OSRM times out, goes offline, returns malformed data, or items lack coordinates, the optimizer returns `status: 'fallback'` with the specific reason and the original sequence preserved.

### F. Zero Silent Persistence
- Optimization is purely computational and in-memory. It returns a structured `RouteOptimizationResult` proposing reordered items without mutating the Supabase database.

---

## 3. Verification Evidence Summary

| Gate / Artifact | Command | Result | Exit Code |
| :--- | :--- | :--- | :--- |
| **Real OSRM Smoke** | `npx tsx scripts/p5-t002-osrm-smoke.ts` | 1 logical call, 1 HTTP attempt, 0 retries, 0 DB writes, 35.4s duration savings, T001 constraint PASS | `0` |
| **Cache Smoke** | `npx tsx scripts/p5-t002-cache-smoke.ts` | Req 1 miss (1 HTTP attempt), Req 2 hit (0 HTTP calls), deep clone verified | `0` |
| **Focused Tests** | `node --max-old-space-size=4096 ./node_modules/jest/bin/jest.js tests/route-optimization.test.ts --runInBand` | 70 / 70 passed (100%) | `0` |
| **Lint** | `npm run lint` | 0 errors, 9 baseline warnings | `0` |
| **Typecheck** | `npm run typecheck` | Clean compilation (0 errors) | `0` |
| **Full Jest Suite** | `npm test -- --runInBand` | 83 suites passed, 1 skipped (1,277 tests passed, 1 skipped) | `0` |
| **Expo Doctor** | `npx expo-doctor` | 20/21 baseline passed (5 patch mismatches, known baseline) | `1` |

---

## 4. Reviewer Corrective Resolutions (Defects A - E)

- **Defect A — Distance Facts & Null/Unreachable Semantics**:
  - Production `OsrmRouteRepository.getTable` enforces `{ requireDistances: true }` in `parseOsrmTable`. Missing distances throw `ContractValidationError`.
  - Sequences with missing distance on a traversed leg preserve `totalDistance = null` (no fake 0m distance).
  - Candidates with unreachable null duration fail closed to `status: 'fallback'`, `fallbackReason: 'unroutable_items'`.
- **Defect B — Unroutable Items Must Not Move**:
  - Any item with `!item.isRoutable` is placed strictly at its canonical index `finalItems[i] = items[i]`.
  - Only adjacent routable legs contribute to route costs.
- **Defect C — Cancellation Must Propagate to Overall Result**:
  - In-flight cancellation sets `day.status = 'cancelled'`, breaks day loop, and sets overall `status = 'cancelled'`.
- **Defect D — Distinct `invalid_input` vs `constraint_conflict`**:
  - Step 0 failure on malformed input returns `status: 'invalid_input'` with `validation: initialValidation` and 0 provider calls.
  - `status: 'constraint_conflict'` is reserved for valid baseline where reordering violates constraints.
- **Defect E — Cache / Call Metadata Truthfulness**:
  - Removed misleading `cached: boolean` property from `RouteMetricSummary`.
  - `providerCallCount` accurately reports logical route metric requests (1 batch Table request per day).

---

## 5. Source Files Changed / Created

1. `mobile/src/integration/contracts.ts` (added `RouteTableRequest`, `OsrmTableTransport`, `RouteMatrix`, updated `RouteOptimizationStatus`)
2. `mobile/src/integration/repositories.ts` (extended `RouteRepository` with optional `getTable`)
3. `mobile/src/integration/validation.ts` (added `validateRouteTableRequest` and `parseOsrmTable` with `requireDistances` option)
4. `mobile/src/integration/mappers.ts` (added `mapOsrmTable`)
5. `mobile/src/integration/reliability.ts` (added `routeMetricProviderPolicy`)
6. `mobile/src/integration/remote/publicProviderRepositories.ts` (implemented `getTable` on `OsrmRouteRepository` with `requireDistances: true`)
7. `mobile/src/integration/routeMetricCache.ts` (created `CachedRouteRepository` with deep cloning and post-receipt timestamp)
8. `mobile/src/integration/routeOptimization.ts` (created bounded optimizer with Step 0 T001 gate, barrier placement for unroutable items, cancellation propagation, and distinct invalid_input)
9. `mobile/src/integration/index.ts` (exported new modules)
10. `mobile/tests/route-optimization.test.ts` (70 comprehensive test scenarios covering all requirements)
11. `mobile/scripts/p5-t002-osrm-smoke.ts` (real OSRM provider smoke script with exact 1-attempt transport tracking)
12. `mobile/scripts/p5-t002-cache-smoke.ts` (cache smoke script verifying hit/miss and deep cloning)
13. `phase_doc/PHASES_FEATURES.md` (marked P5-T002 complete, P5-T003 NOT STARTED)
