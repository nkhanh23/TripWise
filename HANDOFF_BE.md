# TripWise Backend Final Completion Handoff

**Owner:** Codex — Backend

**Closure date:** 2026-08-20

**Backend status:** COMPLETE (BE-P0 → BE-P11 DONE)
**Post-BE Integration extensions:** IMPLEMENTED (`PHASES_INTEGRATION.md`)
**Integration status:** ACTIVE (`PHASES_INTEGRATION.md`)

Roadmaps:

- Backend: [`PHASES_BE.md`](./PHASES_BE.md)
- Integration boundary: [`PHASES_INTEGRATION.md`](./PHASES_INTEGRATION.md)

## 1. Final backend status

```text
Original backend implementation: COMPLETE
BE-P0 -> BE-P11: DONE
Post-BE extensions: IMPLEMENTED
Local verification: PASS
Remote Supabase verification: PASS
Gemini live provider: PASS
Google Places live provider: PASS
Integration: ACTIVE (INT-P0 to INT-P5 COMPLETE; INT-P6 OPEN/PAUSED; INT-P7 ACTIVE)
```

| Phase | Status | Final capability |
|---|---|---|
| BE-P0 | DONE | Supabase production architecture foundation |
| BE-P1 | DONE | PostgreSQL schema, ownership and RLS |
| BE-P2 | DONE | Supabase Auth and profile lifecycle |
| BE-P3 | DONE | JWT-protected Gemini trip generation |
| BE-P4 | DONE | Atomic, idempotent trip graph persistence |
| BE-P5 | DONE | Trusted Google Places identity and enrichment boundary |
| BE-P6 | DONE | Owner-scoped saved-trip queries and mutations |
| BE-P7 | DONE | OSRM direct-client responsibility contract |
| BE-P8 | DONE | Open-Meteo direct-client responsibility contract |
| BE-P9 | DONE | Security, JWT, secret and RLS audit |
| BE-P10 | DONE | Performance, cost and resilience audit |
| BE-P11 | DONE | Final QA and production-readiness closure |

No backend phase is open. No new backend implementation task is authorized by
this handoff.

## 2. Production architecture

```text
React Native + TypeScript + Expo mobile
    -> Supabase Auth / authenticated JWT
    -> Supabase Edge Functions (Deno / TypeScript)
    -> Supabase PostgreSQL + Row Level Security
    -> server-side providers requiring secrets
       - Gemini
       - Google Places API (New)
```

- `backend/` Spring Boot is legacy/reference source only. Do not add production
  features there.
- React Native + TypeScript + Expo in `mobile/` is the production client.
- Supabase Auth, Edge Functions, PostgreSQL, and RLS are the production backend.
- Integration has not started. Existing backend readiness does not authorize
  mobile wiring or mock replacement.
- OSRM and Open-Meteo do not require server secrets and remain future
  Integration-owned direct-client calls under the contracts below.

## 3. Authentication, ownership, and data model

Active owner-scoped tables:

- `profiles`
- `trips`
- `itinerary_days`
- `itinerary_items`

Ownership is derived from `auth.uid()`. Clients must not supply or override the
trusted owner identity. RLS is enabled on all active tables. Child ownership is
derived through the trip graph.

Canonical graph:

```text
trip
  -> itinerary_days ordered by day_number
     -> itinerary_items ordered by position
```

Place provenance:

- `place_resolved_at IS NULL` means `UNRESOLVED` or legacy-untrusted, even when
  provider-looking fields exist.
- `place_resolved_at IS NOT NULL` is the trusted server-side provenance and
  freshness marker.
- Only the protected server resolver may create or refresh a verified snapshot.

## 4. Active Edge Functions

### `generate-trip`

| Property | Final state |
|---|---|
| Remote status | `ACTIVE` |
| Remote version | `4` |
| JWT gateway | `verify_jwt=true` |
| Provider | Gemini |
| Live provider evidence | PASS |
| Database writes | 0 |

Contract:

- `POST /functions/v1/generate-trip`
- Requires an authenticated Supabase JWT.
- Validates bounded request fields and Gemini structured output.
- Normalizes trusted destination/date/day/item ordering.
- Remains generation-only and performs zero database writes.
- The raw REST parser must continue reading `steps[].content[].text`; the
  `output_text` compatibility shape is not the only supported response shape.
- Stable safe errors include `INVALID_REQUEST`, `UNAUTHORIZED`,
  `AI_UNAVAILABLE`, `AI_TIMEOUT`, `AI_INVALID_RESPONSE`, and `INTERNAL_ERROR`.

### `resolve-place`

| Property | Final state |
|---|---|
| Remote status | `ACTIVE` |
| Remote version | `8` |
| JWT gateway | `verify_jwt=true` |
| Provider | Google Places API (New), Text Search |
| Live provider evidence | PASS |
| Trusted writer | `apply_verified_place_snapshot(...)` |

Contract:

- `POST /functions/v1/resolve-place`
- Request body accepts only `{ "itineraryItemId": "UUID" }`.
- Owner identity is derived from the verified JWT.
- Persisted suggestion/context is loaded server-side.
- Google authentication remains a Supabase server secret. Its value is never
  returned, logged, copied, persisted, or placed in mobile configuration.
- The client cannot submit a Google response, Google Place ID, coordinates,
  address, category, owner ID, or other provider metadata for certification.
- Matching requires exactly one deterministic high-confidence provider
  candidate; it never blindly certifies `results[0]`.
- Stable safe errors include `PLACE_INPUT_INVALID`, `PLACE_NOT_FOUND`,
  `PLACE_AMBIGUOUS`, `PLACE_PROVIDER_AUTH`,
  `PLACE_PROVIDER_RATE_LIMITED`, `PLACE_PROVIDER_UNAVAILABLE`,
  `PLACE_PERSISTENCE_FAILED`, `UNAUTHORIZED`, and `INTERNAL_ERROR`.

## 5. Google Places final live closure

The deployed `resolve-place` function made a real Google Places API (New) call
for the disposable unresolved suggestion `Wat Arun, Bangkok, Thailand`.

| Evidence | Result |
|---|---|
| Initial resolution | `VERIFIED` |
| Provider canonical name | `Chùa Arun` |
| Verified Google Place ID | `ChIJaSv_6gaZ4jARnbiUVn6Z_YY` |
| Verified latitude | `13.7438652` |
| Verified longitude | `100.488444` |
| Address | Present |
| Category | Optional; absent in this response |
| `place_resolved_at` | Present |
| Atomic trusted persistence | PASS |
| Refresh | `VERIFIED_REFRESHED` |
| Refresh failure | Last-known-good snapshot preserved |
| Owner read | PASS |
| Cross-user read/resolve/update | BLOCKED |
| Client provider-field spoofing | BLOCKED |
| Direct provider-column mutation | BLOCKED |
| Provider-looking graph creation | BLOCKED with `TW001` |
| Legacy null-provenance row | Remains `UNRESOLVED`/untrusted |
| Provider errors | Sanitized |
| Disposable user/data cleanup | PASS |

The first live attempt exposed a deterministic matching defect for localized
canonical names and compound destinations. The matcher was corrected to use
provider canonical-name/address evidence plus the primary locality, without
weakening the one-candidate rule. A localized-name regression test was added;
the final resolver suite has 20 passing tests.

No Google credential value is stored in this document or repository evidence.

## 6. Trip persistence contract

Production graph creation uses:

```text
public.create_trip_graph(text, jsonb) -> uuid
```

- Authenticated only; owner comes from `auth.uid()`.
- One atomic database operation creates trip, days, and items.
- Idempotency key is owner-scoped.
- Same key/same payload returns the same trip UUID.
- Same key/different payload returns stable conflict `TW004`.
- Invalid graph input is rejected without partial writes.
- Creation cannot certify provider-owned place metadata.
- Stable persistence errors remain `TW001`–`TW005`.
- Applied migrations must never be rewritten; all database changes remain
  forward-only.

## 7. Saved-trip query and mutation contracts

### Owner-scoped list

```text
public.list_saved_trips(
  p_limit integer default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
) -> jsonb
```

- Owner is derived from `auth.uid()`.
- Keyset order is deterministic: `created_at DESC, id DESC`.
- Page size is bounded from 1 to 50.
- Cursor requires both `createdAt` and `id`.
- Compact DTO returns `{ items, nextCursor }` and omits owner/idempotency
  internals.
- Index `trips_user_created_id_idx (user_id, created_at DESC, id DESC)` is used
  for the owner-list path.

### Detail graph

```text
public.get_saved_trip_detail(p_trip_id uuid) -> jsonb
```

- Returns one compact trip -> days -> items graph.
- Day and item ordering is deterministic.
- Implemented as one SQL statement with aggregate child queries; no application
  N+1 path.
- Cross-owner/missing trip returns `null`.
- Provider fields are emitted only when `place_resolved_at` proves trusted
  provenance.

### Allowed mutations

```text
public.update_itinerary_item_note(p_item_id uuid, p_note text) -> boolean
public.delete_saved_trip(p_trip_id uuid) -> boolean
```

- Note mutation is owner-scoped and limited to the note field.
- Provider-owned snapshot fields cannot be changed through the generic
  mutation.
- Delete is owner-scoped and idempotent: `true` once, then `false`.
- Trip deletion cascades to days and items.
- User A/User B isolation and anonymous rejection are remotely verified.

## 8. Public provider ownership

### OSRM

- Future Integration responsibility: direct call from React Native.
- Fixed route provider/contract; validated coordinates and driving profile.
- Timeout, cancellation, bounded retry, and unavailable-route fallback are
  required at the client data-source boundary.
- Backend owns no OSRM proxy and no route cache in the current architecture.

### Open-Meteo

- Future Integration responsibility: direct call from React Native.
- Fixed forecast provider/contract; validated coordinates and bounded forecast
  days.
- Timeout, cancellation, bounded retry, and optional-weather fallback are
  required at the client data-source boundary.
- Backend owns no Open-Meteo proxy, persistence, or cache.

These are architecture contracts only. They do not start or implement mobile
Integration.

## 9. Final security state

- RLS enabled and remotely verified for all active tables.
- JWT enforcement enabled for both active Edge Functions.
- Anonymous Edge Function requests are rejected.
- User A/User B profile, graph, query, mutation, and resolution isolation: PASS.
- Provider metadata spoofing: BLOCKED.
- Direct authenticated provider-column mutation: BLOCKED.
- Provider-looking graph creation: BLOCKED with `TW001`.
- `apply_verified_place_snapshot(...)` is executable only by `service_role`.
- `tripwise_private` is not exposed by PostgREST.
- Secret scan: PASS.
- No Gemini/Google/service-role server secret reference exists in `mobile/`.
- No raw provider/database error or credential-bearing URL is returned.
- Legacy rows with `place_resolved_at IS NULL` remain untrusted.
- Service role is used in tests only for exact disposable Auth-user lifecycle or
  deliberate legacy-fixture setup; normal behavior assertions use user JWTs.

## 10. Performance, cost, and resilience

- Saved-trip list uses keyset pagination with page size 1–50.
- Owner-list query-plan evidence uses `trips_user_created_id_idx`.
- Detail graph is one SQL statement and has no application N+1 behavior.
- Persistence regression covers the maximum 14-day/84-item graph.
- Idempotent same-payload, conflicting-payload, different-owner, and atomic
  snapshot concurrency are tested.
- Gemini makes one provider call per generation, has a bounded timeout, and no
  automatic retry amplification.
- Google Places resolves one persisted item per request, requests at most five
  candidates, and makes at most two attempts.
- Google retries only transient transport/5xx/timeout failures. It does not
  retry auth errors, 429, malformed input, no-match, or ambiguity.
- Provider calls use cancellation-aware `AbortController` timeouts.
- No Redis is used.
- No unnecessary Gemini or Google response cache is used. Durable verified
  place snapshots prevent read-time provider calls.
- No batch resolver uses unbounded `Promise.all`; the backend has no unbounded
  per-trip provider fan-out.

## 11. Final API/RPC inventory for Integration

| Surface | Auth | Request | Success |
|---|---|---|---|
| `POST /functions/v1/generate-trip` | JWT | bounded generation DTO | `{ data: GeneratedTrip }` |
| `POST /rest/v1/rpc/create_trip_graph` | JWT | idempotency key + graph | trip UUID |
| `POST /rest/v1/rpc/list_saved_trips` | JWT | limit + optional keyset cursor | `{ items, nextCursor }` |
| `POST /rest/v1/rpc/get_saved_trip_detail` | JWT | trip UUID | compact graph or `null` |
| `POST /rest/v1/rpc/update_itinerary_item_note` | JWT | item UUID + bounded note | boolean |
| `POST /rest/v1/rpc/delete_saved_trip` | JWT | trip UUID | boolean |
| `POST /functions/v1/resolve-place` | JWT | itinerary item UUID only | `VERIFIED`/`VERIFIED_REFRESHED` |

Integration must introduce typed transport DTO validation and mapping rather
than exposing raw PostgREST/function objects directly to UI components.

## 12. Final test inventory

### `generate-trip`

```powershell
npx --yes deno check supabase/functions/generate-trip/index.ts
npx --yes deno lint supabase/functions/generate-trip
npx --yes deno test supabase/functions/generate-trip/*_test.ts
```

- Check: PASS
- Lint: PASS
- Tests: 14 PASS, 0 failures
- Live Gemini authenticated generation: PASS
- Zero database writes: PASS

### `resolve-place`

```powershell
npx --yes deno check supabase/functions/resolve-place/index.ts
npx --yes deno lint supabase/functions/resolve-place
npx --yes deno test supabase/functions/resolve-place/*_test.ts
```

- Check: PASS
- Lint: PASS
- Tests: 20 PASS, 0 failures
- Real Google Places API (New): PASS
- Refresh and refresh-failure preservation: PASS

### Public provider architecture contracts

```powershell
npx --yes deno test supabase/tests/architecture/*_test.ts
```

- OSRM/Open-Meteo fixed-origin, validation, timeout/retry/error contracts: PASS

### PostgreSQL persistence and query contracts

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1
```

- Fresh schema: PASS
- Upgrade compatibility: PASS
- Atomic/idempotent persistence: PASS
- Saved trips list/detail/mutations: PASS
- 14-day/84-item boundary: PASS
- Persistence and place-snapshot concurrency: PASS
- Provenance and spoof prevention: PASS
- Query-plan/index checks: PASS

### Remote Supabase smoke

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/remote-smoke.ps1
powershell -ExecutionPolicy Bypass -File supabase/tests/place-resolution/remote-live-smoke.ps1
```

Remote evidence:

- disposable Auth users and profiles: PASS
- authenticated Gemini live generation and zero writes: PASS
- persistence, idempotency, list, detail, note mutation, cascade delete: PASS
- RLS, anonymous/JWT rejection, and User A/User B isolation: PASS
- real Google place resolution and refresh: PASS
- refresh failure keeps last-known-good snapshot: PASS
- provider spoof/direct-column protection: PASS
- exact disposable user/data cleanup: PASS

Do not rerun paid live-provider smokes without a focused verification need.
Never print passwords, JWTs, service-role credentials, or provider secrets.

## 13. Migration inventory and discipline

Local and remote migration histories were verified aligned through
`20260820010000`:

1. `20260819000000_supabase_personal_app_foundation.sql`
2. `20260819010000_auth_profile_foundation.sql`
3. `20260819020000_itinerary_item_resolution_contract.sql`
4. `20260819030000_create_trip_graph_transaction.sql`
5. `20260819040000_harden_create_trip_graph_contract.sql`
6. `20260819050000_add_trip_creation_idempotency.sql`
7. `20260819060000_add_stable_trip_persistence_errors.sql`
8. `20260820000000_harden_place_snapshot_provenance.sql`
9. `20260820010000_saved_trip_query_mutation_contracts.sql`
10. `20260822000000_saved_places_contract.sql` (Post-BE Integration extension)
11. `20260822010000_add_saved_places_update_policy.sql` (Post-BE Integration extension)
12. `20260822020000_profile_stats_and_deletion.sql` (Post-BE Integration extension)

Rules:

- Never rewrite an applied migration.
- Use forward-only corrective migrations.
- Inspect local/remote history before any future database change.
- Run local persistence/upgrade tests before remote push.
- Never reset production or repair history without concrete evidence and user
  authorization.

## 14. Integration handoff boundary

```text
Integration: ACTIVE (authorized on 2026-08-20; INT-P0 to INT-P5 COMPLETE; INT-P6 OPEN/PAUSED; INT-P7 ACTIVE)
Active integration roadmap: PHASES_INTEGRATION.md
Active integration handoff: HANDOFF_INTEGRATION.md
```

## 15. Next action

The original standalone Backend implementation track is COMPLETE. All ongoing integration, wiring, and runtime verification tasks are managed exclusively under the Integration roadmap (`PHASES_INTEGRATION.md` & `HANDOFF_INTEGRATION.md`).

## 16. Post-BE authorized Integration backend extensions

The following backend extensions were authorized and implemented during active Integration phases:

1. **`get-place-photo` Edge Function (ACTIVE v1, `verify_jwt=true`)**:
   - Secure server-side proxy for Google Places API (New) photo URLs (`skipHttpRedirect=true`).
   - Authenticated JWT required. Enforces place ownership via verified trip itinerary items or owned saved places. Zero Google API keys exposed to mobile client.

2. **`public.saved_places` Contract (`20260822000000` & `20260822010000`)**:
   - Table: `saved_places` (`id`, `user_id`, `google_place_id`, `place_name`, `latitude`, `longitude`, `place_address`, `place_category`, `created_at`).
   - Key constraints: Unique `(user_id, google_place_id)` with index `(user_id, created_at desc, id desc)`.
   - Security: Full RLS restricting CRUD exclusively to `auth.uid() = user_id`.
   - RPCs: `list_saved_places`, `save_place`, `unsave_place`.

3. **`get-place-metadata` Edge Function (ACTIVE v1, `verify_jwt=true`)**:
   - Fetches real Google Places API (New) rating and review count metadata for owned places.
   - Enforces ownership and caches responses server-side (24-hour TTL).

4. **Profile Schema Extension & Account Deletion (`20260822020000_profile_stats_and_deletion.sql`)**:
   - Schema: Added `home_country` (`varchar(2) not null default ''`) to `public.profiles`.
   - RPC `public.get_user_trip_stats()`: Fast, index-backed owner trip counting (`select count(*) from public.trips where user_id = auth.uid()`).
   - RPC `public.delete_user_account()` (`SECURITY DEFINER`, `set search_path = ''`): Cascades deletion across `public.trips`, `public.saved_places`, `public.profiles`, and deletes the `auth.users` record.

