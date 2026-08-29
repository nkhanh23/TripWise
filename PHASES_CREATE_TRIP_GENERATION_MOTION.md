# TripWise Create Trip Generation Motion Milestone

**Milestone ID:** `CREATE_TRIP_GENERATION_MOTION`
**Task namespace:** `MOTION-T001` through `MOTION-T013`
**Track:** Post-integration product-UI motion milestone; it does not create or extend `INT-P0` through `INT-P9`.
**Status:** PLANNED / IMPLEMENTATION NOT STARTED
**Runtime target:** Android

## 1. Purpose and scope

Plan a premium, calm Create Trip experience that communicates “TripWise is creating your trip.” This is a planning-only milestone: it authorizes no animation implementation, test/source/dependency change, backend/Supabase/Gemini/security/navigation change, deploy, or push.

The base experience is abstractly personalized from trusted wizard input. It must not require exact generated locations, provider metadata, fake progress, or a fake result.

## 2. Source-of-truth split

| Authority | Source of truth for | Explicitly not source of truth for |
|---|---|---|
| Current React Native TripWise UI/theme | Visual component patterns, geometry, spacing, typography, component identity, semantic visual language, and production UI consistency. | Motion timing, literal video copy, or generated itinerary facts. |
| Canonical MP4 | Motion sequence, timing, reveal order, direction, entrance/exit behavior, rhythm, and transition character. | Literal runtime strings, raw colors, data, lifecycle outcome, or security. |
| TripWise runtime data | Destination, duration, interests, pace, budget, group, title, generation/persistence outcome. | Reference-video timing. |
| Existing i18n/theme architecture | EN/VI text, Light/Dark/System semantic colors, formatting, accessibility copy. | Video-rendered words/colors. |

> The current TripWise UI/theme remains visual source of truth.
>
> The canonical MP4 is the motion source of truth only.
>
> Responsive implementation may adapt dimensions but cannot arbitrarily alter audited timing, relative movement, reveal order, or transition intent.

The MP4 must not become source of truth for English glyph pixels, literal colors, provider data, or success state.

## 3. Canonical motion video

```text
CANONICAL_MOTION_VIDEO = video_animation/_ _title_TripWise_AI_Trip.mp4
REFERENCE_VIDEO_FRAME_AUDIT = READY_FOR_MOTION_T001
```

The filename includes a `U+00A0` non-breaking space between the first two underscores. Resolve this exact local filename; do not rename, move, replace, recompress, or modify it.

| Verified property | Value |
|---|---:|
| Resolution | 1280 × 720 |
| FPS | 24 |
| Frames | 240 (`F000`–`F239`) |
| Visual duration | 10.000 seconds |
| Container duration | 10.006 seconds |
| Size | 1,143,628 bytes (~1.14 MB) |

The actual file is authoritative. The obsolete 1080×1920, 30fps, 8-second contract is removed. The file is available but no frame-fidelity PASS is claimed: exact interpretation belongs to `MOTION-T001`.

## 4. Current local architecture to preserve

- `CreateTripWizardScreen.tsx` owns wizard state, submit, current generation presentation, save action, and navigation.
- `generation.ts` owns a single in-flight authenticated request, abort/unmount guard, and generation retry intent.
- `generationContracts.ts` produces an `UNRESOLVED` planner preview without invented provider IDs/coordinates.
- `persistence.ts` owns single-flight atomic save, stable idempotency intent, retained draft/title, persistence-only retry, and abort/unmount guard.
- `supabaseTripRepositories.ts` keeps authenticated `generate-trip` and atomic/idempotent `create_trip_graph` separate.
- `AppNavigator.tsx`/`types.ts` own Create Trip and persisted `TripDetail: { tripId }` navigation.

Current UI shows `ActivityIndicator` during generation and exposes a success presentation before persistence. Future motion work must narrowly reconcile presentation with this protected lifecycle without merging adapters or changing contracts:

```text
Wizard input → authenticated generation → validated draft → atomic persistence → persistence-confirmed success → TripDetail(real tripId)
```

## 5. Motion lifecycle state machine

| State | Meaning | Legal outbound transition |
|---|---|---|
| `IDLE` | Wizard editable. | `SUBMITTING` |
| `SUBMITTING` | One guarded submit accepted. | `GENERATING`, local `GENERATION_ERROR` |
| `GENERATING` | Generation in flight; abstract timeline plays. | `GENERATION_HOLD`, `GENERATION_SUCCESS`, `GENERATION_ERROR` |
| `GENERATION_HOLD` | Audited stable composition while generation is slow. | `GENERATION_SUCCESS`, `GENERATION_ERROR` |
| `GENERATION_SUCCESS` | Validated draft latched. | `SAVING` |
| `SAVING` | Atomic persistence in flight. | `SAVE_SUCCESS`, `SAVE_ERROR` |
| `SAVE_SUCCESS` | Real trip ID latched; success motion/CTA allowed. | Persisted Trip Detail |
| `GENERATION_ERROR` | Wizard values retained. | Explicit fresh generation attempt/editing |
| `SAVE_ERROR` | Generated draft/save intent retained. | `SAVING` only |

Forbidden: frame/timer-triggered network calls; saving before a draft; success/navigation before persistence; save retry invoking Gemini; locale/theme update restarting operations/timeline or duplicating requests.

## 6. 240-frame motion contract

```text
fps = 24
timeSeconds(frame) = frame / 24
frame = clamp(integerFrame, 0, 239)
rangeProgress(frame, startFrame, endFrame) = clamp((frame - startFrame) / (endFrame - startFrame), 0, 1)
```

| Frame | Timecode |
|---|---:|
| `F000` | 0.000s |
| `F024` | 1.000s |
| `F048` | 2.000s |
| `F120` | 5.000s |
| `F216` | 9.000s |
| `F239` | ~9.958s, held through endpoint |

The 10-second MP4 is not a backend deadline or success clock. `MOTION-T001` must inspect `F000–F239` at 24fps before assigning semantic ranges, messages, route/card/day count, positions, easing, lifecycle boundaries, or hold behavior. Old 30fps ranges are deliberately absent.

Runtime uses monotonic deterministic interpolation, not a 24-times-per-second React state loop. Prefer opacity, translateX/Y, scale, justified rotation, and approved path/stroke progress. Avoid continuous width, height, top, left, layout recalculation, large shadow changes, or frame-driven rerenders.

## 7. Network-to-motion synchronization

`MOTION-T001` marks manifest-defined safe boundaries for initial entry, generation complete, generation hold entry/exit, draft reveal, persistence entry, saving hold entry/exit, success entry, and final interactive hold.

- Start generation once at accepted submit, independent of animation.
- Latch early generation result until next audited safe transition; never jump or reveal invented places.
- Slow generation enters a deterministic abstract hold; it does not advance to saving/success or replay the sequence.
- Start persistence exactly once only after a validated draft and audited persistence boundary.
- Latch early save result until audited success boundary; slow persistence holds saving composition.
- Generation failure retains wizard values and retries generation with fresh attempt/timeline origin.
- Save failure retains generated draft/save intent and retries persistence only.
- Frame timeline, theme, and locale changes never make network calls.

## 8. Abstract personalization matrix

The base animation must work before Gemini returns. Exact generated locations are not required.

| Trusted input | Allowed abstract effect | Never infer/display |
|---|---|---|
| Destination/custom name | Localized label, safe destination context/icon, existing trusted cover. | Generated locations, coordinates, provider identity, unsafe image lookup. |
| Duration | Label; bounded density of abstract route/card/day indicators. | One card per arbitrary day or fabricated schedule. |
| Selected styles | Existing configured MaterialIcons/motifs: `culture`, `food`, `nature`, `shopping`, `relaxation`, `adventure`, `nightlife`, `art`. | Provider categories/exact stops. |
| Pace | Bounded abstract rhythm/density. | Backend timing/forced success. |
| Budget | Abstract motif/icon only. | Price, currency estimate, hotel class, rating. |
| Group | Existing person/group motif. | Exact traveler count beyond input semantics. |
| Title | Layout-safe contextual label when available. | Generated title before it exists. |

If no existing safe destination image is available, show an honest placeholder. Motion presentation never calls a provider.

## 9. Dynamic localized motion copy

All visible motion text uses existing centralized `t(key, params)` and supports EN/VI. Current planner convention uses semantic flat dotted keys such as `planner.generatingTitle`, `planner.savingTrip`, `planner.successTitle`, `planner.generationError.*`; `common.retry` already exists.

`MOTION-T010` selects any new `planner.*` keys after final component API review, adds EN and VI in lockstep, and reuses current keys when semantics match. No JSX locale condition or hardcoded English/Vietnamese text.

```text
statusMessageContainer
  → opacity / translateY from FRAME_MANIFEST
  → t(localizationKey, parameters) at runtime
```

Container motion is frame-locked; i18n controls content. Vietnamese and long destination/title values may have different glyph widths and line breaks. Keep responsive bounds, flexible width, deliberate multiline behavior, and readable typography; do not distort/shrink text to match English reference pixels.

Locale change while mounted updates text only. It must not restart generation/persistence, reset timeline origin, key/remount canvas, or duplicate requests.

## 10. Dynamic theme motion contract

All runtime colors use `useTheme().colors`, never reference-video hex values.

| Element | Semantic role |
|---|---|
| Canvas/surfaces | `background.canvas`, `background.surface`, `background.surfaceVariant` |
| Copy | `text.primary`, `text.secondary`, `text.muted` |
| Route/nodes/accent | Audited `brand`, `icon`, or `border` role |
| Cards/borders | `background.*`, `border.default`, `border.subtle` |
| Error/success | `state.error`, `state.success` |

Light, Dark, and System share timeline, sequence, relative placement, easing, and reveal order; semantic colors/contrast differ. No separate Dark MP4 is required.

`ThemeProvider` derives `effectiveTheme` from `themePreference` (`system`, `light`, `dark`) and OS scheme. A theme change updates colors only: no generation/persistence/timeline restart, no timeline-origin reset, no canvas remount, no duplicate request. Timeline refs/component keys must not depend on theme/effective theme.

## 11. Motion versus dynamic-content fidelity

**Motion frame contract** preserves audited timing, anchors, entrance direction, opacity/scale progression, transition order, movement, container geometry, and transition character.

**Dynamic-content contract** allows runtime EN/VI content, glyph width/wrapping, destination/duration/interests/title, semantic colors, and accessibility text to vary inside approved responsive bounds.

Frame fidelity does not mean EN/VI glyphs have identical pixels. The animated container and behavior align; text remains readable and undistorted.

```text
MOTION_ALIGNMENT = PASS / FAIL / BLOCKED
CONTENT_VARIANT_VALIDATION = PASS / FAIL / BLOCKED
```

## 12. Runtime asset policy

1. React Native `View`/`Text`
2. MaterialIcons
3. Native Animated transforms/opacity
4. Existing trusted destination image
5. Approved vector asset only when `MOTION-T001` proves necessary
6. Honest placeholder

The MP4 is reference-only, never runtime autoplay: real generation/persistence duration, EN/VI, Light/Dark/System, dynamic inputs, interactive errors/retries, accessibility, and persistence-gated success require native dynamic presentation.

## 13. FRAME_MANIFEST and reference strategy

`MOTION-T001` validates metadata, audits all motion, derives deterministic ranges/formulas, and creates a persistent `FRAME_MANIFEST`; it may also create concise `MOTION_REFERENCE` guidance. Later tasks consume these artifacts instead of repeatedly reinterpreting the MP4. Re-read video only for ambiguity, verified mismatch, or `MOTION-T013` comparison; this is a consistency/context optimization, not a token-cost guarantee.

Manifest enumerates every frame or derives every frame deterministically and remains independent from literal text/theme values:

| Frame | Timecode | State | Element | Property | Progress | Easing | DataBinding | ThemeRole | LocalizationKey | VariantRule | Fallback | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `Fxxx` | `frame / 24` | `GENERATING` | `statusMessageContainer` | `opacity` | audited formula | audited easing | lifecycle | `text.primary` | semantic `planner.*` | EN/VI responsive | safe key | enter/hold/exit |

Also record anchors, responsive adaptation, z-order, clipping, transform origin, visibility, safe lifecycle boundary, and reduced-motion variant. No undocumented frame gaps.

## 14. Component architecture plan

```text
CreateTripWizardScreen
  → future lifecycle/timeline coordinator over existing hooks
      → useTripGeneration → authenticated repository
      → useTripPersistence → atomic repository
      → lifecycle latches + pure frame-to-style derivation
  → future motion presentation
      → abstract route/nodes/cards/day indicators
      → localized status container
      → saving/success/error presentation
  → TripDetail(persisted tripId)
```

Keep generation/persistence hooks and repositories separate. JSX consumes sanitized lifecycle/wizard models only. Preserve component identity/timeline refs across locale/theme updates. No new route is implied. Evaluate narrow reuse of current success view only after persistence-confirmed success is modeled.

## 15. Accessibility, reduced motion, and performance

Reduced motion changes movement only; it retains EN/VI, Light/Dark/System, lifecycle, error semantics, success gate, and CTA. Use short opacity/small-or-zero-distance transitions and static/low-motion holds. Preserve accessible localized lifecycle communication without announcing every frame or fake numeric progress; retain 44×44 targets, safe areas, focus order, MaterialIcons, and contrast.

Use native-capable interpolation; no `setInterval`/`requestAnimationFrame` React-state loop. Avoid continuous layout/large shadow animation. Stop clocks/listeners on unmount, reject stale callbacks, preserve single-flight guards, measure approved vector/image cost, and ensure locale/theme changes are presentation-only.

## 16. Implementation tasks

Progress boxes are evidence-based. `[ ]` means not completed. `[x]` is allowed only after actual implementation, test, or runtime evidence exists; planning text or agent claim alone is insufficient. Preserve `MOTION-T001` through `MOTION-T013` order and do not create `INT-P10` or later integration phases.

- [ ] MOTION-T001 — Validate MP4 metadata; inspect F000–F239 at 24fps; create manifest/reference spec; distinguish video motion from runtime i18n/theme; dependency decision only if necessary. No implementation.
- [ ] MOTION-T002 — State machine, lifecycle latches, monotonic timeline, safe checkpoints, pure frame derivation, locale/theme stability.
- [ ] MOTION-T003 — Audited abstract route/node construction.
- [ ] MOTION-T004 — Audited abstract activity-card stagger; no exact locations.
- [ ] MOTION-T005 — Audited bounded duration/day-indicator reveal; no fixed Day 1/2/3 contract.
- [ ] MOTION-T006 — Generation hold/early-late synchronization.
- [ ] MOTION-T007 — Saving hold and persistence-only retry.
- [ ] MOTION-T008 — Persistence-confirmed localized success and Trip Detail CTA.
- [ ] MOTION-T009 — Localized generation/save errors and differentiated retries.
- [ ] MOTION-T010 — EN/VI, Light/Dark/System, accessibility, responsive bounds, reduced motion.
- [ ] MOTION-T011 — Android cleanup/rerender/memory/frame-pacing/overdraw/stale-call audit.
- [ ] MOTION-T012 — Automated regressions and quality gates.
- [ ] MOTION-T013 — Android recording/frame alignment and motion/content evidence.

`MOTION-T010` completes before final automated/runtime closure. Do not start a later task when its prerequisite is unresolved.
## 17. Automated test plan

Retain generation/persistence/idempotency/retry/success-gating regressions. Future tests must prove: one generation per action; no duplicate taps; deterministic 24fps F000–F239 origin; semantic EN/VI state keys/no hardcoded one-language copy; long VI/destination/title bounds; Light/Dark semantic role use/no raw reference colors; locale/theme update does not remount/restart timeline/business work or duplicate requests; safe early/slow generation hold; wizard retention on generation failure; save-once/draft retention/save-only retry; success impossible before real persistence; reduced-motion semantics; cleanup/stale/unmount safety; and audited frame checkpoints including F000/F024/F048/F120/F216/F239 plus every transition neighbor.

## 18. Android runtime and frame comparison

Required primary variants share one timeline:

1. Light + EN
2. Light + VI
3. Dark + EN
4. Dark + VI

Across them verify short/long destination, short/long duration, relaxed/fast, solo/friends/family, image available/unavailable, normal/slow generation, generation failure, save failure/retry, success, persisted Trip Detail, no clipping/overflow/restart/duplicate/redbox/severe jump/contrast failure/untranslated text/fake data, and reduced motion where supported.

Align Android capture with canonical 1280×720/24fps from accepted submit. Reference aspect ratio may differ from responsive UI; current React Native TripWise UI/theme remains visual, component, and geometry truth. `MOTION-T001` defines anchor normalization without stretching either source or requiring identical localized glyph pixels. Extended holds are compared separately.

```text
FRAME_ALIGNMENT = PASS / FAIL / BLOCKED
TIMING_ALIGNMENT = PASS / FAIL / BLOCKED
ELEMENT_ORDER = PASS / FAIL / BLOCKED
MOTION_DIRECTION = PASS / FAIL / BLOCKED
SUCCESS_GATE_CORRECT = PASS / FAIL / BLOCKED
MOTION_ALIGNMENT = PASS / FAIL / BLOCKED
CONTENT_VARIANT_VALIDATION = PASS / FAIL / BLOCKED
```

No frame-exact PASS without side-by-side/frame-aligned evidence.

## 19. Future quality gates

After future source changes, run from `mobile/`:

```powershell
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

Android runtime evidence is mandatory for final closure.

## 20. Acceptance and stop conditions

Acceptance requires: canonical MP4 unchanged; actual 1280×720/24fps/240-frame/10-second metadata; 24fps F000–F239 manifest before implementation; MP4 motion but not literal colors/text; EN/VI plus Light/Dark/System through current systems; no locale/theme lifecycle/timeline/request restart; abstract personalization without generated places/fake provider data; separate generation/persistence with retained retry semantics and real persistence success gate; and Android four-variant/frame-aligned evidence.

Acceptance/runtime progress boxes follow the same evidence rule: leave unchecked until backed by actual audit, implementation, automated test, or Android runtime evidence.

- [ ] Canonical MP4 audited
- [ ] FRAME_MANIFEST completed
- [ ] EN verified
- [ ] VI verified
- [ ] Light verified
- [ ] Dark verified
- [ ] System theme verified
- [ ] Reduced motion verified
- [ ] Android runtime verified
- [ ] Full quality gates completed
Stop and report if video metadata changes, canonical MP4/current React Native UI conflict needs product decision, a dependency lacks approval, runtime would autoplay/rasterize/hardcode the MP4, exact generated places or fake data are needed, locale/theme cannot preserve in-flight state, or Android capture is unavailable. Use `BLOCKED`/`NOT_PROVEN`, never false PASS.

For this branch-baseline task, stop after committing this document and the unchanged canonical MP4. Do not begin `MOTION-T001`, implement animation, modify production source/tests/dependencies, deploy, or push.
