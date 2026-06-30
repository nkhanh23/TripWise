# Sprint 2 - Auth, Security & Rate Limiting Base

## 1. Goal (Mục tiêu Sprint)
Hiện thực hóa cơ chế xác thực an toàn bằng Spring Security, OAuth2/JWT cho người dùng, xây dựng cơ chế Refresh Token Rotation và triển khai Rate Limiting bảo vệ các endpoint tài nguyên.

---

## 2. Tasks (Các công việc cần thực hiện)
- **Task 2.1**: Tích hợp Spring Security vào dự án Spring Boot. Thiết lập bộ lọc CORS chỉ cho phép các domain cụ thể truy cập (không dùng wildcard `*`).
- **Task 2.2**: Thiết lập thực thể `User` trong domain và ánh xạ cơ sở dữ liệu. Sử dụng Bcrypt để mã hóa mật khẩu trước khi lưu trữ.
- **Task 2.3**: Viết API Đăng ký (`POST /api/v1/auth/register`) và Đăng nhập (`POST /api/v1/auth/login`).
- **Task 2.4**: Triển khai cơ chế cấp phát cặp JWT token: Access Token (thời hạn 15 phút, stateless) và Refresh Token (thời hạn 7 ngày, lưu dạng hash trong DB).
- **Task 2.5**: Hiện thực cơ chế Refresh Token Rotation: Mỗi lần đổi Access Token mới, hệ thống cấp Refresh Token mới và thu hồi cái cũ. Nếu phát hiện Refresh Token cũ bị gửi lại lần hai, lập tức hủy toàn bộ Token Family của tài khoản đó.
- **Task 2.6**: Cấu hình bộ lọc API Rate Limiting dựa trên Redis (sử dụng Spring Cloud Gateway RateLimiter hoặc Bucket4j) để giới hạn tần suất gọi API cho các tài khoản vô danh (guest) và người dùng thường.

---

## 3. Deliverables (Các sản phẩm bàn giao)
- Các endpoint `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh` chạy được và hoạt động chính xác.
- API bảo vệ (ví dụ: `/api/v1/users/me`) trả về lỗi `401 Unauthorized` nếu thiếu hoặc sai JWT token.
- Refresh Token được lưu trữ dưới dạng hash SHA-256 trong PostgreSQL.
- Rate Limiting trả về lỗi `429 Too Many Requests` khi số lượng request vượt ngưỡng cho phép trong 1 phút.

---

## 4. Acceptance Criteria (Tiêu chí nghiệm thu)
- **AC-2.1**: Mật khẩu của người dùng tuyệt đối không được lưu dưới dạng văn bản rõ (plaintext) trong database và không được in ra log trong bất kỳ trường hợp nào.
- **AC-2.2**: API response của các endpoint xác thực không được chứa mật khẩu đã mã hóa (bcrypt hash) hoặc thông tin stack trace lỗi của Spring Security.
- **AC-2.3**: Khi một Refresh Token cũ bị tấn công tái sử dụng (replay attack), hệ thống phải ghi nhận log cảnh báo an ninh, vô hiệu hóa toàn bộ Refresh Token đang hoạt động của user đó và trả về lỗi yêu cầu đăng nhập lại.
- **AC-2.4**: Tỷ lệ bao phủ Unit Test cho JWT Service và Custom Auth Provider tối thiểu đạt `85%`.

---

## 5. Risks & Mitigation (Rủi ro và cách khắc phục)
- **Rủi ro**: Khi chạy Rate Limiting bằng Redis, nếu Redis gặp sự cố kết nối, toàn bộ API của hệ thống có thể bị chặn đứng và báo lỗi.
- **Cách khắc phục**: Thiết lập cấu hình bộ lọc Rate Limiting theo cơ chế Fail-open đối với Redis: Nếu không thể kết nối tới Redis, hệ thống tạm thời cho phép bypass Rate Limiting và ghi nhận log cảnh báo mức độ cao (ERROR) để vận hành viên xử lý, thay vì chặn đứng request của người dùng.
