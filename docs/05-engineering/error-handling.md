# Error Handling - AI Smart Travel Planner

Tài liệu này đặc tả cơ chế quản lý ngoại lệ (Exception Handling) và quy chuẩn trả lỗi API của hệ thống.

---

## 1. Định dạng JSON lỗi chuẩn hóa (Error Envelope)
Tất cả các lỗi xảy ra trong quá trình xử lý request đều được bắt tập trung tại lớp `GlobalExceptionHandler` của tầng Presentation và trả về client theo cấu trúc chuẩn:
```json
{
  "timestamp": "2026-06-30T15:00:00.000Z",
  "status": [HTTP_STATUS_CODE],
  "error": "[HTTP_ERROR_NAME]",
  "message": "[Thông điệp lỗi thân thiện với người dùng]",
  "errorCode": "[Mã lỗi nội bộ hệ thống]",
  "correlationId": "[UUID phục vụ tìm kiếm log]",
  "details": [
    {
      "field": "[Tên trường lỗi nếu là lỗi validate]",
      "issue": "[Chi tiết lỗi cụ thể]"
    }
  ]
}
```

---

## 2. Quy ước mã lỗi nội bộ (Error Code Convention)
Hệ thống định nghĩa danh mục mã lỗi nội bộ theo tiền tố của từng module để dễ dàng khoanh vùng sự cố:

| Mã lỗi | Nhóm lỗi | Ý nghĩa | Trạng thái HTTP |
| :--- | :--- | :--- | :---: |
| **`AUTH_001`** | Xác thực | Email đăng ký đã tồn tại | 400 Bad Request |
| **`AUTH_002`** | Xác thực | Sai email hoặc mật khẩu | 401 Unauthorized |
| **`AUTH_003`** | Xác thực | Token hết hạn hoặc không hợp lệ | 401 Unauthorized |
| **`AUTH_004`** | Xác thực | Phát hiện reuse Refresh Token | 401 Unauthorized |
| **`PLACE_001`**| Địa điểm | Không tìm thấy địa điểm theo ID | 404 Not Found |
| **`PLACE_002`**| Địa điểm | Tọa độ địa lý không hợp lệ | 400 Bad Request |
| **`TRIP_001`** | Lịch trình | Yêu cầu số ngày vượt giới hạn (1-3 ngày) | 400 Bad Request |
| **`SYS_001`**  | Hệ thống | Redis Cache mất kết nối | 500 Internal Error (Log WARN) |
| **`SYS_002`**  | Hệ thống | Gemini API lỗi hoặc trả sai JSON | 503 Service Unavailable |
| **`SYS_003`**  | Hệ thống | OSRM API timeout / mất kết nối | 503 Service Unavailable |
| **`LIMIT_001`**| Giới hạn | Vượt quá tần suất yêu cầu cho phép | 429 Too Many Requests |

---

## 3. Quy tắc phân định Thông tin Log nội bộ và Response công khai
Để đảm bảo an toàn thông tin và tránh rò rỉ lỗ hổng bảo mật:
- **Thông điệp trả về client (Response Message)**:
  - Phải sử dụng ngôn ngữ thân thiện, dễ hiểu, hướng dẫn người dùng cách khắc phục (ví dụ: *"Thông tin đăng nhập chưa chính xác, vui lòng thử lại"* hoặc *"Hệ thống AI phân tích tự động hiện đang bận, vui lòng điền form thủ công"*).
  - Tuyệt đối cấm trả về tên lớp Java, tên hàm, câu lệnh SQL thô, tên cột DB, hoặc chi tiết stack trace.
- **Nhật ký nội bộ (Internal Log)**:
  - Ghi nhận chi tiết nguyên nhân gốc rễ (Root Cause), in đầy đủ thông tin stack trace lỗi kèm theo Correlation ID để kỹ sư phần mềm debug.
  - Sử dụng log level `ERROR` cho các lỗi hệ thống không thể tự phục hồi (`SYS_002` khi sập database) và log level `WARN` cho các lỗi nghiệp vụ thông thường (`AUTH_002` khi user gõ sai pass).
