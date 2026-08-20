# UI Layout Mobile — Map-First & Vertical Layering

> **Authority:** This document defines the layout rules, spatial layering, safe area behavior, and responsive guidelines for the TripWise Mobile application (Android & iOS).

---

## 1. Core Mobile Layout Philosophy

TripWise Mobile is built on a **Map-First, Layered Vertical Canvas** paradigm:
1. **The Map is the Foundation (Base Layer):** On discovery and itinerary screens, the interactive vector map fills the screen edge-to-edge.
2. **Floating HUD Elements (Mid Layer):** Search bars, category chip carousels, and map controls float over the map with ambient shadows (`shadow.level2` & `level3`).
3. **Contextual Bottom Sheets & Panels (Top Layer):** Rich content (place previews, itinerary timelines, directions) slides up in draggable sheets without permanently obscuring the user's geographic context.

---

## 2. Spatial Hierarchy & Layering

```
+---------------------------------------------------+  <-- Status Bar / Notch
| [TWIconButton]   [TWSearchBar (Floating)]   [Filter] |  <-- Floating Top Bar
+---------------------------------------------------+
|  [TWChip: Attraction] [TWChip: Food] [TWChip: Hotel]|  <-- Horizontal Chip Row
|                                                   |
|                      [Pin]                        |
|                                     [Re-center]   |  <-- Map HUD Controls
|           MAP CANVAS (Base)         [Zoom +]      |
|                                     [Zoom -]      |
|                                                   |
| +-----------------------------------------------+ |
| |                    [Handle]                   | |  <-- TWBottomSheet (Draggable)
| | [TWPlaceHeader]                               | |
| | [TWPlaceGallery (Snappable Horizontal)]       | |
| | [TWButton: Get Directions]  [TWButton: Save]  | |
| +-----------------------------------------------+ |
+---------------------------------------------------+
| [Home] [Explore] [Plan] [Trips] [Profile]        |  <-- React Navigation tabs
+---------------------------------------------------+  <-- Home Indicator (SafeArea)
```

---

## 3. Screen Layout Archetypes

### 3.1 Archetype A: Map-First Discovery (`ExploreMapScreen`, `TripMapScreen`)
- **Map View:** Fills 100% of the viewport.
- **Top Safe Area:** Padded `16px` below status bar. Houses `TWSearchBar` (`48px` height, `radius.full` or `radius.lg`, `shadow.level2`).
- **Category Filter Bar:** Directly below search bar, horizontal scroll without scrollbar, `16px` horizontal padding.
- **Map Controls:** Positioned right edge, vertically centered, `16px` margin, stacked with `8px` gap.
- **Bottom Sheet (`TWBottomSheet`):**
  - Starts at Peek / Preview height (`~45%` height for selected places).
  - Drag handle: `40x4px`, centered, `outlineVariant` color.
  - Sits above map canvas (z-index / Stack overlay) but collapses neatly above the bottom tab bar.

### 3.2 Archetype B: Full-Screen Detail & Itinerary (`PlaceDetailScreen`, `TripDetailScreen`)
- **Hero Header:** Top `35vh` to `40vh` dedicated to high-resolution photography with bottom gradient fade.
- **Floating Back & Action Buttons:** Left back arrow and right bookmark/edit icon embedded inside top SafeArea (`40x40px` circular backdrop).
- **Overlapping Content Card:** Content container shifts up `-16px` to overlap the bottom of the hero banner with rounded top corners (`radius.xl`).
- **Sticky Day Selector:** On `TripDetailScreen`, `TWDaySelector` pins directly below the top app bar when scrolling.
- **Bottom Action Footer:** Sticky bottom bar (`height: 72px` + SafeArea) with primary CTA ("Add to Itinerary" / "Start Directions").

### 3.3 Archetype C: Multi-Step Creation Wizard (`CreateTripScreen`)
- **Top Progress Indicator:** Step bar (`1 of 5`) or segmented progress indicator below top app bar.
- **Scrollable Form Body:** Generous padding (`24px` horizontal), `20px` spacing between field sections.
- **Fixed Navigation Footer:** Row containing "Back" (`TWButton.outline`) and "Continue" (`TWButton.primary`), pinned to the bottom above keyboard/SafeArea.

### 3.4 Archetype D: Standard List / Grid Pages (`MyTripsScreen`, `SavedPlacesScreen`, `SettingsScreen`)
- **Fixed / Collapsible App Bar:** Title `titleLarge` (`22px` SemiBold) with subtle separator line on scroll.
- **List Padding:** `16px` horizontal screen margin, `16px` gap between cards (`TWTripCard` / `TWPlaceCard`).
- **Bottom Scroll Clearance:** Scroll content uses tokenized bottom `contentContainerStyle` padding so the last item is never hidden behind the tab bar or floating CTA.

---

## 4. SafeArea & Responsive Mobile Rules

### 4.1 SafeArea Management
- **Top Notch / Status Bar:** All interactive top elements must respect `react-native-safe-area-context` through `SafeAreaView` or `useSafeAreaInsets`; do not hardcode notch/status-bar padding.
- **Bottom inset:** Use `react-native-safe-area-context` (`SafeAreaProvider`, `SafeAreaView`, or `useSafeAreaInsets`) rather than hardcoded device padding.
- **Keyboard Avoidance:** Forms must use an appropriate React Native `KeyboardAvoidingView` + `ScrollView`/virtualized-list composition and keyboard tap behavior to prevent covered inputs and layout overflow.

### 4.2 Breakpoints & Phone Adaptations

| Screen Size Tier | Width Range | Layout Adaptation |
|---|---|---|
| **Small Phones** | `< 375px` (e.g. iPhone SE) | Reduce horizontal padding to `12px`. Place cards switch to compact 1-column layout. |
| **Standard Phones**| `375px – 430px` (iPhone 14/15, Galaxy S23) | Standard 8pt grid (`16px` margin, `24px` card padding). 1-column list or 2-column compact grid. |
| **Large Phones / Foldables** | `> 430px` | Center content in a maximum readable width container (`max-w-md` / `480px`), keep bottom sheet docked. |

---

## 5. Form & Input Spacing Rules
- **Vertical Field Gap:** Exactly `16px` between consecutive `TWTextField` inputs.
- **Label to Input Gap:** `8px` between text label and input field.
- **Error Message Spacing:** `4px` below the input stroke, in `AppColors.error`.
- **Primary Form Action Gap:** `24px` margin between last input and the submit `TWButton`.
