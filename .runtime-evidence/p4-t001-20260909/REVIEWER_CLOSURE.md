# FEATURE-P4-T001 / S001 — Closure assessment

## Status: INSUFFICIENT_EVIDENCE

`INSUFFICIENT_EVIDENCE — LIVE CANDIDATE PROVIDER SMOKE`

Local contract implementation and automated gates are complete as recorded below. Authenticated Android debugger inspection timed out twice; no live candidate request, real normalized Google result or owner-data before/after comparison was obtained. T001/S001 must remain unchecked. No deployment was performed; local Edge hardening is not claimed to match the deployed function.

## Exact source/document files changed in this task

Created:

1. `mobile/src/integration/candidateDiscoveryContract.ts`
2. `mobile/src/integration/candidateDiscoverySession.ts`
3. `mobile/src/integration/remote/supabaseCandidateDiscoveryRepository.ts`
4. `mobile/tests/candidate-discovery.test.ts`
5. `supabase/functions/explore-places/boundedJson.ts`
6. `supabase/functions/explore-places/bounds_test.ts`
7. `docs/05-engineering/candidate-discovery-contract.md`

Modified:

8. `supabase/functions/explore-places/googlePlaces.ts` — byte/string/type/count/duplicate bounds, pre/post abort checks, reject redirects; unchanged provider field mask/category mapping.
9. `supabase/functions/explore-places/handler.ts` — actual request bytes, cancellation and requested count checks; unchanged endpoint/DTO/auth dependencies.
10. `phase_doc/PHASES_FEATURES.md` — only stale duplicate P3-T005/S001/Android checkbox correction and T001 assessment note. Accepted P3 semantics/evidence unchanged.

Evidence files created only under `.runtime-evidence/p4-t001-20260909/`; `files-created.txt` enumerates them. No files deleted. No migration created; no persistence table/cache; no new endpoint. Existing endpoint affected locally: `/functions/v1/explore-places` validation hardening. No Git reset/restore/checkout/clean/stash/discard/commit/push.

## Contract and architecture

Exact DTOs and lifecycle instructions are in `docs/05-engineering/candidate-discovery-contract.md` and canonical TypeScript in `candidateDiscoveryContract.ts`.

- Request: `{ center: Coordinate, radiusMeters: number, category: ExploreCategory, limit: number }`; limit required 1..12, radius 100..5000, finite/ranged coordinates, strict whitelist.
- Candidate: `{ kind: 'google-place-candidate', status: 'DISCOVERED', review: 'REVIEW_REQUIRED', googlePlaceId, name, coordinate, category, address?, rating?, userRatingCount?, provenance }`.
- Provenance: `{ provider: 'google-places', boundary: 'explore-places', observation: 'CLIENT_RECEIVED', receivedAt: canonical ISO UTC string }`. Receipt time is not Google fact update time, live-hours freshness or TTL. Ratings remain optional; unchanged field mask normally omits them.
- Ranking input: `{ version: 'TRIPWISE_CANDIDATE_RANKING_INPUT_V1', review: 'REVIEW_REQUIRED', candidates, context: { origin, preferredCategories } }`; ≤12 unique candidates, ≤5 category inputs. Pure validation/copy/canonical ordering, no scoring/selection/Gemini/raw JSON.
- Dedicated candidate repository reuses `SupabaseExplorePlacesRepository` only as validated normalized transport. No Explore UI/hook modifications; no rename of Explore into a generation pipeline. Callable contract is available for future orchestrator; no candidate production screen is wired.
- Ephemeral session coalesces identical in-flight requests, rejects superseded results, supports cancel/dispose, stores no completed results. Repository aborts on session transitions and removes subscriptions/listeners after completion. Future UI must dispose/purge on unmount/auth changes.

## Security and performance

VERIFIED FROM SOURCE / VERIFIED FROM TEST EVIDENCE:

- Existing `createSupabaseContext(request, { auth: 'user' })` remains the JWT boundary. No tripId/user-owned context accepted, no authorization bypass or new owner query. No service-role introduced.
- Google key remains server-side. Fixed Google endpoint, allowlisted categories/types, redirect rejection; arbitrary URLs/unknown inputs rejected. Safe error envelopes/mappers; no raw secret/provider errors returned.
- Actual request bytes ≤2048; provider response ≤32768; results ≤12 and requested limit. ID ≤200/name ≤200/address ≤500, types ≤50 ×100 characters; safe integer count and rating 0..5. Duplicate Google identities fail closed.
- One attempt per transport/provider request; no page loops, radius expansion, fan-out or persistence. 10s mobile / default 8s provider timeout. Duplicate request test at actual repository transport proves one invoke. Cancellation/error tests prove no retry amplification.
- Existing Explore 400ms debounce/camera guards unchanged. Candidate has no camera-driven surface. No numeric latency or large-scale quota capacity improvement is claimed. Existing Google quota/cost and lack of new distributed per-user rate limiter remain operational constraints; T004 final cache policy was not implemented.

## No-persistence proof

`no-persistence-source-audit.txt`: zero mutation/owner-table/service-role matches in the candidate repository, reused transport and complete local Edge path. No `resolve-place`, `from`, `rpc`, insert/update/delete/upsert calls in those files. No trips/itinerary_days/itinerary_items/saved_places/trip_expenses writes. The Edge production dependencies are authentication and provider discovery only.

`candidate-discovery.test.ts`: client mutation traps for from/rpc/storage remain unused for success/cancellation/provider-error paths; only the discovery function is invoked. Candidates remain DISCOVERED/REVIEW_REQUIRED; no acceptance or persistence command exists. This is source/automated proof. Live database before/after proof is NOT RUN, not substituted by tests.

## Fresh automated gates and actual exit codes

| Command | Output | Result | Exit |
|---|---|---|---:|
| `cd mobile; npm run lint` | `lint-final.txt` | 0 errors, 11 existing warnings | 0 |
| `cd mobile; npm run typecheck` | `typecheck-final.txt` | PASS | 0 |
| `cd mobile; npm test -- --runInBand candidate-discovery.test.ts` | `focused-final.txt` | 52 tests PASS | 0 |
| `cd mobile; npm test -- --runInBand` | `full-jest-final.txt` | 77 suites PASS, 1 skipped; 892 tests PASS, 1 skipped | 0 |
| `cd mobile; npx expo-doctor` first sandbox attempt | `expo-doctor.txt` | npm EACCES; dependency checks did not execute | 1 |
| `cd mobile; npx expo-doctor` network-enabled retry | `expo-doctor-retry.txt` | 20/21; patch mismatch | 1 |
| `deno check supabase/functions/explore-places/index.ts` | `deno-check.txt` | PASS | 0 |
| `deno lint supabase/functions/explore-places/` | `deno-lint.txt` | 11 files checked | 0 |
| `deno test --allow-env supabase/functions/explore-places/` | `deno-test.txt` | 41 tests PASS | 0 |
| `git diff --check` | `diff-check.txt` | PASS; line-ending notices only | 0 |

All raw outputs and separate exit-code files are retained; earlier successful mobile run before the final small refactor is retained separately, not relabeled as final.

Expo Doctor exact current mismatch:

| Package | Expected | Found |
|---|---|---|
| expo | ~57.0.21 | 57.0.18 |
| expo-asset | ~57.0.16 | 57.0.15 |
| expo-dev-client | ~57.0.18 | 57.0.16 |
| expo-font | ~57.0.3 | 57.0.2 |
| expo-secure-store | ~57.0.3 | 57.0.2 |

The same five installed versions were recorded by accepted P3 evidence; the expected expo patch advanced from ~57.0.20 to ~57.0.21. No dependency files were changed. This is exit 1, not PASS; no new reviewer acceptance of the advanced expectation is implied.

## Runtime and roadmap

`runtime-attempts.md` records connected emulator, debugger target and two CDP_TIMEOUT results. No manually injected IDs, fake candidates, user mutations, credential reset or new account. Android candidate UI verification is NOT RUN (T005 owns UI). Live candidate provider smoke and live cancellation are INSUFFICIENT_EVIDENCE.

Accepted P3 closure file SHA256 remains identical (`accepted-evidence-integrity.txt`). Existing local changes remain present in worktree snapshots.

- `[x] FEATURE-P3`, both T005 registry entries, S001 and accepted Android evidence.
- `[ ] FEATURE-P4`.
- `[ ] FEATURE-P4-T001` and `[ ] FEATURE-P4-T001-S001`.
- `[ ] Query có giới hạn, cancellation và không auto-persist PASS` — automated checks pass, required live closure still missing.
- T002–T005, P5 and motion not started/resumed.

Next bounded action: obtain authenticated current candidate provider smoke and owner-data before/after evidence for T001 only, with deployed/local Edge source equivalence reviewed before claiming closure. No automatic next phase.

`FEATURE-P4-T002 NOT STARTED`

`CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`
