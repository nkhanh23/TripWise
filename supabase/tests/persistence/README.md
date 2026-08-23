# Supabase persistence verification

This suite validates BE-P4 against isolated PostgreSQL/PostGIS databases. It never uses production data.

Run on Windows with Docker Engine available:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1
```

The runner verifies both a fresh migration chain and an upgrade from the BE-P1 schema with legacy rows. It also exercises the authenticated RPC, RLS isolation, stable errors, rollback, graph bounds, sequential idempotency, and concurrent same-key behavior.

## Integration contracts verified

- Production graph creation must call `create_trip_graph(text, jsonb)`. Authenticated direct table writes remain owner-scoped by RLS, but can bypass graph atomicity.
- `GeneratedTrip.title`, destination, dates, day numbers/dates/summaries, item position, place name/query, time, and note can map directly to the persistence graph.
- Generated trip-level `summary` and item `estimatedCost` have no persistence columns and are intentionally omitted. Persistence `estimatedBudget`/`currency` must come from trusted request metadata because they are not GeneratedTrip output fields.
- Graph creation accepts only suggestion/scheduling fields; client-supplied Google ID, address, category, or coordinates are rejected as `TW001`.
- `place_resolved_at` is the protected provenance marker. Only the service-role-only snapshot RPC may create or refresh a verified snapshot atomically; legacy provider-looking rows with a null marker remain untrusted.

Remote smoke verification is deliberately separate because it requires an authenticated linked Supabase project and disposable test users. Never put tokens or service-role keys in this suite.

After explicit authorization to mutate the linked remote project, run:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/remote-smoke.ps1
```

The remote runner obtains linked-project keys at runtime without printing or persisting them. The service-role key is used only to create and delete two disposable Auth users; every persistence, query, RLS, error, direct-write, and concurrency check uses those users' normal authenticated sessions.
