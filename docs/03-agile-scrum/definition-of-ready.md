# Definition of Ready (DoR) - AI Smart Travel Planner

Một User Story hoặc Nhiệm vụ phát triển (Task) được coi là **Sẵn sàng (Ready)** để đưa vào Sprint Backlog và bắt đầu lập trình khi đáp ứng đầy đủ các tiêu chuẩn sau:

---

## 1. Yêu cầu rõ ràng (Clear Requirements)
- Nhiệm vụ phải được mô tả rõ ràng bằng tiếng Việt, giải thích rõ ngữ cảnh nghiệp vụ và mục tiêu cần đạt được.
- Người phát triển và AI Coding Assistant phải hiểu rõ luồng đi của dữ liệu (Data Flow) và tác động của nó tới trải nghiệm người dùng.

---

## 2. Tiêu chí nghiệm thu rõ ràng (Clear Acceptance Criteria - AC)
- Phải có ít nhất từ 2 đến 5 tiêu chí nghiệm thu (AC) được viết dưới dạng có thể đo lường và kiểm tra được (đúng/sai, đạt/không đạt).
- Tránh các mô tả mơ hồ như "giao diện đẹp mắt", "tốc độ nhanh", thay vào đó hãy viết "giao diện responsive trên iPhone 15", "thời gian phản hồi dưới 300ms".

---

## 3. Xác định tác động tới API và Database (API & Database Impact)
- Nếu nhiệm vụ làm thay đổi cấu trúc dữ liệu, phải xác định rõ:
  - Tên bảng, trường dữ liệu cần thêm hoặc sửa đổi.
  - Tác động tới dữ liệu không gian PostGIS (nếu có).
  - Tệp SQL Migration của Flyway cần viết.
- Nếu nhiệm vụ thay đổi API, phải có mô tả Spec sơ bộ: Endpoint, HTTP Method, Request Body, Response Body (JSON format) và các mã lỗi trả về mong muốn.

---

## 4. Xem xét yếu tố bảo mật (Security Considerations)
- Xác định rõ tính năng này có cần xác thực (Authentication) hay không.
- Phân quyền (Authorization) cụ thể: Ai được quyền gọi API này (Guest, Registered User, hay Admin).
- Đảm bảo không có nguy cơ lộ lọt dữ liệu nhạy cảm (mật khẩu, khóa API, token).

---

## 5. Xác định phương pháp kiểm thử (Test Expectations)
- Phải xác định rõ phương pháp kiểm thử cho nhiệm vụ này:
  - Cần viết những Unit Test nào, cho lớp nào.
  - Có cần viết Integration Test để chạy database container thực tế hay không.
  - Các tham số đầu vào cần kiểm thử biên (Boundary/Validation testing).

---

## 6. Nhiệm vụ đủ nhỏ (Task size limit)
- Nhiệm vụ phải được chia nhỏ ở mức tối đa: Có thể hoàn thành và kiểm thử độc lập trong vòng từ **4 giờ đến tối đa 2 ngày** làm việc.
- Nếu một nhiệm vụ quá lớn (ví dụ: "Phát triển toàn bộ module Trip"), bắt buộc phải chia tách thành các sub-task nhỏ hơn (ví dụ: "Thiết kế bảng Trip", "Viết API Gemini Parser", "Viết Use Case Scoring") trước khi đưa vào Sprint.
