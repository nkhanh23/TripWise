# FEATURE-P5-T004 — Contract-only corrective report

## Final status

`PARTIAL — CONTRACT SOURCE/TEST PASS; PRODUCTION APPLY BLOCKED BY MISSING ATOMIC PRIMITIVE`

The proposal/version/diff/explicit-confirm contract is implemented and verified. Production `TravelWorkspaceRepository` exposes only individual CAS workspace mutations. It cannot atomically apply a reviewed whole-itinerary refresh with durable confirmation idempotency. No client-side mutation sequence, migration, RPC, Edge function, or fake transaction was added. T004, S001, and the checklist remain unchecked.

## Architecture and behavior

- Existing persistence: initial `create_trip_graph` persistence is atomic and uses a stable idempotency key; workspace editing uses one CAS mutation with `expectedRevision`, one authoritative refresh on conflict, and no automatic replay.
- Refresh stages: authoritative baseline -> immutable proposal -> machine diff -> explicit confirm identifiers -> guarded atomic apply port.
- Identity: deterministic proposal and confirmation identities bind owner/session, trip ID, exact baseline revision, reviewed snapshot, diff, and stage outcomes. Creation time is injected and does not affect the content identity.
- Baseline: missing `workspaceRevision` is `invalid_input`; no revision is inferred.
- Diff: ordinal UUID identity only; retained, moved, added, removed, scheduling-time changed, and metadata changed are machine-readable. No name/title/coordinate matching.
- Protection: T001 validates baseline, candidate, and stored proposal again before confirm. FIXED and MUST_DO violations are non-confirmable and produce zero mutation.
- Composition: reviewed T002/T003 snapshots and explicit stage outcomes are accepted. Confirm does not call OSRM or Open-Meteo and does not regenerate a different proposal.
- Confirmation: caller supplies proposal ID, confirmation ID, trip ID, and expected revision only. The arbitrary replacement graph never comes from the confirm command.
- Conflict: one authoritative read checks the revision. Stale/missing revision and repository CAS conflict return `stale_baseline_revision`, call apply zero/one time as applicable, and never replay automatically.
- Idempotency: concurrent duplicates share one in-flight operation; a duplicate after success returns `proposal_already_applied`; an ambiguous retry reuses the same confirmation idempotency identity. Durable exactly-once execution still requires the missing server primitive.
- Cancellation/session: latest-only generation suppresses late results; pre-cancellation makes zero calls; proposals bind owner/session; clearing a session aborts in-flight work and removes its in-memory proposals.
- Bounds: T001 limits itinerary traversal; stage metadata <=8; in-memory proposal records <=32 with deterministic oldest eviction.
- Persistence: proposal open/recompute = 0 writes; controlled first confirm = 1 atomic-port call; duplicate/concurrent effective count = 0 additional calls; stale/invalid/cancelled = 0 calls. No production apply adapter exists.

## Quality gates

- `npm run lint`: exit 0; 0 errors, 9 pre-existing warnings.
- `npm run typecheck`: exit 0.
- `npm test -- --runInBand trip-refresh.test.ts`: 1 suite, 55/55 tests passed, exit 0.
- Focused regressions (T001, T002, T003, integration weather, planner persistence, workspace CAS/move/conflict, stale user): 10 suites, 313/313 tests passed, exit 0. Existing React test `act(...)` console warnings remain non-failing baseline output.
- `npm test -- --runInBand`: 85 passed suites plus 1 skipped; 1427 passed tests plus 1 skipped; exit 0.
- `npx expo-doctor`: `20/21 BASELINE — EXIT 1 — NO P5-T004 REGRESSION`. Five accepted Expo patch-version mismatches remain.

Raw output and exact exit files are stored beside this report.

## Runtime/persistence evidence

Classification: `DETERMINISTIC CONTRACT + CONTROLLED ATOMIC-PORT EVIDENCE ONLY`.

No authenticated production apply smoke was run because no production atomic refresh primitive is present. The controlled adapter proves coordinator call counts and state semantics; it does not prove RLS, durable cross-process idempotency, or atomic database application. No real trip was mutated and no test data cleanup is required.

## Security and ownership

The contract requires owner/session binding, authoritative revision checking, sanitized machine outcomes, and an apply port whose implementation must enforce authenticated owner RLS, CAS, and idempotency in one transaction. No owner ID is sent to the future persistence command and no service-role or secret-bearing path was introduced. Production authorization remains unproven until the atomic adapter exists and is tested against RLS with owned data.

## Roadmap

- `[x] FEATURE-P5-T001`
- `[x] FEATURE-P5-T002`
- `[x] FEATURE-P5-T003`
- `[ ] FEATURE-P5-T004`
- `[ ] FEATURE-P5-T004-S001`
- `[ ] Idempotency, conflict và không silent mutation PASS`
- `[ ] FEATURE-P5`
- `[ ] FEATURE-P5-T005`

`FEATURE-P5-T005 NOT STARTED`

## Remaining limitation

The next required T004 closure input is a reviewed atomic Supabase persistence primitive for exact reviewed proposal application, with owner-scoped RLS, expected-revision CAS, durable idempotency for ambiguous retries, and one-transaction mutation. This report does not authorize or start that schema/RPC work.
