# Environment Strategy - AI Smart Travel Planner

Tài liệu này quy định chiến lược quản lý cấu hình và bảo mật bí mật (secrets) trên các môi trường vận hành của dự án.

---

## 1. Bản đồ phân tách Môi trường (Environments)

Dự án thiết lập 4 môi trường vận hành độc lập:

1. **`local`**: Máy của lập trình viên. Database/Redis chạy qua Docker local. Bật chế độ debug log, tắt bảo mật CORS quá chặt chẽ để dễ phát triển.
2. **`test`**: Chạy trên máy chủ CI (GitHub Runner) phục vụ chạy tự động test suite. Database và Redis được khởi chạy tạm thời qua Testcontainers và tự hủy sau khi test xong.
3. **`staging`**: Môi trường tích hợp chạy thử nghiệm thực tế cho PO test nghiệm thu. Cấu hình bảo mật gần giống production.
4. **`production`**: Môi trường chạy thực tế phục vụ người dùng cuối. Yêu cầu bảo mật cao nhất, tắt debug logs, bật rate limit và mã hóa dữ liệu.

---

## 2. Quản lý tệp cấu hình theo môi trường (Spring Profiles)
Backend Spring Boot sử dụng tính năng **Spring Profiles** để tách biệt file cấu hình ứng dụng:
- **`application.yml`**: Chứa các cấu hình chung không nhạy cảm (tên ứng dụng, định dạng log, cấu hình serializer).
- **`application-local.yml`**: Cấu hình mặc định cho local dev (kết nối DB `localhost:5432`, bật debug logs).
- **`application-prod.yml`**: Cấu hình tối ưu cho Production (kết nối Pool DB tối đa, tắt hiển thị lỗi hệ thống, bật HTTPS-only cookies).

---

## 3. Danh mục các biến môi trường bắt buộc (Environment Variables)

Các biến này bắt buộc phải được khai báo tại hệ thống vận hành và không được lưu cứng trong code:

| Tên biến môi trường | Giá trị Local mẫu | Ý nghĩa |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | `local` | Xác định profile ứng dụng hoạt động |
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/tripwise`| URL kết nối database |
| `SPRING_DATASOURCE_USERNAME` | `tripwise_user` | Tài khoản đăng nhập DB |
| `SPRING_DATASOURCE_PASSWORD` | `tripwise_secure_password` | Mật khẩu DB |
| `SPRING_DATA_REDIS_HOST` | `localhost` | Địa chỉ Redis server |
| `JWT_SECRET_KEY` | `chuan_mat_ma_256bit_do_local_sinh` | Khóa ký số token |
| `GEMINI_API_KEY` | `key_lay_tu_google_ai_studio` | Khóa API Gemini |
| `WEATHER_API_KEY` | `key_lay_tu_provider` | Khóa API Weather (nếu dùng) |

---

## 4. Quản lý Secret & Quy tắc tệp `.env` (Cảnh báo an toàn)
- **Quy tắc tuyệt đối**: Tệp `.env` chứa mật khẩu thật và API key thực tế **cấm được commit lên kho chứa mã nguồn Git**.
- **Hiện thực bảo vệ**:
  - Khởi tạo tệp tin `.env.example` chứa toàn bộ tên các biến môi trường cần thiết kèm giá trị giả định an toàn và commit lên Git làm mẫu cho lập trình viên mới.
  - Tên tệp `.env` phải được ghi nhận trong tệp `.gitignore` ngay khi khởi tạo dự án.
  - Trên môi trường Staging/Production, các biến môi trường được inject trực tiếp thông qua config của Docker Compose hoặc công cụ quản trị hạ tầng (AWS ECS Task Definition, Kubernetes Secrets, HashiCorp Vault), không lưu dưới dạng tệp tin văn bản thường trên ổ đĩa của server.
