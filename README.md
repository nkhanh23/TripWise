# TripWise — Personal AI Travel Mobile App

## 1. Tổng quan dự án

**TripWise** là ứng dụng di động cá nhân (**Personal AI Travel Mobile App**) hỗ trợ lập lịch và đồng hành du lịch thông minh, phát triển bằng **React Native + TypeScript + Expo** cho Android và iOS. Người dùng chỉ cần nhập nhu cầu bằng tiếng Việt tự nhiên (ví dụ: *"Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí"*), hệ thống AI sẽ tự động phân tích, gợi ý điểm tham quan, sắp xếp thứ tự di chuyển tối ưu và tạo lịch trình chi tiết theo từng ngày.

Kiến trúc mục tiêu chính thức của TripWise (theo [ADR-017](DECISIONS.md#adr-017-react-native--typescript-as-primary-mobile-client) & [ADR-018](DECISIONS.md#adr-018-simplify-tripwise-into-a-personal-mobile-app-using-supabase)):
- **Client duy nhất:** Mobile App (**React Native + TypeScript + Expo**) cho cả Android và iOS.
- **Backend & Database:** **Supabase** (Managed PostgreSQL + Row Level Security (RLS) + Supabase Auth).
- **Serverless AI Gateway:** **Supabase Edge Functions** (TypeScript) để gọi **Gemini API** bảo mật.
- **Bản đồ & Địa điểm:** **Google Maps SDK** kết hợp **Google Places API** để tra cứu dữ liệu địa điểm, hình ảnh và đánh giá tại runtime.
- **Dẫn đường & Thời tiết:** **OSRM Routing Engine** tính toán lộ trình và **Open-Meteo API** cung cấp dự báo thời tiết trực tiếp trên thiết bị.

---

## 2. Mục tiêu sản phẩm

TripWise được thiết kế tối giản, tinh gọn và tối ưu cho nhu cầu sử dụng cá nhân của chủ sở hữu:

### Trải nghiệm cốt lõi
- Nhập mong muốn du lịch bằng ngôn ngữ tự nhiên tiếng Việt.
- AI hiểu điểm đến, số ngày, ngân sách, phong cách và phân bổ thời gian hợp lý.
- Tra cứu địa điểm thật, hình ảnh và đánh giá mới nhất qua Google Places.
- Tự động tính toán khoảng cách, thời gian di chuyển và vẽ tuyến đường thực tế trên Google Maps.
- Lưu trữ lịch sử chuyến đi và snapshot địa điểm trên Supabase để dễ dàng xem lại khi đang di chuyển (kể cả khi mất mạng).

### Nguyên tắc kỹ thuật
- **Zero Server Maintenance:** Sử dụng BaaS (Supabase) và Serverless Edge Functions, không cần quản lý máy chủ hay Docker riêng biệt.
- **Bảo mật Secret tuyệt đối:** Private API keys (`GEMINI_API_KEY`, Google Server Key) được cô lập trên Supabase Secrets, không bao giờ xuất hiện trong mobile bundle.
- **Chi phí tối ưu:** Tận dụng chính sách Free tier/hạn mức sử dụng miễn phí hàng tháng (Supabase Free Plan, Gemini Developer API, Open-Meteo, và free usage tier theo từng SKU của Google Maps Platform).
- **Snapshot Independence:** Lịch trình lưu trong database có snapshot tối thiểu (`google_place_id`, `place_name`, `latitude`, `longitude`, `place_address`, `place_category`) để đảm bảo lịch sử chuyến đi không bị vỡ.

---

## 3. Tech Stack Chính Thức (Target Architecture)

| Nhóm | Công nghệ | Vai trò / Ghi chú |
|---|---|---|
| **Mobile Client** | React Native, TypeScript, Expo | **Sản phẩm duy nhất** cho Android & iOS (`mobile/`) |
| **Backend & Auth** | Supabase Auth | Quản lý phiên đăng nhập cá nhân (Email/Password) |
| **Database** | Supabase PostgreSQL | Lưu trữ `profiles`, `trips`, `itinerary_days`, `itinerary_items` kèm **RLS** |
| **Serverless Logic** | Supabase Edge Functions | Proxy gọi Gemini API bảo mật |
| **AI Engine** | Google Gemini API | Phân tích prompt tiếng Việt, cấu trúc JSON và viết mô tả |
| **Bản đồ** | Google Maps SDK | Hiển thị map, marker, polyline (Client key restricted) |
| **Địa điểm** | Google Places API | Tìm kiếm, autocomplete, chi tiết địa điểm & ảnh |
| **Định tuyến** | OSRM | Tính toán lộ trình thực tế (Client-side fetch kèm fallback) |
| **Thời tiết** | Open-Meteo API | Dự báo thời tiết theo điểm đến (Client-side fetch) |

### Trạng thái các cấu phần cũ (Legacy Components - Scheduled for Removal)
- **`backend/` (Spring Boot Monolith)**: Trạng thái `Legacy migration source`. Được lưu giữ tạm thời để đối chiếu logic AI prompt và sẽ xóa bỏ theo lộ trình D-series.
- **`web/` (ReactJS + Vite Admin)**: Trạng thái `Legacy / scheduled for removal`. Không còn sử dụng.
- **Redis & PostGIS POI Pipeline**: Đã ngưng phát triển và lên kế hoạch dọn dẹp.

---

## 4. Kiến trúc Tổng quan

```text
TripWise Personal Mobile App (React Native + TypeScript)
│
├── Data & Auth Layer
│    └── @supabase/supabase-js
│          ├── Supabase Auth (Single User Login)
│          └── Supabase Postgres (Profiles, Trips, Itinerary Days/Items với RLS)
│
├── AI Service Layer
│    └── Supabase Edge Function (`/functions/v1/generate-trip`)
│          └── Google Gemini API (GEMINI_API_KEY an toàn trên Supabase Vault)
│
├── Maps & Places Layer
│    ├── React Native Maps (Google Maps SDK Client Key Restricted)
│    └── Google Places API Client
│
└── Public Utility Services
     ├── Open-Meteo Weather API (Direct fetch)
     └── OSRM Routing Engine (Direct fetch kèm client fallback)
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
