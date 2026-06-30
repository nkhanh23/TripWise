# Scrum Guide - AI Smart Travel Planner

## 1. Phương pháp Agile Scrum áp dụng vào dự án
Đối với dự án **AI Smart Travel Planner**, Scrum được áp dụng để duy trì tính liên tục, kỷ luật và phân ranh giới công việc rõ ràng. Các nguyên tắc cơ bản bao gồm:
- **Chu kỳ Sprint**: Mỗi Sprint kéo dài **1 tuần (7 ngày)**. Đây là khoảng thời gian tối ưu cho phép kiểm tra, đánh giá mã nguồn và sửa đổi tính năng nhanh chóng.
- **Tiến trình lặp (Iterative Process)**: Mỗi Sprint tập trung giải quyết một nhóm tính năng nhỏ hoạt động được (ví dụ: Sprint 3 tập trung vào Place module, Sprint 4 vào Trip/Gemini). Kết thúc Sprint phải cho ra một sản phẩm tăng trưởng (increment) chạy được và đạt chuẩn Definition of Done (DoD).
- **Mục tiêu tối thượng**: Đảm bảo không xảy ra hiện tượng **Scope Creep** (phình to phạm vi) và tránh viết mã nguồn lan man nằm ngoài kế hoạch đã chốt trong `TASKS.md`.

---

## 2. Bản đồ hóa các vai trò (Roles) trong dự án cá nhân
Trong một dự án nhỏ hoặc dự án cá nhân có sự hỗ trợ của AI, các vai trò Scrum truyền thống được ánh xạ như sau:

- **Product Owner (PO) - Người dùng / Khách hàng**:
  - Đóng vai trò là người đưa ra yêu cầu cốt lõi, duyệt phạm vi MVP và các tiêu chuẩn nghiệp vụ (Acceptance Criteria).
  - Có tiếng nói cuối cùng trong việc nghiệm thu tính năng và quyết định thay đổi trọng số thuật toán.
- **Scrum Master (SM) - Developer + AI**:
  - Chịu trách nhiệm bảo vệ quy trình làm việc, đảm bảo tuân thủ `AGENTS.md` (không tự ý đổi stack, không disable test, không để AI tự bịa địa điểm).
  - AI đóng vai trò như một trợ lý SM: Nhắc nhở quy trình, kiểm tra Definition of Ready (DoR) trước khi code và kiểm tra Definition of Done (DoD) trước khi commit.
- **Developer - Developer + AI Coding Assistant**:
  - Developer và AI cùng pair-programming để hiện thực hóa các dòng code thực tế.
  - AI viết các mã nguồn nền tảng, test case và cấu hình; Developer thực hiện kiểm duyệt chất lượng, giải quyết các xung đột logic và chạy test thực tế trên máy.

---

## 3. Các sự kiện Scrum (Scrum Events) và cách AI hỗ trợ

### 3.1 Sprint Planning (Lập kế hoạch Sprint)
- **Hoạt động**: Diễn ra vào đầu mỗi Sprint. PO và Team xác định Goal của Sprint và chọn các Backlog Items từ Product Backlog đưa vào Sprint Backlog.
- **AI hỗ trợ**: 
  - Phân tích độ lớn của User Story và đề xuất chia nhỏ thành các task kỹ thuật cụ thể.
  - Dự đoán các rủi ro kỹ thuật (như nguy cơ nghẽn kết nối, xung đột schema) dựa trên tài liệu kiến trúc.

### 3.2 Daily Check-in / Standup (Kiểm tra tiến độ)
- **Hoạt động**: Thay vì họp nhóm, Developer tự đánh giá 3 câu hỏi hàng ngày (được ghi nhận trong nhật ký phát triển):
  1. Hôm qua đã hoàn thành task nào?
  2. Hôm nay sẽ làm task nào tiếp theo?
  3. Có gặp khó khăn/trở ngại (impediment) nào không?
- **AI hỗ trợ**: 
  - Đọc log phát triển của phiên làm việc trước để tóm tắt tiến độ hiện tại.
  - Đưa ra giải pháp kỹ thuật cụ thể để tháo gỡ các bug hoặc lỗi cấu hình đang làm nghẽn tiến độ.

### 3.3 Sprint Review & Demo (Đánh giá Sprint)
- **Hoạt động**: Diễn ra cuối Sprint để demo phần mềm chạy được cho PO và nghiệm thu theo tiêu chuẩn Acceptance Criteria.
- **AI hỗ trợ**:
  - Tạo dữ liệu kiểm thử giả định (mock data) sạch để chạy kịch bản demo.
  - Soạn thảo tài liệu hướng dẫn kiểm thử thủ công (manual test steps) cho PO thực hiện nghiệm thu.

### 3.4 Sprint Retrospective (Cải tiến quy trình)
- **Hoạt động**: Đánh giá những điểm tốt, chưa tốt và rút ra bài học kinh nghiệm để cải tiến năng suất ở Sprint tiếp theo.
- **AI hỗ trợ**:
  - Đóng vai trò là người tổng hợp phản hồi, phân tích nguyên nhân gốc rễ của các lỗi phát sinh nhiều trong Sprint và đưa ra các đề xuất điều chỉnh quy tắc làm việc cho AI (cập nhật file `.agents/AGENTS.md`).
