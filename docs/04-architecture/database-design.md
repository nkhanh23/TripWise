# Database Design - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế vật lý của các bảng trong cơ sở dữ liệu quan hệ **PostgreSQL + PostGIS** của dự án AI Smart Travel Planner.

---

## 1. Nhóm bảng Xác thực & Người dùng (Auth & User)

### 1.1 Bảng `users`
- **Purpose**: Lưu trữ thông tin tài khoản người dùng đăng ký.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `full_name`: `VARCHAR(100)` (NOT NULL).
  - `email`: `VARCHAR(150)` (NOT NULL).
  - `password_hash`: `VARCHAR(255)` (NOT NULL).
  - `is_active`: `BOOLEAN` (NOT NULL, DEFAULT true).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
  - `updated_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Unique Constraints**: `email` (Unique).
- **Soft Delete**: Không áp dụng, sử dụng cột trạng thái `is_active`.
- **Security/Privacy Note**: Mật khẩu phải được băm bằng thuật toán bcrypt. Email được đánh chỉ mục tìm kiếm và xử lý case-insensitive.

### 1.2 Bảng `roles`
- **Purpose**: Định nghĩa các quyền hạn trong hệ thống (GUEST, USER, ADMIN).
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `name`: `VARCHAR(50)` (NOT NULL).
- **Unique Constraints**: `name` (Unique).

### 1.3 Bảng `user_roles`
- **Purpose**: Bảng liên kết trung gian (Many-to-Many) giữa người dùng và quyền hạn.
- **Columns**:
  - `user_id`: `BIGINT` (Foreign Key -> `users(id)` ON DELETE CASCADE).
  - `role_id`: `BIGINT` (Foreign Key -> `roles(id)` ON DELETE CASCADE).
- **Primary Key**: Cặp khóa (`user_id`, `role_id`).

### 1.4 Bảng `refresh_tokens`
- **Purpose**: Lưu trữ trạng thái của Refresh Token phục vụ quy trình Refresh Token Rotation.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `user_id`: `BIGINT` (NOT NULL, Foreign Key -> `users(id)` ON DELETE CASCADE).
  - `token_hash`: `VARCHAR(255)` (NOT NULL) - Lưu băm SHA-256 của Refresh Token.
  - `token_family`: `UUID` (NOT NULL) - Mã định danh gia đình token để phát hiện replay attack.
  - `is_revoked`: `BOOLEAN` (NOT NULL, DEFAULT false).
  - `expires_at`: `TIMESTAMPTZ` (NOT NULL).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Unique Constraints**: `token_hash` (Unique).

---

## 2. Nhóm bảng Dữ liệu Địa phương (Place & Geographics)

### 2.1 Bảng `places`
- **Purpose**: Lưu trữ danh sách địa điểm tham quan du lịch đã được xác minh.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `name`: `VARCHAR(255)` (NOT NULL).
  - `city`: `VARCHAR(100)` (NOT NULL) - Thành phố (ví dụ: Nha Trang).
  - `category`: `VARCHAR(50)` (NOT NULL) - Phân loại chính (cafe, beach, cultural...).
  - `location`: `GEOGRAPHY(POINT, 4326)` (NOT NULL) - Tọa độ địa lý sử dụng PostGIS.
  - `description`: `TEXT`.
  - `estimated_cost`: `NUMERIC(12, 2)` (NOT NULL, DEFAULT 0.0) - Chi phí dự kiến (VND).
  - `duration_minutes`: `INTEGER` (NOT NULL, DEFAULT 60) - Thời lượng tham quan trung bình.
  - `indoor`: `BOOLEAN` (NOT NULL, DEFAULT false) - Điểm trong nhà hay ngoài trời.
  - `is_active`: `BOOLEAN` (NOT NULL, DEFAULT true).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
  - `updated_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Security/Privacy Note**: Cột `location` được gắn chỉ mục GIST để thực hiện tính toán khoảng cách.

### 2.2 Bảng `place_tags`
- **Purpose**: Lưu trữ các từ khóa phụ (tags) phục vụ tính toán khớp sở thích (matching scoring).
- **Columns**:
  - `place_id`: `BIGINT` (NOT NULL, Foreign Key -> `places(id)` ON DELETE CASCADE).
  - `tag`: `VARCHAR(50)` (NOT NULL).
- **Primary Key**: Cặp khóa (`place_id`, `tag`).

### 2.3 Bảng `hotels`
- **Purpose**: Lưu trữ thông tin khách sạn thô đã chuẩn hóa phục vụ gợi ý lưu trú.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `name`: `VARCHAR(255)` (NOT NULL).
  - `city`: `VARCHAR(100)` (NOT NULL).
  - `location`: `GEOGRAPHY(POINT, 4326)` (NOT NULL).
  - `price_level`: `VARCHAR(20)` (NOT NULL) - Mức ngân sách (low, medium, high).
  - `google_maps_url`: `VARCHAR(255)`.
  - `description`: `TEXT`.
  - `is_active`: `BOOLEAN` (NOT NULL, DEFAULT true).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
  - `updated_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).

### 2.4 Bảng `hotel_tags`
- **Purpose**: Lưu trữ các tag đặc trưng của khách sạn (ví dụ: gần biển, view đẹp, hồ bơi).
- **Columns**:
  - `hotel_id`: `BIGINT` (NOT NULL, Foreign Key -> `hotels(id)` ON DELETE CASCADE).
  - `tag`: `VARCHAR(50)` (NOT NULL).
- **Primary Key**: Cặp khóa (`hotel_id`, `tag`).

### 2.5 Bảng `transports`
- **Purpose**: Thông tin tham khảo về phương tiện di chuyển liên tỉnh.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `from_city`: `VARCHAR(100)` (NOT NULL).
  - `to_city`: `VARCHAR(100)` (NOT NULL).
  - `transport_type`: `VARCHAR(50)` (NOT NULL) - Loại phương tiện (xe khách, tàu, máy bay).
  - `estimated_time`: `VARCHAR(50)` (NOT NULL) - Thời gian di chuyển ước lượng.
  - `estimated_cost`: `NUMERIC(12, 2)` (NOT NULL, DEFAULT 0.0).
  - `description`: `TEXT`.
  - `is_active`: `BOOLEAN` (NOT NULL, DEFAULT true).

---

## 3. Nhóm bảng Hành trình (Trip & Itinerary)

### 3.1 Bảng `trips`
- **Purpose**: Lưu trữ thông tin cấu hình tổng thể của chuyến đi.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `user_id`: `BIGINT` (NOT NULL, Foreign Key -> `users(id)` ON DELETE CASCADE).
  - `destination`: `VARCHAR(100)` (NOT NULL).
  - `start_date`: `DATE` (NOT NULL).
  - `days`: `INTEGER` (NOT NULL).
  - `nights`: `INTEGER` (NOT NULL).
  - `budget`: `VARCHAR(20)` (NOT NULL).
  - `travel_style`: `VARCHAR(50)` (NOT NULL).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
  - `updated_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Security/Privacy Note**: Liên kết chặt chẽ với ID người dùng để kiểm tra quyền đọc/ghi.

### 3.2 Bảng `itinerary_days`
- **Purpose**: Chia lịch trình theo từng ngày cụ thể của chuyến đi.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `trip_id`: `BIGINT` (NOT NULL, Foreign Key -> `trips(id)` ON DELETE CASCADE).
  - `day_number`: `INTEGER` (NOT NULL) - Số ngày (1, 2, 3...).
  - `day_title`: `VARCHAR(255)`.
  - `weather_summary`: `VARCHAR(255)`.
  - `total_distance_meters`: `INTEGER` (NOT NULL, DEFAULT 0).
  - `total_duration_seconds`: `INTEGER` (NOT NULL, DEFAULT 0).
- **Unique Constraints**: Cặp (`trip_id`, `day_number`) là Unique.

### 3.3 Bảng `itinerary_items`
- **Purpose**: Điểm đến cụ thể (timeline items) trong ngày.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `itinerary_day_id`: `BIGINT` (NOT NULL, Foreign Key -> `itinerary_days(id)` ON DELETE CASCADE).
  - `place_id`: `BIGINT` (NOT NULL, Foreign Key -> `places(id)`).
  - `order_index`: `INTEGER` (NOT NULL) - Thứ tự đi trong ngày (0, 1, 2...).
  - `start_time`: `TIME` (NOT NULL) - Giờ đến điểm.
  - `end_time`: `TIME` (NOT NULL) - Giờ rời điểm.
  - `reason`: `TEXT` - Lý do gợi ý điểm này cho người dùng.
  - `estimated_cost`: `NUMERIC(12, 2)` (NOT NULL, DEFAULT 0.0).
  - `distance_from_previous_meters`: `INTEGER` (NOT NULL, DEFAULT 0).
  - `duration_from_previous_seconds`: `INTEGER` (NOT NULL, DEFAULT 0).
- **Unique Constraints**: Cặp (`itinerary_day_id`, `order_index`) là Unique.

---

## 4. Nhóm bảng Bộ đệm (Cache & Integrations)

### 4.1 Bảng `route_cache`
- **Purpose**: Cache tuyến đường OSRM lâu dài để tiết kiệm cost và tránh rate limit.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `cache_key`: `VARCHAR(255)` (NOT NULL) - Định dạng: `fromPlaceId_toPlaceId_profile`.
  - `distance_meters`: `INTEGER` (NOT NULL).
  - `duration_seconds`: `INTEGER` (NOT NULL).
  - `geometry`: `GEOGRAPHY(LINESTRING, 4326)` (NOT NULL) - Dữ liệu chuỗi tọa độ địa lý.
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Unique Constraints**: `cache_key` (Unique).

### 4.2 Bảng `weather_cache`
- **Purpose**: Lưu trữ dữ liệu thời tiết của thành phố theo ngày.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `city`: `VARCHAR(100)` (NOT NULL).
  - `forecast_date`: `DATE` (NOT NULL).
  - `temp_min`: `INTEGER` (NOT NULL).
  - `temp_max`: `INTEGER` (NOT NULL).
  - `rain_probability`: `INTEGER` (NOT NULL).
  - `weather_code`: `VARCHAR(50)` (NOT NULL).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Unique Constraints**: Cặp (`city`, `forecast_date`) là Unique.

---

## 5. Nhóm bảng Giám sát & Nhật ký (Audit & Logs)

### 5.1 Bảng `ai_usage_logs`
- **Purpose**: Giám sát tần suất sử dụng và số lượng token tiêu tốn khi gọi Gemini API.
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `user_id`: `BIGINT` (Foreign Key -> `users(id)` ON DELETE SET NULL).
  - `prompt_length`: `INTEGER` (NOT NULL).
  - `response_length`: `INTEGER` (NOT NULL).
  - `token_consumed`: `INTEGER` (NOT NULL, DEFAULT 0).
  - `duration_ms`: `INTEGER` (NOT NULL) - Thời gian API phản hồi.
  - `status`: `VARCHAR(20)` (NOT NULL) - Trạng thái (`SUCCESS`, `FAILED`).
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).

### 5.2 Bảng `audit_logs`
- **Purpose**: Ghi nhận vết các thao tác thay đổi nhạy cảm (như phân quyền, sửa đổi dữ liệu admin).
- **Columns**:
  - `id`: `BIGSERIAL` (Primary Key).
  - `actor_id`: `BIGINT` - ID người thực hiện (Foreign Key -> `users(id)` ON DELETE SET NULL).
  - `action`: `VARCHAR(100)` (NOT NULL) - Hành động (ví dụ: `UPDATE_PLACE`, `REVOKE_ALL_SESSIONS`).
  - `resource`: `VARCHAR(100)` (NOT NULL) - Tài nguyên bị tác động.
  - `resource_id`: `VARCHAR(50)`.
  - `old_value`: `TEXT`.
  - `new_value`: `TEXT`.
  - `ip_address`: `VARCHAR(45)`.
  - `created_at`: `TIMESTAMPTZ` (NOT NULL, DEFAULT NOW()).
- **Security/Privacy Note**: Không được ghi nhận mật khẩu, thẻ thanh toán hay token thô vào trường old/new value.
