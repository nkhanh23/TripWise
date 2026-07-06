# DECISIONS.md - Architecture Decision Records

Tài liệu này ghi lại các quyết định kiến trúc quan trọng của dự án **AI Smart Travel Planner**.

Format mỗi ADR:

- Status: Proposed | Accepted | Deprecated | Superseded
- Context
- Decision
- Consequences

---

## ADR-001: Chọn Spring Boot 3.x + Java 21 cho backend

**Status:** Accepted

### Context

Dự án cần backend đủ mạnh để xây dựng REST API, authentication, tích hợp database, Redis, external API, logging và testing. Backend phải phù hợp với sản phẩm thật, dễ maintain và có ecosystem tốt cho bảo mật.

### Decision

Chọn **Java 21 + Spring Boot 3.x** làm backend stack chính.

### Consequences

- Có ecosystem mạnh cho REST API, Spring Security, OAuth2, validation, Flyway, PostgreSQL, Redis và testing.
- Phù hợp Clean Architecture nếu tổ chức package đúng.
- Java 21 hỗ trợ tốt cho code hiện đại và long-term support.
- Chi phí học ban đầu cao hơn Node.js, nhưng đổi lại tính ổn định và cấu trúc tốt hơn cho backend lớn.

---

## ADR-002: Chọn PostgreSQL + PostGIS làm database chính

**Status:** Accepted

### Context

Dự án cần lưu địa điểm, khách sạn, route, lịch trình và truy vấn dữ liệu không gian như tìm địa điểm trong bán kính, tính khoảng cách, lọc theo khu vực.

### Decision

Chọn **PostgreSQL + PostGIS** làm database chính.

### Consequences

- Hỗ trợ dữ liệu quan hệ và dữ liệu không gian trong cùng một database.
- Phù hợp lưu place, hotel, itinerary, route cache, weather cache và user.
- Giảm nhu cầu dùng thêm database phụ ở MVP.
- Cần thiết kế index không gian đúng để tránh truy vấn chậm.

---

## ADR-003: Chọn Clean Architecture

**Status:** Accepted

### Context

Dự án có nhiều logic nghiệp vụ: parse request, scoring địa điểm, tạo itinerary, route optimization, auth, cache, external API fallback. Nếu để logic trong controller/service lộn xộn, dự án sẽ khó mở rộng.

### Decision

Áp dụng **Clean Architecture** trong backend.

### Consequences

- Business logic độc lập hơn với framework.
- Dễ test use case và domain service.
- Dễ thay Gemini/OSRM/Weather provider bằng adapter khác.
- Cần kỷ luật package và naming ngay từ đầu.

---

## ADR-004: Chọn Modular Monolith trước Microservices

**Status:** Accepted

### Context

MVP cần phát triển nhanh trong khoảng thời gian ngắn. Microservices sẽ làm tăng độ phức tạp về deployment, networking, observability, data consistency và DevOps.

### Decision

Chọn **Modular Monolith** cho MVP và giai đoạn đầu.

### Consequences

- Tốc độ phát triển nhanh hơn.
- Dễ test end-to-end hơn.
- Vận hành đơn giản hơn.
- Vẫn có thể tách service sau này nếu module boundary rõ.
- Cần tránh coupling trực tiếp giữa các module.

---

## ADR-005: Chọn Redis cache

**Status:** Accepted

### Context

Dự án gọi nhiều API ngoài như Gemini, OSRM, Weather và có các endpoint có thể bị gọi lặp lại. Cần giảm latency, giảm cost và hỗ trợ rate limiting.

### Decision

Chọn **Redis** cho cache nóng, rate limiting và dữ liệu tạm thời.

### Consequences

- Giảm số lần gọi OSRM/Weather/Gemini trong các tình huống có thể cache.
- Hỗ trợ rate limiting theo user/IP/token.
- Cần thiết kế key rõ ràng và TTL hợp lý.
- Không dùng Redis làm nguồn dữ liệu chính.

---

## ADR-006: Chọn REST API versioning theo `/api/v1`

**Status:** Accepted

### Context

Dự án có web client và mobile client. API cần ổn định, dễ versioning khi sản phẩm phát triển.

### Decision

Tất cả API public dùng prefix **`/api/v1`**.

### Consequences

- Dễ maintain backward compatibility.
- Dễ tách tài liệu API theo version.
- Khi có thay đổi breaking change, có thể thêm `/api/v2`.
- Cần tránh endpoint không version ở production.

---

## ADR-007: Chọn OAuth2 + JWT access token ngắn hạn + refresh token rotation

**Status:** Accepted

### Context

Dự án cần authentication an toàn cho web/mobile. JWT giúp API stateless với access token, nhưng refresh token cần kiểm soát để giảm rủi ro bị đánh cắp.

### Decision

Sử dụng **OAuth2** cho đăng nhập qua provider khi cần, **JWT access token ngắn hạn**, và **refresh token rotation**.

### Consequences

- Access token ngắn hạn giảm tác hại nếu bị lộ.
- Refresh token rotation giúp phát hiện reuse token.
- Refresh token cần lưu hash trong database và có cơ chế revoke.
- Auth phức tạp hơn JWT đơn giản, nhưng phù hợp sản phẩm thật.

---

## ADR-008: Chọn Object Storage + CDN cho media/static assets

**Status:** Accepted

### Context

Dự án có thể lưu ảnh địa điểm, ảnh khách sạn, icon, static assets hoặc media phục vụ client. Backend không nên phục vụ file nặng trực tiếp khi scale.

### Decision

Chọn **Object Storage + CDN** cho media/static assets.

### Consequences

- Giảm tải backend.
- Tăng tốc độ tải ảnh/static assets cho người dùng.
- Dễ mở rộng dung lượng.
- Cần kiểm soát public/private object, signed URL nếu có tài nguyên riêng tư.

---

## ADR-009: Chọn OSRM + OpenStreetMap

**Status:** Accepted

### Context

Dự án cần bản đồ và tuyến đường thực tế nhưng muốn kiểm soát chi phí, tránh phụ thuộc hoàn toàn vào Google Maps.

### Decision

Chọn **OpenStreetMap** làm nền tảng bản đồ/POI mở bổ sung, và **OSRM** để tính route, distance, duration, geometry.

### Consequences

- Giảm rủi ro chi phí bản đồ.
- OSRM phù hợp tính route giữa các địa điểm trong itinerary.
- OSRM không cung cấp dữ liệu khách sạn/POI; dữ liệu POI phải đến từ Google Places, OSM/Overpass/Nominatim hoặc nguồn chính thức đã được phép.
- Cần cache route để tránh giới hạn demo server hoặc tự host OSRM khi cần.

---

## ADR-010: Chọn Queue cho tác vụ async trong tương lai

**Status:** Accepted

### Context

Một số tác vụ có thể mất thời gian: đồng bộ dữ liệu địa điểm, enrich dữ liệu từ nguồn ngoài, tạo ảnh cache, xử lý batch route, gửi email, tạo báo cáo.

### Decision

MVP chưa bắt buộc triển khai queue, nhưng kiến trúc phải chừa chỗ cho queue trong tương lai. Candidate có thể là RabbitMQ, Kafka, Redis Streams hoặc cloud managed queue tùy nhu cầu thật.

### Consequences

- Không làm phức tạp MVP ngay từ đầu.
- Các use case dài nên thiết kế có khả năng chuyển sang async.
- Khi thêm queue phải có retry, idempotency, dead-letter và monitoring.

---

## ADR-011: Chọn Flutter cho mobile

**Status:** Accepted

### Context

Dự án cần mobile client có thể chạy đa nền tảng. MVP backend và web đi trước, mobile phát triển sau nhưng phải được tính trong thiết kế API.

### Decision

Chọn **Flutter** cho mobile app.

### Consequences

- Một codebase cho Android/iOS.
- API backend phải độc lập client và không gắn với web-specific behavior.
- Auth flow cần phù hợp mobile, đặc biệt refresh token rotation và secure storage.
- Mobile MVP nên tập trung vào tạo/xem/lưu lịch trình, chưa cần admin.

---

## ADR-012: Chọn logging/monitoring từ đầu

**Status:** Accepted

### Context

Dự án phụ thuộc nhiều vào API ngoài và dữ liệu không gian. Khi lỗi xảy ra, cần biết lỗi đến từ input, Gemini, OSRM, Weather, database, cache hay client.

### Decision

Triển khai logging có cấu trúc từ đầu. Metrics và tracing được chuẩn bị trong thiết kế, triển khai chi tiết ở phase production readiness.

### Consequences

- Dễ debug lỗi external API và lỗi itinerary generation.
- Có nền tảng để theo dõi latency, error rate, cache hit rate, API cost.
- Cần mask secret/token trong log.
- Cần correlation ID/request ID khi backend foundation được tạo.

---

## ADR-013: Chọn Next.js làm web production và giữ mock React archive làm visual reference

**Status:** Superseded

### Context

Frontend web của TripWise ban đầu đã có mock UI lớn bằng React/Vite để chốt hướng giao diện. Sau đó roadmap Phase 12.x chốt hướng triển khai production bằng Next.js trong thư mục `web/`. Nếu không ghi rõ quyết định này trong tài liệu, team rất dễ nhầm giữa việc chọn framework và việc giữ nguyên phong cách giao diện đã duyệt.

### Decision

Chọn `Next.js + TypeScript` làm codebase production cho web trong thư mục `web/`.

Giữ mock UI React/Vite cũ tại `web-archive-vite-ui/` làm nguồn tham chiếu visual chính cho các phase UI tiếp theo.

### Consequences

- Team chỉ phát triển production web trong app Next.js.
- Mock React/Vite không bị xóa vì vẫn cần làm chuẩn tham chiếu về layout, hierarchy và mood giao diện.
- Khi chuyển một màn hình từ mock sang production, implementation có thể thay đổi để phù hợp Next.js nhưng trải nghiệm hình ảnh phải giữ nhất quán với mock đã chốt.
- Tài liệu frontend cần ghi rõ sự phân biệt giữa `framework implementation` và `visual reference` để tránh hiểu sai scope.

---

## ADR-014: Chuyển web production sang ReactJS + Vite và dùng web/ làm codebase chính

**Status:** Accepted

### Context

Sau khi hoàn thành phần lớn Phase 12.x, yêu cầu mới của dự án là không tiếp tục dùng Next.js làm frontend production nữa. Giao diện React/Vite trong `web-archive-vite-ui/` đã là nguồn UI gần với production hơn, trong khi phần code hiện tại ở `web/` cũng đã tách frontend độc lập khỏi backend và không cần SSR cho scope MVP.

### Decision

Chọn `ReactJS + Vite + TypeScript` làm framework production chính cho web trong thư mục `web/`.

Migrate router, bootstrap và source UI cần thiết từ `web-archive-vite-ui/` vào `web/`, đồng thời giữ `web-archive-vite-ui/` như archive/source tham chiếu của giao diện đã duyệt.

### Consequences

- Frontend production không còn phụ thuộc vào Next.js để build/chạy.
- Routing web production dùng React Router thay cho Next.js App Router.
- Biến môi trường frontend chuẩn hóa theo Vite, dùng `VITE_API_BASE_URL`.
- Tài liệu kỹ thuật frontend phải cập nhật để tránh tiếp tục chỉ dẫn phát triển theo Next.js.

---

## ADR-015: Geofabrik làm primary POI source; Overpass chỉ cho batch enrichment/dry-run

**Status:** Accepted

### Context

TripWise cần nguồn dữ liệu POI ổn định, có thể import offline, không phụ thuộc runtime API public. Overpass public server có rate limit và không phù hợp cho production traffic.

### Decision

- **Geofabrik Vietnam Extract** là primary source cho dữ liệu POI nền của TripWise.
- **OpenStreetMap/Overpass** chỉ được dùng cho batch enrichment, dry-run tag exploration, debug mapping, và backfill có kiểm soát — không được dùng làm runtime dependency production.
- Public API của TripWise không gọi external POI APIs tại runtime.
- Source of truth là PostgreSQL + PostGIS nội bộ.

### Consequences

- Giảm rủi ro rate limit, outage từ external API.
- Dữ liệu POI có thể được import, enrich, và kiểm duyệt trước khi public.
- Overpass vẫn có ích cho audit và enrichment batch nhưng không ảnh hưởng production availability.
- Cần pipeline download + import Geofabrik định kỳ.

---

## ADR-016: TripWise targets nationwide POI coverage across ATTRACTION, FOOD, HOTEL, SERVICE

**Status:** Accepted

### Context

MVP ban đầu tập trung Nha Trang, nhưng sản phẩm cần dữ liệu du lịch toàn Việt Nam. Việc chỉ giới hạn một vài thành phố sẽ hạn chế giá trị sản phẩm và khả năng mở rộng.

### Decision

TripWise nhắm mục tiêu phủ POI toàn quốc (63 tỉnh/thành) với 4 PlaceType chính:

- **ATTRACTION** — điểm tham quan du lịch
- **FOOD** — ẩm thực (là travel POI hợp lệ, không đổi thành ATTRACTION)
- **HOTEL** — lưu trú
- **SERVICE** — dịch vụ du lịch bổ trợ

TP.HCM và Nha Trang là pilot/debug case để kiểm tra pipeline import, moderation rules và chất lượng dữ liệu trước khi mở rộng toàn quốc.

### Consequences

- Pipeline import và moderation phải thiết kế cho scale toàn quốc ngay từ đầu.
- Mỗi PlaceType có quality score threshold riêng cho auto-public.
- Dữ liệu OSM Việt Nam không đồng đều — cần audit từng vùng trước khi mở rộng auto-public.
- Batch rollout theo province/city, không chạy toàn quốc không kiểm soát.
