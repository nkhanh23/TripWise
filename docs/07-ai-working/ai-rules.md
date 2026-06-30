# AI Working Rules - AI Smart Travel Planner

Tài liệu này xác lập các quy tắc làm việc bắt buộc (Quy tắc luật) đối với trợ lý lập trình AI Coding Assistant khi tham gia dự án.

---

## 1. Đọc và Hiểu ngữ cảnh bắt buộc (Required Reading)
Trước khi tạo hoặc chỉnh sửa bất kỳ tệp tin nào trong dự án, AI bắt buộc phải đọc và hiểu sâu sắc nội dung các tệp tin sau để nắm vững định hướng:
1. [README.md](file:///c:/Users/PC/Documents/TripWise/README.md): Tổng quan dự án, mục tiêu và stack công nghệ đã chốt.
2. [AGENTS.md](file:///c:/Users/PC/Documents/TripWise/AGENTS.md): Bộ quy tắc làm việc cốt lõi của AI.
3. [DECISIONS.md](file:///c:/Users/PC/Documents/TripWise/DECISIONS.md): Tài liệu quyết định kiến trúc kỹ thuật (ADRs).
4. [TASKS.md](file:///c:/Users/PC/Documents/TripWise/TASKS.md): Danh mục các tác vụ kỹ thuật theo phân ranh giới.
5. Tài liệu đặc tả SDLC (`docs/02-sdlc/`), Agile Scrum (`docs/03-agile-scrum/`), và Kiến trúc (`docs/04-architecture/`).

---

## 2. Quy tắc giới hạn phạm vi & Ranh giới (Boundary Rules)
- **Một task tại một thời điểm (One task at a time)**: AI chỉ được phép thực hiện duy nhất một nhiệm vụ nhỏ được giao ở lượt hiện tại. Tuyệt đối không viết lan man sang các tính năng khác nằm ngoài phạm vi nghiệm thu.
- **Không tự ý thay đổi kiến trúc (No architecture changes)**: AI không được tự ý đổi stack công nghệ (ví dụ: đổi sang Node.js, MongoDB), không tự ý tách microservices sớm, không đổi ranh giới module. AI tuyệt đối không được đọc các cấu trúc mẫu NoSQL/MongoDB trong file đặc tả dự án gốc, bắt buộc tuân thủ 100% PostgreSQL + PostGIS.
- **Không phình to phạm vi (No Scope Creep)**: Không tự động thêm các tính năng nâng cao nằm ngoài đặc tả MVP Nha Trang (1-3 ngày, 3-5 điểm/ngày).

---

## 3. Quy chuẩn lập trình & Bảo mật đối với AI
- **Tuân thủ DoR & DoD**:
  - Chỉ bắt đầu viết code khi nhiệm vụ đạt chuẩn **Definition of Ready (DoR)** (yêu cầu rõ, database impact rõ, có test case định hướng).
  - Chỉ đánh dấu hoàn thành nhiệm vụ khi đạt chuẩn **Definition of Done (DoD)** (code build success, test pass 100%, input validated, no secrets, no sensitive logs).
- **Tuyệt đối bảo mật**:
  - Không được ghi cứng (hardcode) mật khẩu, token xác thực hay API Keys vào mã nguồn.
  - Tự động áp dụng bộ lọc che giấu (masking) thông tin nhạy cảm trong file log.
  - Tắt hiển thị java stack trace thô ra client.

---

## 4. Quy định định dạng báo cáo (Reporting Format)
Sau mỗi nhiệm vụ hoàn thành, AI bắt buộc phải báo cáo kết quả theo đúng cấu trúc 5 phần:
1. **Summary**: Tóm tắt ngắn gọn các công việc kỹ thuật đã thực hiện.
2. **Files changed**: Danh sách các file được tạo mới, sửa đổi hoặc xóa (dùng absolute path link).
3. **How to test**: Hướng dẫn chi tiết cách chạy thử nghiệm để kiểm duyệt tính năng.
4. **Risks**: Các rủi ro tiềm ẩn đối với hệ thống, database hoặc cache.
5. **Next suggested task**: Đề xuất duy nhất một nhiệm vụ nhỏ tiếp theo trong backlog để người dùng duyệt.
