# FEATURE-P3-T003 — Corrective review, 2026-09-08

**INSUFFICIENT_EVIDENCE — trusted FX provider rights unresolved**

T003 remains NEEDS_FIX / NOT ACCEPTED. This summary supersedes the approval and inaccurate descriptions in the historical `REVIEWER_CLOSURE.md` and `provider-selection.md`; raw historical evidence is preserved. This is a stop report, not a successful closure.

## Provider decision

RBA is no longer an approved final production source. No replacement met all audited conditions. See `provider-final-decision.md` and `provider-provenance-corrective-audit.md`. Existing unaccepted provider source code is unchanged under the explicit provider STOP instruction. No FX smoke or production enablement occurred.

## LIVE LOCAL wording corrections — VERIFIED FROM SOURCE

- `get_trip_fx_context`: owner-filtered `public.trips`; `originalBudget.amount = t.estimated_budget::text`; both `originalBudget.currency` and `homeCurrency` derive from `btrim(t.currency)`. Not current settings/profile. Wire key is `originalBudget`, not `originalEstimatedBudget`.
- `homeCurrencySource = 'originalBudget'`; `destinationCurrency = null`; `destinationCurrencySource = 'unavailable'`. No destination guess, budget/expense write, or change to SECURITY INVOKER.
- Identity uses rate `'1'`, provider `'identity'`, precision `'identity'`, and both timestamps null. The strict top-level identity result fields remain explicit, preserving the already-fixed spread regression.
- Nonidentity quotes use day precision, reference date at UTC midnight and a separate retrieval timestamp. Canonical conversion remains `destinationAmount = sourceAmount × rate`, exact BigInt arithmetic.
- Current cache is bounded insertion-order FIFO, **not LRU**. A hit does not promote. `fetchedAtMs` is stored but not read. No corrective LRU claim is made.
- Current cache returns any usable classified quote immediately, including stale quotes after one hour. It therefore does not refresh on TTL. Failure cooldown currently returns unavailable; stale fallback after failed refresh is not implemented.
- Classifier rejects reference age >7 days as unavailable. This does not prove the requested expired-cache/refresh regression suite.
- Source currently caps cache at 64 and active transport at 2, coalesces in-flight pairs and detaches cancelled consumers. TTL-refresh coalescing/cancellation remain untested because refresh is not implemented.

## Requested final-report matrix

| # | Item | Exact-current result |
|---|---|---|
| 1 | Final status | INSUFFICIENT_EVIDENCE — trusted FX provider rights unresolved; STOP |
| 2 | Provider retained/changed | RBA approval withdrawn; replacement absent; code unchanged |
| 3 | Underlying source | RBA USD WM/Reuters AUDFIX; most other currencies cross that USD rate with RBA observations |
| 4 | Rights conclusion | Applicable third-party downstream permission not established |
| 5 | Official evidence | Linked in provider-provenance-corrective-audit.md |
| 6 | Changed files | Roadmap + new corrective evidence only; integrity report lists source changes |
| 7 | Cache TTL | NEEDS_FIX; >1h usable cache returns stale without refresh |
| 8 | LRU/FIFO | Existing FIFO; no promotion; corrective change not performed |
| 9 | Refresh-success test | NOT RUN / not added after provider STOP |
| 10 | Refresh-failure stale test | NOT RUN / not added after provider STOP |
| 11 | Cooldown | Existing 60s failure cooldown; required stale fallback/retry-after-cooldown regressions not implemented |
| 12 | Expired cache | Classifier >7d unavailable in source; requested refresh-failure proof NOT RUN |
| 13 | Coalescing after TTL | NOT PROVEN; required TTL refresh absent |
| 14 | Budget/home currency | Exact persisted trip budget/currency path preserved; no writes |
| 15 | Unavailable matrix | Existing source/tests preserved; no fresh regression PASS claimed |
| 16 | Focused Jest | NOT RUN in corrective turn; old totals are historical |
| 17 | Full Jest | NOT RUN in corrective turn; old totals are historical |
| 18 | Lint/typecheck | NOT RUN in corrective turn; no mobile source changes |
| 19 | Expo Doctor | NOT RUN; 20/21 remains user-accepted historical baseline, not freshly verified |
| 20 | Persistence/Docker | NOT RUN after explicit provider STOP; no fresh T001/T002/T003 markers claimed |
| 21 | Provider smoke | NOT RUN because no cleared final provider |
| 22 | Remote DEV | No mutation/deploy; fresh read-only alignment NOT RUN after STOP. User reports migration already applied; old log is not current proof |
| 23 | Android | NOT RUN; T005 not started |
| 24 | Roadmap | P3, both T003 headings, T003-S001, original-budget acceptance, T004 and T005 unchecked |
| 25 | T004/T005 | Not started; no Budget Risk |
| 26 | T001/T002/P2 | No source/test/migration changes in this corrective turn |
| 27 | Motion | CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER |
| 28 | Worktree safety | No commit/push/reset/restore/checkout/clean/stash/discard |

## Evidence and verification scope

`corrective-source-hashes-before.json` / `corrective-source-hashes-after.json` cover tracked and untracked files in mobile/src, mobile/tests, supabase, phase_doc and .agents. `corrective-source-integrity.txt` compares them; the applied T003 migration must remain identical. Separate before/after worktree snapshots preserve the starting dirty inventory. No previous raw test logs or closure files were overwritten.

All implementation gates and the 13 requested cache regressions remain outstanding. The user's explicit conditional STOP took precedence over downstream corrective implementation/gates; no passing historical result is relabelled as current.

## How to resume the same T003

First establish complete provider provenance and commercial derived-display permission, then implement narrowly and run the exact requested mobile gates, authoritative fresh/upgrade persistence markers, cleared-provider coverage smoke and read-only DEV migration verification. Do not edit applied migration `20260907083901_trip_fx_context.sql` merely for client corrections.

## Scalability and remaining risks

Existing two-active-fetch bound and bounded cache are source facts, not a large-traffic validation. Missing TTL refresh prevents data renewal; FIFO is not true LRU. Public provider per-IP limits and timestamp semantics must be evaluated for the eventual implementation. Do not approve production FX while rights and cache defects remain unresolved.

Only next suggested task: obtain exact-dataset provenance and written downstream rights for one full-coverage provider, then resume T003. No T004/T005 or motion work.
