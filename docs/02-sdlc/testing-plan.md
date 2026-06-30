# Testing Plan - AI Smart Travel Planner

## 1. Chiến lược kiểm thử toàn diện
Hệ thống áp dụng mô hình kiểm thử dạng kim tự tháp (Testing Pyramid), ưu tiên viết nhiều Unit Test cho các logic nghiệp vụ lõi, kết hợp với Integration Test cho tầng cơ sở dữ liệu/API ngoài và kiểm thử tự động API Contract.

```text
       / \
      /   \      Manual Testing (UI/UX, Mobile)
     /     \
    /-------\    API Contract & Integration Testing (DB, Cache)
   /         \
  /-----------\  Unit Testing (Domain Services, Use Cases)
 /             \
```

---

## 2. Các tầng kiểm thử chi tiết

### 2.1 Unit Testing (Kiểm thử đơn vị)
- **Phạm vi**: 
  - Lớp Domain và Application (Use Cases, Domain Services).
  - Thuật toán chấm điểm địa điểm (`PlaceScoringService`).
  - Thuật toán tối ưu hóa thứ tự di chuyển (`RouteOptimizer` sử dụng Nearest Neighbor).
  - Các lớp tiện ích chuyển đổi hình học địa lý (Geo Utils), tính toán thời gian.
- **Yêu cầu kỹ thuật**:
  - Sử dụng JUnit 5 kết hợp Mockito để cô lập hoàn toàn các dependency bên ngoài (JPA Repository, External API Clients).
  - Độ bao phủ mã nguồn (Code Coverage) tối thiểu đạt `80%` đối với các gói tin nghiệp vụ (`domain` và `application`).

### 2.2 Integration Testing (Kiểm thử tích hợp)
- **Kiểm thử Database (PostgreSQL + PostGIS)**:
  - Sử dụng **Testcontainers** để khởi chạy một container PostgreSQL thực tế khi chạy test.
  - Kiểm tra tính chính xác của các câu lệnh truy vấn dữ liệu không gian (ví dụ: Tìm kiếm địa điểm trong bán kính 5km từ một tọa độ cho trước sử dụng hàm `ST_DWithin`).
  - Đảm bảo các chỉ mục không gian (GIST Index) hoạt động chính xác và cải thiện tốc độ truy vấn.
- **Kiểm thử Caching (Redis)**:
  - Viết testcase mô phỏng luồng gọi thông tin thời tiết: Lần đầu tiên gọi (Cache Miss) -> Dữ liệu được ghi vào Redis -> Lần thứ hai gọi (Cache Hit) -> Đảm bảo dữ liệu lấy từ Redis và thời gian phản hồi giảm đáng kể.
  - Kiểm tra tính năng tự động hết hạn của khóa (TTL expiration).

### 2.3 API & Security Testing (Kiểm thử API và Bảo mật)
- **Kiểm thử API Contract**:
  - Sử dụng `@WebMvcTest` trong Spring Boot để giả lập các HTTP request gửi lên Controller.
  - Validate tính hợp lệ của dữ liệu đầu vào (ví dụ: `startDate` phải ở định dạng chuẩn và không nằm trong quá khứ; `days` phải nằm trong khoảng từ 1 đến 3).
  - Đảm bảo cấu trúc lỗi trả về cho client thống nhất (chứa mã lỗi, thông điệp, correlation ID và danh sách chi tiết lỗi validate).
- **Kiểm thử Bảo mật**:
  - Test luồng phân quyền: Endpoint admin `/api/v1/admin/**` phải trả về mã lỗi `403 Forbidden` khi truy cập bằng tài khoản user thường.
  - Test tính hợp lệ của token: Truy cập endpoint được bảo vệ mà không có header Authorization hoặc token hết hạn phải trả về `401 Unauthorized`.
  - Test phát hiện tái sử dụng Refresh Token cũ (Refresh Token Rotation): Khi một Refresh Token đã dùng được gửi lại lần hai, hệ thống phải tự động vô hiệu hóa toàn bộ gia đình token (Token Family) đó và bắt người dùng đăng nhập lại.

### 2.4 External API Failure Testing (Kiểm thử khả năng chịu lỗi API ngoài)
- **Mục tiêu**: Đảm bảo lỗi từ các đối tác bên thứ ba không phá hỏng luồng hoạt động chính của ứng dụng.
- **Các kịch bản kiểm thử**:
  - **Gemini API Timeout / Down**: Mock Gemini Client trả về lỗi kết nối hoặc phản hồi lâu quá 10 giây. Đảm bảo hệ thống bắt được ngoại lệ, kích hoạt fallback (hiển thị form nhập thủ công cho user hoặc trả về thông báo lỗi thân thiện).
  - **Gemini API trả về sai cấu trúc JSON**: Giả lập Gemini trả về chuỗi text không thể parse thành JSON. Kiểm tra bộ parser fallback hoạt động để bóc tách thông tin thô hoặc báo lỗi cụ thể.
  - **OSRM API Down**: Mock OSRM trả về lỗi `500`. Kiểm tra lịch trình vẫn được hiển thị thành công với đầy đủ các địa điểm, chỉ ẩn phần vẽ tuyến đường thực tế trên bản đồ.
  - **Weather API Down**: Mock Open-Meteo bị lỗi. Lịch trình vẫn được tạo thành công dựa trên quy tắc mặc định (nắng nhẹ), không hiển thị cảnh báo thời tiết.

### 2.5 Performance & Load Testing (Kiểm thử hiệu năng và tải)
- **Phạm vi**: 
  - API tạo lịch trình (`POST /api/v1/trips/generate`) - đây là endpoint tốn nhiều tài nguyên nhất.
  - API đọc lịch trình đã lưu.
- **Yêu cầu kỹ thuật**:
  - Sử dụng công cụ **k6** hoặc **Apache JMeter** để thực hiện bài test tải.
  - Đo đạc tốc độ đáp ứng khi có 50 người dùng cùng thực hiện tạo chuyến đi đồng thời.
  - Đánh giá giới hạn chịu tải (Stress Test) để xác định ngưỡng cần kích hoạt giới hạn tần suất gọi (Rate Limiting).

### 2.6 Web/Mobile Manual Testing (Kiểm thử thủ công UI/UX)
- **Kiểm thử Web**:
  - Kiểm tra tính tương thích Responsive trên các thiết bị di động phổ biến (iPhone, Samsung Galaxy).
  - Kiểm tra tương tác trên bản đồ Leaflet: Click chọn marker phải hiển thị popup thông tin địa điểm và di chuyển tiêu điểm bản đồ (focus map) tương ứng.
- **Kiểm thử Mobile Flutter**:
  - Kiểm tra luồng lưu trữ token ngoại tuyến khi tắt hẳn app và mở lại.
  - Kiểm tra việc hiển thị bản đồ và danh sách chuyến đi đã lưu trong điều kiện mạng yếu hoặc mất kết nối mạng.
