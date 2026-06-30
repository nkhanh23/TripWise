# Code Review Rules - AI Smart Travel Planner

Tài liệu này quy định các nguyên tắc rà soát code (Code Review Rules) dành cho AI Coding Assistant khi đóng vai trò reviewer để đánh giá Pull Request hoặc mã nguồn hiện có của dự án.

---

## 1. Nguyên tắc rà soát Kiến trúc (Architecture Review)
- Kiểm tra cấu trúc thư mục của code mới. Đảm bảo toàn bộ các file được xếp vào đúng tầng của Clean Architecture (`domain`, `application`, `infrastructure`, `presentation`).
- Phát hiện lỗi phụ thuộc ngược: Báo lỗi ngay nếu thấy lớp Domain import lớp ở tầng Application/Infrastructure.
- Kiểm tra tính độc lập module của Modular Monolith: Báo lỗi nếu thấy module này liên kết trực tiếp với database table hoặc model JPA của module khác.

---

## 2. Nguyên tắc rà soát Bảo mật (Security Review)
- Rà soát các tệp tin cấu hình và code, đảm bảo không có API key, mật khẩu, JWT secret nào bị hardcode.
- Kiểm tra các câu truy vấn cơ sở dữ liệu: Phải sử dụng Hibernate ORM hoặc Parameterized Queries của Spring Data JPA, cấm tuyệt đối việc cộng chuỗi SQL thô từ đầu vào của user.
- Đảm bảo đầu vào từ client đã được validate định dạng và độ dài chuỗi tại lớp DTO.

---

## 3. Nguyên tắc rà soát Hiệu năng & Database (Performance & DB Review)
- Phát hiện lỗi N+1 Query: Kiểm tra xem các câu truy vấn lấy danh sách có thực hiện JOIN FETCH cho các thực thể liên kết không.
- Rà soát chỉ mục Index: Khi thấy câu truy vấn sử dụng mệnh đề `WHERE` trên một cột mới, yêu cầu phải có tệp Flyway migration tạo index tương ứng.
- Đảm bảo các câu truy vấn tọa độ PostGIS sử dụng đúng chỉ mục không gian GIST.

---

## 4. Nguyên tắc rà soát Caching & API Contract (Cache & API Review)
- Kiểm tra xem Redis cache key có tuân thủ quy tắc namespace bắt đầu bằng `tripwise:` không. Có thiết lập thời hạn sống (TTL) hợp lý không.
- Đảm bảo API sử dụng đúng phiên bản `/api/v1/`, tên API dùng danh từ số nhiều kebab-case.
- Kiểm tra API Response: Phải bọc trong cấu trúc chuẩn Success/Error Envelope, DTO tách biệt hoàn toàn khỏi JPA Entity.

---

## 5. Nguyên tắc rà soát Kiểm thử & Nhật ký (Test & Logging Review)
- Kiểm tra test coverage: Đảm bảo có viết đầy đủ Unit Test cho các use cases mới, độ bao phủ đạt tối thiểu 80%.
- Kiểm tra log: Đảm bảo sử dụng đúng log level (`INFO`, `WARN`, `ERROR`), log có in kèm Correlation ID và không log thông tin nhạy cảm.
