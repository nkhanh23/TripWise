# Canonical UNRESOLVED validator corrective

## Root cause

`parseSavedTripItem` normalized an unresolved item to `latitude: null` and `longitude: null`, but its unresolved-input guard rejected those same properties whenever present. `createTripRefreshProposal` reparses authoritative repository output, so the normalized value failed its second parse.

## Corrective

For `resolution === 'UNRESOLVED'`:

- omitted/`undefined` latitude and longitude are accepted;
- exact `null` latitude and longitude are accepted;
- output always contains `latitude: null` and `longitude: null`;
- every non-null supplied coordinate is rejected;
- presence of `googlePlaceId`, `placeAddress`, `placeCategory`, or `placeResolvedAt` remains rejected, including `googlePlaceId: null`.

No T004 parsing bypass, RPC change, migration, RLS, ACL, CAS, retry, or idempotency change was made.

Whole-detail regression proves `parseSavedTripDetail(parseSavedTripDetail(raw))` is equivalent to the first normalized result. A separate T004 regression passes repository-equivalent normalized output through proposal creation and observes `ready` with zero persistence.
