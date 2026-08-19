# Web Guide - TripWise Web [LEGACY / SCHEDULED FOR REMOVAL]

> **THÔNG BÁO KIẾN TRÚC (ADR-018):**
> Do TripWise đã chính thức chuyển đổi sang **Ứng dụng di động cá nhân (Personal AI Travel Mobile App)**, hệ thống Web Admin Portal (`web/` & `web-archive-vite-ui/`) hiện ở trạng thái **Legacy / Scheduled for removal**.
> Toàn bộ mã nguồn web được giữ lại tạm thời làm tài liệu tham chiếu giao diện (visual reference) và sẽ được xóa bỏ theo lộ trình D-series sau khi hoàn tất kiểm thử ứng dụng di động. Tuyệt đối không phát triển thêm tính năng mới trên codebase web.

---

## 1. Vai trò lịch sử của Web Client
- Ban đầu là Web Admin Portal cho công tác quản trị, kiểm duyệt dữ liệu địa điểm nội bộ (theo ADR-014 & ADR-017).
- Đã được đóng băng hoàn toàn theo quyết định tinh giản kiến trúc [ADR-018](../DECISIONS.md#adr-018-simplify-tripwise-into-a-personal-mobile-app-using-supabase).
  - **Admin Authentication**: Đăng nhập tài khoản quản trị viên với JWT Role-Based Access Control (`ROLE_ADMIN`).
  - **Admin Dashboard** (`AdminDashboardPage`): Báo cáo thống kê số lượng POI, pipeline status, review queue.
  - **Place Management & Review** (`AdminPlacesReviewPage`): Quản lý danh mục địa điểm, duyệt sửa thông tin, tọa độ, danh mục, trạng thái hoạt động.
  - **Staging Moderation** (`AdminStagingModerationPage`): Kiểm duyệt dữ liệu POI từ pipeline nhập thô (Geofabrik, Overpass, external sources), phê duyệt publish vào production database.
  - **City/Province Ingestion Pipeline** (`AdminCityPipelinePage`): Giám sát tiến trình import và moderation theo từng tỉnh/thành phố trên 63 tỉnh/thành Việt Nam.
  - **System Monitoring**: Giám sát cache, background schedulers, API health checks.

- **Phân loại các màn hình người dùng hiện tại (User Pages Classification)**:
  - Các màn hình người dùng đã xây dựng trong `web/` (như `LandingPage`, `PlanTripPage`, `TripResultPage`, `TripDetailPage`, `SavedTripsPage`, `ExplorePlacesPage`, `FavoritesPlacesPage`):
    - **Trạng thái**: `Legacy / Visual Reference / Candidate for admin preview or removal`.
    - **Quy tắc bảo toàn**: **Không được xóa** các file mã nguồn này khỏi repository. Chúng tiếp tục đóng vai trò chuẩn tham chiếu thị giác (visual/design reference), logic contract mẫu và có thể tái sử dụng một phần cho công cụ preview lịch trình của Admin.

---

## 2. Công nghệ & Kết nối API
- **Công nghệ chính**: **ReactJS + Vite + TypeScript**, thiết kế giao diện module CSS hiện đại.
- **API Client**: Axios instance tập trung (`web/src/lib/api/`).
- **Token Authorization**: Tự động chèn JWT Access Token vào header `Authorization: Bearer <token>` thông qua Axios Request Interceptor.
- **Silent Refresh**: Sử dụng Axios Response Interceptor bắt lỗi `401 Unauthorized` để tự động gọi API `/api/v1/auth/refresh` gia hạn token ngầm.
- **Cấm gọi API ngoài trực tiếp**: Web client cấm gọi trực tiếp sang Gemini API, OSRM API hay Weather API. Mọi yêu cầu phải gửi qua backend Spring Boot `/api/v1/`.

---

## 3. Quy tắc bảo mật & Quản lý Token
- **Lưu trữ Access Token**: Lưu trữ trong Memory (Context API / State).
- **Lưu trữ Refresh Token**: Phối hợp với cơ chế refresh token rotation của Backend.
- **Phân quyền Route (RBAC)**: Các route `/admin/*` bắt buộc yêu cầu quyền `ROLE_ADMIN`, tự động điều hướng sang màn hình Unauthorized / Forbidden khi không đủ quyền.

---

## 4. Cách khởi chạy dự án cục bộ (Local Run)

```bash
# Cài đặt dependencies
npm install

# Khởi chạy dev server
npm run dev

# Build kiểm tra kiểu và bundle production
npm run build
```
Ứng dụng Web chạy local mặc định lắng nghe tại cổng `5173`.
