# Commit Convention - AI Smart Travel Planner

Tài liệu này quy định tiêu chuẩn viết nội dung commit (Commit Message Convention) dựa trên chuẩn **Conventional Commits**.

---

## 1. Cấu trúc chuẩn của một Commit Message

Mỗi commit message gửi lên kho chứa bắt buộc phải tuân thủ cấu trúc 3 phần sau:

```text
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

- **`type` (Kiểu thay đổi)**: Xác định loại thay đổi được thực hiện trong commit (xem danh mục ở mục 2).
- **`scope` (Phạm vi tác động - Tùy chọn)**: Tên của module hoặc cấu phần bị thay đổi (ví dụ: `auth`, `place`, `route`, `deps`).
- **`subject` (Tiêu đề)**: Mô tả ngắn gọn, súc tích về thay đổi bằng tiếng Anh hoặc tiếng Việt không dấu, viết ở thì hiện tại, không bắt đầu bằng chữ viết hoa và không có dấu chấm ở cuối.
- **`body` (Thân commit - Tùy chọn)**: Mô tả chi tiết lý do thực hiện thay đổi và ngữ cảnh nghiệp vụ.
- **`footer` (Chân commit - Tùy chọn)**: Liên kết với ID của task hoặc Issue (ví dụ: `Refs: #P1-T001`).

---

## 2. Danh mục các Kiểu commit (`type`)

- **`feat`**: Thêm một tính năng mới (ví dụ: `feat(auth): add google oauth2 login`).
- **`fix`**: Sửa một bug (ví dụ: `fix(gemini): resolve null pointer exception when parsing empty prompt`).
- **`docs`**: Chỉ thay đổi tài liệu hướng dẫn (ví dụ: `docs(sdlc): update deployment architecture overview`).
- **`style`**: Thay đổi định dạng code (khoảng trắng, format code, thiếu dấu chấm phẩy) nhưng không làm thay đổi logic thực thi của code.
- **`refactor`**: Tái cấu trúc mã nguồn nhưng không sửa lỗi cũng không thêm tính năng mới.
- **`perf`**: Thay đổi mã nguồn nhằm tối ưu hóa hiệu năng chạy (ví dụ: `perf(postgis): add gist index for places location`).
- **`test`**: Thêm mới test case hoặc sửa đổi cấu hình kiểm thử hiện có.
- **`chore`**: Các thay đổi nhỏ nhặt liên quan đến build tool, cấu hình Gradle, thêm thư viện phụ hoặc cập nhật tệp `.gitignore`.
- **`security`**: Commit xử lý các vấn đề liên quan đến bảo mật (ví dụ: `security(logging): add masking for user passwords`).

---

## 3. Các ví dụ Commit Message chuẩn

### Ví dụ 1: Commit thêm tính năng
```text
feat(place): add public nearby search API

- implement ST_DWithin query in PlaceRepository
- create GET /api/v1/places/nearby endpoint
- add unit test for Radius search in PlaceService

Refs: #P4-T004
```

### Ví dụ 2: Commit sửa lỗi
```text
fix(route): resolver redis connection fallback crash

when redis goes down, application now catches connection exception
and directly routes calls to PostgreSQL route_cache table.

Refs: #P5-T002
```
