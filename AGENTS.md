# AGENTS.md - Quy tắc cho AI Coding Assistant

Tài liệu này là luật làm việc bắt buộc cho mọi AI coding assistant khi tham gia dự án **AI Smart Travel Planner**.
AI không được dựa vào trí nhớ từ lần chạy trước.  
Trước mỗi task mới, AI phải đọc lại tài liệu bắt buộc, roadmap, source code liên quan và test liên quan.

---

## 1. Tài liệu bắt buộc phải đọc trước khi code

Trước khi tạo hoặc sửa bất kỳ file nào, AI phải đọc và hiểu:

1. `README.md`
2. `AGENTS.md`
3. `DECISIONS.md`
4. `TASKS.md`
5. Tài liệu dự án AI Smart Travel Planner được đính kèm trong workspace
6. Task cụ thể mà người dùng giao ở lượt hiện tại
7. `docs/08-project-roadmap/phases.md`
8. Toàn bộ các file `.md` trong thư mục `docs/`
9. Source code liên quan trực tiếp đến task hiện tại
10. Test code liên quan trực tiếp đến task hiện tại

Nếu chưa đọc đủ ngữ cảnh, không được tự suy đoán để code.

---

## 2. Stack không được tự ý thay đổi

Stack đã chốt:

- Backend: Java 21 + Spring Boot 3.2.5
- Build tool: Maven + Maven Wrapper
- Architecture: Clean Architecture + Modular Monolith
- Database: PostgreSQL + PostGIS
- Cache: Redis
- API: REST versioning `/api/v1`
- Auth: Email/password + OAuth2 + JWT access token ngắn hạn + refresh token rotation
- AI: Gemini API
- Routing: OSRM
- Map: OpenStreetMap
- Web: ReactJS hoặc Next.js, tách riêng backend
- Mobile: Flutter
- Media/static assets: Object Storage + CDN
- Monitoring: logging từ đầu, metrics/tracing chuẩn bị cho tương lai

AI không được tự ý thay đổi sang Node.js, NestJS, MongoDB, Google Maps-only, Firebase-only, microservices hoặc stack khác nếu chưa có yêu cầu rõ ràng.

---

## 3. Kiến trúc không được tự ý thay đổi

Bắt buộc giữ hướng:

- Clean Architecture
- Modular Monolith
- Tách domain, application, infrastructure, presentation
- Module rõ ràng theo nghiệp vụ
- Không tạo microservices trong MVP
- Không đưa business logic vào controller
- Không để persistence model quyết định API response
- Không để external API adapter lẫn vào domain logic

Microservices chỉ được xem xét sau MVP khi có bằng chứng về nhu cầu scale, ownership hoặc deployment độc lập.

---

## 4. Phạm vi làm việc mỗi lần

AI chỉ làm **một task nhỏ mỗi lần**.

Không được:

- Code lan sang task khác.
- Tạo backend skeleton nếu task chỉ yêu cầu tài liệu.
- Tạo frontend nếu task chỉ yêu cầu backend.
- Tạo mobile nếu task chỉ yêu cầu web.
- Thêm tính năng ngoài acceptance criteria.
- Thêm dependency không cần thiết.
- Tự thêm module lớn ngoài kế hoạch.

Nếu phát hiện task quá lớn, phải chia nhỏ và đề xuất task tiếp theo.

---

## 5. Quy tắc API và DTO

- Tất cả REST API phải dùng prefix `/api/v1`.
- Không expose entity/domain model/JPA entity trực tiếp ra API.
- Request/response phải dùng DTO riêng.
- Không trả password hash, refresh token, OAuth token, internal secret hoặc stack trace ra client.
- Controller chỉ xử lý HTTP concern: request, validation, gọi use case, response mapping.
- Business logic nằm trong application/domain layer.
- Validation phải rõ ràng, lỗi trả về có format thống nhất.

---

## 6. Quy tắc database

- Dùng PostgreSQL + PostGIS.
- Schema thay đổi phải thông qua Flyway migration.
- Không tự ý dùng MongoDB hoặc database phụ khác. AI tuyệt đối không được đọc các cấu trúc mẫu NoSQL/MongoDB trong file tài liệu dự án gốc. Dự án chốt 100% sử dụng PostgreSQL + PostGIS.
- Dữ liệu vị trí phải dùng kiểu phù hợp của PostGIS, ví dụ `geometry(Point, 4326)` hoặc `geography(Point, 4326)` tùy thiết kế được duyệt.
- Tọa độ phải validate latitude/longitude hợp lệ.
- Các bảng cache như route/weather phải có TTL logic hoặc chính sách hết hạn rõ ràng.

---

## 7. Quy tắc bảo mật

Không được:

- Hardcode secret.
- Commit `.env` thật.
- Log password/token/API key/refresh token/OAuth authorization code.
- Disable security để test cho dễ.
- Disable test để build pass.
- Bỏ qua validate input.
- Dùng wildcard CORS trong production.
- Trả stack trace cho client.
- Lưu refresh token plaintext.

Bắt buộc:

- Access token ngắn hạn.
- Refresh token rotation.
- Refresh token lưu dạng hash nếu persist.
- Password dùng thuật toán hash an toàn như bcrypt/Argon2 qua Spring Security.
- API gọi Gemini/OSRM/Weather phải có timeout.
- Rate limit các endpoint tốn cost như trip generation.

---

## 8. Quy tắc AI/Gemini

- Gemini dùng để parse yêu cầu, viết mô tả lịch trình, giải thích lý do gợi ý.
- Gemini không được là nguồn dữ liệu địa điểm production.
- Không để Gemini tự bịa địa điểm, tọa độ, khách sạn hoặc phương tiện.
- Địa điểm phải lấy từ PostgreSQL + PostGIS hoặc nguồn đã sync/kiểm duyệt.
- Output Gemini phải validate bằng schema.
- Khi Gemini lỗi hoặc trả sai schema, phải có fallback hoặc thông báo lỗi rõ ràng.

---

## 9. Quy tắc OSRM/OpenStreetMap

- OSRM chỉ dùng cho route, distance, duration, geometry.
- OSRM không dùng để lấy khách sạn hoặc POI.
- OpenStreetMap có thể dùng làm bản đồ nền và nguồn POI mở nếu tuân thủ policy sử dụng.
- Route phải cache theo cặp điểm/profile để giảm cost và latency.
- Không gọi OSRM liên tục theo thao tác kéo bản đồ.

---

## 10. Quy tắc test

AI không được disable test để build pass.

Khi sửa logic, cần đề xuất hoặc tạo test phù hợp theo scope:

- Unit test cho use case/domain service.
- Integration test cho repository/Flyway/API adapter nếu cần.
- Controller test cho validation và response mapping.
- Security test cho endpoint yêu cầu auth.
- Test fallback khi external API lỗi.

Nếu task hiện tại chưa tạo test được, phải nêu rõ lý do và gợi ý test ở phần báo cáo.

---

## 11. Quy tắc logging/monitoring

- Log phải hữu ích cho debug nhưng không chứa secret.
- Log external API error phải mask key/header/token.
- Nên có correlation/request ID khi backend foundation được tạo.
- Metrics/tracing chưa bắt buộc trong MVP đầu tiên nhưng thiết kế không được cản trở việc thêm sau này.

---

## 12. Format báo cáo sau mỗi task

Sau mỗi task, AI phải báo theo đúng format:

### Summary

Tóm tắt ngắn gọn đã làm gì.

### Phase completed

Phase nào trong roadmap đã được thực hiện.

### Roadmap context

Ghi rõ:

- Phase trước là gì
- Phase hiện tại là gì
- Phase sau là gì

### Files changed

Liệt kê file đã tạo/sửa/xóa.

### Database migration created

Nếu có migration mới, ghi rõ tên file migration.  
Nếu không có, ghi: Không có.

### Endpoints created/changed

Nếu có API mới hoặc API bị thay đổi, liệt kê endpoint.  
Nếu không có, ghi: Không có.

### How to test

Cách kiểm tra thủ công hoặc tự động.

### Scalability check

AI phải ghi rõ implementation hiện tại có an toàn cho dữ liệu lớn / traffic cao không, bao gồm nếu liên quan:

- Có pagination/filter/sort chưa?
- Có nguy cơ query toàn bảng không?
- Có nguy cơ N+1 query không?
- Có cần index mới không?
- Có cần cache/rate limit/idempotency không?
- Payload response có quá lớn không?
- External API call có timeout/fallback/cost control chưa?
- Bottleneck còn lại là gì?

### Test result

Ghi rõ test đã chạy và kết quả.

Ví dụ:

```cmd
cd backend
.\mvnw.cmd test
```

---

## 13. Quy tắc roadmap phase

Trước mỗi task, AI phải đọc `docs/08-project-roadmap/phases.md`.

AI phải:

- Xác định phase hiện tại được yêu cầu
- Xác định phase trước và phase sau
- Chỉ thực hiện đúng phase được yêu cầu
- Không tự ý làm phase trước
- Không tự ý làm phase sau
- Không gộp nhiều phase trong một lần
- Nếu phase hiện tại phụ thuộc vào phase trước nhưng code chưa có, phải báo lại trước khi sửa lớn

AI chỉ được tick `[x]` trong roadmap khi người dùng yêu cầu hoặc khi task yêu cầu cập nhật roadmap.

---

## 14. Quy tắc reread context

AI không được dựa vào trí nhớ từ lần chạy trước.

Trước khi sửa code, AI phải đọc lại:

- `AGENTS.md`
- `README.md`
- `DECISIONS.md` nếu có
- `TASKS.md` nếu có
- `docs/08-project-roadmap/phases.md`
- toàn bộ file `.md` trong `docs/`
- `backend/README.md`
- `backend/pom.xml`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-local.yml`
- `backend/src/main/resources/db/migration/`
- source code liên quan trực tiếp đến task hiện tại
- test code liên quan trực tiếp đến task hiện tại

Nếu chưa đọc đủ ngữ cảnh, AI không được tự suy đoán để code.

---

## 15. Quy tắc Maven và Git hygiene

Dự án backend dùng Maven + Maven Wrapper.

Được commit:

- `backend/pom.xml`
- `backend/mvnw`
- `backend/mvnw.cmd`
- `backend/.mvn/wrapper/maven-wrapper.properties`
- `backend/.mvn/wrapper/maven-wrapper.jar`

Không được commit:

- `target/`
- `build/`
- `bin/`
- `.gradle/`
- `.env`
- `.env.*`
- file chứa local path hoặc secret thật
- `gradle.properties` nếu chứa đường dẫn máy local

Sau mỗi task backend, AI phải đảm bảo chạy được:

Windows:

```cmd
cd backend
.\mvnw.cmd test
```

Linux/macOS:

```bash
cd backend
./mvnw test
```

## 16. Quy tắc thiết kế cho hệ thống nhiều người dùng / hàng triệu người dùng

AI phải luôn thiết kế và code theo giả định dự án có thể mở rộng lên hàng triệu người dùng.

Điều này KHÔNG có nghĩa là được tự ý thêm microservices, Kafka, Kubernetes, Elasticsearch, sharding hoặc kiến trúc phức tạp ngoài scope.  
Điều này có nghĩa là mọi implementation phải tránh tạo ra nút thắt cổ chai khiến hệ thống khó scale trong tương lai.

Bắt buộc tuân thủ:

- Backend phải stateless, không lưu session hoặc trạng thái request trong memory của server.
- Không query toàn bộ bảng nếu dữ liệu có thể lớn.
- List/search API phải có pagination/filter/sort khi dữ liệu có thể tăng.
- Tránh N+1 query; dùng fetch strategy, projection DTO, batch query hoặc query tối ưu khi cần.
- Khi thêm truy vấn thường xuyên dùng WHERE, JOIN, ORDER BY, unique lookup hoặc foreign key lookup, phải cân nhắc index phù hợp.
- Truy vấn không gian phải dùng đúng PostGIS index, ví dụ GIST.
- Không đưa logic nặng vào controller.
- Business logic phải nằm trong application/domain layer.
- Transaction boundary phải rõ ràng, không mở transaction quá rộng.
- Không trả payload quá lớn cho frontend; dùng DTO gọn, pagination, projection, marker DTO riêng cho bản đồ nếu cần.
- Không serve ảnh/file nặng trực tiếp từ Spring Boot; media phải đi theo hướng Object Storage + CDN khi đến đúng phase.
- External API như Gemini, OSRM, Weather, Google Places phải có timeout, retry có giới hạn, fallback/circuit breaker khi phù hợp.
- Endpoint tốn chi phí như trip generation/Gemini/route/weather phải cân nhắc rate limit, cache và idempotency khi đến đúng phase.
- Dữ liệu gọi lặp lại nhiều lần nên cân nhắc Redis/PostgreSQL cache theo đúng scope phase.
- Cache key phải có namespace dự án, ví dụ `tripwise:...`.
- Cache phải có TTL hoặc chính sách invalidation rõ ràng.
- Không cache dữ liệu nhạy cảm dạng plaintext như password, refresh token, access token hoặc API key.
- Tác vụ dài như import dữ liệu địa điểm, enrich dữ liệu, xử lý ảnh, gửi email, tạo báo cáo, refresh cache phải được thiết kế để có thể chuyển sang async/queue sau này.
- MVP ưu tiên Spring `@Async`, scheduler hoặc background job đơn giản nếu cần; không tự ý thêm RabbitMQ/Kafka nếu chưa được yêu cầu.
- Không thiết kế làm cản trở metrics, tracing, correlation ID, structured logging sau này.
- Luôn cân nhắc connection pool, query cost, cache hit rate, response size, external API cost và bottleneck khi code.
- Nếu giải pháp scale tốt cần thay đổi kiến trúc lớn, AI phải báo trade-off và hỏi trước khi triển khai.
- Không mặc định dùng microservices để scale. Dự án vẫn ưu tiên Modular Monolith cho MVP/trung hạn.

```

```
