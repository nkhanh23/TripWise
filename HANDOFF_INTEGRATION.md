# TripWise React Native FE ↔ BE Integration Handoff

**Owner / Agent:** Codex — Integration (historical/general owner)

**Authorization date:** 2026-08-20 (INT-P7 temporarily authorized on 2026-08-22)

**Status:** ACTIVE

**Completed:** INT-P0 — Integration Readiness & Contract Freeze; INT-P1 — React Native Backend Infrastructure; INT-P2 — Authentication Integration; INT-P3 — Trip Generation Integration; INT-P4 — Persistence Integration; INT-P5 — Places Integration

**Open / Paused:** INT-P6 — Map & Route Integration (substantial runtime evidence PASS on Android; closure intentionally deferred)

**Current active phase:** INT-P7 — Remaining Real Data Integration (Weather, Saved Places, Photos, Ratings implemented; current Stitch artifacts retrieved and audited; Edit Profile Home Country mapping implemented; Android re-verification remains pending)

**Track status:** Backend COMPLETE; Frontend UI track COMPLETE; INT-P0 through INT-P5 COMPLETE; INT-P6 OPEN / PAUSED; INT-P7 ACTIVE.

**Next Operator:** CODEX

Roadmaps:

- Integration: [`PHASES_INTEGRATION.md`](./PHASES_INTEGRATION.md)
- Backend: [`PHASES_BE.md`](./PHASES_BE.md)
- Frontend: [`PHASES_FE.md`](./PHASES_FE.md)

## 1. Authorization and stop boundary

The user explicitly authorized FE ↔ BE Integration on 2026-08-20 while the
separate Frontend session is completing FE Phase 20. INT-P0 audited and froze
contracts only; it did not wire production data into UI.

INT-P1 completed the infrastructure boundaries only:

- safe Supabase/client configuration;
- auth/session infrastructure adapter;
- remote data sources and repository interfaces;
- runtime DTO validation and transport-to-domain mappers;
- stable domain error mapping;
- timeout, bounded retry and lifecycle cancellation.

No mock runtime consumer, screen, navigation behavior, visual hierarchy or
FE-P20-owned UI file was wired or redesigned during INT-P1 only.

## 2. Readiness evidence

### Workspace safety

- `git status --short --branch` was inspected before changes.
- FE-P20 owns the dirty React Native screen/component/test files.
- Backend closure owns the dirty backend roadmap, contract, migration and test
  files.
- INT-P0 changed only `PHASES_INTEGRATION.md` and
  `HANDOFF_INTEGRATION.md`.
- No reset, checkout, clean, commit, secret read or paid provider smoke ran.

### Remote backend evidence (read-only, 2026-08-20)

| Surface | Remote status | Version | JWT gateway |
|---|---:|---:|---:|
| `generate-trip` | ACTIVE | **6** | `verify_jwt=true` |
| `resolve-place` | ACTIVE | **8** | `verify_jwt=true` |

`generate-trip` v6 supersedes the stale v4 value in `HANDOFF_BE.md`.

Remote and local migration history match through all nine migrations, ending
at `20260820010000_saved_trip_query_mutation_contracts.sql`.

## 3. Frozen backend contract inventory

### 3.1 Supabase Auth and session

- Invocation: Supabase JS `signInWithPassword`, `signUp`, `signOut`,
  `getSession`, and `onAuthStateChange`.
- Authentication: email/password for sign-in/up; session JWT authenticates all
  protected RPCs/functions.
- Session response: Supabase `Session` + `User`; access and refresh tokens stay
  inside the auth/session adapter and secure storage.
- Storage: `expo-secure-store` adapter; never plaintext `AsyncStorage`.
- Local auth policy: access-token lifetime 3600 seconds, refresh rotation
  enabled, refresh reuse interval 10 seconds, anonymous sign-in disabled.
- Errors: Supabase `AuthError` is transport-level and must be mapped to domain
  errors before reaching UI.
- Ownership: trusted owner always derives from JWT `auth.uid()`; client owner
  fields are not accepted by persistence/resolution contracts.

### 3.2 Profile read/update

- Invocation: PostgREST `profiles` table through authenticated Supabase client.
- Row DTO: `{ id, display_name, avatar_url, home_country, created_at, updated_at }`.
- Nullability: `display_name`, `avatar_url`, and `home_country` are nullable; IDs/timestamps are
  non-null.
- Create: auth trigger creates the owner profile idempotently.
- Read: own row or `null`; RLS uses `profiles.id = auth.uid()`.
- Update: only own `display_name`/`avatar_url`/`home_country`; user email comes from Auth, not
  `profiles`.
- Errors: PostgREST/Supabase transport errors; no app-specific stable profile
  code exists, so INT-P1 owns safe domain mapping.

### 3.3 `generate-trip`

- Invocation: `POST /functions/v1/generate-trip` or
  `supabase.functions.invoke('generate-trip')`.
- Deployed: ACTIVE v6, `verify_jwt=true`.
- Auth: authenticated Supabase JWT required.
- Request:
  `{ destination, startDate, endDate, travelers?, budget?, currency?, preferences?, notes? }`.
- Bounds: destination 1-120 chars; valid inclusive 1-14 day range; travelers
  integer 1-20; budget 0-1,000,000,000; currency three letters; at most 10
  preferences of 1-60 chars; notes at most 500 chars; body at most 16 KiB;
  unknown fields rejected.
- Success: `{ data: GeneratedTrip }`; trip has title/destination/date range,
  optional summary, exact contiguous days, and 1-6 items/day.
- Generated item: 1-based `position`, `placeName`, optional `placeQuery`,
  `startTime`, `endTime`, `note`, `estimatedCost`.
- Important semantics: generated place data is an unverified suggestion;
  response contains no trip/day/item UUID and no trusted provider metadata.
- Stable errors: `INVALID_REQUEST`, `UNAUTHORIZED`, `AI_UNAVAILABLE`,
  `AI_TIMEOUT`, `AI_INVALID_RESPONSE`, `INTERNAL_ERROR`.
- Persistence: generation performs zero database writes.

### 3.4 `create_trip_graph`

- Invocation: `supabase.rpc('create_trip_graph', {
  p_idempotency_key, p_graph })`.
- SQL contract: `public.create_trip_graph(text, jsonb) -> uuid`.
- Auth: authenticated only; owner derived from `auth.uid()`; SECURITY INVOKER
  and RLS retained.
- Idempotency key: required opaque ASCII key, 8-128 chars, owner-scoped. Same
  key/same canonical payload returns the same UUID; same key/different payload
  returns `TW004`.
- Graph: title 1-160, destination 1-120, valid inclusive 1-14 day range,
  optional budget 0-1,000,000,000, optional uppercase currency; exact one day
  per date; 1-6 items/day; at most 84 items; JSONB at most 256 KiB.
- Ordering: `dayNumber` and item `position` are contiguous and 1-based.
- Item persistence input: `placeName` plus optional `placeQuery`, times and
  note. Integration must omit client-supplied Google ID, coordinates, address
  and category because the authenticated provenance trigger rejects them.
- Success: persisted trip UUID only.
- Stable SQLSTATE errors: `TW001` invalid input, `TW002` unauthenticated,
  `TW003` forbidden, `TW004` idempotency conflict, `TW005` database failure.
- Atomicity: trip/day/item graph and idempotency metadata commit or roll back
  together.

### 3.5 `list_saved_trips`

- Invocation: `supabase.rpc('list_saved_trips', {
  p_limit, p_cursor_created_at, p_cursor_id })`.
- Auth/ownership: JWT required; owner derived from `auth.uid()` and RLS.
- Bounds: limit 1-50, default 20; cursor is either fully null or contains both
  timestamp and UUID.
- Ordering: keyset `createdAt DESC, id DESC`.
- Success: `{ items, nextCursor }`.
- Item DTO: `{ id, title, destination, startDate, endDate,
  estimatedBudget, currency, createdAt, dayCount, itemCount }`.
- Nullability: `estimatedBudget`/`currency` may be null; `nextCursor` is null or
  `{ createdAt, id }`.
- Errors: SQLSTATE `28000` for unauthenticated and `22023` for invalid paging.
  These require INT-P1 domain mapping; no named app code is defined.

### 3.6 `get_saved_trip_detail`

- Invocation: `supabase.rpc('get_saved_trip_detail', { p_trip_id })`.
- Auth/ownership: JWT + owner scope; missing/cross-owner returns `null`.
- Success: compact `{ id, title, destination, startDate, endDate,
  estimatedBudget?, currency?, createdAt, updatedAt, days }` graph.
- Day: `{ id, dayNumber, date?, summary?, items }`, ordered by day number.
- Item: `{ id, position, placeName, placeQuery?, resolution, startTime?,
  endTime?, note? }` plus provider fields only for verified snapshots.
- `resolution`: `UNRESOLVED | VERIFIED`.
- Verified-only fields: `googlePlaceId`, `latitude`, `longitude`, optional
  `placeAddress`, optional `placeCategory`, `placeResolvedAt`.
- Provider fields are omitted, not emitted as trusted null values, when
  `placeResolvedAt` is absent.
- Query shape is one SQL graph query; there is no application N+1 path.

### 3.7 `update_itinerary_item_note`

- Invocation: `supabase.rpc('update_itinerary_item_note', {
  p_item_id, p_note })`.
- Auth/ownership: JWT + owner scope.
- Input: item UUID; note nullable, trimmed, maximum 500 chars; empty becomes
  null.
- Success: boolean; false for missing/cross-owner item.
- Errors: SQLSTATE `28000` unauthenticated, `22023` for null/overlong input;
  malformed UUID transport input is PostgreSQL `22P02`.

### 3.8 `delete_saved_trip`

- Invocation: `supabase.rpc('delete_saved_trip', { p_trip_id })`.
- Auth/ownership: JWT + owner scope.
- Success: boolean; true once, then false for repeated/missing/cross-owner.
- Child days/items cascade.
- Errors: SQLSTATE `28000` unauthenticated, `22023` for a null trip ID;
  malformed UUID transport input is PostgreSQL `22P02`.

### 3.9 `resolve-place`

- Invocation: `POST /functions/v1/resolve-place` or
  `supabase.functions.invoke('resolve-place')`.
- Deployed: ACTIVE v8, `verify_jwt=true`.
- Auth: authenticated JWT; owner derived server-side.
- Request: exactly `{ itineraryItemId: UUID }`; body at most 2 KiB; all client
  provider metadata is rejected by contract.
- Success: `{ data: { itineraryItemId, resolution, resolvedAt } }`, where
  resolution is `VERIFIED | VERIFIED_REFRESHED`.
- Stable errors: `PLACE_INPUT_INVALID`, `PLACE_NOT_FOUND`, `PLACE_AMBIGUOUS`,
  `PLACE_PROVIDER_AUTH`, `PLACE_PROVIDER_RATE_LIMITED`,
  `PLACE_PROVIDER_UNAVAILABLE`, `PLACE_PERSISTENCE_FAILED`, `UNAUTHORIZED`,
  `INTERNAL_ERROR`.
- Trusted snapshot is written atomically by the service-role-only protected RPC.

### 3.10 OSRM direct-client contract

- Ownership: Integration-owned direct React Native data source; no backend
  proxy/cache.
- Request: GET fixed origin
  `https://router.project-osrm.org/route/v1/driving/{lon,lat;...}` with 2-25
  validated coordinate pairs and fixed `driving` profile.
- Query: `alternatives=false&steps=false&geometries=geojson&overview=full`.
- Response DTO frozen for INT-P1 validation: provider `code`; first route with
  finite non-negative `distance` metres, `duration` seconds and GeoJSON
  `LineString.coordinates` in `[longitude, latitude]` order. Missing/invalid
  route maps to unavailable instead of leaking raw payload.
- Reliability: 8-second timeout, cancellation-aware, maximum two attempts;
  only 429/5xx/transient transport failures are retryable.
- Errors: `ROUTE_INPUT_INVALID`, `NO_ROUTE`, retryable/unavailable, and safe
  internal invalid-response mapping.

### 3.11 Open-Meteo direct-client contract

- Ownership: Integration-owned direct React Native data source; no backend
  proxy/persistence/cache.
- Request: GET fixed origin `https://api.open-meteo.com/v1/forecast`; validated
  coordinate pair; `forecast_days` is the inclusive bounded window from local
  today through the latest required itinerary date (1-16), never merely trip
  duration; `timezone=auto`; daily variables are
  weather code, max/min temperature and max precipitation probability.
- Response DTO frozen for INT-P1 validation: `daily.time[]`,
  `daily.weather_code[]`, `daily.temperature_2m_max[]`,
  `daily.temperature_2m_min[]`, and
  `daily.precipitation_probability_max[]`, mapped by aligned index into a
  compact optional daily weather model.
- Reliability: 8-second timeout, cancellation-aware, maximum two attempts;
  only 429/5xx/transient transport failures are retryable.
- Errors: `WEATHER_INPUT_INVALID`, retryable/unavailable and invalid response.
  Weather failure is optional and must not fail saved-trip rendering.

### 3.12 `get-place-photo`

- Invocation: `POST /functions/v1/get-place-photo` or
  `supabase.functions.invoke('get-place-photo')`.
- Deployed: ACTIVE v1, `verify_jwt=true`.
- Auth: authenticated Supabase JWT required; ownership enforced server-side
  (user must own a saved trip containing a VERIFIED itinerary item with the
  requested `googlePlaceId`).
- Request: `{ googlePlaceId: string, maxWidth?: number }` (where `maxWidth` is
  bounded between 100 and 4800, default 1200 for hero, 600 for card thumbnails).
- Success: `{ data: { googlePlaceId, photoUri, authorAttribution? } }`, where
  `photoUri` is a short-lived Google CDN media URL (or null if unavailable)
  containing zero API credentials.
- Stable errors: `PHOTO_INPUT_INVALID`, `UNAUTHORIZED`, `FORBIDDEN`,
  `PHOTO_NOT_FOUND`, `PHOTO_PROVIDER_AUTH`, `PHOTO_PROVIDER_RATE_LIMITED`,
  `PHOTO_PROVIDER_UNAVAILABLE`.
- Security & privacy: Zero client Google Places API key leakage; anonymous
  invocations rejected with 401; unowned or arbitrary place ID requests
  rejected with 403 Forbidden.

### 3.13 `saved_places` / `list_saved_places` / `save_place` / `unsave_place`

- Database table: `public.saved_places` with columns `id` (uuid pk), `user_id` (uuid fk auth.users), `google_place_id` (text), `place_name` (text), `latitude` (float8), `longitude` (float8), `place_address` (text), `place_category` (text), `created_at` (timestamptz).
- Unique constraint: `UNIQUE(user_id, google_place_id)` for idempotent bookmarking.
- Index: `saved_places_user_created_id_idx (user_id, created_at DESC, id DESC)`.
- RLS: Enabled; authenticated SELECT, INSERT, UPDATE, DELETE policies bound strictly to `(auth.uid() = user_id)`.
- RPC `list_saved_places`: Keyset-paginated owner list supporting `p_limit` (1-50), `p_cursor_created_at`, `p_cursor_id`, and optional `p_category` filtering. Returns `{ items: [...], nextCursor: ... }`.
- RPC `save_place`: Idempotent upsert by owner deriving `auth.uid()`.
- RPC `unsave_place`: Owner-scoped deletion by `google_place_id`.
- Mobile implementation: `SupabaseSavedPlacesRepository`, `useSavedPlaces` hook, `SavedPlacesScreen`, `SavedPlaceCard`, `SavedCategoryChips`, `SavedEmptyState`, `SavedUndoBar`.
- Photo integration: Dynamically resolves thumbnail photos via `SupabasePlacePhotoRepository` / `get-place-photo` with 2-hour caching.
- Runtime state: Normal production runtime requires zero local fixtures; empty account displays Stitch empty state; remote error displays retry state; real operator seed seeded in Bangkok (Wat Arun, The Grand Palace, ICONSIAM, Supanniga Eating Room).

## 4. Frontend boundary inventory

| Capability | Existing boundary | Existing consumer | INT-P0 finding (historical input to INT-P1) |
|---|---|---|---|
| Supabase config/client | `lib/supabase/config.ts`, `client.ts` | app providers/services | Correct target base, but eager config and infrastructure composition need INT-P1 review |
| Secure session storage | `secureStoreAdapter.ts` | Supabase auth client | Correct storage technology; keep behind auth adapter |
| Auth/session | `authService.ts`, `AuthProvider.tsx`, auth types/hooks | Auth stack, app navigation guard | Live foundation exists; demo bypass, UI coupling and unsafe `any` are not production-ready |
| Profile transport | `profileRepository.ts` | `AuthProvider` only | Direct row type; Profile/Edit Profile still consume separate mock store |
| Generate transport | `planner/data/types.ts`, `contract.ts`, `generateTrip.ts` | none | Client exists and has tests; wizard still simulates generation |
| Planner UI model | `planner/types.ts` | Create Trip Wizard | Tier/group/presentation model needs explicit request mapper |
| Saved-trip transport | stale `trips/data/tripRepository.ts` | none | Direct table + offset pagination conflicts with frozen RPC contracts |
| Trip list/detail UI | `trips/types.ts`, mock repositories | My Trips, Trip Detail, Trip Map, Add Place | Presentation-heavy mock models require DTO validation + mapper layer |
| Place models | `explore/types.ts`, `place/types.ts`, mock fixtures | Explore, Place Detail, Saved Places | Fixture IDs/percent map coordinates are not provider/item identities |
| Route model | `route/types.ts`, mock route source | Route Preview | UI supports four modes and steps; frozen real OSRM contract is driving/no steps |
| Weather model | none | no real consumer | Must be introduced at transport/domain boundary before later UI wiring |
| Legacy API client | `src/api/*` | no production Supabase flow | Spring `/api/v1` emulator default is legacy and must not be reused by INT-P1 |

Required data flow for every implementation:

```text
Supabase/provider response (unknown)
    -> transport DTO validation
    -> safe domain error mapping
    -> transport-to-domain/UI mapper
    -> repository/controller hook
    -> existing screen
```

Raw Supabase, PostgREST, Edge Function, OSRM or Open-Meteo payloads must not
reach JSX.

## 5. Mismatch matrix and frozen resolution

| Contract | BE field/type | FE field/type | Nullability | Semantic mismatch | UI impact | Owner | Frozen resolution | Blocker |
|---|---|---|---|---|---|---|---|---|
| Destination | `destination: string` | selected option + custom name | BE required | Two FE sources | Request/title summary | INT-P3 mapper | Trimmed custom name when present, otherwise selected name | No |
| Trip title | generated/persisted `title` | editable `tripTitle` | required | Generate request has no title | Preview/saved title | INT-P3 mapper | Non-empty user title is authoritative for preview/persistence; generated title is fallback | No |
| Dates | inclusive `startDate/endDate`, 1-14 days | dates + `durationDays` | required | Quick-duration code uses an exclusive-style end date | Wrong day count | INT-P3 mapper | Dates are authoritative; derive inclusive duration and reject mismatch before request | No |
| Budget | numeric amount | `BudgetTier` | BE optional | Tier is not money | Budget display/generation | INT-P3 mapper | Do not invent an amount; omit numeric budget/persist null and pass normalized tier as a preference | No |
| Currency | uppercase ISO-like 3 letters | local `CurrencyCode` | optional | Local setting separate from planner | Formatting/persistence | INT-P3 mapper | Use selected settings currency, uppercase; keep null only when no monetary amount is persisted | No |
| Travelers | integer 1-20 | group enum | optional | Family/friends have no exact count | Prompt semantics | INT-P3 mapper | Map solo=1, couple=2; omit ambiguous family/friends count until UI captures a number | No |
| Day order | 1-based contiguous integer | UI day numbers | required | Must not trust arbitrary array data | Timeline order | INT-P1/P3 mapper | Validate then normalize by array index; never silently skip a day | No |
| Item order | 1-based contiguous integer | UI item arrays | required | Presentation models lack persisted position | Timeline/map order | INT-P1/P3 mapper | Preserve validated backend position and sort deterministically | No |
| Place suggestion | `placeName`, optional `placeQuery` | `title`, subtitle, fixture place ID | query optional | AI hint is not provider identity | Cards/search | INT-P5 mapper | Keep suggestion fields separate from provider snapshot and UI fixture IDs | No |
| Unresolved coordinates | provider fields omitted/null | map models assume a coordinate | nullable pair | UI could imply false verification | Maps/directions | INT-P5/P6 mapper | Only VERIFIED items enter real route/map; unresolved items render non-map state | No |
| Google Place ID | verified-only `googlePlaceId` | generic `placeId` | optional | Existing ID means several things | Navigation/save/map | INT-P1/P5 model | Separate `itineraryItemId`, `googlePlaceId`, and local fixture ID types | No |
| Address/category | verified-only optional fields | required rich place fields | optional | Backend snapshot is intentionally compact | Place cards/detail | INT-P5 mapper | Optional snapshot UI; rich details require a separately supported provider contract | No |
| Provenance | `placeResolvedAt` + `resolution` | absent | unresolved/verified | FE cannot distinguish trusted data | Map/security | INT-P1/P5 model | Model discriminated union with `UNRESOLVED` and `VERIFIED`; marker is authoritative | No |
| Generated IDs | none | UI items require `id` | absent | Preview IDs are not durable | React keys/navigation | INT-P3/P4 mapper | Use explicit preview-only keys; replace with RPC UUIDs after save/reload | No |
| Trip ID | none from generation; UUID after RPC | mock string IDs | absent until save | Preview is not persisted trip | Success navigation | INT-P3/P4 | Maintain draft identity separately; navigate to saved detail only after UUID success | No |
| Idempotency | required key 8-128 | absent | required on save | Retry could duplicate writes | Save/retry | INT-P1/P4 | Generate once per save intent, retain for every retry, discard after terminal completion/cancel | No |
| Saved pagination | keyset cursor, limit 1-50 | offset page 0-100 | cursor nullable pair | Ordering/pagination contract conflict | Infinite list | INT-P1/P4 | Do not use offset remote path; repository exposes opaque cursor and limit max 50 | No |
| Loading | network lifecycle | manually injected/simulated status | n/a | No request controller | All remote screens | INT-P1 | Shared typed async state; preserve current visual components | No |
| Timeout | stable AI/provider timeout | no generate timeout; simulated timers | n/a | Lifecycle not bounded | Planner/route/weather | INT-P1 | Adapter-owned abort/timeout; map to retryable domain error | No |
| Retry | bounded provider semantics | retry only changes local status | n/a | UI retry does not rerun work | Error states | INT-P1 | Repository retry policy plus explicit user retry; never retry auth/validation/ambiguity | No |
| Empty/not found | null/empty arrays/false | multiple UI enums | nullable | Transport meanings differ | Empty/error screens | INT-P1 mapper | Map each contract explicitly: empty list, null detail, false mutation, unavailable provider | No |
| Stable errors | AI/place codes, `TW001`-`TW005`, SQLSTATE | mixed raw/fallback strings | n/a | Raw errors can leak/inconsistently render | Error UX | INT-P1 | Exhaustive domain error union; unknown becomes safe internal error | No |
| Profile | compact DB row + Auth email + owner-scoped stats RPC | rich mock `UserProfile` | DB fields nullable | bio remains unsupported; country and stats are now remote | Profile/Edit | INT-P7 | Auth email, profile row including optional `home_country`, and exact owner stats are remote; unsupported rich fields remain local/derived | No |
| Route modes | OSRM driving, no steps | transit/walk/drive/cycle + steps | n/a | UI promise exceeds real contract | Route Preview | INT-P6 | Wire driving only; other modes use explicit unsupported/unavailable state unless a later contract is approved | No |
| Weather | compact daily forecast | no FE model | optional | Missing boundary | Trip weather area | INT-P1/P7 | Add transport/domain types in INT-P1; do not wire UI until INT-P7 | No |
| Legacy REST client | Supabase is production backend | `/api/v1` emulator default | n/a | Wrong backend architecture | Any accidental reuse | INT-P1 | Exclude legacy API client from new Integration composition | No |

## 6. Resolved mismatches and remaining blockers

INT-P0 resolved contract ambiguity by assigning an exact adapter/model rule and
phase owner to every identified mismatch. No backend contract change and no FE
redesign is required.

**Remaining blocker for INT-P1: none. INT-P1 is complete.**

Later-phase gaps (route modes, rich Places detail, ambiguous traveler counts)
are explicitly bounded behavior, not INT-P1 blockers. They must not be
workarounded by changing verified backend contracts or FE visuals.

Documentation inconsistency observed but not changed: the top status block in
the dirty `PHASES_FE.md` still names Phase 16, while its completed checklists,
`HANDOFF_FE.md`, source/tests, and the user authorization context place FE at
Phase 20. FE ownership must reconcile that document during FE-P20.

## 7. Implemented INT-P1 contract

INT-P1 delivered the following reviewable infrastructure:

1. Fail-fast validated client-safe Supabase configuration and one production
   singleton client; no server secrets.
2. Supabase client composition with `expo-secure-store` session storage.
3. A separate Auth/session repository adapter with no demo-account bypass and
   no access/refresh token exposure. The existing UI-coupled demo branch stays
   deferred to INT-P2 because removing it would change auth UI/navigation flow.
4. Feature repository interfaces and remote data sources for the frozen
   Supabase/function/RPC/provider surfaces.
5. Generated/current database types or explicit accurate transport types;
   replace the stale handwritten types that still require non-null coordinates
   and omit RPCs/provenance.
6. Runtime validation from `unknown` before mapping.
7. Discriminated place provenance and distinct identity types.
8. Exhaustive domain errors for auth, AI, persistence, place, route and weather.
9. Timeout/cancellation and bounded retry policies exactly as frozen above.
10. Unit/contract fixtures at data-source and mapper boundaries.

Canonical transport/domain inventory:

- Authenticated user/session and profile read/update.
- `generate-trip` request, success graph and six safe error codes.
- `create_trip_graph(text, jsonb)` idempotent unresolved graph and UUID result.
- Saved-trip keyset list, compact detail, note update and delete contracts.
- `resolve-place` item-ID-only request and verification receipt.
- OSRM driving-only GeoJSON route and bounded Open-Meteo daily forecast.
- Branded `TripId`, `ItineraryDayId`, `ItineraryItemId`, `GooglePlaceId` and
  `FixtureId`, plus a discriminated `UNRESOLVED | VERIFIED` place model.

Repository inventory:

- `AuthRepository`, `ProfileRepository`, `TripGenerationRepository`.
- `TripPersistenceRepository`, `SavedTripsRepository`.
- `PlaceResolutionRepository`, `RouteRepository`, `WeatherRepository`.

Remote implementation inventory:

- `SupabaseAuthRepository`, `SupabaseProfileRepository`.
- `SupabaseTripGenerationRepository`, `SupabaseTripPersistenceRepository`.
- `SupabaseSavedTripsRepository`, `SupabasePlaceResolutionRepository`.
- `OsrmRouteRepository`, `OpenMeteoWeatherRepository`.

Database type strategy:

- `database.types.ts` was replaced by a reviewed linked-project generated
  public-schema snapshot on 2026-08-20.
- App-allowed RPC signatures are explicit. Service-role-only functions and the
  obsolete non-idempotent overload are excluded from the mobile client type.
- Itinerary coordinates are nullable and `place_resolved_at` is nullable;
  runtime validation rejects half-coordinate pairs and treats provider-looking
  fields as trusted only when protected provenance exists.

Reliability and error policy:

- Raw external data begins as `unknown`, is validated, then mapped.
- Stable semantic errors cover auth, `generate-trip`, `TW001`-`TW005`,
  `resolve-place`, PostgREST, route and weather without reflecting raw internals.
- Every remote operation accepts cancellation and owns a timeout.
- Validation/auth/forbidden/conflict/not-found/ambiguity/provider-auth are not
  retried. Only retryable transport/timeout/5xx or public-provider 429 paths get
  at most two total attempts; mutations default to one attempt.
- `create_trip_graph` is the sole trip-graph write path. One opaque 8-128 char
  key is created per save intent and reused unchanged across its bounded retry.
- OSRM uses a fixed trusted origin and `driving` only. Open-Meteo uses a fixed
  origin, 1-16 forecast days and returns optional `null` after bounded provider
  unavailability. Neither repository is connected to UI.

INT-P1 did not connect repositories to screens, remove visual fixtures, call a
paid provider, persist a trip, or start authentication UI wiring.

## 8. Verification evidence

Commands run for INT-P0 and INT-P1:

```powershell
git status --short --branch
npx supabase functions list
npx supabase migration list

cd mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-doctor

cd ..
npx --yes deno test supabase/functions/generate-trip/*_test.ts supabase/functions/resolve-place/*_test.ts supabase/tests/architecture/*_test.ts
```

Results:

- Mobile lint: PASS, 0 warnings/errors.
- Mobile TypeScript strict check: PASS.
- Focused INT-P1 tests: 6 suites, 44 tests PASS.
- Full mobile suite: 32 suites, 267 tests PASS.
- Expo Doctor: 21/21 checks PASS.
- Deno function/provider contract tests: 38 PASS, 0 failed.
- Remote Edge Function inventory: PASS, `generate-trip` v6 and
  `resolve-place` v8 ACTIVE with JWT verification.
- Remote migration inventory: PASS, local/remote aligned through all 9
  migrations.
- Paid Gemini/Google live smoke: not run by design.
- Secret audit: PASS; no mobile service-role/Gemini/Google server key, JWT,
  refresh token logging, session dump or `any` in the new integration boundary.
- Android runtime: not run because INT-P1 changed no native runtime or UI wiring.

## 9. Files inspected and changed

Inspected:

- required root roadmaps, handoffs, ADR-017 through ADR-020, coding rules;
- relevant `mobile/src`, `mobile/tests`, `supabase/functions`, provider
  contracts, migrations and SQL/Edge Function tests;
- current git worktree and read-only remote function/migration inventories.

Changed by INT-P1:

- `PHASES_INTEGRATION.md`
- `HANDOFF_INTEGRATION.md`
- `mobile/src/lib/supabase/database.types.ts`
- `mobile/src/integration/contracts.ts`
- `mobile/src/integration/validation.ts`
- `mobile/src/integration/mappers.ts`
- `mobile/src/integration/repositories.ts`
- `mobile/src/integration/errors.ts`
- `mobile/src/integration/reliability.ts`
- `mobile/src/integration/idempotency.ts`
- `mobile/src/integration/index.ts`
- `mobile/src/integration/remote/publicProviderRepositories.ts`
- `mobile/src/integration/remote/supabaseAuthRepository.ts`
- `mobile/src/integration/remote/supabaseProfileRepository.ts`
- `mobile/src/integration/remote/supabaseTripRepositories.ts`
- `mobile/src/integration/remote/supabasePlaceResolutionRepository.ts`
- `mobile/tests/supabase-config.test.ts`
- `mobile/tests/integration-validation.test.ts`
- `mobile/tests/integration-mappers.test.ts`
- `mobile/tests/integration-errors.test.ts`
- `mobile/tests/integration-reliability.test.ts`
- `mobile/tests/integration-remote-repositories.test.ts`

No database migration, endpoint, screen, component, navigation path or mock
runtime selection was created/changed by INT-P1. Other dirty worktree files
remain owned by their parallel FE/BE sessions and were not reverted.

## 10. Exact next action

## 10. INT-P2 closure (2026-08-20)

INT-P2 is closed under explicit user waivers. Production Auth UI composes
`AuthProvider` â†’ `SupabaseAuthRepository` / `SupabaseProfileRepository` â†’
SecureStore-backed Supabase singleton; no production demo bypass remains.

- Real Supabase login, logout, profile read, profile update/read-back, login
  again, User A/User B RLS isolation, and anonymous rejection: PASS.
- Automated bootstrap lifecycle (no session, valid restore, invalid session,
  auth-state subscription and unmount cleanup): PASS.
- Register production path is `RegisterScreen` â†’ `AuthProvider.signUp` â†’
  `SupabaseAuthRepository.signUp` â†’ public `supabase.auth.signUp`; localized
  confirmation, duplicate, rate-limit and network states are covered.
- Public signup live lifecycle: **WAIVED / DEFERRED BY USER**. The actual
  Supabase response was `429 over_email_send_rate_limit`; no claim of PASS is
  made. SMTP/quota tuning is deferred for this personal-use app.
- Android process-kill/restart session restore: **WAIVED / MANUAL VERIFICATION
  PENDING**. No claim of Android restart PASS is made.
- SecureStore remains the session adapter; no password/JWT/refresh-token/session
  dump, service-role mobile bundle value, Gemini key or Google server key was
  found in mobile production source.
- Closure gates: mobile lint/typecheck PASS; full Jest PASS; Expo Doctor 21/21
  PASS at the INT-P3 working-tree checkpoint.

## 11. INT-P3 completion (2026-08-20)

Implemented and closed:

- `CreateTripWizardScreen` now uses a feature hook/controller and
  `TripGenerationRepository`, not simulation, with a lazy Supabase singleton
  load only on an explicit Generate action.
- Wizard state maps to the frozen request contract with inclusive-date
  consistency checks. Style labels map to `preferences`; pace/budget-tier/group
  semantics map to bounded `notes`; no arbitrary numeric budget/traveler value
  and no user title are sent.
- The response is validated from `unknown` by the existing production validator,
  then mapped to a planner preview whose suggestions are all `UNRESOLVED` and
  have no Google ID or coordinates. No persistence surface is called.
- UX has generating, safe localized error, explicit retry, unmount cancellation,
  and an in-flight duplicate guard. Generation policy remains one attempt;
  Retry is a new explicit user action.
- Screen tests, mapper tests, repository tests and full quality gates pass.
- Current remote inventory after the user secret update: `generate-trip` v9
  ACTIVE with `verify_jwt=true`. The deployed source matches the reviewed local
  source: Gemini REST `v1beta/interactions`, model
  `gemini-3.5-flash-lite`, and the `steps[].content[].text` compatibility parser.
- Previous runtime evidence identified Gemini HTTP 401/category `auth`. The
  user replaced the rejected `GEMINI_API_KEY` through Supabase Secrets; no key
  value was read or printed. Request construction remains correct: trimmed key
  via `x-goog-api-key`, with no Bearer header.
- Remote `generate-trip` v9 is ACTIVE with `verify_jwt=true`.
- User terminal live evidence: disposable authenticated user created; real
  authenticated generation succeeded; production validator accepted inclusive
  day semantics; planner mapper preserved ordered unresolved suggestions; trip
  count before/after was equal; disposable user cleanup passed.
- This is the required real FEâ†”BE generation smoke. No second provider call was
  made after success.
- Deno check/lint and all 15 generate-trip tests PASS. Mobile lint, typecheck
  and Jest PASS (36 suites, 282 tests; 1 live suite skipped). Expo Doctor is
  now **21/21 PASS** after safe SDK-compatible patch updates for `expo`,
  `expo-asset` and `expo-dev-client`.
- Security audit PASS: no key/token/password/provider-body logging and no
  credentials entered mobile or Expo public environment.
- Therefore **INT-P3 is COMPLETE**.

### INT-P3 files

- `mobile/src/features/planner/generation.ts`
- `mobile/src/features/planner/generationContracts.ts`
- `mobile/src/features/planner/screens/CreateTripWizardScreen.tsx`
- `mobile/src/features/planner/components/CreateTripSuccessView.tsx`
- `mobile/src/features/planner/data/mockWizardData.ts`
- `mobile/src/integration/remote/supabaseTripRepositories.ts`
- `mobile/tests/planner-generation.test.ts`
- `mobile/tests/CreateTripWizardScreen.test.tsx`
- `mobile/tests/live-generate-trip.test.ts` (gated live harness)
- `mobile/scripts/remote-generate-trip-smoke.ts`

## 12. Exact next action

> Next phase is **INT-P6 â€” Map & Route Integration**. Begin only in a future
> explicitly authorized session; this session stops after INT-P5 closure.

## 13. INT-P4 completion (2026-08-20)

Implemented, remotely exercised and **INT-P4 COMPLETE**.

- Generated preview now has an explicit persistence graph mapper preserving
  title fallback, inclusive dates, day/item ordering and unresolved place
  semantics without provider metadata or fake coordinates.
- Create Trip success flow has an explicit Save action backed by
  `useTripPersistence` â†’ `SupabaseTripPersistenceRepository` â†’
  `create_trip_graph`. One `SaveIntent` key is reused across retry and duplicate
  in-flight saves are blocked.
- Production Trips screen uses `SupabaseSavedTripsRepository.list` with bounded
  keyset pagination contract. Production Trip Detail uses
  `get_saved_trip_detail` and maps the remote graph before rendering. The old
  direct-table repository is marked deprecated and deferred to INT-P8.
- Focused mapper/repository/UI tests: 41 PASS. Full mobile suite: 36 suites,
  282 tests PASS; one live suite remains skipped. Lint and typecheck PASS.
  Expo Doctor: 21/21 PASS.
- A production persistence smoke harness exists at
  `mobile/scripts/remote-persistence-smoke.ts`. It covers User A save/list/
  detail/reopen, same-key idempotent retry, same-key different-payload TW004,
  User B list/detail/note/delete isolation, owner note update, delete and
  cleanup.
- Real authenticated User A/User B terminal evidence passed: disposable users,
  `create_trip_graph` UUID, owner count +1, list/detail visibility, independent
  reopen, ordered unresolved items, same-key idempotency, TW004 conflict,
  cross-user list/detail/note/delete isolation, owner note update/delete,
  deleted-trip non-reopen and exact cleanup/count restoration.
- The isolated persistence contract suite completed with
  `PERSISTENCE_TESTS_PASS`, including malformed-graph atomic rollback,
  anonymous/auth grants, RLS, stable errors, keyset pagination/query plans and
  same-key concurrency/idempotency. No schema or contract changed in INT-P4.
- No direct table insert or offset path is used by the production persistence
  flow. The old direct-table repository is explicitly deprecated for INT-P8.
- Therefore **INT-P4 is COMPLETE**.

### Exact next action

Next session may begin **INT-P6 â€” Map & Route Integration** only with explicit
authorization. Do not start INT-P6 in this session.

## 14. INT-P5 implementation progress (superseded by completion below)

Implemented the production resolution boundary; live closure evidence is
recorded in section 15 below.

- `TripDetailScreen` composes `PlaceResolutionRepository.resolve({
  itineraryItemId })` with `SavedTripsRepository.getDetail()` refetch. The
  client sends no provider metadata and trusts only the refetched snapshot.
- `usePlaceResolution` provides per-item idle/resolving/verified/error states,
  duplicate-call blocking, cancellation cleanup and explicit retry. A failed
  refetch cannot transition an item to VERIFIED.
- Saved-trip mapping preserves the `UNRESOLVED`/`VERIFIED` model, provenance
  timestamp, Google Place ID and coordinate pair only for validated VERIFIED
  transport data.
- `resolve-place`: v9 ACTIVE with `verify_jwt=true`.
- Deno check/lint PASS; resolve-place tests **20/20 PASS**. Mobile lint,
  typecheck and Jest PASS (36 suites, 283 tests; one live suite skipped).
  Expo Doctor: **21/21 PASS**.
- FE repository smoke harness: `mobile/scripts/remote-place-resolution-smoke.ts`.
  It covers unresolved-before, authenticated resolve, independent detail
  refetch, VERIFIED mapper state and User B isolation.
- The initial shell could not run the harness because disposable credentials
  were unavailable; this was later superseded by the user terminal's real live
  resolution evidence recorded below.

### Exact next action

The live lifecycle is now complete; see section 15. Do not start INT-P6 in this
session.

## 15. INT-P5 completion (2026-08-20)

INT-P5 is **COMPLETE** based on real authenticated FEâ†”BE evidence.

- Production path is `TripDetail` â†’ `PlaceResolutionRepository` â†’ authenticated
  `resolve-place` v9 â†’ `SavedTripsRepository.getDetail` refetch â†’ validation â†’
  pure domain mapper â†’ VERIFIED UI state. No screen calls Google directly.
- Request contract is exactly `{ itineraryItemId }`; owner/provider metadata,
  coordinates, address, category and provenance are never client-supplied.
- Live disposable lifecycle passed: unresolved item persisted; BEFORE detail
  was UNRESOLVED with no trusted metadata; resolve-place returned verified
  status; independent detail refetch contained persisted provenance/provider
  identity and a valid coordinate pair; production mapper classified VERIFIED;
  User B could not read or resolve the item; cleanup passed.
- Trust model remains provenance-based: null `place_resolved_at` is
  UNRESOLVED; non-null provenance plus validated provider identity and complete
  coordinates is VERIFIED. Hybrid states are rejected.
- Backend resolve-place tests: 20/20 PASS. Mobile Jest: 36 suites, 283 tests
  PASS (one live suite skipped); lint/typecheck PASS; Expo Doctor 21/21 PASS.
- Security/cost audit PASS: no Google/service-role secret in mobile, no token or
  raw provider logging, one item per intentional request, bounded retry and no
  automatic provider fan-out. Unsupported photos/reviews/ratings/hours/fees
  remain non-production mock/deferred data.
- Therefore **INT-P5 is COMPLETE**.

### Exact next action

> Next phase is **INT-P6 â€” Map & Route Integration**. Do not begin it without
> explicit authorization; this session stops after INT-P5 closure.

## 16. INT-P6 progress (2026-08-20)

INT-P6 remains **INCOMPLETE**. The native boundary is now implemented and the
development build compiles, but live saved-detail/OSRM and real Google map
render evidence are not yet complete.

- `OsrmRouteRepository` is the direct-client boundary. It uses the fixed
  `https://router.project-osrm.org/route/v1/driving` origin, driving only,
  validates 2â€“25 coordinates, applies timeout/bounded transient retry, and
  validates GeoJSON from `unknown` before mapping it to a route domain model.
- `buildDrivingRouteRequest` extracts only persisted `VERIFIED` coordinates,
  preserving day/item order and skipping `UNRESOLVED` suggestions. It rejects
  fewer than two verified stops; no guessed or fixture coordinates are used.
- Focused route tests pass (request ordering, unresolved exclusion, minimum
  stop validation, and OSRM repository contract).
- `react-native-maps` was installed with Expo SDK 57 resolution. Production
  UUID trip-map paths now use `VerifiedRouteMap` with native `MapView`, real
  `Marker` and `Polyline`; fixture IDs retain the deterministic mock canvas for
  tests/previews. Driving route preview supports native rendering when trusted
  coordinates are supplied; transit/walking/cycling are not masqueraded as
  driving.
- Expo config uses `app.config.js` and the optional client-only
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. No Maps key was found in the current
  process/repository audit, so Google tiles cannot be claimed as rendered.
- Android debug signing audit (2026-08-21): package
  `com.anonymous.tripwisemobile`; debug SHA-1
  `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
  This fingerprint is for the local debug/development keystore only and must
  be used with an Android-restricted Maps SDK client key. Maps SDK config plugin
  is present, but the key value is currently missing, so no rebuild or runtime
  PASS is claimed.
- `mobile/scripts/remote-route-smoke.ts` is Node-safe and exercises the
  production saved-detail mapper, route planner and OSRM repository. Its
  disposable place-resolution setup is explicitly gated to avoid accidental
  extra Google calls. It has not been run live in this session.
- One direct route-only live smoke was run through the production
  `OsrmRouteRepository`: fixed Bangkok verified coordinates, HTTP success,
  positive distance/duration and multi-point geometry passed. This does not
  substitute for the required saved-detail lifecycle smoke.
- Android development build: **BUILD SUCCESSFUL**; app installed and loaded
  on emulator `emulator-5554`. A real map-screen interaction was not accepted
  as PASS because the runtime showed a blank/native map surface without a
  configured Google Maps key and no saved remote UUID trip was available.
- Mobile lint/typecheck/full Jest and Expo Doctor remain PASS. The remaining
  blockers are Google Maps key/configuration, a live saved-detail â†’ OSRM smoke,
  and real marker/polyline Android evidence.

### Exact next action

Complete INT-P6 by selecting and configuring the approved native map surface,
composing a real saved-detail `VERIFIED` route request into the map/route UI,
then collecting one direct OSRM smoke and Android runtime evidence. Do not
start INT-P7 before those gates pass.

## 17. Start here in the next Antigravity INT-P6 session

This section supersedes older INT-P6 "next action" wording above for the
continuation handoff.

1. Read `PHASES_INTEGRATION.md`, this handoff, `HANDOFF_BE.md`,
   `HANDOFF_FE.md`, `DECISIONS.md`, and
   `docs/05-engineering/react-native-coding-rules.md`.
2. Run `git status` and preserve the shared dirty worktree. Do not reset,
   restore, clean, revert, or commit unrelated work.
3. Do **not** redo INT-P0 through INT-P5. Do not redo Explore native-map work
   unless a new runtime regression is reproduced.
4. Verify local environment variables by presence only. Never print values:
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. The service-role key, when needed, is
   process-local setup/cleanup input only and must never enter mobile source.
5. Use the existing Node-safe disposable harnesses:
   - `mobile/scripts/create-intp6-runtime-trip.ts`
   - `mobile/scripts/cleanup-intp6-runtime-trip.ts`

   The create harness authenticates a disposable user, persists one bounded
   Bangkok trip through `create_trip_graph`, resolves two items through the
   existing `resolve-place` contract, refetches with
   `get_saved_trip_detail`, validates two VERIFIED snapshots, and calls the
   production OSRM repository. It prints only safe identifiers/results and
   retains the disposable data for runtime verification. It never fakes
   coordinates/provenance or mutates provider-owned fields directly.
6. If required local variables are missing, report only their names to the
   user; do not request secrets in chat and do not call providers.
7. Complete the saved-detail â†’ VERIFIED â†’ OSRM live smoke. Required evidence:
   production UUID, two provenance-backed coordinate pairs, ordered route,
   positive distance/duration, multi-point geometry, and exact cleanup after
   emulator verification.
8. Once a `TRIP_UUID` exists, run the Android app. If direct emulator control
   or evidence is unavailable, stop and ask the user to perform the runtime
   checks below; do not claim PASS from build success.

### Required user runtime verification

Trip Map:

- Open **Trips** and open the disposable production trip.
- Tap **View Map** and select the day containing both resolved items.
- Verify Google tiles, at least two VERIFIED markers in persisted order,
  OSRM driving polyline, camera fit, pan/zoom, and no unresolved marker.

Route Preview:

- From a production itinerary item, tap **Directions**.
- Select **Drive**.
- Verify native Google map, trusted origin/destination markers, OSRM
  polyline, distance and duration, with no mock-route fallback.

Request from the user: one Trip Map screenshot, one Route Preview screenshot,
and sanitized Android/logcat output if any runtime error occurs. Give exact
screen/button/expected-result instructions if interaction is required.

After verification, run the cleanup harness with the retained `TRIP_UUID`.

## 18. INT-P6 completion gate for Antigravity

Already recorded PASS:

- persistent local Maps client-key configuration and Expo
  `androidGoogleMapsApiKey` boundary (raw key excluded from docs);
- Android native build;
- Explore native tiles, markers, filters, selected preview, pan and native
  zoom controls;
- VERIFIED-only route planning, direct OSRM architecture and route-only live
  smoke;
- lint, typecheck, Jest and Expo Doctor 21/21 at the latest verified
  checkpoint;
- Directions coordinate propagation fix from Trip Map/Trip Detail to Route
  Preview.

Still required before INT-P6 can be marked COMPLETE:

- [ ] saved-detail â†’ at least two VERIFIED stops â†’ OSRM live smoke;
- [ ] production Trip Map Android runtime PASS;
- [ ] production Route Preview Android runtime PASS;
- [ ] final Android INT-P6 runtime/security evidence.

Explore native rendering is complete, but Explore search/category/list data
still uses local demo fixtures. No authorized production Google Places
Explore search/list/details contract exists; fixture coordinates are not
provider-VERIFIED data.

Only after every remaining gate passes may Antigravity mark INT-P6 COMPLETE,
update both roadmap/handoff files, and set the next phase. Do not start INT-P7
in the continuation setup session.

## 19. Final Codex pre-handoff readiness (2026-08-21)

Codex performed a non-runtime readiness pass only. INT-P6 remains
**IN PROGRESS / INCOMPLETE**; no Android runtime verification, saved-detail
live smoke, or provider call was performed in this pass.

### Harness readiness

- `mobile/scripts/load-local-env.ts` is a Node-safe, dependency-free loader.
  It merges `.env` first and `.env.local` second, while explicit process
  variables always win. Values are never printed.
- `create-intp6-runtime-trip.ts`, `cleanup-intp6-runtime-trip.ts`, and
  `remote-route-smoke.ts` call the loader before reading configuration.
- The create harness reports only boolean configuration presence when setup is
  incomplete. It requires explicit `INTP6_DISPOSABLE_EMAIL` and
  `INTP6_DISPOSABLE_PASSWORD`; it never invents, stores, or prints permanent
  credentials. Service-role is setup/cleanup-only input.
- The create harness uses `create_trip_graph`, authenticated public sign-in,
  `resolve-place`, `get_saved_trip_detail`, the production mapper and
  `OsrmRouteRepository`. It retains only the disposable trip for manual
  runtime verification and prints UUID/place names/route metrics, never
  tokens, passwords, keys or raw provider payloads.
- Cleanup is exact and scoped by `INTP6_RUNTIME_TRIP_ID`; it resolves the
  owning disposable auth user, deletes the trip graph, then deletes that user.

### Production trip discoverability

- `TripsScreen` now supplies a memoized `SupabaseSavedTripsRepository` by
  default in the authenticated app, so newly created production trips appear
  through `list_saved_trips` instead of the fixture list.
- `TripDetailScreen` now composes the Supabase saved-trip and place-resolution
  repositories automatically for UUID trip IDs. Non-UUID fixture IDs retain
  deterministic test/preview behavior.
- The production UUID path remains
  `Trips â†’ TripDetail â†’ View Map â†’ TripMapScreen â†’ get_saved_trip_detail`;
  unresolved items remain excluded from map/route points.
- User action for list refresh: reopen the Trips tab (or navigate away and
  back) after the harness creates the trip. The list is fetched through the
  authenticated repository on mount.

### Route Preview boundary

The previously added Directions fix remains active: Trip Map/Trip Detail pass
trusted VERIFIED coordinates when at least two exist; Route Preview uses
`OsrmRouteRepository` for Drive and does not map unsupported modes to driving.

### Readiness checks

Latest non-runtime results after this pass:

- lint: PASS
- typecheck: PASS
- Jest: 39 suites passed, 1 skipped; 292 tests passed, 1 skipped
- Expo Doctor: 21/21 PASS

No live authenticated environment was available in the Codex process for this
pass, so no saved-detail â†’ OSRM PASS is claimed.

### Antigravity copy-paste command block

Run from `D:\Dev\TripWise\mobile` with local environment variables already
configured by the operator; do not paste secrets into chat:

```powershell
cd D:\Dev\TripWise\mobile

# Requires local process variables:
# EXPO_PUBLIC_SUPABASE_URL
# EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# SUPABASE_SERVICE_ROLE_KEY
# INTP6_DISPOSABLE_EMAIL
# INTP6_DISPOSABLE_PASSWORD
npx tsx scripts/create-intp6-runtime-trip.ts

# Copy only the printed TRIP_UUID into this local process variable.
$env:INTP6_RUNTIME_TRIP_ID = '<TRIP_UUID>'
npm run android

# Emulator checks: Trips -> disposable trip -> View Map -> verified markers/polyline;
# then itinerary Directions -> Drive -> native map/polyline/distance/duration.

npx tsx scripts/cleanup-intp6-runtime-trip.ts
```

This readiness update does not change roadmap state and does not authorize
INT-P7.

## 20. INT-P6 Map & Route Integration (OPEN / PAUSED State)

INT-P6 remains formally **OPEN / PAUSED**. Substantial verified evidence on Android already exists:

- **Target Operator Verification Run:** `sarah.j@example.com`
- **Target Trip UUID:** `db5c6e22-ba18-465a-b803-f03702d4e73a` (disposable trip kept for operator verification)
- **Verified Items:** Chùa Arun and The Grand Palace (with trusted Google Place IDs and verified coordinates)
- **Native Maps:** Native Google Maps on Android rendering real VERIFIED markers, camera pan/zoom, and real OSRM polyline.
- **Directions & Route Preview:** Directions action propagates verified coordinates to Route Preview, displaying driving route distance/duration.
- **Android Fabric NullPointerException Fix:** Replaced default `<Marker>` tags with custom `<View>` children in `VerifiedRouteMap` and `VerifiedRoutePreviewMap` to prevent `MarkerManager.setPinColor` null crashes.
- **Route Preview Layout Occlusion Fix:** Fixed absolute positioning bug so the map container properly sits above the bottom sheet.
- **Stitch Geometry:** Fixed Trip Detail hero geometry and summary card overlap against Stitch screen `1e86508f0dd0413db877d859125b630f`.

**Known Contract Boundaries:**
- OSRM production routing remains driving-only (`profile: 'driving'`). Transit / Walk / Bicycle are visual tabs and do not masquerade as Drive.
- "Start Route" / turn-by-turn navigation remains a static visual CTA (no-op) deferred until a dedicated navigation engine contract is established.
- Rich production Place Detail remains contract-bounded where applicable.

---

## 21. INT-P7 — Weather Integration (Open-Meteo)

- **Architecture:** `VERIFIED persisted coordinates → OpenMeteoWeatherRepository → runtime validation (validateWeatherRequest / parseOpenMeteoTransport) → WeatherForecast → Trip Detail weather badge`
- **Security & Network:** Public direct-client API (no server secrets required), bounded retry policy, 10s timeout, AbortSignal lifecycle cancellation.
- **Business Logic:** Trip duration clamped to supported 16-day forecast range; active trip day dynamically aligns with daily forecast. Provider failure is non-blocking (gracefully hides badge without crashing). Zero mock fallback in production runtime.
- **Verification:** Automated tests PASS (`tests/integration-weather.test.ts`).

---

## 22. INT-P7 — Saved Places Backend Contract & Real Data Integration

- **Database:** `public.saved_places` created in `20260822000000_saved_places_contract.sql` + `20260822010000_add_saved_places_update_policy.sql`.
  - Schema: `id UUID`, `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`, `google_place_id TEXT NOT NULL`, `place_name TEXT NOT NULL`, `latitude DOUBLE PRECISION NOT NULL`, `longitude DOUBLE PRECISION NOT NULL`, `place_address TEXT`, `place_category TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`.
  - Unique Constraint: `(user_id, google_place_id)`.
  - Keyset Pagination Index: `(user_id, created_at DESC, id DESC)`.
  - RLS: Enabled; SELECT, INSERT, UPDATE, DELETE restricted strictly to `(auth.uid() = user_id)`.
- **RPC Functions:**
  - `public.list_saved_places(p_limit, p_cursor_created_at, p_cursor_id, p_category)`: Returns keyset-paginated JSONB `{ items: [...], nextCursor: { createdAt, id } }`.
  - `public.save_place(p_google_place_id, p_place_name, p_latitude, p_longitude, p_place_address, p_place_category)`: Idempotent upsert (`ON CONFLICT (user_id, google_place_id) DO UPDATE`), returns saved place row.
  - `public.unsave_place(p_google_place_id)`: Deletes owned row, returns boolean.
- **Frontend Wiring:** `useSavedPlaces` hook and `SavedPlacesScreen` wired directly to `SupabaseSavedPlacesRepository`. Local mock store replaced with real Supabase PostgREST/RPC queries.
- **Stitch Fidelity:**
  - Populated state matched against Stitch screen `3e59b6c7b2e646feb189eb8a313b6a6e`.
  - Empty state matched against Stitch screen `aa0abf7fea0f4e05bebdbf471c9d7ae3`.
- **Verification:** Automated tests PASS (`tests/integration-saved-places.test.ts`, `tests/SavedPlacesScreen.test.tsx`).

---

## 23. INT-P7 — Google Place Photos Integration (`get-place-photo`)

- **Deployed Function:** `get-place-photo` (ACTIVE v1, `verify_jwt=true`).
- **Architecture:** `mobile → SupabasePlacePhotoRepository → Edge Function get-place-photo → Google Places API (New) → short-lived safe photo URI → cached React Native image`.
- **Security & Ownership:**
  - Server-side secret only (`GOOGLE_MAPS_API_KEY` in Supabase Secrets Vault; never exposed to React Native bundle).
  - JWT required (`verify_jwt=true`).
  - Verifies that the requested `googlePlaceId` belongs to a VERIFIED itinerary item owned by `auth.uid()` or an owned row in `public.saved_places`.
  - Unauthenticated requests return 401; unowned place requests return 404/403.
- **Places API (New) Contract:** Calls `https://places.googleapis.com/v1/{name}/media?maxHeightPx=...&maxWidthPx=...&skipHttpRedirect=true` to obtain safe photo URI.
- **Consumers:** Trip Detail hero header, Trip Detail itinerary items, Saved Places cards.

---

## 24. INT-P7 — Google Place Ratings & Metadata (`get-place-metadata`)

- **Deployed Function:** `get-place-metadata` (ACTIVE v1, `verify_jwt=true`).
- **Architecture:** `mobile → SupabasePlaceMetadataRepository → Edge Function get-place-metadata → Google Places API (New) → validated { data: { rating, userRatingCount } }`.
- **Security & Ownership:**
  - Server-only credentials. Authenticated JWT required.
  - Ownership validated against owned `saved_places` or owned verified `itinerary_items`.
  - Anonymous requests rejected (401); cross-user / unowned lookups rejected (404).
- **Server Caching:** 24-hour server-side TTL caching.
- **UI Behavior:** Saved Places cards display real Google rating according to Stitch layout. If a place has no rating, rating UI is cleanly hidden without displaying fake `0.0`. `userRatingCount` is preserved in provider payload but omitted from card UI per Stitch design.
- **Verification:** Automated tests PASS (`tests/integration-place-photos.test.ts`).

---

## 25. INT-P7 — Profile & Settings Real Data Integration & Account Deletion

- **Database Migrations:** `supabase/migrations/20260822020000_profile_stats_and_deletion.sql` plus forward-only corrective migration `supabase/migrations/20260823000000_harden_profile_stats_and_deletion.sql`.
  - Added `home_country varchar(2) not null default ''` to `public.profiles`.
  - Created and hardened `public.get_user_trip_stats()` RPC (`security invoker`, `set search_path = ''`): returns owner-only indexed counts as `{ trips_count, saved_places_count }` with no caller-supplied user ID.
  - Created `public.delete_user_account()` RPC (`security definer`, `set search_path = ''`):
    - Authenticated guard: `v_uid := auth.uid(); if v_uid is null then raise exception 'Not authenticated'; end if;`.
    - Executed deletion: `delete from auth.users where id = v_uid;`.
    - Cascades atomically to `public.profiles`, `public.trips`, `public.itinerary_days`, `public.itinerary_items`, and `public.saved_places` via existing `ON DELETE CASCADE` foreign keys.
    - The original migration omitted explicit default-EXECUTE revocations. The corrective migration revokes both RPCs from `PUBLIC`, `anon`, and `authenticated`, then grants EXECUTE back only to `authenticated`. Cross-user deletion is structurally impossible.
- **Contracts & Validation:**
  - Updated `Profile`, `ProfileTransport`, `ProfileUpdate` contracts, mappers (`mapProfile`), and validation schema (`parseProfileTransport`) to include `homeCountry`.
  - Added `getStats(): Promise<{ tripsCount: number, savedPlacesCount: number }>` to `SavedTripsRepository` and `SupabaseSavedTripsRepository`.
  - Added `deleteAccount(): Promise<void>` to `AuthRepository`, `SupabaseAuthRepository`, and `AuthProvider`.
- **Frontend Wiring:**
  - `useProfile.ts`: Removed mock-trip and fixture-backed `savedPlacesStore` dependencies; both Trip and Saved values come from the authenticated owner-scoped RPC. Statistics are tagged with the owner ID so stale values cannot appear after sign-out or account switching.
  - `AuthProvider.tsx`: Production-grade implementation backed by `SupabaseAuthRepository` and `SupabaseProfileRepository` supporting `signIn`, `signUp`, `signOut`, `deleteAccount`, `resetPassword`, `refreshProfile`, `updateProfile` with dependency injection support for unit testing.
  - `SettingsScreen.tsx`: Wired Delete Account modal confirmation to `deleteAccount()`, which calls the `delete_user_account` RPC and signs the user out cleanly.
  - `ProfileScreen.tsx`: Wired Delete Account action to `deleteAccount()`.
- **Settings Data Split:**
  - **Remote:** User profile (`displayName`, `avatarUrl`, `homeCountry`, `email`), account deletion (`deleteAccount()`), password reset.
  - **Local App Preferences:** Theme preference (`system` / `light` / `dark`), Language (`en` / `vi`), Currency (`USD` / `VND`), Distance unit (`km` / `mi`), Notification preferences (`tripReminders`, `itineraryReminders`).
  - Notification toggles default off and are explicitly labelled as app-local preferences; they do not claim OS permission, native configuration, or scheduled alerts. Existing contracts do not require process-restart persistence, so no backend/native notification system was introduced.
- **Stitch Sources:**
  - Profile: `projects/10069552738311964263`, screen `52ec564262214ec3b91b5c62daa03d6f`
  - Edit Profile: screen `49c6b6a2c6284f169d1c6140037cebdd`
  - Settings: screen `27bdea676ae041ecb09a7bc987363b9e`
  - Language Settings: screen `040103dc04894ee0bc3aff41cd37534e`
  - Help & Support: screen `92e619bfeb504afebd6d87fccbf90f4c`
  - Sign Out Modal: screen `c69da60c4d474121b8b71d5b8de57aad`
  - Delete Account Modal: screen `d2cb583265f14761b79be9ea5d6be835`
- **Verification:** Automated tests PASS (`tests/ProfileScreen.test.tsx`, `tests/SettingsScreen.test.tsx`, `tests/AuthProvider.test.tsx`).

### 25.1 Historical Codex verification result (2026-08-23) — SUPERSEDED

- **Configured remote migration state: FAIL / NOT APPLIED.** Read-only PostgREST probes against the same Supabase URL/key used by `mobile/.env` returned:
  - `profiles.home_country`: PostgreSQL `42703` (`column profiles.home_country does not exist`);
  - `get_user_trip_stats()`: `PGRST202` / HTTP 404;
  - `delete_user_account()`: `PGRST202` / HTTP 404.
  The Supabase migration-history CLI could not be used because this environment has no `SUPABASE_ACCESS_TOKEN`; the three schema probes nevertheless prove that the migration contract is absent from the configured remote schema.
- **`get_user_trip_stats()` live authenticated verification: BLOCKED.** No real result shape/value or cross-user isolation claim is valid while the function is absent remotely. The operator account was not modified.
- **`delete_user_account()` disposable-user verification: NOT STARTED for safety.** Creating a disposable account while the deletion RPC is absent would not provide the required self-cleanup path. No account or owner data was created, and the operator account was never used destructively.
- **Local security audit:** the function source uses `SECURITY DEFINER`, `SET search_path = ''`, derives only `auth.uid()`, guards null auth, and deletes only `auth.users.id = v_uid`. Existing foreign keys are `ON DELETE CASCADE` from `profiles`/`trips`/`saved_places` to `auth.users`, and from itinerary children to their parent graph. However, this migration only grants to `authenticated` and does **not** explicitly revoke default EXECUTE from `PUBLIC`/`anon`, contrary to the handoff claim and the established migration convention. Do not deploy unchanged.
- **Mobile data audit:** Profile identity/email and Edit Profile are wired to Auth/Supabase repositories, and `AuthProvider` clears user/profile state after successful sign-out. However, the current remote schema makes profile reads fail because the repository selects `home_country`. `useProfile.savedCount` still reads `savedPlacesStore`, whose initial state contains four mock place IDs, so the Profile Saved value is not production-backed. Theme, language, currency, distance and notification values are in-memory providers/store only; notification toggles have no OS-backed permission/state side effect.
- **Android runtime: BLOCKED / NOT VERIFIED.** No Android device was connected. A bounded attempt to start the documented `Medium_Phone` AVD did not register an ADB device and was terminated; therefore no operator-account Profile/Edit Profile/reload/Settings/sign-out claim is made.
- **Stitch comparison: BLOCKED.** Current screen IDs remain documented, but no Stitch MCP capability was available in this Codex environment and there was no Android runtime capture to compare. No UI correction or redesign was performed.
- **Quality gates:** `npm run lint` PASS; `npm run typecheck` PASS; Jest PASS (44/45 suites, 325/326 tests; one suite/test skipped); Expo Doctor PASS (21/21). Jest emitted handled `IntegrationError` console output from Profile tests but no test failed.
- **Database tests:** the full persistence runner was attempted twice. Both runs were interrupted by Docker/PostgreSQL `terminating connection due to administrator command`, so the full suite has no PASS for this session. A separate isolated disposable-PostgreSQL smoke did PASS the new functions: owner A received `{ "trips_count": 2 }`, owner B received `{ "trips_count": 1 }`, deleting A removed A's auth/profile/trip/saved-place rows, and B plus B's trip remained. The same smoke proved the grant defect: `anon` and `PUBLIC` both currently have EXECUTE on `delete_user_account()`, and `anon` has EXECUTE on `get_user_trip_stats()` in a fresh application of the migration. This smoke was ephemeral and did not test remote session invalidation or persist a new repository test file.
- **Roadmap decision:** keep INT-P6 OPEN / PAUSED, keep INT-P7 ACTIVE, keep Profile / Settings capability **NOT COMPLETE**, and do not close all INT-P7.

### 25.2 Historical focused blocker remediation result (2026-08-23) — SUPERSEDED

- **Migration-history decision:** the original migration is untracked in the current worktree, has no repository commit history, and is absent from the configured remote contract. It was applied only to disposable local PostgreSQL verification databases. It was not rewritten; security remediation is forward-only in `20260823000000_harden_profile_stats_and_deletion.sql`. No migration history was reset or repaired.
- **RPC security fix:** the corrective migration recreates `get_user_trip_stats()` as `SECURITY INVOKER` and `delete_user_account()` as `SECURITY DEFINER`, both with `SET search_path = ''` and an explicit null `auth.uid()` guard. Account deletion remains exactly caller-scoped through `delete from auth.users where id = v_uid`. Both functions are revoked from `PUBLIC`, `anon`, and `authenticated`, then granted only to `authenticated`; neither accepts a user ID.
- **Dedicated database evidence:** `supabase/tests/profile-settings/run.ps1` PASS on fresh install and upgrade paths (`PROFILE_SETTINGS_CONTRACT_PASS`, `PROFILE_SETTINGS_UPGRADE_PASS`, `PROFILE_SETTINGS_TESTS_PASS`). Tests execute the actual privilege matrix (authenticated allowed, `anon` denied, unprivileged role denied, no PUBLIC ACL), exact A/B owner stats, unauthenticated delete rejection, A-only cascade across auth/profile/trip/day/item/saved-place rows, and preservation of User B. Persistence and Saved Trips base contracts also PASS on a stable foreground PostgreSQL process. The legacy detached-container persistence runner remains environmentally interrupted and is not reported as PASS.
- **Profile Saved-count fix:** `get_user_trip_stats()` now returns exact owner-scoped `{ trips_count, saved_places_count }`; mobile validates the exact shape and maps it to `{ tripsCount, savedPlacesCount }`. `useProfile` no longer imports or subscribes to the fixture-initialized Saved Places store, so Profile cannot derive its Saved value from fixture IDs or a partial paginated page.
- **Settings semantics:** theme, language, currency, distance, and notification choices remain intentionally local preferences. Notification defaults are off; English/Vietnamese descriptions explicitly state that native/OS notifications are not configured or scheduled.
- **Quality gates:** lint PASS; typecheck PASS; Jest PASS (44/45 suites, 327/328 tests, one existing suite/test skipped); Expo Doctor PASS (21/21).
- **Remote deployment: BLOCKED / NOT ATTEMPTED.** The linked project is present, but the CLI returned `LegacyPlatformAuthRequiredError` because no `SUPABASE_ACCESS_TOKEN` is available. Fresh PostgREST probes therefore still show `profiles.home_country` as `42703` and both RPCs as `PGRST202`. No remote mutation was attempted.
- **Live verification:** authenticated `get_user_trip_stats()` and disposable `delete_user_account()` verification remain pending because the corrected RPCs are not deployed. No disposable user/data was created, no operator destructive action occurred, and no orphan test data was left.
- **Android runtime:** an emulator became available. Settings displayed the current local values (Vietnamese, USD, kilometres, system theme), explicit local-only notification descriptions, and the Delete Account confirmation was opened then cancelled without invoking deletion. Operator sign-out PASS and returned to Welcome with no stale profile UI. Profile loaded the real authenticated email but failed its profile repository request with `Unable to load your profile` because remote `home_country` is absent; real profile/home-country/stats/Edit Profile reload verification therefore remains FAIL/BLOCKED, not PASS.
- **Stitch:** no UI redesign or Stitch correction was made because the observed blocker is remote schema availability, not a verified Android-versus-current-Stitch visual discrepancy.
- **Roadmap decision:** preserve INT-P0 through INT-P5 COMPLETE, INT-P6 OPEN / PAUSED, and INT-P7 ACTIVE. Profile / Settings remains NOT COMPLETE until corrected remote deployment, authenticated/live disposable verification, and the blocked Android Profile gates pass.

### 25.3 Historical remote deployment and Stitch continuation (2026-08-23) — SUPERSEDED

- **CLI authorization recheck:** `SUPABASE_ACCESS_TOKEN` is still absent from the execution environment. `npx supabase migration list` again returned `LegacyPlatformAuthRequiredError`. The linked project cannot be deployed to through the CLI, so no migration, schema-cache action, or other remote mutation was attempted.
- **Authoritative remote contract recheck:** read-only PostgREST probes again returned `profiles.home_country` HTTP 400 / `42703`, `get_user_trip_stats()` HTTP 404 / `PGRST202`, and `delete_user_account()` HTTP 404 / `PGRST202`. Thus both Profile/Settings migrations (`20260822020000` and `20260823000000`) remain required remote deployments.
- **Safety decision:** no authenticated live stats test, no disposable account creation, no destructive deletion call, and no operator account mutation were performed while the corrected remote contract is absent.
- **Stitch MCP:** no Stitch MCP tool is available in this Codex session. The mandatory current-screen enumeration and Android-versus-Stitch comparison are therefore **STITCH VERIFIED = BLOCKED**. No visual correction or speculative UI change was made.
- **Android continuation:** no new authenticated Profile runtime run was possible because the prerequisite remote contract is absent; prior Settings/sign-out evidence remains historical evidence only. Profile real-data, Edit Profile persistence, and current Stitch comparison remain pending after deployment.
- **Roadmap decision:** INT-P7 remains ACTIVE and NOT COMPLETE. Do not start INT-P8/INT-P9 or resume INT-P6 from this task.

### 25.4 Historical remote/live and Android continuation (2026-08-23) — SUPERSEDED SNAPSHOT

This section supersedes the remote-blocked conclusions in 25.1–25.3. Those entries remain historical evidence of the pre-deployment state.

- **Remote deployment and contract:** `20260822020000_profile_stats_and_deletion.sql` and `20260823000000_harden_profile_stats_and_deletion.sql` are present remotely after `npx supabase db push`. Remote probes confirm `profiles.home_country`, `get_user_trip_stats()`, and `delete_user_account()` resolve; anonymous execution is rejected.
- **Live disposable safety verification:** confirmed disposable A/B users authenticated with distinct identities. Exact owner stats were A = 1 trip / 1 Saved Place and B = 2 trips / 1 Saved Place; no cross-user count leaked. Deleting A as A removed A's Auth user, profile, trip/day/item graph, and Saved Place; the old A session was rejected; B remained usable and was then cleaned up. No disposable user remains.
- **Android Profile:** operator Profile loads real display name, authenticated email, and counts. Read-only backend cross-check matched the displayed 2 Trips and 4 Saved Places. Navigation away/back retained those values. A reversible display-name edit saved remotely, reloaded, and was restored remotely. The operator's `home_country` was empty and the current Profile/Edit Profile implementation exposes no home-country field; that sub-gate is not passed. The owner-tagged Profile state remains the implementation safeguard against cross-account stale stats; no fresh Android account-switch runtime was performed in this continuation.
- **Android Settings:** Appearance selection (Light, then System Default restore), Language (English, then Vietnamese restore), Currency (VND, then USD restore), and Distance (Miles, then kilometres restore) rendered and changed as local preferences. Help & Support loaded. Notification descriptions explicitly say they are app-only preferences with no configured native/OS notifications. The Delete Account confirmation opened and was cancelled; the operator account was not deleted. Sign-out was not rerun in this continuation; prior sign-out evidence remains historical.
- **Weather Android:** FAIL. The existing upcoming operator trip starts 2026-08-25 and contains two VERIFIED stops. Trip Detail loaded but displayed no weather badge. Source inspection confirms `useTripWeather` requests only `durationDays` days beginning today (one day from 2026-08-23), then looks for the active trip date; the 2026-08-25 day is absent from that response. This is a date-window defect, not a provider-fallback PASS.
- **Stitch:** **STITCH VERIFIED = BLOCKED.** This Codex environment has no Stitch MCP tool. Historical IDs listed above were not treated as current sources, no current screens/states could be enumerated, and no speculative visual correction was made.
- **Quality gates:** no production source changed in this continuation, so the earlier lint/typecheck/Jest/Expo Doctor and focused database-contract PASS results are prior verified evidence, not fresh executions.
- **Roadmap decision:** INT-P0–INT-P5 remain COMPLETE; INT-P6 remains OPEN / PAUSED; INT-P7 remains ACTIVE and NOT COMPLETE; INT-P8/INT-P9 remain NOT STARTED.

### 25.5 Verified Weather remediation and continuation evidence (2026-08-23) — PASS

- **Root cause fixed:** `useTripWeather` had requested only `durationDays` beginning today, so a future active itinerary date could not appear in the provider response. It now derives the inclusive bounded request length from local today through the latest itinerary day. It does not call the provider when the itinerary is wholly past or exceeds Open-Meteo's 16-day horizon; weather remains optional and Trip Detail remains usable.
- **Automated regression:** deterministic date-input tests PASS for same-day, future (2026-08-23 → 2026-08-25), multi-day future, out-of-horizon unavailable, and wrong-day non-leakage. Existing provider-failure optional fallback and Trip Detail weather rendering tests PASS.
- **Android live verification:** after restarting the development client, the existing 2026-08-25 operator trip with two VERIFIED stops rendered the active-date Open-Meteo badge: `Rain, 32° / 26°`, maximum precipitation probability `61%`. No fixture/fake value was introduced.
- **Quality gates:** fresh lint PASS, typecheck PASS, Jest PASS (44/45 suites, 332/333 tests; one pre-existing skip), Expo Doctor PASS (21/21).
- **Stitch and Home Country:** still blocked/pending as recorded in 25.4; no Profile/Settings UI correction was made without Stitch MCP.

### 25.6 Historical Stitch MCP connection diagnosis (2026-08-23) — SUPERSEDED

- **Session inspection:** the active Codex tool manifest has no callable Stitch tool/server and the MCP resource inventory contains no `stitch` server.
- **Configuration inspection:** `C:\Users\PC\.codex\config.toml` exists but has no `[mcp_servers.stitch]` section. The TripWise workspace has no project-local MCP configuration; `supabase/config.toml` is unrelated. No secret value was read or output.
- **Historical connection result:** `STITCH_MCP_CONNECTION = BLOCKED_BY_EXECUTION_ENVIRONMENT`. This is retained only as pre-availability evidence and is superseded by the verified global connection recorded in the authoritative section below.
- **Scope result:** Profile/Settings, Saved Places, Photos, and Ratings visual audits did not run; Home Country UI remains undecided and no UI source was changed.

---

# START HERE — NEXT CODEX SESSION

This is the authoritative continuation section. Older “Exact next action”, “Recommended First Task”, and pre-availability Stitch blocker sections above are historical/superseded where they conflict with this section.

## NEXT SESSION OWNER

Codex — Integration.

## NEXT SESSION EXACT TASK

`INT-P7 — Stitch MCP Visual Audit + Profile Home Country Contract Resolution + Formal Closure Readiness (BLOCKED pending access to current Stitch visual artifacts)`

Do not redo already verified backend, provider, weather, Saved Places, photo, rating, migration, account-deletion, or runtime work. Do not modify Profile/Settings UI in this documentation-sync session, perform new Stitch remediation now, start INT-P8/INT-P9, close INT-P6, or prematurely close INT-P7.

## CANONICAL ROADMAP STATE

```text
INT-P0: COMPLETE
INT-P1: COMPLETE
INT-P2: COMPLETE
INT-P3: COMPLETE
INT-P4: COMPLETE
INT-P5: COMPLETE

INT-P6: OPEN / PAUSED
INT-P7: ACTIVE
INT-P8: NOT STARTED
INT-P9: NOT STARTED
```

Existing INT-P2 waivers remain accepted and must not be reopened: public signup live quota/rate-limit verification and Android real-process kill/restart session-restore smoke.

## VERIFIED INT-P7 EVIDENCE TO PRESERVE

| Capability | Implemented | Automated | Remote/Live | Android | Current Stitch | Result |
|---|---|---|---|---|---|---|
| Weather | PASS | PASS (2 suites, 27 tests) | PASS | PASS (`2026-08-25`, Rain, 32° / 26°, 61%) | N/A unless fidelity is audited | PASS runtime/data |
| Saved Places | PASS | PASS | PASS | PASS (real populated/empty/reload; latest operator count 4) | PARTIAL (current artifacts inspected; Android comparison pending) | PARTIAL closure |
| Place Photos | PASS | PASS | PASS | PASS | PARTIAL (current artifacts inspected; Android comparison pending) | PARTIAL closure |
| Ratings / Metadata | PASS | PASS | PASS | PASS | PARTIAL (current artifacts inspected; Android comparison pending) | PARTIAL closure |
| Profile / Settings | PASS | PASS | PASS | PARTIAL (Home Country change not Android-verified) | PARTIAL (current artifacts inspected) | PARTIAL closure |

Weather is no longer an INT-P7 blocker. Its bounded forecast window covers today through the latest required itinerary date, supports future dates within Open-Meteo’s 16-day horizon, maps only the active itinerary date, and has no mock fallback. Profile remote migrations are applied and verified: `20260822020000_profile_stats_and_deletion.sql` and `20260823000000_harden_profile_stats_and_deletion.sql`. Remote RPC/security, disposable A/B owner isolation and deletion cascade, real Profile counts, reversible display-name persistence, and current Settings runtime behavior are PASS. Android Profile remains PARTIAL only because the `home_country` UI contract is undecided; the operator value is blank and no field is currently rendered. Do not infer a UI defect from that blank value.

Fresh mobile gates already recorded after Weather remediation: lint PASS; typecheck PASS; Jest PASS (44/45 suites, 332/333 tests, one pre-existing skipped suite/test); Expo Doctor PASS (21/21); `git diff --check` PASS. Expo Doctor’s initial npm-cache EPERM was resolved with a temporary local cache and is not a production regression. Do not claim fresh gates in the next session unless rerun.

## STITCH MCP — MANDATORY FIRST ACTION

The global Codex Stitch MCP configuration is now available and verified safe:

```text
STITCH_MCP_CONNECTION = PASS
list_projects = PASS
TripWise Design System = projects/10069552738311964263
```

The next Codex session must still verify that the Stitch server is callable in its own tool manifest before UI work. Do not print, copy, or document API keys or secret headers. If the server is unexpectedly unavailable, record `STITCH VERIFIED = BLOCKED` and do not use historical IDs as proof.

If callable, enumerate the current TripWise project and exact current screens/states, classify obsolete/superseded variants, and use only current IDs as visual authority. Historical IDs below remain search hints only and never override direct enumeration.

### 2026-08-24 current-session result

- `STITCH_MCP_CONNECTION = PASS`: the Stitch server is callable in this session's manifest; `list_projects`, `get_project`, and `list_screens` all succeeded for `projects/10069552738311964263`.
- Current-screen metadata inventory was retrieved directly: Profile `52ec564262214ec3b91b5c62daa03d6f`; Edit Profile `49c6b6a2c6284f169d1c6140037cebdd`; Settings `27bdea676ae041ecb09a7bc987363b9e`; Language `d2cb583265f14761b79be9ea5d6be835`; Currency `c69da60c4d474121b8b71d5b8de57aad`; Help & Support `92e619bfeb504afebd6d87fccbf90f4c`; Sign Out Confirmation `040103dc04894ee0bc3aff41cd37534e`; Delete Account Confirmation `2f74fdf1e9314c448c49eb7d14447c32`; Saved Places `3e59b6c7b2e646feb189eb8a313b6a6e`; Saved Empty State `aa0abf7fea0f4e05bebdbf471c9d7ae3`; Place Detail `4a1161c5a2be4ec48989e64e9f0f9c34`; Trip Detail `1e86508f0dd0413db877d859125b630f`. No screen titled Appearance is present. The additional `8ced1424cd284aaaaa8359d45b7f7b25` is titled Trip Detail — Animated and remains a current project asset, but cannot be selected as the active production variant without visual inspection.
- Historical mapping labels at lines 1027–1030 are superseded by direct enumeration: `040103…` is Sign Out Confirmation, `c69da6…` is Currency, `d2cb58…` is Language, and the direct Delete Account Confirmation ID is `2f74fd…`; those old labels are rejected as visual authority.
- `STITCH_VISUAL_ARTIFACT_ACCESS = PASS` (2026-08-24): all twelve required current `get_screen` calls returned artifacts and dimensions, and the local HTML/image artifacts were validated and pixel-inspected. The repository helper `.agents/skills/react-native/scripts/fetch-stitch.sh` was correctly attempted first; Git Bash ran it, but Schannel curl failed before HTTP (`curl (35)`, no HTTP status/redirect/local target). A normal certificate-validating Node 24/OpenSSL 3.5.7 transport then followed the exact current signed redirects: each HTML returned HTTP 200 and valid non-empty HTML, and each screenshot returned HTTP 200 JPEG pixels. The locally generated PNG visual copies are valid images; signed URLs, secrets and headers were neither logged nor persisted. Metadata without signed URLs is in `.stitch/metadata.json`. The earlier historical artifacts are preserved and rejected as current authority.
- Current visual inventory: Profile `52ec564262214ec3b91b5c62daa03d6f` (780×2580); Edit Profile `49c6b6a2c6284f169d1c6140037cebdd` (780×1768); Settings `27bdea676ae041ecb09a7bc987363b9e` (780×1768); Language `d2cb583265f14761b79be9ea5d6be835` (780×1768); Currency `c69da60c4d474121b8b71d5b8de57aad` (780×1894); Help & Support `92e619bfeb504afebd6d87fccbf90f4c` (780×1768); Sign Out Confirmation `040103dc04894ee0bc3aff41cd37534e` (780×1768); Delete Account Confirmation `2f74fdf1e9314c448c49eb7d14447c32` (780×1768); Saved Places `3e59b6c7b2e646feb189eb8a313b6a6e` (780×3012); Saved Empty State `aa0abf7fea0f4e05bebdbf471c9d7ae3` (780×1768); Place Detail `4a1161c5a2be4ec48989e64e9f0f9c34` (780×3794); Trip Detail `1e86508f0dd0413db877d859125b630f` (780×2802). The current-but-uninspected `8ced1424cd284aaaaa8359d45b7f7b25` Trip Detail — Animated is not selected as a production variant. Historical mapping labels and all prior differently identified local HTML files remain superseded/rejected.
- Home Country contract is **B — Edit Profile edits Home Country**. Current Profile contains no country presentation; current Edit Profile contains a labelled `Home country` control with the `public` icon. `EditProfileScreen` now binds editable country text to `profile.homeCountry`, allows blank state without a fixture fallback, trims on save through the existing remote repository boundary, and keeps EN/VI plus semantic theme tokens. Focused screen/repository tests PASS.
- Android re-verification is pending: Android Studio exposes the Running Devices window, but approved Windows automation was denied control of Android Studio before a capture or input. No operator profile field was changed. Earlier Profile/Settings Android evidence remains historical, not fresh; the required reversible blank-country persistence verification still needs a permitted Android session.

## CURRENT STITCH AUDIT SCOPE

Enumerate and inspect at least:

- Profile, Edit Profile, and any country/home-country state.
- Settings, Appearance, Language, Currency, Help & Support, Sign Out confirmation, and Delete Account confirmation.
- Saved Places populated and empty states.
- Production consumers displaying Google place photos, rating, and user rating count.

## HOME COUNTRY DECISION

Using current Stitch, choose exactly one:

```text
A. Profile displays country
B. Edit Profile edits country
C. Both
D. Neither
```

Do not infer the answer from the database column. If country is required by current Stitch, implement only the smallest exact mapping using real `profile.homeCountry`, clean blank/null handling, remote persistence when editable, EN/VI localization, and semantic theme tokens. If Stitch does not use country, do not invent UI; reconcile the stale “required for Stitch display” wording.

## CURRENT STITCH VISUAL AUDIT AND ANDROID RE-VERIFICATION

With real Android production data, compare current Stitch and Android for Profile, Edit Profile, the Settings family, Saved Places populated/empty, and photo/rating consumers. Compare layout, hierarchy, and components only; real data values do not need to match sample values. Never alter real counts, names, or ratings to match a mock and fix only verified discrepancies. Preserve TypeScript strictness, no `any`, Expo, React Navigation, MaterialIcons, semantic theme tokens, centralized EN/VI localization, no raw provider payload in JSX, and no production mock fallback.

If Home Country or any visual source changes, rerun affected Android verification. If editable country is required: record the original operator value, set a safe temporary valid value, save, reload, verify remote persistence, restore the original, reload, and confirm restoration. Never alter operator email/password or delete the operator account.

## QUALITY AND CLOSURE RULES

When production source changes, run:

```powershell
cd mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

At the end, rebuild the strict matrix above using only `PASS`, `PARTIAL`, `FAIL`, `BLOCKED`, or `PENDING`. If any required gate is not PASS:

```text
INT-P7 = ACTIVE
```

and report the smallest remaining blocker. If every required INT-P7 gate passes:

```text
INT-P7 READY FOR FORMAL CLOSURE
```

Do not automatically start INT-P8 or switch to INT-P6. The user chooses the next track after INT-P7 is shown.

## BOUNDARIES

`INT-P6 = OPEN / PAUSED` remains independent and must not be closed merely because INT-P7 finishes. `INT-P8 = NOT STARTED` and `INT-P9 = NOT STARTED`; do not start either automatically. INT-P8 remains its own formal production mock-runtime audit.
