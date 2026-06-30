# Product Requirements - AI Smart Travel Planner

## 1. Product Goals

## 1.1 Goal 1: Tạo lịch trình du lịch nhanh từ tiếng Việt tự nhiên

Người dùng có thể nhập nhu cầu bằng tiếng Việt và nhận lịch trình phù hợp mà không cần tự điền nhiều form.

## 1.2 Goal 2: Đảm bảo địa điểm là dữ liệu thật

Hệ thống chỉ gợi ý địa điểm đã có trong PostgreSQL + PostGIS hoặc nguồn đã đồng bộ/kiểm duyệt. Gemini không được tự bịa địa điểm.

## 1.3 Goal 3: Lịch trình phải có tính khả thi

Lịch trình cần dựa trên:

- Số ngày.
- Sở thích.
- Ngân sách.
- Thời điểm trong ngày.
- Khoảng cách/thời gian di chuyển từ OSRM.
- Thời tiết từ Weather API.
- Giới hạn số địa điểm mỗi ngày.

## 1.4 Goal 4: Trải nghiệm xem kết quả trực quan

Web MVP cần hiển thị:

- Lịch trình theo ngày.
- Bản đồ OpenStreetMap.
- Marker địa điểm.
- Polyline route.
- Thông tin thời tiết.
- Lý do gợi ý.
- Nút lưu lịch trình.

## 1.5 Goal 5: Có nền tảng mở rộng thành sản phẩm thật

Sản phẩm cần thiết kế để sau này mở rộng:

- Flutter app.
- Nhiều thành phố.
- Partner/operator.
- Booking/thanh toán.
- Monitoring/rate limiting.
- Object Storage + CDN cho media/static assets.

---

## 2. Functional Requirements

## 2.1 Nhập yêu cầu du lịch

### FR-001: Nhập prompt tiếng Việt

Người dùng có thể nhập prompt mô tả chuyến đi bằng tiếng Việt.

Ví dụ:

> "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí."

### FR-002: Nhập ngày bắt đầu

Người dùng có thể nhập ngày bắt đầu chuyến đi để hệ thống lấy thời tiết theo ngày.

### FR-003: Nhập nơi xuất phát

Người dùng có thể nhập nơi xuất phát, ví dụ TP.HCM, để hỗ trợ gợi ý phương tiện ở các phase sau.

### FR-004: Prompt examples

Web MVP cần có prompt mẫu để giảm rào cản sử dụng.

---

## 2.2 Gemini parse request

### FR-005: Parse prompt thành cấu trúc

Gemini cần parse ra:

- destination.
- days.
- nights.
- budget.
- interests.
- travelStyle.
- specialRequirements nếu có.

### FR-006: Validate output Gemini

Backend phải validate JSON output. Nếu sai schema, hệ thống trả lỗi thân thiện hoặc fallback sang form nhập thủ công.

### FR-007: Không để Gemini tạo địa điểm production

Gemini chỉ được:

- Phân tích nhu cầu.
- Viết mô tả.
- Giải thích lý do.
- Sắp xếp nội dung đầu ra dựa trên dữ liệu backend cung cấp.

Gemini không được tạo địa điểm, tọa độ, khách sạn hoặc phương tiện không tồn tại trong hệ thống.

---

## 2.3 Place data

### FR-008: Lấy địa điểm từ PostgreSQL + PostGIS

Hệ thống lấy địa điểm theo:

- city.
- category.
- tags.
- budget level.
- indoor/outdoor.
- active status.
- location.

### FR-009: Dữ liệu địa điểm cần có tọa độ

Mỗi địa điểm dùng cho itinerary phải có latitude/longitude hợp lệ hoặc geometry hợp lệ.

### FR-010: Admin quản lý địa điểm tối thiểu

Admin có thể thêm/sửa/ẩn địa điểm cho thành phố MVP Nha Trang.

### FR-011: Source và verification

Mỗi địa điểm nên có:

- source.
- sourceUrl nếu có.
- verificationStatus.
- createdAt.
- updatedAt.

---

## 2.4 Tạo itinerary

### FR-012: Tạo itinerary theo ngày

Hệ thống tạo lịch trình theo số ngày từ 1-3 ngày trong MVP.

### FR-013: Giới hạn địa điểm mỗi ngày

Mỗi ngày nên có 3-5 địa điểm để tránh lịch trình quá dày.

### FR-014: Chia theo thời điểm

Lịch trình cần chia hợp lý theo:

- Sáng.
- Trưa.
- Chiều.
- Tối.

### FR-015: Có lý do gợi ý

Mỗi địa điểm nên có reason ngắn gọn, ví dụ:

> "Phù hợp vì miễn phí, gần trung tâm và có cảnh đẹp."

---

## 2.5 Place scoring

### FR-016: Chấm điểm địa điểm

Hệ thống chấm điểm dựa trên:

- Tag trùng sở thích.
- Phù hợp ngân sách.
- Phù hợp thời điểm.
- Chi phí dự kiến.
- Thời lượng tham quan.
- Gần các điểm khác.
- Indoor/outdoor theo thời tiết.

### FR-017: Ranking deterministic

Với cùng một input và cùng dataset, kết quả scoring nên ổn định để dễ test và debug.

---

## 2.6 OSRM route

### FR-018: Tính route thực tế

Hệ thống dùng OSRM để lấy:

- distance.
- duration.
- geometry.

### FR-019: Cache route

Route phải được cache theo:

- from point/place.
- to point/place.
- profile.
- provider.
- version nếu cần.

### FR-020: Fallback khi OSRM lỗi

Nếu OSRM lỗi:

- Vẫn hiển thị itinerary.
- Vẫn hiển thị marker.
- Thông báo không tính được route thực tế.
- Không làm crash toàn bộ flow.

---

## 2.7 Weather

### FR-021: Lấy thời tiết theo ngày

Weather API lấy dự báo theo destination và startDate/days.

### FR-022: Cache weather

Weather response cần được cache để giảm latency và cost.

### FR-023: Điều chỉnh itinerary theo thời tiết

Nếu khả năng mưa cao:

- Giảm ưu tiên điểm ngoài trời.
- Tăng ưu tiên địa điểm trong nhà.
- Hiển thị cảnh báo chuẩn bị áo mưa.

### FR-024: Fallback khi Weather API lỗi

Nếu Weather API lỗi:

- Vẫn tạo lịch trình.
- Hiển thị thông báo chưa có dữ liệu thời tiết.
- Không chặn user hoàn thành flow.

---

## 2.8 Web MVP

### FR-025: Trang nhập yêu cầu

Có form nhập prompt, startDate, origin và nút tạo lịch trình.

### FR-026: Trang kết quả

Hiển thị itinerary theo ngày, map, marker, route, weather và nút lưu.

### FR-027: Trang lịch trình đã lưu

Registered User có thể xem danh sách lịch trình đã lưu.

### FR-028: Xem chi tiết lịch trình đã lưu

User có thể mở lại chi tiết itinerary.

---

## 2.9 Auth và lưu lịch trình

### FR-029: Đăng nhập/đăng ký

Sản phẩm hỗ trợ authentication theo OAuth2 + JWT access token ngắn hạn + refresh token rotation.

### FR-030: Lưu lịch trình

Registered User có thể lưu itinerary.

### FR-031: Bảo vệ dữ liệu user

User chỉ được xem/sửa/xóa lịch trình của chính mình.

---

## 3. Non-functional Requirements

## 3.1 Reliability

- API ngoài phải có timeout.
- External API failure không được làm crash toàn bộ hệ thống.
- Có fallback cho Gemini, OSRM, Weather.
- Có error response thân thiện.

## 3.2 Maintainability

- Backend theo Clean Architecture + Modular Monolith.
- Business logic không nằm trong controller.
- DTO tách khỏi domain/entity/persistence model.
- Module boundary rõ ràng.
- Tài liệu Product/Architecture/Task phải cập nhật khi thay đổi scope.

## 3.3 Observability

- Logging từ đầu.
- Log không chứa secret/token/API key/password.
- Chuẩn bị correlation/request ID.
- Metrics/tracing có thể thêm sau khi production readiness.

## 3.4 Portability

- Backend tách riêng web/mobile.
- REST API versioning `/api/v1`.
- Web dùng ReactJS hoặc Next.js.
- Mobile dùng Flutter ở phase sau.
- Media/static assets dùng Object Storage + CDN.

---

## 4. UX Requirements

## 4.1 Flow phải ngắn

Flow MVP:

1. Nhập prompt.
2. Bấm tạo lịch trình.
3. Xem kết quả.
4. Xem bản đồ.
5. Lưu lịch trình.

## 4.2 Kết quả dễ hiểu

Itinerary cần hiển thị theo card từng ngày, tránh trả về text dài khó đọc.

## 4.3 Có trạng thái loading rõ

Khi tạo itinerary, UI cần hiển thị:

- Đang phân tích yêu cầu.
- Đang chọn địa điểm.
- Đang tính route.
- Đang kiểm tra thời tiết.
- Đang hoàn thiện lịch trình.

## 4.4 Có thông báo lỗi thân thiện

Ví dụ:

- "Hiện chưa đủ dữ liệu địa điểm cho yêu cầu này."
- "Tạm thời không tính được tuyến đường thực tế."
- "Chưa lấy được thời tiết, lịch trình vẫn được tạo bình thường."
- "Yêu cầu quá dài, vui lòng nhập ngắn gọn hơn."

## 4.5 Tối ưu mobile-first cho phần xem kết quả

Dù MVP là web, giao diện nên dễ responsive vì người dùng du lịch thường xem lại trên điện thoại.

---

## 5. Security Requirements

## 5.1 Secret management

- Không hardcode secret.
- Không commit `.env` thật.
- API key phải lấy từ environment variables.
- Không log API key.

## 5.2 Authentication

- Access token ngắn hạn.
- Refresh token rotation.
- Refresh token lưu dạng hash nếu persist.
- Logout/revoke token.
- Detect refresh token reuse nếu có thể.

## 5.3 Authorization

- User chỉ truy cập itinerary của chính mình.
- Admin endpoint phải có role admin.
- Không expose internal ID nhạy cảm nếu không cần.

## 5.4 Input validation

Validate:

- prompt length.
- startDate.
- days từ 1-3 trong MVP.
- latitude/longitude.
- route points.
- city/category/tag.
- object storage URL nếu có.

## 5.5 API protection

- Rate limit endpoint tạo itinerary.
- Rate limit auth endpoint.
- CORS không dùng wildcard trong production.
- Không trả stack trace ra client.
- Không disable test/security để build pass.

---

## 6. Performance Requirements

## 6.1 Response time mục tiêu MVP

Mục tiêu tham khảo:

- Load trang nhập yêu cầu: nhanh, dưới vài giây trong môi trường bình thường.
- Tạo itinerary: chấp nhận chờ lâu hơn vì có AI/route/weather, nhưng cần loading rõ.
- Xem itinerary đã lưu: nhanh hơn tạo mới vì dữ liệu đã lưu/cache.
- Xem map/marker: không block toàn bộ UI nếu route đang tải.

## 6.2 Cache

Cần cache:

- OSRM route.
- Weather forecast.
- Rate limit counters.
- Có thể cache parse result theo prompt normalized nếu phù hợp.

## 6.3 Giới hạn MVP để bảo vệ performance

- Thành phố: Nha Trang.
- Số ngày: 1-3.
- Số điểm/ngày: 3-5.
- Không gọi OSRM khi user kéo map.
- Không gọi external API trong vòng lặp scoring nếu có thể tránh.

---

## 7. Scalability Requirements

## 7.1 Scale theo dữ liệu

Thiết kế dữ liệu cần cho phép thêm:

- Nhiều thành phố.
- Nhiều loại địa điểm.
- Khách sạn.
- Phương tiện.
- Activity.
- Tags đa dạng.
- Source/verification status.

## 7.2 Scale theo client

Backend API tách riêng để phục vụ:

- Web ReactJS/Next.js.
- Flutter app.
- Future partner/internal tools.

## 7.3 Scale theo hệ thống

MVP dùng Modular Monolith. Không dùng microservices sớm.

Tuy nhiên module boundary cần rõ để sau này có thể tách:

- Auth.
- Place.
- Trip/Itinerary.
- Route.
- Weather.
- AI.
- Admin/Data ingestion.

## 7.4 Scale theo vận hành

Chuẩn bị từ đầu:

- Logging.
- Health check.
- Rate limit.
- Cache.
- Object Storage + CDN.
- Queue cho tác vụ async trong tương lai.
- Metrics/tracing ở production readiness.