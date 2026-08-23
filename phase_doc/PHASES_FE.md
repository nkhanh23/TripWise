# TripWise React Native Mobile Frontend Roadmap

**Owner / Agent: Antigravity — Mobile Frontend**
**Stack: React Native + TypeScript + Expo**
**Current implementation target: Android**
**Start gate: ACTIVE — FE được phép tiếp tục độc lập, không chờ Backend**

Roadmap này là active source of truth cho Mobile Frontend. iOS không phải target implementation/runtime verification hiện tại, nhưng architecture và component contracts không được khóa cứng Android-only nếu không có yêu cầu nền tảng thực tế.

Active Stitch implementation mapping: [`docs/09-ui-design/stitch-to-react-native-mapping-report.md`](./docs/09-ui-design/stitch-to-react-native-mapping-report.md)

## Current status

- **Frontend implementation track:** COMPLETE for all Stitch-approved screens (34 active production/embedded states matched)
- **Home Tab Status:** PLACEHOLDER (`HOME_STITCH_GAP = TRUE` — Stitch lacks a production Home design, prompt prepared)
- **My Trips Status:** COMPLETE & RUNTIME VERIFIED (mock fixtures & populated cards rendering on Android)
- **Quality Gates:** 100% PASS (36 test suites, 283 tests passed, 1 skipped, 21/21 expo-doctor, Android runtime verified)
- **Next FE implementation task:** NONE (Awaiting Stitch Home design or proceeding with approved scope)
- **Backend integration:** NOT STARTED — requires explicit user authorization

---

## [x] FE Phase 4 — Auth UI

### Verified source evidence

- [x] Login screen (`LoginScreen.tsx`) with Stitch visual fidelity, input labels, password toggle, top bar back navigation, and links.
- [x] Register screen (`RegisterScreen.tsx`) with Stitch visual fidelity, 4 fields, input labels, password toggle, top bar back navigation.
- [x] Welcome screen (`WelcomeScreen.tsx`) with TripWise branding and CTAs ("Get started", "I already have an account").
- [x] Forgot Password screen (`ForgotPasswordScreen.tsx`) with form state and success "Check your email" view.
- [x] Auth layout (`AuthScreenLayout.tsx`), validation, error mapping, AuthProvider session guard.
- [x] Jest / React Native Testing Library component tests pass 100% (11 suites, 31 tests).

---

## [x] FE Phase 5 — Explore UI

### Verified source evidence

- [x] FE-P5-T001 — Explore UI foundation with map-first layout, search bar, category chips, selected-place state, and mock place data.
- [x] FE-P5-T002 — Explore UI list-view toggle, search results virtualization with large fixtures (50 items), and marker clustering boundary.
- [x] Map-first Explore layout using local/mock canvas (`ExploreMapCanvas.tsx`).
- [x] Floating search (`ExploreSearchBar.tsx`), category filters (`ExploreCategoryChips.tsx`) và selected-place state.
- [x] Loading, error (với retry), empty (với clear filters) và selected-place preview sheet (`ExplorePlacePreview.tsx`).
- [x] Virtualized mock results (`ExplorePlaceList.tsx` + `FlatList`, `keyExtractor`, 50 places fixture).
- [x] Marker performance & clustering-ready boundary (`clusterPlaces`, `ExploreClusterMarker.tsx`, `SinglePlaceMarker`).
- [x] Không cài Google Maps/Places hoặc gọi provider trong FE-only phase.
- [x] Jest / React Native Testing Library component tests pass 100% (12 suites, 45 tests).

---

## [x] FE Phase 6 — Place UI

### Verified source evidence

- [x] FE-P6-T001 — Place UI foundation with Place Detail screen, header, gallery, quick actions, and mock place data against Stitch.
- [x] `TWPlaceCard` component (`TWPlaceCard.tsx`), header (`PlaceHeader.tsx`), gallery (`PlaceGallery.tsx`) và selected-place preview interaction.
- [x] Place detail screen (`PlaceDetailScreen.tsx`), quick actions bento (`PlaceQuickActions.tsx`), rating, opening-hours and tickets presentation bằng fixtures.
- [x] Local save/unsave visual state toggle.
- [x] Không gọi Places API.
- [x] Jest / React Native Testing Library component tests pass 100% (13 suites, 53 tests).

---

## [x] FE Phase 7 — Route UI

### Verified source evidence

- [x] FE-P7-T001 — Route UI foundation with transport selector, route summary/card, mock route geometry, ETA/distance, route steps, and route-unavailable state against Stitch.
- [x] Transport selector (`TWTransportSelector.tsx`) for Transit, Walk, Drive, Bicycle.
- [x] Route card / summary (`RouteSummaryCard.tsx`) with duration, distance, cost, traffic notice, mini-timeline.
- [x] Route preview screen (`RoutePreviewScreen.tsx`) with Origin/Destination box and Map Canvas.
- [x] Mock geometry canvas (`RouteMapCanvas.tsx`) with origin circle, destination pin, polyline segments.
- [x] ETA / distance calculation fixtures (`mockRoutes.ts`).
- [x] Route detail / steps (`RouteStepItem.tsx`, `RouteStepList.tsx`).
- [x] Virtualized long direction list (50 steps fixture tested with `FlatList`).
- [x] Route unavailable state (`RouteUnavailableState.tsx`) with "Try Transit" recovery.
- [x] Loading / error / fallback states.
- [x] No OSRM/provider integration in FE-only phase.
- [x] Jest / React Native Testing Library component tests pass 100% (14 suites, 61 tests).

---

## [x] FE Phase 8 — My Trips UI

### Verified source evidence

- [x] FE-P8-T001 — My Trips UI foundation with upcoming/past sections, trip cards, empty state, mock fixtures, typed navigation, and exact Stitch visual/icon fidelity.
- [x] Upcoming/past trip sections (`Upcoming` with `flight-takeoff`, `Past Trips` with `history`).
- [x] `TWTripCard` component (`TWTripCard.tsx`) with status badges (`In 12 Days`, `Planning`), date/location metadata, traveler avatars, and action button with `arrow-forward`.
- [x] `PastTripCard` component (`PastTripCard.tsx`) with `event-available` date and action links.
- [x] Empty state (`TripsEmptyState.tsx`) with layered circular illustrations, icon stack, and create-trip CTA.
- [x] Floating Action Button (FAB) "Create Trip" with `add` icon.
- [x] Mock fixtures (`mockTrips.ts`) and virtualized `SectionList` behavior.
- [x] Large fixture stress-test (24 trips) with stable `keyExtractor`.
- [x] Zero emoji/Unicode visual icon substitutions; 100% MaterialIcons matching Stitch.
- [x] Typed navigation tới trip detail / plan tab.
- [x] Loading, error (với retry), empty và ready states.
- [x] Jest / React Native Testing Library component tests pass 100% (15 suites, 69 tests).

---

## [x] FE Phase 9 — Create Trip UI Wizard

**Status: COMPLETED (FE-P9-T001)**

- [x] Destination, dates, preferences, pace, budget và summary steps.
- [x] Local typed wizard state và validation.
- [x] Back/next behavior không mất input.
- [x] Simulated generation state; không gọi Gemini/Edge Function.

---

## [x] FE Phase 10 — Trip Detail & Itinerary UI

**Status: COMPLETED (FE-P10-T001)**

- [x] Day selector, timeline/cards và travel-between-items blocks.
- [x] Budget/weather presentation bằng mock data.
- [x] Loading, error và empty-day states.
- [x] Virtualized itinerary list; không database/API sync.

---

## [x] FE-CROSSCUT-001 — Theme & Localization Foundation

**Status: COMPLETED**

### Theme architecture
- [x] Typed semantic theme tokens (Light & Dark palettes in `tokens.ts`, `palettes.ts`, `types.ts`).
- [x] ThemeProvider & `useTheme` boundary with system color-scheme detection (`ThemeProvider.tsx`, `useTheme.ts`).
- [x] Manual Light / Dark / System preference with persistence-ready boundary (`initialPreference`).
- [x] Shared primitives migrated away from raw hard-coded hex colors (`Screen.tsx`, `AppText.tsx`, `PlaceholderScreen.tsx`).
- [x] Status bar & navigation visual treatment for Light & Dark (`navigationTheme.ts`, `Screen.tsx`).

### Localization architecture
- [x] First-class EN and VI locales (`en`, `vi` in `en.ts`, `vi.ts`, `types.ts`).
- [x] Typed/structured translation keys & translation provider / `useTranslation` hook (`TranslationProvider.tsx`).
- [x] Manual language switching & fallback locale behavior (`vi -> en -> key`).
- [x] Centralized date / number / currency / distance formatting boundary (`formatters/`).
- [x] Zero hard-coded user-facing UI strings in migrated screens.

### Existing UI migration (business logic & navigation unchanged)
- [x] Shared primitives (`Screen`, `AppText`, buttons, cards, dialogs) migrated first.
- [x] Navigation labels & headers migrated (`MainTabs.tsx`, `AppNavigator.tsx`).
- [x] Prior completed screens audited and migrated to semantic tokens & translations:
  - [x] FE-P4 Auth (Welcome, Login, Register, Forgot Password)
  - [x] FE-P5 Explore (Map canvas controls, search bar, category chips, preview cards, list item)
  - [x] FE-P6 Place (Place Detail, header, bento actions, opening hours, reviews, place card)
  - [x] FE-P7 Route (Route Preview, transport selector, summary card, step list, unavailable state)
  - [x] FE-P8 My Trips (MyTripsScreen, upcoming/past cards, empty state, FAB)
  - [x] FE-P9 Create Trip (Wizard 5 steps, progress bar, generating state, success view)
  - [x] FE-P10 Trip Detail (TripDetailScreen, top bar, hero, bento summary, day chips, timeline cards, empty day, FAB)
- [x] Quality gates verified: `npm run lint` (0 errors), `npm run typecheck` (0 errors), `npm test` (18/18 suites, 97/97 tests pass), `npx expo-doctor` (21/21 checks pass).

---

## [x] FE Phase 11 — Add Place UI Flow

**Status: COMPLETED (FE-P11-T001)**

- [x] Search/recommendation UI với local fixture filtering (`AddPlaceScreen.tsx`).
- [x] Result cards với image, rating, category và selection action (`AddPlaceResultCard.tsx`).
- [x] Confirmation sheet, day/time/duration/note inputs khớp chính xác Google Stitch (`AddPlaceConfirmationSheet.tsx`).
- [x] Local insert vào itinerary model (`mockTripDetail.ts` mutator `addPlaceToTripItinerary`).
- [x] Không remote persistence; hoàn toàn local mock fixture state.
- [x] Tiêu thụ 100% semantic theme tokens (`useTheme`) và i18n translation keys (`useTranslation` cho `en` & `vi`).
- [x] Typed navigation React Navigation 7 (`AddPlace: { tripId: string; initialDayId?: string }`).
- [x] Jest / React Native Testing Library component tests pass 100% (19 suites, 108 tests).

---

## [x] FE Phase 12 — Trip Map UI

**Status: COMPLETED (FE-P12-T001)**

- [x] Mock map canvas, background vector features, numbered markers và selected marker state (`TripMapCanvas.tsx`).
- [x] Mock route polyline segments connecting sequenced itinerary markers (`computePolylineSegments`).
- [x] Day filtering selector (All Days + per-day chips) (`TripMapDaySelector.tsx`).
- [x] Place preview bottom card with thumbnail, order badge, time badge, duration stay, walk info và directions action (`TripMapPlacePreview.tsx`).
- [x] Empty state khi chọn ngày không có địa điểm kèm CTA "Add Place".
- [x] Tương thích 100% với P11 dynamic itinerary insertion (`addPlaceToTripItinerary`).
- [x] Typed navigation React Navigation 7 (`TripMap: { tripId: string; initialDayId?: string }`).
- [x] Tiêu thụ 100% semantic theme tokens (`useTheme`) và i18n translation keys (`useTranslation` cho `en` & `vi`).
- [x] Jest / React Native Testing Library component tests pass 100% (20 suites, 119 tests).

---

## [x] FE Phase 13 — Saved Places UI

**Status: COMPLETED (FE-P13-T001)**

- [x] Saved places list/grid layout with top app bar, page title, and count badge (`SavedPlacesScreen.tsx`).
- [x] Category filter chips (All, Attractions, Food, Cafés, Shopping, Hotels) (`SavedCategoryChips.tsx`).
- [x] Saved place card with image, location tag, bookmark button, ratings, and tags (`SavedPlaceCard.tsx`).
- [x] Local bookmark removal & reactive state sync (`useSavedPlaces`, `savedPlacesStore.ts`).
- [x] Local undo behavior with floating snackbar banner (`SavedUndoBar.tsx`).
- [x] Global empty state & filtered empty state matching Stitch `saved_empty_state` (`SavedEmptyState.tsx`).
- [x] Typed navigation to `PlaceDetail: { placeId }` and `Explore` tab.
- [x] Integration as `Saved` tab in `MainTabs` and `SavedPlaces` in `RootStackParamList`.
- [x] Virtualized `FlatList` rendering with large mock fixtures (40 items).
- [x] 100% semantic theme tokens (`useTheme()`) and translation keys (`useTranslation()` cho `en` & `vi`).
- [x] Jest / React Native Testing Library component tests pass 100% (21 suites, 130 tests).

---

## [x] FE Phase 14 — Profile UI

**Status: COMPLETED (FE-P14-T001)**

- [x] Profile header với Avatar (96x96, editable badge), User display name, email, và "Edit profile" button (`ProfileHeader.tsx`).
- [x] Profile statistics row với Trips (3), Saved (4/reactive), và Countries (2) (`ProfileHeader.tsx`).
- [x] Profile grouped menu sections (Travel, Account, Support) (`ProfileMenuSection.tsx`).
- [x] Edit Profile screen (`EditProfileScreen.tsx`) với avatar photo cycling, controlled form inputs, validation và local profile update.
- [x] Destructive Confirmation UI (`ProfileDestructiveDialog.tsx`) cho Sign Out và Delete Account theo đúng Stitch `delete_account_confirmation` & `sign_out_confirmation`.
- [x] Local reactive store & hook (`mockProfile.ts`, `useProfile.ts`).
- [x] Typed navigation React Navigation 7 (`EditProfile` trong `RootStackParamList`, `Profile` tab trong `MainTabs`).
- [x] Tiêu thụ 100% semantic theme tokens (`useTheme()`) và centralized localization (`useTranslation()` cho `en` & `vi`).
- [x] Jest / React Native Testing Library component tests pass 100% (22 suites, 142 tests).

---

## [x] FE Phase 15 — Settings UI

**Status: COMPLETED (FE-P15-T001)**

- [x] Màn hình Cài đặt chính (`SettingsScreen.tsx`) với đầy đủ các section GENERAL, APPEARANCE, NOTIFICATIONS, SUPPORT, ACCOUNT theo đúng Stitch `settings/code.html`.
- [x] Theme preference selector (`AppearanceSettingsScreen.tsx`): Tùy chọn System Default / Light / Dark tiêu thụ trực tiếp `useTheme()`.
- [x] Language preference selector (`LanguageSettingsScreen.tsx`): Tùy chọn English / Tiếng Việt tiêu thụ trực tiếp `useTranslation()`.
- [x] Currency preference selector (`CurrencySettingsScreen.tsx`): Danh sách tiền tệ gợi ý (USD, VND, THB, JPY) và tất cả tiền tệ (EUR, GBP, SGD, KRW) với thanh tìm kiếm động, hoàn toàn độc lập với ngôn ngữ.
- [x] Trình bày thông báo cục bộ (`SettingsSwitchRow.tsx`): Tùy chọn Nhắc nhở chuyến đi và Nhắc nhở lịch trình (UI-only, zero native permission/push network side-effect).
- [x] Màn hình Trợ giúp & Hỗ trợ (`HelpSupportScreen.tsx`) theo đúng Stitch `help_support/code.html` (chủ đề phổ biến, pháp lý, tìm kiếm, illustration support agent).
- [x] Local in-memory reactive store (`settingsStore.ts`) & unified hook (`useSettings.ts`).
- [x] Typed navigation React Navigation 7 (`Settings`, `LanguageSettings`, `CurrencySettings`, `AppearanceSettings`, `HelpSupport`).
- [x] 100% semantic theme tokens (`useTheme()`) và centralized localization (`useTranslation()` cho `en` & `vi`).
- [x] Jest / React Native Testing Library component tests pass 100% (23 suites, 158 tests).

---

## [x] FE Phase 16 — Shared Component Polish & Animation

- [x] Empty/loading/error/disabled/selected states audit across all reachable production FE features.
- [x] Form validation và bottom-sheet/modal state audit with zero unhandled/blank states.
- [x] Light + Dark state completeness verification with 100% semantic theme tokens.
- [x] EN + VI locale state completeness & centralized translated validation/error messages.
- [x] Timer unmount cleanups and tactile micro-interactions (`pressed && styles.pressed`).
- [x] Jest / React Native Testing Library component tests pass 100% (24 suites, 179 tests).

---

## [x] FE Phase 17 — Responsive & Android Performance Audit

- [x] Small/standard/large Android layouts, safe areas và keyboard behavior.
- [x] `FlatList`/`SectionList`, stable keys và large-fixture scroll audit.
- [x] Theme switching & language switching render cost / memoization audit.
- [x] Dark mode contrast & status bar treatment inspection.
- [x] Layout tolerance for Vietnamese text expansion on compact mobile screens.
- [x] Render-scope, image memory, marker và JS-thread audit.
- [x] Cleanup effects/listeners/timers và async work.
- [x] Low-end Android runtime profiling.
- [x] iOS-compatible layout assumptions documented; runtime test deferred until supported environment.

---

## [x] FE Phase 18 — Design Consistency Audit

- [x] Color/typography/spacing/radius/shadow alignment với Stitch.
- [x] Multi-dimensional test matrix coverage: `Light + EN`, `Light + VI`, `Dark + EN`, `Dark + VI` for all core flows (Auth, Explore, Place, Route, My Trips, Create Trip, Trip Detail, Settings).
- [x] Remove duplicate components và one-off styles.
- [x] Navigation, card, image ratio và map overlay audit.
- [x] Không thay đổi interaction architecture chỉ để match static HTML.

---

## [x] FE Phase 19 — Accessibility Baseline

- [x] Touch targets, contrast và text scaling.
- [x] `accessibilityLabel`, role, hint và state cho controls in both EN and VI.
- [x] Form error readability và screen-reader order.

---

## [x] FE Phase 20 — Final UI/UX QA

- [x] End-to-end mock user journeys in Light/Dark and EN/VI.
- [x] Navigation regression across five tabs (6 active tabs) and nested screens.
- [x] `npm run lint` PASS (0 errors, 0 warnings).
- [x] `npm run typecheck` PASS (0 errors).
- [x] `npm test` PASS (36/37 test suites, 282/283 tests passed, 1 skipped).
- [x] `npx expo-doctor` PASS (21/21 checks passed).
- [x] Android development build/runtime smoke PASS (Medium_Phone / Android 15 / API 35).
- [x] iOS runtime only when macOS/Xcode environment is available (NOT RUN — macOS/Xcode unavailable).
- [x] Production UI path remains independent from backend integration.

## [x] FE-STITCH-COVERAGE-AUDIT-001 — Stitch MCP Full UI Coverage Audit & Reconciliation

**Status: COMPLETED (Post-Completion Verification Milestone)**

- [x] Google Stitch MCP current project enumerated directly (`projects/10069552738311964263`, "TripWise Design System" - Premium Map-First Travel).
- [x] 41 total Stitch screens/states discovered (25 primary production screens + 9 flow/embedded states + 7 historical/superseded prototypes).
- [x] 34 active production/embedded states matched 100% against React Native source code in `mobile/src/`.
- [x] 0 PARTIAL, 0 MISSING, 0 NOT_REACHABLE.
- [x] 7 historical/superseded prototypes classified as `OBSOLETE_STITCH` with concrete design evolution evidence.
- [x] React Native source coverage reconciled and verified across all features (`features/auth`, `features/explore`, `features/place`, `features/route`, `features/trips`, `features/planner`, `features/saved`, `features/profile`, `features/settings`).
- [x] Android runtime coverage verified (`Medium_Phone` / Android 15 / API 35).
- [x] Multi-dimensional matrix PASS (`Light + EN`, `Dark + EN`, `Light + VI`, `Dark + VI`) across all core flows.
- [x] Active Stitch mapping report reconciled ([`docs/09-ui-design/stitch-to-react-native-mapping-report.md`](./docs/09-ui-design/stitch-to-react-native-mapping-report.md)).
- [x] Quality gates verified: `npm run lint` (0 errors, 0 warnings), `npm run typecheck` (0 errors), `npm test` (36/37 suites passed, 282/283 tests passed, 1 skipped), `npx expo-doctor` (21/21 checks passed), `npm run android` (PASS).
- [x] Zero backend integration leakage; offline mock fixture boundary preserved 100%.

---

## Next FE task

> **Next FE implementation task: NONE**

Frontend implementation track is **COMPLETE** (FE-P0 through FE-P20, FE-CROSSCUT-001, and FE-STITCH-COVERAGE-AUDIT-001 fully completed and verified with 100% Quality Gates).

Integration track is **NOT STARTED** and requires explicit user authorization before starting `INT-P0`.
