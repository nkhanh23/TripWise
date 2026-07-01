# TripWise Backend

Đây là phần mã nguồn backend của hệ thống lập lịch du lịch thông minh **TripWise**, sử dụng Java 21, Spring Boot 3.x và Gradle.
Đây là phần mã nguồn backend của hệ thống lập lịch du lịch thông minh **TripWise**, sử dụng Java 21, Spring Boot 3.x và Maven.

---

## 1. Stack công nghệ chính
- **Java**: Phiên bản 21
- **Framework**: Spring Boot 3.2.x
- **Build Tool**: Maven Wrapper (included)
- **Database**: PostgreSQL + PostGIS (chạy qua Docker local)
- **Cache**: Redis (chạy qua Docker local)
- **Migration**: Flyway

---

## 2. Cách khởi chạy dự án cục bộ

### Bước 1: Khởi động database và cache trên Docker
Từ thư mục gốc dự án `TripWise/`, chạy lệnh:
```bash
docker compose up -d
```

### Bước 2: Run Backend
```bash
# Windows
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Linux/macOS
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```
Ứng dụng sẽ khởi động tại cổng `8080` (hoặc cổng được định cấu hình trong biến môi trường `PORT`).

---

## 3. Testing
```bash
# Windows
.\mvnw.cmd test

# Linux/macOS
./mvnw test
```
*Lưu ý: Đảm bảo Docker Desktop đang bật vì một số integration test có thể sử dụng Testcontainers.*

---

## 4. Kiểm tra sức khỏe hệ thống (Health Check)
Gọi endpoint kiểm tra sức khỏe mặc định:
```bash
curl http://localhost:8080/api/v1/health
```

Response mẫu:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "status": "UP"
  }
}
```
