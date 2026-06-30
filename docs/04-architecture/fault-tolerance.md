# Fault Tolerance - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế khả năng chống chịu lỗi (Fault Tolerance) của hệ thống, đảm bảo ứng dụng vẫn hoạt động ổn định và suy giảm tính năng một cách êm ái (graceful degradation) khi xảy ra sự cố ngoại vi.

---

## 1. Các mẫu thiết kế Chống chịu lỗi (Fault Tolerance Patterns)
Hệ thống tích hợp thư viện **Resilience4j** để quản lý các cuộc gọi mạng ra bên ngoài:

```text
                  ┌──────────────────────────────┐
                  │    Request từ Client         │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │          Bulkhead            │ (Cô lập Thread Pool)
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │       Circuit Breaker        │ (Ngắt mạch khi lỗi nhiều)
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │         Retry Engine         │ (Thử lại có trì hoãn)
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │      External API Call       │
                  └──────────────────────────────┘
```

- **Timeout (Thời gian chờ tối đa)**: Bắt buộc cấu hình timeout chặt chẽ cho mọi cuộc gọi HTTP Client để tránh treo thread.
- **Circuit Breaker (Ngắt mạch tự động)**:
  - Giám sát tỷ lệ lỗi của các cuộc gọi mạng. Nếu tỷ lệ lỗi vượt quá `50%` trong 10 lần gọi gần nhất, mạch sẽ chuyển sang trạng thái **`OPEN` (Ngắt hoàn toàn)**.
  - Khi mạch `OPEN`, mọi request tiếp theo sẽ lập tức đi vào luồng **Fallback** mà không gọi sang API ngoài, giúp bảo vệ tài nguyên hệ thống và cho phép đối tác phục hồi.
  - Sau một khoảng thời gian (ví dụ: 60 giây), mạch chuyển sang **`HALF-OPEN`** để thử gửi một vài request kiểm tra sức khỏe của API ngoài trước khi đóng mạch lại (`CLOSED`).
- **Bulkhead (Cô lập tài nguyên)**: Phân tách thread pool riêng biệt cho cuộc gọi Gemini API, OSRM API, và Weather API. Sự cố nghẽn thread của Weather API tuyệt đối không được làm ảnh hưởng đến thread xử lý auth hoặc sinh lịch trình cơ bản.

---

## 2. Chiến lược Fallback & Graceful Degradation (Suy giảm êm ái)

### 2.1 Fallback khi Gemini API lỗi (Sập/Timeout/Hết hạn mức)
- **Tác động**: Không thể parse ngôn ngữ tự nhiên thành JSON cấu trúc.
- **Cơ chế Fallback**:
  - Trả về mã lỗi thân thiện cho client, kích hoạt hiển thị giao diện **Form nhập thủ công** trên giao diện Web/Mobile.
  - Người dùng có thể tự tay chọn Điểm đến (mặc định Nha Trang ở MVP), Số ngày, Mức ngân sách và Sở thích thông qua các nút bấm trực quan thay vì nhập prompt tự do.

### 2.2 Fallback khi OSRM API lỗi
- **Tác động**: Không tính toán được quãng đường di chuyển và thời gian thực tế giữa các chặng.
- **Cơ chế Fallback**:
  - Hệ thống vẫn trả về lịch trình chi tiết và danh sách các địa điểm.
  - Trực tiếp vẽ đường nối thẳng (đường chim bay) bằng Leaflet Polyline giữa các marker trên bản đồ.
  - Hiển thị thông báo trên UI: *"Tạm thời chưa tính được tuyến đường di chuyển thực tế. Bản đồ hiện hiển thị khoảng cách ước lượng."*

### 2.3 Fallback khi Weather API lỗi
- **Tác động**: Không có thông tin dự báo thời tiết của chuyến đi.
- **Cơ chế Fallback**:
  - Hệ thống bỏ qua bước chạy thuật toán điều chỉnh lịch trình theo thời tiết.
  - Sử dụng giả định mặc định (trời nắng nhẹ, thuận lợi di chuyển) để giữ nguyên lịch trình.
  - Hiển thị thông báo: *"Dữ liệu thời tiết hiện không khả dụng. Lịch trình được thiết lập trong điều kiện thời tiết bình thường."*

### 2.4 Fallback khi Redis Cache lỗi
- **Tác động**: Mất kết nối bộ đệm L1.
- **Cơ chế Fallback**: Bắt ngoại lệ và chuyển hướng toàn bộ truy vấn đọc trực tiếp vào database PostgreSQL (`route_cache` và các bảng địa điểm), chấp nhận tăng độ trễ nhưng giữ ứng dụng chạy bình thường.

---

## 3. Thiết kế Response lỗi thân thiện với Trải nghiệm (UX)
Mỗi khi hệ thống kích hoạt luồng Fallback hoặc báo lỗi, Response trả về phải chứa thông tin hướng dẫn rõ ràng cho Client để thay đổi trạng thái giao diện:

```json
{
  "timestamp": "2026-06-30T15:00:00.000Z",
  "status": 503,
  "error": "Service Unavailable",
  "message": "Hệ thống AI phân tích tự động hiện đang quá tải.",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "details": [
    {
      "field": "gemini_api",
      "issue": "Kích hoạt chế độ điền form thủ công (fallback_mode = MANUAL_FORM)."
    }
  ]
}
```
*Client đọc thuộc tính `fallback_mode` trong `details` để chuyển đổi UI mượt mà cho người dùng.*
