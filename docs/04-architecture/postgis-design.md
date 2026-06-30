# PostGIS Design - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế và các mẫu truy vấn dữ liệu không gian sử dụng extension **PostGIS** trên PostgreSQL cho dự án AI Smart Travel Planner.

---

## 1. Lý do lựa chọn PostGIS
Dự án yêu cầu xử lý dữ liệu địa lý thực tế: Xác định tọa độ của địa điểm, khách sạn, vẽ tuyến đường di chuyển và tìm kiếm các điểm xung quanh.
- **Lý do chọn**:
  - Tích hợp trực tiếp vào PostgreSQL, giúp đồng bộ dữ liệu nghiệp vụ và dữ liệu không gian trong cùng một giao dịch (ACID transaction).
  - Cung cấp chỉ mục không gian **GIST (Generalized Search Tree)** giúp tối ưu hóa tốc độ tìm kiếm tọa độ từ hàng triệu bản ghi xuống dưới `10ms`.
  - Có sẵn hàng trăm hàm tính toán hình học địa lý (như tính khoảng cách, kiểm tra điểm nằm trong vùng, tìm điểm gần nhất).

---

## 2. Kiểu dữ liệu Geography so với Geometry
PostGIS hỗ trợ hai kiểu dữ liệu không gian chính:
- **Geometry (Hình học phẳng)**: Biểu diễn tọa độ trên một mặt phẳng phẳng (2D). Tính toán toán học rất nhanh nhưng có sai số lớn về khoảng cách thực tế trên bề mặt trái đất nếu không cấu hình phép chiếu (projection) phù hợp.
- **Geography (Địa lý mặt cầu)**: Biểu diễn tọa độ trên mô hình mặt cầu của Trái đất. Sử dụng hệ tọa độ chuẩn **WGS 84 (SRID: 4326)**.
- **Quyết định thiết kế**: Chọn kiểu dữ liệu **`GEOGRAPHY(Point, 4326)`** cho các bảng `places` và `hotels` để đảm bảo việc tính khoảng cách (trả về trực tiếp đơn vị mét) luôn chính xác mà không cần thực hiện các phép chiếu phức tạp.

---

## 3. Lưu trữ tọa độ Lat/Lng
- **Quy tắc**: Tuyệt đối **không lưu trữ** tọa độ dưới dạng hai cột số thực `latitude` và `longitude` riêng biệt rồi thực hiện các công thức toán học (như công thức Haversine) trong code backend. Điều này cực kỳ chậm và không thể tận dụng được index của database.
- **Hiện thực**: Lưu trữ duy nhất trong một cột `location` với kiểu dữ liệu `GEOGRAPHY(Point, 4326)`. Giá trị được chèn dưới định dạng WKT (Well-Known Text): `POINT(longitude latitude)` (Lưu ý: Kinh độ viết trước, Vĩ độ viết sau theo chuẩn PostGIS).

---

## 4. Các mẫu truy vấn không gian phổ biến (Query Patterns)

### 4.1 Tìm địa điểm trong bán kính (Radius Search)
Tìm tất cả các địa điểm hoạt động thuộc danh mục 'cafe' nằm trong bán kính **3km** (3000 mét) tính từ khách sạn tại tọa độ (109.1962 12.2381):
```sql
SELECT id, name, category, ST_Distance(location, ST_GeogFromText('SRID=4326;POINT(109.1962 12.2381)')) AS distance_meters
FROM places
WHERE is_active = true
  AND category = 'cafe'
  AND ST_DWithin(location, ST_GeogFromText('SRID=4326;POINT(109.1962 12.2381)'), 3000)
ORDER BY distance_meters ASC;
```
*Lưu ý: Sử dụng hàm `ST_DWithin` ở mệnh đề `WHERE` để tận dụng chỉ mục GIST, sau đó mới dùng `ST_Distance` để lấy khoảng cách hiển thị.*

### 4.2 Tìm địa điểm gần nhất (Nearest Neighbor - K-NN)
Tìm nhanh **5 địa điểm** gần nhất tính từ một điểm cho trước (sử dụng toán tử `<->` của PostGIS để kích hoạt thuật toán tìm kiếm trên chỉ mục GIST):
```sql
SELECT id, name, ST_Distance(location, ST_GeogFromText('SRID=4326;POINT(109.1962 12.2381)')) AS distance
FROM places
WHERE is_active = true
ORDER BY location <-> ST_GeogFromText('SRID=4326;POINT(109.1962 12.2381)')
LIMIT 5;
```

### 4.3 Tìm địa điểm trong khung nhìn bản đồ (Bounding Box - BBOX)
Khi người dùng kéo (pan) hoặc phóng to/thu nhỏ bản đồ trên trình duyệt, client gửi về tọa độ của 4 góc bản đồ (Bounding Box). Backend chỉ trả về các địa điểm nằm trong khung nhìn này để tối ưu băng thông:
```sql
SELECT id, name, ST_AsText(location)
FROM places
WHERE is_active = true
  AND location::geometry && ST_MakeEnvelope(109.18, 12.22, 109.21, 12.25, 4326);
```
*Lưu ý: Ép kiểu `location::geometry` để sử dụng toán tử bao phủ `&&` của Geometry, giúp tăng tốc độ xử lý hơn nhiều so với việc tính toán mặt cầu.*

---

## 5. So sánh phạm vi sử dụng: BBOX và Radius Search

| Tiêu chí | Bounding Box (BBOX) Search | Radius (Bán kính) Search |
| :--- | :--- | :--- |
| **Cách thức hoạt động** | Lọc địa điểm nằm trong một khung chữ nhật (Envelope) xác định bởi vĩ độ/kinh độ min và max. | Lọc địa điểm nằm trong một hình tròn đồng tâm có bán kính R (mét). |
| **Trường hợp áp dụng** | Phục vụ trực tiếp cho thao tác hiển thị Marker trên bản đồ Leaflet (chỉ render những gì người dùng đang nhìn thấy). | Phục vụ cho thuật toán chấm điểm (Place Scoring) hoặc tìm kiếm khách sạn xung quanh lịch trình đi của ngày. |
| **Hiệu năng** | Cực kỳ nhanh do sử dụng toán tử bao phủ `&&` trên hình học phẳng. | Chậm hơn một chút vì phải tính toán khoảng cách thực tế trên mặt cầu. |
