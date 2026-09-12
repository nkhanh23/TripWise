# FEATURE-P5-T004 functional remote runtime final closure

## Final status

`NEEDS_FIX`

The linked target, migration history, source hashes, and accepted ACL/security contract passed preflight. The functional remote run then exposed a reproducible production boundary defect before the first refresh RPC call.

## Target and source preflight

- Target: TripWise / `bvblyrzbkyhcreimuumu` / `ap-northeast-1` / `ACTIVE_HEALTHY`.
- Remote migrations present: `20260911000000`, `20260911161103`.
- Final ACL-corrective manifest: all 13 tracked files matched, including all eight implementation-critical files required by this closure.
- Neither deployed migration nor any production TypeScript source was changed.

## Remote security preflight

- `authenticated`: SELECT=true; INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER/MAINTAIN=false.
- RLS enabled; owner SELECT policy present.
- `authenticated` RPC EXECUTE=true; `anon` RPC EXECUTE=false.
- RPC is SECURITY INVOKER.
- The ordinary-session private-schema PostgREST probe was scheduled after the functional assertions and was not reached because the evidence-only stop boundary triggered. The previously accepted ACL corrective remains unchanged; this run does not add a new private-schema proof.

## Disposable fixture and failing step

Two disposable users were provisioned through the established admin test workflow. All authorization-sensitive operations used ordinary authenticated sessions. Each attempt used a two-day, four-item disposable trip with two flexible movable unresolved items and one bound unresolved item. No provider facts were fabricated.

The authoritative baseline reached revision 9 after two expected setup CAS mutations. Both baseline and swapped proposal failed a second `parseSavedTripDetail` call with `Invalid unresolved saved trip item contract.` `TripRefreshCoordinator.open` consequently returned `invalid_input` instead of `ready`.

The parser emits `latitude: null` and `longitude: null` for an `UNRESOLVED` item, while the same unresolved branch rejects those properties when present. T004 reparses repository output, so the production repository-to-coordinator path is not closed for unresolved items.

## Evidence classification

- Proposal zero-write: not accepted as PASS because proposal creation itself failed; zero logical apply calls were instrumented.
- Owner first confirm: not run.
- Baseline/final revision: baseline 9; no refresh final revision.
- Authoritative schedule reread after a successful apply: not run.
- Fresh-client durable duplicate: not run.
- Idempotency-row ownership visibility: not run.
- Stale revision: not run.
- Cross-user isolation: not run.
- Provenance and bound-item post-apply preservation: not run.
- Optional no-op: not run.
- Retry: local controlled transport evidence remains prior evidence; no ambiguous remote retry was manufactured.

Across three bounded diagnostic attempts: 9 authoritative reads, 3 proposal generations, 0 logical `apply_trip_refresh` calls, 0 duplicate calls, 0 effective refresh mutations, 6 fixture setup CAS mutations, 0 stale attempts, and 0 cross-user attempts.

## Cleanup

Cleanup is complete for all three run IDs. The first attempt required exact recovery after admin user deletion returned HTTP 500: the exact disposable trip was deleted first, then the exact metadata-matched user. Later owner-scoped cleanup runs passed directly. Final verification found zero matching disposable users; no unrelated data or migration was removed.

## Roadmap

T004 prose records `NEEDS_FIX`. The following remain unchecked:

- `[ ] FEATURE-P5`
- `[ ] FEATURE-P5-T004`
- `[ ] FEATURE-P5-T004-S001`
- `[ ] Idempotency, conflict và không silent mutation PASS`
- `[ ] FEATURE-P5-T005`

`FEATURE-P5-T005 NOT STARTED`
