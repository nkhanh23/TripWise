# Testing Strategy - AI Smart Travel Planner

Tài liệu này định hình chiến lược kiểm thử tự động và kiểm thử thủ công cho dự án.

---

## 1. Cơ cấu phân tầng kiểm thử (Testing Hierarchy)

Hệ thống áp dụng mô hình phân bổ nguồn lực kiểm thử theo tỷ lệ **70% Unit Tests, 20% Integration Tests, và 10% E2E/Manual Tests**.

---

## 2. Đặc tả các hình thức kiểm thử

### 2.1 Unit Testing (Kiểm thử đơn vị)
- **Đối tượng**: Domain Entity, Domain Service, Application Use Cases.
- **Thư viện sử dụng**: JUnit 5, Mockito.
- **Nguyên tắc**: 
  - Cô lập hoàn toàn đối tượng kiểm thử. 
  - Sử dụng Mockito để mock tất cả các cổng giao tiếp ra (Ports Out) như database repository hay external API adapters.
  - Test đầy đủ các kịch bản đúng (happy path) và các điều kiện lỗi (exception path).

### 2.2 Integration Testing (Kiểm thử tích hợp)
- **Đối tượng**: Persistence Adapters, Cache Adapters, External API Adapters.
- **Sử dụng Testcontainers**:
  - Tích hợp thư viện **Testcontainers** để tự động khởi chạy một container PostgreSQL (có PostGIS extension) và một container Redis thực tế trên Docker trong quá trình chạy build test.
  - Tránh giả lập (mock) cơ sở dữ liệu để kiểm tra tính chính xác của các câu lệnh SQL không gian phức tạp và các giao dịch (transaction) thực tế.

### 2.3 API & Security Testing
- **API Contract Test**: Sử dụng Spring Boot `@WebMvcTest` để giả lập gửi request JSON lên Controller. Kiểm tra HTTP Status Code trả về (200, 201, 400, 429, 503) và cấu trúc error envelope.
- **Security Flow Test**: Giả lập các JWT token hợp lệ, hết hạn, hoặc bị sửa đổi chữ ký để đảm bảo Spring Security hoạt động chính xác. Test kịch bản một user thường cố tình truy cập tài nguyên của admin.

### 2.4 External API Failure Testing (Kiểm thử khả năng chịu lỗi)
- Viết các Integration Test đặc thù giả lập lỗi từ các dịch vụ bên ngoài:
  - Gemini API trả về chuỗi text không thể parse thành JSON.
  - OSRM Route API trả về lỗi timeout mạng.
  - Weather API trả về lỗi `500 Server Error`.
- **Kỳ vọng**: Ứng dụng không được crash, tự động bắt ngoại lệ và kích hoạt luồng fallback trả kết quả êm ái cho client.

### 2.5 Performance & Load Testing
- Sử dụng công cụ **k6** viết script giả lập 100 người dùng đồng thời gọi API tạo chuyến đi (`/trips/generate`).
- Đo đạc độ trễ (latency), tỷ lệ lỗi và kiểm tra giới hạn kích hoạt của Rate Limiter.

### 2.6 Client Manual Testing (Web/Mobile)
- **Web**: Kiểm tra render markers và polyline route của bản đồ Leaflet trên các kích thước màn hình responsive khác nhau.
- **Mobile**: Kiểm tra lưu trữ SQLite cục bộ hoạt động chính xác khi ngắt kết nối mạng (chế độ offline mode).
