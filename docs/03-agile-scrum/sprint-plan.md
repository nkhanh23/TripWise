# Sprint Plan - AI Smart Travel Planner

## 1. Kế hoạch phân chia Sprint tổng thể (11 Sprints - Chu kỳ 1 tuần/sprint)

Dự án được phân bổ thành 11 Sprint từ Sprint 0 đến Sprint 10. Mỗi Sprint tập trung vào một sản phẩm tăng trưởng (increment) hoàn chỉnh, chạy được và phục vụ trực tiếp cho Sprint tiếp theo:

```mermaid
gantt
    title Kế hoạch Sprint AI Smart Travel Planner
    dateFormat  X
    axisFormat %d
    section Sprint 0-2: Nền tảng
    Sprint 0: Tài liệu, Kiến trúc, Quy tắc   :active, s0, 0, 7
    Sprint 1: Skeleton, DB PostgreSQL, Redis, Logging : s1, after s0, 7
    Sprint 2: Security, JWT, Rate Limiting Base : s2, after s1, 7
    section Sprint 3-7: Core Modules & APIs
    Sprint 3: Place Module, PostGIS Spatial Index : s3, after s2, 7
    Sprint 4: Gemini Parser Integration, JSON Schema : s4, after s3, 7
    Sprint 5: Scoring Logic, Itinerary Generation  : s5, after s4, 7
    Sprint 6: OSRM Integration, Route Caching  : s6, after s5, 7
    Sprint 7: Weather API, Weather-aware Scoring : s7, after s6, 7
    section Sprint 8-10: Clients & Hardening
    Sprint 8: Web client MVP, Leaflet Map  : s8, after s7, 7
    Sprint 9: Flutter Mobile Client (Saved Trips Offline) : s9, after s8, 7
    Sprint 10: Monitoring, Scale, Prod Hardening : s10, after s9, 7
```

---

## 2. Chi tiết phân bổ Product Backlog Items (PBI) vào các Sprint

### Mức độ ưu tiên cao (Sprints 0 - 3)
- **Sprint 0: Chuẩn bị & Đặc tả**
  - Hoàn thiện toàn bộ tài liệu kiến trúc, ranh giới thiết kế, luật phát triển của AI.
  - Setup môi trường docker PostgreSQL + PostGIS, Redis chạy cục bộ (local).
- **Sprint 1: Khung ứng dụng & Cơ sở dữ liệu**
  - Khởi tạo khung dự án Spring Boot (Java 21), tích hợp Actuator Health Check, Global Exception Handling và Structured logging base.
  - Cấu hình Flyway migration, tạo các bảng dữ liệu nền tảng.
- **Sprint 2: Xác thực & Bảo mật cơ bản**
  - Triển khai Spring Security bảo vệ API bằng OAuth2/JWT.
  - Hiện thực luồng Đăng ký, Đăng nhập, Refresh Token Rotation.
  - Cấu hình bộ lọc IP/Token Rate limiting cơ bản bằng Redis.
- **Sprint 3: Place & PostGIS Module**
  - Hiện thực các API CRUD Địa điểm dành cho Admin (PBI-003) và API Tìm kiếm Địa điểm công khai (PBI-004).
  - Tối ưu hóa các câu truy vấn không gian PostGIS bằng chỉ mục GIST.

---

### Tích hợp Trí tuệ nhân tạo & Tuyến đường (Sprints 4 - 7)
- **Sprint 4: Phân tích AI & Gemini Integration**
  - Gọi Gemini API để bóc tách prompt tiếng Việt thô thành cấu trúc JSON chuẩn (PBI-007).
  - Viết bộ parser fallback xử lý ngoại lệ JSON bị vỡ cấu trúc.
- **Sprint 5: Scoring & Sinh lịch trình**
  - Xây dựng thuật toán chấm điểm địa điểm (`PlaceScoringService`) theo sở thích và ngân sách.
  - Phân bổ các điểm tham quan đã chọn vào các ngày và khung giờ (Sáng -> Tối) để tạo cấu trúc lịch trình thô.
- **Sprint 6: OSRM Routing & Route Cache**
  - Gọi OSRM API lấy khoảng cách, thời gian di chuyển thực tế.
  - Sắp xếp thứ tự các điểm tham quan theo Nearest Neighbor.
  - Hiện thực cơ chế lưu cache tuyến đường vào Redis và bảng `route_cache` của PostgreSQL (PBI-011).
- **Sprint 7: Thời tiết & Tối ưu hóa Itinerary**
  - Tích hợp API thời tiết Open-Meteo và Redis cache thời tiết (PBI-010).
  - Hoàn thiện thuật toán điều chỉnh lịch trình khi trời mưa (ưu tiên điểm indoor).
  - Gọi Gemini API viết mô tả giới thiệu lịch trình theo ngày dựa trên danh sách điểm đã chọn (PBI-008).

---

### Triển khai Giao diện & Vận hành (Sprints 8 - 10)
- **Sprint 8: Web Frontend MVP**
  - Triển khai web client bằng Next.js.
  - Tích hợp bản đồ Leaflet hiển thị marker các địa điểm và polyline tuyến đường đi thực tế của OSRM (PBI-012).
  - Hoàn thiện form nhập prompt tiếng Việt và hiển thị kết quả.
- **Sprint 9: Flutter Mobile MVP**
  - Xây dựng mobile client bằng Flutter, đồng bộ danh sách chuyến đi đã lưu từ backend.
  - Hiện thực lưu trữ SQLite ngoại tuyến (offline snapshot) phục vụ xem lịch trình khi di chuyển không có mạng (PBI-013).
- **Sprint 10: Production Readiness & Hardening**
  - Tích hợp Sentry theo dõi lỗi tự động, cấu hình Prometheus/Grafana thu thập metric (PBI-015).
  - Tiến hành Load test / Stress test bằng k6 đối với API tạo lịch trình để kiểm tra độ trễ.
  - Che giấu log thông tin nhạy cảm, cấu hình CORS production chặt chẽ.
