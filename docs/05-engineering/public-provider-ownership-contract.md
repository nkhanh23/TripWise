# Public Provider Ownership Contract

## Decision

BE-P7 and BE-P8 preserve ADR-018: routing and weather are direct React Native
client responsibilities. The Supabase backend owns no OSRM proxy, Open-Meteo
proxy, route cache, weather cache, or persistence snapshot in the current
personal-app scope.

This is a backend boundary decision, not permission to start Integration.

## OSRM routing boundary

Provider surface reference: [official OSRM HTTP API documentation](https://project-osrm.org/docs/v5.7.0/api/).

- Fixed provider origin: `https://router.project-osrm.org`.
- Fixed route surface: `GET /route/v1/driving/{longitude,latitude;...}`.
- Two to 25 verified coordinate pairs; latitude/longitude ranges are validated
  before constructing the URL.
- No arbitrary base URL, service, version, profile, or query forwarding.
- Integration must use `AbortController`, an 8-second timeout and at most two
  total attempts. Retry only transport, HTTP 429 or HTTP 5xx failures.
- Validation errors, `NoRoute`, `NoSegment`, and other provider 4xx results are
  not retryable. A fallback must not fabricate road distance/duration; an
  optional straight line must be explicitly presented as unavailable routing.
- No backend cache for MVP. Public-demo capacity has no SLA; repeated
  drag/render events must not call OSRM, and a production self-hosted/paid
  endpoint can be introduced only by a future reviewed decision.

## Open-Meteo weather boundary

Provider surface reference: [official Open-Meteo forecast API documentation](https://open-meteo.com/en/docs).

- Fixed provider origin: `https://api.open-meteo.com`.
- Fixed forecast surface: `GET /v1/forecast` using one WGS84 coordinate pair,
  `timezone=auto`, one to 16 forecast days, and the compact daily variables
  required by TripWise.
- Integration must use `AbortController`, an 8-second timeout and at most two
  total attempts. Retry only transport, HTTP 429 or HTTP 5xx failures.
- Validation/provider 4xx failures are not retryable. Weather is optional
  context; failure must not block reading a saved itinerary.
- No backend persistence/cache for MVP because the API is public, aggregation
  is not required, and no traffic evidence justifies a server hop.

## Verification

`supabase/tests/architecture/public_provider_contract_test.ts` verifies fixed
origins, bounded input, profile/coordinate constraints, timeout/attempt bounds
and transient/non-transient failure classification without making live calls.
