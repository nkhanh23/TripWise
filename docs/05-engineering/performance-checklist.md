# Performance Checklist - AI Smart Travel Planner

Danh sách các hạng mục kỹ thuật cần rà soát để đảm bảo ứng dụng đạt hiệu năng tối ưu, thời gian phản hồi nhanh và chịu tải lớn.

---

## 1. Tối ưu hóa Cơ sở dữ liệu & Truy vấn SQL
- [ ] Tất cả các API trả về danh sách có sử dụng phân trang (`page`, `size`) thay vì tải toàn bộ bảng lên bộ nhớ chưa?
- [ ] Đã chạy phân tích câu lệnh truy vấn phức tạp bằng `EXPLAIN ANALYZE` để đảm bảo câu lệnh sử dụng đúng chỉ mục (Index Scan) thay vì quét toàn bộ bảng (Seq Scan) chưa?
- [ ] Các câu truy vấn lọc địa điểm theo bán kính hoặc tìm điểm gần nhất đã sử dụng hàm PostGIS (`ST_DWithin`, `<->`) để kích hoạt chỉ mục không gian GIST chưa?
- [ ] Đã giải quyết triệt để lỗi **N+1 Query** trong JPA/Hibernate bằng cách sử dụng `JOIN FETCH` hoặc `@EntityGraph` cho các liên kết bảng chưa?
- [ ] Có câu lệnh SQL JOIN nào được viết chéo giữa các bảng thuộc các module khác nhau không (vi phạm quy tắc Modular Monolith)?

---

## 2. Chiến lược sử dụng bộ nhớ đệm (Caching)
- [ ] API lấy thông tin thời tiết đã đọc dữ liệu từ Redis cache (TTL 6 giờ) trước khi gọi API Open-Meteo ngoài chưa?
- [ ] API tính toán tuyến đường có kiểm tra và lấy dữ liệu hình học từ bảng `route_cache` trước khi gọi OSRM chưa?
- [ ] Có cơ chế phòng chống lỗi nghẽn cache đồng thời (Cache Stampede) sử dụng khóa phân tán Redis Mutex cho các key cực nóng không?
- [ ] Đã cấu hình timeout kết nối Redis hợp lý (dưới 500ms) để kích hoạt cơ chế fallback chạy trực tiếp DB khi Redis lỗi chưa?

---

## 3. Tích hợp API ngoài & Xử lý bất đồng bộ
- [ ] Tất cả các cuộc gọi HTTP sang bên thứ ba (Gemini, OSRM, Weather) đã cấu hình thời gian chờ tối đa (Timeout) chưa?
- [ ] Các tác vụ tiêu tốn tài nguyên và thời gian (như đồng bộ dữ liệu địa điểm, xử lý/nén ảnh, gửi email thông báo) đã được chuyển xuống xử lý ngầm bất đồng bộ (sử dụng `@Async` thread pool) để giải phóng thread của web server chưa?
- [ ] API tạo lịch trình có giải phóng Database Connection sớm trước khi bắt đầu gọi sang Gemini API (mất 2-3s phản hồi) không?

---

## 4. Tối ưu hóa băng thông & Client Request
- [ ] Đã bật cấu hình nén dữ liệu đầu ra **Gzip/Brotli** trong Spring Boot (`server.compression.enabled=true`) chưa?
- [ ] Dữ liệu tuyến đường (polyline geometry) gửi về client đã được nén tối ưu (Polyline Algorithm) hoặc giới hạn số lượng tọa độ để giảm kích thước file JSON chưa?
- [ ] Tất cả các URL hình ảnh địa điểm trả về client đã sử dụng đường dẫn CDN (Cloudflare), cấm trả về link trực tiếp của Object Storage chưa?
- [ ] Client Web/Mobile đã tích hợp kỹ thuật Debounce trên ô tìm kiếm và khóa nút submit để tránh gửi request trùng lặp chưa?
