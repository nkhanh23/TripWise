# Logging & Monitoring - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế ghi nhật ký hệ thống (Logging) có cấu trúc và thiết lập chỉ số giám sát (Monitoring) của dự án.

---

## 1. Structured JSON Logging & MDC Context

Để thuận tiện cho việc tìm kiếm lỗi trên môi trường production có hàng triệu log dòng, hệ thống áp dụng **Structured JSON Logging**.

### 1.1 Tích hợp Correlation ID qua MDC (Mapped Diagnostic Context)
Mỗi HTTP Request đi vào backend Spring Boot sẽ được Filter gán một mã UUID duy nhất (`X-Correlation-Id`). Mã này được lưu trữ trong `MDC` (ThreadLocal) và tự động đính kèm vào tất cả các log được xuất ra bởi thread đó.

#### Định dạng log JSON mẫu:
```json
{
  "timestamp": "2026-06-30T15:00:00.123Z",
  "level": "INFO",
  "thread": "http-nio-8080-exec-1",
  "logger": "com.tripwise.trip.application.usecase.GenerateTripUseCase",
  "message": "Bắt đầu phân tích prompt yêu cầu bằng Gemini API",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": 456,
  "elapsedTimeMs": 0
}
```

### 1.2 Phân định Log Levels
- **`DEBUG`**: Thông tin chi tiết phục vụ quá trình phát triển (chạy câu SQL thô, log cấu trúc JSON chưa parse). Tắt trên môi trường Production.
- **`INFO`**: Ghi nhận các điểm mốc quan trọng của luồng nghiệp vụ (Đăng nhập thành công, Tạo lịch trình thành công, Ghi cache thành công).
- **`WARN`**: Ghi nhận các lỗi hệ thống có thể tự phục hồi hoặc kích hoạt luồng fallback (Redis mất kết nối tạm thời, Gemini API timeout và chuyển sang form thủ công).
- **`ERROR`**: Lỗi nghiêm trọng cần can thiệp kỹ thuật ngay lập tức (PostgreSQL sập, lỗi tràn bộ nhớ OutOfMemory, lộ khóa API).

---

## 2. Spring Boot Actuator & Health Check
Kích hoạt các cổng kiểm tra sức khỏe của Spring Boot Actuator nhằm hỗ trợ giám sát trạng thái hệ thống:
- Endpoint kiểm tra sức khỏe tổng thể: `GET /actuator/health`
- Cấu hình chỉ hiển thị thông tin chi tiết (`show-details: always`) cho IP nội bộ, ẩn giấu thông tin ra bên ngoài internet.
- Đăng ký kiểm tra trạng thái các bên liên đới: `db` (PostgreSQL), `redis` (Redis Cache), `diskSpace` (Dung lượng ổ cứng).

---

## 3. Danh mục các chỉ số giám sát cốt lõi (Core Metrics)
Hệ thống sử dụng thư viện **Micrometer** để thu thập và xuất ra định dạng tương thích với **Prometheus** tại endpoint `/actuator/prometheus`:

### 3.1 Chỉ số API & Hệ thống
- `http.server.requests`: Đo đạc số lượng request (`count`), thời gian phản hồi (`latency`) và tỷ lệ lỗi (`error_rate`) phân chia theo từng endpoint URL và phương thức HTTP.
- `jvm.memory.used`: Theo dõi dung lượng RAM sử dụng của máy ảo Java.
- `hikari.connections.active`: Theo dõi số lượng kết nối đang được sử dụng của Database Connection Pool.

### 3.2 Chỉ số Cache & Tích hợp ngoài
- `cache.gets`: Đo tỷ lệ trúng bộ đệm (Cache Hit Rate) và trượt bộ đệm (Cache Miss Rate) của Redis.
- `external.api.calls`:
  - Đo độ trễ (latency) của cuộc gọi sang Gemini API, OSRM API và Weather API.
  - Theo dõi số lượng token tiêu tốn hàng giờ/hàng ngày của Gemini API phục vụ dự báo chi tiêu.
  - Theo dõi tỷ lệ kích hoạt ngắt mạch (Circuit Breaker status) của từng API ngoài.
