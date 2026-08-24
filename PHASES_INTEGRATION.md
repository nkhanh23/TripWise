# TripWise React Native FE ↔ BE Integration Roadmap

**Owner / Agent: Codex — FE ↔ BE Integration (historical/general owner)**
**Status: INT-P0 through INT-P9 COMPLETE — Integration Track COMPLETE**

Roadmap này là active source of truth cho integration planning, nhưng không cấp quyền bắt đầu implementation.

## 1. Start gate

Integration chỉ bắt đầu khi user yêu cầu rõ ràng.

- Không mặc định phải chờ 100% mọi FE/BE phase.
- Trước mỗi INT phase, dependency BE contract và FE screen/model tương ứng phải ready và được verify.
- Giữ nguyên React Native UI đã duyệt; không redesign Stitch screens.
- Không sửa verified BE contract để khớp UI một cách ad hoc; mismatch phải được ghi và giải quyết có owner.
- Khi chưa được phép bắt đầu, FE tiếp tục mock/local data và BE tiếp tục backend độc lập.

## 2. Status overview

- **Authorization date:** 2026-08-20 (INT-P7 temporarily authorized on 2026-08-22)
- **Current:** Integration Track COMPLETE
- **Completed phases:** INT-P0, INT-P1, INT-P2, INT-P3, INT-P4, INT-P5, INT-P6, INT-P7, INT-P8, INT-P9


Repository đã có pre-roadmap React Native Supabase Auth/session/profile và typed `generateTrip()` client từ P2/P3. INT-P0 đã audit các foundation này nhưng chưa nối production UI/data flows; mọi wiring vẫn phải theo đúng phase Integration.

---

## [x] INT-P0 — Integration Readiness & Contract Freeze

- [x] Đọc `HANDOFF_BE.md`, `HANDOFF_FE.md`, `PHASES_BE.md`, `PHASES_FE.md`.
- [x] Xác nhận deployed BE endpoints/functions và auth requirements.
- [x] Xác nhận TypeScript models, services/repositories/hooks và consuming screens.
- [x] Tạo mismatch matrix: BE DTO ↔ TypeScript model/UI state.
- [x] Freeze request/response/error/version contracts cần cho phase tiếp theo.
- [x] Ghi dependency readiness và blocker; không implement khi dependency chưa ready.

### Done when

- Contract checklist có owner/status cho từng mismatch.
- Không còn field/auth/error semantic mơ hồ trong scope phase kế tiếp.

---

## [x] INT-P1 — React Native Backend Infrastructure

- [x] Supabase/backend client setup bằng environment/config an toàn.
- [x] Auth/session adapter tại infrastructure boundary.
- [x] Repository abstractions và remote data-source implementations.
- [x] DTO validation/mapping boundary.
- [x] Stable error mapping sang UI/domain errors.
- [x] Timeout, bounded retry và lifecycle cancellation.
- [x] Không để widgets gọi Supabase/Edge Function trực tiếp.
- [x] Không redesign UI.

---

## [x] INT-P2 — Authentication Integration

- [x] Nối React Native Auth UI với Supabase Auth thật.
- [x] Initial session bootstrap/restore không flash sai navigation.
- [x] Login/register/logout.
- [x] Profile fetch/update theo RLS.
- [x] Loading/error/confirmation states bằng dữ liệu thật.
- [x] Restart/session/sign-out lifecycle evidence (Android process restart waived by user).
- [x] Không log password, JWT hoặc refresh token.

---

## [x] INT-P3 — Trip Generation Integration

- [x] Create Trip UI gọi authenticated `generate-trip`.
- [x] Map TypeScript form model → GenerateTrip request DTO.
- [x] Validate/map generated response → React Native itinerary preview model.
- [x] Loading, timeout, retry và stable error UX.
- [x] Preserve existing React Native screen structure/Stitch fidelity.
- [x] Generation-only flow không persist trip trong INT-P3.

---

## [x] INT-P4 — Persistence Integration

- [x] Create/save trip qua BE-P4 contract.
- [x] Persist itinerary days/items atomically.
- [x] Saved trips list/detail wiring.
- [x] Ownership/RLS verification.
- [x] Idempotency/duplicate handling.
- [x] Partial-failure and retry UX.
- [x] Reopen saved trip smoke test.

---

## [x] INT-P5 — Places Integration

- [x] Replace mock place repository/source for the supported resolve-place flow.
- [x] Place identity and unresolved-place behavior.
- [x] Verified coordinates, address/category snapshot.
- [x] Place details only within the active backend/provider contract.
- [x] Provider quota/error/loading/empty states.
- [x] Không tin Gemini suggestion như verified place metadata.

---

---

## [x] INT-P6 — Map & Route Integration (COMPLETE)

- [x] Render real verified coordinates.
- [x] Wire OSRM/route source theo BE-P7 decision.
- [x] Polyline and ordered markers.
- [x] Timeout/error/fallback behavior.
- [x] Map rebuild/performance regression test.

Final closure audit (2026-08-24) confirms the production Map/Route path uses only persisted `VERIFIED` coordinates, orders markers by day/item position, maps OSRM's lon/lat GeoJSON boundary safely, and omits unresolved stops rather than fabricating route data. `TripMapScreen` loads UUID saved-trip detail through `SupabaseSavedTripsRepository`, while its fixture canvas remains explicit fixture-only behavior. `RoutePreviewScreen` now permits mock metrics/geometry only through explicit `fixtureMode` or `customRoute`; a production navigation without at least two verified coordinates presents the unavailable state rather than a mock route. `OsrmRouteRepository` remains driving-only with 2–25 validated coordinates, timeout/cancellation/bounded retry and safe error mapping. Fresh Android verification on the operator's real Bangkok trip rendered Google Map markers `1. Chùa Arun`, `2. The Grand Palace`, then a real OSRM Route Preview (`Driving`, `3.9 km • 8 min`) with map markers and no redbox. Fresh source-change gates PASS: lint, typecheck, full Jest (44/45 suites and 333/334 tests PASS; one intentional skip), Expo Doctor (21/21), and `git diff --check`. **INT-P6 COMPLETE.**

---

## [x] INT-P7 — Remaining Real Data Integration (COMPLETE)

- [x] Weather theo BE-P8/client ownership decision (Open-Meteo direct client, validated coordinates, bounded date window, active-date Trip Detail presentation; automated and Android/live evidence PASS).
- [x] Saved places persistence (`public.saved_places`, `list_saved_places`, `save_place`, `unsave_place`, owner RLS, idempotency, real populated/empty/reload states; implementation, automated, remote/live, Android and current Stitch PASS).
- [x] Google Place Photos (`get-place-photo` Edge Function proxy with skipHttpRedirect, owner RLS verification; implementation, automated, remote/live, Android and current Stitch PASS).
- [x] Google Place Ratings & Metadata (`get-place-metadata` Edge Function proxy, real Places API New rating + count, 24h mobile in-memory cache; authorized Saved Places consumer, implementation, automated, remote/live, Android and current Stitch PASS).
- [x] Profile & Settings real data & account deletion (`home_country` column, `get_user_trip_stats()` RPC, `delete_user_account()` RPC, local preference separation; remote/live, Android and current Stitch PASS).
- [x] INT-P7 current Stitch visual audit, Home Country contract resolution, Android re-verification, and formal closure. `STITCH_VISUAL_ARTIFACT_ACCESS = PASS`; all twelve current artifacts were retrieved and inspected. Home Country contract **B — Edit Profile only** and reversible remote-backed Android save/reload/restore PASS. Settings root discrepancy is resolved. Fresh gates after the production source change PASS: lint, typecheck, full Jest (44/45 suites and 332/333 tests PASS; one pre-existing skipped suite/test), Expo Doctor (21/21), and `git diff --check`. Ratings/Metadata authorized consumer is **Saved Places cards**: real rating is rendered, missing rating is hidden without fake `0.0`, and `userRatingCount` is intentionally preserved in provider payload but omitted from card UI per current Stitch. `PlaceDetailScreen` using `getMockPlaceDetail` remains an **INT-P8 deferred mock-runtime item**, not an INT-P7 blocker. **INT-P7 COMPLETE.** Historical screen IDs/artifacts remain non-authoritative.
- [x] INT-P7 Final Verification, Live Regression & Formal Closure.

---

## [x] INT-P8 — Remove Mock Runtime Dependencies (COMPLETE)

- [x] Production dependency injection no longer selects mock repositories or fixture data: Home reads one paginated `SupabaseSavedTripsRepository` list, Explore defaults to an empty safe canvas, Place Detail requires `fixtureMode`/`customData`, and UUID Add Place shows an honest unavailable state without mock lookup/list/mutation.
- [x] Explicit fixtures remain available for deterministic component, visual and stress tests; My Trips, Trip Detail, Trip Map and Route Preview retain explicit fixture boundaries only.
- [x] Saved Places and Profile production paths remain remote-backed; `savedPlacesStore` and `mockProfile` are fixture-only. Planner styles/options and curated destination suggestions are static local configuration, not provider search results. The Login demo quick-fill fixture was removed from production runtime.
- [x] Final mock import audit has zero `PRODUCTION_BLOCKER`; retained uses are `EXPLICIT_FIXTURE_ALLOWED`, `TEST_ONLY`, `STATIC_CONFIG`, or `UNSUPPORTED_CAPABILITY_SAFE_STATE`.
- [x] Regression tests prove normal Home/Explore/Place Detail/UUID Add Place paths do not select mock data, while explicit fixtures still render. Fresh gates PASS: lint, typecheck, full Jest (44/45 suites and 338/339 tests PASS; one intentional skip), Expo Doctor (21/21), and `git diff --check`.
- [x] Android smoke on `emulator-5554` PASS: Home rendered the operator trip, Explore had no fixture places, My Trips rendered real data, UUID Add Place was unavailable without fake results, and Saved Places rendered a real empty state without fixtures. **INT-P8 COMPLETE.**

---

## [x] INT-P9 — Integration & End-to-End QA (COMPLETE)

- [x] Auth/register/login/session restore/logout; preserved the two accepted INT-P2 waivers.
- [x] Generate-trip validated production repository, frozen request/response mapping, concurrency guard and safe retry; unchanged bounded live evidence retained without another Gemini charge.
- [x] Atomic/idempotent `create_trip_graph`, keyset Saved Trips list, UUID detail reopen and unresolved-place semantics verified by current automated contracts plus unchanged live evidence.
- [x] Place identity/resolution, verified coordinates, photos/metadata, Saved Places, Profile/stats and disposable A/B RLS/security evidence audited with no contract change requiring destructive rerun.
- [x] Map/Route, Weather and representative network/provider failure states PASS; offline support is honestly limited to safe unavailable/error behavior and persisted server snapshots—no local offline database is claimed.
- [x] Fresh Android smoke PASS on `emulator-5554`: authenticated Home with real operator trip, fixture-free Explore, real My Trips/UUID Trip Detail, UUID Add Place safe unavailable, fixture-free Saved empty state, Profile and current Settings hierarchy. No operator mutation or sign-out was performed.
- [x] Current Stitch MCP/project/screens re-enumerated; current screen hierarchy remains consistent with the accepted INT-P7/P8 visual boundaries and no redesign/fake sample data was introduced.
- [x] Secret/bundle/log and production-mock audits found no server secret, sensitive logging or silent normal-production fixture fallback. `NO_SERVER_SECRET_IN_MOBILE = PASS`.
- [x] Fresh final gates PASS: lint, typecheck, full Jest (44/45 suites and 338/339 tests; one intentional skip), Expo Doctor (21/21), and `git diff --check`.
- [x] iOS runtime is `BLOCKED_BY_ENVIRONMENT` on Windows and deferred under ADR-019; Android is the current runtime target and the code remains future-iOS compatible. `INT_P9_CLOSURE_READY = YES`. **Integration Track COMPLETE.**

## 3. Contract checklist

| Endpoint / Edge Function | Method | Auth | Request DTO | Response DTO | Error codes | TypeScript model | Service/repository/hook | Consumer | Status | Known mismatch |
|---|---|---|---|---|---|---|---|---|---|---|
| Supabase Auth/session | SDK | Supabase Auth | email/password | safe user/session model | mapped auth errors | `AuthenticatedSession` | `SupabaseAuthRepository` | Auth stack, app guard | INTEGRATED | Public signup live smoke waived/deferred by user because Supabase email quota returned 429 |
| `profiles` | PostgREST | JWT + RLS | owner ID; `display_name`, `avatar_url`, `home_country` | validated profile/null | safe PostgREST mapping | `ProfileTransport`, `Profile` | `SupabaseProfileRepository` | Profile/Edit Profile | INTEGRATED | `home_country` added for Stitch country display; local preferences remain client-side |
| `generate-trip` | POST Edge Function | JWT | `GenerateTripRequest` | validated `{ data: GeneratedTrip }` | six stable AI codes | canonical generation contracts | `SupabaseTripGenerationRepository` | Create Trip Wizard | INTEGRATED | v9 ACTIVE; authenticated live generation, validator/mapper, unresolved semantics and zero-write smoke PASS |
| `create_trip_graph` | RPC | JWT + RLS | idempotency key + unresolved graph | UUID | `TW001`-`TW005` | `PersistTripCommand` | `SupabaseTripPersistenceRepository` | Create Trip success/save | INTEGRATED | Live save/idempotency/RLS/cleanup PASS |
| `list_saved_trips` | RPC | JWT + RLS | limit + keyset cursor | `{ items, nextCursor }` | SQLSTATE validation/auth | `SavedTripsPage` | `SupabaseSavedTripsRepository` | My Trips | INTEGRATED | Live owner visibility/cross-user isolation PASS |
| `get_saved_trip_detail` | RPC | JWT + RLS | trip UUID | compact validated graph/null | safe SQLSTATE mapping | `SavedTripDetail` | `SupabaseSavedTripsRepository` | Trip Detail/Trip Map | INTEGRATED | Live save → reopen/detail PASS |
| `update_itinerary_item_note` | RPC | JWT + RLS | item UUID + note/null | boolean | safe SQLSTATE mapping | typed item mutation | `SupabaseSavedTripsRepository` | Trip Detail/Add Place | INTEGRATED | Live owner update/cross-user rejection PASS; UI consumer remains scoped/deferred |
| `delete_saved_trip` | RPC | JWT + RLS | trip UUID | boolean | safe SQLSTATE mapping | typed trip mutation | `SupabaseSavedTripsRepository` | My Trips/Profile | INTEGRATED | Live owner delete/cross-user rejection/non-reopen PASS; UI consumer remains scoped/deferred |
| `resolve-place` v9 | POST Edge Function | JWT | itinerary item UUID only | validated verification receipt | nine stable place codes | `ResolvePlaceRequest/Result` | `SupabasePlaceResolutionRepository` | Trip Detail/Map/Place | INTEGRATED | Live resolve/refetch VERIFIED, provenance, coordinates and cross-user isolation PASS |
| `get-place-photo` | POST Edge Function | JWT | `googlePlaceId`, optional `maxWidth` | validated `{ data: PlacePhoto }` | seven stable photo codes | `GetPlacePhotoRequest/PlacePhoto` | `SupabasePlacePhotoRepository` | Trip Detail hero & item photos, Saved Places | INTEGRATED | Owner verification via verified itinerary item or owned saved place; server-side Places API (New); zero client API key exposure |
| `get-place-metadata` | POST Edge Function | JWT | `googlePlaceId` | validated `{ data: { rating, userRatingCount } }` | safe metadata codes | `PlaceMetadata` | `SupabasePlaceMetadataRepository` | Saved Places cards | INTEGRATED | Real Google Places API (New) rating/count; 24h mobile in-memory cache; owner-verified; missing rating hidden without fake 0.0 |
| `get_user_trip_stats` | RPC | JWT | none | `{ trips_count: number, saved_places_count: number }` | SQLSTATE validation/auth | `{ tripsCount: number, savedPlacesCount: number }` | `SupabaseSavedTripsRepository.getStats()` | Profile stats header | IMPLEMENTED + AUTOMATED + REMOTE/LIVE VERIFIED | Privilege matrix is authenticated-only; remote schema probe resolves the RPC, anonymous access is rejected, and disposable A/B data returned A=1/1 and B=2/1 without cross-user leakage. |
| `delete_user_account` | RPC | JWT + RLS | none | void | SQLSTATE validation/auth | `deleteAccount()` | `SupabaseAuthRepository` | Settings / Profile delete account modal | IMPLEMENTED + AUTOMATED + REMOTE/LIVE VERIFIED | `SECURITY DEFINER`, empty `search_path`, null guard, caller-only deletion, explicit `PUBLIC`/`anon` revocation, and authenticated-only grant. Disposable A-only cascade, deleted-session rejection, B preservation, and cleanup PASS. |
| OSRM | GET direct client | none | 2-25 verified coordinates; driving only | validated route/GeoJSON | input/no-route/retryable/unavailable | `RouteRequest`, `Route` | `OsrmRouteRepository` + `routePlanning` | Route Preview/Trip Map | INTEGRATED | Native map + OSRM driving route, verified coordinates, Directions navigation PASS |
| Open-Meteo | GET direct client | none | verified coordinates; 1-16 days from today through latest required itinerary date | validated bounded daily forecast | input/retryable/optional unavailable | `WeatherRequest/Forecast` | `OpenMeteoWeatherRepository` + `useTripWeather` | Trip Detail weather state | INTEGRATED | Direct client integration with validated coordinates, bounded itinerary-date window, error tolerance and contextual weather badge on Trip Detail; out-of-horizon trips remain optionally unavailable |
| `saved_places` / `list_saved_places` / `save_place` / `unsave_place` | RPC + RLS | JWT | googlePlaceId, name, coords, address, category | saved place row / paginated page / boolean | SQLSTATE validation/auth | `SavedPlace`, `SavedPlacesPage`, `SavePlaceCommand` | `SupabaseSavedPlacesRepository` + `useSavedPlaces` | Saved Places screen | INTEGRATED | Live save/unsave/undo, idempotent upsert, keyset pagination, owner RLS, real Bangkok seed PASS |

## 4. Integration rule

> **Integration was explicitly authorized on 2026-08-20. INT-P0 through INT-P9 and the Integration Track are COMPLETE.**

INT-P1 dừng tại infrastructure/repository boundary và không wiring production data vào UI. Chi tiết implementation, deferred wiring và evidence nằm trong `HANDOFF_INTEGRATION.md`.
