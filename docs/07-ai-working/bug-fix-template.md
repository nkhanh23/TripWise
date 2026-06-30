# Bug Fix Template - AI Smart Travel Planner

*Tệp tin này được dùng làm mẫu (Template) khi PO hoặc Developer khai báo một Bug/Lỗi hệ thống cần AI sửa đổi.*

---

## 1. Bug Description (Mô tả lỗi)
*Mô tả ngắn gọn lỗi xảy ra là gì, tác động của nó tới hệ thống hoặc người dùng.*

## 2. Expected Behavior (Kết quả mong muốn)
*Kết quả hệ thống nên trả về hoặc hoạt động đúng theo thiết kế.*

## 3. Actual Behavior (Kết quả thực tế xảy ra)
*Kết quả lỗi thực tế nhận được (ví dụ: API trả về HTTP 500, bản đồ không vẽ polyline).*

## 4. Steps to Reproduce (Các bước tái hiện lỗi)
*Các bước cụ thể để kỹ sư/AI chạy thử tái hiện lỗi:*
1. Bước 1: `...`
2. Bước 2: `...`
3. Payload gửi lên: `...`

## 5. Suspected Area (Khu vực nghi ngờ lỗi)
*Chỉ ra tệp tin hoặc khối code nghi ngờ gây lỗi để khoanh vùng xử lý:*
- Tệp tin: [đường_dẫn_tệp_tin]
- Dòng code / Tên hàm: `...`

## 6. Logs & Stack Trace (Nếu có)
*Dán nội dung log lỗi ghi nhận trong file console/log server.*
```text
[Dán log lỗi tại đây]
```

---

## 7. Ràng buộc sửa lỗi dành cho AI (DO NOT Rules)
- **CẤM refactor các phần code không liên quan**: Chỉ tập trung chỉnh sửa đúng dòng code gây lỗi. Không tự ý định dạng lại code (reformat), đổi tên biến hay tối ưu hóa các lớp khác để tránh làm phát sinh lỗi mới (regression bugs).
- **Viết thêm Regression Test**: Sau khi sửa lỗi thành công, viết thêm ít nhất một test case mô phỏng lại đúng kịch bản gây lỗi ở trên và xác nhận test case này Pass sau khi sửa code.
