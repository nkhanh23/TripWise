# AI Smart Travel Planner

## 1. Tổng quan dự án

**AI Smart Travel Planner** là hệ thống lập lịch du lịch thông minh, cho phép người dùng nhập nhu cầu du lịch bằng tiếng Việt tự nhiên, ví dụ: "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí".

Hệ thống sử dụng **Gemini API** để phân tích yêu cầu, sau đó dùng dữ liệu địa điểm thật đã chuẩn hóa trong **PostgreSQL + PostGIS** để gợi ý địa điểm phù hợp. Tuyến đường thực tế giữa các điểm được tính bằng **OSRM**, bản đồ hiển thị bằng **OpenStreetMap**, web client production dùng **ReactJS + Vite**, mobile client dùng **Flutter**.

Dự án được thiết kế theo hướng sản phẩm thật: có authentication, dữ liệu thật, cache, kiểm soát chi phí API ngoài, nguyên tắc bảo mật secret, khả năng mở rộng dần và quy trình phát triển theo SDLC + Agile Scrum.

---

## 2. Mục tiêu sản phẩm thật

Mục tiêu không chỉ là demo AI, mà là xây dựng nền tảng có thể phát triển thành sản phẩm du lịch thực tế.

### Mục tiêu người dùng

- Người dùng nhập yêu cầu du lịch bằng ngôn ngữ tự nhiên.
- Hệ thống hiểu điểm đến, số ngày, ngân sách, sở thích, phong cách du lịch.
- Hệ thống gợi ý địa điểm thật có tọa độ rõ ràng.
- Hệ thống tạo lịch trình theo từng ngày, từng buổi.
- Hệ thống tính tuyến đường thực tế, khoảng cách và thời gian di chuyển.
- Hệ thống hiển thị marker, route và chi tiết lịch trình trên bản đồ.
- Người dùng có thể lưu lịch trình để xem lại.

### Mục tiêu kỹ thuật

- Backend tách riêng frontend/mobile.
- Business logic không phụ thuộc controller, database framework hoặc API ngoài.
- Dữ liệu không gian được lưu và truy vấn đúng bằng PostgreSQL + PostGIS.
- AI không được tự bịa địa điểm trong production; AI chỉ phân tích yêu cầu, giải thích và viết mô tả từ dữ liệu đã xác minh.
- API ngoài như Gemini, OSRM, Weather, Google Places phải có timeout, retry có giới hạn, fallback và cache.
- Secret không được hardcode trong source code.
- Thiết kế ban đầu phải đủ sạch để có thể mở rộng sang nhiều thành phố, nhiều client và nhiều nguồn dữ liệu.

---

## 3. Tech stack đã chốt

| Nhóm | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 3.x |
| Architecture | Clean Architecture + Modular Monolith |
| Database | PostgreSQL + PostGIS |
| Migration | Flyway |
| Cache | Redis |
| API | REST API versioning theo `/api/v1` |
| Auth | OAuth2 + JWT access token ngắn hạn + refresh token rotation |
| AI | Gemini API |
| Routing | OSRM |
| Map | OpenStreetMap, Leaflet ở web client |
| Web | ReactJS + Vite, tách riêng backend |
| Mobile | Flutter |
| Media/static assets | Object Storage + CDN |
| Monitoring | Logging ngay từ đầu; metrics/tracing chuẩn bị cho production |
| DevOps | Docker/Docker Compose ở local, CI/CD sau khi có skeleton |
| Testing | Unit test, integration test, API contract test sau khi backend foundation có code |

### Frontend web decision

- Codebase web production hiện tại dùng `ReactJS + Vite + TypeScript` trong thư mục `web/`.
- Source UI gốc được lấy từ `web-archive-vite-ui/` và đã được migrate vào `web/`.
- `web-archive-vite-ui/` tiếp tục được giữ làm snapshot/archive tham chiếu cho giao diện đã chốt.

---

## 4. Kiến trúc tổng quan

Dự án đi theo mô hình **Modular Monolith** để giữ tốc độ phát triển nhanh trong MVP, nhưng vẫn tách module rõ ràng để sau này có thể tách service nếu thật sự cần.

```text
clients
├── web: ReactJS + Vite
└── mobile: Flutter

backend: Java 21 + Spring Boot 3.x
├── auth module
├── user module
├── place module
├── trip module
├── itinerary module
├── ai module
├── route module
├── weather module
├── media module
└── admin/data-ingestion module

infrastructure
├── PostgreSQL + PostGIS
├── Redis
├── Object Storage
├── CDN
├── Gemini API
├── OSRM
├── Open-Meteo hoặc weather provider khác
├── Google Places API nếu cần enrich dữ liệu thật
└── OpenStreetMap/Overpass/Nominatim nếu được phép theo policy sử dụng
```

### Clean Architecture trong backend

Mỗi module backend nên đi theo lớp trách nhiệm sau:

```text
module
├── domain
│   ├── entity/domain model
│   ├── value object
│   ├── domain service
│   └── domain exception
├── application
│   ├── use case
│   ├── command/query
│   ├── port in
│   └── port out
├── infrastructure
│   ├── persistence adapter
│   ├── external API adapter
│   ├── cache adapter
│   └── object storage adapter
└── presentation
    ├── REST controller
    ├── request DTO
    ├── response DTO
    └── API mapper
```

### Nguyên tắc quan trọng

- Controller chỉ nhận request, validate cơ bản, gọi use case và trả response.
- Business logic nằm trong application/domain, không nằm trong controller.
- Entity nội bộ/domain model không expose trực tiếp ra API.
- DTO request/response phải tách khỏi entity/database model.
- Module giao tiếp với nhau qua use case/port rõ ràng, không truy cập database table của nhau tùy tiện.
- Infrastructure adapter là nơi duy nhất gọi Gemini, OSRM, Weather, Object Storage, Redis hoặc database framework.

---

## 5. Phạm vi MVP

MVP nên tập trung vào một thành phố để kiểm soát độ phức tạp.

### MVP đề xuất

- Thành phố demo: **Nha Trang**.
- Thời lượng chuyến đi: **1 đến 3 ngày**.
- Người dùng nhập prompt tiếng Việt.
- Gemini parse prompt thành JSON có cấu trúc.
- Hệ thống lấy địa điểm từ PostgreSQL + PostGIS, không để Gemini tự bịa địa điểm.
- Gợi ý địa điểm theo sở thích, ngân sách, tag, thời lượng tham quan, indoor/outdoor.
- Tạo lịch trình theo ngày.
- Gọi OSRM để lấy distance, duration, geometry.
- Cache route bằng Redis và/hoặc PostgreSQL route cache.
- Tích hợp thời tiết qua Open-Meteo hoặc provider đã chọn.
- Điều chỉnh lịch trình cơ bản theo thời tiết.
- Web hiển thị form nhập prompt, kết quả lịch trình, bản đồ, marker, polyline.
- Auth cơ bản với OAuth2 login nếu có provider, JWT access token ngắn hạn và refresh token rotation.
- Lưu lịch trình của user.
- Admin/import dữ liệu địa điểm thật ở mức tối thiểu.

---

## 6. Non-MVP

Không đưa các phần sau vào bản đầu tiên:

- Booking khách sạn thật.
- Thanh toán.
- Vé xe, vé tàu, vé máy bay thật.
- Marketplace du lịch.
- Chatbot chỉnh sửa lịch trình phức tạp.
- Tối ưu route nâng cao kiểu logistics.
- Tự động crawl dữ liệu từ nhiều nguồn không kiểm soát.
- Microservices.
- Event-driven architecture phức tạp.
- Multi-region deployment.
- Recommendation bằng machine learning tự train.
- Fine-tuning model AI.
- Mobile đầy đủ mọi tính năng như web admin.

---

## 7. Cách phát triển theo SDLC + Agile Scrum

### SDLC áp dụng cho dự án

1. **Requirement analysis**: xác định user story, business rule, nguồn dữ liệu thật, giới hạn MVP.
2. **Architecture & design**: chốt module, database, API, auth, integration, security, error handling.
3. **Implementation**: làm từng task nhỏ, có test, không code lan man ngoài scope.
4. **Testing**: unit test use case, integration test repository/API, test lỗi API ngoài, test security flow.
5. **Deployment preparation**: Docker, env, logging, migration, health check, rate limit.
6. **Operation & improvement**: theo dõi log, metric, lỗi API ngoài, cost, latency, cache hit rate.

### Scrum áp dụng

- Product Backlog chia theo phase trong `TASKS.md`.
- Mỗi Sprint nên kéo dài 1 đến 2 tuần.
- Mỗi task phải có acceptance criteria rõ ràng.
- Không nhận task quá lớn kiểu "làm toàn bộ backend".
- Definition of Done tối thiểu:
  - Đúng yêu cầu task.
  - Có test phù hợp.
  - Không hardcode secret.
  - Không expose entity trực tiếp ra API.
  - Không disable test để build pass.
  - Có xử lý lỗi cơ bản.
  - Có cập nhật tài liệu nếu thay đổi quyết định kỹ thuật.

---

## 8. Cách AI coding assistant phải làm việc với dự án

AI coding assistant phải tuân thủ `AGENTS.md` trước khi tạo hoặc sửa code.

Nguyên tắc làm việc:

- Luôn đọc `README.md`, `AGENTS.md`, `DECISIONS.md`, `TASKS.md` và tài liệu dự án trước khi code.
- Chỉ làm đúng task được giao.
- Không tự ý đổi stack.
- Không tự ý đổi kiến trúc.
- Không tự ý thêm microservices.
- Không tạo backend/frontend/mobile skeleton nếu task chỉ yêu cầu tài liệu.
- Mỗi lần chỉ làm một task nhỏ, có thể review được.
- Sau mỗi task phải báo summary, files changed, how to test, risks, next suggested task.

---

## 9. Nguyên tắc bảo mật secret

- Không commit `.env` thật.
- Chỉ commit `.env.example` với giá trị ví dụ an toàn.
- Không hardcode API key, database password, JWT secret, object storage secret.
- Không log password, access token, refresh token, API key, OAuth authorization code.
- JWT access token phải ngắn hạn.
- Refresh token phải rotation và có khả năng revoke.
- Refresh token lưu database nên được hash, không lưu plaintext.
- Secret production phải lấy từ secret manager hoặc biến môi trường của hạ tầng deploy.
- Log lỗi external API phải mask header, query chứa key và payload nhạy cảm.
- CORS phải giới hạn domain cụ thể, không dùng wildcard trong production.

---

## 10. Nguyên tắc scale/cost từ đầu

### Scale

- MVP dùng Modular Monolith để giảm độ phức tạp vận hành.
- Tách module rõ để sau này có thể tách service khi có lý do thật: tải cao, team ownership khác nhau, deployment độc lập.
- Dùng PostgreSQL + PostGIS làm nguồn dữ liệu chính cho place, hotel, itinerary, route cache.
- Dùng Redis cho cache nóng, rate limit, session/token metadata nếu cần.
- External API phải có timeout, circuit breaker/fallback ở mức phù hợp.
- API response lớn như route geometry cần cân nhắc nén, cache và phân trang khi cần.

### Cost

- Không gọi Gemini cho việc có thể xử lý bằng rule/backend logic.
- Không để Gemini tự tạo danh sách địa điểm; dùng dữ liệu đã lưu để giảm sai và giảm cost.
- Cache route OSRM theo cặp điểm/profile.
- Cache weather theo city/date/provider.
- Cache place suggestion theo city/interests/budget nếu dữ liệu ít thay đổi.
- Media/static assets đưa lên Object Storage + CDN, không phục vụ file nặng trực tiếp từ backend.
- Giới hạn số địa điểm mỗi ngày trong MVP, đề xuất 3 đến 5 điểm/ngày.
- Có rate limiting theo IP/user/token để tránh lạm dụng Gemini, OSRM và Weather API.

---

## 11. Tài liệu nền tảng

- `README.md`: tổng quan, stack, scope, nguyên tắc phát triển.
- `AGENTS.md`: luật cho AI coding assistant.
- `DECISIONS.md`: Architecture Decision Records.
- `TASKS.md`: master task list theo phase.
- `.env.example`: danh sách biến môi trường chuẩn, không chứa secret thật.
- `backend/README.md`: hướng dẫn chi tiết cài đặt và khởi chạy Backend local.
