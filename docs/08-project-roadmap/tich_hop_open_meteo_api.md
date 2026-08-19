# Antigravity Phase Tracking

> **[BẮT BUỘC ĐỌC] AGENT RULES REMINDER TẠI MỖI PROMPT:**
> * **Luôn đọc** `AGENTS.md`, `ai-rules.md`, `TASKS.md` và tuân thủ tuyệt đối trước khi viết code.
> * **Bảo mật & Quy chuẩn:** Không hardcode API key, tuân thủ Clean Architecture và cấu trúc thư mục quy định.
> * **Giao diện (Frontend):** Sửa Next.js App Router sao cho khớp 100% layout, style, animation với Mock React cũ (`web-archive-vite-ui`). Không tự ý redesign.
> * **Hệ thống (Backend):** Sử dụng PostgreSQL + PostGIS làm nguồn sự thật (Source of truth). Các external APIs (Open-Meteo, OSRM) cần cấu hình caching, timeout, circuit breaker.
> * **Cập nhật tiến độ:** Khi hoàn thành bất kỳ một sub-task nào dưới đây, agent phải tự động cập nhật file này và chuyển `[ ]` thành `[x]`.

---

## Lộ Trình Triển Khai Chi Tiết (Active Phase)

### 1. Backend: Tích hợp Dữ liệu Thời tiết (Open-Meteo API)
- [x] P10-T002.1: Định nghĩa cấu trúc JSON rút gọn để ánh xạ dữ liệu (Summary DTO) tránh vượt quá token của Gemini.
- [x] P10-T002.2: Implement `OpenMeteoAdapter` trong Spring Boot với RestTemplate / WebClient.
- [x] P10-T002.3: Xây dựng cơ chế Resilience (Circuit Breaker, Fallback, Timeout) bằng Resilience4j.
- [x] P10-T004: Tích hợp và cấu hình `WeatherCache` (TTL, Invalidation) vào PostgreSQL bằng JPA.
- [x] P10-T003: Xây dựng Rule Logic để tự động điều chỉnh lịch trình chuyến đi dựa vào điều kiện thời tiết (Nắng/Mưa/Bão).

### 2. Frontend: Khôi phục Giao diện Next.js theo Mock React (Phase 11 & 12)
- [x] P11-T002: Khôi phục Layout Landing Page (`web/src/app/page.tsx`).
- [x] P11-T003: Migrate toàn bộ các Motion Components (`PopText.tsx`, `KineticTitle.tsx`, v.v.).
- [x] P11-T004: Khôi phục luồng Auth & Dashboard (`/login`, `/register`, `/dashboard`).
- [x] P11-T005: Khôi phục bản đồ và khám phá địa điểm (`/explore`, `MapPanel`, `MapMarker`).
- [x] P11-T006: Khôi phục giao diện Lập Lịch Trình (Trip Planner) và Chi tiết Chuyến Đi (`/trip/[id]`).
- [x] P11-T007: Khôi phục các trang hệ thống (`/unauthorized`, `/forbidden`, `not-found`).

### 3. Quy trình Kiểm thử & Xác nhận (Definition of Done)
- [x] Backend: Toàn bộ Unit Test và Integration Test pass (`mvn clean test`).
- [x] Frontend: `npm run lint` và `npm run build` không xuất hiện lỗi hay cảnh báo nghiêm trọng.
- [x] Security: Đã kiểm tra không có secret bị lộ trong source code, JWT flow an toàn.