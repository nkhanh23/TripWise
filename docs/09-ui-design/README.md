# 09-ui-design: UI/UX Documentation Index (TripWise)

> **Visual Source of Truth:** The latest **Google Stitch** design system (`stitch_tripwise_design_system` & `.stitch/designs`) is the authoritative visual source of truth for the TripWise mobile application.

This directory serves as the centralized UI documentation for the active **React Native + TypeScript + Expo** client. Google Stitch remains the visual reference; React Native source/config remains the implementation source of truth.

---

## 1. Quick Authority Index

| Area | Authoritative Document | Purpose & Scope |
|---|---|---|
| **Design Tokens & Theme** | [`design-system.md`](./design-system.md) | Colors, Typography (Inter), 8pt Spacing Grid, Radius, Ambient Shadows, Card & Sheet principles |
| **Shared TW Components** | [`component-spec.md`](./component-spec.md) | Specification for planned/shared React Native `TW*` components and variants |
| **Complete Screen Inventory** | [`screen-list.md`](./screen-list.md) | Complete inventory of all 32 mobile screens, wizard steps, dialogs, entry/exit paths, and states |
| **Mobile Layout & Layering** | [`ui-layout-mobile.md`](./ui-layout-mobile.md) | Map-first layering, draggable bottom sheets, floating HUDs, SafeArea rules, responsive breakpoints |
| **Mobile Navigation Graph** | [`mobile-navigation-flow.md`](./mobile-navigation-flow.md) | Screen-to-screen user journeys, verified 5-tab hierarchy and back-stack rules |
| **Stitch → React Native Mapping** | [`stitch-to-react-native-mapping-report.md`](./stitch-to-react-native-mapping-report.md) | Active audited mapping for Stitch screens/components/tokens to current React Native source and verified React Navigation routes |
| **Map Screen Specifications** | [`trip-detail-map-spec.md`](./trip-detail-map-spec.md) | Dedicated spec for interactive map rendering, markers, route polylines & HUD controls |
| **Implementation Notes** | [`implementation-notes.md`](./implementation-notes.md) | Architectural guidelines and best practices for modular mobile implementation |

---

## 2. Historical / Legacy References

The following documents define web-specific requirements or serve as legacy references (per ADR-017 & ADR-018, the primary end-user client is the Mobile App):
- [`ui-layout-web.md`](./ui-layout-web.md): Split-screen dashboard layout for desktop admin portal.
- [`landing-page-spec.md`](./landing-page-spec.md): Web marketing landing page specification.
- [`dashboard-spec.md`](./dashboard-spec.md): Web dashboard specifications.
- [`ai-trip-planner-spec.md`](./ai-trip-planner-spec.md): Prompt parser and AI generator specifications.
- [`prompt-library.md`](./prompt-library.md): Reusable UI prompt library for design generation.
- [`stitch-react-native-mapping.md`](./stitch-react-native-mapping.md): Compatibility pointer to the active audited report; do not maintain duplicate mapping content.
- [`stitch-flutter-mapping.md`](./stitch-flutter-mapping.md): **SUPERSEDED / HISTORICAL — Flutter implementation mapping**.
- [`stitch-to-flutter-mapping-report.md`](./stitch-to-flutter-mapping-report.md): **SUPERSEDED / HISTORICAL — Flutter implementation mapping**.

---

## 3. Mandatory Rule for AI Coding Assistants

> ⚠️ **MANDATORY INSTRUCTION:**
> Before creating or modifying any React Native / Mobile UI implementation task, agents MUST read and strictly adhere to:
> 1. `docs/09-ui-design/README.md`
> 2. `docs/09-ui-design/design-system.md`
> 3. `docs/09-ui-design/component-spec.md`
> 4. `docs/09-ui-design/screen-list.md`
> 5. `docs/09-ui-design/ui-layout-mobile.md`
> 6. `docs/09-ui-design/mobile-navigation-flow.md`
> 7. `docs/09-ui-design/stitch-to-react-native-mapping-report.md`
>
> AI must NOT invent arbitrary design tokens or create duplicate one-off components per screen when an existing shared component can support the required variant.
