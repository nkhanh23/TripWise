# TASKS.md - Master Task List (TripWise Personal Mobile App)

Danh sách task tổng cho dự án **TripWise — Personal AI Travel Mobile App** (theo [ADR-017](DECISIONS.md#adr-017-react-native--typescript-as-primary-mobile-client) & [ADR-018](DECISIONS.md#adr-018-simplify-tripwise-into-a-personal-mobile-app-using-supabase)).

---

## 1. Master Roadmap: Personal Mobile App (P-Series)

### [x] P0 — Architecture Simplification
- [x] **P0.1 — Architecture Simplification Audit**: Rà soát hiện trạng, đánh giá Supabase, loại bỏ overengineering, phân loại module.
- [x] **P0.2 — Finalize Supabase Architecture Decision & Roadmap Update**: Chốt ADR-018, cập nhật README, AGENTS, DECISIONS, TASKS.

### [x] P1 — Supabase Foundation
- [x] **P1-T001**: Khởi tạo cấu hình Supabase project, biến môi trường (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- [x] **P1-T002**: Tạo Database Schema tối giản trên Supabase (`profiles`, `trips`, `itinerary_days`, `itinerary_items`).
- [x] **P1-T003**: Cấu hình Row Level Security (RLS) bảo vệ dữ liệu theo `auth.uid() = user_id`.
- [x] **P1-T004**: Tích hợp `@supabase/supabase-js` vào React Native client và kiểm tra kết nối.

### [x] P2 — Mobile Auth & Profile
- [x] **P2-T001**: Màn hình Sign In bằng Email/Password trên Mobile.
- [x] **P2-T002**: Tự động lưu và phục hồi Session qua Secure Storage (`expo-secure-store`).
- [x] **P2-T003**: Profile & Settings screen (đăng xuất, xem thông tin người dùng).

### [ ] P3 — Gemini Edge Function
- [ ] **P3-T001**: Khởi tạo Supabase Edge Function `generate-trip` (Deno / TypeScript).
- [ ] **P3-T002**: Porting logic TripParsingPromptBuilder và DescriptionPromptBuilder từ Java sang TypeScript.
- [ ] **P3-T003**: Cấu hình `GEMINI_API_KEY` trong Supabase Secrets và gọi Gemini API.
- [ ] **P3-T004**: Validate cấu trúc JSON output của Gemini trước khi trả về client.

### [ ] P4 — Trip Generation & Persistence
- [ ] **P4-T001**: Màn hình Plan Trip (form nhập prompt tiếng Việt, chọn ngày, ngân sách, phong cách).
- [ ] **P4-T002**: Kết nối Mobile với Edge Function `generate-trip`, hiển thị loading/skeleton.
- [ ] **P4-T003**: Lưu trip và itinerary days/items vào Supabase PostgreSQL.
- [ ] **P4-T004**: Màn hình hiển thị kết quả lịch trình chi tiết (Itinerary Timeline theo từng ngày).

### [ ] P5 — Google Maps & OSRM Integration
- [ ] **P5-T001**: Tích hợp Google Maps SDK trên React Native với API key đã restrict.
- [ ] **P5-T002**: Hiển thị markers cho các địa điểm trong ngày theo thứ tự.
- [ ] **P5-T003**: Gọi OSRM public API vẽ polyline tuyến đường di chuyển giữa các điểm.
- [ ] **P5-T004**: Xử lý fallback (vẽ đường thẳng/khoảng cách ước tính) khi OSRM timeout.

### [ ] P6 — Google Places Search & Place Details
- [ ] **P6-T001**: Tích hợp Google Places Autocomplete / Search trên mobile.
- [ ] **P6-T002**: Xem chi tiết địa điểm (Place Detail), giờ mở cửa, đánh giá, ảnh runtime.
- [ ] **P6-T003**: Thêm / sửa / đổi địa điểm trong lịch trình với Google Place ID + snapshot tối thiểu.

### [ ] P7 — Saved Trips, Offline Cache & Polish
- [ ] **P7-T001**: Danh sách lịch sử các chuyến đi đã tạo (`SavedTripsScreen`).
- [ ] **P7-T002**: Xem lại chi tiết chuyến đi từ database Supabase.
- [ ] **P7-T003**: Caching dữ liệu lịch trình trên máy để xem ngoại tuyến 100% khi mất mạng.
- [ ] **P7-T004**: Xóa chuyến đi, cập nhật ghi chú cá nhân (`custom_notes`).
- [ ] **P7-T005**: Hoàn thiện build APK Android và tối ưu hiệu năng.

---

## 2. Deletion & Cleanup Roadmap (D-Series)
*(Chỉ thực hiện lần lượt sau khi ứng dụng di động React Native + Supabase đã hoạt động độc lập và ổn định)*

- [ ] **D1 — Export/Archive Legacy Data**: Export snapshot các chuyến đi cũ từ local PostgreSQL nếu có dữ liệu thật cần lưu.
- [ ] **D2 — Remove Web Frontend**: Xóa thư mục `web/` và `web-archive-vite-ui/`.
- [ ] **D3 — Remove POI Pipeline & Legacy Ingestion**: Xóa các scripts/docs liên quan đến Geofabrik, Overpass, Foursquare, Moderation.
- [ ] **D4 — Verify Mobile Full Independence**: Xác nhận 100% request của mobile app đi qua Supabase/Google/Open-Meteo/OSRM, không còn request nào đến Spring Boot.
- [ ] **D5 — Remove Spring Boot Monolith**: Xóa thư mục `backend/`.
- [ ] **D6 — Remove Docker/Redis & Legacy Docs**: Xóa `docker-compose.yml`, dọn dẹp các tài liệu kiến trúc cũ trong `docs/`.
- [ ] **D7 — Final Repository Cleanup**: Tinh gọn repository chỉ còn `mobile/`, `supabase/` và tài liệu chuẩn.

---

## 3. Historical Legacy Task Archive

# TASKS.md - Master Task List

Danh sách task tổng theo phase cho dự án **AI Smart Travel Planner**. Mỗi task là một đơn vị đủ nhỏ để giao cho AI/dev thực hiện và review. Không làm nhiều phase cùng lúc.

---

## Quy ước Task ID

- `P0` đến `P13` tương ứng phase.
- `T001`, `T002` là thứ tự task trong phase.
- Mỗi task phải có acceptance criteria, test suggestion, security consideration và performance consideration.

---

## P0-T001 - Phase 0: Documentation & architecture

### Goal

Hoàn thiện tài liệu nền tảng và chốt ranh giới kiến trúc.

### Context

Tạo nền tảng để AI/dev làm đúng hướng trước khi sinh code.

### Files/modules likely changed

README.md, AGENTS.md, DECISIONS.md, TASKS.md, .env.example

### Acceptance criteria

- Có đủ 5 file nền tảng; stack khớp Java 21/Spring Boot/PostGIS/Redis/Gemini/OSRM; có ADR; có task list theo phase; không có code skeleton.

### Test suggestion

- Review markdown thủ công; kiểm tra không có secret thật; kiểm tra nội dung không mâu thuẫn stack.

### Security consideration

- Không ghi API key thật; không mô tả flow lưu token thiếu rotation.

### Performance consideration

- Tài liệu đủ rõ để giảm rework; chưa tạo code nên chưa có ảnh hưởng runtime.

### Risk/notes

- Tài liệu dài cần được review trước khi code phase 1.

---

## P1-T001 - Phase 1: Spring Boot backend foundation

### Goal

Tạo nền móng backend Spring Boot theo Clean Architecture.

### Context

Chuẩn bị backend để các module sau phát triển đúng kiến trúc.

### Files/modules likely changed

backend build files, backend/src/main, module package foundation, test config

### Acceptance criteria

- Backend chạy health check; package tách domain/application/infrastructure/presentation; chưa có business feature lớn; dùng Java 21 + Spring Boot 3.x.

### Test suggestion

- Chạy build/test; gọi health endpoint; kiểm tra package không đưa business logic vào controller.

### Security consideration

- Không commit .env thật; không expose actuator nhạy cảm public.

### Performance consideration

- Startup nhanh; chưa kết nối API ngoài khi chưa cần.

### Risk/notes

- Cần tránh tạo quá nhiều abstraction khi chưa có use case.

---

## P2-T001 - Phase 2: PostgreSQL + PostGIS + Flyway

### Goal

Thiết lập database migration và schema không gian ban đầu.

### Context

Dự án cần lưu place/hotel/route/weather/user/itinerary có dữ liệu địa lý.

### Files/modules likely changed

Flyway migrations, persistence config, repository adapters

### Acceptance criteria

- Flyway chạy được; bật PostGIS extension; có bảng nền tảng; có GIST index cho location; migration idempotent theo chuẩn Flyway.

### Test suggestion

- Chạy database local; chạy migration; kiểm tra extension PostGIS; kiểm tra insert/select geometry mẫu bằng test.

### Security consideration

- Không đưa password DB vào migration/log; role DB local không dùng superuser cho app runtime.

### Performance consideration

- Có index không gian; tránh query full scan theo location.

### Risk/notes

- Thiết kế schema cần review kỹ vì sửa sau sẽ tốn migration.

---

## P3-T001 - Phase 3: Auth + security

### Goal

Triển khai auth foundation với OAuth2/JWT/refresh rotation.

### Context

Cần user login an toàn cho web/mobile và bảo vệ itinerary cá nhân.

### Files/modules likely changed

auth module, security config, token service, user repository, auth controllers, migrations

### Acceptance criteria

- Register/login hoặc OAuth2 flow theo scope; access token ngắn hạn; refresh token rotation; refresh token hash; logout/revoke; endpoint protected hoạt động.

### Test suggestion

- Unit test token service; integration test login/refresh/reuse detection; test endpoint protected trả 401 khi thiếu token.

### Security consideration

- Không log token/password; refresh token không lưu plaintext; CORS giới hạn origin; rate limit auth endpoint.

### Performance consideration

- Token validation không gọi DB mỗi request nếu không cần; refresh flow có index token family/user.

### Risk/notes

- OAuth2 provider thực tế có thể phát sinh cấu hình callback phức tạp.

---

## P4-T001 - Phase 4: Place module

### Goal

Xây module quản lý và truy vấn địa điểm.

### Context

Place là nguồn dữ liệu thật để tránh Gemini bịa địa điểm.

### Files/modules likely changed

place module domain/application/infrastructure/presentation, place migrations, DTOs

### Acceptance criteria

- CRUD/admin cơ bản hoặc import thủ công; search theo city/category/tag/budget; location valid; API `/api/v1/places`; không expose entity.

### Test suggestion

- Repository integration test; API test filter city/category; test validate tọa độ sai.

### Security consideration

- Admin endpoint phải protected; dữ liệu nhập tay cần source và verification status.

### Performance consideration

- Query theo city/category/tag có index; query gần vị trí dùng PostGIS index.

### Risk/notes

- Dữ liệu Nha Trang ban đầu có thể thiếu hoặc chưa chuẩn tag.

---

## P5-T001 - Phase 5: Redis cache

### Goal

Thêm Redis cache và rate-limit foundation.

### Context

Giảm latency/cost cho Weather/OSRM/Gemini và bảo vệ endpoint tốn tài nguyên.

### Files/modules likely changed

cache config, Redis adapter, rate limit filter/interceptor, cache key conventions

### Acceptance criteria

- Redis kết nối được; có cache abstraction; có key naming; có TTL; endpoint demo có rate limit; lỗi Redis có fallback hợp lý.

### Test suggestion

- Integration test với Redis local/testcontainer; test TTL; test vượt rate limit trả 429.

### Security consideration

- Không lưu token plaintext nếu dùng Redis; không đưa dữ liệu nhạy cảm vào cache key.

### Performance consideration

- Cache key ngắn gọn; TTL hợp lý; tránh cache payload quá lớn.

### Risk/notes

- Redis down không được làm sập toàn bộ app nếu tính năng cache không critical.

---

## P6-T001 - Phase 6: Trip generation

### Goal

Tạo use case sinh lịch trình từ dữ liệu đã có.

### Context

Ghép parse request, place scoring, weather, route và itinerary builder thành flow nghiệp vụ.

### Files/modules likely changed

trip/itinerary modules, generation use case, DTOs, controllers

### Acceptance criteria

- POST `/api/v1/trips/generate` nhận prompt/startDate/origin; trả itinerary theo ngày; chỉ dùng place trong DB; có error handling khi thiếu dữ liệu.

### Test suggestion

- Unit test generation use case với fake adapters; API test happy path và missing places.

### Security consideration

- Endpoint cần auth hoặc rate limit; không log prompt nếu chứa dữ liệu nhạy cảm quá mức.

### Performance consideration

- Giới hạn 1-3 ngày, 3-5 điểm/ngày; tránh gọi route/weather lặp.

### Risk/notes

- Flow dễ phình to; cần giữ orchestration trong use case, logic nhỏ trong domain services.

---

## P7-T001 - Phase 7: Gemini parse request

### Goal

Tích hợp Gemini để parse prompt tiếng Việt thành JSON.

### Context

AI chỉ phân tích nhu cầu, không làm nguồn dữ liệu địa điểm.

### Files/modules likely changed

ai module, Gemini adapter, prompt templates, schema validator

### Acceptance criteria

- Gemini adapter có timeout; output validate schema; fallback khi JSON sai; parse được destination/days/nights/interests/budget.

### Test suggestion

- Mock Gemini response; test JSON hợp lệ/sai schema/timeout; kiểm tra không có key trong log.

### Security consideration

- Gemini API key lấy từ env; mask request/response nhạy cảm; rate limit endpoint gọi Gemini.

### Performance consideration

- Cache parse result theo prompt normalized nếu phù hợp; giới hạn prompt length.

### Risk/notes

- Prompt tiếng Việt đa dạng có thể gây parse sai; cần schema strict và fallback form.

---

## P8-T001 - Phase 8: Place scoring

### Goal

Triển khai thuật toán chấm điểm địa điểm.

### Context

Cần xếp hạng địa điểm theo sở thích, ngân sách, thời điểm, weather và khoảng cách.

### Files/modules likely changed

place scoring domain service, tests, config weights

### Acceptance criteria

- Scoring có weight rõ; kết quả deterministic; giải thích lý do gợi ý; xử lý indoor/outdoor khi mưa.

### Test suggestion

- Unit test từng tiêu chí; test ranking với dataset mẫu; test budget low không ưu tiên điểm quá đắt.

### Security consideration

- Không đưa dữ liệu không xác minh vào reason; không để AI tự sửa điểm số ngoài rule.

### Performance consideration

- Scoring O(n) hoặc hợp lý với dataset MVP; tránh gọi external API trong vòng scoring.

### Risk/notes

- Weight ban đầu có thể cần tinh chỉnh sau demo người dùng.

---

## P9-T001 - Phase 9: OSRM route cache

### Goal

Tích hợp OSRM và cache tuyến đường.

### Context

Route thực tế là điểm khác biệt chính của sản phẩm, nhưng cần cache để tránh giới hạn/cost.

### Files/modules likely changed

route module, OSRM adapter, route cache repository, Redis/PostgreSQL cache

### Acceptance criteria

- Gọi OSRM lấy distance/duration/geometry; cache theo from/to/profile; fallback khi OSRM lỗi; API `/api/v1/routes` nếu cần.

### Test suggestion

- Mock OSRM; integration test cache hit/miss; test OSRM timeout; kiểm tra geometry response hợp lệ.

### Security consideration

- Không gọi URL tùy ý từ user gây SSRF; base URL lấy config whitelist; validate tọa độ.

### Performance consideration

- Cache route; batch route khi cần; giới hạn số điểm mỗi request.

### Risk/notes

- Demo OSRM public server có thể rate limit; cân nhắc self-host sau MVP.

---

## P10-T001 - Phase 10: Weather cache

### Goal

Tích hợp weather provider và cache dự báo.

### Context

Weather giúp điều chỉnh lịch trình khi mưa hoặc thời tiết xấu.

### Files/modules likely changed

weather module, provider adapter, weather cache table/Redis, DTOs

### Acceptance criteria

- Lấy weather theo city/date/days; cache theo provider/city/date; itinerary có cảnh báo mưa; lỗi weather không làm fail trip generation.

### Test suggestion

- Mock provider; test cache TTL; test provider lỗi vẫn tạo itinerary không weather.

### Security consideration

- Không đưa API key vào query log; validate city/date/days.

### Performance consideration

- Cache theo ngày; tránh gọi weather nhiều lần cho cùng city/date.

### Risk/notes

- Dự báo có sai số; UI cần thể hiện đây là gợi ý.

---

## P11-T001 - Phase 11: Web MVP

### Goal

Tạo web MVP tách riêng backend.

### Context

Người dùng cần form nhập yêu cầu, xem lịch trình và bản đồ.

### Files/modules likely changed

web app, API client, pages/components, map components

### Acceptance criteria

- Web gọi API `/api/v1`; có trang tạo trip, kết quả itinerary, map OSM/Leaflet, marker/polyline, lưu trip; không chứa secret backend.

### Test suggestion

- Run web local; test submit prompt; test render marker/polyline; test lỗi API hiển thị thân thiện.

### Security consideration

- Không đặt Gemini/Google key ở frontend; token lưu an toàn theo best effort; CORS đúng origin.

### Performance consideration

- Lazy load map; tránh render geometry quá lớn; cache client phù hợp.

### Risk/notes

- Web codebase trong `web/` là TripWise Admin Portal (ReactJS + Vite + TypeScript). Các user screen cũ được lưu giữ làm reference/preview.

---

## P12-T001 - Mobile App Architecture & Roadmap (React Native + TypeScript)

### Goal

Đặc tả kiến trúc, tech stack (React Native + TypeScript) và lộ trình phát triển cho Mobile App (Primary End-User Client).

### Context

Mobile là client chính cho người dùng cuối trên Android/iOS. Web đóng vai trò Admin Portal. Backend Spring Boot Clean Architecture `/api/v1` là backend dùng chung.

### Files/modules likely changed

`docs/08-project-roadmap/phases.md`, `mobile/README.md`, `web/README.md`, `DECISIONS.md`, `AGENTS.md`

### Acceptance criteria

- Chốt ADR-017 (React Native + TypeScript cho mobile, Web là Admin Portal).
- Document roadmap M0 - M9 và coding rules React Native.
- Giữ nguyên backend và source code hiện tại.

### Test suggestion

- Kiểm tra tính nhất quán tài liệu toàn repository (không còn mâu thuẫn Flutter active).

### Security consideration

- Token lưu trong Secure Storage (Keychain/Keystore). Client Map API Key có restriction.

- Refresh token lưu secure storage; không hardcode API key; pinning/cert strategy xem xét sau.

### Performance consideration

- Giảm payload map/route nếu mobile yếu; pagination saved trips.

### Risk/notes

- Mobile map có thể tốn thời gian; nên làm itinerary text trước nếu cần demo nhanh.

---

## P13-T001 - Phase 13: Monitoring, rate limiting, production readiness

### Goal

Chuẩn bị vận hành production cơ bản.

### Context

Cần biết hệ thống lỗi ở đâu, kiểm soát lạm dụng và sẵn sàng deploy.

### Files/modules likely changed

logging config, actuator/metrics, rate limit, Docker/CI docs, deployment config

### Acceptance criteria

- Có structured logging; health/readiness; metrics cơ bản; rate limit endpoint tốn cost; Docker local/prod guide; không expose actuator nhạy cảm.

### Test suggestion

- Test health/readiness; test log masking; test rate limit; chạy smoke test bằng docker compose.

### Security consideration

- Mask secret; actuator protected; CORS production cụ thể; security headers; dependency scan.

### Performance consideration

- Theo dõi latency external API, cache hit rate, DB slow query; cấu hình connection pool.

### Risk/notes

- Tracing đầy đủ có thể để sau, nhưng không thiết kế cản trở OpenTelemetry.


---

## Backlog task nhỏ gợi ý sau master task

### Phase 0

- P0-T002: Vẽ context diagram và module diagram.
- P0-T003: Chuẩn hóa API error response format.
- P0-T004: Chuẩn hóa naming convention cho package/module.

### Phase 1

- P1-T002: Tạo global exception handling.
- P1-T003: Tạo request ID/correlation ID filter.
- P1-T004: Tạo validation foundation.

### Phase 2

- P2-T002: Migration bảng users/auth tokens.
- P2-T003: Migration bảng places/hotels với PostGIS index.
- P2-T004: Migration bảng itineraries/itinerary_days/itinerary_items.
- P2-T005: Migration bảng route_cache/weather_cache.

### Phase 3

- P3-T002: Register/login bằng email/password nếu OAuth2 chưa bật.
- P3-T003: OAuth2 login provider config.
- P3-T004: Refresh token reuse detection.
- P3-T005: Logout/revoke token family.

### Phase 4

- P4-T002: Place import format cho Nha Trang.
- P4-T003: Admin create/update place.
- P4-T004: Public place search API.
- P4-T005: Validate duplicate place theo source + external id/toạ độ.

### Phase 5

- P5-T002: Redis cache cho weather.
- P5-T003: Redis cache cho route lookup.
- P5-T004: Rate limit trip generation.

### Phase 6

- P6-T002: Itinerary day builder.
- P6-T003: Time slot assignment.
- P6-T004: Save generated itinerary.
- P6-T005: Get saved itineraries.

### Phase 7

- P7-T002: Prompt template versioning.
- P7-T003: Gemini response schema validator.
- P7-T004: Manual fallback parser.

### Phase 8

- P8-T002: Budget scoring.
- P8-T003: Weather-aware scoring.
- P8-T004: Reason generation không dùng dữ liệu bịa.

### Phase 9

- P9-T002: OSRM adapter timeout/retry.
- P9-T003: Route cache database lookup.
- P9-T004: Route geometry compression strategy review.

### Phase 10

- P10-T002: Open-Meteo adapter.
- P10-T003: Weather-to-itinerary adjustment rule.
- P10-T004: Weather cache expiry policy.

### Phase 11

- P11-T002: Web trip request page.
- P11-T003: Web itinerary result page.
- P11-T004: Web map component.
- P11-T005: Web saved trips page.

### Mobile Phases (React Native)

- P12-T002: Mobile Foundation (React Native + TypeScript, Navigation, API client).
- P12-T003: Mobile Auth flow & Secure Storage.
- P12-T004: Mobile Home, Explore & Map (Google Maps SDK evaluation).
- P12-T005: Mobile AI Trip Planner & Result screen.
- P12-T006: Mobile Saved trips & Offline snapshots.

### Phase 13

- P13-T002: Docker Compose local environment.
- P13-T003: CI build/test workflow.
- P13-T004: Actuator health/readiness security.
- P13-T005: Production checklist.

---

### Place Data Enrichment (xem chi tiết tại `docs/08-project-roadmap/place-data-enrichment-roadmap.md`)

- PDE-T001 — Phase A: Geofabrik Nationwide Audit for ATTRACTION/HOTEL/SERVICE.

  **Goal:** Audit raw OSM/Geofabrik tags toàn quốc, phát hiện bottleneck parser/moderation cho ATTRACTION, HOTEL, SERVICE.

  **Context:** ATTRACTION nationwide thấp do OSM Việt Nam đánh tag không đồng đều. Cần baseline data trước khi cải thiện rules.

  **Scope:**
  - DRY_RUN only
  - không update DB
  - không import mới
  - không APPLY
  - mục tiêu toàn quốc
  - report theo province/city/placeType
  - tập trung phát hiện bottleneck parser/moderation cho ATTRACTION/HOTEL/SERVICE
  - output report dạng CSV/JSON

  **How to verify:** Chạy dry-run, kiểm tra output report có số liệu theo province/city/placeType, không có thay đổi DB.

