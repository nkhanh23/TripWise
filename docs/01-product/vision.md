# Product Vision - AI Smart Travel Planner

## 1. Tầm nhìn sản phẩm

AI Smart Travel Planner là nền tảng lập lịch du lịch thông minh dành cho người dùng Việt Nam, giúp biến một yêu cầu tự nhiên như:

> "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí"

thành một lịch trình có thể sử dụng thật, gồm:

- Lịch trình theo từng ngày.
- Địa điểm thật có tọa độ rõ ràng.
- Bản đồ hiển thị marker và tuyến đường.
- Thời gian di chuyển thực tế.
- Gợi ý theo ngân sách, sở thích và thời tiết.
- Khả năng lưu lại lịch trình để xem lại trên web hoặc mobile.

Sản phẩm không chỉ là demo AI. Mục tiêu dài hạn là trở thành một trợ lý lập kế hoạch du lịch đáng tin cậy, giúp người dùng giảm thời gian tìm kiếm, giảm rủi ro chọn sai địa điểm và có kế hoạch di chuyển thực tế hơn.

---

## 2. Giá trị cốt lõi

### 2.1 Cá nhân hóa theo nhu cầu thật

Người dùng không cần chọn quá nhiều bộ lọc phức tạp. Họ có thể nhập nhu cầu bằng tiếng Việt tự nhiên. Gemini API sẽ phân tích:

- Điểm đến.
- Số ngày.
- Số đêm.
- Sở thích.
- Ngân sách.
- Phong cách du lịch.
- Yêu cầu đặc biệt nếu có.

### 2.2 Dựa trên dữ liệu địa điểm thật

AI không được tự bịa địa điểm. Hệ thống chỉ gợi ý địa điểm đã được lưu, chuẩn hóa và xác minh trong PostgreSQL + PostGIS.

Điều này giúp sản phẩm đáng tin hơn so với các chatbot tạo lịch trình thuần văn bản.

### 2.3 Lịch trình có tính khả thi

Lịch trình không chỉ là danh sách địa điểm. Hệ thống cần tính:

- Khoảng cách thực tế.
- Thời gian di chuyển thực tế.
- Thứ tự tham quan hợp lý.
- Số điểm mỗi ngày không quá dày.
- Ảnh hưởng của thời tiết.
- Ngân sách dự kiến.

OSRM được dùng để tính route, distance, duration và geometry. Weather API được dùng để điều chỉnh lịch trình khi có mưa hoặc thời tiết xấu.

### 2.4 Trải nghiệm đơn giản

Người dùng chỉ cần:

1. Nhập nhu cầu.
2. Chọn ngày bắt đầu và nơi xuất phát nếu cần.
3. Xem lịch trình.
4. Xem bản đồ và tuyến đường.
5. Lưu lịch trình.

Mục tiêu UX là giúp người dùng có lịch trình đầu tiên trong thời gian ngắn, sau đó mới cho phép chỉnh sửa sâu hơn ở các giai đoạn sau.

### 2.5 Kiểm soát chi phí và khả năng mở rộng

Ngay từ đầu sản phẩm phải có tư duy scale/cost:

- Cache OSRM route.
- Cache Weather API.
- Giới hạn số ngày trong MVP.
- Giới hạn số địa điểm mỗi ngày.
- Không gọi API ngoài liên tục.
- Không phụ thuộc hoàn toàn vào Google Maps hoặc Booking API.
- Dùng PostgreSQL + PostGIS làm nguồn dữ liệu chính sau khi đồng bộ.

---

## 3. Sản phẩm giải quyết vấn đề gì?

Người dùng khi tự lập kế hoạch du lịch thường phải mở nhiều tab:

- Google Search để tìm địa điểm.
- Google Maps để xem vị trí.
- TikTok/Facebook để xem review.
- Website thời tiết để xem mưa nắng.
- Ghi chú cá nhân để gom lịch trình.
- Nhắn tin nhóm để thảo luận.

Quá trình này tốn thời gian, dễ rối và thường tạo ra lịch trình không thực tế.

AI Smart Travel Planner giải quyết bằng cách gom các bước quan trọng vào một flow:

1. Hiểu nhu cầu bằng tiếng Việt.
2. Lấy địa điểm thật từ hệ thống.
3. Chấm điểm địa điểm theo nhu cầu.
4. Chia lịch trình theo ngày.
5. Tính route thực tế bằng OSRM.
6. Điều chỉnh theo thời tiết.
7. Hiển thị trực quan trên bản đồ.
8. Cho phép lưu lại lịch trình.

---

## 4. Vì sao khác biệt so với tự tìm Google/Maps thủ công?

### 4.1 Google/Maps cho dữ liệu, nhưng không tự tạo lịch trình tối ưu

Google Maps giúp tìm địa điểm và chỉ đường, nhưng người dùng vẫn phải tự quyết định:

- Đi đâu trước?
- Đi mấy điểm một ngày là hợp lý?
- Điểm nào phù hợp ngân sách?
- Điểm nào nên đi buổi sáng?
- Nếu trời mưa thì đổi lịch thế nào?
- Có nên gom các điểm gần nhau vào cùng một ngày không?

AI Smart Travel Planner xử lý các quyết định này bằng rule, scoring, dữ liệu route và AI-generated explanation.

### 4.2 Chatbot AI có thể viết lịch trình, nhưng dễ bịa địa điểm

Một chatbot thuần AI có thể tạo lịch trình nghe rất hay, nhưng có rủi ro:

- Địa điểm không tồn tại.
- Tọa độ sai.
- Khoảng cách không thực tế.
- Không tính thời gian di chuyển.
- Không biết dữ liệu địa phương đã thay đổi.
- Không có route geometry để hiển thị bản đồ.

Sản phẩm này giới hạn vai trò của Gemini: Gemini parse request, viết mô tả và giải thích. Địa điểm thật phải đến từ PostgreSQL + PostGIS hoặc nguồn đã đồng bộ/kiểm duyệt.

### 4.3 Sản phẩm hướng đến kế hoạch có thể dùng thật

Kết quả không chỉ là đoạn text. Kết quả gồm:

- Itinerary theo ngày.
- Danh sách địa điểm.
- Lý do gợi ý.
- Bản đồ.
- Marker.
- Polyline route.
- Thời gian di chuyển.
- Dự báo thời tiết.
- Khả năng lưu lại và mở lại.

---

## 5. Định hướng sản phẩm dài hạn

Sau MVP, sản phẩm có thể mở rộng theo các hướng:

- Hỗ trợ nhiều thành phố tại Việt Nam.
- Cho phép chỉnh sửa lịch trình bằng giao diện kéo thả.
- Gợi ý khách sạn tốt hơn dựa trên vị trí lịch trình.
- Gợi ý phương tiện liên tỉnh từ dữ liệu chính thức.
- Chia sẻ lịch trình cho bạn bè.
- Làm mobile app Flutter đầy đủ.
- Tích hợp partner/operator du lịch.
- Thêm booking/thanh toán khi đã đủ năng lực pháp lý, dữ liệu và vận hành.