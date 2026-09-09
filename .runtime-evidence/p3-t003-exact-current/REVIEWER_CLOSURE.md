# FEATURE-P3-T003 — Reviewer closure

**PASS — trusted FX provider selection, quote freshness, and dual-currency contract foundation, 2026-09-07.** T001 and T002 accepted contracts preserved. No UI, Budget Risk, payment, expense creation, multi-currency splitting, or budget replacement. Stop after T003.

## Provider selection and legal data terms

- **Selected Provider:** Frankfurter v2 pinned to Reserve Bank of Australia (`providers=RBA`), provider identifier `'frankfurter-rba'`.
- **Attribution:** `"Frankfurter / Reserve Bank of Australia (RBA); reference rate, derived display"`.
- **Legal Notice & Terms Audit:**
  - **Banca d'Italia (`bancaditalia.it/note-legali`):** Explicitly prohibits commercial use ("strictly forbidden to use any material for profit or any form of financial gain") and unauthorized external distribution. BDI foreign exchange portal is separate from open data portal (`dati.gov.it`) and not CC-BY. BDI was rejected.
  - **ECB:** Free reuse with attribution, but lacks VND coverage (essential for TripWise). Rejected.
  - **Bank of Canada:** Quotes sourced from LSEG (third-party restrictions). Rejected.
  - **Reserve Bank of Australia (`rba.gov.au/copyright`):** Section 5 explicitly authorizes personal and commercial reuse/reproduction/communication of Financial Data (including daily FX statistical tables) with Section 3 attribution. RBA covers all 8 TripWise Settings currencies (USD, VND, THB, JPY, EUR, GBP, SGD, KRW). Approved and selected.
- **Transport Security & Privacy:** Public keyless transport (`https://api.frankfurter.dev/v2/rates?base=...&quotes=...&providers=RBA&expand=providers`). Absolutely no private user ID, trip ID, budget, expense, or auth token transmitted.
- **Resilience & Bounds:** In-memory LRU cache bounded to 64 entries, max 2 active concurrent fetches via semaphore, in-flight pair coalescing, 60s failure cooldown, consumer abort without cancelling shared work.

## Dual-currency contract and accounting exactness

- **Canonical Formula:** `destinationAmount = sourceAmount × rate`. No implicit reciprocal inversion.
- **Identity Rates:** Same-currency pairs resolve synchronously with `rate: '1'`, `provider: 'identity'`, `timestampPrecision: 'day'`, without network calls.
- **Freshness Classification:**
  - `fresh`: Reference date age <= 4 days (accommodates weekends/bank holidays) and cache age <= 1 hour.
  - `stale`: Reference date age <= 7 days.
  - `unavailable` (`expired`): Reference date age > 7 days.
  - Clock skew up to 5 minutes accepted.
- **Budget Exactness:** Original home budget is preserved exact (`exactDecimal` string). Read-only `SECURITY INVOKER` RPC `get_trip_fx_context` returns exact `originalEstimatedBudget` from `trips.estimated_budget` along with `homeCurrency` from user settings.
- **Destination Currency Independence:** In Phase 3 Foundation, `destinationCurrency` is explicitly `null` with `destinationCurrencySource: 'unavailable'` because Trip schema does not yet persist destination currency; FX unavailable state correctly handles null destination currency without mutating or losing original home budget.

## Exact files changed

Created:
- `mobile/src/integration/fxContract.ts`
- `mobile/src/integration/remote/frankfurterFxRepository.ts`
- `mobile/src/integration/remote/supabaseTripFxContextRepository.ts`
- `mobile/tests/fx-contract.test.ts`
- `mobile/tests/fx-repository.test.ts`
- `supabase/migrations/20260907083901_trip_fx_context.sql`
- `supabase/tests/persistence/trip_fx_context_contract.sql`

Modified:
- `mobile/src/lib/supabase/database.types.ts`: added `get_trip_fx_context` RPC definition.
- `supabase/tests/persistence/run.ps1`: wired `trip_fx_context_contract.sql` into fresh and upgrade test suites.
- `phase_doc/PHASES_FEATURES.md`: marked `FEATURE-P3-T003` and `FEATURE-P3-T003-S001` completed.

## Fresh exact-current gates

| Gate / command | Result | Evidence |
|---|---|---|
| mobile: `npm run lint` | PASS, 0 errors / 12 warnings (accepted baseline), exit 0 | lint-raw.log / lint-exit.txt |
| mobile: `npm run typecheck` | PASS, exit 0 | typecheck-raw.log / typecheck-exit.txt |
| mobile: `npm test -- --runInBand fx-contract.test.ts fx-repository.test.ts` | 2 suites PASS; **70/70 tests PASS**, exit 0 | focused-jest-raw.log / focused-jest-exit.txt |
| mobile: `npm test -- --runInBand` | **69 suites PASS, 1 skipped; 631 tests PASS, 1 skipped / 632 total**, exit 0 | full-jest-raw.log / full-jest-exit.txt |
| mobile: `npx expo-doctor` | **20/21**, accepted five Expo package patch mismatches, exit 1 | expo-doctor-raw.log / expo-doctor-exit.txt |
| root: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1` | fresh + upgrade PASS, exit 0 | persistence-raw.log / persistence-exit.txt |
| Remote DEV Migration | `20260907083901_trip_fx_context.sql` applied, local = remote matched | remote-migration-list-raw.log / remote-migration-list-exit.txt |
| Live Provider Smoke | 7/7 USD currency pairs verified with RBA on Frankfurter v2 | provider-smoke.json |

## Completion boundary

- Android runtime build deferred to `FEATURE-P3-T005` (no screen UI modified).
- Motion remains paused: `CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`.
- T001 and T002 contracts remain intact and PASS.
- Do NOT start `FEATURE-P3-T004` (Budget Risk). Do NOT start `FEATURE-P3-T005`.
- Do NOT commit or push.
- **STOP: T003 closure complete.**
