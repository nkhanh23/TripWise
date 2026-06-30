# Authentication Design - AI Smart Travel Planner

## 1. Chiến lược xác thực & Phân quyền (Auth Strategy)
Hệ thống sử dụng cơ chế xác thực **stateless** kết hợp **OAuth2/JWT** làm tiêu chuẩn bảo mật cho toàn bộ các kết nối API Client.

### Vai trò phân quyền (Role-Based Access Control - RBAC):
- **`GUEST` (Khách vãng lai)**: Được quyền truy cập các trang công khai: nhập prompt, xem thử lịch trình mới tạo, tìm kiếm địa điểm công khai. Không có quyền lưu lịch trình hay truy cập thông tin cá nhân.
- **`USER` (Thành viên đã đăng ký)**: Được cấp đầy đủ quyền tạo lịch trình, lưu trữ lịch trình vào DB, xem danh sách và xóa lịch trình của cá nhân, cập nhật hồ sơ cá nhân.
- **`ADMIN` (Quản trị viên)**: Có toàn quyền truy cập các endpoint CRUD địa điểm, import dữ liệu từ OpenStreetMap, xem log hệ thống và quản lý tài khoản người dùng.

---

## 2. JWT & Refresh Token Rotation (RTR)

```text
  [ Client ]               [ Auth Server ]
      │                           │
      ├─────── Đăng nhập ────────►│ (Kiểm tra mật khẩu)
      │◄── Access + Refresh Token─┤ (Tạo token mới)
      │                           │
      ├──── Gọi API protected ───►│ (Kiểm tra Access Token)
      │◄─── Trả về dữ liệu ───────┤
      │                           │
  (Access Token hết hạn)          │
      │                           │
      ├───── Gửi Refresh Token ──►│ (Hủy Refresh Token cũ)
      │◄── Cặp Token mới ─────────┤ (Cấp Access + Refresh Token mới)
```

- **Access Token**:
  - Thời hạn sống ngắn: **15 - 30 phút**.
  - Định dạng JWT tự chứa thông tin (stateless), chứa thông tin `userId`, `email`, và danh sách `roles`.
  - Được ký bằng thuật toán chữ ký số **HMAC SHA-256** với khóa bí mật dài tối thiểu 256 bits.
- **Refresh Token Rotation (RTR)**:
  - Thời hạn sống dài hơn: **7 ngày**.
  - Mỗi khi client gửi Refresh Token lên để xin cấp mới Access Token, hệ thống sẽ **hủy bỏ** Refresh Token cũ và cấp lại một cặp token mới (cả Access Token mới và Refresh Token mới).
  - Tệp Refresh Token cũ được lưu trạng thái đã sử dụng trong DB.
- **Phát hiện tái sử dụng Refresh Token (Reuse Detection)**:
  - Nếu một Refresh Token đã sử dụng bị gửi lên lần thứ hai (dấu hiệu của việc kẻ tấn công đánh cắp được token cũ), hệ thống sẽ lập tức kích hoạt cảnh báo an ninh, **hủy bỏ hiệu lực của toàn bộ Token Family** liên kết với Refresh Token đó (bắt buộc tất cả các thiết bị đang đăng nhập bằng tài khoản này đều phải đăng nhập lại từ đầu).

---

## 3. Quản lý Session, Thiết bị & Đăng xuất (Revocation)
- **Đăng xuất (Logout)**: Khi người dùng bấm đăng xuất, client gửi yêu cầu lên backend. Backend sẽ đánh dấu thu hồi (revoke) Refresh Token hiện tại trong DB.
- **Đăng xuất tất cả thiết bị (Revoke All Sessions)**: Trong trường hợp người dùng đổi mật khẩu hoặc phát hiện tài khoản bị xâm nhập, backend hỗ trợ API vô hiệu hóa toàn bộ Refresh Token đang hoạt động liên kết với `userId` đó trong DB, buộc tất cả các phiên đăng nhập phải kết thúc.
- **Password Hashing**: Sử dụng thư viện Spring Security Crypto để băm mật khẩu bằng thuật toán **Bcrypt** với `strength = 12` (work factor), đảm bảo độ an toàn cao chống lại tấn công brute-force.

---

## 4. Khuyến nghị lưu trữ Token ở phía Client (Token Storage)

### 4.1 Đối với ứng dụng Web (ReactJS / Next.js)
- **Giải pháp khuyến nghị**: 
  - Lưu trữ **Access Token** trong bộ nhớ ứng dụng (Memory/Application State - ví dụ: Redux, Context API). Access token sẽ mất khi tải lại trang, nhưng có thể lấy lại dễ dàng qua cơ chế silent refresh.
  - Lưu trữ **Refresh Token** trong **HttpOnly, Secure, SameSite=Strict Cookie**. Cookie này được thiết lập trực tiếp bởi backend qua header `Set-Cookie`.
  - **Lợi ích**: Ngăn chặn hoàn toàn các cuộc tấn công đánh cắp token qua lỗ hổng XSS (do mã JavaScript không thể đọc được HttpOnly cookie) và giảm thiểu rủi ro tấn công CSRF nhờ cơ chế `SameSite=Strict`.

### 4.2 Đối với ứng dụng di động Flutter
- **Giải pháp khuyến nghị**:
  - Lưu trữ cả Access Token và Refresh Token trong bộ nhớ an toàn của hệ điều hành thông qua thư viện `flutter_secure_storage`.
  - Thư viện này tự động mã hóa dữ liệu trước khi lưu xuống thiết bị sử dụng **Keychain** (trên iOS) và **Keystore/Shared Preferences** (trên Android), ngăn chặn các ứng dụng khác đọc lén token.

---

## 5. Danh sách các API Endpoint Xác thực cốt lõi
- `POST /api/v1/auth/register`: Nhận `fullName`, `email`, `password`. Trả về thông báo thành công.
- `POST /api/v1/auth/login`: Nhận `email`, `password`. Trả về Access Token trong JSON body và Refresh Token trong HttpOnly cookie.
- `POST /api/v1/auth/refresh`: Đọc Refresh Token từ HttpOnly cookie, trả về Access Token mới và set Refresh Token mới vào cookie.
- `POST /api/v1/auth/logout`: Thu hồi Refresh Token hiện tại, xóa cookie.
- `GET /api/v1/auth/me`: Yêu cầu Access Token hợp lệ, trả về thông tin cá nhân hiện tại của user đăng nhập.
