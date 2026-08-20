---
name: Premium Map-First Travel
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#414755'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#717786'
  outline-variant: '#c1c6d7'
  surface-tint: '#005bc1'
  primary: '#0058bc'
  on-primary: '#ffffff'
  primary-container: '#0070eb'
  on-primary-container: '#fefcff'
  inverse-primary: '#adc6ff'
  secondary: '#54606b'
  on-secondary: '#ffffff'
  secondary-container: '#d8e4f2'
  on-secondary-container: '#5a6671'
  tertiary: '#bc000a'
  on-tertiary: '#ffffff'
  tertiary-container: '#e2241f'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a41'
  on-primary-fixed-variant: '#004493'
  secondary-fixed: '#d8e4f2'
  secondary-fixed-dim: '#bcc8d5'
  on-secondary-fixed: '#111d26'
  on-secondary-fixed-variant: '#3d4853'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#930005'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  title-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
---

## Brand & Style
The design system is centered on a "Map-First" philosophy, prioritizing geographic context and spatial clarity for the modern traveler. The brand personality is efficient, premium, and calm, acting as a reliable co-pilot during high-stakes transit. 

The visual style is **Corporate / Modern** with a strong emphasis on **Minimalism**. It utilizes expansive white space to reduce cognitive load, bright primary accents to guide the user's eye to primary actions, and soft, rounded geometry to feel approachable and high-end. The interface should feel like a clear glass pane over a rich, detailed map—utilizing layers to provide depth without clutter.

## Colors
The palette is dominated by "Bright Travel Blue," a high-vibrancy primary color used for routes, selection states, and primary calls to action. 

- **Primary Stack:** Use the primary blue for critical path actions. The light variant is reserved for subtle backgrounds like selected list items or chip containers.
- **Surface Strategy:** The background uses a very light grey to allow pure white surfaces (cards, bottom sheets) to "pop" and appear elevated.
- **Map Context:** Map pins use a high-contrast red to stand out against standard map tiles, switching to the primary blue only when actively selected or part of a saved itinerary.
- **Typography:** Ensure a minimum 4.5:1 contrast ratio for `textSecondary` against white surfaces to maintain accessibility.

## Typography
This design system uses **Inter** for its systematic, utilitarian nature which excels in data-dense travel environments.

- **Scale:** High-level headers (`display`) use tight letter spacing and bold weights to command attention on landing screens.
- **Legibility:** Body text uses a standard 1.5x line height to ensure readability for long-form descriptions or transit directions.
- **Hierarchy:** Use `label` styles for buttons and tabs to differentiate interactive elements from static content. `caption` is strictly for non-critical metadata or legal disclaimers.

## Layout & Spacing
The system follows a strict **8pt grid** to ensure mathematical harmony across all screen sizes.

- **Mobile Philosophy:** Use a 4-column fluid grid. Content is largely driven by "Bottom Sheets" that slide over the map, allowing the user to maintain geographical context while browsing details.
- **Safe Areas:** Maintain a minimum 16px margin from the edge of the screen for all text content. 
- **Rhythm:** Use `lg` (16px) as the standard padding for containers and cards. Use `xs` or `sm` for internal groupings, such as an icon next to a label.

## Elevation & Depth
Depth is conveyed through **Ambient Shadows** and **Tonal Layers**. 

- **Level 0 (Map):** The base layer.
- **Level 1 (Cards):** Low-elevation cards sitting on the background. Use a very soft 4px blur shadow with 4% opacity black.
- **Level 2 (Bottom Sheets / Modals):** High-elevation surfaces that float above the map. Use an 8px blur shadow with 8% opacity, slightly offset on the Y-axis (4px) to simulate a light source from above.
- **Level 3 (Floating Action Buttons):** 12px blur shadow with 12% opacity.

Avoid harsh borders. Elevation should be felt through the shadow and the subtle contrast between the `#F8F9FA` background and `#FFFFFF` surfaces.

## Shapes
The shape language is purposefully **Rounded** to evoke a sense of comfort and safety.

- **Small (4px):** Checkboxes, tooltips, and small tags.
- **Medium (8px):** Standard buttons, input fields, and small thumbnail images.
- **Large (16px):** Standard content cards (e.g., hotel cards, flight segments).
- **XL (24px):** Main container sheets and bottom sheet headers.
- **Full:** Use for "Pill" style buttons, chips, and notification badges.

## Components
- **Buttons:** Primary buttons are pill-shaped with `primary_color_hex` background and `onPrimary` text. Secondary buttons use `primaryLight` background with `primary_color_hex` text.
- **Bottom Sheets:** Use the `xl` (24px) radius on the top-left and top-right corners only. Include a centered "grabber" handle (40x4px, `divider` color) at the top.
- **Cards:** Cards should have no borders. Rely on the Level 1 shadow and `lg` (16px) corner radius. Internal padding should be `lg` (16px).
- **Chips:** For filtering, use pill-shaped containers with a 1px `borderLight` stroke. When active, fill with `primary_color_hex` and remove the stroke.
- **Input Fields:** Use `surfaceVariant` as the background with no border. On focus, add a 2px stroke of `primary_color_hex`.
- **Map Markers:** Use a "Pin" shape with a white outer ring. The center circle should be `mapPin` color. When selected, the center circle scales up and changes to `selectedMapPin`.
- **Search Bar:** A floating element with `radiusFull` and Level 2 elevation, typically anchored to the top of the map view.