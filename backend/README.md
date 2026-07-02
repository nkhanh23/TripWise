# TripWise Backend

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

### Bước 1: Thiết lập biến môi trường
Sao chép tệp mẫu môi trường:
```bash
# Windows (PowerShell)
Copy-Item ../.env.example ../.env

# Linux/macOS
cp ../.env.example ../.env
```
*(Lưu ý: Bạn có thể cập nhật các secret trong `.env` tuỳ nhu cầu phát triển ở local. Tuyệt đối không commit tệp `.env` lên repository).*

### Bước 2: Khởi động database và cache trên Docker
Từ thư mục gốc dự án `TripWise/` (chứa tệp `docker-compose.yml`), chạy lệnh:
```bash
docker compose up -d
```
Điều này sẽ khởi động PostgreSQL với PostGIS và Redis trên máy local của bạn.

### Bước 3: Run Backend
Trở lại thư mục `backend/` và khởi chạy với profile `local`:
```bash
# Windows
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Linux/macOS
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```
Ứng dụng sẽ khởi động tại cổng `8080` (hoặc cổng được định cấu hình trong biến môi trường `PORT`).

---

## 3. Testing
Bộ test được thiết kế để kiểm thử toàn diện các lớp:
```bash
# Windows
.\mvnw.cmd clean test

# Linux/macOS
./mvnw clean test
```
*Lưu ý: Đảm bảo Docker Desktop đang bật vì một số integration test sử dụng Testcontainers.*

---

## 4. Kiểm tra sức khỏe hệ thống (Health Check & Actuator)

Hệ thống cung cấp sẵn các Endpoint qua Actuator để giám sát tình trạng hoạt động (sẵn sàng cho Kubernetes / Docker health check).

**1. Base Health Endpoint:**
```bash
curl -s http://localhost:8080/api/v1/health
```

**2. Liveness Probe:**
Giúp orchestrator biết application có đang sống không.
```bash
curl -s http://localhost:8080/actuator/health/liveness
```

**3. Readiness Probe:**
Giúp orchestrator biết application đã kết nối thành công với database, redis và sẵn sàng nhận request chưa.
```bash
curl -s http://localhost:8080/actuator/health/readiness
```

*Lưu ý: Các endpoint actuator khác như `/actuator/metrics` yêu cầu authentication.*
