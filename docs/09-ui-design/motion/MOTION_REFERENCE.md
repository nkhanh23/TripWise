# Create Trip Generation - Motion Reference

## Overview
This reference summarizes the motion extracted from `video_animation/_ _title_TripWise_AI_Trip.mp4` for the `CreateTripWizardScreen` generation transition.

**Canonical Metadata:**
* Width/Height: 1280x720
* Frame Rate: 24 fps
* Frames: 240
* Stream Duration: 10.000s

## Stage Map & Timings
* **IDLE / INITIAL** (F000-F023)
* **DRAW_CARD_1** (F024-F039)
* **HOLD_CARD_1** (F040-F053)
* **DRAW_CARD_2** (F054-F068)
* **HOLD_CARD_2** (F069-F082)
* **DRAW_CARD_3** (F083-F095)
* **HOLD_CARD_3** (F096-F109)
* **DRAW_DAY_CARDS** (F110-F151)
* **TRANSITION_TO_SAVING** (F152-F160)
* **SAVING_HOLD** (F161-F176)
* **SUCCESS_REVEAL** (F177-F195)
* **CTA_REVEAL** (F196-F209)
* **FINAL_INTERACTIVE_HOLD** (F210-F239)

## Key Visual Anchors & Reveal Order
1. Text "Tailoring your adventure..." holds steady.
2. Route line extends monotonically downwards.
3. Cards and nodes appear sequentially (Card 1 -> Card 2 -> Card 3), fading in and translating upwards from alternating sides.
4. Entire list scrolls upwards when space is exhausted, transitioning to Day cards.
5. Bottom text changes to "Saving your trip...".
6. Success state replaces the entire generation canvas (Text changes, background fades, large success card scales in).
7. Call to Action (CTA) button reveals last.

## Safe Lifecycle Boundaries

| Checkpoint | Frame / Range | Type | Network Prerequisite | Wait / Hold Allowed |
| :--- | :--- | :--- | :--- | :--- |
| **Initial entry / Gen start** | F000 | OBSERVED_FROM_MP4 | Accepted user submit | No |
| **Generation completion latch** | F151 | DERIVED_SAFE_RUNTIME_BOUNDARY | Generation result received | `RUNTIME_EXTENSION_OF_AUDITED_FRAME` (Hold here if slow) |
| **Draft reveal** | F151 | DERIVED_SAFE_RUNTIME_BOUNDARY | Validated draft available | No |
| **Persistence entry** | F152 | DERIVED_SAFE_RUNTIME_BOUNDARY | Validated draft + boundary reached | No |
| **Saving transition** | F152 - F160 | OBSERVED_FROM_MP4 | Persistence is in-flight | No |
| **Saving hold entry** | F161 | OBSERVED_FROM_MP4 | Persistence is in-flight | `RUNTIME_EXTENSION_OF_AUDITED_FRAME` (Hold here if slow) |
| **Saving hold exit** | F176 | DERIVED_SAFE_RUNTIME_BOUNDARY | Persistence succeeded (`tripId`) | No |
| **Success reveal** | F177 - F195 | OBSERVED_FROM_MP4 | `SAVE_SUCCESS` / Real `tripId` | No |
| **CTA reveal** | F196 - F209 | OBSERVED_FROM_MP4 | Success revealed | No |
| **Final interactive hold** | F210 - F239 | OBSERVED_FROM_MP4 | CTA revealed | Yes (indefinite until interaction) |

## Personalization & Abstraction
* Do not embed fake locations or Place IDs.
* Use trusted wizard bindings: user's custom destination name, duration, travel styles, and group motifs.
* Translate video cards into abstract motion roles (e.g., "Generic Activity Card") before Gemini returns actual data.

## Separation of Concerns
* **EN/VI Separation**: Geometric animations must not assume fixed string widths.
* **Light/Dark/System**: Reference MP4 hex colors are ignored. Bind to semantic React Native theme tokens.
* **Reduced Motion**: Fall back to simple opacities and omit scrolling/translation.

## Dependency Decision
**NEW_MOTION_RUNTIME_DEPENDENCY = NOT_REQUIRED**
Rationale: The observed motion consists of straightforward opacities, 2D translations, and scaling. This can be fully implemented using `react-native`'s built-in `Animated` API. No third-party heavy motion libraries (like Lottie or Reanimated) are strictly necessary for this specific interaction.

## Known Ambiguities
* Exact cubic-bezier parameters are approximated as standard `ease-out` and `ease-in-out` profiles since they could not be definitively extracted from raw frames.
