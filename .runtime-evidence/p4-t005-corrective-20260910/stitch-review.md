# Google Stitch Design Authority & Review Evidence (T005)

**Document**: `stitch-review.md`  
**Project ID**: `10069552738311964263`  
**Inspected By**: Antigravity (Native Stitch MCP tools: `list_screens`, `get_screen`)  
**Date**: 2026-09-10  
**Status**: VERIFIED & RECONCILED  

---

## 1. Verified Stitch Screens & Exact Identifiers

| Screen Name in Stitch | Screen ID | Direct Stitch Authority Scope |
|---|---|---|
| **Explore Map** | `59868f4d804949378cb44822abbe7c7d` | Map container, search pill overlay, category chips, floating view toggle, map markers |
| **Selected Place** | `0d23dbd9a4d442a69d981d093baed5e5` | Place preview bottom sheet over map, grabber handle, close button, title + star rating, category badge, action buttons (Route, Save, Entry Fee, Share) |
| **Place Detail** | `56b2936d964243aa868bf5fb47cda84d` | Full place detail layout: back/share/save header circles, place title + rating pill, quick actions grid (Route, Website, Call, Add), About section snippet + Read more toggle, 2-column info cards (Opening hours card & Entry fee card), weekday schedule expander, bottom floating CTA |

---

## 2. Direct Stitch Authority vs. Design Language Extensions

### Direct Stitch Authority:
- **Place Details Screen Structure**:
  - The 4-column quick action layout (`Route`, `Website`, `Call`, `Add`) directly adheres to `56b2936d964243aa868bf5fb47cda84d`.
  - The dual-card bento row for `OPENING HOURS` and `ENTRY FEE` directly follows `56b2936d964243aa868bf5fb47cda84d`.
  - Floating top circle actions (`Back`, `Share`, `Save`) and bottom floating CTA button adhere to Stitch visual hierarchy.
- **Selected Place Sheet**:
  - The bottom sheet preview card structure, grabber pill, category tag, and horizontal quick action circles directly adhere to `0d23dbd9a4d442a69d981d093baed5e5`.
- **Explore Map & View Toggle**:
  - Floating pill toggle for Map/List mode directly derives from `59868f4d804949378cb44822abbe7c7d`.

### Minimal Existing Design Language Extensions (No Direct Dedicated Stitch Screen):
Certain dynamic intelligence states are ephemeral review/network states without static 1:1 Stitch screens:
1. **Live Event Candidate Card & Sheet (`EventCandidateCard`, `EventPreviewSheet`)**:
   - Stitch project currently specifies static place cards and place detail screens; it does not define a separate Ticketmaster live event mockup.
   - **Resolution**: Follows the exact token hierarchy of `Selected Place` (pill radii, elevation, surface colors, action rows, grabber handle) and introduces semantic textual provider attribution (`Ticketmaster`) and review badges (`Review Required` / `Chờ xem xét`).
2. **Review Badges & Live Freshness Indicators**:
   - `Review Required`, `Live`, and `Cached` badges use standard TripWise design system tokens (`radius.pill`, `colors.background.surfaceVariant`, `colors.brand.primary`, `typography.bodySmall`) without disrupting Stitch layout structure.
3. **Controlled Empty & Error States (`EventEmptyState`, `EventErrorState`)**:
   - Center-aligned card with `radius.card`, subtle elevation, semantic warning/error icons, and primary pill CTA button (`Retry`), consistent with the global TripWise mobile component system.
4. **Honest Null-State Handling**:
   - When opening hours or ticket pricing are null/unavailable from providers, the UI renders honest fallback text (`Hours not available`, `Unavailable` / `Không khả dụng`) rather than inventing mock admission or hours, preserving Stitch card geometry.

---

## 3. Stitch-to-React Native Faithfulness Confirmation

- **Typography & Spacing**: Fully calibrated against theme tokens derived from the Stitch design system.
- **Color Palettes**: Both Light and Dark palettes use the calibrated design tokens from `palettes.ts`.
- **Touch Targets**: All interactive touch targets meet or exceed Android 44dp guidelines.
- **No Historical Flutter Mapping**: Verification relies 100% on active Google Stitch project `10069552738311964263` and the native React Native implementation.

**Verdict: PASS (Faithful Stitch Alignment & Documented Extensions)**
