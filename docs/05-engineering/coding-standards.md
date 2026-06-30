# General Coding Standards - AI Smart Travel Planner

Tài liệu này xác lập các tiêu chuẩn lập trình chung áp dụng cho toàn bộ dự án, bao gồm cả Backend, Frontend và Mobile.

---

## 1. Quy chuẩn đặt tên (Naming Conventions)
- **Tên lớp (Classes/Structs)**: Sử dụng **PascalCase** (ví dụ: `GenerateTripUseCase`, `PlaceController`).
- **Tên biến & Tên hàm (Variables/Methods)**: Sử dụng **camelCase** (ví dụ: `startDate`, `calculateRoute()`).
- **Tên hằng số (Constants)**: Sử dụng **UPPER_SNAKE_CASE** (ví dụ: `MAX_TRIP_DAYS`, `DEFAULT_SRID`).
- **Tên tệp tin (Files/Folders)**:
  - Backend (Java): Khớp với tên Class (PascalCase).
  - Frontend (React): Kebab-case cho thư mục và component không chứa UI, PascalCase cho UI Component (ví dụ: `TravelMap.jsx`).
  - Mobile (Flutter/Dart): Snake_case cho mọi file (ví dụ: `trip_detail_screen.dart`).

---

## 2. Thiết kế cấu trúc thư mục & Module
- Tuyệt đối tuân thủ ranh giới module của cấu trúc **Modular Monolith** và 4 lớp **Clean Architecture**.
- Không được import chéo hoặc tham chiếu chéo giữa các tầng mà không thông qua Ports/Interfaces.
- Các hàm tiện ích dùng chung (Utilities) không được chứa logic nghiệp vụ và phải đặt tại thư mục `shared/utils` hoặc `shared/domain`.

---

## 3. Quy tắc xử lý lỗi (Global Error Standards)
- Mọi API trả về lỗi phải đi qua bộ xử lý lỗi tập trung để chuẩn hóa định dạng Error Response Envelope.
- Cấm in stack trace thô của hệ thống ra ngoài API client.
- Ghi log lỗi có đầy đủ Correlation ID phục vụ truy vết.

---

## 4. Quy chuẩn kiểm thử (Testing Standards)
- **Unit Test**: Bắt buộc viết cho tất cả các domain services, use cases và tiện ích xử lý toán học/địa lý.
- **Integration Test**: Viết cho Persistence Adapter (database, PostGIS queries) và External API Adapter (Gemini, OSRM, Weather).
- Định hướng tự động hóa chạy test khi có Pull Request.

---

## 5. Tiêu chuẩn bảo mật & Hiệu năng cốt lõi
- **Bảo mật**:
  - Không hardcode API key, password hay token.
  - Sử dụng tham số hóa (Parameterized Query) hoặc Hibernate JPA để chống lỗi SQL Injection.
  - Mã hóa dữ liệu nhạy cảm (bcrypt cho password, sha-256 cho refresh token).
- **Hiệu năng**:
  - Tận dụng tối đa bộ đệm Redis cho dữ liệu đọc nhiều.
  - Tối ưu hóa truy vấn không gian bằng chỉ mục GIST.
  - Giảm thiểu kích thước payload trả về client.
