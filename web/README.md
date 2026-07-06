# Web Guide - AI Smart Travel Planner

Tài liệu này đặc tả quy chuẩn phát triển dành cho cấu phần **Web Frontend** của dự án AI Smart Travel Planner.

---

## 1. Công nghệ & Kết nối API
- **Công nghệ chính**: **ReactJS + Vite + TypeScript**, sử dụng Vanilla CSS để thiết kế giao diện hiện đại, cao cấp.
- **API Client**: Sử dụng Axios instance được cấu hình tập trung.
- **Token Authorization**: Tự động chèn JWT Access Token vào header `Authorization: Bearer <token>` thông qua Axios Request Interceptor.
- **Silent Refresh**: Sử dụng Axios Response Interceptor bắt lỗi `401 Unauthorized` để tự động gọi API `/api/v1/auth/refresh` gia hạn token ngầm, tránh gián đoạn trải nghiệm của người dùng.

---

## 2. Quy tắc bảo mật & Quản lý Token
- **Lưu trữ Access Token**: Lưu trữ trong Memory (Redux/Context API). Tuyệt đối không lưu trong LocalStorage/SessionStorage để phòng chống lỗi XSS.
- **Lưu trữ Refresh Token**: Backend thiết lập tự động vào **HttpOnly, Secure, SameSite=Strict Cookie** của trình duyệt.
- **Cấm gọi API ngoài trực tiếp**: Web client cấm gọi trực tiếp sang Gemini API, OSRM API hay Weather API. Mọi yêu cầu phải gửi qua proxy API của Spring Boot.

---

## 3. Tối ưu hóa UI/UX & Request
- **Chống spam API**:
  - Áp dụng kỹ thuật **Debounce** (trì hoãn 300 - 500ms) khi người dùng gõ tìm kiếm địa điểm du lịch.
  - Vô hiệu hóa (disable) nút bấm "Tạo lịch trình" ngay sau khi click chuột để chặn double submit (tránh tốn chi phí AI 2 lần).
- **Trạng thái tải (Loading/Error States)**:
  - Hiển thị Shimmer/Skeleton Screen trong lúc chờ API phản hồi lịch trình.
  - Hiển thị thông điệp lỗi tiếng Việt thân thiện, che giấu các chi tiết lỗi kỹ thuật thô của server.
- **Bản đồ Leaflet**: Bản đồ OpenStreetMap được đóng gói vào một Component riêng biệt (`TravelMap.jsx`). Marker và Polyline di chuyển được vẽ thông qua GeoJSON nhận từ backend.
- **Media CDN**: Tải hình ảnh địa điểm du lịch thông qua đường dẫn CDN (Cloudflare) để giảm độ trễ tải trang.

---

## 4. Cách khởi chạy dự án cục bộ (Local Run)
Frontend production chính nằm trong thư mục `web/`. Source UI ban đầu từ `web-archive-vite-ui/` đã được migrate vào đây.

```bash
npm install
npm run dev
```
Ứng dụng Web chạy local mặc định lắng nghe tại cổng `5173`.
