---
name: tripwise-performance
description: Performance optimization, latency reduction, render profiling, and resource efficiency guidelines for TripWise React Native mobile app and network layer. Activates on tasks involving mobile performance, navigation speed, network latency, map rendering, image caching, list virtualization, or re-render profiling.
license: MIT
metadata:
  author: TripWise
  version: 1.0.0
---

# TripWise Mobile & Network Performance Guidelines

This skill governs performance audits, latency reduction, render profiling, and resource efficiency across the TripWise React Native mobile application and its backend network communication.

---

## 1. Core Principles

- **Measurement Over Speculation:** Never claim "performance is improved" based solely on visual inspection of code. Measure with concrete evidence: network waterfall, frame rate (FPS), render counts, or elapsed milliseconds.
- **Correctness Over Micro-Optimization:** Never sacrifice business logic correctness, security, or error handling for minor performance gains.
- **No Indiscriminate Memoization:** Do not wrap every function in `useCallback` or every object in `useMemo`. Memoize only when dependencies are stable and child components are computationally expensive or explicitly memoized with `React.memo`.
- **Zero Security Compromise:** Never weaken authentication checks, RLS policies, or stale-user isolation to create shared in-memory or disk caches.
- **Dependency Discipline:** Do not introduce new third-party libraries solely for hypothetical performance gains.

---

## 2. Network, Latency & Provider Optimization

### Duplicate Requests & Fan-out
- **Debouncing:** Apply a 300–500ms debounce to search bars, destination autocompletes, and map camera movements (`onRegionChangeComplete`).
- **Fan-out Prevention:** Avoid dispatching multiple parallel requests for the same resource. Consolidate concurrent reads.
- **N+1 Avoidance:** In Supabase queries, fetch related entities using relational joins/embedded resources in a single PostgREST call rather than looping over IDs.

### Cancellation & Lifecycles
- **AbortController:** Always wire an `AbortController` signal to in-flight fetch/provider requests. Abort requests when the calling component unmounts or query parameters change.
- **Unmounted State Updates:** Prevent React state updates on unmounted components by tracking active component lifecycle.
- **Race Condition Guarding:** When multiple async operations resolve out of order, ensure stale responses do not overwrite newer user intent.
- **Retry Amplification:** Limit network retries (max 2–3) with exponential backoff and jitter. Never retry 4xx client errors (400, 401, 403, 404).

### Public Providers (OSRM & Open-Meteo)
- **Geometry Caching:** Cache route geometries by coordinate pairs. Do not re-request routes for micro-adjustments on the map.
- **Weather Throttling:** Request weather data once per destination/day; do not re-fetch on minor navigation transitions.

---

## 3. React Render & Navigation Lifecycle

- **Rerender Loops:** Audit custom hook dependencies and `useEffect` dependency arrays for object or array literals created on every render.
- **Derived State:** Compute simple derived values during render without synchronizing state in `useEffect`. Memoize heavy array calculations only when datasets are measurably large.
- **Screen Focus Lifecycle:** In React Navigation, use `useFocusEffect` or `isFocused` to pause background timers, heavy animations, or real-time polling when a screen is blurred.
- **Stable Component Tree:** Never define a React component inside the render body of another component.

---

## 4. Large Lists & Virtualization

- **Use Virtualized Lists:** Always render large collections (places, trips, itinerary items) using `FlatList` or `@shopify/flash-list`.
- **Stable Keys:** Supply a unique, stable `keyExtractor` (e.g. `item.id`). Never use array index as keys for mutable lists.
- **Fixed Dimensions:** Provide `getItemLayout` when list item heights are uniform to skip dynamic measurement.
- **Render Item Stability:**
  - Define `renderItem` as a stable callback outside the render body or wrap with `useCallback`.
  - Pass stable item props or memoize individual list item components with `React.memo`.
  - Avoid inline closures and inline style objects inside `renderItem`.

---

## 5. Map, Camera & Marker Rendering

- **Camera Fetch Throttling:** Never initiate network requests on `onRegionChange`. Bind fetch logic strictly to debounced `onRegionChangeComplete`.
- **Marker Density & Clustering:**
  - Never render hundreds of native markers simultaneously; apply marker clustering when zoomed out.
  - Query places by viewport bounding box (bbox) or radius rather than loading all global records.
- **Marker Optimization:** Set `tracksViewChanges={false}` on custom markers once rendered to prevent continuous re-rendering on Android/iOS.

---

## 6. Images, Memory & Cleanup

- **Native Image Caching:** Utilize native caching mechanisms (e.g. `expo-image`) with appropriate cache policies (`cachePolicy: "disk"`).
- **Memory Pressure:** Request appropriately sized image variants or thumbnails matching the device viewport rather than loading original full-resolution files.
- **Subscription & Listener Cleanup:** Always return cleanup functions from `useEffect` to unsubscribe from Supabase Realtime channels, event listeners, AppState handlers, and intervals.
- **Cache Isolation:** Ensure cached data respects user boundaries; flush user-specific caches on logout.
