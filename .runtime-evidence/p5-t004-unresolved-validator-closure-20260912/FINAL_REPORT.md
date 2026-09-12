# FEATURE-P5-T004 unresolved validator corrective and remote closure

## Final status

`COMPLETE — FEATURE-P5-T004 REMOTE RUNTIME VERIFIED`

## Corrective

The normalized unresolved parser output was not accepted by the same parser because `null` coordinates counted as present. `mobile/src/integration/validation.ts` now accepts only omitted/undefined or exact null unresolved coordinates and continues to normalize both to null. Every non-null coordinate and every provider-owned verified field remains rejected for unresolved items.

The T004 fixture now constructs a real `UnresolvedSavedTripItem` with explicit null coordinates and no shape-hiding `as SavedTripItem` cast. Whole-detail parser idempotency and repository-output-to-proposal regressions pass.

## Local verification

- Validation focused: 7/7, exit 0.
- T004 focused: 67/67, exit 0.
- T001/T002/T003/repository/workspace/UI/planner regressions: 315/315, exit 0.
- Full Jest: 1439 passed, 2 skipped, exit 0.
- Lint: exit 0, 0 errors, 9 existing warnings.
- Typecheck: exit 0.
- Expo Doctor: 20/21, exit 1; `EXISTING PATCH-MISMATCH CATEGORY; NO DEPENDENCY CHANGE`, with five installed versions recorded in `local-gates.json`.

Both deployed T004 SQL migration hashes exactly match the final ACL-corrective manifest. No SQL or migration was changed and the persistence harness was not rerun solely for this TypeScript validator correction.

## Remote verification

The linked target was independently verified as TripWise `bvblyrzbkyhcreimuumu`, `ap-northeast-1`, `ACTIVE_HEALTHY`. The passing fresh disposable run proved zero-write proposal generation, owner apply, revision 9→11, authoritative schedule equality, one effective mutation, fresh-client durable duplicate without a second revision advance, owner-only idempotency visibility, TW018 stale rejection, TW017 cross-user rejection, provenance and bound-item preservation, durable no-op behavior, private-schema blocking, and cleanup.

The passing result used one first logical apply call and one duplicate server call. It recorded nine authenticated authoritative reads, two proposal generations, one stale attempt, one cross-user attempt, and two durable T004 results before cleanup. No actual remote network failure was manufactured.

## Cleanup and roadmap

Cleanup deleted exactly one disposable trip and two disposable users; zero trips remained. No unrelated data or migrations were touched.

Roadmap state:

- `[ ] FEATURE-P5`
- `[x] FEATURE-P5-T001`
- `[x] FEATURE-P5-T002`
- `[x] FEATURE-P5-T003`
- `[x] FEATURE-P5-T004`
- `[x] FEATURE-P5-T004-S001`
- `[x] Idempotency, conflict và không silent mutation PASS`
- `[ ] FEATURE-P5-T005`

`FEATURE-P5-T005 NOT STARTED`
