# Git Workflow - AI Smart Travel Planner

Tài liệu này đặc tả quy trình cộng tác làm việc và quản lý mã nguồn bằng Git cho đội ngũ lập trình và trợ lý AI Coding Assistant.

---

## 1. Chu trình phát triển Feature (Feature Workflow)

Quy trình phát triển một tính năng mới hoặc sửa lỗi được thực hiện qua các bước:

```text
[ Nhánh develop ]
       │
       ├──── 1. Tạo nhánh mới (feature/P1-T001-setup-db) ────┐
       │                                                     ▼
       │                                            [ Lập trình & Test ]
       │                                                     │
       │◄─── 3. Tạo Pull Request & Đạt DoD ──────────────────┘
       │     (Chạy CI build, Code Review)
       │
[ Merge thành công ]
```

1. **Bước 1: Lấy code mới nhất**
   - Trước khi tạo nhánh mới, lập trình viên phải đảm bảo đã đồng bộ code mới nhất từ nhánh phát triển chính (`develop` hoặc `main` tùy theo cấu hình):
     ```bash
     git checkout develop
     git pull origin develop
     ```
2. **Bước 2: Khởi tạo nhánh nhánh tính năng**
   - Nhánh mới phải được tách ra từ `develop` và đặt tên tuân thủ quy tắc tại tài liệu [branch-strategy.md](file:///c:/Users/PC/Documents/TripWise/docs/05-engineering/branch-strategy.md).
3. **Bước 3: Lập trình & Kiểm thử local**
   - Viết code và test case cục bộ. Đảm bảo toàn bộ test suite chạy thành công trước khi push code lên repo.

---

## 2. Quy trình gửi Pull Request (PR) & Review
- **Tạo Pull Request**: 
  - Đẩy nhánh lên GitHub/GitLab và khởi tạo một PR hướng vào nhánh `develop`.
  - Bắt buộc điền thông tin mô tả theo mẫu chuẩn tại tài liệu [pull-request-template.md](file:///c:/Users/PC/Documents/TripWise/docs/05-engineering/pull-request-template.md).
- **Chạy CI Tự động**: Hệ thống CI (GitHub Actions) tự động kích hoạt chạy lệnh biên dịch dự án và chạy toàn bộ Unit/Integration Test. Nếu CI bị lỗi (build fail), PR sẽ bị khóa không cho merge.
- **Code Review**: 
  - Yêu cầu tối thiểu có **1 lập trình viên khác** (hoặc Tech Lead) rà soát, đánh giá chất lượng mã nguồn theo tài liệu [code-review-checklist.md](file:///c:/Users/PC/Documents/TripWise/docs/05-engineering/code-review-checklist.md).
  - Lập trình viên sửa đổi các điểm chưa hợp lý theo phản hồi của reviewer.

---

## 3. Quy tắc Merge & Phát hành (Release)
- **Điều kiện Merge**: Một PR chỉ được phép merge vào nhánh `develop` khi đáp ứng đủ 3 yếu tố:
  1. Pipeline CI báo build thành công và tất cả các test case đều Pass.
  2. Đạt tối thiểu 1 phê duyệt (Approve) từ người review.
  3. Không xảy ra xung đột code (no merge conflicts).
- **Phương thức Merge**: Sử dụng phương pháp **Squash and Merge** đối với các nhánh feature để nén toàn bộ lịch sử commit nhỏ lẻ thành một commit sạch duy nhất trên nhánh chính, giúp lịch sử Git không bị loãng.
- **Quy trình Release**:
  - Khi nhánh `develop` tích hợp đầy đủ các tính năng của Sprint và chạy ổn định trên môi trường Staging.
  - Tạo PR từ `develop` vào `main`.
  - Thực hiện gắn tag phiên bản (ví dụ: `v1.0.0`) trên nhánh `main` để kích hoạt CD deploy tự động lên môi trường Production.
