# Backend Performance Review

Phase 11.3 review focused on common backend paths before frontend integration.

## Scope reviewed

- Itinerary generation flow
- Trip list/detail queries
- Place and hotel city-based lookups
- Existing route/weather cache usage
- PostgreSQL connection pool defaults

## Findings

1. The itinerary generation flow was keeping a top-level transaction open while waiting for route, weather, and Gemini work. That creates avoidable risk of holding database resources during slower external calls.
2. Several high-frequency `IgnoreCase` city queries depended on plain indexes, which PostgreSQL may not use efficiently when Spring Data generates `LOWER(...)` predicates.
3. Trip list queries sorted by `created_at DESC` only had a single-column `user_id` index.
4. Itinerary detail loading already uses fetch joins / entity graphs, so no new N+1 issue was found in the current detail endpoints.

## Changes applied

- Removed the outer transaction from itinerary generation so the long-running orchestration no longer wraps route/weather/AI calls in one database transaction.
- Persisted generated itinerary item descriptions explicitly through the repository, keeping write behavior correct after shrinking transaction scope.
- Added functional/composite indexes for:
  - `places(LOWER(city), is_active, is_verified)`
  - `trips(user_id, created_at DESC)`
  - hotel suggestion queries by city / price / star rating
- Tightened HikariCP settings with explicit `max-lifetime`, `keepalive-time`, and `validation-timeout`.
- Enabled Hibernate `default_batch_fetch_size=50` as a defensive fallback for lazy loading patterns that are not explicitly fetch-joined.

## Remaining notes

- The roadmap target of `<500ms` for common queries was not load-tested in this phase; this review focused on obvious code and schema bottlenecks plus testable configuration improvements.
- If the place dataset grows significantly, `SelectCandidatePlacesUseCase` may need a later phase to move candidate pre-filtering closer to SQL instead of scoring every city match in memory.
