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

**Status:** Superseded by ADR-017

> **Lưu ý lịch sử:** Quyết định này đã bị thay thế bởi **ADR-017**. TripWise chuyển sang sử dụng **React Native + TypeScript** làm mobile client chính cho người dùng cuối.

### Context

Dự án cần mobile client có thể chạy đa nền tảng. MVP backend và web đi trước, mobile phát triển sau nhưng phải được tính trong thiết kế API.

### Decision

Chọn **Flutter** cho mobile app (quyết định ban đầu).

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

---

## ADR-017: React Native + TypeScript as primary mobile client

**Status:** Accepted

### Context

- Mobile client ban đầu được định hướng bằng Flutter trong ADR-011, nhưng chưa có implementation code đáng kể nào ngoài tài liệu định hướng ban đầu.
- Web client hiện tại đã hoàn thiện và chuẩn hóa hoàn toàn trên stack **React + Vite + TypeScript**.
- Định hướng sản phẩm của TripWise chuyển dịch mạnh mẽ: **Mobile App là client chính dành cho người dùng cuối (End-User Client)** trên Android và iOS để phục vụ tạo lịch trình, khám phá địa điểm, xem bản đồ và truy cập lịch trình khi di chuyển ngoài thực địa.
- **Web client (React + Vite + TypeScript)** được tái định vị vai trò thành **TripWise Admin Portal (Internal Management Client)**, tập trung vào xác thực quản trị, dashboard thống kê, quản lý/kiểm duyệt địa điểm (Place Moderation), giám sát pipeline ingestion (City Pipeline), và quản lý hệ thống.
- Việc lựa chọn **React Native + TypeScript** cho mobile client mang lại sự thống nhất cao về hệ sinh thái ngôn ngữ (TypeScript-first across all frontend clients), giảm gánh nặng bảo trì đồng thời hai hệ sinh thái Dart/Flutter và JavaScript/TypeScript.
- Backend Spring Boot Clean Architecture đã được thiết kế hoàn toàn client-agnostic (`/api/v1`), phục vụ song song cho cả Mobile App và Admin Web Portal mà không bị ràng buộc bởi client framework.
- **Lưu ý về tái sử dụng:** React DOM components và CSS của Web Admin không thể copy-paste trực tiếp sang React Native do khác biệt về render tree (`<div>`/`<span>` vs `<View>`/`<Text>`) và layout engine (Flexbox engine Yoga). Tuy nhiên, các cấu phần sau có thể tái sử dụng hoặc chia sẻ trực tiếp:
  - TypeScript types, models và API contracts.
  - Validation schemas (Zod / Yup nếu có).
  - Business helper logic, formatting utilities (tiền tệ, ngày tháng, khoảng cách).
  - Auth models, token refresh interceptor logic abstraction.
  - Constants, design tokens và bảng màu (color palette, spacing scale).
- **Đánh giá về Expo tại thời điểm ADR-017:** Expo ban đầu được để ngỏ để đánh giá ở M0/M1. Quyết định này đã được chốt bởi **ADR-019** sau khi Expo project/config và Android development runtime được verify.

### Decision

1. Chọn **React Native + TypeScript** làm mobile client chính thức cho ứng dụng di động TripWise trên cả hai nền tảng Android và iOS (thay thế quyết định Flutter trong ADR-011).
2. Định vị **Mobile App là Primary End-User Client** của hệ thống TripWise.
3. Định vị **Web client (`web/` - ReactJS + Vite + TypeScript) là TripWise Admin Portal**, phục vụ nội bộ cho công tác quản trị, kiểm duyệt dữ liệu địa điểm và vận hành pipeline.

### Consequences

**Lợi ích:**
- Thống nhất ngôn ngữ và hệ sinh thái frontend toàn dự án sang **TypeScript**.
- Đội ngũ phát triển frontend có thể làm việc xuyên suốt giữa Admin Web Portal và Mobile App mà không cần học và duy trì runtime/toolchain Dart/Flutter.
- Dễ dàng chia sẻ contracts, types, validation và logic tiện ích.
- Định hướng sản phẩm mobile-first rõ ràng, tập trung trải nghiệm người dùng thực địa vào ứng dụng di động.

**Trade-offs & Rủi ro:**
- UI components và stylesheet giữa Web và Mobile không tái sử dụng trực tiếp được; phải xây dựng hệ thống component di động riêng theo chuẩn React Native.
- React Native có độ phức tạp về native build/linking (Gradle trên Android, CocoaPods/Xcode trên iOS) và quản lý native permissions (Location, Notifications).
- Cần kiểm tra cẩn thận compatibility của các thư viện native: Google Maps SDK, Secure Storage (`react-native-keychain` / `expo-secure-store`), Geolocation.
- Phải thiết kế UX/UI tối ưu riêng cho màn hình cảm ứng di động (touch targets, gesture, bottom sheet, bottom navigation, keyboard avoidance).

---

## ADR-018: Simplify TripWise into a Personal Mobile App using Supabase

**Status:** Accepted

### Context

- **Chuyển đổi định hướng sản phẩm:** TripWise chính thức chuyển đổi từ mô hình nền tảng du lịch công cộng (public platform/multi-user) sang **Ứng dụng di động cá nhân (Personal AI Travel Mobile App)** phục vụ trực tiếp cho chủ sở hữu.
- **Client duy nhất:** Mobile App (**React Native + TypeScript + Expo**, đã chốt trong [ADR-017](#adr-017-react-native--typescript-as-primary-mobile-client)) là sản phẩm duy nhất dành cho người dùng cuối. Hệ thống Web Admin Portal (`web/`) không còn cần thiết.
- **Thu gọn dữ liệu:** Không còn nhu cầu tự vận hành cơ sở dữ liệu POI toàn quốc với hàng triệu bản ghi và các pipeline phức tạp (Geofabrik, Overpass, Foursquare, Staging tables, Place Moderation, City Pipeline). Dữ liệu persistent cần lưu dài hạn thu gọn về:
  - `profiles`: Thông tin cá nhân người dùng.
  - `trips`: Danh sách các chuyến đi đã tạo.
  - `itinerary_days`: Lịch trình chi tiết theo từng ngày (kèm snapshot thời tiết).
  - `itinerary_items`: Chi tiết từng điểm dừng trong ngày.
  - `user_preferences` (tùy chọn): Sở thích du lịch mặc định.
- **Dữ liệu địa điểm linh hoạt:** Tận dụng Google Places API để tra cứu địa điểm, tìm kiếm, xem đánh giá, giờ mở cửa và hình ảnh tại runtime. Lịch trình chỉ snapshot các trường cốt lõi (`google_place_id`, `place_name`, `latitude`, `longitude`, `place_address`, `place_category`) để đảm bảo hiển thị và vẽ bản đồ ngoại tuyến mà không phụ thuộc 100% vào mạng.
- **Loại bỏ Overengineering:** Kiến trúc Backend Monolith Spring Boot (Java 21 + Clean Architecture) và Redis Cache là quá nặng nề để bảo trì đối với một ứng dụng cá nhân. Việc chuyển sang nền tảng Backend-as-a-Service (BaaS) với PostgreSQL quản lý sẵn là giải pháp tối ưu.

### Decision

1. **Chọn Supabase** làm nền tảng Backend-as-a-Service cho TripWise Personal Mobile App:
   - **Supabase Auth:** Xác thực người dùng (Email/Password với 1 tài khoản cá nhân).
   - **Supabase PostgreSQL:** Lưu trữ dữ liệu quan hệ (`profiles`, `trips`, `itinerary_days`, `itinerary_items`) được bảo vệ nghiêm ngặt bằng **Row Level Security (RLS)**.
   - **Supabase Edge Functions (Deno / TypeScript):** Đóng vai trò serverless backend proxy để bảo vệ các secret nhạy cảm:
     - Edge Function `generate-trip`: Nhận yêu cầu, gọi **Gemini API** với `GEMINI_API_KEY` được bảo mật, parse và validate schema lịch trình.
     - Edge Function `place-proxy` (nếu cần): Proxy an toàn cho Google Places Web Service.
2. **Định nghĩa trạng thái các cấu phần hiện tại:**
   - **Spring Boot Monolith (`backend/`):** Chuyển trạng thái thành `Legacy migration source`. Giữ nguyên mã nguồn để làm nguồn tham chiếu logic, porting AI prompt và export dữ liệu cũ. Sẽ xóa bỏ sau khi Mobile App hoạt động độc lập hoàn toàn.
   - **Web Frontend (`web/` & `web-archive-vite-ui/`):** Chuyển trạng thái thành `Legacy / scheduled for removal`. Giữ lại làm visual reference cho đến khi hoàn tất dọn dẹp.
   - **Redis & POI Pipeline:** Chuyển trạng thái thành `Legacy / scheduled for removal`.
3. **Kiến trúc External APIs:**
   - **Google Maps SDK:** Tích hợp trực tiếp trên React Native với Client API Key được giới hạn theo Android Package Name/SHA-1 và iOS Bundle ID.
   - **Open-Meteo API:** React Native gọi trực tiếp (miễn phí, không yêu cầu API key).
   - **OSRM Routing:** React Native gọi trực tiếp public routing endpoint cho nhu cầu cá nhân (kèm client timeout/fallback nếu server public bận).

### Consequences

**Lợi ích:**
- **Tối giản hạ tầng (Zero Server Maintenance):** Không cần thuê VPS, quản lý Docker container, bảo trì Redis hay chạy database migration thủ công.
- **Thống nhất TypeScript End-to-End:** Toàn bộ code logic từ React Native client đến Supabase Edge Functions đều sử dụng TypeScript.
- **Bảo mật chuẩn hóa:** Dữ liệu được bảo vệ bằng PostgreSQL Row Level Security (RLS); không có secret nào bị lộ trên mã nguồn client.
- **Tối ưu chi phí:** Phù hợp hoàn hảo với hạn mức sử dụng cá nhân (Supabase Free Plan, Gemini Developer API, Open-Meteo, và hạn mức sử dụng miễn phí hàng tháng theo từng SKU của Google Maps Platform).

**Trade-offs & Rủi ro:**
- Phụ thuộc vào dịch vụ đám mây Supabase (Vendor Managed Service).
- Cần chuyển đổi (porting) logic prompt builder và JSON validator từ Java sang TypeScript Edge Functions.
- OSRM public demo server không cam kết SLA, cần xử lý fallback vẽ polyline đơn giản hoặc thông báo khi timeout.
- Cần theo dõi hạn mức sử dụng Google Maps Platform / Google Places theo dõi định kỳ để kiểm soát chi phí.

---

## ADR-019: Expo workflow và Android là target implementation hiện tại

**Status:** Accepted

### Context

ADR-017 đã chọn React Native + TypeScript nhưng để ngỏ quyết định tooling Expo. Repository production hiện có evidence rõ ràng:

- `mobile/package.json` dùng Expo SDK 57, React Native 0.86 và TypeScript strict;
- app bootstrap qua `registerRootComponent`;
- native navigation dùng React Navigation, không dùng Expo Router;
- Expo development build (`expo-dev-client`) và generated Android project tồn tại;
- Android development build, Metro và runtime navigation đã được verify;
- local iOS runtime chưa được verify trong môi trường Windows hiện tại.

Repository đồng thời còn Dart/Flutter artifacts từ một nhánh thử nghiệm tài liệu/UI. Các artifacts này không được production React Native entry point, npm scripts hoặc Expo config sử dụng.

### Decision

1. Mobile production client là **React Native + TypeScript + Expo**.
2. Workflow chính dùng project-local Expo tooling qua npm/npx; không dùng global Expo CLI hoặc React Native CLI init.
3. Navigation hiện hành dùng **React Navigation**. Không tự chuyển sang Expo Router nếu chưa có ADR/task riêng.
4. **Android là target implementation, build và runtime verification hiện tại.**
5. Architecture, typed contracts và shared components phải giữ future compatibility với iOS; không thêm Android-only workaround nếu không có requirement rõ ràng.
6. ADR-011 và mọi Flutter-specific implementation roadmap/mapping là **superseded/historical**. Không xóa artifacts lịch sử trong documentation-only task; cleanup cần task riêng.

### Consequences

- Active mobile documentation và verification commands phải dựa trên `mobile/package.json`, Expo config và TypeScript source.
- Quality gate chuẩn là `npm run lint`, `npm run typecheck`, `npm test`, `npx expo-doctor`; Android native/runtime verification dùng `npm run android` khi phase yêu cầu.
- Không dùng Dart, Flutter tooling, `pubspec.yaml` hoặc `mobile/lib/` làm source of truth cho production mobile.
- iOS không được claim runtime PASS cho tới khi được build/test trong môi trường macOS/Xcode phù hợp.

---

## ADR-020: Theme (Light/Dark/System) & Localization (EN/VI) Architecture for React Native Mobile Frontend

**Status:** Accepted

### Context

TripWise Mobile Frontend đã hoàn thành các màn hình nền tảng cốt lõi (Auth, Explore, Place Detail, Route Preview, My Trips, Create Trip Wizard, Trip Detail & Itinerary). Khi số lượng màn hình và tính năng mở rộng tiếp tục (Add Place, Trip Map, Saved Places, Profile, Settings), việc thiếu một kiến trúc chuẩn hóa cho:
1. **Chế độ Sáng / Tối (Light Mode / Dark Mode / System Default)**
2. **Đa ngôn ngữ (English / Tiếng Việt)**

sẽ dẫn đến nợ kỹ thuật (technical debt) lớn, gây khó khăn cho việc retrofit về sau nếu để đến các phase cuối. Đồng thời, các chuỗi hiển thị và mã màu hex (`#FFFFFF`, `#000000`, `#0058BC`) đang xuất hiện rải rác trong một số feature components.

### Decision

1. **Chuẩn hóa kiến trúc Theme:**
   - Hỗ trợ 3 tùy chọn: **System** (tự động theo hệ điều hành), **Light** (bám sát Google Stitch), và **Dark** (chế độ tối phái sinh ngữ nghĩa theo WCAG AA).
   - Sử dụng **Semantic Color Tokens** (`background.canvas`, `background.surface`, `text.primary`, `text.secondary`, `brand.primary`, `border.default`, `icon.primary`, v.v.). Cấm dùng raw hex colors trong feature components mới.
   - Google Stitch tiếp tục là source of truth tối cao về visual hierarchy, layout geometry, iconography, và Light Mode. Dark Mode phái sinh màu sắc mà không thay đổi cấu trúc component.
   - Giữ nguyên 100% danh tính icon (`MaterialIcons`), theme switching chỉ thay đổi màu sắc icon.
2. **Chuẩn hóa kiến trúc Localization:**
   - Hỗ trợ chính thức 2 ngôn ngữ: **English (`en`)** và **Tiếng Việt (`vi`)**.
   - Quản lý chuỗi hiển thị tập trung với hệ thống khóa ngữ nghĩa phân cấp (`common.*`, `navigation.*`, `auth.*`, `trips.*`, `planner.*`, v.v.). Cấm viết điều kiện ngôn ngữ inline trong JSX.
   - Xây dựng ranh giới định dạng tập trung (Formatting Boundary) cho ngày tháng, số liệu và tiền tệ; tách biệt độc lập giữa Ngôn ngữ hiển thị và Đơn vị tiền tệ.
   - Thiết kế layout co giãn linh hoạt (flex, padding, text wrapping), không fix cứng chiều rộng chỉ vừa cho tiếng Anh và không thu nhỏ cỡ chữ tiếng Việt tùy tiện.
3. **Chiến lược Di chuyển & Roadmap:**
   - Bổ sung checkpoint kiến trúc `FE-CROSSCUT-001 — Theme & Localization Foundation` ngay sau FE Phase 10.
   - Không reset hay mở lại các phase FE đã hoàn thành (FE-P0 đến FE-P10 vẫn giữ nguyên trạng thái COMPLETED).
   - Di chuyển dần các shared primitives, navigation, và các màn hình đã hoàn thành trong khuôn khổ checkpoint `FE-CROSSCUT-001`.
   - Các phase mới từ FE-P11 trở đi bắt buộc áp dụng trực tiếp Theme & i18n từ lúc tạo mới.
   - FE Phase 15 (Settings UI) sẽ đóng vai trò xây dựng giao diện người dùng để cấu hình Theme / Language / Currency.

### Consequences

- Tránh việc đập đi làm lại hoặc refactor quy mô lớn ở giai đoạn cuối dự án.
- Codebase đồng nhất, có cấu trúc ngữ nghĩa rõ ràng, thân thiện với người dùng song ngữ.
- Cần hoàn thành checkpoint `FE-CROSSCUT-001` trước khi bắt đầu FE-P11 để đảm bảo các component mới được viết đúng chuẩn ngay từ đầu.


