# FEATURE-P5-T004 — Atomic Refresh Apply Production Closure Report

## 1. Final Status

`LOCAL_VERIFIED — PERSISTENCE & CONCURRENCY GATES PASS; REMOTE PRODUCTION RUNTIME NOT VERIFIED`

Local PostgreSQL/PostGIS container test harness passes 100% on both fresh and upgrade database chains. All unit, integration, and concurrency quality gates pass without regressions. Because deployment to linked/remote Supabase requires explicit user authorization, production runtime apply is classified as `INSUFFICIENT_EVIDENCE — PRODUCTION APPLY RUNTIME NOT VERIFIED` per handoff rules.

## 2. Codex Work Inherited & Preserved

- Preserved the schedule-only narrowed DTO contract (`TripRefreshScheduleMutationItem: itemId, dayId, position`).
- Preserved the single-transaction RPC architecture (`public.apply_trip_refresh(jsonb)`) and rejection of client mutation loops.
- Preserved proposal safety barriers: fixed, timed, transport, accommodation, reservation, completed, skipped, and confirmed reservation items cannot be moved.
- Preserved cryptographic canonical request hashing (`sha256(canonical_jsonb)`).
- Preserved owner-scoped confirmation identity and CAS `expectedRevision` semantics.
- Preserved error mappings TW015–TW021.

## 3. Exact Current Files Changed

- `supabase/migrations/20260911000000_apply_trip_refresh_atomic.sql`
- `supabase/tests/persistence/trip_refresh_apply_contract.sql`
- `supabase/tests/persistence/trip_refresh_apply_concurrency.ps1`
- `supabase/tests/persistence/run.ps1`
- `mobile/src/integration/tripRefresh.ts`
- `mobile/src/integration/errors.ts`
- `mobile/src/integration/reliability.ts`
- `mobile/src/integration/remote/supabaseTripRepositories.ts`
- `mobile/src/lib/supabase/database.types.ts`
- `mobile/tests/trip-refresh.test.ts`

## 4. Root Cause of Persistence Failure Codex Stopped On

1. **Schema Resolution (`search_path`)**: `tripwise_private.apply_trip_refresh` was defined with `set search_path = ''`. In PostgreSQL, `SET CONSTRAINTS itinerary_items_day_position_key DEFERRED;` looks up table constraints within `search_path`. With an empty `search_path`, PostgreSQL could not locate the constraint in schema `public` and raised:
   `NOTICE: refresh_internal_failure=constraint "itinerary_items_day_position_key" does not exist; ERROR: Refresh persistence failed.`
   *Fix*: Changed `set search_path = pg_catalog, public` in `tripwise_private.apply_trip_refresh`, matching established workspace RPC patterns.
2. **Table RLS Privilege for Rollback Verification**: `trip_refresh_apply_contract.sql` asserts mid-apply rollback under `role authenticated`: `select 1 from public.trip_refresh_apply_idempotency ...`. Because `revoke all ... from authenticated` was set without a `SELECT` grant, PostgreSQL raised `permission denied for table trip_refresh_apply_idempotency`.
   *Fix*: Granted `SELECT` to `authenticated` with an RLS policy `using (owner_id = auth.uid())` while strictly keeping `INSERT`, `UPDATE`, and `DELETE` revoked from `authenticated`.

## 5. Lock-Order Audit & Deadlock Elimination

- **Risk Identified**: `trip_refresh_apply_idempotency` previously contained a foreign key `trip_id uuid not null references public.trips(id) on delete cascade`. During insertion into the idempotency table at the start of `apply_trip_refresh`, PostgreSQL acquired a row-level `FOR KEY SHARE` lock on `public.trips` *before* acquiring locks on `itinerary_items` and `itinerary_days`. Concurrent direct workspace writers (such as `update_itinerary_item_note` or `mutate_travel_workspace`) acquire locks on `itinerary_items` first, then acquire `FOR UPDATE` on `public.trips`. This created a lock-order inversion:
  - Writer: `item -> trip`
  - Refresh: `trip (via FK) -> item`
  Resulting in potential deadlock under concurrent load.
- **Remediation**: Removed the unnecessary foreign key constraint `references public.trips(id)` from `trip_refresh_apply_idempotency` while preserving `trip_id uuid not null`. Added an `AFTER DELETE ON public.trips` trigger (`cleanup_trip_refresh_apply_idempotency`) to clean up any idempotency records upon trip deletion without acquiring any reference lock during refresh inserts.
- **Canonical Lock Hierarchy**:
  1. `trip_refresh_apply_idempotency` (PK lock on `(owner_id, confirmation_id)` only; zero trip lock).
  2. `itinerary_items` `FOR UPDATE` (deterministic UUID order).
  3. `itinerary_days` `FOR UPDATE` (deterministic UUID order).
  4. `trips` `FOR UPDATE` (CAS revision comparison).
- **Verification**: Tested with an explicit concurrent race in `trip_refresh_apply_concurrency.ps1` where a direct item writer holds a row lock on an item and sleeps before committing. `apply_trip_refresh` safely waited on the item lock, woke up after commit, detected the revision bump, and returned `TW018` without deadlocking.

## 6. Atomic RPC Final Design

- `public.apply_trip_refresh(jsonb)`: `SECURITY INVOKER`, grants execute to `authenticated`, revokes from `anon` and `public`. Validates and re-raises sanitized exceptions TW015–TW021.
- `tripwise_private.apply_trip_refresh(jsonb)`: `SECURITY DEFINER`, `search_path = pg_catalog, public`. Implements owner resolution via `auth.uid()`, input validation, canonical JSONB request hashing, CAS revision check, schedule validation, deferred contiguity constraints, and single-transaction execution.

## 7. Schedule-Only Mutation Surface

- Allowed payload fields: `itemId`, `dayId`, `position` (1-based, contiguous).
- All items of the trip must be present; no additions or removals are permitted.
- Fixed, timed, transport, accommodation, reservation, completed, skipped, and confirmed reservation items cannot change position or day.

## 8. Provider & Workspace Invariant Protection

- Provider-owned snapshot fields (`google_place_id`, `latitude`, `longitude`, `place_address`, `place_category`, `place_resolved_at`, `place_name`) are untouched.
- `item_kind` is immutable.
- `activity_status` is immutable.
- `itinerary_item_source_links` are preserved unchanged.

## 9. Durable Idempotency Design

- Idempotency table `public.trip_refresh_apply_idempotency` keyed by `(owner_id, confirmation_id)`.
- Request hash: SHA-256 of canonical JSONB containing `tripId`, `expectedRevision`, `proposalId`, `confirmationId`, and normalized `items` (sorted by `itemId`).
- Retries with identical payload return the stored `{ revision, noOp }` response without performing any graph writes or revision advances.
- Retries with different payloads return `TW019` ('Refresh confirmation identity conflicts.').

## 10. Mobile Production Adapter & Retry Policy

- `SupabaseAtomicTripRefreshApplyRepository` implements `AtomicTripRefreshApplyRepository`.
- Maps TypeScript `reviewedMutation.items` to exact server `p_command.items`.
- Uses dedicated `tripRefreshApplyPolicy` (`timeoutMs: 15_000, maximumAttempts: 2, retryDelayMs: 100, retryTimeout: true`):
  - Ambiguous transport failures (network disconnect / timeout) safely retry once using the exact same idempotency identity and payload.
  - Revision conflict (TW018), invalid request (TW016/TW020), and idempotency conflict (TW019) are non-retryable and fail immediately on attempt 1.
  - No retry amplification.

## 11. Test Results Summary

- **Focused Tests (`tests/trip-refresh.test.ts`)**: 66 passed, 0 failed (Exit 0).
- **Full Mobile Jest Suite**: 85 passed, 1 skipped, 1438 passed tests (Exit 0).
- **Typecheck (`tsc --noEmit`)**: Passed, 0 errors (Exit 0).
- **Lint (`expo lint`)**: 0 errors, 9 baseline warnings (Exit 0).
- **Expo Doctor**: 20/21 passed, 1 failed (5 known SDK patch version mismatches). Classification: `20/21 BASELINE — EXIT 1 — NO P5-T004 REGRESSION`.
- **PostgreSQL Persistence Test Suite (`run.ps1`)**:
  - Fresh migration chain: All 23 migrations applied successfully.
  - Fresh database contracts: Saved trip, workspace mutation, workspace move, security matrix, ordering contiguity, expense ledger, aggregate, trip FX, and trip refresh apply contract all PASS.
  - Fresh database concurrency: create race, move race, lock order, source link lock order, graph creation race, verified place snapshot race, source link cap race, direct writer race, and trip refresh concurrency race all PASS.
  - Upgrade database chain: All migrations from baseline applied successfully; contracts verified; trip refresh apply contract PASS.
  - Overall persistence result: `PERSISTENCE_TESTS_PASS` (Exit 0).

## 12. Roadmap State

- `[x] FEATURE-P5-T001`
- `[x] FEATURE-P5-T002`
- `[x] FEATURE-P5-T003`
- `[ ] FEATURE-P5-T004`
- `[ ] FEATURE-P5-T004-S001`
- `[ ] Idempotency, conflict và không silent mutation PASS`
- `[ ] FEATURE-P5`
- `[ ] FEATURE-P5-T005`

`FEATURE-P5-T005 NOT STARTED`
