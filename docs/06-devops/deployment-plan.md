# Deployment Plan - AI Smart Travel Planner

Tài liệu này đặc tả kế hoạch triển khai (Deployment Plan) của dự án từ giai đoạn MVP đầu tiên đến khi scale lớn.

---

## 1. Kiến trúc triển khai MVP (Single Instance VM)
Đối với giai đoạn MVP, để kiểm soát chi phí vận hành và giảm độ phức tạp hạ tầng, hệ thống được triển khai trên **một máy chủ ảo duy nhất (VPS/VM)** chạy Docker:

```text
[ Client Request ] ──► [ Nginx Container (Port 80/443) ]
                              │
               ┌──────────────┴──────────────┐
               ▼ (Proxy Pass)                ▼ (Static Route)
  [ Spring Boot Container ]               [ React Web (Static HTML) ]
        │          │
        ▼          ▼
  [ PostgreSQL ] [ Redis ]
  (Docker Volume)(Docker Volume)
```

- **Reverse Proxy**: Container **Nginx** đứng ngoài cùng tiếp nhận HTTPS request, xử lý SSL và điều hướng:
  - Các request bắt đầu bằng `/api/v1` sẽ được chuyển hướng (proxy_pass) đến Spring Boot Container (cổng `8080`).
  - Các request tĩnh khác sẽ được trả về trực tiếp từ mã nguồn HTML/JS của React đã build.
- **Dữ liệu bền vững (Persistence)**: Cơ sở dữ liệu PostgreSQL và Redis lưu trữ tệp tin thông qua Docker Volumes ánh xạ xuống ổ đĩa của máy chủ vật lý, đảm bảo dữ liệu không bị mất khi restart container.

---

## 2. Quy trình chạy Database Migration tự động
- **Công cụ**: Sử dụng **Flyway** tích hợp sẵn trong Spring Boot.
- **Quy trình chạy**:
  1. Khi CD pipeline đẩy Docker image mới lên và khởi chạy container backend Spring Boot.
  2. Ở quá trình startup, Spring Boot sẽ tự động quét thư mục `db/migration` và so sánh với lịch sử đã chạy trong bảng `flyway_schema_history` của database.
  3. Nếu phát hiện tệp SQL migration mới (ví dụ: `V2__add_new_table.sql`), Flyway sẽ tự động khóa bảng tạm thời và chạy câu lệnh SQL để cập nhật schema trước khi Spring Boot mở cổng nhận request từ client.
  4. Tránh hoàn toàn việc lập trình viên phải truy cập SSH vào DB để chạy SQL thủ công.

---

## 3. Quản lý tài nguyên tĩnh & CDN (Media Assets)
- Toàn bộ ảnh của địa điểm du lịch, khách sạn và avatar người dùng khi được tải lên sẽ được chuyển trực tiếp vào Object Storage (S3).
- **CDN Distribution**: CDN Cloudflare được cấu hình trỏ vào bucket Object Storage. URL lưu trong database PostgreSQL sẽ trỏ đến tên miền CDN (ví dụ: `https://cdn.tripwise.vn/media/image-123.webp`).
- Cấu hình CDN cache ở cấp độ biên (Edge Cache) để phục vụ hình ảnh tức thì cho người dùng mới mà không truy vấn lại Object Storage.

---

## 4. Chiến lược nâng cấp không downtime (Rollout Strategy)
- **Staging**: Triển khai trực tiếp (Recreate) - chấp nhận downtime vài giây khi khởi động lại container.
- **Production (Tương lai)**: Áp dụng chiến lược **Rolling Update (Cập nhật cuốn chiếu)** thông qua Docker Compose hoặc Kubernetes:
  - Hệ thống duy trì ít nhất 2 container backend Spring Boot chạy song song.
  - Khi cập nhật: Nginx tạm thời ngắt kết nối tới Container 1 -> Dừng và cập nhật Container 1 -> Khởi động lại Container 1 -> Kiểm tra Healthcheck đạt `"UP"` -> Nginx mở lại kết nối tới Container 1.
  - Lặp lại quy trình trên đối với Container 2. Đảm bảo hệ thống luôn có ít nhất 1 container backend sẵn sàng phục vụ request.
