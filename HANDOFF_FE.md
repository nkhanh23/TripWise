# TripWise React Native Mobile Frontend Handoff

**Owner / Agent:** Antigravity — Mobile Frontend  
**Production Stack:** React Native + TypeScript + Expo  
**Navigation Engine:** React Navigation 7  
**Current Runtime Target:** Android  
**Status:** COMPLETE — Frontend Implementation Track COMPLETE (FE Phase 0 through Phase 20 + FE-CROSSCUT-001 + FE-STITCH-COVERAGE-AUDIT-001 + FE-HOME-STITCH-REMEDIATION-001 verified)  

**Active Roadmap:** [`PHASES_FE.md`](./PHASES_FE.md)  
**Visual Mapping Source:** [`docs/09-ui-design/stitch-to-react-native-mapping-report.md`](./docs/09-ui-design/stitch-to-react-native-mapping-report.md)  
**Design Tokens & Theme Contract:** [`docs/09-ui-design/theme-localization-contract.md`](./docs/09-ui-design/theme-localization-contract.md)  

---

## 1. Active Source-of-Truth Hierarchy

Khi triển khai bất kỳ tác vụ Mobile Frontend nào trong Antigravity, thứ tự ưu tiên tài liệu bắt buộc tuân thủ:

1. `PHASES_FE.md` (Active Frontend Roadmap) & `HANDOFF_FE.md` (Self-contained continuation handoff).
2. `DECISIONS.md` (Đặc biệt ADR-017, ADR-018, ADR-019, ADR-020).
3. `AGENTS.md` & `docs/05-engineering/react-native-coding-rules.md`.
4. `docs/09-ui-design/theme-localization-contract.md`.
5. `docs/09-ui-design/stitch-to-react-native-mapping-report.md` & Google Stitch MCP (`.stitch/DESIGN.md`).
6. Source code hiện hữu trong `mobile/src/` và test code trong `mobile/tests/`.

> [!WARNING]
> Mọi file và tài liệu liên quan đến Flutter/Dart (`mobile/lib/`, `mobile/test/`, `pubspec.yaml`, `stitch-to-flutter-mapping.md`) hoặc legacy Spring Boot/React Web là **SUPERSEDED / HISTORICAL**. Tuyệt đối không dùng làm căn cứ triển khai production frontend.

> [!NOTE]
> **Integration Runtime Supersedes Historical FE Mock Paths:**
> Với việc tiến hành tích hợp theo `PHASES_INTEGRATION.md`, các luồng dữ liệu production thực tế hiện đã thay thế mock data cục bộ ban đầu của Frontend:
> - **Saved Places:** Quản trị và lưu trữ trực tiếp trên remote PostgreSQL `public.saved_places` qua `SupabaseSavedPlacesRepository`.
> - **Profile & Stats:** Thống kê chuyến đi (`tripsCount`) được truy vấn trực tiếp qua RPC `get_user_trip_stats()` thay cho `mockTrips.ts`.
> - **Trip Weather:** Tích hợp trực tiếp với Open-Meteo API qua `OpenMeteoWeatherRepository`.
> - **Place Photos & Ratings:** Tích hợp an toàn qua Supabase Edge Functions `get-place-photo` và `get-place-metadata`.


---

## 2. Frontend Architecture & Folder Structure

```text
mobile/src/
  ├── app/                  # Application root providers (ThemeProvider, TranslationProvider, AuthProvider)
  ├── components/           # Shared UI primitives (Screen, AppText, PlaceholderScreen)
  ├── features/             # Feature-first modules
  │   ├── auth/             # Welcome, Login, Register, Forgot Password
  │   ├── explore/          # Map canvas, search bar, category chips, place preview, clustering
  │   ├── home/             # Production Home UI (HomeScreen, HomeTopBar, HomeUpcomingCard, HomeEmptyHero, HomeQuickActions, HomeContinuePlanningCard, HomeExplorePreview, HomeSavedSection, HomeLoadingSkeleton)
  │   ├── place/            # Place detail, header, gallery, quick actions bento, place card
  │   ├── planner/          # 5-step Create Trip Wizard & generation state
  │   ├── profile/          # Profile UI (ProfileScreen, EditProfileScreen, ProfileHeader, ProfileMenuSection, ProfileDestructiveDialog)
  │   ├── route/            # Route preview, transport selector, summary card, step list
  │   ├── saved/            # Saved Places UI (SavedPlacesScreen, SavedPlaceCard, SavedCategoryChips, SavedEmptyState, SavedUndoBar)
  │   ├── settings/         # Settings UI (SettingsScreen, AppearanceSettingsScreen, LanguageSettingsScreen, CurrencySettingsScreen, HelpSupportScreen)
  │   └── trips/            # My Trips, Trip Detail, Add Place & Trip Map UI flow
  ├── i18n/                 # Dictionaries (en, vi), TranslationProvider, useTranslation, formatters/
  ├── navigation/           # React Navigation 7 root/tabs stacks, types, navigation theme adapter
  └── theme/                # Light/Dark semantic palettes, tokens, ThemeProvider, useTheme
mobile/tests/               # Jest & React Native Testing Library component/integration test suites
```

**Data Flow Architecture:**
```text
React Native screens/components (.tsx)
    ↓
Hooks (useTheme, useTranslation, useSettings, useProfile, useSavedPlaces, local/feature state)
    ↓
Typed feature repository / mock data fixture boundary
    ↓
Local mock fixtures during FE UI phases (Zero live API calls)
```

---

## 3. Stitch Visual Fidelity & MCP Audit Evidence

- **Google Stitch là visual source of truth tuyệt đối** cho toàn bộ layout, geometry, spacing, safe area, typography, colors, borders, radius, shadows, badges, cards, buttons và state visual.
- **Kết quả Audit Google Stitch MCP trực tiếp:**
  - **Stitch Project:** `projects/10069552738311964263` ("TripWise Design System" - Premium Map-First Travel).
  - **Tổng số Stitch screens/states:** 44 items (28 active primary production screens + 9 flow/embedded states + 7 historical/superseded prototypes).
  - **Coverage Result:**
    - `MATCHED`: **37** (100% production screens và embedded states, bao gồm 3 production Home states)
    - `PARTIAL`: **0**
    - `MISSING`: **0**
    - `NOT_REACHABLE`: **0**
    - `OBSOLETE_STITCH`: **7** (Superseded earlier prototypes và initial canvases)
    - `NEEDS_REVIEW`: **0**
  - **Chi tiết mapping ma trận:** Xem tại [`docs/09-ui-design/stitch-to-react-native-mapping-report.md`](./docs/09-ui-design/stitch-to-react-native-mapping-report.md).
- **Stitch Coverage Conclusion:**  
  > *Google Stitch current production UI coverage against React Native mobile source: **COMPLETE (100% UI Coverage)***.  
  > Không còn bất kỳ màn hình, state, modal, sheet hay flow nào trên Stitch bị thiếu, partial hay không thể truy cập trong React Native source code hiện tại.
- **Icon Identity Rule (BẮT BUỘC):**
  - Sử dụng `@expo/vector-icons/MaterialIcons` khớp chính xác Material Symbols từ Stitch.
  - **FE-VISUAL-AUDIT-001** đã hoàn tất việc loại bỏ 100% icon emoji, Unicode glyph, ASCII text placeholders khỏi codebase `mobile/src/`.
  - **Nghiêm cấm:** Tuyệt đối không tái đưa emoji, Unicode symbols hoặc icon xấp xỉ vào giao diện người dùng.

---

## 4. Navigation Architecture & Routes

App sử dụng **React Navigation 7** (`@react-navigation/native-stack` và `@react-navigation/bottom-tabs`), tuyệt đối không dùng Expo Router.

### Navigation Hierarchy:
1. **Auth Stack (`AuthStackParamList`):**
   - `Welcome` (màn hình chào, branding TripWise)
   - `Login` (đăng nhập email/password)
   - `Register` (đăng ký 4 trường)
   - `ForgotPassword` (yêu cầu đặt lại mật khẩu / Check Email view)
2. **Main Tabs Navigator (`MainTabParamList`):**
   - `Home` (`HomeScreen` production bám sát 3 Stitch states: Populated, No Upcoming Trip, Loading)
   - `Explore` (`ExploreScreen` bản đồ & danh sách khám phá)
   - `Plan` (Khởi chạy wizard tạo chuyến đi)
   - `Trips` (`MyTripsScreen` danh sách chuyến đi sắp tới & đã qua)
   - `Saved` (`SavedPlacesScreen` danh sách địa điểm đã lưu)
   - `Profile` (`ProfileScreen` hồ sơ người dùng, thống kê, menu & tài khoản)
3. **Root App Stack (`RootStackParamList`):**
   - `MainTabs`
   - `PlaceDetail`: `{ placeId: string }`
   - `RoutePreview`: `{ destinationId: string; destinationName?: string; originName?: string }`
   - `CreateTripWizard`: `{ initialStep?: 1 | 2 | 3 | 4 | 5 }`
   - `TripDetail`: `{ tripId: string }`
   - `AddPlace`: `{ tripId: string; initialDayId?: string }`
   - `TripMap`: `{ tripId: string; initialDayId?: string }`
   - `SavedPlaces`: `undefined`
   - `EditProfile`: `undefined`
   - `Settings`: `undefined`
   - `LanguageSettings`: `undefined`
   - `CurrencySettings`: `undefined`
   - `AppearanceSettings`: `undefined`
   - `HelpSupport`: `undefined`

---

## 5. Verified Completed FE Inventory

Toàn bộ các phase và checkpoint dưới đây đã được implement và kiểm thử tự động đạt 100% PASS:

- **[x] FE Phase 0 — React Native + Expo Foundation:** Cấu hình Expo SDK 52 / React Native 0.76+, TypeScript strict mode, ESLint Expo, Jest Expo.
- **[x] FE Phase 1 — Design Tokens & Theme Foundation:** Tokens cho colors, spacing, typography, radius, shadow/elevation.
- **[x] FE Phase 2 — Core Shared Component Foundation:** `AppText`, `Screen` (dynamic StatusBar & safe-area handling), `PlaceholderScreen`.
- **[x] FE Phase 3 — Typed Navigation & App Shell:** React Navigation 7 container, typed params, tab bar với MaterialIcons.
- **[x] FE Phase 4 — Auth UI:** `WelcomeScreen`, `LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`, `AuthScreenLayout`, AuthProvider session guard, validation và alert states.
- **[x] FE Phase 5 — Explore UI:** Map-first layout (`ExploreMapCanvas`), floating search (`ExploreSearchBar`), category chips (`ExploreCategoryChips`), preview sheet (`ExplorePlacePreview`), view toggle (Map/List), `FlatList` virtualization với 50 places fixture, marker clustering boundary.
- **[x] FE Phase 6 — Place UI:** `PlaceDetailScreen`, `PlaceHeader`, `PlaceGallery`, `PlaceQuickActions` bento, `TWPlaceCard`, rating, opening hours, ticket pricing, reviews, local save/unsave bookmark state toggle.
- **[x] FE Phase 7 — Route UI:** `RoutePreviewScreen`, `TWTransportSelector` (Transit, Walk, Drive, Bicycle), `RouteSummaryCard` (duration, distance, cost, traffic notice, mini-timeline), `RouteMapCanvas`, `RouteStepList` (virtualized 50-step fixture), `RouteUnavailableState` với "Try Transit" recovery flow.
- **[x] FE Phase 8 — My Trips UI:** `MyTripsScreen`, Upcoming section (`flight-takeoff`), Past Trips section (`history`), `TWTripCard` (badges, date/location, traveler avatars), `PastTripCard`, `TripsEmptyState`, Create Trip FAB (`add`), `SectionList` virtualization với 24-trip stress fixture.
- **[x] FE-VISUAL-AUDIT-001 — Visual & Icon Fidelity Remediation:** Xóa sạch 100% emoji/Unicode icon, đồng bộ 100% `MaterialIcons` chuẩn Stitch từ FE-P4 đến FE-P7 và MainTabs.
- **[x] FE Phase 9 — Create Trip UI Wizard:** 5-step wizard (`CreateTripWizardScreen`): (1) Destination search & popular destination cards, (2) Dates presets & duration, (3) Preferences & travel pace, (4) Budget & group types, (5) Summary với editable title; local typed wizard state, back/next preserving input, simulated AI generating state và `CreateTripSuccessView`.
- **[x] FE Phase 10 — Trip Detail & Itinerary UI:** `TripDetailScreen`, `TripDetailTopBar`, `TripDetailHero`, `TripSummaryBentoCard` (budget progress, companion avatars, saved places), `TripDaySelector` chips, `ItineraryCard` với timeline connector lines/nodes và time column, `TripEmptyDayState`, `TripFAB`, typed navigation từ MyTrips, large 7-day 56-item fixture virtualization.
- **[x] FE-CROSSCUT-001 — Theme & Localization Foundation:** Xây dựng `ThemeProvider` (`System` / `Light` / `Dark`), `TranslationProvider` (`en` / `vi`), centralized formatters (`date`, `dateRange`, `currency`, `number`, `distance`), và đã di chuyển 100% component/screens từ FE-P4 đến FE-P10 sang semantic tokens & translation keys.
- **[x] FE Phase 11 — Add Place UI Flow:** `AddPlaceScreen`, `AddPlaceResultCard`, `AddPlaceConfirmationSheet` (khớp Stitch `add_place_confirmation`), local search & category filtering, day/time/duration/notes inputs, dynamic `addPlaceToTripItinerary` insertion, và focus refresh listener trong `TripDetailScreen`.
- **[x] FE Phase 12 — Trip Map UI:** `TripMapScreen`, `TripMapCanvas`, `TripMapDaySelector`, `TripMapPlacePreview`, `tripMapUtils` (deterministic mock canvas coordinates, polyline geometry segments, sequenced numbered markers), day filtering (All Days / per-day), selected marker state with pulsing halo, place preview bottom card, empty day state with "Add Place" CTA, và focus/navigation integration từ `TripDetailScreen`.
- **[x] FE Phase 13 — Saved Places UI:** `SavedPlacesScreen`, `SavedPlaceCard`, `SavedCategoryChips`, `SavedEmptyState`, `SavedUndoBar`, `savedPlacesStore.ts` (reactive in-memory store với bookmark/unsave/undo/restore), category filtering (`All`, `Attractions`, `Food`, `Cafés`, `Shopping`, `Hotels`), global empty state & filtered empty state matching Stitch `saved_empty_state`, `Saved` tab in `MainTabs`, và `FlatList` large fixture virtualization (40 items).
- **[x] FE Phase 14 — Profile UI:** `ProfileScreen`, `ProfileHeader`, `ProfileMenuSection`, `ProfileDestructiveDialog`, `EditProfileScreen`, `mockProfile.ts` và `useProfile.ts` (in-memory reactive store, local photo cycling, form input validation, dynamic counts derived from trips and saved places, Sign Out & Delete Account destructive confirmation dialogs matching Stitch `sign_out_confirmation` & `delete_account_confirmation`).
- **[x] FE Phase 15 — Settings UI:** `SettingsScreen`, `AppearanceSettingsScreen`, `LanguageSettingsScreen`, `CurrencySettingsScreen`, `HelpSupportScreen`, `SettingsSection`, `SettingsRow`, `SettingsSwitchRow`, `settingsStore.ts` và `useSettings.ts` (Theme System/Light/Dark switching, Language EN/VI live switching, Currency selection với search/suggested list, Notification switch toggles, Help & Support presentation screen, local in-memory preference boundary).
- **[x] FE Phase 16 — Shared Component Polish & Animation:** Empty/loading/error/disabled/selected states audit across all production features, form validation audit, bottom-sheet/modal audit, tactile micro-interactions (`pressed && styles.pressed`).
- **[x] FE Phase 17 — Responsive & Android Performance Audit:** Small (~320-360dp), standard (~390-412dp), large (~480dp+) layouts, keyboard-handling safe area audit (`keyboardShouldPersistTaps="handled"`), virtualization performance audit, timer/listener cleanup audit.
- **[x] FE Phase 18 — Design Consistency Audit:** Multi-dimensional matrix audit (`Light + EN`, `Light + VI`, `Dark + EN`, `Dark + VI`), typography, spacing, radius, card geometry, image aspect ratios, map overlay consistency.
- **[x] FE Phase 19 — Accessibility Baseline:** Touch targets $\ge 44 \times 44$, WCAG AA color contrast (`lightPalette.state.error = #BA1A1A`), accessible labels/roles/hints/states in both EN and VI, form error readability, modal focus semantics.
- **[x] FE Phase 20 — Final UI/UX QA:** End-to-end user journeys verification, navigation regression across 6 tabs and nested screens, 100% Quality Gates PASS, Android native runtime verification, zero backend integration leakage.
- **[x] FE-STITCH-COVERAGE-AUDIT-001 — Stitch MCP Full UI Coverage Audit & Reconciliation:** Audit trực tiếp Google Stitch MCP project `10069552738311964263`, phát hiện 41 screens/states, đối chiếu 100% MATCHED với React Native source code, reconcile toàn bộ mapping report, và xác nhận 100% quality gates baseline.
- **[x] FE-HOME-STITCH-REMEDIATION-001 — Stitch Home Screen Implementation & Verification:** Implement production `HomeScreen.tsx` và 8 sub-components bám sát 3 Stitch states mới (`6e2008eca51c455989f7045316a293cf` Populated, `0ce82fc844314d7ea54176e5aba8dc76` No Upcoming Trip, `9ab12562a2a745429f9effbb47b08595` Loading), Jest test suite đạt 100% PASS, Android emulator runtime verified qua `uiautomator dump`, giải quyết triệt để `HOME_STITCH_GAP = RESOLVED`.

---

## 6. Theme, Localization & Preference Architecture

Tuân thủ nghiêm ngặt [ADR-020](DECISIONS.md#adr-020-theme-lightdarksystem--localization-envi-architecture) và [Theme & Localization Contract](docs/09-ui-design/theme-localization-contract.md):

### Preference Ownership
- **Theme Preference:** Quản lý bởi `ThemeProvider` (`useTheme()`) — hỗ trợ `system` (mặc định), `light`, `dark`.
- **Language Preference:** Quản lý bởi `TranslationProvider` (`useTranslation()`) — hỗ trợ `en` (mặc định), `vi`.
- **Currency Preference:** Quản lý bởi `settingsStore.ts` (`useSettings()`) — hỗ trợ `USD`, `VND`, `THB`, `JPY`, `EUR`, `GBP`, `SGD`, `KRW`, hoàn toàn độc lập với ngôn ngữ.
- **Notifications:** Quản lý bởi `settingsStore.ts` (`useSettings()`) — toggles cho `tripReminders` và `itineraryReminders` (UI-only, zero native permission side effect).
- **Distance Unit:** Quản lý bởi `settingsStore.ts` (`useSettings()`) — `km` / `mi`.

---

## 7. Current FE Checkpoint & Verification State

- **Frontend implementation track:** COMPLETE for all 37 Stitch-approved screens/states
- **Home Tab Status:** COMPLETE & RUNTIME VERIFIED (3 Stitch states implemented: Populated, No Upcoming Trip, Loading; `HOME_STITCH_GAP = RESOLVED`)
- **My Trips Status:** COMPLETE & RUNTIME VERIFIED (mock fixtures & populated cards rendering on Android)
- **FE Phase 0 → Phase 20:** COMPLETE
- **FE-CROSSCUT-001:** COMPLETE
- **FE-STITCH-COVERAGE-AUDIT-001:** COMPLETE
- **FE-HOME-STITCH-REMEDIATION-001:** COMPLETE
- **Stitch UI Coverage:** COMPLETE (37 active production/embedded states matched 100%, 7 obsolete prototypes classified)
- **Frontend QA:** PASS
- **Test suite count:** 38/39 suites PASS, 290/291 tests PASS (1 skipped).
- **Expo Doctor:** 21/21 checks PASS.
- **Android Native Runtime:** PASS (`Medium_Phone` / Android 15 / API 35, 0 redbox errors, full UI hierarchy verified).
- **Multi-dimensional Runtime Matrix:**
  - `Light + EN`: PASS
  - `Dark + EN`: PASS
  - `Light + VI`: PASS
  - `Dark + VI`: PASS
- **Integration:** NOT STARTED
- **Integration readiness:** READY_AFTER_EXPLICIT_USER_AUTHORIZATION

---

## 8. Next Execution Task

> **Next FE implementation task: NONE**

Frontend implementation track is **COMPLETE** for approved Stitch screens. All 20 frontend phases, cross-cutting milestones, and the Stitch MCP Coverage Audit are verified and tested.  
Frontend is completely ready for **FE ↔ BE Integration** after explicit user authorization.  
Bất kỳ bước tiếp theo nào liên quan đến **FE ↔ BE Integration** phải tuân theo `PHASES_INTEGRATION.md` và `HANDOFF_INTEGRATION.md`, và **BẮT BUỘC có sự cho phép rõ ràng từ người dùng** trong một session mới trước khi bắt đầu `INT-P0`.

---

## 9. Integration Boundary (Strictly Enforced)

- **Frontend UI Roadmap là hoàn toàn độc lập:** Tất cả các màn hình và flow UI chỉ sử dụng mock data fixtures, local React state và mock simulation.
- **Integration Roadmap (`HANDOFF_INTEGRATION.md`):** Đang ở trạng thái **NOT STARTED**.
- **Quy tắc bảo vệ:**
  - Tuyệt đối KHÔNG tự động kích hoạt `INT-P0` hoặc gọi live backend API trong session này.
  - Integration track chỉ được bắt đầu khi người dùng kích hoạt riêng.

---

## 10. Quality Verification & Android Runtime Baseline

Chạy 4 lệnh kiểm tra chất lượng bắt buộc từ thư mục `mobile/`:

```powershell
cd mobile
npm run lint          # ESLint Expo: 0 errors, 0 warnings
npm run typecheck     # TypeScript strict mode: 0 errors
npm test              # Jest test runner: 38/39 test suites passed, 290/291 tests passed (1 skipped)
npx expo-doctor       # Expo health check: 21/21 checks passed
```

### Android Native Runtime:
```powershell
cd mobile
npm run android
```
*(Đã xác nhận PASS trên Medium_Phone / Android 15 API 35, 1153 modules bundled, 0 logcat errors).*

---

## 11. Git Safety & Hygiene

- **Không dùng lệnh hủy hoại:** Tuyệt đối không chạy `git reset --hard`, `git checkout .`, `git clean -fd` làm mất code của các agent khác.
- **Kiểm tra trạng thái trước khi làm:** Luôn chạy `git status` để kiểm tra thay đổi hiện tại.
- **Không tự ý commit:** Không commit git trừ khi có yêu cầu rõ ràng từ người dùng.

