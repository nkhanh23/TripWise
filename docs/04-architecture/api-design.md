# API Design - AI Smart Travel Planner

## 1. REST API Conventions (Quy ước thiết kế)
Hệ thống tuân thủ các quy chuẩn thiết kế RESTful API tiêu chuẩn:
- **Đường dẫn (Resource Paths)**: Sử dụng danh từ số nhiều ở định dạng **kebab-case** (ví dụ: `/api/v1/places`, `/api/v1/saved-trips`).
- **Phương thức HTTP (HTTP Methods)**:
  - `GET`: Lấy dữ liệu (không thay đổi trạng thái hệ thống).
  - `POST`: Tạo mới tài nguyên.
  - `PUT`: Cập nhật toàn bộ tài nguyên (hoặc thay thế).
  - `PATCH`: Cập nhật một phần tài nguyên.
  - `DELETE`: Xóa tài nguyên.
- **Định dạng dữ liệu**: Bắt buộc sử dụng JSON cho cả Request Body và Response Body. Thuộc tính JSON viết dưới dạng **camelCase** (ví dụ: `startDate`, `durationMinutes`).

---

## 2. Định dạng Response chuẩn hóa

### 2.1 Định dạng Response thành công (Success Response Envelope)
Tất cả các API trả lời thành công đều được bọc trong cấu trúc chuẩn:
```json
{
  "code": 200,
  "status": "Success",
  "message": "Thực hiện tác vụ thành công",
  "data": {
    "id": 123,
    "name": "Bãi biển Trần Phú"
  }
}
```

### 2.2 Định dạng Response lỗi (Error Response Envelope)
Khi xảy ra lỗi (lỗi validate, lỗi phân quyền, lỗi hệ thống), API trả về cấu trúc lỗi chi tiết kèm Correlation ID để truy vết:
```json
{
  "timestamp": "2026-06-30T15:00:00.000Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Dữ liệu đầu vào không hợp lệ",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "details": [
    {
      "field": "startDate",
      "issue": "Ngày bắt đầu không được để trống"
    }
  ]
}
```

---

## 3. Phân trang, Lọc và Sắp xếp (Pagination, Filtering, Sorting)
- **Phân trang (Pagination)**: Các API trả về danh sách lớn (như danh sách địa điểm, danh sách trip) bắt buộc hỗ trợ phân trang qua query parameters:
  - `page`: Số trang (bắt đầu từ `0`).
  - `size`: Số lượng phần tử trên một trang (mặc định là `10`, tối đa `100`).
- **Sắp xếp (Sorting)**: Hỗ trợ tham số `sort` theo cấu trúc `fieldName,asc|desc` (ví dụ: `/api/v1/places?sort=estimatedCost,asc`).
- **Bộ lọc (Filtering)**: Lọc trực tiếp qua query params (ví dụ: `/api/v1/places?category=cafe&indoor=true`).

---

## 4. Bảo vệ API & Rate Limiting Headers
Đối với các endpoint có tải cao hoặc tốn chi phí, hệ thống trả về các Header điều khiển Rate Limiting:
- `X-RateLimit-Limit`: Số lượng request tối đa được phép trong một khung thời gian.
- `X-RateLimit-Remaining`: Số lượng request còn lại được phép thực hiện.
- `X-RateLimit-Reset`: Thời gian còn lại (giây) trước khi hạn mức được reset.

---

## 5. Tính Idempotency (Tránh trùng lặp)
- Các phương thức `PUT` và `DELETE` mặc nhiên có tính chất Idempotent (gọi nhiều lần kết quả trạng thái hệ thống không đổi).
- Đối với `POST /api/v1/trips/generate` hoặc `POST /api/v1/itineraries` (lưu lịch trình): Để tránh trường hợp người dùng bấm đúp (double submit) dẫn đến tạo trùng lặp lịch trình hoặc tốn cost AI 2 lần, client có thể gửi kèm header `X-Idempotency-Key` (chứa mã UUID duy nhất cho phiên tạo). Backend sẽ cache Key này trong Redis trong 5 phút; request trùng lặp gửi lên trong thời gian này sẽ lập tức nhận lại kết quả cũ đã cache mà không thực thi lại logic nghiệp vụ.

---

## 6. Danh mục các nhóm API chính

### 6.1 Nhóm API Xác thực (Auth)
- `POST /api/v1/auth/register`: Đăng ký tài khoản.
- `POST /api/v1/auth/login`: Đăng nhập lấy token.
- `POST /api/v1/auth/refresh`: Refresh token.
- `POST /api/v1/auth/logout`: Đăng xuất thu hồi token.
- `GET /api/v1/auth/me`: Lấy thông tin phiên đăng nhập hiện tại.

### 6.2 Nhóm API Địa điểm (Places)
- `GET /api/v1/places`: Tìm kiếm, phân trang và lọc địa điểm du lịch Nha Trang.
- `GET /api/v1/places/:id`: Xem chi tiết địa điểm.

### 6.3 Nhóm API Tạo lịch trình (Trips)
- `POST /api/v1/trips/generate`: Nhập prompt, sinh lịch trình thô dựa trên AI + PostGIS + Route + Weather.

### 6.4 Nhóm API Quản lý Itinerary (Lưu trữ)
- `POST /api/v1/itineraries`: Lưu lịch trình đã tạo vào tài khoản cá nhân.
- `GET /api/v1/itineraries`: Lấy danh sách lịch trình đã lưu của user (có phân trang).
- `GET /api/v1/itineraries/:id`: Xem chi tiết một lịch trình.
- `DELETE /api/v1/itineraries/:id`: Xóa lịch trình đã lưu.

### 6.5 Nhóm API Route & Weather (Hạ tầng)
- `POST /api/v1/routes`: Tính toán đường đi thực tế giữa danh sách tọa độ (gọi OSRM).
- `GET /api/v1/weather`: Lấy thông tin thời tiết Nha Trang (GET).

### 6.6 Nhóm API Gợi ý (Hotels & Transports)
- `GET /api/v1/hotels/suggestions`: Gợi ý khách sạn.
- `GET /api/v1/transports/suggestions`: Gợi ý phương tiện di chuyển.

### 6.7 Nhóm API Admin
- `POST /api/v1/admin/places`: Thêm địa điểm mới.
- `PUT /api/v1/admin/places/:id`: Cập nhật thông tin địa điểm.
- `DELETE /api/v1/admin/places/:id`: Ẩn/xóa địa điểm.
- `POST /api/v1/admin/places/import`: Import dữ liệu thô từ OpenStreetMap POI.
