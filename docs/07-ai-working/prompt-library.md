# Prompt Library - AI Smart Travel Planner

Thư viện các prompt mẫu chuẩn (Prompt Templates) giúp người dùng giao tiếp, định hướng và kiểm soát AI Coding Assistant làm việc ổn định, đúng quy trình.

---

## 1. Prompt bắt đầu Sprint mới (Start New Sprint)
```text
Chúng ta bắt đầu thực hiện Sprint [Số_Sprint]: [Tên_Sprint] theo tài liệu docs/03-agile-scrum/sprint-[Số_Sprint].md. 
Hãy đọc lại:
- README.md, AGENTS.md, TASKS.md.
- docs/04-architecture/architecture-overview.md.
- docs/03-agile-scrum/definition-of-ready.md.
Hãy xác nhận bạn đã hiểu rõ mục tiêu (Goal), danh sách PBI cần làm và các ràng buộc kỹ thuật của Sprint này trước khi chúng ta chia nhỏ task đầu tiên.
```

---

## 2. Prompt thực hiện một Task nhỏ (Start One Task)
```text
Hãy thực hiện Task [ID_Task]: [Tên_Task] nằm trong Sprint [Số_Sprint]. 
Cấu hình chi tiết của task này nằm tại docs/05-engineering/ [tên_file_quy_tắc_nếu_có].
Yêu cầu:
- Đọc kỹ tài liệu docs/03-agile-scrum/definition-of-ready.md.
- Chỉ chỉnh sửa các tệp tin trong phạm vi: [đường_dẫn_files].
- Tuyệt đối cấm viết code lan man hoặc tự ý thêm thư viện ngoài.
- Viết bằng tiếng Việt và báo cáo theo format tại docs/07-ai-working/ai-rules.md.
```

---

## 3. Prompt rà soát Code (Review Current Code)
```text
Hãy đóng vai trò là Tech Lead rà soát chất lượng mã nguồn tại tệp [đường_dẫn_tệp_tin].
Hãy đối chiếu chi tiết với tài liệu docs/05-engineering/code-review-checklist.md và kiểm tra các khía cạnh:
1. Có vi phạm Clean Architecture / Modular Monolith boundary không?
2. Có lỗi bảo mật SQL Injection, rò rỉ Token hay hardcode secret không?
3. Có lỗi N+1 Query hay thiếu cache cho endpoint không?
4. Đã có Unit Test phủ tối thiểu 80% chưa?
Hãy chỉ ra các dòng code cần tối ưu và giải thích lý do kỹ thuật.
```

---

## 4. Prompt sửa lỗi (Fix Bug)
```text
Chúng ta có một bug cần sửa đổi tại tệp [đường_dẫn_tệp].
Chi tiết báo cáo lỗi:
- Mô tả lỗi: [mô_tả]
- Kết quả mong muốn: [expected]
- Kết quả thực tế: [actual]
- Log lỗi: [dán_log]
Hãy đối chiếu với docs/07-ai-working/bug-fix-template.md. Hãy đề xuất giải pháp sửa đổi tối thiểu, viết thêm regression test case và tuyệt đối cấm refactor các phần code không liên quan.
```

---

## 5. Prompt tái cấu trúc mã nguồn an toàn (Refactor Safely)
```text
Tôi cần tái cấu trúc (refactor) đoạn code tại [đường_dẫn_tệp_hoặc_lớp].
Hãy đọc kỹ docs/07-ai-working/refactor-rules.md.
Yêu cầu:
- Giữ nguyên hành vi hoạt động hiện tại (không thay đổi API contract, không đổi logic nghiệp vụ).
- Đảm bảo tất cả các test case hiện có vẫn Pass sau khi refactor.
- Hãy giải thích chi tiết rủi ro (risk) của việc refactor này và đề xuất rollback plan nếu gặp sự cố.
```

---

## 6. Các prompt chuyên biệt khác
- **Thêm API Endpoint**: *"Hãy thiết kế và viết code cho API endpoint: [đường_dẫn_API]. Đọc kỹ docs/04-architecture/api-design.md để tuân thủ JSON response envelope và global exception handling."*
- **Thêm Database Migration**: *"Hãy viết tệp SQL migration cho Flyway để [mục_đích]. Đọc kỹ docs/04-architecture/database-indexing.md để bổ sung chỉ mục index B-Tree hoặc GIST phù hợp."*
- **Tích hợp Cache**: *"Hãy triển khai bộ đệm Redis cho Use Case: [tên_use_case]. Đọc kỹ docs/04-architecture/cache-strategy.md để tuân thủ quy tắc Key Namespace và cấu hình fallback chịu lỗi khi Redis sập."*
- **Điều tra hiệu năng**: *"API `/api/v1/trips/generate` đang có thời gian phản hồi chậm. Hãy đối chiếu với docs/05-engineering/performance-checklist.md để rà soát lỗi N+1 Query, thiếu spatial index PostGIS hoặc nghẽn connection pool."*
