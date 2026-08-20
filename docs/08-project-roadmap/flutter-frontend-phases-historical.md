# [SUPERSEDED / HISTORICAL] TripWise Flutter Frontend Roadmap

> Roadmap này được lưu nguyên trạng để bảo toàn lịch sử Flutter UI planning và test evidence cũ. Nó không còn là active roadmap sau khi source/config xác nhận mobile production client là React Native + TypeScript + Expo. Không dùng file này để chọn task tiếp theo. Active roadmap: [`../../PHASES_FE.md`](../../PHASES_FE.md).

**Owner / Agent: Antigravity — Flutter Frontend**
**Start gate: ACTIVE — FE được phép tiếp tục độc lập, không chờ Backend**

Roadmap này là active source of truth cho Flutter UI phases. `mobile/PHASES.md` chỉ là compatibility pointer.

> Các heading `Phase N` và subtask `N.x` được bảo toàn để giữ lịch sử; trong hệ thống roadmap root, chúng được định danh là `FE Phase N` / `FE-N.x`.

## Current UI Status

- **Completed through:** FE Phase 3 — Router & Main App Shell (user/handoff coordination status)
- **Next active phase:** FE Phase 4 — Auth UI
- **Next active subtask:** FE-4.1 WelcomeScreen
- **Backend integration:** OUT OF SCOPE (Local/Mock Data Only)

### FE Phase 3 evidence synchronization note

User và `HANDOFF_FE.md` xác nhận FE đã hoàn thành đến Phase 3. Tuy nhiên snapshot repository được audit khi tái cấu trúc roadmap vẫn hiển thị Flutter app ở Phase 2 placeholder, chưa có router/shell source hoặc Phase 3 test log. Vì vậy:

- giữ coordination status **FE Phase 3 completed / FE Phase 4 next** theo yêu cầu user;
- không giả lập analyze/test/manual-navigation evidence;
- giữ checklist chi tiết FE Phase 3 chưa tick cho tới khi Antigravity đồng bộ artifact/evidence từ FE session;
- Antigravity phải reconcile evidence trước khi tuyên bố acceptance criteria chi tiết của FE Phase 3 đã repository-verified; không reimplement nếu artifact hợp lệ tồn tại ở session/worktree khác.

---

# Mandatory Agent Rules

1. **Read root `PHASES_FE.md` and `HANDOFF_FE.md` before every Flutter UI task.** `mobile/PHASES.md` chỉ là compatibility pointer.
2. **Also read the relevant authoritative files under:**
   - `docs/09-ui-design/` (`README.md`, `design-system.md`, `component-spec.md`, `screen-list.md`, `ui-layout-mobile.md`, `mobile-navigation-flow.md`, `stitch-flutter-mapping.md`)
   - `docs/09-ui-design/stitch-to-flutter-mapping-report.md`
3. **Use the declared `Next active phase` as the coordination gate; do not infer it only from unchecked evidence-sync items.**
4. **Identify the FIRST incomplete subtask inside that active phase.**
5. **Work only inside the current phase** unless the user explicitly asks otherwise.
6. **Do not skip ahead** to future phases.
7. **One subtask at a time** unless two subtasks are tightly coupled.
8. **Latest Stitch UI is the visual source of truth.**
9. **Flutter implementation must not redesign Stitch screens.**
10. **Reuse shared `TW*` widgets** from `lib/shared/widgets/`.
11. **Do not create duplicate widgets** when an existing shared widget can support a variant.
12. **All data used in UI phases must be:**
    - mock
    - local
    - fixture / sample data
13. **Backend / API integration is strictly forbidden in this roadmap.**
14. **Do not modify `backend/`.**
15. **Do not add API clients** or network fetching code.
16. **Do not add authentication networking** (Supabase, Firebase, OAuth, backend auth).
17. **Do not add production persistence** (real database, SQLite, remote storage).
18. **After each subtask:**
    - format code (`dart format`)
    - run relevant checks (`flutter analyze`, `flutter test`)
    - inspect visual result against Stitch screens
    - update `[ ]` → `[x]` only after verification
19. **If blocked:**
    Keep `[ ]` and append:
    ```markdown
    BLOCKED:
    * reason
    ```
20. **Never mark work complete only because a Dart file exists.** Ensure acceptance criteria and visual inspection are met.
21. **Every Flutter UI implementation must be written as production-quality code intended for many users and low-end devices. Performance must be considered during implementation, not postponed to final QA.**

---

# Production Performance Rules

The TripWise Flutter UI is intended for real production usage and must remain smooth on low-end devices as well as modern phones. All future UI phases and subtasks must follow these rules:

## 1. General Performance Principles
Every Flutter screen and widget must be designed assuming:
- Low-end Android devices with limited RAM (2GB–3GB), slower CPUs, and budget GPUs.
- Large datasets: dozens of places, extensive multi-day itineraries, lengthy turn-by-turn routes, multiple map markers.
- Smooth 60 FPS scrolling and interaction without frame drops (jank).
- Production-scale user traffic and real-world mobile battery efficiency.
- Never build UI that only performs well with tiny 2-item mock arrays.

## 2. Widget Rebuild Control
- **Strict `const` Constructors:** Use `const` declarations and constructors across all stateless widgets, EdgeInsets, TextStyle, and BoxDecoration.
- **Narrow Rebuild Scopes:** Isolate state changes to the smallest possible sub-widget (e.g., bookmark icon toggle, day chip selector) rather than calling `setState()` at the screen root.
- **Small Reusable Widgets:** Break down large monolithic screens into focused, single-responsibility sub-widgets.
- **Immutable UI Models:** Use immutable Dart models for mock data and UI fixtures.
- **Zero Heavy Work in `build()`:** Never perform expensive string operations, filtering, sorting, or data transformations directly inside `Widget.build()`.

## 3. List & Scroll Performance
- **Always Use Lazy Builders:** Use `ListView.builder`, `ListView.separated`, `SliverList`, or `GridView.builder` for all lists that may grow beyond a few items.
- **Strictly Prohibited on Large Datasets:**
  - `Column(children: items.map(...).toList())` inside a `SingleChildScrollView`.
  - Nested unbounded scroll views without viewport recycling.
- **Applies to all list-based screens:**
  - Explore search results & category lists
  - Saved places grid
  - My Trips (Upcoming & Past)
  - Itinerary daily stops & timelines
  - Route navigation steps

## 4. Image Performance & Memory Safety
- **Defensive Decoding:** Never decode full-resolution images for small card thumbnails.
- **Cache Dimensions:** Use `cacheWidth` and `cacheHeight` (or `ResizeImage`) when rendering remote images in list cards (e.g., `80x80` thumbnails or `300x200` cards).
- **Lightweight Placeholders:** Display lightweight container color/shimmer placeholders while images load.
- **Graceful Failure:** Catch network image errors with clean fallback icons/placeholders without throwing exceptions.
- **Avoid Memory Leaks:** Avoid holding large image decodes in memory across destroyed routes.

## 5. Map & Marker Performance
- **Lightweight Marker Trees:** Keep `TWMapMarker` widget trees minimal and avoid continuous rebuilds during map pan/zoom.
- **Decouple Map & UI State:** Selecting a place or dragging a bottom sheet must not force the background map canvas to reload or rebuild.
- **Clustering-Ready:** Design marker coordinate structures cleanly so marker clustering can be added seamlessly in future phases if POI count grows to hundreds.
- **No Heavy Animations on Map:** Avoid simultaneous bouncing/pulsing on multiple map markers.

## 6. Animation & Motion Performance
- **Subtle & Hardware-Accelerated:** Prioritize transform, translation, scale, and opacity animations.
- **Use Implicit Animations:** Prefer `AnimatedContainer`, `AnimatedOpacity`, and `AnimatedCrossFade` where appropriate.
- **Avoid Heavy GPU Effects:** Avoid heavy shader effects, continuous looping background animations, and excessive full-screen transitions that drain battery.

## 7. Shadow & Blur Rules
- **GPU-Efficient Shadows:** Adhere strictly to `AppShadows.level1`, `level2`, `level3` without stacking multiple redundant shadow layers.
- **Minimize `BackdropFilter`:** Use subtle semi-transparent solid containers (`AppColors.surfaceContainerLowest.withValues(alpha: 0.95)`) instead of heavy real-time image blur shaders where performance is critical on low-end GPUs.

## 8. Layout Performance
- **Predictable Layout Depth:** Avoid excessive nesting of `Stack`, `LayoutBuilder`, and `SingleChildScrollView`.
- **Avoid Intrinsic Passes:** Avoid `IntrinsicHeight` and `IntrinsicWidth` unless strictly necessary for multi-column alignment, as they trigger multiple expensive layout measurement passes.

## 9. Responsive Performance
- **Frame-Efficient Sizing:** Responsive logic must rely on lightweight breakpoint helpers and standard `MediaQuery` / `LayoutBuilder` without recalculating complex layout mathematics on every render frame.

## 10. Local State Scope & Encapsulation
- **Scoped UI State:** State updates must remain localized.
  - Toggling a bookmark on a place must only update that place's bookmark widget, not rebuild the entire Explore screen or bottom navigation.
  - Changing an itinerary day chip must only rebuild the timeline list viewport.
- **No Premature State Overhead:** Keep local mock state clean and encapsulated using simple `ValueNotifier` or localized `StatefulWidget` without introducing unapproved global dependencies.

## 11. Large Mock Data Testing
- **Development Scalability Fixtures:** Include scalable mock dataset fixtures for testing list performance:
  - 50 Explore places
  - 30 Saved places
  - 20 Trips
  - 20 Daily itinerary stops
  - 50 Turn-by-turn route steps
- Ensure smooth 60 FPS scrolling when testing against these larger fixtures.

## 12. Low-End Device Assumption
- **Baseline Target:** Test and evaluate UI assuming an entry-level Android device with 2GB–3GB RAM and budget GPU.
- **Smoothness Over Gimmicks:** High visual fidelity must never compromise fluid touch responsiveness, sheet dragging, and scrolling.

## 13. Resource & Controller Disposal
- **Mandatory Lifecycle Clean-up:** Every `StatefulWidget` allocating resources must properly dispose them in `dispose()`:
  - `TextEditingController`
  - `ScrollController`
  - `FocusNode`
  - `AnimationController`
  - `PageController`

## 14. Production-Scale Architecture
- **Pagination & Lazy Loading Ready:** UI layouts must be structured so that backend pagination / cursor streams can plug directly into `ListView.builder` without refactoring the screen architecture.

---

## FE Phase 0 — Flutter UI Project Bootstrap

Status:
* [x] Completed

Goal:
Prepare the Flutter mobile project workspace inside `mobile/` for clean UI implementation.

Dependencies:
* Flutter SDK (3.x+ / Dart 3.x+)

Subtasks:
* [x] 0.1 Initialize Flutter project
  - Ensure the Flutter project structure exists correctly inside `mobile/` without overwriting valid configuration.
* [x] 0.2 Verify project structure
  - Check `android/`, `ios/` (where available), `lib/`, `test/`, `pubspec.yaml`.
* [x] 0.3 Configure basic pubspec
  - Include only dependencies needed for UI foundation (e.g. `google_fonts`, `flutter_lints`). Do not add networking packages.
* [x] 0.4 Configure assets
  - Setup asset directories: `assets/images/`, `assets/icons/`.
* [x] 0.5 Configure fonts
  - Configure Inter typography in `pubspec.yaml` according to Stitch design documentation.
* [x] 0.6 Create base lib structure
  - Setup core folders: `lib/app/`, `lib/core/`, `lib/shared/`, `lib/features/`.
* [x] 0.7 Minimal app launch
  - Create minimal `lib/main.dart` and `lib/app/app.dart` showing a neutral placeholder.

Acceptance Criteria:
* [x] `flutter pub get` passes with 0 errors
* [x] `flutter analyze` passes with 0 issues
* [x] App launches with placeholder
* [x] No backend integration
* [x] No product screen implementation yet

Verification:
* `dart format --output=none --set-exit-if-changed .`
* `flutter analyze`
* Manual visual check of launch screen

Notes:
* Keep pubspec lean and strictly UI-focused.

---

## FE Phase 1 — Design System Tokens

Status:
* [x] Completed

Goal:
Translate the approved Google Stitch design system into centralized Flutter token constants.

Dependencies:
* Phase 0 completed

Subtasks:
* [x] 1.1 AppColors
  - Implement `lib/core/theme/app_colors.dart` with documented Stitch colors (`primary: #0058BC`, `primaryContainer: #0070EB`, `background: #FCF9F8`, surfaces, outlines, tertiaries, status colors).
* [x] 1.2 AppTypography
  - Implement `lib/core/theme/app_typography.dart` with Inter hierarchy (`display`, `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `labelLarge`, `labelMedium`, `caption`).
* [x] 1.3 AppSpacing
  - Implement `lib/core/theme/app_spacing.dart` with 8pt grid (`xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `xxl: 24`, `xxxl: 32`).
* [x] 1.4 AppRadius
  - Implement `lib/core/theme/app_radius.dart` (`sm: 4`, `md: 8`, `lg: 12`, `xl: 16`, `xxl: 24`, `pill: 9999`).
* [x] 1.5 AppShadows
  - Implement `lib/core/theme/app_shadows.dart` (`level1`, `level2`, `level3`).
* [x] 1.6 AppTheme
  - Implement `lib/core/theme/app_theme.dart` creating unified `ThemeData`.
* [x] 1.7 Light theme
  - Match Stitch light theme background, app bars, bottom sheets, and card aesthetics.
* [x] 1.8 Dark theme foundation
  - Setup basic dark theme token overrides if supported by UI documentation.
* [x] 1.9 Design token audit
  - Verify all tokens match `docs/09-ui-design/design-system.md` without arbitrary hardcoded values.

Acceptance Criteria:
* [x] No duplicated color constants
* [x] No arbitrary spacing values
* [x] Typography strictly follows Inter scale
* [x] Reusable `AppTheme.lightTheme` exists
* [x] `flutter analyze` passes

Verification:
* `flutter analyze`
* Unit test verifying token mappings

Notes:
* All screen implementations in later phases must import these tokens.

---

## FE Phase 2 — Core Shared Components

Status:
* [x] Completed

Goal:
Build the reusable atomic component library (`TW*`) before implementing screens.

Dependencies:
* Phase 1 completed

Subtasks:
* [x] 2.1 TWButton
  - Variants: `primary`, `secondary`, `outline`, `tonal`, `danger`. States: `default`, `pressed`, `disabled`, `loading`.
* [x] 2.2 TWIconButton
  - Surface, ghost, and primary variants with elevation and active ripple.
* [x] 2.3 TWTextField
  - States: `default`, `focused`, `filled`, `disabled`, `error`. Obscure text toggle.
* [x] 2.4 TWSearchBar
  - Floating map search and inline search variants with filter trigger.
* [x] 2.5 TWChip
  - Variants: `choice`, `filter`, `statusBadge`. Selected and unselected states.
* [x] 2.6 TWAvatar
  - Single avatar and overlapping group cluster (`+2`).
* [x] 2.7 TWEmptyState
  - Illustration, headline, body description, action button.
* [x] 2.8 TWSettingsRow
  - List item with leading icon, title, subtitle, trailing value, switch or chevron.
* [x] 2.9 Loading primitives
  - Shimmer placeholder container and circular indicators.
* [x] 2.10 Error feedback primitives
  - Banner error container and toast notification mock.
* [x] 2.11 Shared component preview screen
  - Development catalog screen showcasing all components in their various states.

Acceptance Criteria:
* [x] Components strictly use `core/theme/` design tokens
* [x] Components support required variants and states
* [x] No screen-specific duplicated button/input widgets
* [x] `flutter analyze` passes

Verification:
* `flutter test` for component rendering
* Visual inspection in Component Preview Screen

Notes:
* Do not duplicate widgets across feature folders.

---

## FE Phase 3 — Router & Main App Shell

Status:
* [x] Completed — coordination status confirmed by user/HANDOFF
* [ ] Repository evidence synchronization pending (không phải implementation task mới)

Goal:
Create the complete UI navigation foundation, tab shell, and routing graph.

Dependencies:
* Phase 2 completed

Subtasks:
* [ ] 3.1 Central route definitions
  - Define route constants in `lib/app/router.dart` (`/welcome`, `/sign-in`, `/explore`, `/trips`, `/saved`, `/profile`, etc.).
* [ ] 3.2 Router configuration
  - Setup centralized navigation handling.
* [ ] 3.3 MainTabsScaffold
  - Persistent scaffold housing the 4 primary tabs.
* [ ] 3.4 TWBottomNavigation
  - 4 tabs: Explore (0), Trips (1), Saved (2), Profile (3) with active indicators.
* [ ] 3.5 SafeArea behavior
  - Ensure status bar and bottom home indicator paddings are properly respected.
* [ ] 3.6 Back navigation rules
  - Implement tab fallback and back-stack handling according to `mobile-navigation-flow.md`.
* [ ] 3.7 Route placeholder validation
  - Verify all 32 routes can be navigated to via neutral temporary placeholders.

Acceptance Criteria:
* [ ] All routes can be reached via router
* [ ] Bottom navigation switches tabs smoothly
* [ ] Back navigation is logical and does not crash
* [ ] No backend dependency

Verification:
* Navigate through all 4 tabs and placeholder routes
* `flutter analyze` passes

---

## FE Phase 4 — Auth UI

Status:
* [ ] Not completed

Goal:
Implement visual authentication and onboarding screens with local form validation.

Dependencies:
* Phase 3 completed

Subtasks:
* [ ] 4.1 WelcomeScreen
  - Hero image, branding title, value tagline, "Get Started", "Sign In".
* [ ] 4.2 SignInScreen
  - Email/password inputs, "Forgot Password" link, submit button, social mock buttons.
* [ ] 4.3 SignUpScreen
  - Name, email, password, confirm password, terms check, submit button.
* [ ] 4.4 ForgotPasswordScreen
  - Email input, "Send Reset Link" button, back navigation.
* [ ] 4.5 Check Email / Reset State
  - Success banner visual feedback after requesting reset.
* [ ] 4.6 SignOutDialog
  - Modal dialog with "Cancel" and "Sign Out" actions.
* [ ] 4.7 Auth screen navigation
  - Mock navigation linking Sign In → Explore, Sign Up → Explore, Sign Out → Welcome.

Acceptance Criteria:
* [ ] Visually matches Stitch `welcome`, `sign_in`, `sign_up`, `forgot_password` screens
* [ ] Form inputs validate locally (e.g. required fields, valid email format)
* [ ] No real API / Supabase auth calls

Verification:
* Manual visual comparison with Stitch screenshots
* `flutter test` for form validation logic

---

## FE Phase 5 — Explore Map UI

Status:
* [ ] Not completed

Goal:
Implement the Map-First Explore screen with floating search and category chips.

Dependencies:
* Phase 3 completed

Subtasks:
* [ ] 5.1 ExploreMapScreen
  - Full-screen map layout with floating overlay controls.
* [ ] 5.2 TWMapCanvas
  - Vector map canvas container with interactive pan/zoom placeholder.
* [ ] 5.3 TWMapMarker
  - Vector map pins with category icons and active pulse/label bubble.
* [ ] 5.4 TWMapControls
  - Floating vertical HUD stack (GPS recenter, zoom +, zoom -, layers).
* [ ] 5.5 Floating TWSearchBar
  - Pinned search bar with glass shadow and filter action.
* [ ] 5.6 Explore category chips
  - Horizontal chip carousel: Attraction, Food, Hotel, Nature, Culture.
* [ ] 5.7 Map marker selected state
  - Tapping a pin highlights it and scales to 110%.
* [ ] 5.8 Explore bottom sheet
  - Bottom sheet preview docking at peek/medium heights.
* [ ] 5.9 Map loading state
  - Shimmer overlay while loading map area.
* [ ] 5.10 Map fallback / error state
  - Offline / tile load failure placeholder message.

Acceptance Criteria:
* [ ] Matches Stitch `explore_map` layout exactly
* [ ] Tapping pins triggers selected state and opens bottom sheet preview
* [ ] Uses local mock POI data fixtures (Bangkok / Da Nang places)
* [ ] No external Google Maps SDK / Places API keys required

Verification:
* Visual comparison with `explore_map/screen.png`
* Interaction test: tap chip, tap marker, drag sheet

---

## FE Phase 6 — Place UI

Status:
* [ ] Not completed

Goal:
Implement Selected Place preview bottom sheet and full Place Detail screen.

Dependencies:
* Phase 5 completed

Subtasks:
* [ ] 6.1 TWPlaceCard
  - Horizontal compact, vertical grid, and hero overlay variants.
* [ ] 6.2 TWPlaceHeader
  - Place title, star rating, review count, category badge, bookmark toggle.
* [ ] 6.3 TWPlaceGallery
  - Snappable horizontal image gallery with rounded corners.
* [ ] 6.4 SelectedPlaceModal
  - Draggable bottom sheet with quick actions (Directions, Save, Share).
* [ ] 6.5 PlaceDetailScreen
  - Full-screen place page with hero photo, opening hours, address, reviews, "Add to Trip".
* [ ] 6.6 Quick actions
  - Directions button (routes to `/route/preview`), Save button (toggles bookmark).
* [ ] 6.7 Opening information
  - Operating hours badge ("Open • Closes 6 PM").
* [ ] 6.8 Rating / review UI
  - Rating bar, review count breakdown, sample review cards.
* [ ] 6.9 Save / unsave visual state
  - Local state toggle for bookmark icon (outline vs filled).
* [ ] 6.10 Mock place fixture
  - Rich sample data for temples, cafes, attractions.

Acceptance Criteria:
* [ ] Matches Stitch `selected_place` and `place_detail` screens
* [ ] Smooth transition from bottom sheet preview to full PlaceDetailScreen
* [ ] Bookmark state updates locally in UI
* [ ] No backend place API calls

Verification:
* Compare against `selected_place/screen.png` and `place_detail/screen.png`

---

## FE Phase 7 — Route UI

Status:
* [ ] Not completed

Goal:
Implement route preview, transit mode selection, and turn-by-turn navigation screens.

Dependencies:
* Phase 6 completed

Subtasks:
* [ ] 7.1 TWTransportSelector
  - Segmented bar for Walking, Driving, Transit, Cycling with ETA estimates.
* [ ] 7.2 TWRouteCard
  - Route summary card with duration, distance, fastest badge.
* [ ] 7.3 TWRouteStep
  - Navigation maneuver step item with icon, instruction, step distance.
* [ ] 7.4 RoutePreviewScreen
  - Overview of route polyline over map with selected mode card.
* [ ] 7.5 RouteOptionsScreen
  - Comparison of route alternatives (Fastest, Scenic, Fewest Transfers).
* [ ] 7.6 RouteDetailScreen
  - Turn-by-turn instruction timeline list.
* [ ] 7.7 Transport selected state
  - Tapping transport mode updates ETA and route card immediately.
* [ ] 7.8 Mock route geometry
  - Local polyline coordinate sets for route visualization.
* [ ] 7.9 Route-unavailable UI
  - Fallback message when route cannot be calculated.

Acceptance Criteria:
* [ ] Matches Stitch `route_preview`, `route_options`, and `route_detail` screens
* [ ] Switching transport mode updates UI estimates smoothly
* [ ] No OSRM / Google Directions API calls

Verification:
* Visual check against `route_preview/screen.png` and `route_detail/screen.png`

---

## FE Phase 8 — My Trips UI

Status:
* [ ] Not completed

Goal:
Implement the Trips library screen with upcoming and past travel cards.

Dependencies:
* Phase 3 completed

Subtasks:
* [ ] 8.1 TWTripCard
  - Banner image, countdown badge ("In 12 Days"), destination, dates, companion avatars.
* [ ] 8.2 MyTripsScreen
  - Tab 1 screen with Upcoming and Past trips segments.
* [ ] 8.3 Upcoming trips section
  - List of active/upcoming trip cards.
* [ ] 8.4 Past trips section
  - Collapsible list of past completed adventures.
* [ ] 8.5 Empty trips state
  - Illustration with "Plan your first trip" CTA when no trips exist.
* [ ] 8.6 Create trip CTA
  - Floating "+" button routing to `/trips/create`.
* [ ] 8.7 Mock trip fixtures
  - Sample trips ("Kyoto Autumn Retreat", "Bangkok Discovery", "Da Nang Beach Getaway").

Acceptance Criteria:
* [ ] Matches Stitch `my_trips` screen exactly
* [ ] Tapping trip card navigates to `/trips/:id` (TripDetailScreen)
* [ ] Empty state toggles gracefully with mock data

Verification:
* Visual check against `my_trips/screen.png`

---

## FE Phase 9 — Create Trip UI Wizard

Status:
* [ ] Not completed

Goal:
Implement the 5-step guided trip creation wizard and success screen.

Dependencies:
* Phase 8 completed

Subtasks:
* [ ] 9.1 Destination selection
  - Destination search input with popular destination chips.
* [ ] 9.2 TWDestinationCard
  - Visual card for popular cities with thumbnail and country tag.
* [ ] 9.3 TWDateRangePicker
  - Calendar month range selector modal.
* [ ] 9.4 TravelDatesStep
  - Step 1: Destination input + date range selection.
* [ ] 9.5 TripPreferencesStep
  - Step 2: Travel interests selection using `TWSelectionCard` & `TWChip`.
* [ ] 9.6 TWSelectionCard
  - Selectable grid card with icon, title, subtitle, active blue border.
* [ ] 9.7 TravelPaceStep
  - Step 3: Pace selection (Relaxed, Balanced, Fast-Paced).
* [ ] 9.8 TWBudgetSelector
  - Step 4: Budget tier selector ($ Backpacker, $$ Moderate, $$$ Luxury).
* [ ] 9.9 BudgetStep
  - Step 4 container with currency and daily limit estimation.
* [ ] 9.10 TripSummaryStep
  - Step 5: Final review card summarizing destination, dates, style, budget.
* [ ] 9.11 CreateTripSuccessScreen
  - Celebration screen with "View Itinerary" CTA.
* [ ] 9.12 Local wizard state
  - In-memory state holder keeping form inputs across step 1 to 5.
* [ ] 9.13 Back / next behavior
  - Smooth step transitions with progress bar indicator (1 of 5).
* [ ] 9.14 Local validation
  - "Continue" button disabled until required step inputs are selected.

Acceptance Criteria:
* [ ] Matches Stitch `tripwise_plan_new_trip` and `create_trip_success` screens
* [ ] User can navigate forward and backward through all 5 steps without losing input
* [ ] Generating trip displays simulated AI loading animation then navigates to success
* [ ] No real Gemini API calls

Verification:
* Walkthrough of full 5-step wizard and verification of local state retention

---

## FE Phase 10 — Trip Detail & Itinerary UI

Status:
* [ ] Not completed

Goal:
Implement the multi-day itinerary view with daily timelines and budget tracking.

Dependencies:
* Phase 9 completed

Subtasks:
* [ ] 10.1 TWDaySelector
  - Sticky horizontal pill bar (`Day 1 • Oct 12`, `Day 2`, `Day 3`).
* [ ] 10.2 TWItineraryCard
  - Timestamp column, stop title, category tag, thumbnail, "Get Directions" action.
* [ ] 10.3 TWItineraryTimeline
  - Vertical connecting line with active blue dots.
* [ ] 10.4 TripDetailScreen
  - Hero banner, budget status progress bar, companion avatars, day timeline.
* [ ] 10.5 EmptyItineraryView
  - Empty state when an itinerary day has no stops.
* [ ] 10.6 Day switching
  - Tapping day chip switches active timeline stops instantly.
* [ ] 10.7 Travel-between-items block
  - Distance & transit time snippet between consecutive stops ("15 min walk • 1.2 km").
* [ ] 10.8 Trip budget summary
  - Spending progress bar ($1,200 / $1,500).
* [ ] 10.9 Weather visual card
  - Compact weather snippet (e.g. "28°C • Sunny").
* [ ] 10.10 Itinerary loading state
  - Shimmer skeleton placeholder for timeline cards.
* [ ] 10.11 Itinerary error state
  - Error banner with retry button.

Acceptance Criteria:
* [ ] Matches Stitch `trip_detail` screen exactly
* [ ] Switching days updates the timeline list without layout jump
* [ ] "View Map" link routes to `TripMapScreen`
* [ ] No database / API sync

Verification:
* Compare against `trip_detail/screen.png`

---

## FE Phase 11 — Add Place UI Flow

Status:
* [ ] Not completed

Goal:
Implement search and bottom sheet flow for adding stops to an itinerary.

Dependencies:
* Phase 10 completed

Subtasks:
* [ ] 11.1 AddPlaceScreen
  - Search screen with category filters and recommended places.
* [ ] 11.2 Search UI
  - Instant search filtering mock place database.
* [ ] 11.3 Recommended place list
  - Popular local spots curated for the destination.
* [ ] 11.4 Map / list composition
  - Split view toggle between map pins and place list.
* [ ] 11.5 AddPlaceBottomSheet
  - Confirmation sheet specifying Day, Time Slot, and Duration.
* [ ] 11.6 Day selector
  - Dropdown or pill selector for target itinerary day.
* [ ] 11.7 Time selection
  - Time picker for scheduled arrival (e.g. 10:30 AM).
* [ ] 11.8 Estimated duration
  - Duration picker (e.g. 1 hour, 2 hours).
* [ ] 11.9 Notes input
  - Optional personal note text field.
* [ ] 11.10 Local add action
  - Appends place to local in-memory itinerary list.
* [ ] 11.11 Reflect local result in Trip Detail
  - Automatically updates timeline on `TripDetailScreen`.

Acceptance Criteria:
* [ ] Matches Stitch `add_place_confirmation` screen
* [ ] Adding a place inserts it chronologically into the local day itinerary
* [ ] No backend database persistence

Verification:
* Add a mock place and verify it appears in `TripDetailScreen` timeline

---

## FE Phase 12 — Trip Map UI

Status:
* [ ] Not completed

Goal:
Implement full-screen day route map visualization for trips.

Dependencies:
* Phase 10 completed

Subtasks:
* [ ] 12.1 TripMapScreen
  - Full-screen map with floating top bar and bottom preview sheet.
* [ ] 12.2 Numbered markers
  - Circular pins numbered 1, 2, 3 reflecting daily stop sequence.
* [ ] 12.3 Selected marker
  - Highlighted pin state centering map on tap.
* [ ] 12.4 Mock route polyline
  - Connected route line passing through all daily stops.
* [ ] 12.5 Place preview bottom sheet
  - Snappable card showing current focused stop details.
* [ ] 12.6 Day filtering
  - Floating `TWDaySelector` at top switching map routes by day.
* [ ] 12.7 Map controls
  - Re-center, zoom controls, and layer toggle.

Acceptance Criteria:
* [ ] Matches Stitch `trip_map` screen
* [ ] Tapping numbered markers highlights corresponding stop in bottom sheet
* [ ] No external map routing API calls

Verification:
* Visual check against `trip_map/screen.png`

---

## FE Phase 13 — Saved Places UI

Status:
* [ ] Not completed

Goal:
Implement saved bookmarks screen with category filters and empty states.

Dependencies:
* Phase 6 completed

Subtasks:
* [ ] 13.1 SavedPlacesScreen
  - Tab 2 screen displaying bookmarked places in 2-column grid or list.
* [ ] 13.2 SavedEmptyStateView
  - Friendly empty illustration with "Explore Places" CTA.
* [ ] 13.3 Category filter chips
  - Filter by All, Attractions, Cafes, Hotels, Nature.
* [ ] 13.4 Save / unsave local behavior
  - Tapping bookmark icon removes item from saved list with undo snackbar.
* [ ] 13.5 Navigate to Place Detail
  - Tapping card opens `PlaceDetailScreen`.

Acceptance Criteria:
* [ ] Matches Stitch `saved_places` and `saved_empty_state` screens
* [ ] Filtering by category filters the mock items correctly
* [ ] Empty state renders when all items are unsaved

Verification:
* Visual comparison against `saved_places/screen.png` and `saved_empty_state/screen.png`

---

## FE Phase 14 — Profile UI

Status:
* [ ] Not completed

Goal:
Implement user profile, travel statistics, edit profile, and account dialogs.

Dependencies:
* Phase 3 completed

Subtasks:
* [ ] 14.1 ProfileScreen
  - Tab 3 screen with avatar, username, bio, travel stats, menu sections.
* [ ] 14.2 Profile header
  - User avatar with edit button, name, email, member badge.
* [ ] 14.3 Statistics row
  - Stat counters: Trips Planned (14), Places Visited (48), Countries (5).
* [ ] 14.4 Profile menu sections
  - Links to Edit Profile, Travel Preferences, Settings, Sign Out.
* [ ] 14.5 EditProfileScreen
  - Editable form for Name, Email, Bio, Home City, Travel Style.
* [ ] 14.6 Avatar edit visual state
  - Image picker modal mock for updating avatar photo.
* [ ] 14.7 DeleteAccountDialog
  - Destructive confirmation modal with warning text.
* [ ] 14.8 Local edit / save state
  - Updates profile name and bio in memory.

Acceptance Criteria:
* [ ] Matches Stitch `profile`, `edit_profile`, and `delete_account_confirmation` screens
* [ ] Saving profile updates display name immediately in UI
* [ ] No backend user profile sync

Verification:
* Visual check against `profile/screen.png` and `edit_profile/screen.png`

---

## FE Phase 15 — Settings UI

Status:
* [ ] Not completed

Goal:
Implement settings screens for language, currency, and help support.

Dependencies:
* Phase 14 completed

Subtasks:
* [ ] 15.1 SettingsScreen
  - Grouped settings list: Preferences, Notifications, Data & Storage, Support, About.
* [ ] 15.2 LanguageScreen
  - Language selection list (English, Tiếng Việt) with radio / checkmark indicators.
* [ ] 15.3 CurrencyScreen
  - Currency selector (USD $, VND ₫, EUR €, JPY ¥).
* [ ] 15.4 HelpSupportScreen
  - FAQ accordion list and contact support button.
* [ ] 15.5 Theme selector UI
  - Light / Dark / System theme preference toggle.
* [ ] 15.6 Notification toggle UI
  - Switch toggles for Trip Reminders, Weather Alerts, Special Offers.
* [ ] 15.7 Local settings state
  - In-memory state holding user preference selections.

Acceptance Criteria:
* [ ] Matches Stitch `settings`, `language`, `currency`, `help_support` screens
* [ ] Selecting language/currency updates the active checkmark immediately
* [ ] No server persistence

Verification:
* Visual check against `settings/screen.png`, `language/screen.png`, `currency/screen.png`

---

## FE Phase 16 — UI State Completeness

Status:
* [ ] Not completed

Goal:
Ensure all screens comprehensively handle empty, loading, error, disabled, and active states.

Dependencies:
* Phases 4 through 15 completed

Subtasks:
* [ ] 16.1 Empty states audit
  - Verify empty states on My Trips, Saved Places, Itinerary Day, Search Results.
* [ ] 16.2 Loading states audit
  - Verify shimmer placeholders on Map, Place Detail, Itinerary, Route calculations.
* [ ] 16.3 Error states audit
  - Verify banner error alerts on Auth, Route calculation failure, Search not found.
* [ ] 16.4 Disabled states audit
  - Verify button and input disabled styling when required conditions are unmet.
* [ ] 16.5 Selected states audit
  - Verify active borders and colors on chips, tabs, list tiles, and map markers.
* [ ] 16.6 Form validation states audit
  - Verify inline validation errors on Sign In, Sign Up, Create Trip forms.
* [ ] 16.7 Bottom sheet states audit
  - Verify snap points (peek, medium, full expanded) across all modal sheets.

Acceptance Criteria:
* [ ] No blank screens or unhandled empty/loading states
* [ ] Every interactive element has clear tap and focus feedback

Verification:
* Manual state walkthrough using debug toggles

---

## FE Phase 17 — Responsive & Mobile Performance Audit

Status:
* [ ] Not completed

Goal:
Audit and optimize layout scaling, 60 FPS scrolling, rebuild scopes, and memory safety across devices.

Dependencies:
* Phase 16 completed

Subtasks:
* [ ] 17.1 Small Android phone audit
  - Test on 360x640 resolution (verify no horizontal overflows or clipped text).
* [ ] 17.2 Standard Android phone audit
  - Test on 390x844 resolution (standard baseline layout).
* [ ] 17.3 Large Android phone / tablet audit
  - Test on > 430px width (verify maximum readable width constraints).
* [ ] 17.4 iPhone-size layouts audit
  - Verify compatibility with iOS notch, dynamic island, and rounded screen corners.
* [ ] 17.5 Safe areas audit
  - Verify no interactive element is obscured by status bar or home indicator.
* [ ] 17.6 Keyboard overflow audit
  - Verify form screens scroll smoothly above keyboard without `BottomOverflowed` errors.
* [ ] 17.7 Long text & ellipsis audit
  - Test multi-line place titles and descriptions with `TextOverflow.ellipsis` and `maxLines`.
* [ ] 17.8 Rebuild scope & state isolation audit
  - Verify state updates (bookmark toggle, day switch) do not trigger full-screen re-renders.
* [ ] 17.9 Large-list scrolling & lazy builder audit
  - Test scrolling with 50 places, 30 saved items, 20 trips, 50 route steps ensuring smooth 60 FPS.
* [ ] 17.10 Image decoding & cache dimensions audit
  - Verify list thumbnails use `cacheWidth`/`cacheHeight` to avoid excessive GPU RAM usage.
* [ ] 17.11 Map marker performance & decoupling audit
  - Verify map marker widget trees remain lightweight and decoupled from bottom sheet dragging.
* [ ] 17.12 Animation & shadow GPU cost audit
  - Verify shadows adhere to `AppShadows` levels and animations are hardware-accelerated.
* [ ] 17.13 Controller & focus node disposal audit
  - Verify all `TextEditingController`, `ScrollController`, `FocusNode`, `AnimationController` instances are cleanly disposed.
* [ ] 17.14 Widget tree complexity & layout depth audit
  - Eliminate redundant nested `Stack`, `LayoutBuilder`, and `SingleChildScrollView` containers.
* [ ] 17.15 Low-end device performance review
  - Profile and verify memory usage, CPU usage, and frame rate on simulated low-spec hardware.

Acceptance Criteria:
* [ ] 0 layout overflow exceptions across all device sizes
* [ ] Safe area is strictly respected on iOS and Android
* [ ] No obvious unnecessary full-screen rebuilds
* [ ] Long lists use lazy builders (`ListView.builder`, `SliverList`)
* [ ] Large images are not decoded unnecessarily (cache dimensions specified)
* [ ] Scroll remains smooth with development-scale mock data (50 items)
* [ ] All controllers, focus nodes, and animation resources are properly disposed
* [ ] Map UI does not rebuild for unrelated state changes
* [ ] Animations are lightweight with no expensive blur/shader overhead

Verification:
* Emulate multiple device resolutions in Flutter Inspector

---

## FE Phase 18 — Design Consistency Audit

Status:
* [ ] Not completed

Goal:
Perform pixel-level visual comparison between Flutter implementation and Google Stitch exports.

Dependencies:
* Phase 17 completed

Subtasks:
* [ ] 18.1 Color audit
  - Verify all colors strictly reference `AppColors` tokens (0 arbitrary hex literals in screens).
* [ ] 18.2 Typography audit
  - Verify font sizes, line heights, and weights match `AppTypography` Inter scale.
* [ ] 18.3 Spacing audit
  - Verify all margins and paddings adhere to 8pt grid (`AppSpacing`).
* [ ] 18.4 Radius audit
  - Verify border radii match `AppRadius` tokens.
* [ ] 18.5 Shadow audit
  - Verify dropshadow elevations match `AppShadows` levels.
* [ ] 18.6 Icon sizing audit
  - Standardize icon sizes (16px small, 20px medium, 24px large).
* [ ] 18.7 Button sizing audit
  - Standardize button heights (48px primary, 36px secondary).
* [ ] 18.8 Card sizing audit
  - Verify card padding and proportions across `TWPlaceCard`, `TWTripCard`, `TWItineraryCard`.
* [ ] 18.9 Image ratio audit
  - Verify 1:1, 4:3, 16:9 aspect ratios across photo galleries and hero banners.
* [ ] 18.10 Map overlay audit
  - Verify floating search bar, markers, and HUD controls match Stitch positioning.
* [ ] 18.11 Navigation consistency audit
  - Ensure active tab indicators and page transitions are consistent.
* [ ] 18.12 Remove duplicate widgets
  - Refactor any redundant widgets into shared `TW*` library.
* [ ] 18.13 Remove one-off style constants
  - Eliminate any screen-level style duplication.

Acceptance Criteria:
* [ ] Visual fidelity matches Stitch designs across all 32 mapped screens
* [ ] Codebase has 0 hardcoded colors or spacing values

Verification:
* Side-by-side comparison with `.stitch/designs/` HTML renders and screen PNGs

---

## FE Phase 19 — Accessibility Baseline

Status:
* [ ] Not completed

Goal:
Ensure the mobile UI meets mobile accessibility (a11y) standards.

Dependencies:
* Phase 18 completed

Subtasks:
* [ ] 19.1 Touch target review
  - Ensure all interactive buttons and icons have at least 44x44px touch area.
* [ ] 19.2 Text contrast review
  - Verify WCAG AA compliance (4.5:1 for body text, 3:1 for large text).
* [ ] 19.3 Semantic labels
  - Add `Semantics` / `tooltip` to icons and buttons.
* [ ] 19.4 Icon-button labels
  - Ensure back, close, search, and filter buttons have descriptive labels.
* [ ] 19.5 Text scaling review
  - Test layout with device system font scaling set to 1.3x.
* [ ] 19.6 Form error readability
  - Ensure error messages have high contrast and clear icons.

Acceptance Criteria:
* [ ] All touch targets meet minimum 44x44px size
* [ ] Text scaling does not break screen layouts

Verification:
* Flutter accessibility guidelines check

---

## FE Phase 20 — Final UI/UX QA

Status:
* [ ] Not completed

Goal:
Perform end-to-end user journey smoke testing on the complete Flutter UI prototype.

Dependencies:
* Phases 0 through 19 completed

Subtasks:
* [ ] 20.1 Welcome → Sign In smoke test
* [ ] 20.2 Welcome → Sign Up smoke test
* [ ] 20.3 Auth → Explore transition smoke test
* [ ] 20.4 Explore → Selected Place sheet smoke test
* [ ] 20.5 Selected Place → Place Detail smoke test
* [ ] 20.6 Place Detail → Route preview smoke test
* [ ] 20.7 Main Bottom Navigation tab switching smoke test
* [ ] 20.8 My Trips library smoke test
* [ ] 20.9 Create Trip 5-step wizard smoke test
* [ ] 20.10 Trip Detail & Day timeline smoke test
* [ ] 20.11 Add Place to itinerary smoke test
* [ ] 20.12 Trip Map visualization smoke test
* [ ] 20.13 Saved Places bookmarks smoke test
* [ ] 20.14 Profile & statistics smoke test
* [ ] 20.15 Settings, language & currency smoke test
* [ ] 20.16 Empty states smoke test
* [ ] 20.17 Loading states smoke test
* [ ] 20.18 Error states smoke test
* [ ] 20.19 `dart format` clean pass
* [ ] 20.20 `flutter analyze` 0 errors, 0 warnings
* [ ] 20.21 `flutter test` test suite pass
* [ ] 20.22 Android UI smoke test
* [ ] 20.23 iOS UI smoke test (where environment supports it)

Acceptance Criteria:
* [ ] Every mapped Stitch screen has an accurate Flutter equivalent
* [ ] Navigation works end-to-end across all flows
* [ ] Shared `TW*` widgets are 100% reused
* [ ] Mock states work seamlessly offline
* [ ] No backend / API integration exists
* [ ] 0 layout overflow warnings
* [ ] `flutter analyze` passes with 0 issues

Verification:
* Complete end-to-end interactive manual QA walkthrough

---

# FE Phase Completion Log

## FE Phase 0 completed — 2026-08-19

Summary:
* Bootstrapped Flutter project workspace in `mobile/`.
* Configured minimal UI-focused `pubspec.yaml` with `google_fonts` and `flutter_lints`.
* Configured assets directories (`assets/images/`, `assets/icons/`).
* Created feature-first base folder structure (`lib/app/`, `lib/core/`, `lib/shared/`, `lib/features/`).
* Implemented minimal neutral launch app (`lib/main.dart`, `lib/app/app.dart`) and verified with widget test.

Subtasks completed:
* 0.1 Initialize Flutter project
* 0.2 Verify project structure
* 0.3 Configure basic pubspec
* 0.4 Configure assets
* 0.5 Configure fonts
* 0.6 Create base lib structure
* 0.7 Minimal app launch

Files changed / created:
* `mobile/pubspec.yaml`
* `mobile/assets/images/.gitkeep`
* `mobile/assets/icons/.gitkeep`
* `mobile/lib/main.dart`
* `mobile/lib/app/app.dart`
* `mobile/lib/shared/.gitkeep`
* `mobile/lib/features/.gitkeep`
* `mobile/test/widget_test.dart`
* `mobile/PHASES.md`

Verification:
* flutter pub get — PASS (resolved dependencies cleanly)
* dart format — PASS (formatted all dart files)
* flutter analyze — PASS (0 issues found)
* flutter test — PASS (TripWiseApp bootstrap renders neutral placeholder)
* manual visual comparison with Stitch — N/A (neutral placeholder)

Known limitations:
* Font files currently load via `google_fonts` runtime; local bundled TTF assets can be added if offline font rendering is required.

Next phase:
* Phase 1 — Design System Tokens (Subtask 1.1 AppColors)

---

## FE Phase 1 completed — 2026-08-19

Summary:
* Implemented complete centralized Flutter design tokens in `mobile/lib/core/theme/`.
* `AppColors`: Documented Stitch color tokens (`primary: #0058BC`, `primaryContainer: #0070EB`, `background: #FCF9F8`, `surfaceContainerLowest: #FFFFFF`, `onSurface: #1C1B1B`, outlines, secondaries, tertiaries, and status colors).
* `AppTypography`: Documented Inter hierarchy (`display`, `titleLarge`, `titleMedium`, `titleSmall`, `bodyLarge`, `bodyMedium`, `bodySmall`, `labelLarge`, `labelMedium`, `caption`) as compile-time `const TextStyle` and `TextTheme`.
* `AppSpacing`: Documented 8pt spatial grid (`xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `xxl: 24`, `xxxl: 32`) with EdgeInset helpers.
* `AppRadius`: Documented corner radii (`sm: 4`, `md: 8`, `lg: 12`, `xl: 16`, `xxl: 24`, `pill: 9999`) with BorderRadius and top-only sheet helpers.
* `AppShadows`: Documented ambient elevation drop shadows (`level1`, `level2`, `level3`).
* `AppTheme`: Created unified Material 3 `ThemeData` for `lightTheme` and structural `darkTheme`.
* Applied `AppTheme.lightTheme` to `TripWiseApp` in `lib/app/app.dart`.
* Verified all tokens with comprehensive unit tests in `test/widget_test.dart`.

Subtasks completed:
* 1.1 AppColors
* 1.2 AppTypography
* 1.3 AppSpacing
* 1.4 AppRadius
* 1.5 AppShadows
* 1.6 AppTheme
* 1.7 Light theme
* 1.8 Dark theme foundation
* 1.9 Design token audit

Files changed / created:
* `mobile/lib/core/theme/app_colors.dart`
* `mobile/lib/core/theme/app_typography.dart`
* `mobile/lib/core/theme/app_spacing.dart`
* `mobile/lib/core/theme/app_radius.dart`
* `mobile/lib/core/theme/app_shadows.dart`
* `mobile/lib/core/theme/app_theme.dart`
* `mobile/lib/app/app.dart`
* `mobile/test/widget_test.dart`
* `mobile/PHASES.md`

Verification:
* dart format — PASS (formatted all dart files)
* flutter analyze — PASS (0 issues found)
* flutter test — PASS (All 7 unit and widget smoke tests passed)
* visual/smoke verification — PASS (TripWiseApp applies AppTheme.lightTheme)

Known limitations:
* Dark theme currently implements a structural foundation based on available Stitch tokens; full dark UI palette will be refined if dark mode designs are expanded.

Next phase:
* Phase 2 — Core Shared Components (Subtask 2.1 TWButton)

---

## FE Phase 2 completed — 2026-08-19

Summary:
* Implemented complete reusable atomic widget library (`TW*`) across Batch A and Batch B adhering strictly to Production Performance Rules and Stitch design system tokens.
* `TWButton`: Universal action button with variants (`primary`, `secondary`, `outline`, `tonal`, `danger`), sizes (`sm`, `md`, `lg`), states (`default`, `pressed`, `disabled`, `loading`), and full-width/intrinsic support.
* `TWIconButton`: Accessible 44x44 icon button with `surface` (`level1` shadow), `ghost`, `primary`, `tonal` variants, `selected` and `disabled` states.
* `TWTextField`: Form input supporting labels, hints, helper text, inline validation error text, prefix/suffix icons, and password obscuring; externally managed controllers.
* `TWSearchBar`: Lightweight search bar for Map floating overlays (`level2` shadow) and inline search with filter trigger and query clear button.
* `TWChip`: Filter and category selection chip (`choice`, `filter` with checkmark, `statusBadge`).
* `TWAvatar` & `TWAvatarGroup`: Single avatar with image/initials/icon fallback and overlapping cluster with `+N` overflow indicator.
* `TWEmptyState`: Universal empty state container with icon/illustration, headline, description, primary and secondary CTAs, wrapped in `SingleChildScrollView` for small-device overflow safety.
* `TWSettingsRow`: Settings menu item with icon, title, subtitle, trailing value, chevron, and parent-controlled toggle switch.
* Loading primitives: `TWLoadingIndicator`, `TWSkeleton`, `TWCardSkeleton` without third-party dependencies.
* Error feedback: `TWErrorBanner` with inline retry/dismiss actions and `TWSnackbar` helper.
* `ComponentPreviewScreen`: Development-only visual catalog displaying all Phase 2 components in their various states.

Subtasks completed:
* 2.1 TWButton
* 2.2 TWIconButton
* 2.3 TWTextField
* 2.4 TWSearchBar
* 2.5 TWChip
* 2.6 TWAvatar
* 2.7 TWEmptyState
* 2.8 TWSettingsRow
* 2.9 Loading primitives
* 2.10 Error feedback primitives
* 2.11 Shared component preview screen

Files changed / created:
* `mobile/lib/shared/widgets/buttons/tw_button.dart`
* `mobile/lib/shared/widgets/buttons/tw_icon_button.dart`
* `mobile/lib/shared/widgets/inputs/tw_text_field.dart`
* `mobile/lib/shared/widgets/inputs/tw_search_bar.dart`
* `mobile/lib/shared/widgets/chips/tw_chip.dart`
* `mobile/lib/shared/widgets/avatars/tw_avatar.dart`
* `mobile/lib/shared/widgets/feedback/tw_empty_state.dart`
* `mobile/lib/shared/widgets/lists/tw_settings_row.dart`
* `mobile/lib/shared/widgets/feedback/tw_loading.dart`
* `mobile/lib/shared/widgets/feedback/tw_error_banner.dart`
* `mobile/lib/features/dev/component_preview_screen.dart`
* `mobile/lib/app/app.dart`
* `mobile/test/batch_a_widgets_test.dart`
* `mobile/test/batch_b_widgets_test.dart`
* `mobile/test/widget_test.dart`
* `mobile/PHASES.md`
* `HANDOFF.md`

Verification:
* dart format — PASS (all Dart files formatted)
* flutter analyze — PASS (0 issues found)
* flutter test — PASS (All 32 tests passed across 3 suites)
* manual component preview — PASS (ComponentPreviewScreen renders all sections cleanly)

Known limitations:
* Mock data only; widgets are purely presentation and local state components.

Next phase:
* Phase 3 — Router & Main App Shell (Subtask 3.1 Central route definitions)
