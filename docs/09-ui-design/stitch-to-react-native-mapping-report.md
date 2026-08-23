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
| `home_populated` (`6e2008eca51c455989f7045316a293cf`) | `HomeScreen.tsx` | `features/home` | `Home` tab | Implemented |
| `home_no_upcoming_trip` (`0ce82fc844314d7ea54176e5aba8dc76`) | `HomeScreen.tsx` / `HomeEmptyHero.tsx` | `features/home` | `Home` tab (empty state) | Implemented |
| `home_loading` (`9ab12562a2a745429f9effbb47b08595`) | `HomeScreen.tsx` / `HomeLoadingSkeleton.tsx` | `features/home` | `Home` tab (loading state) | Implemented |
| `welcome` (`83676eeee75c47d5b3418d12813061f7`) | `WelcomeScreen.tsx` | `features/auth` | `Welcome` | Implemented |
| `sign_in` (`810dc42f6c0a4b86928b01b329b70c7c`) | `LoginScreen.tsx` | `features/auth` | `Login` | Implemented |
| `sign_up` (`104b9175808342c79e0bb0a55ed3b460`) | `RegisterScreen.tsx` | `features/auth` | `Register` | Implemented |
| `forgot_password` (`6460ce545beb40f3ba5c2f8b3bad86e9`) | `ForgotPasswordScreen.tsx` | `features/auth` | `ForgotPassword` | Implemented |
| `explore_map` (`7b89a0b104ce4e799bb084461e8e06c8`) | `ExploreScreen.tsx` | `features/explore` | `Explore` tab | Implemented |
| `selected_place` (`ad632987171343daa5d58985ed459cf7`) | `ExplorePlacePreview.tsx` | `features/explore` | Embedded preview sheet | Implemented |
| `place_detail` (`4a1161c5a2be4ec48989e64e9f0f9c34`) | `PlaceDetailScreen.tsx` | `features/place` | `PlaceDetail` | Implemented |
| `route_preview` (`cbd3a167c88e460ab769193a99111724`) | `RoutePreviewScreen.tsx` | `features/route` | `RoutePreview` | Implemented |
| `route_options` (`e51133ad68ff4b8aaa9598fbdb4555e9`) | `TWTransportSelector.tsx` | `features/route` | Embedded in `RoutePreview` | Implemented |
| `route_detail` (`e20bd85846554aceb359f18d2f2319c4`) | `RouteStepList.tsx` / `RouteStepItem.tsx` | `features/route` | Embedded in `RoutePreview` | Implemented |
| `my_trips` (`96cf6272c84148dba361616f3e5df228`) | `MyTripsScreen.tsx` / `TripsScreen.tsx` | `features/trips` | `Trips` tab | Implemented |
| `create_trip_wizard` (`41b6ba45`, `7ac57f19`, `40ccdeb7`, `8580b192`, `035e34e3`, `69b987cb`) | `CreateTripWizardScreen.tsx` / `PlanScreen.tsx` | `features/planner` | `Plan` tab, `CreateTripWizard` | Implemented |
| `create_trip_success` (`17d4ea69a4634d8f9117def6e333141d`) | `CreateTripSuccessView.tsx` | `features/planner` | Embedded wizard view | Implemented |
| `trip_detail` (`1e86508f0dd0413db877d859125b630f` & `b7afd059c3ec4faea06e390ef6374782`) | `TripDetailScreen.tsx` | `features/trips` | `TripDetail` | Implemented |
| `trip_detail_empty` (`2fceedb1844049b899f7430c12b90d58`) | `TripEmptyDayState.tsx` | `features/trips` | Embedded itinerary state | Implemented |
| `trip_map` (`2391fa10e797496badae2361897c492b`) | `TripMapScreen.tsx` | `features/trips` | `TripMap` | Implemented |
| `add_place_search` (`c6a1af4f3fc34a6195f0a879678a5ccc`) | `AddPlaceScreen.tsx` | `features/trips` | `AddPlace` | Implemented |
| `add_place_confirmation` (`075e69f1acec4b18bb876c9a0a33f391`) | `AddPlaceConfirmationSheet.tsx` | `features/trips` | Embedded confirmation sheet | Implemented |
| `saved_places` (`3e59b6c7b2e646feb189eb8a313b6a6e`) | `SavedPlacesScreen.tsx` | `features/saved` | `Saved` tab, `SavedPlaces` | Implemented |
| `saved_empty_state` (`aa0abf7fea0f4e05bebdbf471c9d7ae3`) | `SavedEmptyState.tsx` | `features/saved` | Embedded empty state | Implemented |
| `profile` (`52ec564262214ec3b91b5c62daa03d6f`) | `ProfileScreen.tsx` | `features/profile` | `Profile` tab | Implemented |
| `edit_profile` (`49c6b6a2c6284f169d1c6140037cebdd`) | `EditProfileScreen.tsx` | `features/profile` | `EditProfile` | Implemented |
| `settings` (`27bdea676ae041ecb09a7bc987363b9e`) | `SettingsScreen.tsx` | `features/settings` | `Settings` | Implemented |
| `language` (`d2cb583265f14761b79be9ea5d6be835`) | `LanguageSettingsScreen.tsx` | `features/settings` | `LanguageSettings` | Implemented |
| `currency` (`c69da60c4d474121b8b71d5b8de57aad`) | `CurrencySettingsScreen.tsx` | `features/settings` | `CurrencySettings` | Implemented |
| `help_support` (`92e619bfeb504afebd6d87fccbf90f4c`) | `HelpSupportScreen.tsx` | `features/settings` | `HelpSupport` | Implemented |
| `sign_out_confirmation` (`040103dc04894ee0bc3aff41cd37534e`) | `ProfileDestructiveDialog.tsx` | `features/profile` | Embedded destructive dialog | Implemented |
| `delete_account_confirmation` (`2f74fdf1e9314c448c49eb7d14447c32`) | `ProfileDestructiveDialog.tsx` | `features/profile` | Embedded destructive dialog | Implemented |

### Historical / Superseded Stitch Prototypes (OBSOLETE_STITCH)

| Stitch screen/export | Stitch ID | Status | Superseded by | Reason |
|---|---|---|---|---|
| `profile_prototype` | `11b7d47ec60248228ca6ddd2ddae3ab9` | Obsolete | `Profile` (`52ec5642...`) | Earlier design prototype replaced by final Profile screen |
| `my_trips_prototype` | `39f91f7b73ad48798311a2ed7ba8711e` | Obsolete | `My Trips` (`96cf6272...`) | Earlier design prototype replaced by final My Trips screen |
| `sign_up_prototype` | `79ae54d4b7114f5f92cac4e71b0c79d8` | Obsolete | `Sign Up` (`104b9175...`) | Earlier design prototype replaced by final Sign Up screen |
| `settings_prototype` | `8e165cd9563845628fe2a3809cd17ac5` | Obsolete | `Settings` (`27bdea67...`) | Earlier design prototype replaced by final Settings screen |
| `sign_in_prototype` | `14000492244e47a69c26a991781081c0` | Obsolete | `Sign In` (`810dc42f...`) | Earlier design prototype replaced by final Sign In screen |
| `welcome_initial` | `6a819183f24d4316be1371c317d2cc5d` | Obsolete | `Welcome` (`83676eee...`) | Initial export replaced by final Welcome screen |
| `untitled_prototype` | `301665e030a3434ab28ed817628143df` | Obsolete | None | Empty prototype canvas artifact |

### Direct mobile Stitch UI coverage
All 6 authenticated navigation tabs (`Home`, `Explore`, `Plan`, `Trips`, `Saved`, and `Profile`) and all stack modal/flows now have 100% production React Native implementation matching Google Stitch design screens.

- Total active Stitch design screens: **37**
- Total obsolete Stitch prototype screens: **7**
- Total React Native implemented screens/states: **37 / 37** (100% UI Coverage)

## 4. Shared component mapping

The `TW*` names below are approved design-spec names.

| Stitch/design component | Active React Native mapping | Source status |
|---|---|---|
| `TWButton` | Typed `Pressable` abstraction using theme tokens | Implemented in feature buttons with theme tokens |
| `TWIconButton` | Accessible typed `Pressable` with icon slot (`MaterialIcons`) | Implemented across headers and toolbars |
| `TWTextField` | Controlled `TextInput` with typed props, labels & error messages | Implemented in auth/profile/wizard/settings forms |
| `TWSearchBar` | Controlled `TextInput` + actions, safe-area aware (`ExploreSearchBar.tsx`) | Implemented |
| `TWChip` | Typed `Pressable` with selected/disabled/accessibility states (`ExploreCategoryChips`, `SavedCategoryChips`, `TWTransportSelector`) | Implemented |
| `TWAvatar` | Bounded image/fallback initials component (`ProfileHeader`, `avatarOptions`) | Implemented |
| `TWPlaceCard` | Typed place-summary card (`TWPlaceCard.tsx`, `SavedPlaceCard.tsx`, `AddPlaceResultCard.tsx`) | Implemented |
| `TWRouteCard` | Typed route-summary card (`RouteSummaryCard.tsx`) | Implemented |
| `TWTripCard` | Typed trip-summary card (`TWTripCard.tsx`, `PastTripCard.tsx`) | Implemented |
| `TWItineraryCard` | Typed itinerary-item card (`ItineraryCard.tsx`) | Implemented |
| Navigation shell | `MainTabs.tsx` + typed `MainTabParamList` | Implemented with React Navigation 7 bottom tabs (6 tabs) |
| Auth navigation | `AppNavigator.tsx` + typed `AuthStackParamList` | Implemented with native stack and auth guard |
| Screen/safe-area primitive | `Screen.tsx` | Implemented |
| Typography primitive | `AppText.tsx` | Implemented |
| Placeholder primitive | `PlaceholderScreen.tsx` | Implemented |
| Auth form layout | `AuthScreenLayout.tsx` | Implemented with keyboard avoidance |
| Sheets/modals | `ExplorePlacePreview.tsx`, `AddPlaceConfirmationSheet.tsx`, `ProfileDestructiveDialog.tsx` | Implemented |
| Loading feedback | `ActivityIndicator` inside `AuthBootstrapScreen`, `ExploreScreen`, `RoutePreviewScreen`, `TripDetailScreen` | Implemented |
| Error/empty feedback | `ExploreEmptyState`, `ExploreErrorState`, `TripsEmptyState`, `TripEmptyDayState`, `SavedEmptyState`, `RouteUnavailableState` | Implemented |

## 5. Design token mapping

Approved values remain defined by the Stitch DESIGN files and are fully implemented in `mobile/src/theme/`.

| Token family | Approved Stitch source | Current TypeScript mapping | Audit status |
|---|---|---|---|
| Colors | `colors` in the Premium Map-First DESIGN file | `lightPalette` & `darkPalette` in `mobile/src/theme/palettes.ts` | Reconciled & implemented (100% semantic tokens) |
| Typography | `typography` with Inter hierarchy | `typography` in `mobile/src/theme/tokens.ts` | Reconciled & implemented |
| Spacing | `spacing` (`xs` through `3xl`) | `spacing` (`xs` through `3xl`) in `mobile/src/theme/tokens.ts` | Reconciled & implemented |
| Radius | `rounded` (`sm` through `full`) | `radius` (`card`, `control`, `pill`, `sm`, `md`, `lg`, `xl`) | Reconciled & implemented |
| Shadows/elevation | Level 0–3 ambient shadow guidance | Shadow & elevation styles in components | Reconciled & implemented |

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
