# TripWise Backend Roadmap

**Owner / Agent: Codex — Backend**
**Start gate: ACTIVE — BE được phép tiếp tục độc lập, không sửa React Native UI**

## 1. Source of truth và scope

Roadmap này là source of truth cho backend hiện hành:

```text
Supabase Auth
    ↓
Supabase Edge Functions (Deno / TypeScript)
    ↓
Supabase PostgreSQL + Row Level Security
    ↓
Server-side integrations requiring secrets
```

- `backend/` Spring Boot/PostGIS và `docs/08-project-roadmap/phases.md` là historical reference, không phải active backend roadmap.
- Không thêm feature mới vào Java backend.
- Không sửa React Native UI trong BE phases.
- Không bắt đầu FE ↔ BE wiring; việc đó thuộc `PHASES_INTEGRATION.md`.
- Chỉ tick phase/subtask sau khi acceptance criteria và evidence tương ứng đã verify.

## 2. Current status

- **Original Backend Roadmap (BE-P0 → BE-P11):** COMPLETE
- **Post-BE authorized backend extensions:** Implemented under active Integration roadmap (`PHASES_INTEGRATION.md`)
- **Next backend implementation task:** NONE (all current requirements supported)
- **Integration status:** ACTIVE (`PHASES_INTEGRATION.md`)


---

## [x] BE-P0 — Supabase Architecture Foundation

### Scope

- Chốt Supabase PostgreSQL, Auth, RLS và Edge Functions làm backend production.
- Link project thật và apply migrations an toàn.
- Tạo typed/config foundation mà không đưa service-role credential vào client.

### Verified evidence

- Supabase project linked và remote reachable.
- BE-P1 foundation migration đã apply remote.
- `profiles`, `trips`, `itinerary_days`, `itinerary_items` tồn tại.
- Environment/client foundation đã được kiểm tra.

### Acceptance state

- [x] Supabase production architecture selected
- [x] Project link/connectivity verified
- [x] Secret boundary documented
- [x] Legacy Spring Boot frozen as migration source

---

## [x] BE-P1 — PostgreSQL Schema & Row Level Security

### Scope

- Minimal personal-app schema cho profile, trip và itinerary.
- Foreign keys, cascades, constraints và ownership indexes.
- RLS policies theo authenticated owner.

### Verified evidence

- `profiles.id → auth.users.id`
- `trips.user_id → auth.users.id`
- `itinerary_days.trip_id → trips.id`
- `itinerary_items.itinerary_day_id → itinerary_days.id`
- RLS enabled trên cả bốn bảng.
- Ownership policies đã verify trên remote.

### Acceptance state

- [x] Schema migration applied
- [x] Foreign keys/cascades verified
- [x] Profile/trip/day/item ownership policies verified
- [x] No unrestricted public CRUD policy

---

## [x] BE-P2 — Supabase Auth & Profile Foundation

### Scope

- Supabase Email/Password authentication backend boundary.
- Profile creation liên kết `auth.users` với `public.profiles`.
- Session/auth claims làm cơ sở cho RLS.

### Verified evidence

- Real register/login verified.
- `auth.users` record verified.
- Corresponding `profiles` row verified.
- Profile ownership và RLS unchanged/PASS.

### Acceptance state

- [x] Supabase Auth source of truth
- [x] Idempotent profile creation foundation
- [x] Authenticated profile access verified
- [x] No custom JWT/auth backend introduced

---

## [x] BE-P3 — Gemini Trip Generation Edge Function

### Scope

- Authenticated `generate-trip` Supabase Edge Function.
- Server-side Gemini secret and structured itinerary output.
- Input/output validation, normalization, timeout và stable errors.
- Generation-only behavior, không persistence.

### Verified evidence

- Function deployed remote và active.
- `verify_jwt = true`; anonymous calls bị reject.
- `GEMINI_API_KEY` chỉ nằm trong Supabase Secrets.
- Live authenticated Bangkok 2-day generation PASS.
- Gemini REST parser đọc đúng `steps[].content[].text` với compatibility fallback đã test.
- JSON output được schema-validate và normalize.
- Deno check/lint/tests PASS tại thời điểm đóng phase.
- Before/after database verification xác nhận 0 writes.

### Acceptance state

- [x] JWT-protected function
- [x] Secret isolation
- [x] Input validation and bounded request size
- [x] Structured output validation/normalization
- [x] Timeout and stable error contract
- [x] Live authenticated generation
- [x] Zero database writes

> Preserve verified parser/JWT flow. Không rewrite BE-P3 nếu không có bug hoặc provider contract evidence mới.

---

## [x] BE-P4 — Trip Generation Persistence

### Goal

Persist generated trip atomically và safely vào `trips`, `itinerary_days`, `itinerary_items` mà không phụ thuộc React Native UI.

### Subtasks

- [x] **BE-P4-T001 — Persistence contract / coordinate decision**
  - Migration forward-only cho phép unresolved items có `latitude`/`longitude` cùng `NULL` mà không bịa coordinates.
  - Coordinate pair CHECK từ chối trạng thái half-resolved; resolved items có cả hai coordinates hợp lệ.
  - `place_query` nullable giữ hint phục vụ BE-P5 resolution nhưng không được coi là verified metadata.
  - Không thêm status enum; RLS, grants, policies và ownership model không đổi.
- [x] **BE-P4-T002 — Transaction boundary**
  - `create_trip_graph(jsonb)` tạo trip + days + items trong một PostgreSQL statement transaction.
  - Ba set-based INSERT dùng database-generated IDs và rollback toàn graph khi day/item failure.
  - `SECURITY INVOKER`, owner derive từ `auth.uid()`, RLS giữ nguyên; EXECUTE chỉ dành cho `authenticated`.
- [x] **BE-P4-T003 — Ownership and input contract**
  - Owner derive từ `auth.uid()`; owner-like và unknown fields bị reject tại mọi object boundary.
  - Validate required fields, types, date range, contiguous day/item ordering, budget/currency và coordinate ranges trước write.
  - Bound JSONB 256 KiB, 14 days, 6 items/day, 84 total items và string lengths theo persistence contract.
- [x] **BE-P4-T004 — Idempotency and duplicate handling**
  - RPC bắt buộc opaque idempotency key 8–128 ký tự, scoped theo `auth.uid()`; payload identity là SHA-256 của canonical `jsonb::text`.
  - Partial unique index `(user_id, idempotency_key)` chống retry race; same payload trả cùng trip ID, different payload raise deterministic conflict.
  - Idempotency metadata và graph commit/rollback cùng transaction; old non-idempotent RPC signature không còn EXECUTE cho application caller.
- [x] **BE-P4-T005 — Stable persistence errors**
  - Public RPC giữ UUID success contract và map lỗi thành custom SQLSTATE ổn định `TW001`–`TW005` cho validation, unauthenticated, forbidden, conflict và database failure.
  - Safe messages không chứa raw SQL, table/constraint name, DETAIL/HINT, payload hoặc auth data; caller chỉ đọc SQLSTATE code.
  - Wrapper `SECURITY INVOKER` re-raise trong subtransaction nên mọi failure vẫn rollback toàn graph; anon/PUBLIC grants và RLS giữ nguyên.
- [x] **BE-P4-T006 — Persistence tests**
  - Reusable fresh/upgrade PostgreSQL suite PASS cho schema, constraints, atomicity, rollback, ownership/RLS, idempotency, concurrency, stable errors và boundaries.
  - Remote migrations `20260819020000`–`20260819060000` đã apply; remote history khớp local và actual schema/RLS/grants/function contract đã verify.
  - Authenticated Supabase RPC/PostgREST smoke PASS cho persisted graph, cross-user isolation, retry/conflict, TW001/TW004, anonymous/invalid JWT, concurrency và exact test-data cleanup.

### Done when

- Contract coordinate/place identity đã chốt bằng ADR/note hoặc migration reviewed.
- One authenticated operation persist toàn graph atomically.
- Retry không tạo duplicate.
- RLS không bị bypass/weaken.
- Automated tests và safe live verification PASS.

---

## [x] BE-P5 — Place Identity & Enrichment Boundary

### Goal

Định nghĩa server-side boundary cho Google Places nếu secret/server restrictions yêu cầu, và tạo verified place snapshot cho persistence/map.

### Subtasks

- [x] **BE-P5-T001:** Contract cho unresolved AI suggestion → verified place identity.
- [x] **BE-P5-T002:** Server-side Places secret/config isolation nếu architecture yêu cầu proxy.
- [x] **BE-P5-T003:** Normalize Google Place ID, name, coordinates, address và category snapshot.
- [x] **BE-P5-T004:** Timeout, quota/error mapping và bounded retry.
- [x] **BE-P5-T005:** Cache policy chỉ khi query/cost evidence yêu cầu; có TTL/invalidation rõ.
- [x] **BE-P5-T006:** Contract/security/provider tests.

### Live provider closure

- **LIVE PROVIDER PASS (2026-08-20):** deployed `resolve-place` called Google
  Places API (New) for `Wat Arun, Bangkok, Thailand`, persisted a complete
  trusted snapshot, refreshed it as `VERIFIED_REFRESHED`, preserved the
  last-known-good snapshot after a controlled no-match refresh, passed
  owner/cross-user/spoof/legacy-provenance checks, and cleaned all disposable
  users/data.
- Remote `resolve-place` version 8 is `ACTIVE` with `verify_jwt=true`; anonymous
  invocation is rejected.
- Google returned the localized canonical name `Chùa Arun`. The deterministic
  matcher was corrected to accept provider-backed localized-name/address plus
  primary-locality evidence without trusting `results[0]`; the regression is
  covered by the final 20-test resolver suite.
- The verified Google Place ID, valid coordinates, address, and
  `place_resolved_at` were written atomically. Category remains optional.
- Client provider-field certification, direct provider-column mutation, and
  provider-looking graph creation remain blocked; the latter returns `TW001`.

### Guardrails

- Không để Gemini làm source of truth cho coordinates/place metadata.
- Không lưu photos binary, reviews, rating hoặc opening-hours snapshot nếu chưa có requirement.
- Không expose Google server key ra client.

---

## [x] BE-P6 — Saved Trips Query & Mutation Contracts

### Goal

Cung cấp backend/repository contract nhỏ cho list/detail/delete/update trip đã lưu.

### Subtasks

- [x] **BE-P6-T001:** Paginated/cursor list contract scoped theo authenticated owner.
- [x] **BE-P6-T002:** Trip detail graph query không N+1 và có deterministic ordering.
- [x] **BE-P6-T003:** Delete/update-note semantics với RLS.
- [x] **BE-P6-T004:** Compact DTO/payload review.
- [x] **BE-P6-T005:** Ownership, pagination và query-plan tests.

---

## [x] BE-P7 — Route / OSRM Responsibility

### Goal

Chốt route responsibility theo kiến trúc hiện hành trước khi implement. Public OSRM có thể được gọi từ client; serverless boundary chỉ thêm khi security, rate/caching hoặc contract evidence yêu cầu.

### Subtasks

- [x] **BE-P7-T001:** Architecture decision: direct client vs Edge Function boundary.
- [x] **BE-P7-T002:** Validate coordinate/profile inputs và whitelist provider URL.
- [x] **BE-P7-T003:** Timeout, fallback và bounded retry contract.
- [x] **BE-P7-T004:** Cache/TTL decision dựa trên traffic/provider limits.
- [x] **BE-P7-T005:** Route contract/provider failure tests.

---

## [x] BE-P8 — Weather Responsibility

### Goal

Giữ Open-Meteo trong product scope với boundary đơn giản. Theo architecture hiện hành, public API có thể gọi trực tiếp từ client; backend chỉ nhận trách nhiệm nếu contract/caching/aggregation cần thiết.

### Subtasks

- [x] **BE-P8-T001:** Confirm direct-client vs serverless responsibility.
- [x] **BE-P8-T002:** Forecast DTO/error/timeout contract nếu backend-owned.
- [x] **BE-P8-T003:** Cache/TTL policy nếu backend-owned và có cost/traffic need.
- [x] **BE-P8-T004:** Provider fallback and contract tests.

---

## [x] BE-P9 — Security & RLS Audit

### Goal

Audit toàn bộ backend capability sau persistence/place/query implementation.

### Subtasks

- [x] **BE-P9-T001:** RLS matrix cho mọi table/operation.
- [x] **BE-P9-T002:** Auth/JWT enforcement cho mọi Edge Function.
- [x] **BE-P9-T003:** Secret, log và environment audit.
- [x] **BE-P9-T004:** Abuse/rate-limit review cho cost-bearing functions.
- [x] **BE-P9-T005:** Cross-user isolation tests.

---

## [x] BE-P10 — Performance, Cost & Resilience

### Goal

Review query cost, provider cost và bottleneck bằng evidence, không thêm enterprise infrastructure sớm.

### Subtasks

- [x] **BE-P10-T001:** Query plans/index review cho owner list/detail/persistence.
- [x] **BE-P10-T002:** Gemini/Places rate limits và cost controls.
- [x] **BE-P10-T003:** Timeout/retry/cancellation consistency.
- [x] **BE-P10-T004:** Cache candidates, TTL và invalidation decision.
- [x] **BE-P10-T005:** Payload size/concurrency/load smoke tests.

---

## [x] BE-P11 — Backend Final QA & Production Readiness

### Goal

Đóng backend track sau contract, security và operational verification.

### Subtasks

- [x] **BE-P11-T001:** Migrations and remote schema audit.
- [x] **BE-P11-T002:** Edge Function deployment/version inventory.
- [x] **BE-P11-T003:** Automated backend suite PASS.
- [x] **BE-P11-T004:** Safe live smoke tests cho critical functions.
- [x] **BE-P11-T005:** Monitoring/logging/runbook và rollback notes.
- [x] **BE-P11-T006:** Final secret/RLS/provider-cost review.

## 3. Backend implementation closure

> **STOP BACKEND WORK. WAIT FOR FRONTEND COMPLETION AND EXPLICIT USER AUTHORIZATION BEFORE STARTING FE ↔ BE INTEGRATION.**

Google Places live-provider closure is complete. The server-only secret name
was verified without reading or printing its value, and the real provider flow
completed with exact disposable-data cleanup.

Do not start additional backend implementation unless a new backend requirement
or regression is explicitly authorized. When Frontend is complete and the user
authorizes Integration, begin with `INT-P0 — Integration Readiness & Contract
Freeze`; this backend roadmap does not start INT-P0.

---

## 4. Post-BE authorized Integration backend extensions

The following backend contracts were explicitly authorized and implemented during subsequent FE ↔ BE Integration phases (`PHASES_INTEGRATION.md`):

1. **`get-place-photo` Edge Function (ACTIVE v1, `verify_jwt=true`)**:
   - Secure proxy for Google Places API (New) photo lookup.
   - Requires valid JWT + ownership check (verified itinerary item or owned saved place).
   - Generates short-lived safe photo URI with zero Google API key exposure to mobile.

2. **`public.saved_places` Contract (`20260822000000_saved_places_contract.sql` + `20260822010000_add_saved_places_update_policy.sql`)**:
   - Schema: `id`, `user_id`, `google_place_id`, `place_name`, `latitude`, `longitude`, `place_address`, `place_category`, `created_at`.
   - Constraints: Unique `(user_id, google_place_id)` with keyset pagination index `(user_id, created_at desc, id desc)`.
   - Security: Full Row Level Security restricting CRUD strictly to `auth.uid() = user_id`.
   - RPCs: `list_saved_places(p_limit, p_cursor_created_at, p_cursor_id, p_category)`, `save_place(p_google_place_id, p_place_name, p_latitude, p_longitude, p_place_address, p_place_category)`, `unsave_place(p_google_place_id)`.

3. **`get-place-metadata` Edge Function (ACTIVE v1, `verify_jwt=true`)**:
   - Fetches real Google Places API (New) `rating` and `userRatingCount` for owned places.
   - Enforces authenticated ownership validation (owned saved place or owned verified trip item).
   - Caches responses server-side (24-hour TTL).

4. **Profile Extensions & Account Deletion (`20260822020000_profile_stats_and_deletion.sql`)**:
   - Added `home_country` column (`varchar(2) not null default ''`) to `public.profiles`.
   - Added `public.get_user_trip_stats()` RPC (`security invoker`, `set search_path = ''`): Returns real trip count aggregated on PostgreSQL (`select count(*) from public.trips where user_id = auth.uid()`).
   - Added `public.delete_user_account()` RPC (`security definer`, `set search_path = ''`): Atomic cascaded account deletion (`delete from auth.users where id = auth.uid()`) cascading across `public.profiles`, `public.trips`, `public.itinerary_days`, `public.itinerary_items`, and `public.saved_places`.

