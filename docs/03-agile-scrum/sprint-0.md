# Sprint 0 - Documentation, Architecture, Rules & Environments

## 1. Goal (Mục tiêu Sprint)
Thiết lập toàn bộ nền móng tài liệu đặc tả sản phẩm, ranh giới quyết định kiến trúc kỹ thuật (ADRs), luật làm việc cho trợ lý lập trình AI (AGENTS.md) và thiết lập môi trường chạy thử nghiệm cơ sở dữ liệu/cache cục bộ (Docker Compose).

---

## 2. Tasks (Các công việc cần thực hiện)
- **Task 0.1**: Biên soạn và thống nhất các tài liệu Product bao gồm: Problem Statement, Vision, Target Users, User Journey và MVP Scope.
- **Task 0.2**: Thiết lập tài liệu Quyết định Kiến trúc (ADRs - Architecture Decision Records) chốt stack kỹ thuật Java 21 + Spring Boot 3.x, Clean Architecture, PostgreSQL + PostGIS, Redis, OSRM, Gemini API.
- **Task 0.3**: Biên soạn tài liệu Agile Scrum (Scrum Guide, Product Backlog, Definition of Ready/Done, Retrospective Template) làm cơ sở quản lý chất lượng.
- **Task 0.4**: Thiết lập tệp `docker-compose.yml` để chạy cục bộ (local) PostgreSQL (với extension PostGIS) và Redis.
- **Task 0.5**: Tạo tệp `.env.example` chứa danh sách các cấu hình biến môi trường mẫu và thiết lập tệp `.gitignore` bảo vệ secrets.

---

## 3. Deliverables (Các sản phẩm bàn giao)
- Hệ thống tài liệu tại thư mục `docs/01-product/`, `docs/02-sdlc/` và `docs/03-agile-scrum/` đầy đủ, không bị lỗi cú pháp Markdown.
- Tệp `AGENTS.md` tại thư mục gốc của dự án chứa các quy tắc bắt buộc cho AI.
- Tệp `docker-compose.yml` và `.env.example` hoạt động được.

---

## 4. Acceptance Criteria (Tiêu chí nghiệm thu)
- **AC-0.1**: Không có bất kỳ dòng mã nguồn nghiệp vụ backend hay frontend nào được sinh ra trong Sprint này.
- **AC-0.2**: Chạy lệnh `docker compose up -d` cục bộ phải khởi chạy thành công PostgreSQL có PostGIS extension và Redis mà không có lỗi kết nối hay quyền truy cập.
- **AC-0.3**: Cấu hình cơ sở dữ liệu mặc định trong `.env.example` sử dụng tài khoản không có quyền root/superuser.
- **AC-0.4**: Tất cả tài liệu thiết kế phải đồng bộ, không mâu thuẫn về mặt công nghệ (ví dụ: Không có sự xuất hiện của MongoDB hay Google Maps API độc quyền ở phần MVP).

---

## 5. Risks & Mitigation (Rủi ro và cách khắc phục)
- **Rủi ro**: Tài liệu kiến trúc và tài liệu Scrum bị rời rạc, dẫn đến việc lập trình viên hoặc AI hiểu sai ranh giới của MVP ở các Sprint sau.
- **Cách khắc phục**: SM/Developer tiến hành review chéo tất cả các file tài liệu trước khi kết thúc Sprint 0. AI Coding Assistant bắt buộc phải đọc toàn bộ nhóm tài liệu này ở đầu mỗi lượt làm việc.
