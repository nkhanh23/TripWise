# Task Template - AI Smart Travel Planner

*Tệp tin này được dùng làm khuôn mẫu (Template) khi PO/Scrum Master khởi tạo một Task kỹ thuật mới trong backlog.*

---

## Task ID: [Ví dụ: P1-T001]
### Title: [Tên ngắn gọn của nhiệm vụ]

### 1. Goal (Mục tiêu)
*Mô tả mục tiêu kỹ thuật hoặc nghiệp vụ cần đạt được sau khi hoàn thành task này.*

### 2. Context (Ngữ cảnh)
*Giải thích lý do tại sao cần làm task này và mối liên hệ của nó với các cấu phần hiện có trong hệ thống.*

### 3. Requirements (Yêu cầu kỹ thuật)
*Mô tả chi tiết các yêu cầu lập trình cụ thể:*
- Yêu cầu 1: `...`
- Yêu cầu 2: `...`

### 4. Acceptance Criteria (Tiêu chí nghiệm thu - AC)
*Các tiêu chuẩn đo lường để nghiệm thu nhiệm vụ:*
- [ ] AC-1: `...`
- [ ] AC-2: `...`

### 5. Files Likely Changed (Các file có khả năng thay đổi)
*Giới hạn ranh giới các tệp tin mà lập trình viên/AI được phép can thiệp:*
- `[MODIFY]` [đường_dẫn_tệp]
- `[NEW]` [đường_dẫn_tệp]

### 6. DO NOT (Những điều CẤM làm)
*Thiết lập ranh giới kỷ luật cho AI:*
- **CẤM** tự ý thay đổi: `...`
- **CẤM** import thư viện: `...`
- **CẤM** code lan man sang: `...`

### 7. Test Suggestions (Gợi ý kiểm thử)
*Định hướng viết test case:*
- Unit Test: Viết test cho lớp `...` bao phủ trường hợp `...`
- Integration Test: `...`

### 8. Engineering Considerations (Xem xét kỹ thuật)
- **Security**: *Lưu ý về xác thực, phân quyền, CORS, hoặc mã hóa dữ liệu nhạy cảm.*
- **Performance**: *Lưu ý về tối ưu hóa SQL, tận dụng cache Redis hoặc nén dữ liệu.*
- **Database**: *Lưu ý về Flyway migration, kiểu dữ liệu PostGIS.*
- **Cache**: *Lưu ý về Key namespace, TTL.*
