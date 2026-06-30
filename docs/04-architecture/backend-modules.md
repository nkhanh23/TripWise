# Backend Modules - AI Smart Travel Planner

Tài liệu này đặc tả chi tiết trách nhiệm, thực thể, use cases, thiết kế API và cơ chế bảo mật của từng module trong hệ thống backend Modular Monolith.

---

## 1. Module Auth (Xác thực)
- **Responsibility**: Quản lý quy trình đăng ký, đăng nhập, xác thực người dùng và cấp phát/thu hồi token bảo mật.
- **Main Entities**: `UserCredential` (lưu email, password hash, role).
- **Main Use Cases**:
  - `RegisterUser`: Đăng ký tài khoản mới.
  - `LoginUser`: Xác thực tài khoản và cấp cặp token JWT.
  - `RotateRefreshToken`: Cấp mới cặp token khi access token hết hạn.
  - `RevokeTokens`: Vô hiệu hóa token khi người dùng đăng xuất.
- **APIs liên quan**: `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`.
- **Cache**: Lưu trữ blacklist token hoặc Refresh Token metadata trong Redis để truy vấn nhanh.
- **Security Note**:
  - Mật khẩu lưu trong DB bắt buộc phải sử dụng thuật toán bcrypt với cường độ bảo mật (work factor) phù hợp.
  - Refresh Token được băm (hash) SHA-256 trước khi lưu vào DB.

---

## 2. Module User (Người dùng)
- **Responsibility**: Quản lý thông tin hồ sơ cá nhân và phân quyền truy cập của người dùng.
- **Main Entities**: `User` (fullName, email, avatarUrl, status).
- **Main Use Cases**:
  - `GetUserProfile`: Xem thông tin cá nhân hiện tại.
  - `UpdateUserProfile`: Cập nhật thông tin cá nhân.
- **APIs liên quan**: `/api/v1/users/me` (GET/PUT).
- **Cache**: Cache thông tin cơ bản của User trong Redis để giảm truy vấn DB khi xác thực JWT request.
- **Security Note**: Người dùng chỉ được sửa thông tin hồ sơ của chính mình.

---

## 3. Module Place (Địa điểm)
- **Responsibility**: Quản lý cơ sở dữ liệu địa điểm du lịch thực tế tại Nha Trang, thực hiện các truy vấn tìm kiếm không gian.
- **Main Entities**: `Place` (name, location geography, estimatedCost, durationMinutes, tags, bestTime, indoor, isActive).
- **Main Use Cases**:
  - `SearchPlaces`: Tìm kiếm địa điểm theo tên, danh mục, tags.
  - `FindNearbyPlaces`: Lọc các địa điểm xung quanh một tọa độ cho trước sử dụng PostGIS.
- **APIs liên quan**: `/api/v1/places` (GET), `/api/v1/places/:id` (GET).
- **Cache**: Cache danh sách địa điểm nổi bật của thành phố Nha Trang trong Redis (TTL 24 giờ) vì dữ liệu này ít thay đổi.
- **Security Note**: Các API CRUD địa điểm thuộc quyền sở hữu của Module Admin, API của module Place chỉ hỗ trợ truy vấn đọc công khai.

---

## 4. Module Trip (Sinh lịch trình)
- **Responsibility**: Bộ máy điều phối (Orchestration Engine) tiếp nhận yêu cầu tự nhiên, phối hợp với các module AI, Place, Route, Weather để tạo ra lịch trình hoàn chỉnh.
- **Main Entities**: `Trip` (userId, destination, startDate, days, budget, travelStyle).
- **Main Use Cases**:
  - `GenerateTrip`: Tiếp nhận prompt, phân tích nhu cầu và điều phối quy trình sinh lịch trình theo ngày.
- **APIs liên quan**: `/api/v1/trips/generate` (POST).
- **Cache**: Lưu trữ tạm thời cấu trúc lịch trình vừa tạo trong Redis trước khi người dùng bấm xác nhận lưu.
- **Security Note**: Áp dụng Rate Limiting khắt khe đối với API tạo lịch trình để tránh tấn công từ chối dịch vụ làm cạn kiệt tài khoản Gemini API.

---

## 5. Module Itinerary (Lịch trình)
- **Responsibility**: Quản lý lưu trữ vật lý, sửa đổi và truy xuất danh sách lịch trình du lịch của người dùng.
- **Main Entities**: `Itinerary`, `ItineraryDay`, `ItineraryItem`.
- **Main Use Cases**:
  - `SaveItinerary`: Lưu lịch trình đã tạo vào DB.
  - `GetSavedItineraries`: Lấy danh sách lịch trình đã lưu của người dùng.
  - `DeleteItinerary`: Xóa lịch trình.
- **APIs liên quan**: `/api/v1/itineraries` (POST/GET), `/api/v1/itineraries/:id` (GET/DELETE).
- **Cache**: Cache chi tiết lịch trình đã lưu trong Redis để tăng tốc độ phản hồi khi người dùng mở lại trên di động.
- **Security Note**: Đảm bảo kiểm tra quyền sở hữu (`userId`) trước khi cho phép đọc hoặc xóa lịch trình.

---

## 6. Module Route (Tuyến đường)
- **Responsibility**: Tích hợp công cụ routing OSRM để tính toán khoảng cách, thời gian di chuyển và cung cấp dữ liệu vẽ đường đi thực tế.
- **Main Entities**: `RouteCache` (fromPlaceId, toPlaceId, profile, distance, duration, geometry).
- **Main Use Cases**:
  - `CalculateRoute`: Gọi OSRM API tính toán tuyến đường đi thực tế.
  - `OptimizeItineraryRoute`: Sắp xếp thứ tự tham quan theo Nearest Neighbor.
- **APIs liên quan**: `/api/v1/routes` (POST).
- **Cache**: Lưu cache tuyến đường OSRM vào PostgreSQL và Redis để sử dụng lại.
- **Security Note**: Validate chặt chẽ tọa độ đầu vào, cấu hình whitelist URL OSRM để ngăn ngừa tấn công SSRF.

---

## 7. Module Weather (Thời tiết)
- **Responsibility**: Tích hợp dịch vụ dự báo thời tiết để lấy dữ liệu thời tiết và hỗ trợ điều chỉnh lịch trình.
- **Main Entities**: `WeatherCache` (city, date, tempMin, tempMax, rainProbability, weatherCode).
- **Main Use Cases**:
  - `GetWeatherForecast`: Lấy dự báo thời tiết của điểm đến theo ngày.
- **APIs liên quan**: `/api/v1/weather` (GET).
- **Cache**: Cache thông tin thời tiết theo thành phố và ngày trong Redis với TTL 6 giờ.
- **Security Note**: Ẩn giấu API key của nhà cung cấp thời tiết trong Adapter layer.

---

## 8. Module Hotel & Transport (Gợi ý)
- **Responsibility**: Lưu trữ thông tin và gợi ý khách sạn phù hợp ngân sách, gợi ý phương tiện di chuyển tham khảo giữa các tỉnh/thành phố.
- **Main Entities**: `Hotel`, `Transport`.
- **Main Use Cases**:
  - `GetHotelSuggestions`: Gợi ý khách sạn Nha Trang theo mức ngân sách của user.
  - `GetTransportSuggestions`: Gợi ý phương tiện đi đến Nha Trang từ tỉnh/thành phố xuất phát.
- **APIs liên quan**: `/api/v1/hotels/suggestions` (GET), `/api/v1/transports/suggestions` (GET).
- **Cache**: Cache danh mục gợi ý tĩnh trong Redis.
- **Security Note**: Không tích hợp API booking thật trong giai đoạn MVP để tránh rủi ro bảo mật giao dịch.

---

## 9. Module Media (Lưu trữ)
- **Responsibility**: Quản lý quy trình tải lên (upload) và phân phối hình ảnh tĩnh.
- **Main Entities**: Không có entity lưu trữ trực tiếp, giao tiếp qua Object Storage API.
- **Main Use Cases**:
  - `UploadImage`: Tải ảnh lên Object Storage và trả về URL CDN công khai.
- **APIs liên quan**: `/api/v1/media/upload` (POST).
- **Cache**: Tận dụng tối đa bộ đệm CDN của Cloudflare, backend không cache dữ liệu binary.
- **Security Note**: Validate định dạng tệp tải lên (chỉ cho phép JPEG, PNG, WebP), giới hạn dung lượng file tối đa là `5MB` để tránh tấn công tràn bộ nhớ.

---

## 10. Module AI (Trí tuệ nhân tạo)
- **Responsibility**: Hiện thực kết nối an toàn tới Gemini API để phân tích cú pháp ngôn ngữ tự nhiên.
- **Main Entities**: Không có entity lưu trữ.
- **Main Use Cases**:
  - `ParsePrompt`: Phân tích câu yêu cầu tiếng Việt của người dùng.
- **APIs liên quan**: Chỉ cung cấp service nội bộ cho Module Trip, không expose API công khai.
- **Security Note**: Ẩn giấu API Key an toàn trong env variables, thiết lập timeout chặt chẽ cho cuộc gọi mạng.

---

## 11. Module Admin (Quản trị)
- **Responsibility**: Cung cấp các công cụ quản trị dữ liệu địa điểm, người dùng và theo dõi trạng thái hệ thống.
- **Main Entities**: Kế thừa thực thể từ các module Place, User.
- **Main Use Cases**:
  - `ImportPlacesData`: Import hàng loạt dữ liệu địa điểm Nha Trang thô từ các nguồn mở.
- **APIs liên quan**: `/api/v1/admin/**` (GET/POST/PUT/DELETE).
- **Security Note**: Tất cả các endpoint đều được bảo vệ nghiêm ngặt bằng Spring Security, chỉ cho phép vai trò `ADMIN` truy cập.

---

## 12. Các Module định hướng tương lai (Future Modules)
- **Module Notification**: Chịu trách nhiệm gửi email kích hoạt tài khoản, gửi thông báo đẩy (push notification) trên điện thoại nhắc nhở lịch trình khi đến giờ đi.
- **Module Search (Elasticsearch)**: Khi lượng địa điểm du lịch tăng lên hàng chục ngàn điểm tại nhiều tỉnh thành, module này sẽ thay thế truy vấn LIKE SQL truyền thống để hỗ trợ tìm kiếm toàn văn (full-text search) có dấu/không dấu với độ trễ cực thấp.
