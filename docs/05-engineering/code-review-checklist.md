# Code Review Checklist - AI Smart Travel Planner

Bảng hướng dẫn kiểm duyệt chất lượng mã nguồn (Code Review) dành cho kỹ sư rà soát và AI Coding Assistant trước khi duyệt Merge Pull Request.

---

## 1. Rà soát Kiến trúc & Thiết kế (Architecture)
- [ ] Mã nguồn có tuân thủ đúng cấu trúc 4 lớp Clean Architecture không? Có sự xuất hiện của logic nghiệp vụ bên trong Controller không?
- [ ] Có sự liên kết trực tiếp (annotation `@ManyToOne` hay `@OneToMany`) chéo giữa thực thể của module này với module khác không?
- [ ] Module này có truy vấn trực tiếp vào database table của module khác không? Có câu lệnh SQL JOIN chéo bảng của hai module khác nhau không?
- [ ] Giao tiếp giữa các module đã đi qua interfaces (Ports/Services) được định nghĩa rõ ràng chưa?

---

## 2. Rà soát Bảo mật (Security)
- [ ] Mật khẩu người dùng đã được mã hóa bằng bcrypt chưa? Có nguy cơ in mật khẩu rõ (plaintext) ra log hoặc trả về qua API response không?
- [ ] Đầu vào API đã được kiểm tra tính hợp lệ bằng Hibernate Validator chưa? Có nguy cơ bị tấn công SQL Injection (do sử dụng nối chuỗi SQL thô) không?
- [ ] Endpoint bảo vệ đã được kiểm tra quyền sở hữu dữ liệu chưa (ví dụ: `userId` từ token có trùng khớp với chủ sở hữu của lịch trình đang yêu cầu xóa)?
- [ ] Các tệp tin cấu hình được thay đổi trong PR có chứa API Key, mật khẩu DB thô bị commit lên Git không?

---

## 3. Rà soát Hiệu năng & Tối ưu (Performance)
- [ ] Câu truy vấn JPA/Hibernate có nguy cơ xảy ra lỗi N+1 Query không (kiểm tra xem đã sử dụng `JOIN FETCH` cho các liên kết bảng chưa)?
- [ ] Các API trả về danh sách đã được thiết lập phân trang (`page`, `size`) chưa?
- [ ] Các API gọi tới bên thứ ba (Gemini, OSRM, Weather) đã được cấu hình timeout và có cơ chế cache thích hợp chưa?
- [ ] Chỉ mục B-Tree hoặc chỉ mục không gian GIST đã được khai báo trong tệp Flyway migration cho các trường tham gia vào mệnh đề `WHERE` của câu truy vấn mới chưa?

---

## 4. Rà soát Kiểm thử (Test)
- [ ] Lớp Use Case hoặc Domain Service mới viết đã có Unit Test bao phủ tối thiểu `80%` mã nguồn chưa?
- [ ] Đã có test case bao phủ kịch bản lỗi mạng, timeout hoặc API bên ngoài bị sập (kiểm tra cơ chế fallback hoạt động đúng) chưa?
- [ ] Toàn bộ test suite chạy thành công 100%, không bị bypass/disable test case nào để pass build chưa?

---

## 5. Rà soát Kỹ thuật Coding & Nhật ký (Clean Code & Logging)
- [ ] Tên lớp, tên biến, tên hàm đã tuân thủ đúng Naming Convention của từng cấu phần (Java, React, Flutter) chưa?
- [ ] Các đoạn thuật toán phức tạp (như thuật toán chấm điểm địa điểm, tối ưu quãng đường) có comment giải thích rõ ràng chưa?
- [ ] Việc ghi nhận log đã sử dụng đúng log level (`INFO`, `WARN`, `ERROR`) chưa? Có in ra log Correlation ID (`MDC`) không?
- [ ] Định dạng dữ liệu API trả về (JSON) có khớp chính xác với Spec thiết kế ban đầu không?
- [ ] Client Web/Mobile đã tích hợp Shimmer/Loading state, cơ chế chống click đúp (double submit) chưa?
