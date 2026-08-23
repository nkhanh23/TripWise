# Backend Security, Performance, Cost, and Resilience Audit

Date: 2026-08-20  
Scope: active Supabase backend only (`public` database API, Edge Functions, and
server-side providers). Java/Spring and React Native are outside this audit.

## RLS and operation matrix

All ownership is derived from `auth.uid()`. Anonymous access to the four active
tables is revoked. The remote A/B smoke uses two ordinary authenticated users;
the service role is used only to create and remove those disposable Auth users.

| Resource | SELECT | INSERT | UPDATE | DELETE | Cross-user / anonymous result |
| --- | --- | --- | --- | --- | --- |
| `profiles` | Own row | Own ID | Own row/ID | Not granted | Hidden / rejected |
| `trips` | Own rows | `user_id = auth.uid()` | Own rows; owner preserved | Own rows | Hidden / no-op / rejected |
| `itinerary_days` | Parent trip owner | Parent trip owner | Parent trip owner | Parent trip owner | Hidden / no-op / rejected |
| `itinerary_items` | Parent trip owner | Parent trip owner | Parent trip owner plus provider trigger | Parent trip owner | Hidden / no-op / rejected |

RPC matrix:

| RPC | Role | Identity/protection |
| --- | --- | --- |
| `create_trip_graph(text,jsonb)` | `authenticated` | Owner derived from `auth.uid()`; atomic and idempotent |
| `list_saved_trips(integer,timestamptz,uuid)` | `authenticated` | Owner derived from `auth.uid()`; keyset pagination |
| `get_saved_trip_detail(uuid)` | `authenticated` | Owner filter in the query; one graph statement |
| `update_itinerary_item_note(uuid,text)` | `authenticated` | Note-only owner mutation |
| `delete_saved_trip(uuid)` | `authenticated` | Owner-only idempotent delete |
| `apply_verified_place_snapshot(...)` | `service_role` only | Owner ID comes from verified Edge JWT; atomic complete snapshot |
| `tripwise_private.create_trip_graph(...)` | not exposed by PostgREST | Internal stable-error wrapper |

The provider provenance trigger rejects authenticated/anonymous inserts or
updates of Google-owned fields. A row is trusted only when
`place_resolved_at IS NOT NULL`; legacy provider-looking values with a null
marker remain untrusted and are suppressed by the detail DTO.

## Edge Function authentication

| Function | Gateway JWT | Application auth | Body identity |
| --- | --- | --- | --- |
| `generate-trip` | `verify_jwt = true` | Supabase user claims required | No user/owner field accepted |
| `resolve-place` | `verify_jwt = true` | Authenticated subject required | Only `itineraryItemId`; owner and provider data are server-derived |

Remote smoke verifies anonymous and malformed-JWT rejection. The cross-user
resolver test returns `PLACE_NOT_FOUND` before any provider call.

## Secret, environment, and logging audit

- `GEMINI_API_KEY` and `GOOGLE_PLACES_API_KEY` are read only from the Edge
  Function environment. `.env.example` files contain empty/safe placeholders.
- Google authentication is sent in `x-goog-api-key`, never a query string.
- No Edge Function logs authorization headers, provider keys, full provider
  URLs, provider error payloads, or service-role credentials.
- Client responses use stable sanitized errors. Raw Google, Gemini, and
  database error details are not returned.
- Remote secret inventory is checked by name only. `GEMINI_API_KEY` and
  `GOOGLE_PLACES_API_KEY` exist; no secret value was read back or exposed.
- Focused live Google Places verification resolved and refreshed Wat Arun,
  persisted a complete provenance-marked snapshot, passed RLS/spoof checks,
  preserved the last-known-good snapshot after no-match, and cleaned all
  disposable users/data.

## Abuse and provider-cost review

`generate-trip` accepts at most 16 KiB, 14 days, 20 travelers, 10 preferences,
and produces at most six items per day. It makes one Gemini call with a bounded
5–45 second timeout and no retry amplification. `resolve-place` accepts at
most 2 KiB and resolves exactly one persisted owner item per request. Google
Places Text Search requests at most five candidates, has an 8-second default
timeout, and makes at most two attempts; only timeouts, network failures, and
5xx responses retry.

Auth, validation, provider quotas, persistent place snapshots, and deliberate
single-item resolution are the MVP cost guards. There is no evidence yet that
adding a stateful or enterprise rate-limit subsystem is warranted. Residual
risk: a valid stolen/abusive user token can repeat cost-bearing requests.
Production must monitor provider quota/429/error volume; add per-user limits at
the Edge boundary if observed usage or launch policy requires them.

## Query plans and indexes

Representative local `EXPLAIN` evidence covers list, detail, persistence, and
resolution ownership paths.

- Saved-trip keyset list: `trips_user_created_id_idx
  (user_id, created_at DESC, id DESC)` supports owner filtering and stable
  cursor order.
- Detail graph: trip primary key plus
  `itinerary_days_trip_id_idx` and `itinerary_items_itinerary_day_id_idx`
  support the two child aggregations. The RPC is one SQL statement, not N+1.
- Persistence idempotency: unique
  `trips_user_id_idempotency_key_key` supports owner/key lookup and race safety.
- Resolution ownership: itinerary item primary key, day primary key, and trip
  primary key/owner checks bound the lookup to one item.

Small local fixtures may choose sequential/bitmap scans; this is planner-cost
behavior, not evidence of a missing index. No additional index is justified.

## Load, concurrency, and cache decisions

- Persistence tests cover a 14-day/84-item graph, validation bounds, atomic
  writes, idempotent races, conflicting races, and different-owner races.
- Concurrent place snapshot writes serialize at the row and result in one
  complete provider snapshot; mixed/partial fields are rejected by the test.
- Saved-trip pages are limited to 1–50 and use `(created_at,id)` keyset cursors.
- Google response cache: none for MVP. A durable verified snapshot prevents
  repeated reads, and refresh is explicit.
- Gemini response cache: none. Generated plans depend on user input and are not
  reusable trusted place data.
- OSRM/Open-Meteo: direct-client public providers; no backend cache or proxy.
- Redis is intentionally not introduced.

## Resilience consistency

- Gemini: `AbortController`, bounded timeout, no automatic retry, stable safe
  errors, schema validation.
- Google Places: `AbortController`, at most two attempts, transient-only retry,
  no retry for auth, 429, malformed response, no match, or ambiguity.
- OSRM/Open-Meteo contract: fixed allow-listed origins, validated parameters,
  `AbortController`, at most two total attempts, transient-only retry.
- Refresh failure calls no writer and therefore retains the last known verified
  snapshot. Successful refresh atomically replaces the complete snapshot and
  reports `VERIFIED_REFRESHED`.
