# Functional remote defect

## Classification

`NEEDS_FIX`

The authenticated functional smoke reached the production saved-trip repository and created a bounded two-day disposable trip. After two ordinary owner CAS mutations made the two movable items flexible, the authoritative detail had workspace revision 9. `TripRefreshCoordinator.open` returned `invalid_input` before any call to `apply_trip_refresh`.

Sanitized diagnostic:

```json
{
  "status": "invalid_input",
  "baselineRevision": 9,
  "ownerIdIsUuid": true,
  "sessionIdLength": 20,
  "reparsed": { "baseline": false, "proposed": false },
  "parseErrors": [
    "baseline:Invalid unresolved saved trip item contract.",
    "proposed:Invalid unresolved saved trip item contract."
  ],
  "conflicts": []
}
```

## Reproduction path

1. `SupabaseSavedTripsRepository.getDetail` parses the remote JSON and returns normalized `UNRESOLVED` items.
2. `parseSavedTripItem` returns each such item with `latitude: null` and `longitude: null` (`mobile/src/integration/validation.ts:723`).
3. `createTripRefreshProposal` reparses the already-normalized baseline and proposal (`mobile/src/integration/tripRefresh.ts:425-426`).
4. The unresolved branch rejects `latitude` or `longitude` whenever the property is present, including `null` (`mobile/src/integration/validation.ts:719-721`).
5. The proposal therefore returns `invalid_input` before confirmation.

Expected: an authoritative, already-validated unresolved saved-trip detail can be used as the baseline for a schedule-only refresh proposal.

Actual: the validator output is not accepted by the same validator when T004 reparses it.

Production source was not modified because this run is evidence-only. Owner confirm, fresh-client durable duplicate, stale revision, cross-user isolation, authoritative schedule comparison, provenance comparison, bound-item post-apply comparison, and optional no-op were not run after this defect was confirmed.
