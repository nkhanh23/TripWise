# Branch Strategy - AI Smart Travel Planner

Tài liệu này quy định chiến lược phân nhánh Git (Git Branching Strategy) áp dụng cho dự án.

---

## 1. Các nhánh chính trực tuyến (Long-lived Branches)

Hệ thống duy trì 2 nhánh chính chạy suốt vòng đời dự án:

- **`main`**: 
  - Lưu trữ mã nguồn chạy ổn định nhất, đại diện cho sản phẩm hiện hữu trên môi trường **Production**.
  - Code trên nhánh này bắt buộc phải được kiểm thử kỹ lưỡng và được merge thông qua Release PR hoặc Hotfix.
- **`develop`**:
  - Nhánh tích hợp chính. Đây là nơi các nhánh tính năng (`feature/*`) đổ vào sau khi hoàn thành Sprint.
  - Mã nguồn trên nhánh `develop` đại diện cho phiên bản chạy thử nghiệm trên môi trường **Staging**.

---

## 2. Các nhánh tạm thời (Short-lived Branches)

Các nhánh này được tạo ra để phục vụ một mục đích phát triển cụ thể và phải được xóa bỏ ngay sau khi merge vào nhánh chính:

### 2.1 Nhánh tính năng: `feature/*`
- **Mục đích**: Phát triển một User Story hoặc Task mới được định nghĩa trong backlog.
- **Tách ra từ**: `develop`.
- **Merge vào**: `develop`.
- **Quy tắc đặt tên**: `feature/P[Số_Phase]-T[ID_Task]-[tên_ngắn_gọn]` (Ví dụ: `feature/P1-T001-setup-db-skeleton`).

### 2.2 Nhánh sửa lỗi: `bugfix/*`
- **Mục đích**: Sửa các bug được phát hiện trong quá trình test trên môi trường Staging/QA.
- **Tách ra từ**: `develop`.
- **Merge vào**: `develop`.
- **Quy tắc đặt tên**: `bugfix/[ID_Task_Sửa_Lỗi]-[mô_tả_lỗi]` (Ví dụ: `bugfix/T102-fix-gemini-json-parser`).

### 2.3 Nhánh đóng gói: `release/*`
- **Mục đích**: Chuẩn bị đóng gói phiên bản mới, chạy smoke test và sửa các lỗi nhỏ trước khi đưa lên Production.
- **Tách ra từ**: `develop`.
- **Merge vào**: Cả `main` và `develop`.
- **Quy tắc đặt tên**: `release/v[Mã_Phiên_Bản]` (Ví dụ: `release/v1.0.0`).

### 2.4 Nhánh sửa lỗi khẩn cấp: `hotfix/*`
- **Mục đích**: Sửa đổi khẩn cấp các lỗi nghiêm trọng xảy ra trực tiếp trên Production (ví dụ: rò rỉ API key, PostgreSQL sập kết nối).
- **Tách ra từ**: `main`.
- **Merge vào**: Cả `main` và `develop` để đồng bộ code.
- **Quy tắc đặt tên**: `hotfix/v[Mã_Phiên_Bản]-[mô_tả_sự_cố]` (Ví dụ: `hotfix/v1.0.1-mask-api-key-log`).
