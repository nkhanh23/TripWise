# USER_CONFIRMED trip timezone foundation

Approved product semantics: exactly one explicitly owner-confirmed IANA schedule
timezone per trip. This is not provider-verified geographic truth. CITY, COUNTRY,
free-text and legacy destinations use the same contract. No provider, device,
offset, Gemini, weather or first-item fallback exists.

## Storage and mutation

`trips.schedule_timezone`, `timezone_provenance`, `timezone_confirmed_at` are
either all NULL or a supported identifier, `USER_CONFIRMED`, and a finite
server-generated timestamp. No backfill. Creation remains unchanged and cannot
accept timezone metadata. The owner may explicitly confirm an existing trip via
`set_trip_timezone(p_command)` with exactly `{tripId, expectedRevision, timezone}`;
`timezone: null` clears the tuple. Omitting timezone is invalid.

The public invoker wrapper calls a private definer that validates `auth.uid()`,
input bounds, exact catalog membership and ownership, then locks only the trip
row and checks canonical `workspace_revision`. Different timezone/clear uses one
UPDATE and the existing trigger increments revision once. Same value at the
current revision is a no-op preserving timestamp and revision. Even a no-op with
stale revision returns TW009. No second version counter or automatic CAS retry.
Errors use existing TW006/TW007/TW008/TW009/TW010 semantics. Authenticated raw
INSERT/UPDATE cannot manufacture, clear or alter timezone metadata. The guard
uses execution-role identity, never caller-controlled session settings.

## Supported identifiers

Input is at most 100 characters and has a geographic IANA namespace
(Africa/America/Antarctica/Arctic/Asia/Atlantic/Australia/Europe/Indian/Pacific),
with one or two location components. PostgreSQL checks exact membership in
`pg_timezone_names`; mobile independently checks the same syntax and explicit
`Intl.DateTimeFormat` support. Geographic aliases accepted by both runtimes are
retained exactly, never silently renamed. Abbreviations, numeric/fixed offsets,
Etc namespaces, standalone UTC, POSIX expressions and unknown zones are rejected.
This is an intentionally supported subset, not every name accepted by SET TIMEZONE.
No copied timezone database or new dependency. If server/runtime support differs,
mobile rejects that transport rather than substituting a zone.

## Read and lifecycle facts

Canonical saved detail and progress state expose `timezone` containing
`{timezone, provenance, confirmedAt}`. Legacy omitted/null envelopes normalize to
unavailable; present tuples must be complete and valid. Confirmation timestamps
require real calendar dates and explicit offsets. Progress continues to count
explicit lifecycle statuses only: `calendar: available_user_confirmed` plus the
validated tuple, or `unavailable_timezone`. No current date, reminders, arrival,
physical presence or DST conversion is calculated here.

## Destination and revision invalidation

No accepted production saved-trip destination editor exists in the inspected
source. A BEFORE trigger nonetheless clears the tuple atomically if the canonical
destination changes, including future/direct administrative changes. It creates
no edit feature. Ordinary itinerary edits retain the timezone but advance the
same workspace revision. Future scheduling must re-read/reconcile that revision;
never reuse an old scheduling result after a timezone/destination edit.

## Auth, UI and future boundaries

The timezone repository requires the current immutable auth session getter,
checks identity/expiry before and after its single bounded RPC, rejects foreign
trip responses, and suppresses late results after sign-out/session replacement.
Cancellation cannot undo a server commit; callers must re-read, not replay with
a guessed revision. No optimistic local timezone state or cache is introduced.

There is no UI wiring or hidden confirmation. New trips remain unavailable until
a future approved Stitch confirmation state invokes this explicit boundary.
Timezone metadata is not notification consent (T003). T002 owns all five reminder
types including LEAVE_SOON and LATE_RISK; T004 owns notification lifecycle and P7
owns physical-location/geofence context. Future DST scheduling must use named-zone
rules for each calendar date and handle gaps/overlaps explicitly, not fixed offsets.

## Verification

Run the existing persistence harness (fresh, upgrade, broad-default-ACL matrix),
`mobile/tests/trip-timezone.test.ts`, `trip-progress.test.ts`, the timezone process
script, and standard mobile quality gates. Database harness uses disposable local
PostgreSQL with simulated authenticated roles/JWT subject settings; this is not
hosted Supabase JWT gateway or Android notification evidence.
