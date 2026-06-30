# Frontend Coding Rules - AI Smart Travel Planner

Bộ quy tắc lập trình bắt buộc áp dụng đối với mã nguồn Web Frontend (ReactJS / Next.js).

---

## 1. Kết nối API & Custom Client Wrapper
- **API Client**: Bắt buộc sử dụng một Axios instance hoặc Fetch wrapper cấu hình tập trung.
- **Tự động gắn Token**: Tự động chèn JWT Access Token vào header `Authorization: Bearer <token>` đối với các API yêu cầu xác thực.
- **Xử lý gia hạn (Silent Refresh)**: Thiết lập bộ chặn (Axios Interceptor) để tự động bắt lỗi `401 Unauthorized`. Khi gặp lỗi này, client tự động gọi `/api/v1/auth/refresh` để lấy Access Token mới và thử gửi lại request cũ mà không bắt người dùng đăng nhập lại (silent refresh).

---

## 2. Quản lý Token & Bảo mật
- **Access Token**: Lưu trữ trong bộ nhớ RAM ứng dụng (Application State/Context). Không lưu trữ Access Token trong LocalStorage hoặc SessionStorage để chống lỗi lộ lọt token qua tấn công XSS.
- **Cấm gọi API ngoài trực tiếp**: Web client tuyệt đối không được gọi trực tiếp sang Gemini API, OSRM API hoặc Weather API. Mọi cuộc gọi phải đi qua proxy API của Spring Boot để bảo vệ khóa bí mật (API Keys).

---

## 3. Trải nghiệm người dùng: Loading, Error & Input Optimization
- **Trạng thái tải (Loading/Error States)**:
  - Tất cả các thao tác tương tác có độ trễ lớn (như sinh lịch trình) phải hiển thị màn hình loading/skeleton rõ ràng kèm thông điệp cụ thể (ví dụ: *"Đang chọn địa điểm..."*, *"Đang tính tuyến đường..."*).
  - Hiển thị thông báo lỗi thân thiện với người dùng cuối, ẩn các chi tiết lỗi kỹ thuật thô.
- **Chống spam API**:
  - Áp dụng kỹ thuật **Debounce** (trì hoãn 300 - 500ms) trên các ô tìm kiếm địa điểm để tránh việc gửi API request liên tục sau mỗi ký tự người dùng gõ.
  - Vô hiệu hóa (disable) nút bấm "Tạo lịch trình" hoặc "Lưu lịch trình" ngay sau khi click chuột cho đến khi nhận được phản hồi để tránh gửi request trùng lặp (double submit).

---

## 4. Map & Media Rules
- **Map Component**: Tách biệt bản đồ Leaflet thành một Component độc lập (`TravelMap.jsx`). Truyền dữ liệu vào qua Props (markers, route coordinates) để dễ tái sử dụng và kiểm thử.
- **Sử dụng CDN cho hình ảnh**: URL hình ảnh hiển thị trên card địa điểm phải sử dụng đường dẫn CDN (Cloudflare), không tải ảnh gốc dung lượng lớn trực tiếp từ Object Storage để tiết kiệm băng thông.
