# TripWise Place Identity Contract

**Roadmap owner:** BE-P5 — Place Identity & Enrichment Boundary
**Contract task:** BE-P5-T001
**Status:** APPROVED

## 1. Scope and decision

This contract defines when an itinerary item is only an AI suggestion and when it is a verified place snapshot. It does not configure or call Google Places.

TripWise uses a **Google-specific MVP identity**:

```text
google_place_id
```

Provider-neutral `place_provider/provider_place_id` columns are not added. Google Places is the only provider in the active BE-P5 roadmap, so a multi-provider abstraction has no current product evidence.

The canonical lifecycle is:

```text
Gemini suggestion
    → persist UNRESOLVED item
    → server-side Google Places resolution
    → persist VERIFIED snapshot through a protected enrichment boundary
```

Field presence or syntactic validity alone never proves verification. Trust comes from the protected server-side write path.

## 2. Current schema and write-boundary audit

| Column | Current storage | Nullable | Current authenticated caller can write? | Current trust semantic | Future owner/change |
|---|---|---:|---:|---|---|
| `place_name` | `text` | No | Yes, graph RPC and direct table write | AI/client suggestion only unless replaced by resolver | Creation accepts suggestion; resolver replaces with provider canonical name |
| `place_query` | `text` | Yes | Yes | Search hint only; never identity | Creation may write; resolver may retain for diagnostics/re-resolution |
| `google_place_id` | `text` | Yes | Yes | Untrusted today when caller supplied | T003: only trusted enrichment boundary may set it |
| `latitude` | `double precision` | Yes | Yes | Range-checked but provenance-untrusted today | T003: creation persists `NULL`; resolver sets verified pair |
| `longitude` | `double precision` | Yes | Yes | Range-checked but provenance-untrusted today | T003: creation persists `NULL`; resolver sets verified pair |
| `place_address` | `text` | Yes | Yes | Untrusted snapshot text today | T003: optional provider-formatted address |
| `place_category` | `text` | Yes | Yes | Untrusted free text today | T003: optional TripWise-normalized category derived from provider types |
| `start_time` / `end_time` | `time` | Yes | Yes | User/itinerary scheduling data | Remains creation/user-owned |
| `note` | `text` | Yes | Yes | User/AI descriptive data | Remains creation/user-owned |

Current evidence:

- BE-P3 output allow-list contains only `position`, `placeName`, `placeQuery`, times, note and non-authoritative `estimatedCost`.
- BE-P4 `create_trip_graph(text, jsonb)` accepts `googlePlaceId`, coordinates, address and category and copies them into `itinerary_items`.
- Authenticated table grants also allow direct item insert/update under owner RLS.
- The coordinate-pair CHECK proves only `NULL/NULL` or non-null/non-null and valid ranges. It does not prove source or provider verification.

Therefore an authenticated caller can currently create a resolved-looking but unverified item. Database consumers must not infer VERIFIED from current snapshot columns until T003 hardening is applied.

## 3. Trust-source matrix

| Field | Gemini may suggest | Client may submit to creation | Provider must verify | Trusted only after |
|---|---:|---:|---:|---|
| `place_name` | Yes | Yes | Canonical name confirmed/replaced | Protected resolver update for canonical meaning |
| `place_query` | Yes | Yes | No | Never identity; remains a hint |
| `google_place_id` | No trusted value | No in corrected creation contract | Yes | Protected server-side resolution |
| `latitude` | No trusted value | No in corrected creation contract | Yes | Protected server-side resolution |
| `longitude` | No trusted value | No in corrected creation contract | Yes | Protected server-side resolution |
| `place_address` | No trusted value | No in corrected creation contract | Yes, optional | Protected server-side resolution |
| `place_category` | No trusted value | No in corrected creation contract | Provider types plus backend normalization | Protected server-side resolution |
| `start_time` / `end_time` | Yes | Yes | No | Validated itinerary input |
| `note` | Yes | Yes | No | Validated itinerary input; not place fact |

`estimatedCost` remains non-authoritative and is not persisted by the current graph contract.

## 4. UNRESOLVED contract

An item is UNRESOLVED when provider verification has not completed.

Required/allowed state:

```text
place_name: required AI/client suggestion
place_query: optional search hint
google_place_id: NULL
latitude: NULL
longitude: NULL
place_address: NULL
place_category: NULL
```

Scheduling and note fields may still be present. The item may be displayed as suggestion text, but it must not produce a map marker, OSRM route point or verified-place claim.

`google_place_id IS NULL` alone is not the conceptual definition. UNRESOLVED means the trusted resolver has not committed a verified snapshot, and all provider-owned fields remain null under the corrected write contract.

## 5. VERIFIED contract

An item is VERIFIED only after a trusted server-side resolver has selected and confirmed a Google Places result and atomically persisted the snapshot.

Minimum verified snapshot:

```text
google_place_id: non-blank provider identity
place_name: provider canonical name
latitude: provider coordinate in [-90, 90]
longitude: provider coordinate in [-180, 180]
```

Optional snapshot fields:

```text
place_address: provider-formatted address
place_category: TripWise-normalized category derived from provider types
```

Verification additionally requires trusted write provenance. A format-looking ID and valid coordinate pair supplied by Gemini/mobile are not VERIFIED.

No rating, review count, photo URL, opening hours or route geometry is part of this snapshot contract.

## 6. Resolution marker/status decision

No `place_resolution_status` enum is introduced in T001. `resolving`, `failed` and `ambiguous` are transient operation outcomes, not persisted item states required by the current product.

T003 must decide and implement a minimal protected provenance/freshness marker such as `place_resolved_at timestamptz` together with write restrictions. This is not a multi-state workflow enum. It has concrete value for:

- distinguishing pre-hardening/untrusted legacy snapshots;
- recording when the verified snapshot was obtained;
- safe refresh and stale-snapshot decisions later.

Until that protected marker and write boundary exist, current provider-looking rows are not automatically trusted.

## 7. Legal state transitions

```text
UNRESOLVED → VERIFIED
VERIFIED → VERIFIED_REFRESHED
```

- `UNRESOLVED → VERIFIED` is owned only by the server-side resolver.
- `VERIFIED → VERIFIED_REFRESHED` may refresh canonical name, coordinates, address/category and resolution time using the same protected boundary.
- Provider failure never writes a partial snapshot.
- `VERIFIED → UNRESOLVED` is not automatic. A last known verified snapshot remains usable if a later refresh fails.
- Clearing a verified identity requires a future explicit trusted administrative/server operation with an audited reason; mobile cannot do it implicitly.

## 8. No-match behavior

If Google Places returns no sufficiently confident match:

- keep the item UNRESOLVED;
- persist no provider ID, coordinates, address or category;
- retain suggestion text/query;
- do not fabricate coordinates or choose an unrelated result;
- allow a later retry or future user-assisted selection.

No persistent `resolution_failed` status is required now.

## 9. Ambiguous-match behavior

The first provider result is never automatically considered verified merely because it is first.

T003/T004 resolution logic may auto-resolve only an exact or high-confidence match using bounded evidence such as normalized name, destination/locality and provider result consistency. Multiple plausible results remain UNRESOLVED. Ranking thresholds and error transport belong to later BE-P5 tasks, not T001.

## 10. Name and query semantics

- Before resolution, `place_name` is the AI/client suggestion.
- On verification, the resolver overwrites `place_name` with the provider canonical name.
- No second suggested-name column is added: current product/debug value does not justify duplicate name storage.
- `place_query` may retain the original resolution hint for diagnostics and controlled re-resolution.
- `place_query` is never unique, canonical or provider identity.

## 11. Corrected creation and enrichment boundaries

The approved target contract is:

```text
generate-trip
    → placeName/placeQuery suggestion
create_trip_graph
    → persists suggestion/schedule fields
    → forces all provider-owned fields NULL
server-side Places resolver
    → verifies one confident result
protected enrichment operation
    → atomically writes Google ID + canonical name + coordinate pair
    → optionally writes address + normalized category + resolved_at
```

BE-P5-T003 must implement the correction before any production place-resolution or Integration flow:

1. Remove `googlePlaceId`, coordinates, address and category from the public graph-creation allow-list, or deterministically reject them with `TW001`.
2. Ensure graph creation always stores provider-owned fields as null.
3. Remove ordinary authenticated direct write access to provider-owned columns while preserving owner-scoped creation/user-editable columns and RLS.
4. Add a protected, server-owned enrichment operation; do not expose it to `anon` or arbitrary authenticated direct execution.
5. Add the minimal provenance/freshness marker and invariants needed to distinguish trusted verified snapshots from legacy-looking rows.
6. Define forward-only treatment for pre-hardening rows; do not silently bless them as verified.

T002 only establishes server-side secret/config isolation. It must not expose a provider key or create a client-writable verification path.

## 12. Schema decision for T001

```text
Migration required now: NO
```

T001 is the contract freeze. A partial migration that adds a marker without simultaneously restricting writers would not establish provenance and could make the trust model worse. The forward-only schema/RPC/grant migration belongs to T003, where the verified snapshot and enrichment operation are implemented atomically.

No already-applied BE-P4 migration is modified.

## 13. Integration behavior

UNRESOLVED consumers may:

- display suggestion text;
- communicate unverified location state if product UX requires it;
- request retry/user selection later.

UNRESOLVED consumers must not:

- render a marker from fake/default coordinates;
- calculate OSRM routes;
- display provider identity/address/category as verified.

VERIFIED consumers may render markers, route using verified coordinates and display the canonical snapshot. Mobile implementation remains outside this task and Integration remains NOT STARTED.

## 14. Security and scalability notes

- Current spoof risk severity is **HIGH for data correctness**: an authenticated owner can write syntactically valid provider-looking metadata. RLS prevents cross-user access but does not establish place provenance.
- Provider resolution must be bounded and server-side. Avoid uncontrolled per-render or per-read provider calls.
- A trip may contain up to 84 items; resolver design must allow bounded concurrency/batch orchestration instead of unbounded N+1 external calls.
- Enrichment updates should support set/batch processing and optimistic/conditional updates to avoid concurrent stale overwrites.
- A future lookup index on `google_place_id` is justified only when actual lookup/dedup queries are implemented; do not add it speculatively in T001.
- Cache, quota, timeout and retry policies belong to T004/T005 and require provider/cost evidence.

## 15. BE-P5 implementation record

BE-P5 implements this contract with the JWT-protected `resolve-place` Edge
Function. It calls only Google Places API (New) Text Search at the fixed HTTPS
origin `https://places.googleapis.com/v1/places:searchText`, with a fixed,
minimal field mask for the durable snapshot. `GOOGLE_PLACES_API_KEY` is read
only from the Supabase Edge Function secret environment; it is never a mobile
configuration value or response field.

`place_resolved_at` is the trusted provenance/freshness marker. The
forward-only migration adds an invariant that a non-null marker requires a
non-blank Google ID, canonical name and valid coordinate pair. It does not
bless old provider-looking rows with a null marker. A trigger rejects ordinary
`authenticated`/`anon` attempts to create or change provider-owned columns.
The service-role-only `apply_verified_place_snapshot(...)` RPC checks the
owner supplied by the verified Edge Function JWT and writes the entire snapshot
and marker in one statement.

The resolver uses the persisted `place_name`, optional `place_query`, and trip
destination; clients cannot submit a provider response. A candidate must be a
complete snapshot and the only high-confidence match based on normalized name
plus destination/address or query evidence. No candidate or more than one
candidate leaves the row unchanged.

Google calls have a default 8-second timeout (bounded configuration range
1–15 seconds), one retry only for transport/5xx failure, and stable sanitized
errors. Auth, quota, malformed result, no match and ambiguity are not retried.
No extra Google response cache is used for MVP: the durable snapshot prevents
read-time calls and current personal-app traffic/cost evidence does not justify
another cache layer.
