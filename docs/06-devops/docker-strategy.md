# Docker Strategy - AI Smart Travel Planner

Tài liệu này quy định chiến lược sử dụng Container (Docker) trên các môi trường và cấu hình chi tiết cho hệ thống.

---

## 1. Ứng dụng Docker trên các môi trường

- **Môi trường Local**: Sử dụng Docker Compose để tạo nhanh cụm database PostgreSQL/PostGIS, Redis, pgAdmin và MinIO. Lập trình viên chạy app Spring Boot trực tiếp trên máy host để dễ dàng debug.
- **Môi trường Staging & Production**: Đóng gói toàn bộ ứng dụng Backend và Frontend thành các Docker Image độc lập, chạy trên các container tách biệt được điều phối qua Docker Compose hoặc Kubernetes để dễ dàng mở rộng và cập nhật phiên bản mới.

---

## 2. Thiết kế Dockerfile tối ưu cho Production (Multi-stage Build)
Để đảm bảo Docker Image có kích thước nhỏ nhất và an toàn nhất (không chứa mã nguồn thô và Gradle SDK dư thừa), tệp `Dockerfile` được thiết kế theo dạng Multi-stage:

```dockerfile
# Stage 1: Build file JAR từ mã nguồn
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /build
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
COPY src src
RUN ./gradlew bootJar --no-daemon

# Stage 2: Chạy ứng dụng từ file JAR
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
# Tạo user không có quyền root (security hardening)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
COPY --from:builder /build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 3. Cấu hình Docker Compose Local (Quy chuẩn thiết kế)
Tệp `docker-compose.yml` tại thư mục gốc phải tuân thủ các quy tắc thiết kế sau:

### 3.1 Thiết lập Healthcheck
Tất cả các dịch vụ (PostgreSQL, Redis) phải có cấu hình `healthcheck` để đảm bảo container hoạt động khỏe mạnh trước khi các dịch vụ khác phụ thuộc vào nó khởi chạy:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U tripwise_user -d tripwise"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### 3.2 Phân tách Mạng (Docker Networks)
Sử dụng Docker Bridge Network để cô lập các dịch vụ:
- `backend-db-network`: Chỉ cho phép backend kết nối tới PostgreSQL và Redis. Các client bên ngoài không thể truy cập trực tiếp.
- `public-network`: Cho phép Nginx reverse proxy kết nối tới Backend và Frontend.

### 3.3 Phân ranh giới Secrets
Tuyệt đối không được ghi đè các thông tin mật khẩu thật của môi trường Staging/Production vào file `docker-compose.yml`. Mọi tham số nhạy cảm được cấu hình thông qua biến môi trường lấy từ tệp `.env` cục bộ không commit lên Git.
- Cấu hình trong compose sử dụng cú pháp: `password: ${DB_PASSWORD}`.
- Cung cấp giá trị mặc định cho local dev: `password: ${DB_PASSWORD:-local_dev_password}`.
