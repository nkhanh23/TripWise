# Create Trip Generation - Frame Manifest

## Scope
This manifest describes the deterministic frame behavior for the canonical MP4 (`video_animation/_ _title_TripWise_AI_Trip.mp4`).
* Format: 24 fps
* Frames: F000 to F239
* Time conversion: `timeSeconds(frame) = frame / 24`

**OBSERVED_FROM_MP4**: The behavior extracted from the reference video.
**RUNTIME_IMPLEMENTATION_GUIDANCE**: Rules for safely implementing the motion in React Native using the existing stack and components.

## Frame Ranges & Formulas

### Stage 0: `IDLE / INITIAL` (F000 – F023)
* **Timecode**: 0.0s – 0.958s
* **Lifecycle Interpretation**: Initial submission boundary. `SUBMITTING` / `GENERATING` starts.
* **Element - Text**: "Tailoring your adventure..." (opacity = 1.0)
* **Element - Route Line**: Invisible (progress = 0%)
* **Element - Cards**: Invisible (opacity = 0, translated down/hidden)

### Stage 1: `DRAW_CARD_1` (F024 – F039)
* **Timecode**: 1.0s – 1.625s
* **Lifecycle Interpretation**: `GENERATING` phase, first mock item reveal.
* **Element - Route Line**: Grows downwards. Progress = `(frame - 24) / 15`
* **Element - Card 1**: Fades in and translates up from right.
  * Opacity: `ease-out((frame - 28) / 11)` (starts around F028).
  * Translate Y: Moves from +Y offset to 0.
* **Element - Node 1**: Scales up / fades in concurrently with Card 1.

### Stage 2: `HOLD_CARD_1` (F040 – F053)
* **Timecode**: 1.666s – 2.208s
* **Lifecycle Interpretation**: `GENERATING` phase hold.
* **Elements**: Route, Card 1, and Node 1 are held fully visible and static.

### Stage 3: `DRAW_CARD_2` (F054 – F068)
* **Timecode**: 2.25s – 2.833s
* **Lifecycle Interpretation**: `GENERATING` phase, second mock item reveal.
* **Element - Route Line**: Grows downwards.
* **Element - Card 2**: Fades in and translates up from left.
  * Opacity: `ease-out((frame - 57) / 11)` (starts around F057).
* **Element - Node 2**: Scales up / fades in.

### Stage 4: `HOLD_CARD_2` (F069 – F082)
* **Timecode**: 2.875s – 3.416s
* **Lifecycle Interpretation**: `GENERATING` phase hold.
* **Elements**: Held static.

### Stage 5: `DRAW_CARD_3` (F083 – F095)
* **Timecode**: 3.458s – 3.958s
* **Lifecycle Interpretation**: `GENERATING` phase, third mock item reveal.
* **Element - Route Line**: Grows downwards.
* **Element - Card 3**: Fades in from right.
  * Opacity: `ease-out((frame - 85) / 10)`

### Stage 6: `HOLD_CARD_3` (F096 – F109)
* **Timecode**: 4.0s – 4.541s
* **Lifecycle Interpretation**: `GENERATING` phase hold.
* **Elements**: Held static.

### Stage 7: `DRAW_DAY_CARDS` (F110 – F151)
* **Timecode**: 4.583s – 6.291s
* **Lifecycle Interpretation**: `GENERATING` loop continuation.
* **Element - Canvas**: Entire route/card container translates upwards (`ease-in-out`).
* **Element - Day Cards**: Activity/route presentation transitions to Day 1, Day 2, Day 3 cards. Cards fade in and translate upwards as the route line extends.

### Stage 8: `TRANSITION_TO_SAVING` (F152 – F160)
* **Timecode**: 6.333s – 6.666s
* **Lifecycle Interpretation**: Visual transition to `SAVING` phase.
* **Element - Bottom Sheet Text**: "Building your adventure" fades out, "Saving your trip..." fades in.

### Stage 9: `SAVING_HOLD` (F161 – F176)
* **Timecode**: 6.708s – 7.333s
* **Lifecycle Interpretation**: Safe loop point for atomic persistence.
* **Safe Checkpoint**: **`SAVING` hold entry**. Persistence-confirmed success must wait here. If the database save takes longer, this composition holds.

### Stage 10: `SUCCESS_REVEAL` (F177 – F195)
* **Timecode**: 7.375s – 8.125s
* **Lifecycle Interpretation**: `SAVE_SUCCESS` / persistence-confirmed success entry. Proceed ONLY if real `tripId` is available.
* **Element - Header Text**: "Your trip is ready!" fades in.
* **Element - Canvas**: Background/route elements fade out.
* **Element - Success Card**: Scales up and fades in (`ease-out`). Checkmark animates in.

### Stage 11: `CTA_REVEAL` (F196 – F209)
* **Timecode**: 8.166s – 8.708s
* **Lifecycle Interpretation**: Completion of the success presentation.
* **Element - Action Button**: The "View my itinerary" CTA button fades in and translates up slightly.

### Stage 12: `FINAL_INTERACTIVE_HOLD` (F210 – F239)
* **Timecode**: 8.750s – 9.958s
* **Lifecycle Interpretation**: Final interactive hold state before user navigation.
* **Elements**: Success state fully held, CTA is fully present and interactive.

## Implementation & Separation Rules

### Easing Character
* **OBSERVED**: Transitions use an `ease-out` character for reveals (opacity and translate) and `ease-in-out` for scrolling.
* **RUNTIME_IMPLEMENTATION_GUIDANCE**: Use React Native `Animated` standard easing functions (e.g., `Easing.out(Easing.ease)`). Do not attempt to reverse-engineer exact bezier curves.

### Theme & Localization
* **Semantic Theme Roles**: Canvas (surface), Route (accent/border), Cards (surface/border), Text (primary/secondary). Do not hardcode MP4 hex colors. Follow existing Light/Dark/System theme context.
* **Localization**: Text values like "Tailoring your adventure..." and "Your trip is ready!" must map to i18n keys. Motion constraints (widths) must support variable lengths (EN/VI).

### Reduced Motion
* **Rule**: If reduced motion is enabled, replace translational motion with simple opacity fades, and bypass the scrolling loop (jump to static holds).

### Safe Lifecycle Boundaries

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
