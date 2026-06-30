# MVP Scope - AI Smart Travel Planner

## 1. Mục tiêu MVP

MVP của AI Smart Travel Planner tập trung chứng minh rằng hệ thống có thể tạo lịch trình du lịch thực tế từ yêu cầu tiếng Việt, dựa trên dữ liệu địa điểm thật, có route thực tế, có yếu tố thời tiết và cho phép người dùng lưu lại lịch trình.

MVP không cố gắng làm toàn bộ nền tảng du lịch. Mục tiêu là hoàn thành một flow lõi đủ tốt:

> Nhập nhu cầu → Gemini parse → chọn địa điểm thật → tạo itinerary → tính route OSRM → điều chỉnh theo weather → hiển thị web → lưu lịch trình.

---

## 2. Thành phố đầu tiên

### 2.1 Thành phố MVP

Thành phố đầu tiên: **Nha Trang**.

### 2.2 Lý do chọn Nha Trang

- Có nhiều loại địa điểm du lịch: biển, check-in, ăn uống, cà phê, chợ, điểm văn hóa.
- Phù hợp chuyến đi ngắn 1-3 ngày.
- Dễ tạo dataset địa điểm ban đầu.
- Phù hợp với nhóm người dùng sinh viên, cặp đôi, gia đình và người bận rộn.
- Có nhu cầu du lịch thực tế cao.

### 2.3 Giới hạn địa lý

MVP chỉ cần hỗ trợ địa điểm trong khu vực Nha Trang và vùng lân cận hợp lý cho chuyến đi ngắn.

Không mở rộng sang nhiều thành phố trong MVP.

---

## 3. Thời lượng chuyến đi

### 3.1 Phạm vi

MVP hỗ trợ chuyến đi:

- 1 ngày.
- 2 ngày.
- 3 ngày.

### 3.2 Lý do giới hạn

- Giảm độ phức tạp tạo itinerary.
- Giảm số lần gọi OSRM.
- Giảm số lần gọi Weather API.
- Dễ kiểm thử.
- Phù hợp mục tiêu demo sản phẩm thật giai đoạn đầu.

### 3.3 Quy tắc

- Mỗi ngày có khoảng 3-5 địa điểm.
- Không tạo lịch trình quá dày.
- Ngày cuối nên nhẹ hơn.
- Ưu tiên điểm gần nhau trong cùng một ngày.
- Nếu thiếu dữ liệu địa điểm, hệ thống phải báo rõ thay vì bịa dữ liệu.

---

## 4. Nhập prompt tiếng Việt

### 4.1 Chức năng

Người dùng nhập yêu cầu tự nhiên bằng tiếng Việt.

Ví dụ:

> "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí."

### 4.2 Dữ liệu cần thu thập

Tối thiểu:

- prompt.
- startDate.
- origin nếu có.

Có thể suy luận từ prompt:

- destination.
- days.
- nights.
- budget.
- interests.
- travelStyle.

### 4.3 UX yêu cầu

- Có textarea nhập prompt.
- Có prompt examples.
- Có nút tạo lịch trình.
- Có loading state rõ.
- Có thông báo lỗi dễ hiểu.

---

## 5. Parse bằng Gemini

### 5.1 Vai trò Gemini trong MVP

Gemini dùng để:

- Parse yêu cầu.
- Chuẩn hóa thành JSON.
- Viết mô tả lịch trình.
- Giải thích lý do gợi ý.

### 5.2 Gemini không được làm

Gemini không được:

- Tạo địa điểm không có trong database.
- Bịa tọa độ.
- Bịa khách sạn.
- Bịa phương tiện.
- Quyết định route thực tế.
- Bỏ qua dữ liệu PostgreSQL + PostGIS.

### 5.3 Output parse tối thiểu

```json
{
  "destination": "Nha Trang",
  "days": 3,
  "nights": 2,
  "budget": "low",
  "interests": ["beach", "seafood", "check-in"],
  "travelStyle": "budget_friendly",
  "specialRequirements": []
}
```

---

## 6. Dữ liệu địa điểm thật (PostgreSQL + PostGIS)

### 6.1 Nguyên tắc dữ liệu

- Tất cả địa điểm trong lịch trình phải lấy từ cơ sở dữ liệu PostgreSQL + PostGIS đã được xác minh hoặc đồng bộ trước.
- Không cho phép AI tự phát minh ra địa điểm hoặc tọa độ.

### 6.2 Các trường thông tin chính của địa điểm

- Tên địa điểm (`name`), Thành phố (`city`), Phân loại (`category`).
- Tọa độ địa lý (`latitude`, `longitude` hoặc kiểu dữ liệu `geography(Point, 4326)` trong PostGIS).
- Chi phí ước tính (`estimatedCost`), Thời lượng tham quan dự kiến (`durationMinutes`).
- Tags sở thích (`tags`), Thời điểm ghé thăm tốt nhất (`bestTime`), Loại trong nhà/ngoài trời (`indoor`).

---

## 7. Chấm điểm và gợi ý địa điểm (Place Scoring)

### 7.1 Cơ chế chấm điểm

Hệ thống sử dụng thuật toán chấm điểm rule-based (deterministic) để xếp hạng mức độ phù hợp của địa điểm:

- Khớp sở thích/tag: +30 điểm.
- Phù hợp ngân sách: +20 điểm.
- Phù hợp thời điểm trong ngày: +10 điểm.
- Điểm miễn phí đối với ngân sách thấp: +15 điểm.
- Khoảng cách di chuyển gần điểm trước đó: +15 điểm.
- Thời tiết xấu (mưa) mà địa điểm ở ngoài trời: -25 điểm.

---

## 8. Tạo lịch trình theo ngày (Itinerary Generation)

### 8.1 Nguyên tắc phân bổ

- Sắp xếp địa điểm theo trình tự thời gian hợp lý (Sáng -> Trưa -> Chiều -> Tối).
- Giới hạn 3-5 địa điểm/ngày để đảm bảo tính khả thi.
- Ghép các điểm gần nhau vào cùng một ngày để tối ưu quãng đường di chuyển.

### 8.2 Nội dung phản hồi lịch trình

- Trả về danh sách địa điểm cụ thể cho từng ngày kèm theo mốc thời gian dự kiến.
- Cung cấp mô tả chi tiết và lý do gợi ý cho từng điểm đến.

---

## 9. Tuyến đường thực tế (OSRM Routing)

### 9.1 Tính toán tuyến đường

- Sử dụng OSRM để tính toán khoảng cách di chuyển thực tế (mét) và thời gian di chuyển (giây) giữa các địa điểm liên tiếp trong ngày.
- Lấy dữ liệu geometry (dạng GeoJSON LineString) để vẽ tuyến đường trên bản đồ.

### 9.2 Cache & Fallback

- Cache tuyến đường bằng Redis hoặc database để tối ưu chi phí gọi API ngoài.
- Nếu OSRM lỗi, hệ thống vẫn hiển thị danh sách địa điểm và bản đồ kèm marker, chỉ ẩn thông tin tuyến đường chi tiết mà không làm crash ứng dụng.

---

## 10. Điều chỉnh theo thời tiết (Weather Adjustment)

### 10.1 Nhận thức thời tiết

- Tích hợp API thời tiết (Open-Meteo hoặc OpenWeather) để lấy thông tin dự báo thời tiết theo ngày tại điểm đến.
- Nếu dự báo có mưa hoặc thời tiết xấu: Tự động giảm điểm ưu tiên của các địa điểm ngoài trời và tăng điểm ưu tiên của các địa điểm trong nhà (quán cà phê, nhà hàng, bảo tàng...).

### 10.2 Fallback thời tiết

- Lỗi API thời tiết không được làm gián đoạn quá trình tạo lịch trình. Hệ thống sẽ bỏ qua bước điều chỉnh theo thời tiết và thông báo cho người dùng.

---

## 11. Giao diện người dùng (Web MVP)

### 11.1 Các trang chức năng chính

- **Trang chủ/Nhập yêu cầu**: Form nhập prompt tiếng Việt tự nhiên, chọn ngày bắt đầu, địa điểm xuất phát và hiển thị các prompt mẫu gợi ý.
- **Trang hiển thị kết quả**:
  - Cột trái: Lịch trình chi tiết theo từng ngày (timeline, lý do gợi ý, chi phí dự kiến, dự báo thời tiết).
  - Cột phải: Bản đồ OpenStreetMap hiển thị marker các địa điểm tham quan và polyline tuyến đường di chuyển.
- **Trang lịch trình đã lưu**: Danh sách các chuyến đi người dùng đã lưu để dễ dàng xem lại.

---

## 12. Authentication & Lưu lịch trình

### 12.1 Quản lý người dùng

- Hỗ trợ đăng ký, đăng nhập bằng email/password hoặc OAuth2.
- Sử dụng JWT access token ngắn hạn và refresh token rotation để bảo mật.

### 12.2 Lưu lịch trình

- Người dùng vãng lai (guest) có thể trải nghiệm tạo lịch trình nhưng bắt buộc phải đăng nhập/đăng ký để thực hiện lưu lịch trình.
- Đảm bảo tính riêng tư: Người dùng chỉ được quyền xem, sửa hoặc xóa các lịch trình do chính mình tạo ra.