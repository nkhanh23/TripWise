# Production Readiness Checklist - AI Smart Travel Planner

Danh sách kiểm tra mức độ sẵn sàng vận hành (Go-Live Checklist) trên môi trường Production thực tế.

---

## 1. Bảo mật & Quản lý Bí mật (Security & Secrets)
- [ ] Đã rà soát toàn bộ mã nguồn Git, đảm bảo không có tệp `.env` hay API Key, mật khẩu DB thô bị commit không?
- [ ] Tất cả các secrets đã được chuyển sang cấu hình dạng biến môi trường trên server chưa?
- [ ] Chứng chỉ SSL (HTTPS) đã được thiết lập thành công trên Nginx Reverse Proxy chưa?
- [ ] CORS đã được cấu hình giới hạn đúng domain chạy chính thức (không sử dụng wildcard `*`) chưa?
- [ ] Đã kích hoạt cơ chế băm mật khẩu bằng Bcrypt và băm Refresh Token bằng SHA-256 chưa?

---

## 2. Hiệu năng & Cơ sở dữ liệu (Performance & Database)
- [ ] Đã hoàn thành việc chạy toàn bộ tệp Flyway Migration để tạo cấu trúc DB trên Production chưa?
- [ ] Chỉ mục không gian GIST của PostGIS trên bảng `places` và `hotels` đã được xác nhận hoạt động bình thường chưa?
- [ ] Đã kiểm tra lỗi N+1 Query và xác nhận không có câu truy vấn SQL nào chạy quét toàn bộ bảng (Seq Scan) đối với các bảng lớn chưa?
- [ ] Đã thiết lập Connection Pool (HikariCP) cho PostgreSQL với số lượng kết nối tối đa hợp lý chưa?

---

## 3. Caching & Khả năng Chịu lỗi (Caching & Fault Tolerance)
- [ ] Redis Cache đã hoạt động bình thường và thiết lập TTL (hạn sống) phù hợp cho các key chưa?
- [ ] Đã kiểm thử kịch bản sập Redis, xác nhận ứng dụng backend tự động chuyển hướng truy vấn trực tiếp DB thành công không?
- [ ] Cấu hình ngắt mạch (Circuit Breaker) và cơ chế Fallback của Gemini API, OSRM API đã được kiểm thử hoạt động đúng chưa?
- [ ] Các URL hình ảnh của địa điểm du lịch đã được cấu hình phân phối qua CDN Cloudflare chưa?

---

## 4. Giám sát & Vận hành (Monitoring & Operations)
- [ ] Đã cấu hình log định dạng JSON và ghi Correlation ID thành công cho mọi request chưa?
- [ ] Đã che giấu log (masking) đối với các thông tin mật khẩu và token chưa?
- [ ] Endpoint `/actuator/health` đã được cấu hình chặn truy cập công khai chi tiết cấu trúc DB ra internet chưa?
- [ ] Đã thiết lập cron job chạy hàng ngày để pg_dump database và đẩy tệp tin backup lên S3 chưa?
- [ ] Đã chạy thử quy trình rollback container quay về phiên bản cũ và xác nhận hoạt động bình thường chưa?
- [ ] Đã thực hiện Load Test (k6) giả lập lượng truy cập tối đa mục tiêu và xác nhận thời gian phản hồi đạt yêu cầu chưa?
