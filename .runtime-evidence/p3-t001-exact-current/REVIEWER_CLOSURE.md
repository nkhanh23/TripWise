# FEATURE-P3-T001 — Corrective closure

**Result: PASS — persistence/repository foundation only.** Exact-current local gates completed on 2026-09-07, followed by linked Supabase DEV migration apply and read-only alignment verification. Expo Doctor remains the explicitly accepted 20/21 baseline. No expense UI or later P3 task was implemented.

## Corrected authoritative contracts

1. `create_trip_expense(jsonb)` accepts only `tripId`, `category`, `origin`, `amount`, `currency`, `note`, `spentAt`, `itineraryItemId`. JSON key subtraction rejects every unsupported key with `22023`, including unknown/provider/server/owner-looking fields.
2. `update_trip_expense(jsonb)` accepts only `expenseId`, `tripId`, `patch`. Patch must be a non-empty object and accepts only `category`, `origin`, `amount`, `currency`, `note`, `spentAt`, `itineraryItemId`. Empty, scalar, array, null, mixed-unknown and unknown-only patches are rejected before UPDATE. Regression assertions compare persisted amount/note/updated_at in a separate transaction after creation, so a silent UPDATE would be detectable.
3. Explicit JSON null note still clears. Non-null whitespace-only notes are rejected, including tabs/newlines and ECMAScript trim Unicode whitespace; blanks are not converted to null.
4. UPDATE parses/requires `tripId`, looks up expense ID + supplied trip ID + `auth.uid()` owner, and locks the expense row for the read/patch/write operation. Wrong same-owner trip returns `P0002`, like a missing/inaccessible expense. The repository maps this error locally to safe `notFound`, without changing shared P1/P2 error handling.
5. DELETE now takes `p_trip_id uuid, p_expense_id uuid`; its predicate binds both IDs plus owner. Wrong/missing/inaccessible target returns false. The old `delete_trip_expense(uuid)` function is dropped, with no authenticated bypass overload left. Null IDs receive `22023`; PostgreSQL validates UUID parameter syntax.
6. Authenticated table-level INSERT/UPDATE grants are replaced with column grants for business fields. INSERT cannot supply `id`, `created_at`, `updated_at`; UPDATE cannot supply those fields or `trip_id`. Defaults generate identity/creation time and the existing trigger sets update time. A defensive invoker trigger additionally rejects changes to identity/trip/created_at. SELECT/DELETE owner RLS and all four SECURITY INVOKER RPCs remain effective; no authority elevation or RLS weakening.
7. Existing table, numeric(12,2), positive bounds, uppercase currency, nine categories, three origins, attachment validation, note/time bounds, UUID identity, indexes, `(created_at DESC, id DESC)` pagination, 1..50 limits and filters remain intact. No FX, Gemini, provider metadata, aggregation or budget-risk implementation.

## Exact source/document changes

| File | Change |
|---|---|
| `supabase/migrations/20260907020000_expense_ledger_contract_corrective.sql` | One new forward migration; strict RPCs, trip-scoped delete signature, column grants and defensive audit immutability |
| `supabase/tests/persistence/expense_ledger_contract.sql` | Corrective SQL regressions; update old calls to scoped signatures; strengthen cross-user tests with a real expense ID |
| `supabase/tests/persistence/upgrade_verify.sql` | Verify corrected two-UUID delete RPC privilege/invoker contract |
| `supabase/tests/persistence/run.ps1` | Run the same full expense regression SQL on upgrade DB as well as fresh DB |
| `mobile/src/integration/remote/supabaseTripExpenseRepository.ts` | Send delete trip ID; map update P0002 safely within expense repository |
| `mobile/src/lib/supabase/database.types.ts` | Correct delete RPC argument type |
| `mobile/tests/expense-ledger-contract.test.ts` | Eleven additional validator/transport/error regressions and corrected delete argument assertion |
| `phase_doc/PHASES_FEATURES.md` | Reconcile both T001 checklist occurrences only after gates/DEV verification; refresh T001 evidence |

Evidence files are under this directory. `changed-files.json` inventories source changes and evidence artifacts; `source-hashes-before.json` and `source-hashes-after.json` contain SHA256 comparisons. The original migration `20260907010000_expense_ledger_foundation.sql` is unchanged, SHA256 `5933F8376DF12904D01F847223BE416BA8959A13AC8B3A981779B8D5316697BD`. `source-integrity.txt` confirms every pre-existing captured file remains present and only seven scoped pre-existing files changed. The new corrective migration is captured separately in the after manifest. Production source tested by mobile gates was unchanged afterwards; subsequent changes were evidence/roadmap only.

## Regressions and exact-current gates

| Gate | Result | Raw output / exit |
|---|---|---|
| `npm run lint` from mobile | PASS, 0 errors / 12 warnings | `lint-raw.log`, `lint-exit.txt`: 0 |
| `npm run typecheck` from mobile | PASS | `typecheck-raw.log`, `typecheck-exit.txt`: 0 |
| `npm test -- --runInBand expense-ledger-contract.test.ts` | 1 suite, **35 passed / 35 total** | `focused-jest-raw.log`, `focused-jest-exit.txt`: 0 |
| `npm test -- --runInBand` | **66 suites passed, 1 skipped; 516 tests passed, 1 skipped / 517 total** | `full-jest-raw.log`, `full-jest-exit.txt`: 0 |
| `npx expo-doctor` | **20/21**, accepted five-package Expo patch mismatch baseline | `expo-doctor-raw.log`, `expo-doctor-exit.txt`: 1 |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1` | PASS fresh + upgrade; all pre-existing persistence/concurrency gates also complete | `persistence-raw.log`, `persistence-exit.txt`: 0 |

Persistence output contains `expense_ledger_contract_pass` twice (fresh/upgrade), `expense_strict_keys_trip_binding_audit_pagination_pass` twice, `upgrade_compatibility_pass`, and `PERSISTENCE_TESTS_PASS`. Docker readiness retains pg_isready + PID 1 postgres verification.

New SQL coverage includes arbitrary/provider/owner/audit create fields; unknown top-level and mixed/unknown-only update patch fields; non-object/empty patches; missing/null/invalid trip context; no updated_at or data change on invalid input; same-owner wrong-trip update/delete; correct-context update/null clearing/delete; direct authenticated INSERT and UPDATE forgery attempts for each audit/identity field; allowed direct CRUD with generated audit times; complete pagination traversal without duplicates/omissions after audit protection; removal of legacy delete; and invoker authority checks. Owner, cross-user, anonymous and missing-JWT tests remain PASS. Cross-user update/direct write/delete tests now use real persisted owner data. Existing category/origin filters, limits, attachment and immutability tests remain active.

Two unsuccessful attempts are retained transparently: `persistence-attempt1-raw.log` / exit 1 caught a test assertion combining a mutating function and an EXISTS check in one SQL expression; splitting mutation and subsequent read resolved the assertion, and the full harness was rerun successfully. `expo-doctor-sandbox-raw.log` / exit 1 records npm EACCES; the authorized network-enabled rerun above completed all checks. These are not the final gate evidence.

## Linked DEV

- `remote-migration-list-before-raw.log`: foundation `20260907010000` already aligned; corrective pending.
- `remote-dry-run-raw.log`: only `20260907020000_expense_ledger_contract_corrective.sql` pending, no seeds/roles.
- `remote-apply-raw.log`: applied that one migration after local persistence PASS; exit 0.
- `remote-migration-list-raw.log`: read-only verification confirms **20260907010000 and 20260907020000 both local = remote**; exit 0.
- Command sequence: `npx supabase migration list --linked`, `npx supabase db push --linked --dry-run`, `npx supabase db push --linked --yes`, `npx supabase migration list --linked`. No production deployment.

## Scope, roadmap and limitations

- `[x] FEATURE-P3-T001`, `[x] FEATURE-P3-T001-S001`, `[x] RLS theo owner, category/origin validation và pagination PASS.` Both T001 occurrences are reconciled.
- `[ ] FEATURE-P3`, `[ ] FEATURE-P3-T002`, `[ ] FEATURE-P3-T003`, `[ ] FEATURE-P3-T004`, `[ ] FEATURE-P3-T005` remain unchecked. **T002 not started.** No FX or Budget Risk.
- Android: **NOT RUN — deferred to FEATURE-P3-T005**. No runtime/UI completion claim.
- P1/P2 accepted production behavior untouched; shared harness only adds an expense-suite invocation for upgrade. Existing P1/P2 regressions PASS.
- `CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`; source unchanged.
- This assistant executed **no Git commit/push/reset/restore/checkout/clean/stash/discard**. During execution, read-only Git inspection observed HEAD at `5c443a2` (`Harden expense ledger contract boundaries`), although this assistant issued no commit command. This external Git change was preserved and not reversed. Hash comparison, rather than HEAD diff alone, establishes the scoped changes.
- Scale: bounded keyset pages and existing trip/category/origin indexes retained; single-row update lock; no additional N+1 path, external API cost, full-table scan or aggregation added. This is contract evidence, not a high-traffic load benchmark.

**STOP at FEATURE-P3-T001 corrective closure. No next implementation task started.**
