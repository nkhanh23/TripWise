# FEATURE-P4-T001 — Candidate discovery / ranking input

Status: implemented locally; closure pending live provider evidence. T002–T005 are out of scope.

## Boundary

Future screen/hook/orchestrator → `CandidateDiscoverySession` → `CandidateDiscoveryRepository`
→ `SupabaseCandidateDiscoveryRepository` → existing `SupabaseExplorePlacesRepository`
→ validated `explore-places` transport → authenticated Edge Function → fixed Google Nearby Search.

This reuses the normalized discovery transport, not Explore screen state. Explore is still only the existing Explore runtime, not a generation candidate pipeline. No UI, planner wiring, acceptance operation, or persistence has been added. Consumers import the dedicated modules directly; T005 owns the visual surface and must dispose the review session on unmount/auth changes and purge displayed results on owner change.

## Canonical DTOs

Source of truth: `mobile/src/integration/candidateDiscoveryContract.ts`.

```ts
type CandidateDiscoveryRequest = {
  center: { latitude: number; longitude: number };
  radiusMeters: number; // finite 100..5000
  category: 'all' | 'attractions' | 'restaurants' | 'hotels' | 'coffee' | 'shopping';
  limit: number; // required integer 1..12
};

type DiscoveryCandidate = {
  kind: 'google-place-candidate';
  status: 'DISCOVERED';
  review: 'REVIEW_REQUIRED';
  googlePlaceId: GooglePlaceId;
  name: string;
  coordinate: { latitude: number; longitude: number };
  category: 'attractions' | 'restaurants' | 'hotels' | 'coffee' | 'shopping';
  address?: string;
  rating?: number;
  userRatingCount?: number;
  provenance: {
    provider: 'google-places';
    boundary: 'explore-places';
    observation: 'CLIENT_RECEIVED';
    receivedAt: string; // canonical ISO UTC milliseconds
  };
};

type CandidateRankingInput = {
  version: 'TRIPWISE_CANDIDATE_RANKING_INPUT_V1';
  review: 'REVIEW_REQUIRED';
  candidates: DiscoveryCandidate[]; // 0..12, unique Google IDs
  context: {
    origin: { latitude: number; longitude: number };
    preferredCategories: CandidateCategory[]; // at most 5 inputs
  };
};
```

`mapCandidateRankingInput` validates both arguments, copies them, sorts candidates by identity using code-unit comparison and canonicalizes/deduplicates category preferences. This ordering is not a score or selection. Same validated inputs produce identical output; the mapper has no clock/network/Gemini dependency. The origin/preferences are explicit caller context, not provider facts. No tripId, budget, route, inferred travel duration or unavailable preferences are introduced.

`receivedAt` is the mobile observation of receipt, NOT a Google publication/update timestamp or proof of current opening hours. Device-clock correctness is not guaranteed. T004 owns TTL/expiry/invalidation. There is no result cache, disk storage, stale fallback, or authoritative freshness label. Provider category is the existing server normalization of Google types. Category labels are not copied into candidates.

Optional rating/count fields are accepted only when actually supplied by the validated provider boundary. The unchanged Google field mask does not request ratings/counts; normally these fields are absent. No extra request/SKU was introduced to populate them. Empty results and absent metadata stay empty/absent. Private TripWise reviews are never combined with Google metadata.

Type/format validation does not cryptographically establish provenance. Production candidates must originate from this repository's authenticated provider path; user-authored text, Gemini text and unresolved place queries must not be passed off as provider candidates. A candidate is not an itinerary `VERIFIED` snapshot. Existing protected resolution/persistence contracts remain separate, and the candidate type is not a persistence command.

## Hard limits and reliability

- Coordinate numbers must be finite and within latitude ±90 / longitude ±180.
- Request whitelist: center/radiusMeters/category/limit only; center latitude/longitude only. No URLs, query strings, arbitrary Google types, userId or tripId.
- Edge request body: actual UTF-8 bytes ≤2048, even without truthful Content-Length.
- Google response body: actual bytes ≤32768; no redirects. Response count ≤12 and ≤requested limit; duplicate IDs fail closed.
- ID: `[A-Za-z0-9_-]{10,200}`; name ≤200 characters and nonblank; address ≤500; normalized label ≤80 at existing mobile boundary; rating finite 0..5; count nonnegative safe integer.
- Provider type arrays ≤50, each type/primaryType ≤100 characters. Raw extra provider fields are scrubbed; extra transport/candidate fields are rejected.
- One Google request per accepted discovery, no pagination loop/radius expansion/retry. Fixed field mask and existing category mapping remain unchanged.
- Mobile transport timeout 10s/one attempt; provider default timeout 8s (existing configured range 1–15s). Abort propagates to transport/provider. Pre-abort avoids a provider call; late results are rejected.
- `CandidateDiscoverySession` owns at most one in-flight operation, coalesces equivalent requests, cancels superseded work and exposes cancel/dispose. No retained completed results. Repository invalidates in-flight work on session transitions; token refresh alone is not an owner change.
- No map wiring: existing Explore 400ms debounce and camera guards remain unchanged. Future map-driven candidate wiring must retain those protections. No measured latency improvement is claimed.

## Security / no persistence

The Edge entrypoint uses existing `createSupabaseContext(..., { auth: 'user' })`. No owner-owned context is accepted, so no trip lookup or new ownership rule is needed. Google server secret remains `GOOGLE_PLACES_API_KEY` server-side; the origin is fixed to Google `places:searchNearby`. No service-role or database client is introduced. Typed errors are mapped to sanitized envelopes/messages; raw provider bodies/errors are not returned.

The candidate repository calls only `functions.invoke('explore-places')` via existing transport and uses an auth lifecycle subscription. It never invokes `resolve-place`, saved-place operations, RPC, table writes, storage writes or planner persistence. Edge dependencies are authenticate/discover only, and its production implementation performs only authentication and Google fetch. There are zero insert/update/delete/upsert calls on trips, itinerary_days, itinerary_items, saved_places or trip_expenses. No migration/table/cache has been created.

Automated mutation spies fail on `from`/`rpc`/storage access and prove zero mutations for discovery and cancellation/error scenarios. Edge source audit supplements those tests. Live before/after owner-data equality remains unproven until authenticated smoke is available; source/tests are not substituted for that evidence.

## Current verification boundary

Evidence: `.runtime-evidence/p4-t001-20260909/REVIEWER_CLOSURE.md` and raw gate outputs alongside it. Local Edge hardening is not deployed in this task; deployed-source equivalence is not claimed. No final P4 UI or full generation candidate pipeline completion is claimed.

Official references consulted: [Google Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search), [Supabase authenticated functions](https://supabase.com/docs/guides/functions/auth). Existing pinned implementation conventions were retained.

`FEATURE-P4-T002 NOT STARTED`

`CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`
