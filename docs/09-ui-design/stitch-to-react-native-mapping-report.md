# Stitch → React Native + TypeScript + Expo Mapping Report

> **ACTIVE IMPLEMENTATION MAPPING**
>
> Google Stitch remains the visual source of truth. React Native source and Expo configuration remain the implementation source of truth. This report maps between them; it does not modify approved visuals, tokens, screen hierarchy, or UX flow.

## 1. Audited sources

- Approved mobile visual bundle: `stitch_tripwise_design_system/stitch_tripwise_design_system/<screen>/screen.png` and `code.html`.
- Additional Stitch HTML exports: `.stitch/designs/*.html`.
- Approved token references: `.stitch/DESIGN.md` and `stitch_tripwise_design_system/stitch_tripwise_design_system/premium_map_first_travel/DESIGN.md`.
- Active implementation: `mobile/src/**/*.ts(x)`, `mobile/package.json`, `mobile/app.json`, and `mobile/tsconfig.json`.
- Navigation contract: `mobile/src/navigation/types.ts`, `AppNavigator.tsx`, and `MainTabs.tsx`.

The Stitch exports contain mobile, desktop, landing, and admin references. Their presence does not create a mobile route. Only route names found in the React Navigation source are marked as implemented below.

## 2. Status vocabulary

| Status | Meaning |
|---|---|
| `Implemented` | A matching React Native screen/component and actual React Navigation route exist. |
| `Foundation` | A real screen/route exists, but the screen is minimal or has not been reconciled with the approved Stitch visual. |
| `Placeholder` | The route exists and renders `PlaceholderScreen`; production UI is not implemented. |
| `Planned` | Stitch visual/spec exists, but no matching React Native screen or route exists. |
| `Historical/alternate export` | Visual/export is retained for reference but is not evidence of an active mobile route. |

## 3. Screen mapping

Route values below are React Navigation route names, not URL paths. The current app does not use Expo Router.

| Stitch screen/export | React Native screen/component | Feature/module | Verified route | Status |
|---|---|---|---|---|
| `welcome` | None | `features/auth` (planned) | None | Planned |
| `sign_in` | `LoginScreen.tsx` | `features/auth` | `Login` | Foundation; functional auth UI, Stitch visual audit pending |
| `sign_up` | `RegisterScreen.tsx` | `features/auth` | `Register` | Foundation; functional auth UI, Stitch visual audit pending |
| `forgot_password` | None | `features/auth` (planned) | None | Planned |
| `explore_map` | `ExploreScreen.tsx` | `features/explore` | `Explore` tab | Placeholder |
| `selected_place` | None | `features/place` (planned) | None | Planned |
| `place_detail` | None | `features/place` (planned) | None | Planned |
| `route_preview` | None | `features/route` (planned) | None | Planned |
| `route_options` | None | `features/route` (planned) | None | Planned |
| `route_detail` | None | `features/route` (planned) | None | Planned |
| `my_trips` | `TripsScreen.tsx` | `features/trips` | `Trips` tab | Placeholder |
| `.stitch/designs/tripwise_plan_new_trip.html` | `PlanScreen.tsx` | `features/planner` | `Plan` tab | Placeholder; alternate HTML export only |
| `create_trip_success` | None | `features/planner` (planned) | None | Planned |
| `trip_detail` | None | `features/itinerary` (planned) | None | Planned |
| `trip_map` | None | `features/itinerary` (planned) | None | Planned |
| `add_place_confirmation` | None | `features/itinerary` (planned) | None | Planned |
| `saved_places` | None | `features/saved` (planned) | None | Planned; not a current root tab |
| `saved_empty_state` | None | `features/saved` (planned) | None | Planned |
| `profile` | `ProfileScreen.tsx` | `features/profile` | `Profile` tab | Foundation; real profile data/sign-out, Stitch visual audit pending |
| `edit_profile` | None | `features/profile` (planned) | None | Planned |
| `settings` | None | `features/settings` (planned) | None | Planned |
| `language` | None | `features/settings` (planned) | None | Planned |
| `currency` | None | `features/settings` (planned) | None | Planned |
| `help_support` | None | `features/settings` (planned) | None | Planned |
| `sign_out_confirmation` | None | `features/profile` (planned) | None | Planned; current sign-out is a direct action |
| `delete_account_confirmation` | None | `features/profile` (planned) | None | Planned |

### Active route without a direct mobile Stitch screen

| React Native screen | Feature/module | Verified route | Status |
|---|---|---|---|
| `HomeScreen.tsx` | `features/home` | `Home` tab | Placeholder; no direct approved mobile Stitch screen was found during this audit |

The authenticated shell contains exactly five verified tabs: `Home`, `Explore`, `Plan`, `Trips`, and `Profile`. Any additional root tab or nested route requires a separate navigation decision/task.

## 4. Shared component mapping

The `TW*` names below are approved design-spec names. They are not marked as implemented unless a matching TypeScript component exists in `mobile/src`.

| Stitch/design component | Active React Native mapping | Source status |
|---|---|---|
| `TWButton` | Typed `Pressable` abstraction using theme tokens | Planned; auth/profile currently use local `Pressable` styles |
| `TWIconButton` | Accessible typed `Pressable` with icon slot | Planned |
| `TWTextField` | Controlled `TextInput` with typed props and validation/error state | Planned shared component; auth currently uses screen-local `TextInput` |
| `TWSearchBar` | Controlled `TextInput` + actions, safe-area aware | Planned |
| `TWChip` | Typed `Pressable` with selected/disabled/accessibility states | Planned |
| `TWAvatar` | Bounded image/fallback initials component | Planned |
| `TWPlaceCard` | Typed place-summary card | Planned |
| `TWRouteCard` | Typed route-summary card | Planned |
| `TWTripCard` | Typed trip-summary card | Planned |
| `TWItineraryCard` | Typed itinerary-item card | Planned |
| Navigation shell | `MainTabs.tsx` + typed `MainTabParamList` | Implemented with React Navigation bottom tabs |
| Auth navigation | `AppNavigator.tsx` + typed `AuthStackParamList` | Implemented with native stack and auth guard |
| Screen/safe-area primitive | `Screen.tsx` | Implemented |
| Typography primitive | `AppText.tsx` | Implemented |
| Placeholder primitive | `PlaceholderScreen.tsx` | Implemented; foundation only |
| Auth form layout | `AuthScreenLayout.tsx` | Implemented; keyboard-aware foundation |
| Sheets/modals | Expo-compatible sheet/modal component selected per phase | Planned; no shared production component exists |
| Loading feedback | `ActivityIndicator` inside `AuthBootstrapScreen` | Implemented locally; no shared `TWLoading` yet |
| Error/empty feedback | `AppText` messages / `PlaceholderScreen` | Foundation only; shared error/empty components planned |

Do not create duplicate feature-specific components when the approved shared component can support the required variants. Conversely, do not claim the planned `TW*` library exists merely because its specification exists.

## 5. Design token mapping

Approved values remain defined by the Stitch DESIGN files. This documentation task does not alter either the Stitch tokens or `mobile/src/theme/tokens.ts`.

| Token family | Approved Stitch source | Current TypeScript mapping | Audit status |
|---|---|---|---|
| Colors | `colors` in the Premium Map-First DESIGN file | `colors` in `mobile/src/theme/tokens.ts` | Foundation exists; values are not yet fully reconciled with the approved Stitch palette |
| Typography | `typography` with Inter hierarchy | `typography` | Partial foundation (`body`, `title`, line height, weights); full semantic scale/font loading pending |
| Spacing | `spacing` (`xs` through `3xl`) | `spacing` (`xs` through `xl`) | Partial foundation; preserve approved values during future reconciliation |
| Radius | `rounded` (`sm` through `full`) | `radius` (`card`, `control`) | Partial foundation |
| Shadows/elevation | Level 0–3 ambient shadow guidance | None in `tokens.ts` | Planned; do not hardcode per-screen shadow values |

React Native implementation must express approved tokens as typed objects and `StyleSheet` values. Web CSS variables, Tailwind classes, and Flutter `ThemeData` are not implementation APIs for the active client.

## 6. Navigation and Expo mapping

- Bootstrap: `mobile/index.ts` uses Expo `registerRootComponent`; `App.tsx` renders `AppRoot`.
- Root boundary: `AppRoot.tsx` installs `SafeAreaProvider`, auth provider, and status bar.
- Navigation: React Navigation 7 (`NavigationContainer`, native stack, bottom tabs).
- Auth guard: loading → auth stack (`Login`, `Register`) or authenticated `MainTabs`.
- Typed route lists: `AuthStackParamList` and `MainTabParamList`.
- Current target: Android development build/runtime. Keep components/config portable for future iOS work.
- Expo Router is not installed or used; do not document file-system URL routes as current behavior.

## 7. Performance mapping

| Design/web concept | React Native/Expo implementation rule |
|---|---|
| Long repeated cards | Use `FlatList`/`SectionList` virtualization, stable `keyExtractor`, bounded render windows, and pagination-ready data boundaries |
| Large grids | Use virtualized columns; do not render an unbounded array inside `ScrollView` |
| Component updates | Keep state scoped; isolate frequently changing map/form state; use `React.memo`, `useMemo`, and `useCallback` only when they reduce real work |
| Images/galleries | Request bounded image sizes, define dimensions/aspect ratio, avoid retaining full-resolution images, provide loading/error fallback and phase-approved caching |
| Map markers | Keep marker views lightweight, use stable identities, cluster/filter when the phase requires it, and avoid rerendering all markers for unrelated UI state |
| Animation | Prefer transform/opacity and native/UI-thread-friendly animation; avoid expensive JS-thread layout loops |
| Effects/resources | Clean up listeners, subscriptions, timers, abortable requests, and animation resources |
| Native boundary | Avoid unnecessary bridge/native calls and repeated permission/config lookups |
| Verification | Test large mock fixtures and low-end Android scrolling/memory behavior before marking list-heavy phases complete |

## 8. Historical Flutter mappings

The following files are preserved only for history and must carry the label **SUPERSEDED / HISTORICAL — Flutter implementation mapping**:

- [`stitch-flutter-mapping.md`](./stitch-flutter-mapping.md)
- [`stitch-to-flutter-mapping-report.md`](./stitch-to-flutter-mapping-report.md)

They must not be used for active folder paths, widgets, routes, verification commands, or completion evidence.

## 9. Implementation boundary

This report does not authorize screen generation, UI changes, dependency additions, route additions, backend integration, or design-token changes. Implement only the active FE phase explicitly requested by the user, using Stitch for visual fidelity and current React Native source for architecture.
