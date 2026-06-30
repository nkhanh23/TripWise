# Flutter Coding Rules - AI Smart Travel Planner

Bộ quy tắc lập trình bắt buộc áp dụng đối với mã nguồn ứng dụng di động Flutter.

---

## 1. Nguyên tắc kết nối API & Bảo mật Token
- **Chỉ gọi Spring Boot API**: Ứng dụng Flutter tuyệt đối không được gọi trực tiếp sang các API của bên thứ ba (Gemini, OSRM, Weather). Mọi yêu cầu tạo chuyến đi hay đọc thời tiết phải gửi qua endpoint `/api/v1/` của Spring Boot backend.
- **Lưu trữ Token an toàn (Secure Storage)**: 
  - Access Token và Refresh Token phải được lưu trữ trong bộ nhớ mã hóa bảo mật của hệ điều hành sử dụng gói thư viện `flutter_secure_storage` (sử dụng Keychain trên iOS và Keystore/AES trên Android).
  - Tuyệt đối không lưu token dạng plaintext trong tệp Shared Preferences hoặc Shared Documents thông thường.

---

## 2. Quản lý trạng thái & Trải nghiệm ngoại tuyến (Offline Cache)
- **State Management**: Khuyến nghị sử dụng **BLoC (Business Logic Component)** hoặc **Riverpod** làm bộ quản lý trạng thái của ứng dụng di động để phân tách rõ ràng giao diện UI và logic gọi API.
- **Bộ nhớ đệm ngoại tuyến (Offline Database)**:
  - Hiện thực lưu trữ cục bộ các lịch trình du lịch người dùng đã bấm lưu sử dụng thư viện **SQLite (sqflite)** hoặc **Hive**.
  - Khi người dùng di chuyển tại Nha Trang trong điều kiện mất mạng/sóng yếu, app tự động tải dữ liệu lịch trình từ DB cục bộ (offline snapshot) để hiển thị thông tin thay vì báo lỗi mất mạng.

---

## 3. UI/UX: Loading, Retry & Infinite Scroll
- **Tải trang & Thử lại (Loading/Retry)**:
  - Hiển thị widget Shimmer Loading thay cho vòng quay tròn đơn điệu khi đang fetch dữ liệu.
  - Có nút "Thử lại" (Retry Button) khi gặp lỗi mất kết nối mạng.
- **Hiển thị danh sách lớn (Infinite Scroll)**:
  - Danh sách các lịch trình đã lưu phải được hiển thị dưới dạng Lazy Loading / Infinite Scroll kết hợp với phân trang API backend, không tải toàn bộ danh sách một lúc gây tốn RAM của điện thoại.

---

## 4. Bản đồ & Tối ưu hóa hiệu năng di động
- **Bản đồ**: Sử dụng thư viện `flutter_map` (dựa trên Leaflet và OpenStreetMap tiles) để đồng bộ giao diện bản đồ với phiên bản Web, tránh sử dụng SDK Google Maps độc quyền.
- **Tối ưu hóa hiệu năng (Performance)**:
  - Sử dụng từ khóa `const` trước các Widget tĩnh để tránh widget bị render lại (rebuild) không cần thiết khi state thay đổi.
  - Sử dụng thư viện `cached_network_image` để tự động cache ảnh địa điểm CDN xuống bộ nhớ của máy, giới hạn kích thước render của ảnh (width/height) để tránh tràn bộ nhớ GPU của điện thoại yếu.
