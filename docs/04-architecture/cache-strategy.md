# Cache Strategy - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế bộ nhớ đệm (Caching) đa tầng nhằm tối ưu hóa hiệu năng, giảm độ trễ và kiểm soát chi phí API tích hợp ngoài.

---

## 1. Cấu trúc bộ nhớ đệm đa tầng (Multi-Level Caching)
Hệ thống sử dụng cơ chế cache 2 cấp:
- **Cấp 1 (In-Memory Cache - Redis)**: Bộ đệm phân tán tốc độ cao cho dữ liệu nóng có tần suất truy cập lớn và thay đổi liên tục.
- **Cấp 2 (Persistent Cache - PostgreSQL)**: Lưu trữ lâu dài kết quả của các tác vụ tốn kém (như tính toán tuyến đường OSRM) để phục vụ cho việc tái sử dụng giữa tất cả người dùng.

```text
[ API Client Request ]
         │
         ▼
[ Redis Cache (Level 1) ] ───────── Hit ────────► [ Trả về Client ]
         │
        Miss
         │
         ▼
[ PostgreSQL Persistent Cache (Level 2) ] ── Hit ──► [ Lưu Redis ] ──► [ Trả về Client ]
         │
        Miss
         │
         ▼
[ External API / DB Computation ] ──► [ Lưu PG ] ──► [ Lưu Redis ] ──► [ Trả về Client ]
```

---

## 2. Chi tiết phân bổ Cache và TTL (Time-To-Live)

| Loại dữ liệu | Tên Key Convention | Cấu trúc Redis | TTL đề xuất | Cơ chế Invalidation |
| :--- | :--- | :--- | :--- | :--- |
| **Dự báo thời tiết** | `tripwise:weather:{city}:{date}` | String | `6 giờ` | Hết hạn tự động (TTL) |
| **Chi tiết địa điểm** | `tripwise:place:detail:{id}` | Hash | `24 giờ` | Xóa khi Admin cập nhật |
| **Danh sách địa điểm** | `tripwise:place:list:{city}:{category}` | Set (IDs) | `12 giờ` | Xóa khi thêm địa điểm mới |
| **Tuyến đường di chuyển** | `tripwise:route:{from_id}:{to_id}:{profile}`| String (JSON) | `7 ngày` | Không tự xóa (lưu lâu dài trong PG) |
| **Parse Prompt AI** | `tripwise:ai:parse:{md5_prompt}` | String (JSON) | `48 giờ` | Hết hạn tự động (TTL) |
| **Rate Limit Counter** | `tripwise:ratelimit:{ip_or_user}:{window}` | String | `1 phút` | Hết hạn tự động (TTL) |

---

## 3. Các kỹ thuật tối ưu hóa nâng cao

### 3.1 Cache Stampede Protection (Chống nghẽn Cache đồng thời)
- **Vấn đề**: Khi một Key cực nóng (như thời tiết Nha Trang hôm nay) hết hạn, hàng ngàn request đồng thời đổ vào hệ thống sẽ cùng thấy Cache Miss và cùng gọi API Open-Meteo, dẫn đến quá tải API và hệ thống.
- **Giải pháp**: Áp dụng **Khóa phân tán (Distributed Lock - Redis Mutex)**. Chỉ request đầu tiên giành được khóa mới được quyền gọi API ngoài để cập nhật cache; các request khác phải chờ (sleep 100ms) và đọc lại cache sau khi khóa được giải phóng.

### 3.2 Cache Key Convention
Tất cả các key trong Redis phải được phân ranh giới rõ ràng bằng dấu hai chấm `:` và bắt đầu bằng namespace của dự án để tránh xung đột key khi chạy chung cụm Redis với ứng dụng khác:
- Định dạng: `[tên_dự_án]:[tên_module]:[loại_dữ_liệu]:[khóa_định_danh]`
- Ví dụ: `tripwise:weather:nha_trang:2026-07-01`

### 3.3 Cache Invalidation (Xóa cache chủ động)
- Khi Admin thực hiện thay đổi thông tin một địa điểm du lịch bằng API Admin, hệ thống tự động kích hoạt sự kiện phát đi tín hiệu xóa key cache chi tiết `tripwise:place:detail:{id}` và xóa toàn bộ danh sách `tripwise:place:list:{city}:*` liên quan để đảm bảo người dùng tiếp theo nhận được thông tin mới nhất (Write-through / Eviction pattern).

---

## 4. Cơ chế chống sập hệ thống khi Redis lỗi (Redis Failover)
Redis là bộ đệm hiệu năng cao nhưng không được phép trở thành điểm nghẽn gây sập hệ thống (Single Point of Failure):
- **Cơ chế Fallback (Tự hồi phục)**:
  - Trong cấu trúc Spring Boot, mọi thao tác gọi tới Redis Cache đều được bao bọc trong khối `try-catch` bắt ngoại lệ `RedisConnectionFailureException`.
  - Khi Redis bị mất kết nối hoặc sập, hệ thống tự động chuyển sang chế độ **Direct Database / Direct API Access** (truy cập trực tiếp PostgreSQL hoặc gọi trực tiếp API ngoài).
  - Ghi nhận cảnh báo mức độ cao (ERROR log) để đội ngũ vận hành ứng phó, hệ thống vẫn duy trì hoạt động phục vụ người dùng (mặc dù tốc độ phản hồi sẽ chậm hơn).
