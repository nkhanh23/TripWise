# Maintenance Plan - AI Smart Travel Planner

## 1. Hệ thống giám sát (Monitoring & Alerting)
Hệ thống cần hoạt động ổn định và có khả năng cảnh báo sớm các sự cố kỹ thuật cũng như sự biến động về chi phí:

- **Giám sát Sức khỏe (Health Check)**: Tận dụng Spring Boot Actuator để kiểm tra trạng thái kết nối tới PostgreSQL, Redis và phản hồi của API ngoài.
- **Giám sát Metric (Prometheus & Grafana)**: Thu thập thông tin hiệu năng bao gồm:
  - Latency của API tạo lịch trình du lịch.
  - Tỷ lệ cache hit/miss của Redis.
  - Số lượng request bị lỗi `429 Too Many Requests` (Rate Limiting).
- **Theo dõi lỗi (Error Tracking)**: Tích hợp **Sentry** ở cả backend và frontend để phát hiện lỗi runtime ngay khi xảy ra đối với người dùng cuối, tự động thu thập stack trace và thông tin ngữ cảnh để phân tích.

---

## 2. Quản lý và sao lưu cơ sở dữ liệu (Database Maintenance)
Dữ liệu không gian PostGIS đòi hỏi hoạt động bảo trì định kỳ để duy trì tốc độ truy vấn:

- **Sao lưu tự động (Backup & Restore)**:
  - Thiết lập cron job chạy hàng ngày để kết xuất dữ liệu tự động (`pg_dump`) và lưu trữ tệp nén an toàn lên Object Storage riêng tư.
  - Tự động xóa các bản sao lưu cũ quá `30 ngày` để tối ưu chi phí lưu trữ.
  - Tổ chức diễn tập phục hồi dữ liệu từ bản sao lưu định kỳ 6 tháng một lần.
- **Bảo trì PostGIS định kỳ**:
  - Chạy lệnh `VACUUM ANALYZE` hàng tuần để dọn dẹp dung lượng thừa của đĩa cứng và cập nhật số liệu thống kê cho bộ tối ưu hóa truy vấn của PostgreSQL.
  - Re-index định kỳ các chỉ mục không gian GIST của bảng `places_geo` và `hotels_geo` nếu tần suất cập nhật dữ liệu cao nhằm tránh phân mảnh chỉ mục.

---

## 3. Quản lý chi phí dịch vụ bên ngoài (Cost Monitoring)
Việc sử dụng Gemini API, OSRM public server và Google Places API cần được giám sát liên tục để tránh phát sinh chi phí đột biến:

- **Giám sát hạn mức (Quota Monitoring)**:
  - Thiết lập cảnh báo chi tiêu trong bảng điều khiển Google Cloud Console và Google AI Studio (Gemini).
  - Tự động khóa hoặc giảm lượng token cấp phát cho model khi chi phí chạm ngưỡng `80%` ngân sách tháng.
- **Tối ưu tỷ lệ Cache**:
  - Đo đạc tỷ lệ sử dụng lại dữ liệu tuyến đường từ bảng `route_cache` để tối ưu cấu trúc khóa và tăng thời gian sống (TTL) của cache nếu dữ liệu không thay đổi.
  - Đánh giá khả năng tự host một instance OSRM sử dụng máy chủ riêng nếu lượng yêu cầu tính toán tuyến đường tăng mạnh làm tăng chi phí sử dụng dịch vụ bên ngoài.

---

## 4. Vá bảo mật & Incident Response (Ứng phó sự cố)
- **Security Patching (Vá bảo mật)**:
  - Tự động quét các lỗ hổng của Dependency (ví dụ: sử dụng Dependabot hoặc OWASP Dependency-Check).
  - Thực hiện cập nhật phiên bản mới của các thư viện Spring Boot, Alpine Linux trong Dockerfile ngay khi có bản vá lỗi bảo mật nghiêm trọng (như log4j hoặc các lỗ hổng thực thi mã từ xa).
- **Quy trình ứng phó sự cố (Incident Response)**:
  - **Sự cố rò rỉ API Key**: Nếu phát hiện API Key của Gemini hoặc OpenWeather bị lộ (ví dụ: vô tình commit lên Git công khai), lập tức vô hiệu hóa key đó trên hệ thống của nhà cung cấp, khởi tạo key mới và cập nhật biến môi trường trên server thông qua CD pipeline.
  - **Sự cố Database quá tải**: Kích hoạt chế độ Read-Only cho các lịch trình cũ để giảm tải truy vấn ghi, tăng số lượng kết nối Redis để giảm tần suất truy cập trực tiếp vào DB.

---

## 5. Tinh chỉnh hệ thống dựa trên phản hồi của người dùng (Feedback Loop)
Hệ thống cần liên tục tự hoàn thiện dựa trên trải nghiệm thực tế:

- **Phân tích lịch trình không thành công**: Theo dõi các yêu cầu tạo chuyến đi bị lỗi hoặc có điểm phù hợp (score) quá thấp do thiếu dữ liệu địa điểm trong bán kính di chuyển tại Nha Trang. Sử dụng thông tin này làm cơ sở để Admin bổ sung địa điểm mới.
- **Hiệu chỉnh trọng số Scoring**: Dựa trên dữ liệu các chuyến đi được người dùng lưu lại nhiều nhất, tiến hành phân tích các tag/sở thích phổ biến để điều chỉnh lại các hệ số điểm cộng/điểm trừ trong thuật toán chấm điểm địa điểm (`PlaceScoringService`).
- **Cải tiến Prompt của Gemini**: Cập nhật lại System Instruction và các ví dụ One-shot/Few-shot cho model Gemini khi phát hiện có cấu trúc câu tiếng Việt mới của người dùng làm model parse sai định dạng JSON.
