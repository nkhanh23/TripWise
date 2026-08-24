# TripWise React Native FE ↔ BE Integration Roadmap

**Owner / Agent: Codex — FE ↔ BE Integration (historical/general owner)**
**Status: ACTIVE**

**INT-P6 continuation execution:** delegated by user to **Antigravity**.

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
- **Current:** INT-P7 — Remaining Real Data Integration (ACTIVE)
- **Completed phases:** INT-P0, INT-P1, INT-P2, INT-P3, INT-P4, INT-P5
- **Open / Paused:** INT-P6 — Map & Route Integration (substantial runtime evidence PASS; final closure intentionally deferred)


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

## [ ] INT-P6 — Map & Route Integration (OPEN / PAUSED)

- [x] Render real verified coordinates.
- [x] Wire OSRM/route source theo BE-P7 decision.
- [x] Polyline and ordered markers.
- [x] Timeout/error/fallback behavior.
- [x] Map rebuild/performance regression test.

INT-P6 has substantial PASS runtime evidence on Android (Trip Map, Route Preview, Place Photos, OSRM metrics); it remains OPEN / PAUSED by explicit boundary and is not closed by this sync.

---

## [ ] INT-P7 — Remaining Real Data Integration (ACTIVE)

- [x] Weather theo BE-P8/client ownership decision (Open-Meteo direct client, validated coordinates, bounded date window, active-date Trip Detail presentation; automated and Android/live evidence PASS).
- [x] Saved places persistence (`public.saved_places`, `list_saved_places`, `save_place`, `unsave_place`, owner RLS, idempotency, real populated/empty/reload states; implementation, automated, remote/live and Android PASS; current Stitch audit pending).
- [x] Google Place Photos (`get-place-photo` Edge Function proxy with skipHttpRedirect, owner RLS verification; implementation, automated, remote/live and Android PASS; current Stitch audit pending).
- [x] Google Place Ratings & Metadata (`get-place-metadata` Edge Function proxy, real Places API New rating + count, 24h server TTL; implementation, automated, remote/live and Android PASS; current Stitch audit pending).
- [x] Profile & Settings real data & account deletion (`home_country` column, `get_user_trip_stats()` RPC, `delete_user_account()` RPC, local preference separation; remote/live PASS and Android partial).
- [ ] INT-P7 current Stitch visual audit, affected Android re-verification, and formal closure readiness. `STITCH_VISUAL_ARTIFACT_ACCESS = PASS` (2026-08-24): all twelve current `get_screen` HTML and screenshot artifacts for `projects/10069552738311964263` were retrieved locally and visually inspected. The repository helper was correctly attempted first but its Windows Schannel curl could not acquire credentials before HTTP; a verified Node/OpenSSL transport then followed the current signed redirects and produced valid local HTML plus image artifacts without persisting signed URLs or secrets. Current Stitch establishes contract **B — Edit Profile edits Home Country**; the smallest remote-backed field mapping and tests are implemented. Android re-verification, including reversible live persistence of the operator's blank country value, remains pending because the approved Windows automation cannot control Android Studio in this environment. Historical screen IDs/artifacts remain non-authoritative.
- [ ] INT-P7 Final Verification, Live Regression & Formal Closure.

---

## [ ] INT-P8 — Remove Mock Runtime Dependencies

- [ ] Production dependency injection không còn chọn mock repositories.
- [ ] Giữ fixtures/fakes cho tests, previews và explicit dev mode nếu hữu ích.
- [ ] Không xóa visual fixtures cần cho deterministic UI tests.
- [ ] Audit production build không chứa fake user/trip/place runtime path.

---

## [ ] INT-P9 — Integration & End-to-End QA

- [ ] Auth/register/login/session restore/logout.
- [ ] Generate trip.
- [ ] Persist trip graph atomically.
- [ ] Reopen saved trip.
- [ ] Place details/identity/coordinates.
- [ ] Map/route and fallback.
- [ ] Offline/network/error handling.
- [ ] RLS/cross-user/security tests.
- [ ] Android smoke test.
- [ ] iOS smoke test khi environment hỗ trợ.
- [ ] Regression comparison với Stitch UI.
- [ ] No secrets/tokens in logs or bundle.

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
| `get-place-metadata` | POST Edge Function | JWT | `googlePlaceId` | validated `{ data: { rating, userRatingCount } }` | safe metadata codes | `PlaceMetadata` | `SupabasePlaceMetadataRepository` | Saved Places cards | INTEGRATED | Real Google Places API (New) rating/count; 24h server cache; owner-verified; missing rating hidden without fake 0.0 |
| `get_user_trip_stats` | RPC | JWT | none | `{ trips_count: number, saved_places_count: number }` | SQLSTATE validation/auth | `{ tripsCount: number, savedPlacesCount: number }` | `SupabaseSavedTripsRepository.getStats()` | Profile stats header | IMPLEMENTED + AUTOMATED + REMOTE/LIVE VERIFIED | Privilege matrix is authenticated-only; remote schema probe resolves the RPC, anonymous access is rejected, and disposable A/B data returned A=1/1 and B=2/1 without cross-user leakage. |
| `delete_user_account` | RPC | JWT + RLS | none | void | SQLSTATE validation/auth | `deleteAccount()` | `SupabaseAuthRepository` | Settings / Profile delete account modal | IMPLEMENTED + AUTOMATED + REMOTE/LIVE VERIFIED | `SECURITY DEFINER`, empty `search_path`, null guard, caller-only deletion, explicit `PUBLIC`/`anon` revocation, and authenticated-only grant. Disposable A-only cascade, deleted-session rejection, B preservation, and cleanup PASS. |
| OSRM | GET direct client | none | 2-25 verified coordinates; driving only | validated route/GeoJSON | input/no-route/retryable/unavailable | `RouteRequest`, `Route` | `OsrmRouteRepository` + `routePlanning` | Route Preview/Trip Map | INTEGRATED | Native map + OSRM driving route, verified coordinates, Directions navigation PASS |
| Open-Meteo | GET direct client | none | verified coordinates; 1-16 days from today through latest required itinerary date | validated bounded daily forecast | input/retryable/optional unavailable | `WeatherRequest/Forecast` | `OpenMeteoWeatherRepository` + `useTripWeather` | Trip Detail weather state | INTEGRATED | Direct client integration with validated coordinates, bounded itinerary-date window, error tolerance and contextual weather badge on Trip Detail; out-of-horizon trips remain optionally unavailable |
| `saved_places` / `list_saved_places` / `save_place` / `unsave_place` | RPC + RLS | JWT | googlePlaceId, name, coords, address, category | saved place row / paginated page / boolean | SQLSTATE validation/auth | `SavedPlace`, `SavedPlacesPage`, `SavePlaceCommand` | `SupabaseSavedPlacesRepository` + `useSavedPlaces` | Saved Places screen | INTEGRATED | Live save/unsave/undo, idempotent upsert, keyset pagination, owner RLS, real Bangkok seed PASS |

## 4. Integration rule

> **Integration was explicitly authorized on 2026-08-20. INT-P0 through INT-P5 are complete; INT-P6 is OPEN / PAUSED; INT-P7 is ACTIVE; INT-P8 and INT-P9 are NOT STARTED.**

INT-P1 dừng tại infrastructure/repository boundary và không wiring production data vào UI. Chi tiết implementation, deferred wiring và evidence nằm trong `HANDOFF_INTEGRATION.md`.
