# Database Indexing - AI Smart Travel Planner

Tài liệu này xác lập chiến lược đánh chỉ mục (indexing) trên PostgreSQL nhằm tối ưu hóa hiệu năng truy vấn cho ứng dụng thực tế.

---

## 1. Danh sách các Index được triển khai

```sql
-- 1. Địa điểm & Tìm kiếm không gian
CREATE INDEX idx_places_city_active ON places(city, is_active);
CREATE INDEX idx_places_category_active ON places(category, is_active);
CREATE INDEX idx_places_city_cost ON places(city, estimated_cost, is_active);
CREATE INDEX idx_places_city_indoor ON places(city, indoor, is_active);
CREATE INDEX idx_place_tags_tag ON place_tags(tag);
CREATE INDEX idx_places_location ON places USING GIST (location);
CREATE INDEX idx_hotels_location ON hotels USING GIST (location);

-- 2. Hành trình & Chi tiết lịch trình
CREATE INDEX idx_trips_user_created ON trips(user_id, created_at DESC);
CREATE UNIQUE INDEX uidx_itinerary_days_trip_day ON itinerary_days(trip_id, day_number);
CREATE UNIQUE INDEX uidx_itinerary_items_day_order ON itinerary_items(itinerary_day_id, order_index);

-- 3. Bộ đệm & Tích hợp
CREATE UNIQUE INDEX uidx_route_cache_key ON route_cache(cache_key);
CREATE UNIQUE INDEX uidx_weather_cache_city_date ON weather_cache(city, forecast_date);

-- 4. Xác thực & Logs
CREATE INDEX idx_refresh_tokens_user_revoked ON refresh_tokens(user_id) WHERE is_revoked = false;
CREATE INDEX idx_ai_logs_user_created ON ai_usage_logs(user_id, created_at DESC);
```

---

## 2. Giải thích chi tiết mục đích phục vụ truy vấn

### 2.1 Truy vấn tìm kiếm địa điểm (Places & Tags)
- **`idx_places_city_active`**: Phục vụ các câu truy vấn lọc địa điểm theo thành phố trước khi chạy thuật toán scoring (ví dụ: `WHERE city = 'Nha Trang' AND is_active = true`).
- **`idx_places_category_active`**: Tối ưu hóa bộ lọc địa điểm theo phân loại (ví dụ: `WHERE category = 'cafe'`).
- **`idx_places_city_cost` & `idx_places_city_indoor`**: Tối ưu hóa các truy vấn so khớp chi phí và loại địa điểm (trong nhà/ngoài trời) khi tính toán chấm điểm scoring theo điều kiện thời tiết và ngân sách.
- **`idx_place_tags_tag`**: Hỗ trợ đắc lực cho việc lọc địa điểm khớp với tag sở thích của người dùng (ví dụ: `WHERE tag IN ('seafood', 'beach')`).
- **`idx_places_location` (GIST)**: Chỉ mục không gian (spatial index) quan trọng nhất của PostGIS. Phục vụ cho truy vấn tìm điểm gần nhất (`Nearest Neighbor`) hoặc các điểm nằm trong bán kính (Radius Search) để xếp hạng quãng đường di chuyển.

### 2.2 Truy vấn hành trình (Trips & Itineraries)
- **`idx_trips_user_created`**: Phục vụ tính năng xem danh sách lịch trình đã lưu của người dùng theo thứ tự thời gian mới nhất lên đầu (`WHERE user_id = ? ORDER BY created_at DESC`).
- **`uidx_itinerary_days_trip_day`** & **`uidx_itinerary_items_day_order`**: Chỉ mục Unique phục vụ cho việc truy xuất nhanh toàn bộ cấu trúc cây của lịch trình một cách chính xác theo thứ tự ngày và thứ tự khung giờ di chuyển, đồng thời ngăn chặn lỗi chèn trùng lặp thứ tự.

### 2.3 Truy vấn bộ đệm (Route & Weather Cache)
- **`uidx_route_cache_key`**: Hỗ trợ việc kiểm tra nhanh tuyến đường giữa điểm A và điểm B đã được tính toán bởi OSRM trước đó hay chưa. Độ phức tạp truy vấn đạt `O(1)`.
- **`uidx_weather_cache_city_date`**: Tối ưu hóa việc đọc dự báo thời tiết Nha Trang cho một ngày cụ thể để điều chỉnh hoạt động tham quan.

### 2.4 Bảo mật & Logs
- **`idx_refresh_tokens_user_revoked` (Partial Index)**: Đánh chỉ mục có điều kiện (chỉ index các token chưa bị thu hồi). Giúp bộ lọc xác thực JWT tìm kiếm nhanh các Refresh Token còn hiệu lực của người dùng để thực hiện quay vòng token.

---

## 3. Quy tắc đánh chỉ mục trong giai đoạn MVP (Cảnh báo)
- **Cảnh báo không Index quá nhiều**: Đánh chỉ mục giúp tăng tốc độ đọc (`SELECT`) nhưng sẽ **làm chậm tốc độ ghi (`INSERT`, `UPDATE`, `DELETE`)** vì PostgreSQL phải cập nhật lại cấu trúc cây index.
- **Quy tắc MVP**: Chỉ đánh chỉ mục trên các cột tham gia vào mệnh đề `WHERE`, `JOIN` hoặc `ORDER BY` có tần suất truy vấn cao. Không đánh chỉ mục trên các bảng có số lượng dòng cực nhỏ (như bảng `roles` chỉ có 3 bản ghi).

---

## 4. Tương lai: Phân vùng dữ liệu (Database Partitioning)
Khi hệ thống mở rộng quy mô lớn (phục vụ hàng triệu người dùng), hai bảng nhật ký `ai_usage_logs` và `audit_logs` sẽ tăng trưởng dữ liệu rất nhanh (hàng chục triệu dòng mỗi năm):
- **Giải pháp**: Áp dụng **Table Partitioning theo thời gian (Range Partitioning)**.
- **Hiện thực**: Chia bảng `ai_usage_logs` thành các bảng phân vùng nhỏ theo từng tháng hoặc từng quý (ví dụ: `ai_usage_logs_y2026m06`). Khi cần dọn dẹp hoặc backup dữ liệu cũ quá 1 năm, chỉ cần drop partition tương ứng mà không làm khóa (lock) bảng chính và không ảnh hưởng đến hiệu năng ghi log hiện tại.
