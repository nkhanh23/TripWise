# Rate Limiting - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế hệ thống giới hạn tần suất gọi API (Rate Limiting) nhằm bảo vệ hạ tầng công nghệ, ngăn ngừa tấn công DDoS và kiểm soát chi phí sử dụng các dịch vụ bên thứ ba (Gemini, OSRM, Weather).

---

## 1. Cơ chế hoạt động của Distributed Rate Limiting
Hệ thống sử dụng bộ lọc **Distributed Rate Limiter** dựa trên thư viện **Bucket4j** tích hợp với **Redis** để triển khai thuật toán **Token Bucket (Thùng thẻ)** ở tầng backend Spring Boot. Thuật toán này cho phép xử lý các đợt request tăng đột biến trong thời gian ngắn (burst traffic) nhưng vẫn đảm bảo tổng số request trong một khung giờ không vượt quá hạn mức.

```text
[ Incoming Request ]
         │
         ▼
[ Rate Limiter Filter ]
         │
    Đọc Redis Key ──► (Kiểm tra số lượng Token còn lại)
         │
         ├─── Có Token ───► (Trừ 1 Token, cho phép đi qua) ──► [ Controller ]
         │
         └─── Hết Token ──► (Chặn lại, trả về lỗi 429)
```

- **IP-Based Limiting (Dành cho Guest)**: Nhận diện người dùng bằng địa chỉ IP client (`X-Forwarded-For` hoặc Remote IP). Áp dụng hạn mức nghiêm ngặt do tính danh tính thấp.
- **User-Based Limiting (Dành cho User đã đăng nhập)**: Nhận diện bằng `userId` trích xuất từ JWT token. Hạn mức được nới rộng hơn so với khách vãng lai.

---

## 2. Chi tiết phân tầng hạn mức (Rate Limit Thresholds)

Hệ thống phân chia tần suất truy cập thành các tầng cụ thể để cân bằng giữa trải nghiệm và an toàn tài nguyên:

| Nhóm API | Định danh bằng | Hạn mức cho phép | Khung thời gian | Trạng thái lỗi |
| :--- | :---: | :---: | :---: | :---: |
| **Tạo lịch trình (`/trips/generate`)** | `userId` (User) | **5 requests** | 1 giờ | `429 Too Many Requests` |
| **Tạo lịch trình (`/trips/generate`)** | `IP` (Guest) | **1 request** | 1 giờ | `429 Too Many Requests` |
| **Xác thực (`/auth/login`, `/register`)**| `IP` | **5 requests** | 1 phút | `429 Too Many Requests` |
| **Tìm kiếm công khai (`/places`)** | `IP` | **30 requests** | 1 phút | `429 Too Many Requests` |
| **Đọc dữ liệu cá nhân (`/itineraries`)** | `userId` | **100 requests**| 1 phút | `429 Too Many Requests` |
| **Quản trị (`/admin/**`)** | `userId` (Admin) | **Không giới hạn** | - | - |

---

## 3. Cấu trúc Response lỗi 429 chuẩn hóa
Khi người dùng vượt quá hạn mức, bộ lọc filter lập tức chặn lại và trả về mã trạng thái **HTTP 429 Too Many Requests** với nội dung JSON chuẩn:

```json
{
  "timestamp": "2026-06-30T15:00:00.000Z",
  "status": 429,
  "error": "Too Many Requests",
  "message": "Bạn đã vượt quá số lượng yêu cầu tạo lịch trình cho phép trong giờ này. Vui lòng thử lại sau.",
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "details": [
    {
      "field": "rate_limit",
      "issue": "Hạn mức tối đa: 5 requests/giờ cho mỗi tài khoản."
    }
  ]
}
```

### Các Headers phản hồi đi kèm:
- `X-RateLimit-Limit`: 5
- `X-RateLimit-Remaining`: 0
- `X-RateLimit-Reset`: 1800 (Thời gian còn lại bằng giây trước khi thùng thẻ được làm đầy lại).

---

## 4. Các giải pháp kiểm soát chi phí API ngoài (Cost Protection)
Để ngăn chặn trường hợp lạm dụng làm cạn kiệt tài khoản và phát sinh hóa đơn lớn từ các API ngoài, hệ thống triển khai các lớp phòng thủ:

- **Giới hạn số ngày chuyến đi**: API tạo lịch trình chỉ chấp nhận thuộc tính `days` nằm trong khoảng **1 - 3 ngày**. Nếu người dùng gửi yêu cầu lớn hơn, API trả về lỗi `400 Bad Request` ngay tại lớp validate trước khi gọi Gemini API.
- **Giới hạn số địa điểm tối đa**: Giới hạn tối đa **5 địa điểm/ngày**. Hạn chế số lượng tọa độ gửi sang OSRM Route API.
- **Bảo vệ Gemini Wrapper**:
  - Không cho phép người dùng tự do nhập prompt quá dài (giới hạn độ dài chuỗi prompt tối đa **250 ký tự**).
  - Tích hợp bộ lọc Regex lọc bỏ các từ khóa độc hại hoặc tấn công tiêm mã độc vào prompt (Prompt Injection) trước khi gửi yêu cầu sang Google API.
