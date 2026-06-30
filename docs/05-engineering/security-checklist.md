# Security Checklist - AI Smart Travel Planner

Danh sách rà soát an toàn thông tin bắt buộc phải kiểm tra trước khi đưa bất kỳ tính năng nào lên Production (phòng ngừa lỗi theo chuẩn OWASP Top 10).

---

## 1. Xác thực & Phân quyền (Authentication & Authorization)
- [ ] Mật khẩu người dùng đã được băm (hashing) bằng Bcrypt với work factor tối thiểu là 12 chưa?
- [ ] Access Token (JWT) có thời hạn hết hạn ngắn hơn 30 phút không?
- [ ] Refresh Token Rotation đã được triển khai và lưu trữ dưới dạng băm SHA-256 trong DB chưa?
- [ ] Có bộ lọc an ninh chặn đứng các Refresh Token đã từng sử dụng để ngăn chặn tấn công replay attack không?
- [ ] Tất cả các API nghiệp vụ có kiểm tra quyền sở hữu dữ liệu không (ví dụ: User A cấm xem/sửa/xóa lịch trình của User B)?
- [ ] API quản trị `/api/v1/admin/**` đã được cấu hình chỉ cho phép role `ADMIN` truy cập chưa?

---

## 2. Kiểm soát đầu vào & Bảo mật kết nối (Input & Network Security)
- [ ] Đã cấu hình CORS whitelist cụ thể cho môi trường Production chưa (cấm sử dụng `Access-Control-Allow-Origin: *`)?
- [ ] Tất cả các Request DTO nhận dữ liệu từ client đã được validate định dạng, độ dài chuỗi và khoảng giá trị chưa?
- [ ] Tọa độ địa lý gửi lên đã được validate nằm trong dải giá trị hợp lệ (-90 đến 90 cho Latitude, -180 đến 180 cho Longitude)?
- [ ] Có sử dụng Parameterized Queries hoặc Hibernate ORM cho toàn bộ câu lệnh SQL để chống lỗi SQL Injection không?
- [ ] Đầu vào prompt tiếng Việt gửi sang Gemini API đã được validate độ dài tối đa (250 ký tự) và lọc bỏ các từ khóa tấn công prompt injection chưa?

---

## 3. Quản lý Secret & Nhật ký an toàn (Secrets & Logging)
- [ ] Có tệp tin cấu hình chứa API Key (Gemini, Weather), mật khẩu database thô được commit lên Git không (kiểm tra lại lịch sử commit)?
- [ ] Tất cả các secrets đã được chuyển dịch sang đọc từ biến môi trường (Environment Variables) chưa?
- [ ] Cấu hình Logback đã loại trừ và che giấu (masking) các thông tin nhạy cảm (password, tokens, card details) chưa?
- [ ] Đầu ra API của Spring Boot đã tắt tính năng hiển thị stack trace lỗi hệ thống khi ở môi trường Production chưa?

---

## 4. Quản lý tải lên tệp tin (File Upload Security)
- [ ] File upload đã được validate dung lượng tối đa dưới 5MB chưa?
- [ ] Có bộ lọc kiểm tra MIME type thực tế của file tải lên (chỉ cho phép `image/jpeg`, `image/png`, `image/webp`), cấm hoàn toàn `.svg` hoặc các file thực thi `.exe`, `.sh` không?
- [ ] Tên file tải lên đã được hash lại thành một UUID duy nhất để tránh lỗi Path Traversal (ghi đè file hệ thống) chưa?
- [ ] (Future) File tải lên đã được đi qua luồng quét virus tự động trước khi lưu vào Object Storage chưa?
