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

- **Completed through:** BE-P4 — Trip Generation Persistence (T001–T006); BE-P5-T001 — Place identity contract
- **Current/next phase:** BE-P5 — Place Identity & Enrichment Boundary
- **Immediate backend task:** BE-P5-T002 — Server-side Places secret/config isolation
- **Integration status:** NOT STARTED

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

## [ ] BE-P5 — Place Identity & Enrichment Boundary

### Goal

Định nghĩa server-side boundary cho Google Places nếu secret/server restrictions yêu cầu, và tạo verified place snapshot cho persistence/map.

### Subtasks

- [x] **BE-P5-T001:** Contract cho unresolved AI suggestion → verified place identity.
- [ ] **BE-P5-T002:** Server-side Places secret/config isolation nếu architecture yêu cầu proxy.
- [ ] **BE-P5-T003:** Normalize Google Place ID, name, coordinates, address và category snapshot.
- [ ] **BE-P5-T004:** Timeout, quota/error mapping và bounded retry.
- [ ] **BE-P5-T005:** Cache policy chỉ khi query/cost evidence yêu cầu; có TTL/invalidation rõ.
- [ ] **BE-P5-T006:** Contract/security/provider tests.

### Guardrails

- Không để Gemini làm source of truth cho coordinates/place metadata.
- Không lưu photos binary, reviews, rating hoặc opening-hours snapshot nếu chưa có requirement.
- Không expose Google server key ra client.

---

## [ ] BE-P6 — Saved Trips Query & Mutation Contracts

### Goal

Cung cấp backend/repository contract nhỏ cho list/detail/delete/update trip đã lưu.

### Subtasks

- [ ] **BE-P6-T001:** Paginated/cursor list contract scoped theo authenticated owner.
- [ ] **BE-P6-T002:** Trip detail graph query không N+1 và có deterministic ordering.
- [ ] **BE-P6-T003:** Delete/update-note semantics với RLS.
- [ ] **BE-P6-T004:** Compact DTO/payload review.
- [ ] **BE-P6-T005:** Ownership, pagination và query-plan tests.

---

## [ ] BE-P7 — Route / OSRM Responsibility

### Goal

Chốt route responsibility theo kiến trúc hiện hành trước khi implement. Public OSRM có thể được gọi từ client; serverless boundary chỉ thêm khi security, rate/caching hoặc contract evidence yêu cầu.

### Subtasks

- [ ] **BE-P7-T001:** Architecture decision: direct client vs Edge Function boundary.
- [ ] **BE-P7-T002:** Validate coordinate/profile inputs và whitelist provider URL.
- [ ] **BE-P7-T003:** Timeout, fallback và bounded retry contract.
- [ ] **BE-P7-T004:** Cache/TTL decision dựa trên traffic/provider limits.
- [ ] **BE-P7-T005:** Route contract/provider failure tests.

---

## [ ] BE-P8 — Weather Responsibility

### Goal

Giữ Open-Meteo trong product scope với boundary đơn giản. Theo architecture hiện hành, public API có thể gọi trực tiếp từ client; backend chỉ nhận trách nhiệm nếu contract/caching/aggregation cần thiết.

### Subtasks

- [ ] **BE-P8-T001:** Confirm direct-client vs serverless responsibility.
- [ ] **BE-P8-T002:** Forecast DTO/error/timeout contract nếu backend-owned.
- [ ] **BE-P8-T003:** Cache/TTL policy nếu backend-owned và có cost/traffic need.
- [ ] **BE-P8-T004:** Provider fallback and contract tests.

---

## [ ] BE-P9 — Security & RLS Audit

### Goal

Audit toàn bộ backend capability sau persistence/place/query implementation.

### Subtasks

- [ ] **BE-P9-T001:** RLS matrix cho mọi table/operation.
- [ ] **BE-P9-T002:** Auth/JWT enforcement cho mọi Edge Function.
- [ ] **BE-P9-T003:** Secret, log và environment audit.
- [ ] **BE-P9-T004:** Abuse/rate-limit review cho cost-bearing functions.
- [ ] **BE-P9-T005:** Cross-user isolation tests.

---

## [ ] BE-P10 — Performance, Cost & Resilience

### Goal

Review query cost, provider cost và bottleneck bằng evidence, không thêm enterprise infrastructure sớm.

### Subtasks

- [ ] **BE-P10-T001:** Query plans/index review cho owner list/detail/persistence.
- [ ] **BE-P10-T002:** Gemini/Places rate limits và cost controls.
- [ ] **BE-P10-T003:** Timeout/retry/cancellation consistency.
- [ ] **BE-P10-T004:** Cache candidates, TTL và invalidation decision.
- [ ] **BE-P10-T005:** Payload size/concurrency/load smoke tests.

---

## [ ] BE-P11 — Backend Final QA & Production Readiness

### Goal

Đóng backend track sau contract, security và operational verification.

### Subtasks

- [ ] **BE-P11-T001:** Migrations and remote schema audit.
- [ ] **BE-P11-T002:** Edge Function deployment/version inventory.
- [ ] **BE-P11-T003:** Automated backend suite PASS.
- [ ] **BE-P11-T004:** Safe live smoke tests cho critical functions.
- [ ] **BE-P11-T005:** Monitoring/logging/runbook và rollback notes.
- [ ] **BE-P11-T006:** Final secret/RLS/provider-cost review.

## 3. Backend next task

> **BE-P5-T002 — Server-side Google Places secret/config isolation.**

Không tự bắt đầu task này ngoài một backend session được user giao rõ ràng.
