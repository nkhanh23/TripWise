# T003 backend provider access checkpoint

Authenticated `POST /functions/v1/discover-events` uses the existing pinned
`@supabase/server@1.4.1` user-JWT convention and `verify_jwt=true`.
The only provider credential is server-side `TICKETMASTER_API_KEY`.
No owner-resource identifiers are accepted: this queries public events by city/date,
not private trips. No database, storage, RPC, persistence or caching calls exist.

## Request and limits

Exactly `city`, `countryCode`, `startDateTime`, `endDateTime`, `limit` are required.
City is 1–100 characters (letters/marks, spaces, period, apostrophe, hyphen),
countryCode is two uppercase letters. UTC timestamps must round-trip exactly,
with seconds and optional three millisecond digits; offsets and invalid calendar
dates fail. Start precedes end, with at most seven days between them. Limit is 1–3.

Actual request bytes <=2048, provider bytes <=262144, Edge response bytes <=16384.
One fixed Ticketmaster Discovery v2 GET per valid, authenticated, non-cancelled
request with configured credentials. Timeout is 8000 ms, covering provider fetch
and body consumption. Zero retries, page 0 only, no fan-out or radius expansion.
Provider uses `size=limit`, `sort=date,asc`, `includeTest=no`, `includeTBA=no`,
`includeTBD=no`. Provider pagination is informational, never followed.
`endDateTime` bounds the event START date, not a fabricated event end.

## Normalization

Candidates preserve Ticketmaster event ID, title, start, optional end and venues
(at most three), review state `REVIEW_REQUIRED`, provider label and provenance.
ID length <=200, title <=300, venue name <=200, timezone <=100. Duplicate event
IDs and excess counts fail closed; event type must be `event`. No Google identity
or verification is assigned to Ticketmaster venues. Coordinates accept provider
decimal strings or finite numbers within latitude +/-90, longitude +/-180.
Missing venue/coordinates/end remain absent. Source URLs, images and address
fields are intentionally outside this minimum checkpoint projection.

UTC datetime is strict and is preserved alongside supplied local fields.
Local-only date/time remains `PROVIDER_LOCAL`; supplied timezone is validated,
missing timezone remains missing, with no device timezone conversion. Date-only
and noSpecificTime/TBA/TBD flags are retained; no clock/duration/end is invented.
Comparable start/end absolute timestamps and local components are checked for
reverse chronology. This checkpoint does not resolve local DST ambiguity or
prove equivalence of a provider's UTC and local representations; later consumers
must not treat local-only data as an absolute instant without an explicit boundary.

`SERVER_RECEIVED / observedAt` is generated after reading the provider body. It
is not Ticketmaster's factual update time. Host clocks may differ; receipt times
from different machines must not be assumed absolutely ordered.

## Failure and security

Sanitized errors: EVENT_INPUT_INVALID, UNAUTHORIZED, EVENT_PROVIDER_CONFIG_MISSING,
EVENT_PROVIDER_AUTH (401/403 upstream), EVENT_PROVIDER_RATE_LIMITED,
EVENT_PROVIDER_UNAVAILABLE, EVENT_PROVIDER_TIMEOUT, EVENT_CANCELLED,
EVENT_PROVIDER_INVALID_RESPONSE and INTERNAL_ERROR. Raw errors are never returned
or logged. Redirects are rejected. Only whitelisted numeric rate-limit headers
are retained. Normalized output containing the actual provider credential fails
closed. An empty response is valid only with zero provider totalElements.

## Provider use and remaining scope

Official docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
Terms: https://developer.ticketmaster.com/support/terms-of-use/

Terms restrict retention to reasonable service periods and require owner-requested
removal within 24 hours; commercial/API-use restrictions still apply. The provider
label does not assert a final branding license or sufficient display attribution.
ATTRIBUTION DISPLAY REQUIREMENT = REQUIRES FINAL T005 REVIEW.
PER-SECOND RATE LIMIT = UNRESOLVED / ACCOUNT-SPECIFIC.

No mobile/UI integration, final cache policy, account-wide rate limiting or final
T003 closure is claimed. This narrow DEV checkpoint is not a millions-of-users
release: bounded requests avoid amplification, but shared provider quota remains
a scaling limit. T003 and its roadmap checklist remain unchecked.

Tests: `deno check supabase/functions/discover-events/index.ts`,
`deno lint supabase/functions/discover-events`,
`deno test supabase/functions/discover-events` (no extra test permissions).
Fixtures occur only in events_test.ts. Tests do not contact Ticketmaster.

FEATURE-P4-T004 NOT STARTED
