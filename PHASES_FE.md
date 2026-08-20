# TripWise React Native Mobile Frontend Roadmap

**Owner / Agent: Antigravity — Mobile Frontend**
**Stack: React Native + TypeScript + Expo**
**Current implementation target: Android**
**Start gate: ACTIVE — FE được phép tiếp tục độc lập, không chờ Backend**

Roadmap này là active source of truth cho Mobile Frontend. iOS không phải target implementation/runtime verification hiện tại, nhưng architecture và component contracts không được khóa cứng Android-only nếu không có yêu cầu nền tảng thực tế.

Active Stitch implementation mapping: [`docs/09-ui-design/stitch-to-react-native-mapping-report.md`](./docs/09-ui-design/stitch-to-react-native-mapping-report.md)

## Current status

- **Verified completed foundation:** FE Phase 0, FE Phase 1, FE Phase 2, FE Phase 3, FE Phase 4, FE Phase 5, FE Phase 6, FE Phase 7, FE Phase 8, FE Phase 9, FE Phase 10, FE-CROSSCUT-001
- **Current active phase:** FE Phase 11 — Add Place UI Flow
- **Next phase:** FE Phase 12 — Itinerary Day Edit UI Flow
- **Backend integration:** OUT OF SCOPE — mock/local data only trong UI roadmap

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

## [ ] FE Phase 11 — Add Place UI Flow

- [ ] Search/recommendation UI với local fixture filtering.
- [ ] Confirmation sheet, day/time/duration/note inputs.
- [ ] Local insert vào itinerary model.
- [ ] Không remote persistence.
- [ ] Build directly using semantic theme tokens & i18n translation keys.

---

## [ ] FE Phase 12 — Trip Map UI

- [ ] Mock map canvas, numbered markers và selected marker state.
- [ ] Mock route polyline, day filtering và place preview.
- [ ] Marker/map state isolation và fallback UI.
- [ ] Không external map/routing API.

---

## [ ] FE Phase 13 — Saved Places UI

- [ ] Saved list/grid, category filters và empty state.
- [ ] Local bookmark/undo behavior.
- [ ] Typed navigation tới Place Detail.
- [ ] Virtualized rendering với large fixtures.

---

## [ ] FE Phase 14 — Profile UI

- [ ] Profile header/statistics/menu.
- [ ] Edit profile và destructive confirmation UI.
- [ ] Local edit/save/avatar visual state.
- [ ] Không server profile sync trong FE-only phase.

---

## [ ] FE Phase 15 — Settings UI

- [ ] User-facing preference management UI built on top of FE-CROSSCUT-001 foundation.
- [ ] Theme preference selector: System / Light / Dark.
- [ ] Language preference selector: English (`en`) / Tiếng Việt (`vi`).
- [ ] Currency preference selector (USD, VND, etc. independent from language).
- [ ] Notifications and Help/Support presentation screens.
- [ ] Local state preference boundary (no server persistence in FE-only phase).

---

## [ ] FE Phase 16 — UI State Completeness

- [ ] Empty/loading/error/disabled/selected states audit.
- [ ] Form validation và bottom-sheet state audit.
- [ ] Light + Dark state completeness verification.
- [ ] EN + VI locale state completeness & translated validation/error messages verification.
- [ ] Không có blank/unhandled screen state across all theme/locale combinations.

---

## [ ] FE Phase 17 — Responsive & Android Performance Audit

- [ ] Small/standard/large Android layouts, safe areas và keyboard behavior.
- [ ] `FlatList`/`SectionList`, stable keys và large-fixture scroll audit.
- [ ] Theme switching & language switching render cost / memoization audit.
- [ ] Dark mode contrast & status bar treatment inspection.
- [ ] Layout tolerance for Vietnamese text expansion on compact mobile screens.
- [ ] Render-scope, image memory, marker và JS-thread audit.
- [ ] Cleanup effects/listeners/timers và async work.
- [ ] Low-end Android runtime profiling.
- [ ] iOS-compatible layout assumptions documented; runtime test deferred until supported environment.

---

## [ ] FE Phase 18 — Design Consistency Audit

- [ ] Color/typography/spacing/radius/shadow alignment với Stitch.
- [ ] Multi-dimensional test matrix coverage: `Light + EN`, `Light + VI`, `Dark + EN`, `Dark + VI` for all core flows (Auth, Explore, Place, Route, My Trips, Create Trip, Trip Detail, Settings).
- [ ] Remove duplicate components và one-off styles.
- [ ] Navigation, card, image ratio và map overlay audit.
- [ ] Không thay đổi interaction architecture chỉ để match static HTML.

---

## [ ] FE Phase 19 — Accessibility Baseline

- [ ] Touch targets, contrast và text scaling.
- [ ] `accessibilityLabel`, role, hint và state cho controls in both EN and VI.
- [ ] Form error readability và screen-reader order.

---

## [ ] FE Phase 20 — Final UI/UX QA

- [ ] End-to-end mock user journeys in Light/Dark and EN/VI.
- [ ] Navigation regression across five tabs and nested screens.
- [ ] `npm run lint` PASS.
- [ ] `npm run typecheck` PASS.
- [ ] `npm test` PASS.
- [ ] `npx expo-doctor` PASS.
- [ ] Android development build/runtime smoke PASS.
- [ ] iOS runtime only when macOS/Xcode environment is available.
- [ ] Production UI path remains independent from backend integration.

## Next FE task

> **FE-CROSSCUT-001 — Theme & Localization Foundation**

Không implement task này trong documentation normalization session.
