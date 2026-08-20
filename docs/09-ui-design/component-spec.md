# Shared React Native Component Specification (TW Component Library)

> **Authority:** This document defines the official shared widget library for TripWise.
> Every component is a typed React Native component following Stitch design tokens and must be reused across features when implemented.
> **Rule:** Do NOT create duplicate one-off components per screen when a shared component can support variants.

---

## 1. Buttons & Controls

### 1.1 `TWButton`
- **Purpose:** Primary, secondary, and tonal action button across all screens and forms.
- **Variants:**
  - `primary`: Filled background `AppColors.primary`, text `onPrimary`.
  - `secondary`: Tonal container `AppColors.secondaryContainer`, text `onSecondaryContainer`.
  - `outline`: Border `outlineVariant`, transparent background, text `onSurface`.
  - `tonal`: Soft primary tint `AppColors.primaryFixed`, text `onPrimaryFixed`.
  - `danger`: Destructive fill `AppColors.error`, text `onError`.
- **States:** `default`, `pressed` (scale 0.98), `focused`, `disabled` (opacity 0.4), `loading` (shows a centered React Native `ActivityIndicator` without changing control height).
- **Content:**
  - Required: `label: string`, `onPress?: () => void`.
  - Optional: `icon?: ReactNode`, `isFullWidth?: boolean`, `size?: 'sm' | 'md' | 'lg'`.
- **Common Screens:** `WelcomeScreen`, `SignInScreen`, `SignUpScreen`, `CreateTripScreen`, `PlaceDetailScreen`.
- **When NOT to duplicate:** Do NOT create `SubmitButton`, `AuthButton`, or `CreateTripButton`. Use `TWButton(variant: ...)` instead.

### 1.2 `TWIconButton`
- **Purpose:** Circular or rounded icon button for back actions, bookmarking, close sheet, and header actions.
- **Variants:**
  - `surface`: Background `surfaceContainerLowest` with `shadow.level1` or `shadow.level2`.
  - `ghost`: Transparent background with ripple effect on tap.
  - `primary`: Filled `primary` background with `onPrimary` icon.
- **States:** `default`, `pressed` (scale 0.95), `disabled`.
- **Content:**
  - Required: `icon: ReactNode`, `onPress?: () => void`.
  - Optional: `accessibilityLabel: string`, `badge?: ReactNode`, `size?: number`.
- **Common Screens:** `ExploreMapScreen`, `PlaceDetailScreen`, `TripDetailScreen`, `RoutePreviewScreen`.
- **When NOT to duplicate:** Do NOT create `BackButton` or `CloseButton`. Use `TWIconButton` with the approved Expo-compatible icon/glyph passed through its typed `icon` prop.

---

## 2. Inputs & Search

### 2.1 `TWTextField`
- **Purpose:** Standard single-line and multi-line text input field for forms and search filters.
- **Variants:** `standard`, `outlined` (default with `outlineVariant` border), `filled`.
- **States:** `default`, `focused` (primary border 1.5px), `error` (error text + red border), `disabled`.
- **Content:**
  - Required: controlled `value: string` and `onChangeText: (value: string) => void`.
  - Optional: `label`, `placeholder`, `errorText`, icon slots, `secureTextEntry`, `keyboardType` using React Native types.
- **Common Screens:** `SignInScreen`, `SignUpScreen`, `ForgotPasswordScreen`, `EditProfileScreen`, `CreateTripScreen`.
- **When NOT to duplicate:** Do NOT create `EmailInputField` or `PasswordInputField`. Use `TWTextField` with appropriate `keyboardType` and `secureTextEntry` behavior.

### 2.2 `TWSearchBar`
- **Purpose:** Floating search bar over maps and search screens with quick filter triggers.
- **Variants:** `floating` (with `shadow.level2` over map), `inline` (standard app bar search).
- **States:** `default`, `focused` (expands overlay), `activeWithText` (shows clear button).
- **Content:**
  - Required: `value: string`, `onChangeText: (query: string) => void`.
  - Optional: `placeholder`, `onPress`, `onFilterPress`, `trailingAction?: ReactNode`.
- **Common Screens:** `ExploreMapScreen`, `SavedPlacesScreen`, `MyTripsScreen`.
- **When NOT to duplicate:** Do NOT create `ExploreSearchBar` vs `SavedSearchBar`. Use `TWSearchBar`.

---

## 3. Chips & Selectors

### 3.1 `TWChip`
- **Purpose:** Pill-shaped tags for category filtering, travel status, and place metadata.
- **Variants:**
  - `choice`: Selectable pill with active filled primary state vs inactive outlined state.
  - `filter`: Includes checkmark or remove icon when selected.
  - `statusBadge`: Informational pill (e.g., "In 12 Days", "Open Now", "UNESCO").
- **States:** `default`, `selected` (background `primary` or `primaryContainer`, text `onPrimary`), `disabled`.
- **Content:**
  - Required: `label: string`.
  - Optional: `icon?: ReactNode`, `isSelected?: boolean`, `onSelected?: (selected: boolean) => void`, tokenized color variant.
- **Common Screens:** `ExploreMapScreen`, `TripPreferencesStep`, `TripDetailScreen`, `SelectedPlaceModal`.
- **When NOT to duplicate:** Do NOT create `CategoryChip` vs `PreferenceChip`. Use `TWChip(variant: TWChipVariant.choice)`.

### 3.2 `TWDaySelector`
- **Purpose:** Horizontal scrollable day pill tabs for multi-day itineraries.
- **Variants:** `stickyPill` (horizontal list with active indicator).
- **States:** `selected` (filled `primary`), `unselected` (outlined `outlineVariant`).
- **Content:**
  - Required: `days: DayItem[]`, `selectedDayIndex: number`, `onDaySelected: (index: number) => void`.
- **Common Screens:** `TripDetailScreen`, `TripMapScreen`.
- **When NOT to duplicate:** Do NOT create custom tab bars for itinerary days.

### 3.3 `TWTransportSelector`
- **Purpose:** Segmented mode selector for transit options.
- **Variants:** `horizontalBar` (Walk, Drive, Transit, Bicycle).
- **States:** `selected` (active blue background + icon), `unselected`.
- **Content:**
  - Required: `selectedMode: TransportMode`, `onModeChanged: (mode: TransportMode) => void`.
  - Optional: typed estimates record keyed by transport mode.
- **Common Screens:** `RoutePreviewScreen`, `RouteOptionsScreen`.

### 3.4 `TWSelectionCard`
- **Purpose:** Interactive large card used in the trip creation wizard (preferences, travel style).
- **Variants:** `gridCard` (icon on top + title + subtitle), `horizontalCard`.
- **States:** `default` (border `outlineVariant/30`), `selected` (border `primary` 2px, background `primaryFixed/20`).
- **Content:**
  - Required: `title: string`, `isSelected: boolean`, `onPress: () => void`.
  - Optional: `subtitle?: string`, `icon?: ReactNode`, tokenized icon color.
- **Common Screens:** `TripPreferencesStep`, `TravelPaceStep`.

### 3.5 `TWBudgetSelector`
- **Purpose:** Interactive budget tier selector ($ Backpacker, $$ Moderate, $$$ Luxury).
- **Variants:** `segmentedPill`, `cardTiers`.
- **States:** `selectedTier` active state.
- **Content:**
  - Required: `selectedTier: BudgetTier`, `onTierSelected: (tier: BudgetTier) => void`.
- **Common Screens:** `BudgetStep`, `EditProfileScreen`.

---

## 4. Cards & Visual Containers

### 4.1 `TWPlaceCard`
- **Purpose:** The universal card for presenting place information across search, saved, and explore.
- **Variants:**
  - `horizontalCompact`: Thumbnail on left (80x80), title, rating, category, distance snippet on right.
  - `verticalGrid`: Large image on top, metadata below (used in 2-column grids).
  - `heroOverlay`: Full background image with text overlaid on dark bottom gradient.
- **States:** `default`, `pressed`, `bookmarked` (filled bookmark icon).
- **Content:**
  - Required: `title: string`, `imageUrl: string`, `onPress: () => void`.
  - Optional: typed rating/review/category/location/save props and `onBookmarkPress` callback.
- **Common Screens:** `ExploreMapScreen`, `SavedPlacesScreen`, `AddPlaceBottomSheet`.
- **When NOT to duplicate:** Do NOT create `ExplorePlaceCard`, `SavedPlaceCard`, or `AddPlaceCard`. Use `TWPlaceCard(variant: ...)`!

### 4.2 `TWPlaceHeader`
- **Purpose:** Top header section for bottom sheets and detail screens containing place identity.
- **Variants:** `sheetHeader` (with drag handle & close button), `fullScreenHeader`.
- **Content:**
  - Required: `placeName: string`, `category: string`.
  - Optional: typed rating/review/bookmark props and press callbacks.
- **Common Screens:** `SelectedPlaceModal`, `PlaceDetailScreen`.

### 4.3 `TWPlaceGallery`
- **Purpose:** Horizontal snappable photo gallery displaying high-resolution travel photography.
- **Variants:** `carousel` (multi-item snap with rounded corners `radius.lg`).
- **Content:**
  - Required: `imageUrls: string[]`.
  - Optional: `onImagePress?: (index: number) => void`, `height?: number`.
- **Common Screens:** `SelectedPlaceModal`, `PlaceDetailScreen`.

### 4.4 `TWTripCard`
- **Purpose:** High-level summary card for a multi-day trip.
- **Variants:**
  - `upcoming`: Prominent badge ("In X Days"), travel destination, date range, companion avatars.
  - `past`: Subdued archive presentation with completion date and total places visited.
- **States:** `default`, `pressed`.
- **Content:**
  - Required: typed trip title/destination/date-range strings and `onPress` callback.
  - Optional: banner/countdown strings, `companionAvatars?: string[]`, menu callback.
- **Common Screens:** `MyTripsScreen`.
- **When NOT to duplicate:** Do NOT create separate `PastTripCard` and `UpcomingTripCard`. Use `TWTripCard(isUpcoming: true/false)`.

### 4.5 `TWItineraryCard`
- **Purpose:** A single scheduled stop in the daily itinerary timeline.
- **Variants:**
  - `compact`: Time column, title, category icon tag.
  - `expanded`: Includes photo thumbnail, brief description notes, and "Get Directions" action button.
- **Content:**
  - Required: typed time/title strings and category icon slot.
  - Optional: description/thumbnail and press callbacks.
- **Common Screens:** `TripDetailScreen`.

### 4.6 `TWItineraryTimeline`
- **Purpose:** The continuous vertical timeline connector connecting daily stops.
- **Variants:** `connectedDots` (active dot with filled blue center vs outline dot).
- **Content:**
  - Required: typed `items` plus a React Native `renderItem`; use `FlatList` for growing timelines.
- **Common Screens:** `TripDetailScreen`, `RouteDetailScreen`.

### 4.7 `TWRouteCard`
- **Purpose:** Summary card displaying route statistics (duration, distance, transport icon, summary label).
- **Variants:** `previewPill`, `fullCard`.
- **Content:**
  - Required: `duration: string`, `distance: string`, `mode: TransportMode`.
  - Optional: `fastestBadge?: boolean`, `onSelectRoute?: () => void`.
- **Common Screens:** `RoutePreviewScreen`, `RouteOptionsScreen`.

### 4.8 `TWRouteStep`
- **Purpose:** Individual maneuver item in turn-by-turn navigation list.
- **Content:**
  - Required: maneuver icon slot and typed instruction/distance strings.
- **Common Screens:** `RouteDetailScreen`.

---

## 5. Overlays, Sheets & Navigation

### 5.1 `TWBottomSheet`
- **Purpose:** Draggable, modal, or persistent bottom sheet sliding over the map canvas.
- **Variants:**
  - `draggable`: Supports snap points (0.2, 0.5, 0.9 height) with top grabber handle.
  - `modal`: Fixed-height dialog-like bottom sheet.
- **Content:**
  - Required: `children: ReactNode`.
  - Optional: numeric snap points and `showGrabber?: boolean`; dependency must be Expo-compatible and phase-reviewed.
- **Common Screens:** `SelectedPlaceModal`, `AddPlaceBottomSheet`.

### 5.2 `TWBottomNavigation`
- **Purpose:** Persistent bottom tab bar across the 4 primary app features.
- **Current tabs:** `Home` (0), `Explore` (1), `Plan` (2), `Trips` (3), `Profile` (4), matching `mobile/src/navigation/MainTabs.tsx`.
- **States:** Active tab highlighted with `primary` icon & bold label; inactive in `onSurfaceVariant`.
- **Content:**
  - Required: `currentIndex: number`, `onPress: (index: number) => void`.
- **Common Screens:** `MainTabsScaffold`.

### 5.3 `TWDateRangePicker`
- **Purpose:** Calendar month view modal for selecting trip start and end dates.
- **Content:**
  - Required: `onDateRangeSelected: (range: DateRange) => void`.
  - Optional: `initialRange?: DateRange` using a project TypeScript type.
- **Common Screens:** `TravelDatesStep`.

---

## 6. Map HUD & Avatars

### 6.1 `TWMapMarker`
- **Purpose:** Vector map pin placed on coordinates.
- **Variants:**
  - `standard`: Teardrop pin with category icon inside.
  - `selected`: Enlarged pin with active title bubble above and blue ring.
- **Content:**
  - Required: icon slot, `isSelected: boolean`, `onPress: () => void`.
  - Optional: `label?: string`.
- **Common Screens:** `ExploreMapScreen`, `TripMapScreen`.

### 6.2 `TWMapControls`
- **Purpose:** Floating vertical stack of map interaction buttons on the right edge.
- **Buttons:** Recenter GPS, Layer Toggle, Zoom In (+), Zoom Out (-).
- **Content:**
  - Required: typed callbacks for recenter/zoom.
  - Optional: layer-toggle callback.
- **Common Screens:** `ExploreMapScreen`, `TripMapScreen`.

### 6.3 `TWAvatar`
- **Purpose:** User profile image with fallback initials and stacked group variant.
- **Variants:**
  - `single`: Circular avatar with `surface` border.
  - `group`: Overlapping stack of up to 3 avatars with overflow badge (`+2`).
- **Content:**
  - Required: `imageUrl?: string` or `initials: string`.
  - Optional: `size?: number`, `badgeText?: string`.
- **Common Screens:** `ProfileScreen`, `TWTripCard`, `TripDetailScreen`.

### 6.4 `TWSettingsRow`
- **Purpose:** Standard list item for profile and settings menus.
- **Content:**
  - Required: `title: string`, icon slot, optional `onPress`.
  - Optional: subtitle/trailing strings, `showChevron?: boolean`, `isDestructive?: boolean`.
- **Common Screens:** `ProfileScreen`, `SettingsScreen`.

### 6.5 `TWEmptyState`
- **Purpose:** Consistent illustration and CTA for empty lists and error screens.
- **Content:**
  - Required: `headline: string`, `description: string`.
  - Optional: icon slot, action label and callback.
- **Common Screens:** `SavedEmptyStateView`, `EmptyItineraryView`.
