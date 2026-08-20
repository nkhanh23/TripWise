# TripWise Backend Handoff

**Owner / Agent: Codex — Backend development**
**Status: ACTIVE — phát triển song song với React Native Mobile Frontend**

Roadmap dài hạn: [`PHASES_BE.md`](./PHASES_BE.md)

## 1. Backend scope và kiến trúc hiện hành

Backend production hiện hành của TripWise là:

```text
Supabase Auth
    ↓
Supabase Edge Functions (Deno / TypeScript)
    ↓
Supabase PostgreSQL + Row Level Security
    ↓
External server-side services (Gemini; Google Places ở phase sau)
```

- `backend/` Java Spring Boot là **legacy migration source**, không thêm feature mới.
- Mobile không được giữ private server key hay gọi Gemini trực tiếp.
- Supabase Auth và RLS là security boundary cho dữ liệu người dùng.
- Backend được phát triển song song với React Native Mobile Frontend; không còn trạng thái paused.
- Không thay đổi React Native UI trong backend session.

## 2. BE-P3 — Supabase Edge Function + Gemini AI

**Status: DONE / PASS**

| Hạng mục | Trạng thái | Chi tiết đã verify |
|---|---|---|
| Edge Function | PASS | `generate-trip`, Deno / TypeScript |
| Remote deployment | PASS | Function đã deploy và ở trạng thái `ACTIVE` |
| Deployed version tại thời điểm verify | `4` | Không redeploy nếu không có bug thực tế |
| JWT verification | PASS | `verify_jwt = true` trong `supabase/config.toml` và Supabase Gateway |
| Gemini secret | PASS | `GEMINI_API_KEY` chỉ lưu trong Supabase Secrets |
| Gemini model tại thời điểm verify | `gemini-3.5-flash-lite` | Structured output được hỗ trợ |
| Authenticated live generation | PASS | Đã verify end-to-end bằng Supabase user session thật |
| Structured output | PASS | JSON được parse, schema-validate và normalize |
| Database writes | NONE | BE-P3 là generation-only, không mutate database |

Không rewrite BE-P3 đang hoạt động nếu không phát hiện bug thực sự, đặc biệt không thay đổi JWT flow, Gemini parser hoặc contract validation chỉ để refactor style.

## 3. Live authenticated generation evidence

Request live an toàn đã được chạy với:

- Destination: `Bangkok`
- Duration: `2 days`
- Input gồm `destination`, `startDate`, `endDate`, `travelers`, `budget`, `currency`, `preferences`, `notes`

Kết quả:

- 2 itinerary days
- Day 1: 4 items
- Day 2: 3 items
- Day numbering và item positions hợp lệ
- Nội dung địa điểm là AI suggestions bằng tên/query, không giả lập Google Place ID hoặc tọa độ
- Response là JSON hợp lệ theo output contract
- Trusted request dates và destination được dùng trong normalization
- Không tạo record mới trong `trips`, `itinerary_days`, `itinerary_items`

## 4. Gemini REST parser — bắt buộc giữ nguyên

Gemini REST endpoint `/v1beta/interactions` không bảo đảm trả text qua SDK convenience property `output_text`. Raw REST response đã verify đặt model output tại:

```text
steps[].content[].text
```

`supabase/functions/generate-trip/gemini.ts` dùng `readInteractionOutputText` để duyệt `steps`, chọn model output và ghép các text blocks trước khi JSON parse và schema validation.

> Không revert parser về giả định chỉ có `output_text`. Compatibility fallback hiện có chỉ được thay đổi khi có evidence provider/API mới và test contract tương ứng.

Structured output flow:

```text
Validated request
    ↓
JWT-protected generate-trip Edge Function
    ↓
Gemini REST structured JSON request
    ↓
Extract steps[].content[].text
    ↓
JSON parse
    ↓
validateGeneratedTrip
    ↓
Normalize trusted metadata, days and item order
    ↓
Return GeneratedTrip
```

## 5. Contract và validation boundaries

Input validation hiện có giới hạn các trường cần thiết như destination, date range, travelers, budget và kích thước text/payload. Function có timeout hữu hạn và error categories ổn định; không trả raw provider internals về client.

Output validation bảo đảm:

- title, destination, date range và days có shape ổn định;
- day numbering và item position được normalize;
- malformed Gemini output bị reject;
- BE-P3 không nhận Google Place ID, coordinates, photos, ratings hoặc opening hours như dữ liệu đã verify;
- AI suggestion không phải source of truth cho production place metadata.

## 6. Authentication và security boundaries

- `generate-trip` yêu cầu authenticated Supabase JWT; anonymous request bị từ chối.
- `GEMINI_API_KEY` không xuất hiện trong client bundle, source, log hoặc response.
- Không dùng service-role credential trong mobile.
- Không log access token, refresh token, Authorization header hoặc secret.
- `.env` thật phải được gitignore; chỉ placeholder được phép trong `.env.example`.
- RLS vẫn bật trên `profiles`, `trips`, `itinerary_days`, `itinerary_items`.
- BE-P3 không disable/bypass RLS và không tạo public policy để test.
- External Gemini call có timeout và không retry vô hạn.
- Raw AI response không được tin cậy trước schema validation.

## 7. Database write behavior

| Table | BE-P3 writes | Future owner |
|---|---:|---|
| `trips` | 0 | BE-P4 persistence |
| `itinerary_days` | 0 | BE-P4 persistence |
| `itinerary_items` | 0 | BE-P4 persistence |

BE-P3 là stateless generation boundary. Không thêm persistence vào `generate-trip` ngoài một task BE-P4 được user giao rõ ràng.

## 8. Backend verification đã hoàn thành

Evidence tại thời điểm đóng BE-P3:

- `deno check` — PASS
- `deno lint` — PASS (11 files)
- `deno test` — PASS (14 tests)
- Remote Edge Function deployment — PASS
- Authenticated live generation — PASS
- Before/after database row-count verification — PASS, 0 writes

Các test bao phủ input validation, output contract/normalization, auth rejection, timeout/error mapping và raw Gemini `steps[].content[].text` parsing. Không cần rerun live Gemini chỉ để bắt đầu một backend session khác, trừ khi task yêu cầu hoặc code BE-P3 bị thay đổi.

## 9. Backend files cần bảo toàn

- `supabase/config.toml`
- `supabase/functions/generate-trip/index.ts`
- `supabase/functions/generate-trip/handler.ts`
- `supabase/functions/generate-trip/contract.ts`
- `supabase/functions/generate-trip/contract_test.ts`
- `supabase/functions/generate-trip/gemini.ts`
- `supabase/functions/generate-trip/gemini_test.ts`
- `supabase/functions/generate-trip/README.md`
- `supabase/migrations/20260819000000_supabase_personal_app_foundation.sql`
- `supabase/migrations/20260819010000_auth_profile_foundation.sql`

Temporary live verification scripts đã được dọn; không recreate hoặc commit credential-based harness.

## 10. Backend phase status

### BE-P4 — Trip Generation & Persistence

- Legacy mapping: old mixed-roadmap `P4-T003` → active **BE-P4 persistence scope**.
- **BE-P4-T001 đã hoàn thành:** unresolved-place/coordinate persistence contract đã được chốt và verify.
- **BE-P4-T002 đã hoàn thành:** atomic PostgreSQL RPC boundary đã được implement và verify rollback.
- **BE-P4-T003 đã hoàn thành:** owner-safe, bounded input contract đã được implement và verify.
- **BE-P4-T004 đã hoàn thành:** owner-scoped idempotency, deterministic retry/conflict behavior và concurrent duplicate prevention đã được implement và verify.
- **BE-P4-T005 đã hoàn thành:** stable machine-readable persistence errors và safe generic database fallback đã được implement và verify rollback/no-leak.
- **BE-P4-T006 đã hoàn thành:** reusable isolated PostgreSQL suite PASS; remote migrations `20260819020000`–`20260819060000` đã apply; actual remote schema và authenticated Supabase RPC/PostgREST persistence, RLS A/B, idempotency, concurrency, error/auth boundaries và cleanup đều PASS.
- **BE-P4: DONE:** T001–T006 đã hoàn thành. Production graph creation bắt buộc dùng `create_trip_graph(text, jsonb)`.
- Persistence phải atomic/idempotent, giữ RLS ownership và không tin `user_id` do client tùy ý cung cấp.
- Các old mixed-roadmap UI/client items thuộc FE/INT roadmaps, không tự thực hiện trong backend-only session.

### Các backend capability phase sau

- **BE-P5-T001 đã hoàn thành:** unresolved/verified lifecycle, Google-specific MVP identity, trust-source matrix, client spoof risk và creation→enrichment boundary đã được chốt tại `docs/05-engineering/place-identity-contract.md`.
- **BE-P5-T002 chưa bắt đầu:** server-side Google Places secret/config isolation là task backend tiếp theo.
- BE-P6+: saved-trip query, route/weather và production backend capabilities — chưa bắt đầu; xem `PHASES_BE.md`.
- D-Series cleanup — chưa bắt đầu; không xóa Java/web/legacy assets ngoài task D-Series riêng.

## 11. BE-P4-T001 persistence contract

Migration `20260819020000_itinerary_item_resolution_contract.sql` giải quyết mismatch mà không sửa foundation migration đã apply:

- `UNRESOLVED`: có `place_name`, optional `place_query` và scheduling fields; `latitude`/`longitude` cùng `NULL`; `google_place_id` chưa được coi là verified identity.
- `RESOLVED`: `latitude`/`longitude` cùng có giá trị hợp lệ sau provider/backend verification; provider identity và snapshot verified được bổ sung ở BE-P5.
- Coordinate pair CHECK không cho phép trạng thái half-resolved (`latitude` null nhưng `longitude` non-null, hoặc ngược lại).
- `place_query` là resolution hint do AI sinh, không phải verified place metadata.

Không thêm resolution status vì nullable coordinate pair đã biểu đạt đủ hai trạng thái hiện tại. Migration không thay RLS, policies, grants hoặc ownership model.

## 12. BE-P4-T002 atomic transaction boundary

Migration `20260819030000_create_trip_graph_transaction.sql` tạo RPC `public.create_trip_graph(p_graph jsonb) returns uuid`:

- một RPC request thực hiện một PostgreSQL statement transaction;
- insert trip, days và items bằng ba set-based INSERT trong cùng function call;
- database tự sinh trip/day/item IDs; caller không truyền database IDs;
- owner lấy từ `auth.uid()`, không nhận `user_id` trong payload;
- function là `SECURITY INVOKER`, giữ nguyên RLS và cố định `search_path = pg_catalog, public`;
- mọi cast/constraint/RLS error không được catch, vì vậy PostgreSQL rollback toàn bộ graph;
- EXECUTE chỉ grant cho `authenticated`, không grant cho `anon`/`PUBLIC`.

Atomicity verification trên PostgreSQL cô lập: success tạo `1 trip + 2 days + 5 items`; invalid item và duplicate day đều giữ nguyên row counts, không có partial write. T002 không thêm idempotency, full validation/error taxonomy hoặc generation-to-persistence wiring.

## 13. BE-P4-T003 ownership and input contract

Migration `20260819040000_harden_create_trip_graph_contract.sql` harden cùng signature `public.create_trip_graph(p_graph jsonb)`:

- persisted owner luôn derive từ `auth.uid()`; payload không có owner/user ID field;
- reject unknown fields ở trip, day và item boundaries;
- trip allow-list: `title`, `destination`, `startDate`, `endDate`, `estimatedBudget`, `currency`, `days`;
- day allow-list: `dayNumber`, `date`, `summary`, `items`;
- item allow-list: `position`, `googlePlaceId`, `placeName`, `placeQuery`, `latitude`, `longitude`, `placeAddress`, `placeCategory`, `startTime`, `endTime`, `note`;
- tối đa 256 KiB JSONB, 14 days, 6 items/day và 84 items/trip;
- trip duration 1–14 days; days/date và item positions phải contiguous, khớp array order;
- required strings được trim/validate; optional strings có giới hạn; currency là ba ký tự uppercase;
- coordinates phải cùng null hoặc cùng là number trong valid ranges;
- empty days/items, wrong JSON types, unknown fields và malformed values đều bị reject trước insert.

Validation duyệt mỗi day/item đúng một lần (O(days + totalItems)); ba INSERT sau validation vẫn set-based và atomic. Matrix PostgreSQL cô lập đã verify valid unresolved/resolved/multi-day graphs, owner isolation và 44 invalid cases với unchanged row counts.

Authenticated table grants hiện hữu được giữ nguyên vì chưa có evidence đủ để revoke mà không phá profile/trip flows. Application atomic graph creation phải dùng RPC; direct-write grant hardening cần quyết định riêng dựa trên consumer inventory. T003 không thêm idempotency hoặc public error taxonomy.

## 14. BE-P4-T004 idempotency and duplicate handling

Migration `20260819050000_add_trip_creation_idempotency.sql` thêm idempotency tối thiểu trực tiếp trên `trips`:

- `idempotency_key` và 32-byte `idempotency_request_hash` nullable để tương thích legacy rows;
- key là opaque, case-sensitive, được trim, dài 8–128 ký tự và chỉ nhận ASCII letters/digits cùng `._:-`;
- partial unique index `(user_id, idempotency_key)` là database source of truth chống race và vẫn cho hai owner dùng cùng key;
- payload identity là SHA-256 của canonical PostgreSQL `jsonb::text`, nên thứ tự JSON object properties không làm thay đổi retry identity;
- overload `create_trip_graph(p_idempotency_key text, p_graph jsonb)` giữ `SECURITY INVOKER`, `auth.uid()`, RLS và toàn bộ T001–T003 validation/atomicity;
- same owner/key/hash trả lại cùng trip UUID; same owner/key với hash khác được T005 public wrapper map thành stable conflict SQLSTATE `TW004`;
- idempotency metadata được insert cùng `trips` trong transaction tạo graph; failed validation/constraint không consume key;
- trigger bất biến ngăn authenticated owner sửa key/hash của graph đã tạo; xóa trip tự dọn metadata cùng row;
- old `create_trip_graph(jsonb)` được giữ trong migration history nhưng đã revoke EXECUTE khỏi `authenticated`, `anon` và `PUBLIC` để application không bypass key bắt buộc.

PostgreSQL verification cô lập đã PASS: first request `1/2/5`, same-payload retry và payload conflict giữ `1/2/5`, different key/user hoạt động độc lập, failed-first retry thành công, forced concurrent duplicate trả cùng UUID với đúng một graph, concurrent different-payload tạo đúng một winner và một conflict. T004 không thêm HTTP error taxonomy hoặc tick T006.

## 15. BE-P4-T005 stable persistence errors

Migration `20260819060000_add_stable_trip_persistence_errors.sql` giữ nguyên public signature `create_trip_graph(p_idempotency_key text, p_graph jsonb) returns uuid` và thêm error wrapper nhỏ:

- `TW001`: persistence validation, safe message `Trip persistence input is invalid.`;
- `TW002`: missing authenticated identity, safe message `Authentication is required.`;
- `TW003`: authenticated caller không được phép persist, safe message `Trip persistence is not permitted.`;
- `TW004`: same owner/key nhưng payload khác, safe message về idempotency conflict;
- `TW005`: constraint hoặc unexpected database failure, generic safe message `Unable to persist trip.`.

Caller chỉ dùng custom SQLSTATE từ Supabase error `code`; không parse constraint name, PostgreSQL message, DETAIL/HINT hay function internals. Future HTTP mapping được để cho Integration: `TW001→400`, `TW002→401`, `TW003→403`, `TW004→409`, `TW005→500`.

Verified T004 implementation được chuyển nguyên vẹn sang `tripwise_private.create_trip_graph(text, jsonb)`. Schema này không nằm trong `supabase/config.toml` exposed schemas; public wrapper và internal function đều `SECURITY INVOKER`. Wrapper catch rồi re-raise trong PL/pgSQL subtransaction, vì vậy validation, permission, conflict, constraint và unexpected failures đều rollback toàn graph trước khi trả stable error.

PostgreSQL verification cô lập đã PASS cho validation matrix, missing auth, permission failure, conflict/retry, injected CHECK và unexpected DB failures, forced concurrency, failed-first retry và T001–T004 regressions. Error diagnostics xác nhận public errors không có DETAIL, HINT hoặc constraint name. T005 không thêm Edge Function/HTTP endpoint và không tick T006.

## 16. BE-P4-T006 persistence tests and remote closure

- Fresh migration chain và BE-P1 legacy upgrade path PASS trên PostgreSQL/PostGIS isolated.
- Field-level graph verification PASS cho trip, days, resolved/unresolved items và idempotency metadata.
- Local RLS, owner spoof, rollback matrix, TW001–TW005, payload/string/date/time/coordinate bounds và real concurrent sessions PASS.
- Linked remote project `TripWise` nhận đủ migrations `20260819000000`–`20260819060000`; remote schema dump xác nhận nullable coordinate pair, constraints, index, trigger, `SECURITY INVOKER`, RLS và grants.
- Hai disposable normal Auth users gọi RPC/PostgREST thực: happy graph `1 trip / 2 days / 4 items`, retry cùng UUID, TW004 conflict, TW001 invalid graphs, A/B isolation, anonymous/invalid JWT rejection, old RPC/private schema blocking và concurrent races đều PASS.
- Service-role credential chỉ được dùng trong process memory để tạo/xóa exact disposable Auth users; không dùng cho persistence behavior. Test users và toàn bộ owned rows đã cleanup, cascade verification PASS.
- Remote TW002 function-body case không thể đi qua PostgREST khi anon đã bị chặn trước EXECUTE; TW003/TW005 không bị force bằng production grant/trigger mutation. Cả ba đã PASS trong isolated integration suite và remote wrapper/schema tồn tại đúng contract.
- Direct authenticated own-row writes vẫn possible và có thể bypass graph atomicity; Integration bắt buộc dùng `create_trip_graph(text, jsonb)`.

## 17. BE-P5-T001 place identity contract

- UNRESOLVED item chỉ có `place_name`, optional `place_query`, schedule/note; provider ID, coordinates, address và category đều null.
- VERIFIED item yêu cầu protected server-side resolution với Google Place ID, provider canonical name và verified coordinate pair; address/category là optional verified snapshot.
- Field presence và coordinate range validation không chứng minh provenance. Gemini/mobile values không bao giờ tự trở thành verified metadata.
- Current BE-P4 RPC và direct authenticated grants có thể tạo resolved-looking but unverified rows; severity HIGH cho data correctness.
- T003 phải harden graph creation để reject provider-owned fields, restrict direct provider-column writes và tạo protected enrichment boundary cùng minimal provenance/freshness marker.
- Không thêm provider-neutral abstraction hoặc status enum; Google-specific MVP phù hợp roadmap hiện tại.
- No-match/ambiguous match giữ item unresolved; không chọn result đầu tiên, không bịa identity/coordinates.
- T001 không tạo migration vì marker đơn lẻ chưa có writer restriction không thể thiết lập trust. Forward-only migration thuộc T003.

## 18. Current backend state và next backend task

Backend đang **ACTIVE**, phát triển song song và độc lập với React Native Mobile Frontend.

**Next backend task:**

> **BE-P5-T002 — Server-side Google Places secret/config isolation.**

Chỉ bắt đầu khi user giao task backend đó rõ ràng. Không tự nối Mobile FE ↔ Backend; integration có handoff riêng tại `HANDOFF_INTEGRATION.md`.

## 19. Git safety

- Worktree có thay đổi chưa commit từ nhiều session.
- Luôn chạy `git status` trước khi sửa.
- Không dùng `git reset --hard`, `git checkout .`, `git clean -fd` hoặc revert file của agent khác.
- Không tự commit.
