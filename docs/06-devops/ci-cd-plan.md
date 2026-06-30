# CI/CD Plan - AI Smart Travel Planner

Tài liệu này đặc tả quy trình tích hợp liên tục (CI) và triển khai liên tục (CD) tự động của dự án.

---

## 1. Quy trình tích hợp liên tục (CI Pipeline)

Hệ thống CI tự động chạy thông qua **GitHub Actions** mỗi khi có hành động `push` hoặc `pull_request` hướng tới các nhánh `develop` và `main`.

```text
 [ Code Push ]
       │
       ▼
 ┌───────────┐
 │ Build &   │ (Biên dịch dự án Gradle/Java 21, checkstyle)
 │ Lint      │
 └─────┬─────┘
       │ Pass
       ▼
 ┌───────────┐
 │ Chạy Tests│ (Chạy Unit & Integration Tests với Testcontainers)
 │ Tự động   │
 └─────┬─────┘
       │ Pass
       ▼
 ┌───────────┐
 │ Security  │ (Quét lỗ hổng thư viện, kiểm tra API keys bị lộ)
 │ Scan      │
 └───────────┘
```

### 1.1 Chi tiết các bước trong CI:
- **Build & Lint**:
  - Khởi tạo môi trường chạy Java 21.
  - Thực hiện chạy lệnh biên dịch dự án: `./gradlew compileJava` (đối với backend).
  - Kiểm tra định dạng code (checkstyle, formatting rules).
- **Automated Testing**:
  - Chạy toàn bộ test suite: `./gradlew test`.
  - GitHub runner sẽ khởi động một container PostgreSQL và Redis (qua Testcontainers) để phục vụ chạy các Integration Test thực tế.
  - Xuất báo cáo độ bao phủ mã nguồn (Code Coverage Report) và đẩy lên SonarQube/Codecov.
- **Security Scan (Tương lai)**:
  - Tích hợp công cụ **Trivy** hoặc **OWASP Dependency-Check** để tự động phát hiện các thư viện bên ngoài bị lỗi bảo mật.
  - Sử dụng **GitGuardian** quét mã nguồn ngăn ngừa trường hợp lộ lọt API key.

---

## 2. Quy trình triển khai liên tục (CD Pipeline)

Quy trình CD chịu trách nhiệm đóng gói ứng dụng thành Docker container và phát hành lên các môi trường:

### 2.1 Triển khai tự động lên Staging (Continuous Deployment)
- **Kích hoạt**: Khi có PR được merge thành công vào nhánh `develop`.
- **Hành động**:
  1. Build Docker Image mới với thẻ tag: `tripwise-backend:staging-[commit_hash]`.
  2. Push image lên Docker Registry riêng của dự án.
  3. Sử dụng SSH để kết nối tới server Staging, kéo image mới nhất về và cập nhật container thông qua lệnh `docker compose up -d`.
  4. Tự động chạy database migration của Flyway.

### 2.2 Triển khai lên Production (Manual Approval - Kiểm duyệt thủ công)
- **Kích hoạt**: Khi release tag (`v*.*.*`) được tạo trên nhánh `main`.
- **Hành động**:
  1. Build Docker Image chính thức với thẻ tag khớp với số phiên bản (ví dụ: `tripwise-backend:v1.0.0`).
  2. Push image lên Docker Registry.
  3. **Manual Approval Gate**: Hệ thống dừng lại, gửi thông báo qua Slack/Email yêu cầu PO hoặc Tech Lead xác duyệt thủ công trên giao diện GitHub Actions.
  4. Sau khi được duyệt, pipeline tự động SSH vào server Production và thực hiện cập nhật theo chiến lược rolling update để không gây downtime.
