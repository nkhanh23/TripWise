# SUPERSEDED / HISTORICAL — Flutter implementation mapping

> This file is preserved only as a record of the abandoned Flutter UI experiment. It is not an active implementation guide. Use [`stitch-to-react-native-mapping-report.md`](./stitch-to-react-native-mapping-report.md) and the React Native source under `mobile/src/`.

> **Historical scope:** The tables below describe the previous Flutter proposal and Dart paths only.
> For the comprehensive step-by-step conversion report, see [`stitch-to-flutter-mapping-report.md`](./stitch-to-flutter-mapping-report.md).

---

## 1. Screen Mapping Reference

| Stitch Screen (Directory / HTML) | Flutter Screen Widget | Feature Package | Target Route |
|---|---|---|---|
| `welcome` | `WelcomeScreen` | `features/auth` | `/welcome` |
| `sign_in` | `SignInScreen` | `features/auth` | `/sign-in` |
| `sign_up` | `SignUpScreen` | `features/auth` | `/sign-up` |
| `forgot_password` | `ForgotPasswordScreen` | `features/auth` | `/forgot-password` |
| `explore_map` | `ExploreMapScreen` | `features/explore` | `/explore` (Tab 0) |
| `selected_place` | `SelectedPlaceModal` | `features/place` | `/place/preview` |
| `place_detail` | `PlaceDetailScreen` | `features/place` | `/place/:id` |
| `route_preview` | `RoutePreviewScreen` | `features/route` | `/route/preview` |
| `route_options` | `RouteOptionsScreen` | `features/route` | `/route/options` |
| `route_detail` | `RouteDetailScreen` | `features/route` | `/route/detail` |
| `my_trips` | `MyTripsScreen` | `features/trips` | `/trips` (Tab 1) |
| `create_trip` / `tripwise_plan_new_trip` | `CreateTripScreen` (5 Steps) | `features/trips` | `/trips/create` |
| `create_trip_success` | `CreateTripSuccessScreen` | `features/trips` | `/trips/create/success` |
| `trip_detail` | `TripDetailScreen` | `features/itinerary` | `/trips/:id` |
| `trip_map` | `TripMapScreen` | `features/itinerary` | `/trips/:id/map` |
| `add_place_confirmation` | `AddPlaceBottomSheet` | `features/itinerary` | `/trips/:id/add-place` |
| `saved_places` | `SavedPlacesScreen` | `features/saved` | `/saved` (Tab 2) |
| `saved_empty_state` | `SavedEmptyStateView` | `features/saved` | *(Embedded state)* |
| `profile` | `ProfileScreen` | `features/profile` | `/profile` (Tab 3) |
| `edit_profile` | `EditProfileScreen` | `features/profile` | `/profile/edit` |
| `settings` | `SettingsScreen` | `features/settings` | `/settings` |
| `language` | `LanguageScreen` | `features/settings` | `/settings/language` |
| `currency` | `CurrencyScreen` | `features/settings` | `/settings/currency` |
| `help_support` | `HelpSupportScreen` | `features/settings` | `/settings/help` |

---

## 2. Component Mapping Reference

| Stitch HTML Element / Class | Reusable Flutter Widget | Library Location |
|---|---|---|
| `btn-primary`, `btn-secondary`, `btn-outline` | `TWButton` | `lib/shared/widgets/buttons/tw_button.dart` |
| `btn-icon`, circular button | `TWIconButton` | `lib/shared/widgets/buttons/tw_icon_button.dart` |
| Form input `<input>`, `<textarea>` | `TWTextField` | `lib/shared/widgets/inputs/tw_text_field.dart` |
| Floating top search container | `TWSearchBar` | `lib/shared/widgets/inputs/tw_search_bar.dart` |
| Filter pill, category tag | `TWChip` | `lib/shared/widgets/chips/tw_chip.dart` |
| Draggable bottom sheet `.bottom-sheet` | `TWBottomSheet` | `lib/shared/widgets/sheets/tw_bottom_sheet.dart` |
| Map pin `.marker-pin` | `TWMapMarker` | `lib/shared/widgets/maps/tw_map_marker.dart` |
| Map controls (zoom, center) | `TWMapControls` | `lib/shared/widgets/maps/tw_map_controls.dart` |
| Place card (horizontal, grid) | `TWPlaceCard` | `lib/shared/widgets/cards/tw_place_card.dart` |
| Place sheet header & rating | `TWPlaceHeader` | `lib/shared/widgets/cards/tw_place_header.dart` |
| Place photo horizontal carousel | `TWPlaceGallery` | `lib/shared/widgets/cards/tw_place_gallery.dart` |
| Route statistics card | `TWRouteCard` | `lib/shared/widgets/cards/tw_route_card.dart` |
| Turn maneuver step item | `TWRouteStep` | `lib/shared/widgets/cards/tw_route_step.dart` |
| Mode chips (walk, drive, bus) | `TWTransportSelector` | `lib/shared/widgets/selectors/tw_transport_selector.dart` |
| Trip card (upcoming, past) | `TWTripCard` | `lib/shared/widgets/cards/tw_trip_card.dart` |
| Day chips (`Day 1 • Oct 12`) | `TWDaySelector` | `lib/shared/widgets/selectors/tw_day_selector.dart` |
| Timeline itinerary stop | `TWItineraryCard` | `lib/shared/widgets/cards/tw_itinerary_card.dart` |
| Vertical timeline bar | `TWItineraryTimeline` | `lib/shared/widgets/cards/tw_itinerary_timeline.dart` |
| Bottom navigation bar | `TWBottomNavigation` | `lib/shared/widgets/navigation/tw_bottom_navigation.dart` |
| Date range calendar modal | `TWDateRangePicker` | `lib/shared/widgets/pickers/tw_date_range_picker.dart` |
| Preference card (grid / selectable) | `TWSelectionCard` | `lib/shared/widgets/selectors/tw_selection_card.dart` |
| Budget tier selector ($, $$, $$$) | `TWBudgetSelector` | `lib/shared/widgets/selectors/tw_budget_selector.dart` |
| Avatar & avatar cluster (`+2`) | `TWAvatar` | `lib/shared/widgets/avatars/tw_avatar.dart` |
| List tile with chevron | `TWSettingsRow` | `lib/shared/widgets/lists/tw_settings_row.dart` |
| Empty illustration & CTA | `TWEmptyState` | `lib/shared/widgets/feedback/tw_empty_state.dart` |

---

## 3. Design Token Architecture

```
lib/core/theme/
├── app_colors.dart       # Primary (#0058BC), background (#FCF9F8), surfaces, semantic colors
├── app_typography.dart   # Inter text styles: display, titleLarge, bodyMedium, labelLarge, caption
├── app_spacing.dart      # 8pt spatial grid constants: xs (4), sm (8), md (12), lg (16), xl (20), xxl (24), xxxl (32)
├── app_radius.dart       # Radius constants: sm (4), md (8), lg (12), xl (16), xxl (24), pill (9999)
├── app_shadows.dart      # Ambient shadows: level1 (cards), level2 (sheets), level3 (FAB/HUD)
└── app_theme.dart        # Unified ThemeData builder with Material 3 integration
```
