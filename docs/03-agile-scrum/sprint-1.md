# Sprint 1 - Spring Boot Skeleton, PostgreSQL, Redis, Flyway & Logging Base

## 1. Goal (Mục tiêu Sprint)
Xây dựng bộ khung (skeleton) backend Spring Boot sử dụng Java 21, thiết lập kết nối cơ sở dữ liệu PostgreSQL + PostGIS, Flyway migration, Redis cache, và cấu hình ghi log có cấu trúc cùng bộ xử lý lỗi tập trung.

---

## 2. Tasks (Các công việc cần thực hiện)
- **Task 1.1**: Khởi tạo dự án Spring Boot 3.x sử dụng Gradle với Java 21. Cấu hình Spring Boot Actuator và kiểm tra endpoint `/actuator/health`.
- **Task 1.2**: Phân chia cấu trúc thư mục/gói tin (package directory structure) theo 4 lớp Clean Architecture: `domain`, `application`, `infrastructure`, `presentation` làm nền tảng.
- **Task 1.3**: Tích hợp Spring Data JPA và Flyway Migration. Viết tệp migration `V1__init_schema.sql` tạo các bảng dữ liệu cơ bản (`users`, `places_geo`, `itineraries`, `itinerary_days`, `itinerary_items`, `route_cache`, `weather_cache`).
- **Task 1.4**: Cấu hình kết nối Redis Cache và viết lớp cấu hình fallback khi Redis bị sập (down).
- **Task 1.5**: Thiết lập Logback và SLF4J cho ghi log có cấu trúc (Structured Logging) dưới dạng JSON. Viết Filter tạo Correlation ID (`X-Correlation-Id`) cho mỗi request.
- **Task 1.6**: Xây dựng cơ chế xử lý ngoại lệ tập trung (Global Exception Handling) và định dạng lỗi trả về chuẩn hóa cho client.

---

## 3. Deliverables (Các sản phẩm bàn giao)
- Mã nguồn bộ khung backend Spring Boot biên dịch thành công, không có cảnh báo nghiêm trọng (compiler warning).
- Flyway chạy tự động tạo thành công cấu trúc bảng khi khởi chạy ứng dụng cục bộ kết nối với PostgreSQL.
- Endpoint `/actuator/health` trả về trạng thái `"UP"` (bao gồm cả trạng thái DB và Redis).
- Log định dạng JSON được in ra console có kèm theo Correlation ID của request.

---

## 4. Acceptance Criteria (Tiêu chí nghiệm thu)
- **AC-1.1**: Không có bất kỳ business logic hay logic nghiệp vụ cụ thể nào được viết ở presentation layer (Controller).
- **AC-1.2**: Gọi thử API bị lỗi phải trả về cấu trúc lỗi JSON có định dạng:
  ```json
  {
    "timestamp": "2026-06-30T15:00:00Z",
    "status": 404,
    "error": "Not Found",
    "message": "Thông tin lỗi chi tiết",
    "path": "/api/v1/test",
    "correlationId": "uuid-gan-kem-request"
  }
  ```
- **AC-1.3**: Không có API key hay mật khẩu nào được lưu cứng (hardcode) trong file `application.yml` hoặc `application.properties`.
- **AC-1.4**: Unit Test cho bộ kiểm tra định dạng lỗi (Error Response Mapper) phải pass 100%.

---

## 5. Risks & Mitigation (Rủi ro và cách khắc phục)
- **Rủi ro**: Việc cài đặt thư viện PostGIS trên môi trường local của một số thành viên có thể bị lỗi do thiếu thư viện C/C++ cần thiết cho PostgreSQL.
- **Cách khắc phục**: Bắt buộc sử dụng Docker Image chính thức của PostGIS (`postgis/postgis:16-3.4-alpine`) trong tệp `docker-compose.yml` để đảm bảo tính đồng nhất môi trường cho toàn bộ team.
