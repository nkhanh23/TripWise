# Local Development Guide - AI Smart Travel Planner

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường phát triển cục bộ (Local Development) cho dự án.

---

## 1. Yêu cầu phần cứng & Môi trường cài đặt
Lập trình viên cần cài đặt trước các phần mềm sau trên máy cá nhân:
- **Hệ điều hành**: Windows 10/11, macOS, hoặc Linux.
- **Java Development Kit (JDK)**: Phiên bản **Java 21** (Khuyến nghị Eclipse Temurin hoặc Amazon Corretto).
- **Docker & Docker Compose**: Phiên bản mới nhất (đã bật Docker Desktop trên Windows/macOS).
- **IDE**: IntelliJ IDEA (khuyến nghị cho backend), VS Code (khuyến nghị cho frontend/mobile).
- **Git Client**: Để quản lý mã nguồn.

---

## 2. Các dịch vụ chạy trên Docker Local
Để giảm thiểu độ phức tạp cài đặt, toàn bộ cơ sở dữ liệu và bộ đệm được khởi chạy thông qua Docker Compose cục bộ:
- **PostgreSQL 16 + PostGIS 3.4**: Cơ sở dữ liệu quan hệ lưu trữ dữ liệu không gian.
- **Redis 7.2**: Bộ đệm cache nóng và quản lý rate limit.
- **pgAdmin 4 (Tùy chọn)**: Giao diện web quản trị cơ sở dữ liệu PostgreSQL.
- **MinIO (Tùy chọn)**: Giả lập Object Storage S3 phục vụ kiểm thử tính năng upload hình ảnh.

---

## 3. Quy trình khởi chạy môi trường Local

### Bước 1: Sao chép cấu hình môi trường
Sao chép tệp cấu hình mẫu `.env.example` thành tệp cấu hình thực tế `.env` ở thư mục gốc:
```bash
cp env.example .env
```
*Lưu ý: Chỉnh sửa các giá trị khóa API (Gemini API, OpenWeather) trong tệp `.env` bằng khóa cá nhân của bạn.*

### Bước 2: Khởi động các container dữ liệu
Tại thư mục gốc chứa tệp `docker-compose.yml`, chạy câu lệnh:
```bash
docker compose up -d
```
Kiểm tra trạng thái các container hoạt động bình thường:
```bash
docker compose ps
```

### Bước 3: Chạy ứng dụng Backend (Spring Boot)
Import dự án vào IntelliJ IDEA và chạy file main class, hoặc chạy thông qua Gradle:
```bash
./gradlew bootRun
```
Ứng dụng sẽ tự động chạy các tệp migration của Flyway để tạo bảng cấu trúc trong PostgreSQL và lắng nghe tại cổng `8080`.

---

## 4. Reset dữ liệu Local & Khắc phục lỗi thường gặp

### 4.1 Cách Reset toàn bộ dữ liệu sạch
Khi muốn xóa toàn bộ database để chạy lại các file migration từ đầu:
```bash
docker compose down -v
docker compose up -d
```
*Lưu ý: Tham số `-v` sẽ xóa bỏ hoàn toàn Docker Volumes chứa dữ liệu PostgreSQL và Redis.*

### 4.2 Lỗi mất kết nối PostgreSQL (Connection Refused)
- **Nguyên nhân**: Container Postgres chưa khởi động xong hoặc xung đột cổng `5432` với một phần mềm Postgres cài trực tiếp trên máy host.
- **Xử lý**: Tắt dịch vụ Postgres trên máy host hoặc đổi cổng export trong `docker-compose.yml` (ví dụ: đổi thành `5433:5432`).
