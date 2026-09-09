# Live provider evidence — PASS

Deployment equivalence PASS: see `dev-edge-equivalence.md`. Deployed source `explore-places` v6 is active on DEV project `bvblyrzbkyhcreimuumu`.

The evidence harness `live-smoke.cjs` executed through the production chain:
`CandidateDiscoverySession` → `SupabaseCandidateDiscoveryRepository` → `SupabaseExplorePlacesRepository` → deployed DEV `explore-places` → Google Places API (`searchNearby`).

Normal user authentication: `signInWithPassword` as Sarah operator (hashed owner `5f3942074c2502f3bd72055eaa86caa3ea230f5c8ebdf0369f8ec9e9a067d608`).

### Exact Request Parameters
- Latitude: `13.7437`
- Longitude: `100.4888`
- Radius: `1000` meters
- Category: `attractions`
- Limit: `3`

### Live Candidate Result
Candidate count: **3** (bounded by requested limit 3).

| # | Name | Google Place ID | Latitude | Longitude | Category | Address |
|---|---|---|---|---|---|---|
| 1 | The Grand Palace | `ChIJPzZsMU6Z4jARQUzvk913bCo` | `13.7498558` | `100.4915765` | attractions | Phra Borom Maha Ratchawang, Phra Nakhon, Bangkok 10200, Thailand |
| 2 | The Temple of the Emerald Buddha | `ChIJ5Wl37g6Z4jARiP4itarBPDQ` | `13.7516435` | `100.4927041` | attractions | Na Phra Lan Rd, Khwaeng Phra Borom Maha Ratchawang, Khet Phra Nakhon, Krung Thep Maha Nakhon 10200, Thailand |
| 3 | Pak Khlong Talat | `ChIJL-UmnhyZ4jARuwY-UTadgnI` | `13.7416831` | `100.4963788` | attractions | สน พระราชวัง ปาก คลองตลาด - วัดกัลยาณมิตร, Khwaeng Wang Burapha Phirom, Khet Phra Nakhon, Krung Thep Maha Nakhon 10200, Thailand |

### Contract Verification
- All 3 candidates satisfy:
  - `status = "DISCOVERED"`
  - `review = "REVIEW_REQUIRED"`
  - `provenance.provider = "google-places"`
  - `provenance.boundary = "explore-places"`
  - `provenance.observation = "CLIENT_RECEIVED"`
  - `provenance.receivedAt = "2026-09-09T03:15:36.524Z"` (receipt time only)
- Candidate ranking input generated:
  - `version = "TRIPWISE_CANDIDATE_RANKING_INPUT_V1"`
  - `review = "REVIEW_REQUIRED"`
  - Deterministic sort by `googlePlaceId` (canonical order, not recommendation rank)

### Network and Provider Origin Proof
From `live-network-sanitized.json`:
- Discovery invocation:
  - `POST /functions/v1/explore-places`
  - `status: 200`
  - `requestId: "01a08429-fbe4-733a-87e3-1996a9299eba"`
  - `executionId: "b4ae480e-42cc-4295-8233-a2cf541f6ddb"`
  - duration: ~2.83s (`2026-09-09T03:15:33.689Z` to `2026-09-09T03:15:36.522Z`)

### Call Counts
- **Client Function Request Attempts**: **2** client-side requests started toward `/functions/v1/explore-places` (1 primary discovery attempt + 1 cancellation attempt).
- **Confirmed Edge Server Executions**: **1** (primary request confirmed via HTTP 200, Supabase Request ID `01a08429-fbe4-733a-87e3-1996a9299eba`, Deno Execution ID `b4ae480e-42cc-4295-8233-a2cf541f6ddb`).
- **Cancellation Edge Execution**: **UNKNOWN / NOT PROVEN** (client aborted immediately before response/headers; no server receipt or execution telemetry proven).
- **Confirmed Google Provider Requests**: **at least 1** (`>= 1`, directly proven by real Google Places identities, coordinates, and formatted addresses in primary response).
- **Exact Total Google Provider Requests across primary + cancellation**: **UNKNOWN** (acceptable evidence classification; cannot be claimed as exactly 1 because cancellation server receipt is not proven).
- **Management Plane Calls**: **1** CLI call (`supabase functions list`, exit 0; not part of candidate smoke calls).

Evidence: `live-smoke-sanitized-response.json`, `live-network-sanitized.json`, `live-smoke-request.json`.

