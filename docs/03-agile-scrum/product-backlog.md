# Product Backlog - AI Smart Travel Planner

## 1. Auth & User Epic
### PBI-001: Đăng ký & Đăng nhập bằng Email/Password
- **User Story**: Là người dùng mới, tôi muốn đăng ký tài khoản bằng email và mật khẩu để tôi có thể lưu trữ lịch trình du lịch cá nhân.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Dữ liệu mật khẩu phải được mã hóa bằng thuật toán Bcrypt trước khi lưu vào PostgreSQL.
  - API trả về thông báo đăng ký thành công và yêu cầu đăng nhập.
  - Phải validate định dạng email, mật khẩu tối thiểu 6 ký tự.
- **Notes**: Nền tảng cho phân quyền và bảo mật.

### PBI-002: Xác thực JWT & Refresh Token Rotation
- **User Story**: Là người dùng đã đăng nhập, tôi muốn hệ thống cấp token xác thực tự động gia hạn an toàn để tôi không phải đăng nhập lại liên tục mà vẫn đảm bảo an toàn tài khoản.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Cấp cặp Token: Access Token (hạn 15 phút) và Refresh Token (hạn 7 ngày).
  - Khi Access Token hết hạn, client gửi Refresh Token lên để nhận cặp token mới.
  - Nếu phát hiện Refresh Token cũ được tái sử dụng, lập tức hủy toàn bộ Token Family của user đó và bắt đăng nhập lại.
- **Notes**: Lưu hash của Refresh Token trong PostgreSQL.

---

## 2. Place & PostGIS Epic
### PBI-003: CRUD Địa điểm dành cho Admin
- **User Story**: Là quản trị viên, tôi muốn thêm, sửa, xóa địa điểm du lịch kèm tọa độ địa lý thực tế để hệ thống có nguồn dữ liệu chuẩn xác cho Nha Trang.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Tọa độ địa lý của địa điểm phải được lưu trữ dưới dạng `geography(Point, 4326)` trong PostgreSQL + PostGIS.
  - API CRUD được bảo vệ, chỉ tài khoản có role `ADMIN` mới được gọi.
- **Notes**: Tích hợp Flyway migration cho cấu trúc bảng.

### PBI-004: Tìm kiếm địa điểm công khai
- **User Story**: Là người dùng, tôi muốn tìm kiếm địa điểm theo tên, danh mục (ăn uống, cà phê, check-in) và khoảng cách bán kính để tự tham khảo các điểm đến.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - API công khai không yêu cầu đăng nhập.
  - Tìm kiếm trong bán kính sử dụng hàm không gian PostGIS `ST_DWithin` và có GIST Index hoạt động.
- **Notes**: Tối ưu hóa hiệu năng SQL trước khi đưa vào use case tạo lịch trình.

---

## 3. Trip Planning Epic
### PBI-005: Tạo lịch trình du lịch tự động (Orchestration Use Case)
- **User Story**: Là người dùng, tôi muốn nhận được lịch trình du lịch hoàn chỉnh theo ngày khi gửi yêu cầu nhu cầu của mình để dễ dàng thực hiện chuyến đi.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - API nhận vào `prompt`, `startDate`, `origin`.
  - Kết quả trả về lịch trình được chia theo từng ngày, mỗi ngày 3-5 địa điểm phân bổ theo Sáng/Trưa/Chiều/Tối.
- **Notes**: Module điều phối chính gọi các sub-service (Gemini, Place, Route, Weather).

### PBI-006: Lưu trữ lịch trình
- **User Story**: Là người dùng đã đăng nhập, tôi muốn bấm lưu lịch trình đã tạo để có thể mở xem lại bất kỳ lúc nào.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Lịch trình được liên kết với `userId` và lưu trữ trong bảng `itineraries`, `itinerary_days`, `itinerary_items`.
  - Chỉ chính user đó mới có quyền xem, sửa hoặc xóa lịch trình của mình.
- **Notes**: Endpoint bảo vệ bằng Spring Security JWT filter.

---

## 4. Gemini AI Epic
### PBI-007: Phân tích prompt tiếng Việt tự nhiên sang JSON
- **User Story**: Là hệ thống backend, tôi muốn gọi Gemini API để bóc tách nhu cầu thô bằng tiếng Việt của người dùng thành cấu trúc JSON rõ ràng nhằm lọc địa điểm chính xác.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Đầu ra của Gemini phải khớp với JSON Schema: destination, days, budget, interests, travelStyle.
  - Có cơ chế validate schema và fallback tự động xử lý khi Gemini trả cấu trúc bị lỗi.
  - Thiết lập timeout tối đa 10 giây.
- **Notes**: Sử dụng System Instruction và Structured Outputs của Gemini API.

### PBI-008: Tạo mô tả lịch trình chi tiết từ dữ liệu thô
- **User Story**: Là người dùng, tôi muốn nhận được những dòng mô tả hấp dẫn, giàu cảm xúc cho từng ngày trong lịch trình thay vì chỉ đọc danh sách địa điểm thô cứng.
- **Priority**: Trung bình (Medium)
- **Acceptance Criteria**:
  - Gemini viết mô tả tóm tắt ngày dựa trên danh sách địa điểm đã được backend chọn và sắp xếp.
  - AI không được tự bịa ra địa điểm ngoài danh sách được cung cấp.
- **Notes**: Hạn chế số lượng token để kiểm soát chi phí.

---

## 5. OSRM Routing Epic
### PBI-009: Tính tuyến đường thực tế giữa các điểm tham quan
- **User Story**: Là hệ thống, tôi muốn gọi OSRM để tính toán khoảng cách và thời gian di chuyển thực tế giữa các địa điểm trong ngày để lịch trình có tính khả thi cao.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Lấy thông tin `distance` (mét), `duration` (giây) và `geometry` (GeoJSON).
  - Tự động tối ưu thứ tự đi theo thuật toán Nearest Neighbor bằng OSRM duration.
- **Notes**: Xử lý lỗi khi OSRM sập bằng cách vẽ đường nối thẳng chim bay.

---

## 6. Weather Epic
### PBI-010: Tích hợp dự báo thời tiết và điều chỉnh lịch trình
- **User Story**: Là người dùng, tôi muốn lịch trình tự động chuyển sang các điểm trong nhà (nhà hàng, cafe) khi trời mưa để chuyến đi không bị ảnh hưởng xấu.
- **Priority**: Trung bình (Medium)
- **Acceptance Criteria**:
  - Tích hợp API Open-Meteo để lấy dự báo thời tiết theo ngày tại Nha Trang.
  - Tự động trừ 25 điểm của địa điểm ngoài trời và cộng điểm cho điểm trong nhà khi dự báo có mưa.
- **Notes**: Thời tiết lỗi vẫn phải tạo lịch trình thành công (không weather data).

---

## 7. Cache Epic
### PBI-011: Caching Route và Weather
- **User Story**: Là lập trình viên vận hành, tôi muốn cache dữ liệu tuyến đường OSRM và dự báo thời tiết để tăng tốc phản hồi hệ thống và giảm chi phí gọi API ngoài.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Cache route OSRM trong database PostgreSQL (`route_cache`) và Redis cho dữ liệu nóng.
  - Cache weather trong Redis theo Key `weather:city:date` với TTL là 6 giờ.
- **Notes**: Lỗi kết nối Redis không được làm sập ứng dụng (fallback direct DB/API).

---

## 8. Web MVP Epic
### PBI-012: Phát triển giao diện Nhập yêu cầu & Xem kết quả bản đồ
- **User Story**: Là người dùng, tôi muốn nhập mong muốn chuyến đi trên giao diện web đẹp mắt và xem lịch trình hiển thị trực quan trên bản đồ để dễ hình dung chuyến đi.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Form nhập có ví dụ prompt và chọn ngày đi.
  - Giao diện kết quả responsive chia 2 cột: Cột trái hiển thị timeline chi tiết, cột phải hiển thị bản đồ Leaflet (vẽ markers và polyline route).
- **Notes**: Sử dụng ReactJS hoặc Next.js. Giao diện cao cấp, hiện đại.

---

## 9. Flutter MVP Epic
### PBI-013: Phát triển Mobile Client xem lịch trình đã lưu offline
- **User Story**: Là người dùng đi du lịch thực địa, tôi muốn mở app điện thoại để xem lại lịch trình đã lưu ngay cả khi mất mạng để dễ theo dõi điểm đến.
- **Priority**: Trung bình (Medium)
- **Acceptance Criteria**:
  - Đăng nhập và hiển thị danh sách Trip đã lưu của user.
  - Cho phép lưu offline snapshot lịch trình vào SQLite của điện thoại.
- **Notes**: Phát triển sau khi API backend và Web MVP đã chạy ổn định.

---

## 10. Admin Epic
### PBI-014: Giao diện Admin quản lý dữ liệu Nha Trang
- **User Story**: Là admin, tôi muốn có giao diện web để nhập nhanh địa điểm mới hoặc chỉnh sửa tags của địa điểm Nha Trang mà không phải viết câu lệnh SQL thủ công.
- **Priority**: Trung bình (Medium)
- **Acceptance Criteria**:
  - Trang đăng nhập dành riêng cho admin.
  - Form thêm địa điểm hỗ trợ tìm kiếm tọa độ trực quan trên bản đồ hoặc nhập link Google Maps để tự bóc tách tọa độ.
- **Notes**: Phân quyền nghiêm ngặt role `ADMIN`.

---

## 11. Monitoring Epic
### PBI-015: Cấu hình Prometheus, Grafana & Sentry
- **User Story**: Là kỹ sư vận hành, tôi muốn hệ thống tự động ghi nhận log có cấu trúc và cảnh báo sớm khi API ngoài gặp sự cố để tôi kịp thời xử lý trước khi user phát hiện.
- **Priority**: Thấp (Low)
- **Acceptance Criteria**:
  - Actuator xuất metric định dạng Prometheus.
  - Log lỗi API ngoài che giấu API key. Tích hợp Sentry cảnh báo lỗi runtime.
- **Notes**: Triển khai trong phase production readiness.

---

## 12. Security Epic
### PBI-016: Bảo mật API & Che giấu Stack Trace
- **User Story**: Là quản trị viên an toàn thông tin, tôi muốn hệ thống chặn đứng các nguy cơ khai thác lỗ hổng bằng cách validate chặt chẽ dữ liệu đầu vào và che giấu cấu trúc hệ thống khi có lỗi.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Tắt hiển thị stack trace cho API client khi xảy ra lỗi Spring Boot.
  - Áp dụng Rate limiting bằng thuật toán Token Bucket cho API `/api/v1/trips/generate`.
- **Notes**: Cấu hình CORS chặt chẽ cho môi trường Staging/Production.

---

## 13. Performance & Scale Epic
### PBI-017: Tối ưu truy vấn dữ liệu không gian & Batch Routing
- **User Story**: Là hệ thống, tôi muốn thực hiện tính toán tuyến đường hàng loạt và tối ưu truy vấn không gian để đáp ứng được hàng trăm người dùng cùng tạo lịch trình cùng lúc.
- **Priority**: Cao (High)
- **Acceptance Criteria**:
  - Thực hiện gọi batch route OSRM thay vì gọi lặp trong vòng lặp.
  - Đảm bảo các câu truy vấn PostGIS sử dụng đúng index không gian GIST.
- **Notes**: Kiểm thử hiệu năng bằng k6 Stress Test.
