# Refactor Rules - AI Smart Travel Planner

Tài liệu này xác lập các nguyên tắc và giới hạn đối với hoạt động tái cấu trúc mã nguồn (Refactoring) của AI Coding Assistant.

---

## 1. Khi nào được phép Refactor (When Refactor is Allowed)?
AI chỉ được thực hiện tái cấu trúc code khi đáp ứng một trong các điều kiện sau:
- Nhằm mục đích nâng cao hiệu năng chạy (ví dụ: Thay thế vòng lặp O(N^2) bằng giải thuật tối ưu hơn, chuyển đổi query thô sang JPA Specification).
- Nhằm mục đích nâng cao khả năng maintain (ví dụ: Loại bỏ mã nguồn trùng lặp bằng cách tách ra lớp helper, chia nhỏ một hàm quá dài trên 100 dòng thành các hàm nhỏ tự giải thích).
- Có sự yêu cầu trực tiếp từ người dùng (Developer/Tech Lead).

---

## 2. Khi nào CẤM Refactor (When Refactor is NOT Allowed)?
- **CẤM** thực hiện refactor khi hệ thống đang trong giai đoạn chuẩn bị phát hành (Release Sprint hoặc Bug-fixing Sprint) để tránh rủi ro phát sinh lỗi mới sát giờ go-live.
- **CẤM** tự ý refactor các cấu phần lõi của framework (như bộ lọc Spring Security, luồng quản lý token gia đình) nếu chưa có sự phê duyệt rõ ràng từ Tech Lead.
- **CẤM** refactor khi chưa có bộ Unit Test bao phủ đầy đủ tính năng hiện tại của lớp đó.

---

## 3. Quy tắc thực hiện Refactor an toàn

Để đảm bảo hoạt động refactor không gây lỗi hệ thống, AI phải tuân thủ quy trình 5 bước:

```text
[ Code Hiện Tại ]
       │
       ▼
 1. Chạy chạy toàn bộ Test hiện có (Xác nhận Pass)
       │
       ▼
 2. Thực hiện Refactor từng khối nhỏ (Không đổi API contract, không đổi logic nghiệp vụ)
       │
       ▼
 3. Chạy lại Test Suite (Xác nhận tiếp tục Pass)
       │
       ▼
 4. Viết thêm Unit Test cho phần code mới tối ưu
       │
       ▼
 5. Giải thích rủi ro (Risk) và đề xuất phương án Rollback cho User
```

- **Giữ nguyên hành vi (Behavior Unchanged)**: Refactor chỉ thay đổi cấu trúc bên trong của code, tuyệt đối **không được thay đổi hành vi bên ngoài** (API contract, Request/Response body, HTTP status trả về và mã lỗi nội bộ phải giữ nguyên).
- **Tránh viết lại hoàn toàn (Avoid Large Rewrite)**: Tránh việc xóa bỏ toàn bộ class/module để viết lại từ đầu. Hãy chia nhỏ việc refactor thành các commit/PR nhỏ, dễ kiểm duyệt và dễ rollback khi gặp sự cố.
