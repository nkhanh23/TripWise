# Design System — TripWise Mobile & Web
## Premium Map-First Travel

> **Visual Source of Truth:** The latest **Google Stitch** design system (`stitch_tripwise_design_system` & `.stitch/designs`) is the authoritative visual source of truth for TripWise.
>
> **Core Aesthetic Philosophy:** Modern, minimalist, corporate, and clean with a strong map-first emphasis. It uses crisp white elevated surfaces over a soft warm canvas, high-contrast typography, and vivid Travel Blue accents (`#0058BC` / `#0070EB`) to prioritize geographical context and navigation clarity.

---

## 1. Color Palette & Tokens

### 1.1 Primary & Brand Colors
The brand identity centers around high-vibrancy "Travel Blue" for primary calls to action, route lines, selection indicators, and active states.

| Token | Hex Value | RGB | Description / Usage |
|---|---|---|---|
| `primary` | `#0058BC` | 0, 88, 188 | Primary brand blue, main CTAs, active tab icons, route lines |
| `primaryContainer` | `#0070EB` | 0, 112, 235 | Highlighted buttons, active chip backgrounds, prominent badges |
| `onPrimary` | `#FFFFFF` | 255, 255, 255 | Text and icon color on `primary` surfaces |
| `onPrimaryContainer` | `#FEFCFF` | 254, 252, 255 | Text and icon color on `primaryContainer` |
| `primaryFixed` | `#D8E2FF` | 216, 226, 255 | Soft primary tint for light container backgrounds |
| `primaryFixedDim` | `#ADC6FF` | 173, 198, 255 | Secondary tint / interactive state highlight |
| `onPrimaryFixed` | `#001A41` | 0, 26, 65 | Dark contrast text on fixed primary containers |
| `onPrimaryFixedVariant` | `#004493` | 0, 68, 147 | Variant dark blue text on fixed primary containers |

### 1.2 Surface & Canvas (Light Mode Baseline)
Surfaces follow a layered tonal hierarchy: elevated cards and bottom sheets pop in pure white (`#FFFFFF`) against a warm, soft canvas background (`#FCF9F8`).

| Token | Hex Value | RGB | Description / Usage |
|---|---|---|---|
| `background` | `#FCF9F8` | 252, 249, 248 | Main application background / canvas |
| `surface` | `#FCF9F8` | 252, 249, 248 | Standard base surface |
| `surfaceBright` | `#FCF9F8` | 252, 249, 248 | Bright baseline surface |
| `surfaceDim` | `#DCD9D9` | 220, 217, 217 | Dimmed surface / backdrop overlay |
| `surfaceContainerLowest` | `#FFFFFF` | 255, 255, 255 | Elevated white cards, bottom sheets, dialogs |
| `surfaceContainerLow` | `#F6F3F2` | 246, 243, 242 | Subtle section background, unselected card background |
| `surfaceContainer` | `#F0EDED` | 240, 237, 237 | Neutral containers, search bar background |
| `surfaceContainerHigh` | `#EAE7E7` | 234, 231, 231 | Hovered or elevated container elements |
| `surfaceContainerHighest` | `#E5E2E1` | 229, 226, 225 | Hero placeholder areas, image fallback containers |
| `surfaceVariant` | `#E5E2E1` | 229, 226, 225 | Auxiliary container surface |

### 1.3 Text & Content Colors
Ensures strict WCAG AA/AAA contrast ratios for high outdoor visibility.

| Token | Hex Value | RGB | Description / Usage |
|---|---|---|---|
| `onSurface` | `#1C1B1B` | 28, 27, 27 | Primary headlines, titles, main body text (high contrast) |
| `onSurfaceVariant` | `#414755` | 65, 71, 85 | Secondary body, subtitles, timestamps, descriptions |
| `onBackground` | `#1C1B1B` | 28, 27, 27 | Body text over application background |
| `outline` | `#717786` | 113, 119, 134 | Input borders, active icons, unselected timeline dots |
| `outlineVariant` | `#C1C6D7` | 193, 198, 215 | Dividers, chip borders, timeline track line |

### 1.4 Secondary, Tertiary & Map Emphasis
| Token | Hex Value | RGB | Description / Usage |
|---|---|---|---|
| `secondary` | `#54606B` | 84, 96, 107 | Secondary icons, neutral actions, category tags |
| `secondaryContainer` | `#D8E4F2` | 216, 228, 242 | Category tag background (e.g., Food / Dining) |
| `onSecondaryContainer` | `#5A6671` | 90, 102, 113 | Icon and label color on secondary container |
| `tertiary` | `#BC000A` | 188, 0, 10 | Star ratings, map alert markers, cultural attraction badges |
| `tertiaryContainer` | `#E2241F` | 226, 36, 31 | Red category badge container (e.g., Temple / Monument) |
| `onTertiaryContainer` | `#FFFBFF` | 255, 251, 255 | Text and icon on tertiary container |
| `error` | `#BA1A1A` | 186, 26, 26 | Error states, validation alerts, destructive actions |
| `errorContainer` | `#FFDAD6` | 255, 218, 214 | Error banner background |
| `onErrorContainer` | `#93000A` | 147, 0, 10 | Error text on error container |

---

## 2. Typography Tokens

TripWise uses the **Inter** font family for its systematic, utilitarian nature that excels in data-dense travel environments and multilingual support.

| Role / Token | Size | Line Height | Weight | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `display` | `32px` | `40px` | 700 (Bold) | `-0.02em` (`-0.64px`) | Splash screen, hero page title, logo wordmark |
| `titleLarge` | `22px` | `28px` | 600 (SemiBold) | `0` | Screen headings, place detail sheet titles |
| `titleMedium` | `18px` | `24px` | 600 (SemiBold) | `0` | Section headers, card titles, sheet headers |
| `titleSmall` | `16px` | `22px` | 600 (SemiBold) | `0` | Sub-section headers, list item bold titles |
| `bodyLarge` | `16px` | `24px` | 400 (Regular) | `0` | Prominent body text, hero subtitles |
| `bodyMedium` | `14px` | `20px` | 400 (Regular) | `0` | Standard body descriptions, review text |
| `bodySmall` | `12px` | `16px` | 400 (Regular) | `0` | Secondary metadata, dates, distance snippets |
| `labelLarge` | `14px` | `20px` | 600 (SemiBold) | `0` | Primary buttons, active tab labels |
| `labelMedium` | `12px` | `16px` | 600 (SemiBold) | `0` | Chip labels, tags, rating counters, badges |
| `caption` | `11px` | `14px` | 400 (Regular) | `0` | Micro timestamps (AM/PM), fine print disclaimers |

---

## 3. Spatial System (8pt Grid)

All layout margins, padding, and gaps strictly follow an 8-point mathematical grid:

| Token | Value | Common Usage |
|---|---|---|
| `spacing.xs` | `4px` | Icon-to-text gap, compact badge padding, timeline dot offset |
| `spacing.sm` | `8px` | Chip internal padding, tight element grouping, micro gutters |
| `spacing.md` | `12px` | Input field vertical padding, small card padding, icon button size |
| `spacing.lg` | `16px` | Standard screen margin, card internal padding, list item gap |
| `spacing.xl` | `20px` | Section gap, header vertical padding, bottom sheet padding |
| `spacing.xxl` (`2xl`) | `24px` | Large section separation, hero card padding, bottom sheet top offset |
| `spacing.xxxl` (`3xl`) | `32px` | Major layout container gaps, empty state vertical margins |

---

## 4. Corner Radius Tokens

| Token | Value | Application |
|---|---|---|
| `radius.sm` | `4px` | Small status indicators, sub-badges, tooltip arrows |
| `radius.md` | `8px` | Standard buttons, icon containers, category chips |
| `radius.lg` | `12px` | Standard cards (`TWPlaceCard`, `TWItineraryCard`, `TWRouteCard`) |
| `radius.xl` | `16px` | Bottom sheet top corners, dialog containers, modal popups |
| `radius.xxl` | `24px` | Floating HUD panels, hero containers, floating search bars |
| `radius.pill` / `full`| `9999px` | Pill buttons, circular icon buttons, avatars, filter chips |

---

## 5. Elevation & Ambient Shadows

TripWise relies on soft ambient dropshadows to layer content cleanly over vector map tiles.

| Level | Value | Usage |
|---|---|---|
| `shadow.level1` | `0px 4px 8px rgba(0, 0, 0, 0.04)` | Content cards on white surface, itinerary list items |
| `shadow.level2` | `0px 4px 16px rgba(0, 0, 0, 0.08)` | Bottom sheets, floating search bar, selected place card |
| `shadow.level3` | `0px 12px 24px rgba(0, 0, 0, 0.12)` | Floating action buttons (FAB), modal dialogs, map controls |

---

## 6. Component Principles & Layout Rules

### 6.1 Button Heights & Touch Targets
- **Primary CTA Buttons:** Height `48px` to `52px`, minimum touch target width `48px`, `radius.md` (`8px`) or `radius.pill` (`9999px`).
- **Secondary / Compact Buttons:** Height `36px` to `40px`, `radius.md` (`8px`).
- **Icon Action Buttons (`TWIconButton`):** `40x40px` or `44x44px` circular shape with centered icon.

### 6.2 Bottom Sheet Principles
- Bottom sheets slide smoothly over the map canvas with standard snap points:
  - **Peek (Compact):** `~15%` to `20%` height (Handle + Title + Category).
  - **Medium (Preview):** `~45%` to `55%` height (Photos + Rating + Quick actions).
  - **Expanded (Full Detail):** `~85%` to `90%` height (Complete itinerary, reviews, directions).
- Always include a top grabber handle (`40x4px`, `outlineVariant`, `radius.full`) and rounded top corners (`radius.xl` = `16px`).

### 6.3 Map-First Layout & Floating Controls
- The map canvas renders underneath overlaying controls.
- **Floating Search Bar:** Sits pinned below the status bar with `16px` horizontal margin, `shadow.level2`.
- **Floating Map Controls:** Positioned vertically stacked on the middle-right (`re-center`, `layers`, `zoom`), padded `16px` from screen edge.
- **Map Pins:** Teardrop circular pins with `32x32px` dimension. Active selected pin scales to `110%` with a floating title bubble above.

### 6.4 Image Aspect Ratios & Gallery
- **Card Thumbnails:** `1:1` square (`80x80px`) or `4:3` ratio.
- **Horizontal Gallery Items:** `16:9` or `3:2` widescreen (`w-64 h-40` or `w-48 h-40`), snappable on scroll with `radius.lg` (`12px`).
- **Hero Image:** `16:9` or `2:1` banner with bottom gradient fade to `surface`.

### 6.5 Mobile SafeArea Rules
- All mobile screens must respect platform safe areas (top notch/island, bottom home indicator).
- Bottom navigation bar sits fixed at the bottom with SafeArea padding applied.
- Scrollable content lists must have extra bottom padding (`pb-24` / `80px` to `96px`) to ensure the last item is never obscured by the bottom navigation bar or floating CTA.
