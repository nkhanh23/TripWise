# Mobile Guide - AI Smart Travel Planner

Tài liệu này đặc tả quy chuẩn phát triển dành cho cấu phần **Mobile Client (Flutter)** của dự án AI Smart Travel Planner.

---

## 1. Công nghệ & Ranh giới kết nối
- **Công nghệ**: **Flutter SDK (Dart)** phát triển đa nền tảng cho Android và iOS.
- **Ranh giới API**: Ứng dụng di động chỉ được kết nối trực tiếp tới Spring Boot API thông qua cổng `/api/v1/`. Tuyệt đối không nhúng hoặc gọi trực tiếp API Key của Gemini, OSRM hay Weather trên code mobile để tránh rò rỉ bảo mật khi dịch ngược file APK/IPA.

---

## 2. Quy tắc lập trình & Quản lý Token trên di động
- **Lưu trữ Token an toàn (Secure Storage)**: 
  - Sử dụng thư viện `flutter_secure_storage` để lưu mã hóa Access Token và Refresh Token vào phân vùng an toàn của hệ điều hành (Keychain của iOS và Keystore của Android).
- **Bộ nhớ đệm ngoại tuyến (Offline Database)**:
  - Tích hợp **SQLite (sqflite)** hoặc **Hive** để lưu trữ cấu trúc lịch trình (itinerary snapshot) của các chuyến đi đã lưu.
  - Khi thiết bị mất sóng hoặc chạy offline, app tự động chuyển sang đọc dữ liệu lưu trữ cục bộ thay vì báo lỗi mất mạng, nâng cao trải nghiệm người dùng thực địa.
- **State Management**: Khuyến nghị sử dụng **BLoC** hoặc **Riverpod** để tách biệt luồng UI và nghiệp vụ gọi API.

---

## 3. Tối ưu hóa hiệu năng & UX di động
- **Performance**:
  - Sử dụng từ khóa `const` trước các Widget tĩnh để tránh widget bị render lại (rebuild) không cần thiết khi state thay đổi.
  - Sử dụng `CachedNetworkImage` để tự động cache ảnh CDN xuống bộ nhớ của máy, giới hạn kích thước render của ảnh (width/height) để tránh tràn bộ nhớ GPU của thiết bị di động cấu hình yếu.
- **UX di động**:
  - Phân trang (Pagination) thông qua Lazy Loading / Infinite Scroll khi hiển thị danh sách các chuyến đi đã lưu.
  - Có nút "Thử lại" (Retry Button) rõ ràng khi gặp lỗi mất kết nối mạng và hiển thị widget Shimmer Loading trong lúc fetch API.
  - Bản đồ: Sử dụng thư viện `flutter_map` trỏ vào OpenStreetMap tiles để đồng bộ hiển thị Polyline route và Marker.

---

## 4. Cách khởi chạy dự án cục bộ (Local Run)
*(Hướng dẫn chạy sau khi thư mục project mobile được tạo)*
```bash
flutter pub get
flutter run
```
Ứng dụng sẽ khởi chạy trình giả lập Android Emulator hoặc iOS Simulator để lập trình viên kiểm thử.
