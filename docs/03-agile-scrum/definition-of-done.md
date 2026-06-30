# Definition of Done (DoD) - AI Smart Travel Planner

Một Nhiệm vụ phát triển (Task) hoặc User Story được coi là **Hoàn thành (Done)** và sẵn sàng để merge vào branch chính (`develop`/`main`) khi và chỉ khi đáp ứng đầy đủ các tiêu chuẩn kiểm duyệt chất lượng sau:

---

## 1. Mã nguồn biên dịch thành công (Code Compiles & Builds)
- Toàn bộ mã nguồn backend Spring Boot phải biên dịch thành công thông qua Gradle không gặp lỗi.
- Không phát sinh các cảnh báo (warnings) nghiêm trọng liên quan đến bảo mật hoặc deprecation.
- Không làm vỡ cấu trúc Clean Architecture: Logic nghiệp vụ không nằm trong presentation layer.

---

## 2. Kiểm thử tự động vượt qua (Automated Tests Pass)
- Tất cả Unit Test và Integration Test hiện có của hệ thống phải chạy thành công 100%.
- Các test case mới phục vụ cho tính năng này phải được viết đầy đủ, bao phủ các trường hợp đúng (happy path) và các trường hợp lỗi (edge cases/validation errors).
- Code Coverage tối thiểu của module thay đổi đạt `80%`.

---

## 3. Định dạng API chính xác (API Contract Complies)
- API được xây dựng đúng theo Spec thiết kế ban đầu (đường dẫn bắt đầu bằng `/api/v1`).
- Sử dụng DTO riêng biệt cho Request/Response, không lộ thực thể JPA Entity.
- Cấu trúc JSON trả về chuẩn hóa, không chứa các trường null không mong muốn hoặc thừa thông tin.

---

## 4. Xác thực và Validate dữ liệu (Input Validation)
- Dữ liệu đầu vào từ client gửi lên (Request Body, Query Parameters) phải được validate chặt chẽ bằng các annotation của Hibernate Validator (ví dụ: `@NotNull`, `@NotBlank`, `@Size`, `@Pattern`).
- Các lỗi validate phải được bắt và định dạng lại qua Global Exception Handler trước khi gửi về client.

---

## 5. Xử lý lỗi an toàn (Safe Error Handling)
- Ứng dụng phải có cơ chế bắt ngoại lệ (try-catch) cụ thể tại các tầng tích hợp API ngoài (Gemini, OSRM, Weather).
- Không được trả về stack trace hệ thống (Java exception traces) cho client khi xảy ra lỗi.
- Đảm bảo cơ chế fallback hoạt động khi các API ngoài bị mất kết nối hoặc sập.

---

## 6. Bảo mật Secret & Che giấu Log (Security Hardening)
- Kiểm tra không có bất kỳ API Key, mật khẩu cơ sở dữ liệu, hoặc JWT Secret Key nào bị lưu cứng (hardcode) trong mã nguồn được push lên Git.
- Cấu hình Logback đã được kiểm tra: Đảm bảo mật khẩu người dùng, thông tin token xác thực và API Key bên thứ ba đã được che giấu (masked) trong file log, không in plaintext.

---

## 7. Cập nhật tài liệu (Documentation Update)
- Nếu nhiệm vụ làm thay đổi cấu hình hệ thống, cách cài đặt môi trường, hoặc thay đổi thiết kế API, lập trình viên/AI phải cập nhật thông tin tương ứng vào các file tài liệu liên quan (`README.md`, `DECISIONS.md`, các file trong `docs/`).

---

## 8. Đạt tiêu chí nghiệm thu (Meets Acceptance Criteria)
- Tính năng hoạt động ổn định và đáp ứng đầy đủ tất cả các tiêu chí nghiệm thu (Acceptance Criteria) được mô tả trong User Story tại Product Backlog.
- Được xác nhận chạy thử thành công trên môi trường cục bộ (local).
