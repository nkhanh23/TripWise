# Supabase Backend Operations Runbook

Date: 2026-08-20

## Active production surface

- Supabase Auth and profile trigger.
- PostgreSQL/RLS tables: `profiles`, `trips`, `itinerary_days`,
  `itinerary_items`.
- Public authenticated RPCs: `create_trip_graph`, `list_saved_trips`,
  `get_saved_trip_detail`, `update_itinerary_item_note`, `delete_saved_trip`.
- Edge Functions: `generate-trip`, `resolve-place`; both require JWTs.
- Private writer: `apply_verified_place_snapshot`, executable only by
  `service_role` and called only by `resolve-place`.

OSRM and Open-Meteo are public direct-client providers. The backend owns no
generic route/weather proxy, cache, or persisted weather/route snapshot.

## Secret setup

Set secrets in Supabase, never in committed files or mobile configuration:

```powershell
npx --yes supabase secrets set GEMINI_API_KEY=<value>
npx --yes supabase secrets set GOOGLE_PLACES_API_KEY=<value>
npx --yes supabase secrets set GEMINI_MODEL=gemini-3.5-flash-lite
npx --yes supabase secrets set GEMINI_TIMEOUT_MS=25000
npx --yes supabase secrets set GOOGLE_PLACES_TIMEOUT_MS=8000
```

List names without printing values:

```powershell
npx --yes supabase secrets list --output json |
  ConvertFrom-Json |
  Select-Object -ExpandProperty name
```

The Google key must be a server credential authorized for Places API (New),
including `places:searchText`, with billing/API enablement configured. Never
reuse it as a React Native Maps SDK key.

## Migration deployment

Migrations are forward-only. Never edit an applied migration, reset remote, or
repair history without evidence.

```powershell
npx --yes supabase migration list
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1
npx --yes supabase db push
npx --yes supabase migration list
```

Compare local and remote columns before `db push`. A failed production change
is rolled back with a new corrective migration. Destructive rollback requires
an explicit data-impact review and backup; never use a remote reset.

## Edge Function deployment

Run focused checks first, then deploy with repository JWT configuration:

```powershell
npx --yes deno check supabase/functions/generate-trip/index.ts
npx --yes deno lint supabase/functions/generate-trip
npx --yes deno test supabase/functions/generate-trip/*_test.ts
npx --yes deno check supabase/functions/resolve-place/index.ts
npx --yes deno lint supabase/functions/resolve-place
npx --yes deno test supabase/functions/resolve-place/*_test.ts
npx --yes supabase functions deploy generate-trip
npx --yes supabase functions deploy resolve-place
npx --yes supabase functions list
```

Confirm both functions are active and JWT verification is enabled. Roll back a
bad deployment by fixing/reverting source in a reviewable change and deploying
a new function version; do not weaken JWT checks.

## Safe smoke and cleanup

Automated remote smoke:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/remote-smoke.ps1
```

The script creates unique disposable Auth users, uses ordinary user JWTs for
all behavior assertions, and uses service role only for exact Auth user
lifecycle. Its `finally` block deletes only recorded test-user IDs and verifies
cascade cleanup. Do not log the generated passwords, JWTs, anon key, or service
key.

For live Google verification, use an unresolved disposable item such as
`Wat Arun, Bangkok`, call `resolve-place` as its authenticated owner, verify the
canonical ID/coordinates/provenance through normal RLS, refresh once, then
delete the exact disposable user. The 2026-08-20 closure completed this flow
with `LIVE PROVIDER PASS`. If the secret is removed in a future environment,
record the missing-secret blocker rather than substituting mock evidence.

For Gemini, call `generate-trip` with a short future trip and compare trip/day
counts before and after. A generation request must produce structured output
and zero database writes.

## Monitoring and incident checks

Monitor function latency/status counts, provider 401/403/429/5xx rates,
database RPC latency, and provider spend. Never log raw authorization headers,
keys, provider payloads, or secret-bearing URLs. Keep stable public error codes
and attach correlation identifiers only if they contain no user secret.

On provider degradation, keep persistence/query/mutation available. A place
refresh error must retain the last-known verified snapshot. Do not convert
provider errors into fabricated place, route, or weather data.

## Integration prerequisites

- Frontend must finish independently before Integration starts.
- Integration must use authenticated RPCs and Edge Functions; it must not send
  `user_id`, provider snapshots, Google IDs, or coordinates for certification.
- Treat provider fields as verified only when the backend detail DTO reports a
  verified resolution/provenance marker.
- OSRM/Open-Meteo remain fixed-origin direct-client contracts documented in
  `public-provider-ownership-contract.md`.
- Google live smoke remains a separate release prerequisite while
  `GOOGLE_PLACES_API_KEY` is absent.
