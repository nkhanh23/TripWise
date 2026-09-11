# FEATURE-P5-T003 — Weather scheduling policy

## Existing source and ownership

Current SavedTripItem / WorkspaceItemPatch have flexibility, priority and verified place coordinates, but no outdoor/indoor or weather-sensitivity field. GeneratedTrip/PlannerGeneratedPreview lack canonical protected-item identity and verified coordinates. Therefore T003 exports an opt-in proposal boundary for validated canonical schedules and explicit caller preferences; it does not wire inferred preferences into generation, modify Trip Detail, add persistence metadata or implement P5-T004 refresh.

Existing path remains WeatherRepository -> OpenMeteoWeatherRepository -> validated transport -> WeatherForecast/DailyWeather. Trip Detail still uses its first VERIFIED coordinate for an informational badge. That heuristic is not reused for scheduling across different locations.

## Explicit policy input

ExplicitWeatherPreference requires itemId, source=user_explicit, sensitivity=avoid_precipitation, and allowedDayNumbers. Callers must collect explicit user intent; these fields must never be inferred from name, category, provider title, Gemini, or coordinates. No preference means no_weather_sensitive_items and zero fetch. At most 20 preferences, unique existing item IDs, and at most 16 unique existing target day numbers per preference. The interface is transient and testable, not a fabricated provider classification.

## Product rule

TripWise-owned constants: HIGH_PRECIPITATION_PERCENT=60 (inclusive), LOW_PRECIPITATION_PERCENT=30 (exclusive). There was no current numeric product threshold in the inspected contracts/decisions. These values define this narrow T003 product policy; Open-Meteo supplies probabilities and does not recommend these move thresholds.

For an explicitly sensitive, untimed, flexible, scheduled activity on a day with probability >=60%, choose a caller-permitted date with probability <30%. Choose lowest probability, then lowest canonical dayNumber. Append the item to that day and recompute contiguous positions. Process preferences by ordinal item ID comparison; never locale strings or random ordering. All target choices use weather at that activity's same verified location. This is a weather preference proposal, not a claim of complete route/time feasibility.

FIXED items always win; high precipitation returns protected_constraint_conflict and the complete baseline. Moving a flexible item may not shift any FIXED anchor; T001 validates each candidate and final proposal. All items, including MUST_DO and their priorities, are retained. Timed, transport, accommodation, reservation or completed/skipped activities return no_change/timed_or_bound_activity rather than date reinterpretation. A blocked candidate discards the proposal and retains the original baseline. No route scoring is duplicated; T002 may evaluate the returned canonical proposal independently, but weather never depends on OSRM success.

WMO code and temperature remain informational. Null WMO code does not mean sunny and is irrelevant to this precipitation-only rule. No UI label is parsed. No arbitrary hot/cold rule.

## Calendar and location contract

Caller supplies localToday as the current YYYY-MM-DD calendar date at the verified forecast location. It is not device-local or UTC today. Pure policy has no hidden clock. Gregorian calendar ordinal arithmetic validates dates and horizon without timestamps, Z suffixes or timezone conversion. All itinerary dates must be valid, unique and in the inclusive 1..16-day window; any missing/outside date produces explicit incomplete/out-of-horizon classification before network. Forecast facts join by exact YYYY-MM-DD only, independent of provider array ordering. Relevant source/allowed-target dates must all have known probabilities; duplicates, missing dates, null or invalid probabilities preserve baseline.

Scheduling supports one exact verified coordinate shared by every explicitly sensitive item. It validates resolution=VERIFIED and finite WGS84 bounds. It never invents (0,0), rounds coordinates, clusters nearby points or assumes a city forecast covers distant activities. Different sensitive coordinates return location_unavailable/multiple_locations with zero requests. Unsensitive items receive no weather classification. Direct pure-policy facts carry an exact coordinate envelope; the fetch layer binds that envelope to its validated request. This conservative single-location policy is an intentional limitation, not a general geographic coverage claim.

## Optional fetch, cancellation and side effects

One logical forecast request maximum, forecastDays <=16, no request per item, no cache or new provider. OpenMeteoWeatherRepository has opt-in usage=scheduling (one attempt, 8-second timeout). Its default trip_detail behavior is unchanged (two attempts, 8 seconds/attempt, existing optional null fallback). Trusted origin and normalized response boundary are unchanged. Logical request count is distinct from HTTP attempts; injected repositories can have different internal policies. Default T003 construction selects scheduling usage.

Network/timeout/429/provider unavailable/null/invalid weather preserve the valid baseline and return machine-readable fallback. Sanitized provider_failure does not guess the reason behind repository null. Pre-cancellation: zero request. In-flight abort races the repository, including transports that ignore signals; late success cannot produce an applied result. Caller-scoped createWeatherSchedulingEvaluator aborts prior evaluations. Consumers must ignore cancelled results; no result is committed by this module.

T001 validation precedes any T003 projection of raw itinerary. Rejected oversized input has schedule=null, status=invalid_input, zero requests and no repair. Valid fallback schedules preserve canonical item data. No database, Edge, RPC, saved_places, trip replacement, refresh/version, UI change, or automatic persistence.

## Evidence

Focused: mobile/tests/weather-scheduling.test.ts (controlled policy/transport fixtures only).
Real smoke: mobile/tests/weather-scheduling.live-smoke.ts, manually invoked with explicit location-local dates; schedule and sensitivity are test-only, weather is real. Coordinate provenance comes from prior accepted real Google Places evidence; no assertion of inherent outdoor status. REAL OPEN-METEO SUCCESS and CONTROLLED FAILURE/FALLBACK EVIDENCE are recorded separately under .runtime-evidence/p5-t003-weather-scheduling-20260910/.

FEATURE-P5-T004 NOT STARTED.

## Reservation-safety corrective (2026-09-11)

Canonical contact.reservationCode (WorkspaceContactPatch / SavedTripItem) is user-owned confirmed/bound metadata for T003. A non-empty canonical code blocks weather rescheduling with no_change/timed_or_bound_activity. Its original day, position, priority and metadata remain intact, including when moving another activity would shift its slot. The contact object is copied into the evaluation snapshot before awaiting weather.

Canonical nullable-string semantics apply: absent/null code does not add a reservation restriction; empty/whitespace-only or over-128-trimmed-character values are invalid_input, matching workspace validation, and are not silently erased. No persisted booking state is invented.

contact.bookingUrl or a sourceLinks entry of type booking alone is only a link, not proof of completed reservation. They do not create a weather restriction. Existing time, transport, accommodation, reservation-kind, completed/skipped and FIXED protections remain. A separate movable sensitive activity can still require the single forecast request; reservation metadata is not a global zero-call shortcut. Existing atomic baseline fallback remains when a sensitive bound activity prevents the proposal.
