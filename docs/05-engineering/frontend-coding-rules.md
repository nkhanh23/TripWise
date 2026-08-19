# Frontend Coding Rules - TripWise Admin Portal

Bộ quy tắc lập trình bắt buộc áp dụng cho Web Admin Portal (`web/`) của TripWise (theo [ADR-014](../../DECISIONS.md#adr-014-chuyen-web-production-sang-reactjs--vite-va-dung-web-lam-codebase-chinh) & [ADR-017](../../DECISIONS.md#adr-017-react-native--typescript-as-primary-mobile-client)).

---

## 1. Framework Boundary & Role

- **Trọng tâm sản xuất**: `web/` là **TripWise Admin Portal** (hệ thống quản trị nội bộ), xây dựng bằng **ReactJS + Vite + TypeScript**.
- **User Screens Classification**: Các màn hình user-facing cũ (Landing, PlanTrip, TripResult, Explore, SavedTrips) được giữ nguyên mã nguồn làm visual reference / legacy / preview tool cho Admin, không xóa code.
- **Routing**: Sử dụng `react-router-dom` cho các tuyến đường quản trị `/admin/*` và hệ thống.

---

## 2. Kết nối API & Client Wrapper

- Bắt buộc sử dụng Axios client instance tập trung (`web/src/lib/api/`).
- Cấu hình API base URL thông qua biến môi trường chuẩn của Vite: `VITE_API_BASE_URL`.
- Không hardcode URL backend trong component.

---

## 3. Token & Bảo mật

- Tự động gắn JWT Access Token qua Axios Request Interceptor.
- Tự động xử lý Silent Refresh Token qua Axios Response Interceptor khi gặp mã `401`.
- Web Admin Portal tuyệt đối không gọi trực tiếp Gemini API, OSRM API hay Weather API; mọi request đều phải đi qua Backend Spring Boot `/api/v1/`.
- Không hardcode secret hoặc commit file `.env` thật lên Git.
- Bảo vệ các tuyến đường quản trị với Role-Based Access Control (`ROLE_ADMIN`).

---

## 4. UX & Component States

- Mọi thao tác tải dữ liệu (Place review list, Ingestion stats, Staging moderation) phải có Skeleton / Loading state rõ ràng.
- Nút submit, phê duyệt, từ chối dữ liệu phải có trạng thái disabled/pending để tránh double submit.
- Thông báo lỗi hiển thị rõ ràng, chuyên nghiệp cho người quản trị.

---

## 5. Rendering, Performance & Maps

- Tách biệt component bản đồ (Leaflet / MapLibre) thành module riêng biệt (`MapCanvas`, `TripLeafletMap`, `TripMapLibreMap`).
- Tối ưu hóa hiệu năng render bảng dữ liệu lớn với phân trang (Pagination).
- Ảnh hiển thị qua CDN hoặc URL tối ưu.
