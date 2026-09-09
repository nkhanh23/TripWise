# FEATURE-P3-T002 — Reviewer closure

**PASS — deterministic aggregate/repository foundation, 2026-09-07.** T001 accepted contracts preserved. No UI, FX, Budget Risk, provider, payment, splitting or budget replacement. Stop after T002.

## Contract and accounting

Authoritative contract: `docs/05-engineering/expense-aggregate-contract.md`.

`get_trip_expense_aggregate(p_request jsonb)` is SECURITY INVOKER, authenticated owner only. Input whitelist: `tripId`, `groupBy`, optional `limit`, optional `cursor`. `groupBy` is currency/category/day, default limit 20, permitted 1..50. Safe errors: unknown/spoof/invalid input 22023, missing/foreign trip P0002, JWT-less 28000, denied execute 42501, numeric aggregate overflow 22003. No client owner/user ID and no service role. No client cache; stale JWT identity switch regression PASS.

Response `{tripId,groupBy,items,nextCursor}` contains at most 50 aggregate groups. Each group retains currency and separate `planned`, `actual`, `unplanned`; `actualPlusUnplanned = actual + unplanned`; `variance = actualPlusUnplanned - planned`. Positive variance compares recorded spend to recorded plans in one currency, not to trip `estimated_budget`. Absent origin is `0.00`; empty trip has no currency groups. No cross-currency sum or inferred conversion.

Every amount is summed by PostgreSQL numeric and returned as canonical decimal text at scale two. numeric(24,2) bounds are ±9999999999999999999999.99 (subtotals nonnegative); overflow fails closed, without truncation/saturation. Accepted numeric(12,2) row storage/rounding is unchanged. Mobile parses branded decimal strings, rejects malformed/non-finite/number-valued/out-of-bound totals, and uses BigInt minor units only for lossless conversion and consistency validation.

Day association: persisted same-trip attachment → itinerary day UUID/date (date can be null); otherwise UTC calendar date of spent_at; otherwise explicit unassigned. Attached itinerary date wins over conflicting spent_at. An unattached spent date is not silently merged into an itinerary day sharing that date. Category groups use only the nine T001 categories. Sparse absent groups are omitted. Group key ordering is deterministic bytewise COLLATE C, by prefix/UUID/date/category/currency, not a chronological ordering promise for day UUIDs. Separate paginated requests use live statement snapshots; restart on ledger changes rather than merge stale/current pages.

## Exact files changed

Created:

- `supabase/migrations/20260907030000_expense_aggregate.sql`
- `supabase/tests/persistence/expense_aggregate_contract.sql`
- `mobile/src/integration/expenseAggregate.ts`
- `mobile/src/integration/remote/supabaseTripExpenseAggregateRepository.ts`
- `mobile/tests/expense-aggregate-contract.test.ts`
- `docs/05-engineering/expense-aggregate-contract.md`

Modified:

- `mobile/src/lib/supabase/database.types.ts`: public aggregate RPC type only.
- `supabase/tests/persistence/run.ps1`: run T002 suite on fresh and upgrade, preserving prior suites.
- `phase_doc/PHASES_FEATURES.md`: both T002 occurrences/checklists completed only after final gates and DEV verification.

This evidence directory contains raw logs/exits, before/after hashes, migration hash, query-plan excerpt, exactness examples, manifests and this closure. `source-integrity.txt` verifies all captured pre-existing files remain and only the above three pre-existing files changed. Both applied T001 migrations and all T001/P1/P2 production source/tests are hash-identical to the starting snapshot. Package/lockfile and motion source are unchanged.

## Fresh exact-current gates

| Gate / command | Result | Evidence |
|---|---|---|
| mobile: `npm run lint` | PASS, 0 errors / 12 warnings, exit 0 | lint-raw.log / lint-exit.txt |
| mobile: `npm run typecheck` | PASS, exit 0 | typecheck-raw.log / typecheck-exit.txt |
| mobile: `npm test -- --runInBand expense-aggregate-contract.test.ts` | 1 suite PASS; **45/45 tests PASS**, exit 0 | focused-jest-raw.log / focused-jest-exit.txt |
| mobile: `npm test -- --runInBand` | **67 suites PASS, 1 skipped; 561 tests PASS, 1 skipped / 562 total**, exit 0 | full-jest-raw.log / full-jest-exit.txt |
| mobile: `npx expo-doctor` | **20/21**, accepted five Expo package patch mismatches, exit 1 | expo-doctor-raw.log / expo-doctor-exit.txt |
| root: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1` | fresh + upgrade PASS, exit 0 | persistence-raw.log / persistence-exit.txt |

Final persistence includes twice each (fresh/upgrade): `expense_ledger_contract_pass`, `expense_strict_keys_trip_binding_audit_pagination_pass`, `expense_aggregate_contract_pass`, `expense_aggregate_bounded_plan_pass`; plus `upgrade_compatibility_pass`, all existing P1/P2 concurrency markers, and `PERSISTENCE_TESTS_PASS`. Readiness still checks pg_isready and PID 1 postgres.

Accounting fixtures cover planned/actual/unplanned separation within category, category totals, two itinerary days, attachment-date precedence, unassigned/UTC-spent buckets, exact decimals, currency separation, sparse empty result, no duplicate counting, cross-trip attachment rejection, immediate T001 update/delete reflection, above-row-bound sums and representation overflow. Security fixtures cover owner, foreign trip, anonymous, JWT-less, unknown/spoof input, same-session identity switch, direct ledger RLS and invoker status. T001 CRUD/pagination matrix remains unchanged and PASS.

Focused mobile tests cover request bounds/whitelist, empty and multicurrency pages, exact/large decimals, malformed totals, derived-value consistency, group identities, duplicates, response trip binding, RPC shape without owner ID, safe errors, no retry for permanent errors, in-flight/pre-cancelled reads and transient-network retry under existing read policy.

Earlier development evidence retained: `typecheck-attempt1-raw.log` captures a misplaced generated RPC declaration in graphql_public rather than public; corrected before final lint/typecheck/focused/full runs. `persistence-attempt1-raw.log` is a PASS before expanding the volume/EXPLAIN tests; the final harness includes that expansion and PASS. No failing gate is presented as PASS.

## N+1 and query-plan audit

`query-plan-raw.txt` is extracted from final raw persistence output. The test derives the exact installed aggregate SQL from pg_get_functiondef, substitutes request parameters, and runs EXPLAIN (ANALYZE, BUFFERS, COSTS, TIMING OFF) as authenticated with owner RLS. This is not a hand-written approximation or an EXPLAIN of only the outer function call.

- Production: one trip-filtered ledger relation, two optional primary-key joins, grouped numeric sums, one bounded aggregate page. No per-expense/day SQL loop, network calls, list-RPC iteration, or full itinerary graph response.
- Fixture: 3,000 rows, 60 currencies; currency pages verified 50 + 10. Day EXPLAIN fixture uses unassigned rows, while attached-day correctness is separately exercised by accounting tests. This plan does not prove large attached-ledger performance.
- Observed: GroupAggregate produces 60 groups, Limit returns at most 51 internal rows, final JSON at most 50. Planner selects a sequential ledger scan because the target trip contains nearly all this small fixture's ledger; it retains the trip_id filter and RLS. No claim that every plan is index-only.
- Existing expense trip/category/origin indexes remain available; item PK and itinerary-day trip index appear in plan. Memoize has 2,999 hits / 1 miss for the null attachment key. Internal relational join/RLS loops are visible and are not application/network N+1.
- No new index justified by this sample. Exact aggregation scans applicable trip data, so work increases with ledger size and repeats across aggregate pages. No claim of constant work, server cancellation guarantees, or millions-of-users/load-test readiness. No external API cost added.

## DEV and completion boundary

After local persistence PASS, remote dry-run listed only `20260907030000_expense_aggregate.sql`. `npx supabase db push --linked --yes` applied only that migration (exit 0), with no seeds/roles. Read-only `npx supabase migration list --linked` confirms 20260907010000, 20260907020000 and **20260907030000 local = remote**, exit 0. See remote-before/dry-run/apply/migration-list logs and exit files. No production deployment.

Android: **NOT RUN — deferred to FEATURE-P3-T005**. No screen changed.

Roadmap: `[x] FEATURE-P3-T002`, `[x] FEATURE-P3-T002-S001`, `[x] Decimal/accounting, N+1 và contract aggregate PASS.` P3, T003, T004 and T005 remain unchecked. T001 remains accepted. T003 not started; no FX or Budget Risk work. `CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`.

This assistant executed no Git commit/push/reset/restore/checkout/clean/stash/discard. Read-only Git inspection during the task observed external commit `670a85b` (Add expense aggregate RPC type and persistence coverage) and unrelated skill-file worktree entries; those were preserved, not reversed. Before/after content hashes, rather than HEAD diff alone, establish this task's changes.

**STOP: T002 closure complete.**
