# Screen Inventory & Specification (TripWise Mobile)

> **Authority:** This document defines the authoritative list of mobile screens for TripWise based on the latest Google Stitch designs.
> Total: **32 Mapped Screens, Wizard Steps & Dialogs**.

---

## 1. Authentication Module (`features/auth`)

### 1.1 Welcome Screen (`WelcomeScreen`)
- **Module:** `features/auth`
- **Purpose:** Onboarding entry screen introducing TripWise core value proposition with high-impact visuals.
- **Entry Points:** App launch (when unauthenticated).
- **Navigation Exits:**
  - "Get Started" → `SignUpScreen` (`/sign-up`)
  - "I already have an account" → `SignInScreen` (`/sign-in`)
- **Shared Components:** `TWButton` (Primary & Outline), `AppColors.background`, Stitch hero travel visual.
- **State Variants:** Default.

### 1.2 Sign In Screen (`SignInScreen`)
- **Module:** `features/auth`
- **Purpose:** Secure email/password authentication and social provider sign-in.
- **Entry Points:** `WelcomeScreen`, `SignUpScreen` ("Sign In" link).
- **Navigation Exits:**
  - Successful auth → current React Navigation five-tab shell (`MainTabs`)
  - "Forgot Password?" → `ForgotPasswordScreen` (`/forgot-password`)
  - "Sign Up" → `SignUpScreen` (`/sign-up`)
- **Shared Components:** `TWTextField` (Email, Password), `TWButton` (Sign In), `TWIconButton` (Back).
- **State Variants:** `idle`, `submitting` (loading on button), `authError` (banner feedback).

### 1.3 Sign Up Screen (`SignUpScreen`)
- **Module:** `features/auth`
- **Purpose:** New user account creation.
- **Entry Points:** `WelcomeScreen`, `SignInScreen`.
- **Navigation Exits:**
  - Successful registration → `ExploreMapScreen` (`/explore`)
  - "Sign In" → `SignInScreen` (`/sign-in`)
- **Shared Components:** `TWTextField` (Name, Email, Password, Confirm Password), `TWButton` (Create Account), `TWIconButton` (Back).
- **State Variants:** `idle`, `submitting`, `validationErrors`.

### 1.4 Forgot Password Screen (`ForgotPasswordScreen`)
- **Module:** `features/auth`
- **Purpose:** Password reset email delivery flow.
- **Entry Points:** `SignInScreen`.
- **Navigation Exits:**
  - Back arrow / "Back to Sign In" → `SignInScreen`.
- **Shared Components:** `TWTextField` (Email), `TWButton` (Send Reset Link), `TWIconButton` (Back).
- **State Variants:** `formInput`, `successEmailSent`.

---

## 2. Explore Module (`features/explore` & `features/place`)

### 2.1 Explore Map Screen (`ExploreMapScreen`) — Explore Tab (current index 1)
- **Module:** `features/explore`
- **Purpose:** Primary discovery canvas. Fullscreen map with dynamic POI markers, floating search, and horizontal category chips.
- **Entry Points:** React Navigation `Explore` tab. Current authenticated app initially follows navigator configuration; do not assume a URL route or Expo Router.
- **Navigation Exits:**
  - Tap on Map Marker / Place Card → `SelectedPlaceModal` (Bottom Sheet preview)
  - Tap Search Bar → Search overlay mode
- **Shared Components:** `TWSearchBar` (Floating), `TWChip` (Attraction, Food, Hotel, Nature), `TWMapMarker`, `TWMapControls`, `TWBottomNavigation`.
- **State Variants:** `defaultMap`, `categoryFiltered`, `markerActive` (bounces selected marker).

### 2.2 Selected Place Modal (`SelectedPlaceModal`)
- **Module:** `features/place`
- **Purpose:** Draggable bottom sheet previewing place highlights, photo gallery, ratings, and quick actions.
- **Entry Points:** Tap any marker on `ExploreMapScreen` or `SavedPlacesScreen`.
- **Navigation Exits:**
  - Tap "Directions" → `RoutePreviewScreen` (`/route/preview`)
  - Tap Place Card / Header → `PlaceDetailScreen` (`/place/:id`)
  - Tap Close (X) / Drag down → Return to `ExploreMapScreen`
- **Shared Components:** `TWBottomSheet`, `TWPlaceHeader`, `TWPlaceGallery`, `TWIconButton` (Directions, Save, Share).
- **State Variants:** `compactPeek`, `mediumPreview`, `fullExpanded`.

### 2.3 Place Detail Screen (`PlaceDetailScreen`)
- **Module:** `features/place`
- **Purpose:** Full-screen comprehensive place profile (photos, operating hours, address, reviews, admission prices).
- **Entry Points:** `SelectedPlaceModal` header tap, `ItineraryCard` stop tap.
- **Navigation Exits:**
  - Tap "Directions" → `RoutePreviewScreen`
  - Tap "Add to Trip" → `AddPlaceBottomSheet`
  - Back arrow → Previous screen
- **Shared Components:** `TWPlaceHeader`, `TWPlaceGallery`, `TWButton` (Add to Trip), `TWIconButton` (Back, Bookmark).
- **State Variants:** `loading`, `contentReady`.

---

## 3. Route Module (`features/route`)

### 3.1 Route Preview Screen (`RoutePreviewScreen`)
- **Module:** `features/route`
- **Purpose:** Overview of transit route between origin and destination over map polyline with mode selector.
- **Entry Points:** "Directions" action from `SelectedPlaceModal` or `PlaceDetailScreen`.
- **Navigation Exits:**
  - Tap "Route Options" → `RouteOptionsScreen`
  - Tap "Start Navigation / Steps" → `RouteDetailScreen`
  - Back arrow → `ExploreMapScreen`
- **Shared Components:** `TWTransportSelector`, `TWRouteCard`, `TWIconButton` (Back, Center), `TWButton` (Preview Steps).
- **State Variants:** `calculatingRoute`, `routeFound`, `routeUnavailableFallback`.

### 3.2 Route Options Screen (`RouteOptionsScreen`)
- **Module:** `features/route`
- **Purpose:** Comparison view showing multiple route alternatives (Fastest, Scenic, Fewest Transfers).
- **Entry Points:** `RoutePreviewScreen`.
- **Navigation Exits:**
  - Select an alternative → `RoutePreviewScreen` (updates selected route).
- **Shared Components:** `TWRouteCard` (Multiple comparative items), `TWIconButton` (Back).
- **State Variants:** `listAlternatives`.

### 3.3 Route Detail Screen (`RouteDetailScreen`)
- **Module:** `features/route`
- **Purpose:** Turn-by-turn navigation list with distance snippets, maneuvers, and road instructions.
- **Entry Points:** `RoutePreviewScreen`.
- **Navigation Exits:**
  - Back arrow → `RoutePreviewScreen`.
- **Shared Components:** `TWRouteStep`, `TWItineraryTimeline`, `TWIconButton` (Back).
- **State Variants:** `stepList`.

---

## 4. Trips & Creation Wizard (`features/trips`)

### 4.1 My Trips Screen (`MyTripsScreen`) — Trips Tab (current index 3)
- **Module:** `features/trips`
- **Purpose:** User journey dashboard organizing planned trips into Upcoming and Past segments.
- **Entry Points:** React Navigation `Trips` tab.
- **Navigation Exits:**
  - Tap any `TWTripCard` → `TripDetailScreen` (`/trips/:id`)
  - Tap Floating "+" / "Plan New Trip" → `CreateTripScreen` (`/trips/create`)
- **Shared Components:** `TWTripCard` (Upcoming & Past variants), `TWBottomNavigation`, `TWEmptyState` (when 0 trips).
- **State Variants:** `hasTrips`, `emptyTrips`.

### 4.2 Create Trip Wizard (`CreateTripScreen` / Multi-Step)
- **Module:** `features/trips`
- **Purpose:** Guided multi-step creation flow for AI-assisted itinerary generation:
  1. **Destination & Dates Step (`TravelDatesStep`):** Destination search + `TWDateRangePicker`.
  2. **Preferences Step (`TripPreferencesStep`):** Travel interests chips (`TWChip`, `TWSelectionCard`).
  3. **Pace Step (`TravelPaceStep`):** Relaxed, Moderate, Fast-Paced selection.
  4. **Budget Step (`BudgetStep`):** `TWBudgetSelector` (Backpacker, Moderate, Luxury).
  5. **Summary Step (`TripSummaryStep`):** Review generated overview before final confirmation.
- **Entry Points:** Floating "+" on `MyTripsScreen`.
- **Navigation Exits:**
  - Confirm & Generate → `CreateTripSuccessScreen` (`/trips/create/success`)
  - Cancel / Back → `MyTripsScreen`
- **Shared Components:** `TWButton` (Next / Back), `TWSelectionCard`, `TWBudgetSelector`, `TWDateRangePicker`.
- **State Variants:** `step1` through `step5`, `generatingItinerary` (AI loading overlay).

### 4.3 Create Trip Success Screen (`CreateTripSuccessScreen`)
- **Module:** `features/trips`
- **Purpose:** Celebration screen confirming itinerary generation completion.
- **Entry Points:** Completion of `CreateTripScreen`.
- **Navigation Exits:**
  - "View Itinerary" → `TripDetailScreen` (`/trips/:id`)
- **Shared Components:** `TWButton` (Primary CTA), Celebration illustration.

---

## 5. Itinerary Module (`features/itinerary`)

### 5.1 Trip Detail Screen (`TripDetailScreen`)
- **Module:** `features/itinerary`
- **Purpose:** The core itinerary management view. Shows destination banner, budget status progress bar, day tabs, and chronologically ordered stops.
- **Entry Points:** `MyTripsScreen` card tap, `CreateTripSuccessScreen`.
- **Navigation Exits:**
  - Tap "View Map" → `TripMapScreen` (`/trips/:id/map`)
  - Tap Stop card → `PlaceDetailScreen` (`/place/:id`)
  - Tap "+" / "Add Place" → `AddPlaceBottomSheet`
  - Back arrow → `MyTripsScreen`
- **Shared Components:** `TWDaySelector`, `TWItineraryTimeline`, `TWItineraryCard`, `TWAvatar` (Companions), `TWIconButton` (Back, Edit, Share).
- **State Variants:** `itineraryLoaded`, `emptyDay` (`EmptyItineraryView`), `loadingState`.

### 5.2 Empty Itinerary State (`EmptyItineraryView`)
- **Module:** `features/itinerary`
- **Purpose:** Embedded view when a specific day has no stops assigned yet.
- **Shared Components:** `TWEmptyState` ("No activities yet. Add places to explore!").

### 5.3 Add Place Confirmation Sheet (`AddPlaceBottomSheet`)
- **Module:** `features/itinerary`
- **Purpose:** Bottom sheet search & confirmation to append a place to a specific itinerary day.
- **Entry Points:** "+" action on `TripDetailScreen` or "Add to Trip" on `PlaceDetailScreen`.
- **Shared Components:** `TWSearchBar`, `TWPlaceCard`, `TWButton` ("Add to Day X").

### 5.4 Trip Map Screen (`TripMapScreen`)
- **Module:** `features/itinerary`
- **Purpose:** Fullscreen map plotting all itinerary stops of the selected day with route lines connecting them.
- **Entry Points:** "View Map" link on `TripDetailScreen`.
- **Shared Components:** `TWMapMarker` (Numbered 1, 2, 3), `TWMapControls`, `TWDaySelector` (floating at top), `TWIconButton` (Back).

---

## 6. Saved Module (`features/saved`)

### 6.1 Saved Places Screen (`SavedPlacesScreen`) — Future/nested screen
- **Module:** `features/saved`
- **Purpose:** Library of bookmarked places with category filters.
- **Entry Points:** To be decided by a future navigation task. Saved Places is not a current root tab in `MainTabs.tsx`.
- **Navigation Exits:**
  - Tap place card → `PlaceDetailScreen`
- **Shared Components:** `TWPlaceCard` (Vertical grid / list), `TWChip` (Filter chips), `TWBottomNavigation`.
- **State Variants:** `hasSavedPlaces`, `empty` (`SavedEmptyStateView`).

### 6.2 Saved Empty State (`SavedEmptyStateView`)
- **Module:** `features/saved`
- **Purpose:** Friendly empty state prompting user to explore and bookmark favorite spots.
- **Shared Components:** `TWEmptyState` with "Explore Places" CTA button.

---

## 7. Profile & Settings (`features/profile` & `features/settings`)

### 7.1 Profile Screen (`ProfileScreen`) — Profile Tab (current index 4)
- **Module:** `features/profile`
- **Purpose:** User profile overview, stats (trips planned, places visited), and quick settings links.
- **Entry Points:** React Navigation `Profile` tab.
- **Navigation Exits:**
  - "Edit Profile" → `EditProfileScreen` (`/profile/edit`)
  - "Settings" → `SettingsScreen` (`/settings`)
  - "Sign Out" → `SignOutDialog`
- **Shared Components:** `TWAvatar`, `TWSettingsRow`, `TWBottomNavigation`.

### 7.2 Edit Profile Screen (`EditProfileScreen`)
- **Module:** `features/profile`
- **Purpose:** Modify display name, email, avatar image, and default travel preferences.
- **Shared Components:** `TWTextField`, `TWAvatar`, `TWButton` (Save Changes), `TWIconButton` (Back).

### 7.3 Settings Screen (`SettingsScreen`)
- **Module:** `features/settings`
- **Purpose:** App configurations: Language, Currency, Notifications, Offline data cache, Help.
- **Navigation Exits:**
  - "Language" → `LanguageScreen`
  - "Currency" → `CurrencyScreen`
  - "Help & Support" → `HelpSupportScreen`
  - "Delete Account" → `DeleteAccountDialog`
- **Shared Components:** `TWSettingsRow`, `TWIconButton` (Back).

### 7.4 Language Screen (`LanguageScreen`) & Currency Screen (`CurrencyScreen`)
- **Module:** `features/settings`
- **Purpose:** Select preferred locale (English, Tiếng Việt) and currency (USD $, VND ₫, EUR €).
- **Shared Components:** `TWSettingsRow` with checkmark indicators.

### 7.5 Help & Support Screen (`HelpSupportScreen`)
- **Module:** `features/settings`
- **Purpose:** FAQ accordions and customer support contact links.

---

## 8. Modal Dialogs (`features/auth` & `features/profile`)

### 8.1 Sign Out Confirmation (`SignOutDialog`)
- **Purpose:** Modal confirmation before invalidating current user session.
- **Shared Components:** Alert card with "Cancel" and "Sign Out" (`TWButton`).

### 8.2 Delete Account Confirmation (`DeleteAccountDialog`)
- **Purpose:** Destructive action confirmation with warning notes.
- **Shared Components:** `TWButton(variant: danger)`, `TWButton(variant: outline)`.
