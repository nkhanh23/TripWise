# TripWise Project Phases

> Tài liệu kế hoạch chi tiết từ trạng thái hiện tại đến production-ready.
> Mỗi phase nhỏ, rõ ràng, dễ review, dễ thực hiện bởi AI assistant hoặc developer.
> Tạo ngày: 2026-07-01

---

## 0. Current Project State

### Đã hoàn thành

- ✅ Backend Spring Boot 3.2.5 skeleton hoạt động
- ✅ Maven Wrapper đã có (Mavenw, Mavenw.bat, Maven-wrapper.jar/properties)
- ✅ JDK 21 (Microsoft JDK 21.0.11.10-hotspot)
- ✅ Docker Compose chạy được: PostgreSQL+PostGIS (port 5433), Redis (6379), MinIO (9000/9001), pgAdmin (5050)
- ✅ PostgreSQL kết nối thành công qua port 5433
- ✅ Flyway migration V1 đã chạy thành công (tạo bảng users, refresh_tokens, place_categories, places, trips, itinerary_days, itinerary_items, route_cache, weather_cache, hotels)
- ✅ Health endpoint `/api/v1/health` trả `{"success":true,"message":"OK","data":{"status":"UP"}}`
- ✅ `./mvnw clean test` BUILD SUCCESSFUL
- ✅ `./mvnw spring-boot:run -Dspring-boot.run.profiles=local` start OK trên port 8080
- ✅ Clean Architecture module placeholders: auth, user, place, trip, itinerary, route, weather, hotel, transport, media, ai
- ✅ Common infrastructure: ApiResponse, ErrorResponse, BusinessException, GlobalExceptionHandler, RequestIdFilter, SecurityConfig
- ✅ Tài liệu docs/ đầy đủ 7 nhóm (product, sdlc, agile-scrum, architecture, engineering, devops, ai-working)
- ✅ .gitignore cấu hình hợp lý
- ✅ Lombok 1.18.36 với force resolution

### Chưa hoàn thành

- ❌ Chưa có Auth thật (register/login/JWT/refresh token)
- ❌ Chưa có User module thật
- ❌ Chưa có Place module thật
- ❌ Chưa có AI/Gemini integration
- ❌ Chưa có Trip generation
- ❌ Chưa có Itinerary generation
- ❌ Chưa có OSRM routing
- ❌ Chưa có Weather integration
- ❌ Chưa có Hotel/Transport suggestion
- ❌ Chưa có Frontend web
- ❌ Chưa có Mobile Flutter
- ❌ Chưa có Dockerfile backend
- ❌ Chưa có CI/CD pipeline
- ❌ Chưa deploy production
- ❌ Chưa có monitoring/alerting

### Known Warnings cần xử lý

- ⚠️ Flyway cảnh báo PostgreSQL 16 mới hơn version Flyway hỗ trợ test
- ⚠️ Hibernate warning: PostgreSQLDialect không cần khai báo explicit
- ⚠️ `spring.jpa.open-in-view` đang enabled → cần tắt
- ⚠️ Spring Security tạo generated password → sẽ hết khi Auth thật hoàn thành
- ⚠️ MinIO container có thể unhealthy → kiểm tra ở phase media

---

## 1. How to Read This Roadmap

### Quy tắc thực hiện

1. Mỗi phase có checkbox `[ ]` — chỉ tick `[x]` khi hoàn thành đầy đủ
2. **Chỉ làm từng phase nhỏ một** — không gộp nhiều phase
3. Sau mỗi phase phải:
   - Chạy test: `./mvnw clean test` (backend) hoặc test tương ứng
   - Kiểm tra kết quả theo mục "How to verify"
   - Commit Git với message rõ ràng theo conventional commits
4. **Không làm phase sau nếu phase trước chưa PASS**
5. **Không tự ý mở rộng scope** ngoài mục "What will be done"
6. Nếu gặp vấn đề ngoài scope, ghi lại và đề xuất phase bổ sung
7. AI assistant phải đọc AGENTS.md trước khi bắt đầu bất kỳ phase nào
8. Mỗi phase kết thúc phải báo cáo theo format trong AGENTS.md

### Ký hiệu

- `[ ]` — Chưa bắt đầu
- `[/]` — Đang thực hiện
- `[x]` — Hoàn thành

---

## 2. Phase Checklist Overview

### A. Foundation / Repository / Local Dev

- [x] Phase 1.1 - Git hygiene và repository cleanup
- [ ] Phase 1.2 - Backend configuration cleanup (warnings)
- [ ] Phase 1.3 - Profile configuration (local/dev/prod)
- [ ] Phase 1.4 - Actuator và health endpoint mở rộng
- [ ] Phase 1.5 - Logging format và correlation ID cải thiện
- [ ] Phase 1.6 - Local development documentation cập nhật

### B. Backend Core Foundation

- [ ] Phase 2.1 - Base entity và audit columns
- [ ] Phase 2.2 - Exception hierarchy mở rộng
- [ ] Phase 2.3 - Validation strategy và custom validators
- [ ] Phase 2.4 - Pagination và sorting support
- [ ] Phase 2.5 - MapStruct setup và base mapper
- [ ] Phase 2.6 - Testcontainers setup cho integration test

### C. Auth Module

- [ ] Phase 3.1 - User entity và JPA repository
- [ ] Phase 3.2 - PasswordEncoder config (bcrypt)
- [ ] Phase 3.3 - Register endpoint
- [x] Phase 3.4 - JWT token generation và validation
- [x] Phase 3.5 - Login endpoint
- [x] Phase 3.6 - JWT authentication filter
- [x] Phase 3.7 - Get current user endpoint (/me)
- [x] Phase 3.8 - Refresh token rotation
- [x] Phase 3.9 - Logout endpoint
- [x] Phase 3.10 - Auth integration tests
- [x] Phase 3.11 - Rate limiting cho auth endpoints

### D. Place Module / PostGIS

- [ ] Phase 4.1 - PlaceCategory entity, repository, và seed data migration
- [ ] Phase 4.2 - Place entity và JPA repository với PostGIS
- [ ] Phase 4.3 - Place seed data (Nha Trang verified places)
- [ ] Phase 4.4 - Search/filter places API
- [ ] Phase 4.5 - Nearby places API (PostGIS spatial query)
- [ ] Phase 4.6 - Place detail API
- [ ] Phase 4.7 - Place module tests

### E. AI / Gemini Integration

- [ ] Phase 5.1 - Gemini API client configuration
- [ ] Phase 5.2 - Prompt template cho trip parsing
- [ ] Phase 5.3 - Trip requirement parsing use case
- [ ] Phase 5.4 - AI output validation và fallback
- [ ] Phase 5.5 - AI module tests (mocked Gemini)

### F. Trip Management

- [ ] Phase 6.1 - Trip entity và repository
- [ ] Phase 6.2 - Create trip (save parsed request)
- [ ] Phase 6.3 - List user trips API
- [ ] Phase 6.4 - Trip detail API
- [ ] Phase 6.5 - Delete trip API
- [x] Phase 6.6 - Trip ownership authorization
- [x] Phase 6.7 - Trip module tests

### G. Itinerary Generation

- [x] Phase 7.1 - Scoring model (interest, budget, distance)
- [x] Phase 7.2 - Candidate place selection use case
- [x] Phase 7.3 - Day/time-slot grouping algorithm
- [ ] Phase 7.4 - Itinerary persistence (itinerary_days, itinerary_items)
- [ ] Phase 7.5 - Generate itinerary endpoint
- [ ] Phase 7.6 - Itinerary detail API
- [ ] Phase 7.7 - AI description generation cho itinerary items
- [ ] Phase 7.8 - Itinerary module tests

### H. OSRM Routing

- [x] Phase 8.1 - OSRM HTTP client
- [x] Phase 8.2 - Route cache repository
- [ ] Phase 8.3 - Route calculation use case
- [x] Phase 8.4 - Integrate routing vào itinerary generation
- [x] Phase 8.5 - Route API endpoint
- [ ] Phase 8.6 - Route module tests (mocked OSRM)

### I. Weather Integration

- [ ] Phase 9.1 - Weather API client (Open-Meteo)
- [ ] Phase 9.2 - Weather cache repository
- [ ] Phase 9.3 - Weather forecast use case
- [ ] Phase 9.4 - Weather adjustment cho itinerary
- [x] Phase 9.5 - Weather API endpoint
- [ ] Phase 9.6 - Weather module tests

### J. Hotel / Transport Suggestions

- [x] Phase 10.1 - Hotel entity và repository
- [x] Phase 10.2 - Hotel seed data
- [x] Phase 10.3 - Hotel suggestion API (by area/budget)
- [x] Phase 10.4 - Transport suggestion logic (MVP)
- [x] Phase 10.5 - Hotel/Transport tests

### K. Backend Integration và Polish

- [x] Phase 11.1 - End-to-end trip generation flow test
- [x] Phase 11.2 - API documentation (Springdoc/OpenAPI)
- [x] Phase 11.3 - Backend performance review
- [x] Phase 11.4 - Security review backend

### L. Frontend Web

- [ ] Phase 12.1 - React/Next.js project setup
- [ ] Phase 12.2 - Design system và UI framework
- [ ] Phase 12.3 - API client và auth interceptor
- [ ] Phase 12.4 - Auth pages (Register/Login)
- [ ] Phase 12.5 - Trip request form
- [ ] Phase 12.6 - Itinerary result page
- [ ] Phase 12.7 - Leaflet map integration
- [ ] Phase 12.8 - Route polyline trên map
- [ ] Phase 12.9 - Saved trips page
- [ ] Phase 12.10 - Loading/error states và UX polish
- [ ] Phase 12.11 - Responsive UI
- [ ] Phase 12.12 - Frontend tests

### M. Mobile Flutter

- [ ] Phase 13.1 - Flutter project setup
- [ ] Phase 13.2 - API client và auth flow
- [ ] Phase 13.3 - Trip generation screen
- [ ] Phase 13.4 - Itinerary display screen
- [ ] Phase 13.5 - Map screen (Flutter map)
- [ ] Phase 13.6 - Saved trips screen
- [ ] Phase 13.7 - State management (Riverpod/Bloc)
- [ ] Phase 13.8 - Mobile tests

### N. DevOps / CI/CD

- [ ] Phase 14.1 - Dockerfile backend (multi-stage)
- [ ] Phase 14.2 - Docker Compose production-like
- [ ] Phase 14.3 - GitHub Actions: build và test
- [ ] Phase 14.4 - GitHub Actions: Docker image build
- [ ] Phase 14.5 - Environment secrets strategy
- [ ] Phase 14.6 - Database migration strategy production

### O. Production Deploy

- [ ] Phase 15.1 - Choose hosting và provision server
- [ ] Phase 15.2 - Setup reverse proxy (Nginx) và SSL
- [ ] Phase 15.3 - Deploy backend
- [ ] Phase 15.4 - Deploy frontend web
- [ ] Phase 15.5 - Production database setup và migration
- [ ] Phase 15.6 - Production smoke test
- [ ] Phase 15.7 - Backup schedule

### P. Production Readiness / Security

- [ ] Phase 16.1 - CORS production configuration
- [ ] Phase 16.2 - Actuator protection production
- [ ] Phase 16.3 - JWT secret management production
- [ ] Phase 16.4 - Rate limiting production
- [ ] Phase 16.5 - Dependency vulnerability scan
- [ ] Phase 16.6 - Logging sensitive data audit
- [ ] Phase 16.7 - Load test cơ bản
- [ ] Phase 16.8 - Disaster recovery checklist

### Q. Final Documentation

- [ ] Phase 17.1 - API documentation hoàn chỉnh
- [ ] Phase 17.2 - Architecture diagram cập nhật
- [ ] Phase 17.3 - Deployment guide cập nhật
- [ ] Phase 17.4 - User guide
- [ ] Phase 17.5 - Demo script
- [ ] Phase 17.6 - Final project checklist

---

## 3. Detailed Phase Descriptions

---

### A. Foundation / Repository / Local Dev

---

## [ ] Phase 1.1 - Git hygiene và repository cleanup

### Goal

Dọn dẹp repository, đảm bảo không có file rác, build artifacts, hoặc file local-specific trong Git tracking.

### What will be done

- Xóa file rác `cd` khỏi repository
- Kiểm tra không có `backend/.mvn/`, `backend/target/`, `backend/bin/` trong Git tracking
- Kiểm tra `backend/maven properties` không chứa đường dẫn local (nếu có thì thêm vào .gitignore hoặc xóa)
- Tạo `.env.example` ở root nếu chưa có
- Verify `.gitignore` đã cover đầy đủ
- Commit clean state

### Files/Folders likely changed

- `cd` (xóa)
- `backend/maven properties` (kiểm tra/xóa nếu chứa local path)
- `.env.example` (tạo mới nếu chưa có)
- `.gitignore` (cập nhật nếu thiếu)

### Done when

- `git status` không hiện file rác
- Không có build artifacts trong Git tracking
- `.env.example` tồn tại với các biến cần thiết (không có giá trị thật)
- `.gitignore` đầy đủ

### How to verify

```bash
git ls-files | findstr /i "\.Maven build\.Maven\.properties"
# Không nên có .mvn/ hoặc build/ directories
# maven properties chỉ OK nếu không chứa local path

dir cd
# File cd không nên tồn tại

type .env.example
# Phải có template các biến môi trường
```

### Risks

- Nếu đã commit file rác trước đó, cần `git rm --cached` để remove khỏi tracking mà không xóa file local
- Không xóa nhầm file cần thiết

### Suggested prompt

```
Đọc AGENTS.md. Sau đó thực hiện Phase 1.1 - Git hygiene và repository cleanup.
Xóa file rác "cd" khỏi repo. Kiểm tra không có backend/.mvn/, backend/target/ trong Git tracking.
Kiểm tra backend/maven properties không chứa local path. Tạo .env.example nếu chưa có.
Verify .gitignore đầy đủ. Không sửa source code. Chỉ dọn dẹp Git.
```

---

## [ ] Phase 1.2 - Backend configuration cleanup (warnings)

### Goal

Xử lý các warning hiện tại trong backend để codebase sạch hơn.

### What will be done

- Tắt `spring.jpa.open-in-view` bằng cách set `false` trong `application.yml`
- Xóa explicit Hibernate dialect config nếu có (Hibernate tự detect)
- Kiểm tra Flyway version compatibility warning — nếu cần thì upgrade Flyway hoặc document
- Đảm bảo `spring.jpa.hibernate.ddl-auto=validate` (đã có)

### Files/Folders likely changed

- `backend/src/main/resources/application.yml`
- `backend/pom.xml` (nếu cần upgrade Flyway)

### Done when

- `spring.jpa.open-in-view=false` trong application.yml
- Không còn Hibernate dialect warning khi bootRun
- Build vẫn thành công

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
# Kiểm tra console không còn open-in-view warning
# Kiểm tra không còn dialect warning
```

### Risks

- Tắt `open-in-view` có thể gây LazyInitializationException nếu code load lazy relations trong controller — hiện tại chưa có entity nào nên an toàn
- Upgrade Flyway phải kiểm tra không break migration hiện có

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 1.2 - Backend configuration cleanup.
Tắt spring.jpa.open-in-view trong application.yml. Xóa explicit Hibernate dialect nếu có.
Kiểm tra Flyway warning. Chạy test để đảm bảo không break. Báo cáo theo format AGENTS.md.
```

---

## [ ] Phase 1.3 - Profile configuration (local/dev/prod)

### Goal

Tạo cấu trúc profile rõ ràng cho các môi trường: local (development), dev (staging), prod (production).

### What will be done

- Tạo `application-dev.yml` với config cho môi trường staging/dev
- Tạo `application-prod.yml` với config cho production (dùng env vars, không hardcode)
- Cập nhật `application.yml` để tách rõ config chung vs config per-profile
- Đảm bảo secrets trong prod profile đọc từ environment variables

### Files/Folders likely changed

- `backend/src/main/resources/application-dev.yml` (mới)
- `backend/src/main/resources/application-prod.yml` (mới)
- `backend/src/main/resources/application.yml` (cập nhật nếu cần)

### Done when

- 3 profile files tồn tại: local, dev, prod
- Prod profile không hardcode bất kỳ secret nào
- Prod profile đọc DB URL, credentials, JWT secret từ env vars
- Backend vẫn start được với profile local

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
# Phải start thành công

# Kiểm tra prod profile không có hardcoded secrets
type src\main\resources\application-prod.yml
# Phải thấy ${DB_URL}, ${DB_USERNAME}, ${JWT_SECRET} etc.
```

### Risks

- Không commit secrets vào application-prod.yml
- Đảm bảo application-local.yml vẫn hoạt động không thay đổi

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 1.3 - Profile configuration.
Tạo application-dev.yml và application-prod.yml. Prod phải dùng env vars cho secrets.
Không hardcode secret. Đảm bảo local profile vẫn hoạt động. Chạy test để verify.
```

---

## [ ] Phase 1.4 - Actuator và health endpoint mở rộng

### Goal

Mở rộng actuator để hỗ trợ readiness/liveness probe cho Kubernetes/Docker health check tương lai.

### What will be done

- Expose thêm actuator endpoints: health, info, metrics (chỉ cho authorized)
- Configure health endpoint show components (db, redis, diskSpace)
- Thêm readiness và liveness groups cho health endpoint
- Đảm bảo actuator endpoints được bảo vệ đúng trong SecurityConfig

### Files/Folders likely changed

- `backend/src/main/resources/application.yml` (actuator config)
- `backend/src/main/java/com/tripwise/config/SecurityConfig.java` (nếu cần update endpoint rules)

### Done when

- `/actuator/health` trả về chi tiết components khi authorized
- `/actuator/health/readiness` và `/actuator/health/liveness` hoạt động
- Actuator endpoints ngoài health bị chặn cho unauthenticated requests
- Test pass

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

curl http://localhost:8080/actuator/health
# Phải trả về status UP

curl http://localhost:8080/actuator/health/liveness
# Phải trả về UP

curl http://localhost:8080/actuator/health/readiness
# Phải trả về UP
```

### Risks

- Không expose quá nhiều actuator endpoint cho public (metrics, env, configprops phải protected)
- Chỉ health/liveness/readiness cho permitAll

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 1.4 - Actuator và health endpoint mở rộng.
Expose health, info, metrics trong actuator. Thêm liveness/readiness groups.
Bảo vệ actuator endpoints trong SecurityConfig. Chạy test để verify. Không expose env/configprops.
```

---

## [ ] Phase 1.5 - Logging format và correlation ID cải thiện

### Goal

Cải thiện logging format để hỗ trợ debug và monitoring tốt hơn.

### What will be done

- Review RequestIdFilter hiện tại — đảm bảo requestId luôn có trong log
- Thêm logging cho incoming request (method, path, duration)
- Đảm bảo log format nhất quán cho JSON parsing tương lai (structured logging preparation)
- Thêm access log filter hoặc interceptor

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/common/filter/RequestIdFilter.java` (cải thiện)
- `backend/src/main/java/com/tripwise/common/filter/AccessLogFilter.java` (mới nếu cần)
- `backend/src/main/resources/application.yml` (logging config)

### Done when

- Mọi request có requestId trong log
- Log hiển thị method, path, response status, duration
- Log format sạch, đọc được, có requestId

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

curl http://localhost:8080/api/v1/health
# Kiểm tra console log phải có requestId, method=GET, path=/api/v1/health, duration
```

### Risks

- Không log request body hoặc sensitive headers (Authorization)
- Không log quá nhiều gây performance issue
- Duration calculation phải chính xác (before/after filter chain)

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 1.5 - Logging format và correlation ID cải thiện.
Cải thiện RequestIdFilter, thêm access log cho method/path/status/duration.
Không log sensitive data. Đảm bảo requestId luôn hiện trong log. Chạy test.
```

---

## [ ] Phase 1.6 - Local development documentation cập nhật

### Goal

Cập nhật tài liệu hướng dẫn chạy local đầy đủ, chính xác.

### What will be done

- Cập nhật `README.md` với hướng dẫn chi tiết local setup
- Cập nhật `backend/README.md` nếu có thay đổi từ Phase 1.1-1.5
- Tạo `CONTRIBUTING.md` với quy trình contribution
- Đảm bảo tất cả commands đã test thực tế trên Windows

### Files/Folders likely changed

- `README.md` (cập nhật)
- `backend/README.md` (cập nhật)
- `CONTRIBUTING.md` (mới)

### Done when

- Một developer mới có thể follow README.md để chạy project thành công
- Mọi commands trong README đã verify trên Windows
- CONTRIBUTING.md có quy trình commit, branch, PR

### How to verify

```bash
# Follow README.md từ đầu và verify mỗi bước hoạt động
docker compose up -d
cd backend
.\mvnw.cmd clean test
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
curl http://localhost:8080/api/v1/health
```

### Risks

- Commands có thể khác giữa Windows/macOS/Linux — nên note trong README
- Không hardcode paths specific cho một máy

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 1.6 - Local development documentation cập nhật.
Cập nhật README.md và backend/README.md với hướng dẫn chạy local chính xác trên Windows.
Tạo CONTRIBUTING.md. Không sửa source code. Chỉ tạo/sửa tài liệu.
```

---

### B. Backend Core Foundation

---

## [ ] Phase 2.1 - Base entity và audit columns

### Goal

Tạo base entity class với audit columns (createdAt, updatedAt) để tất cả entity kế thừa.

### What will be done

- Tạo `BaseEntity` abstract class với `id`, `createdAt`, `updatedAt`
- Sử dụng JPA `@MappedSuperclass`, `@PrePersist`, `@PreUpdate` hoặc Spring Data Auditing
- Tạo `AuditConfig` nếu dùng Spring Data JPA Auditing (`@EnableJpaAuditing`)
- Đảm bảo consistent với schema V1 đã có (created_at, updated_at columns)

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/common/entity/BaseEntity.java` (mới)
- `backend/src/main/java/com/tripwise/config/AuditConfig.java` (mới)

### Done when

- `BaseEntity` có id (Long), createdAt, updatedAt
- Audit columns tự động set khi persist/update
- Build và test pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Build phải thành công
```

### Risks

- BaseEntity phải match với column names trong V1 migration (created_at, updated_at, id)
- Không dùng `@GeneratedValue(strategy = AUTO)` — phải dùng `IDENTITY` để match `BIGSERIAL`

### Suggested prompt

```
Đọc AGENTS.md và V1__init_schema.sql. Thực hiện Phase 2.1 - Base entity và audit columns.
Tạo BaseEntity abstract class với id (IDENTITY), createdAt, updatedAt.
Dùng @MappedSuperclass. Tạo AuditConfig nếu cần. Đảm bảo match V1 schema. Chạy test.
```

---

## [ ] Phase 2.2 - Exception hierarchy mở rộng

### Goal

Tạo exception hierarchy đầy đủ theo docs/05-engineering/03-error-handling.md.

### What will be done

- Tạo `ResourceNotFoundException` extends `BusinessException` (404)
- Tạo `UnauthorizedException` extends `BusinessException` (401)
- Tạo `ForbiddenException` extends `BusinessException` (403)
- Tạo `ConflictException` extends `BusinessException` (409)
- Tạo `ExternalServiceException` extends `BusinessException` (502/503)
- Cập nhật `GlobalExceptionHandler` để handle các exception mới
- Đảm bảo mỗi exception type trả đúng HTTP status

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/common/exception/ResourceNotFoundException.java` (mới)
- `backend/src/main/java/com/tripwise/common/exception/UnauthorizedException.java` (mới)
- `backend/src/main/java/com/tripwise/common/exception/ForbiddenException.java` (mới)
- `backend/src/main/java/com/tripwise/common/exception/ConflictException.java` (mới)
- `backend/src/main/java/com/tripwise/common/exception/ExternalServiceException.java` (mới)
- `backend/src/main/java/com/tripwise/common/exception/GlobalExceptionHandler.java` (cập nhật)

### Done when

- 5 exception classes mới tồn tại
- GlobalExceptionHandler handle đúng mỗi exception type
- Test pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Phải pass

# Optionally: tạo unit test cho GlobalExceptionHandler
```

### Risks

- Không log sensitive information trong exception message
- Không trả stack trace cho client

### Suggested prompt

```
Đọc AGENTS.md và docs/05-engineering/03-error-handling.md. Thực hiện Phase 2.2.
Tạo ResourceNotFoundException, UnauthorizedException, ForbiddenException, ConflictException, ExternalServiceException.
Tất cả extends BusinessException. Cập nhật GlobalExceptionHandler. Chạy test.
```

---

## [ ] Phase 2.3 - Validation strategy và custom validators

### Goal

Thiết lập validation strategy chuẩn cho toàn bộ API endpoints.

### What will be done

- Tạo custom validation annotations nếu cần (VD: `@ValidEmail`, `@ValidPassword`)
- Tạo validation message properties file (messages_vi.properties cho tiếng Việt)
- Đảm bảo `@Valid` trong controller param hoạt động đúng
- Đảm bảo validation errors trả format thống nhất qua GlobalExceptionHandler
- Tạo test cho validation flow

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/common/validation/` (thư mục mới)
- `backend/src/main/resources/messages.properties` (mới)
- `backend/src/test/java/com/tripwise/common/validation/` (test mới)

### Done when

- Validation annotations hoạt động
- Validation error response format thống nhất
- Test cho validation pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Custom validators phải thread-safe
- Validation messages phải user-friendly, không technical

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 2.3 - Validation strategy và custom validators.
Tạo custom validation annotations (@ValidEmail, @ValidPassword nếu cần).
Tạo messages.properties. Test validation error format. Chạy test.
```

---

## [ ] Phase 2.4 - Pagination và sorting support

### Goal

Tạo cơ chế pagination/sorting chuẩn cho các list API.

### What will be done

- Tạo `PageResponse<T>` DTO cho paginated responses
- Tạo `PageRequest` helper hoặc dùng Spring Data `Pageable`
- Đảm bảo format response pagination nhất quán: page, size, totalElements, totalPages, content
- Tạo documentation/example cho cách dùng pagination

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/common/dto/PageResponse.java` (mới)

### Done when

- `PageResponse<T>` DTO có page, size, totalElements, totalPages, content
- Có thể wrap Spring Data Page vào PageResponse
- Build pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Pagination defaults phải hợp lý (page=0, size=20, maxSize=100)
- Không cho phép quá lớn page size gây performance issue

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 2.4 - Pagination và sorting support.
Tạo PageResponse<T> DTO. Đảm bảo wrap được Spring Data Page. Build phải pass.
```

---

## [ ] Phase 2.5 - MapStruct setup và base mapper

### Goal

Enable MapStruct để mapping giữa Entity và DTO tự động, giảm boilerplate.

### What will be done

- Uncomment MapStruct dependencies trong `pom.xml`
- Configure MapStruct annotation processor cùng Lombok (thứ tự processor quan trọng)
- Thêm `lombok-mapstruct-binding` dependency
- Tạo base mapper config `MapStructConfig`
- Tạo example mapper để verify setup

### Files/Folders likely changed

- `backend/pom.xml` (uncomment/thêm MapStruct deps)
- `backend/src/main/java/com/tripwise/config/MapStructConfig.java` (mới)

### Done when

- MapStruct annotation processor hoạt động cùng Lombok
- Build pass không lỗi annotation processor
- MapStruct generate implementation classes

### How to verify

```bash
cd backend
.\mvnw.cmd clean package
# Phải pass, không có annotation processor errors
# Check build/generated/sources/annotationProcessor/ cho MapStruct generated code
```

### Risks

- Annotation processor order: Lombok phải chạy trước MapStruct
- `lombok-mapstruct-binding:0.2.0` cần thiết khi dùng cả hai
- Nếu có lỗi, rollback và debug annotation processor config

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 2.5 - MapStruct setup.
Uncomment MapStruct trong pom.xml. Thêm lombok-mapstruct-binding.
Tạo MapStructConfig. Đảm bảo annotation processor hoạt động với Lombok. Chạy build.
```

---

## [ ] Phase 2.6 - Testcontainers setup cho integration test

### Goal

Setup Testcontainers để integration test có thể chạy với PostgreSQL thật (không cần Docker bên ngoài).

### What will be done

- Thêm Testcontainers dependencies vào pom.xml
- Tạo `application-test.yml` profile cho test
- Tạo base test class `BaseIntegrationTest` với Testcontainers PostgreSQL + PostGIS
- Đảm bảo Flyway migrations chạy tự động trong test container
- Cập nhật test hiện có để verify

### Files/Folders likely changed

- `backend/pom.xml` (thêm Testcontainers deps)
- `backend/src/main/resources/application-test.yml` (mới)
- `backend/src/test/java/com/tripwise/common/BaseIntegrationTest.java` (mới)
- `backend/src/test/java/com/tripwise/TripWiseApplicationTests.java` (cập nhật nếu cần)

### Done when

- Testcontainers chạy PostgreSQL + PostGIS container tự động khi test
- Flyway migration V1 chạy thành công trong test container
- Tất cả test pass mà không cần Docker Compose chạy trước
- Build pass

### How to verify

```bash
# Dừng Docker Compose trước để verify test container hoạt động độc lập
docker compose down

cd backend
.\mvnw.cmd clean test
# Phải pass — Testcontainers tự start PostgreSQL
```

### Risks

- Testcontainers cần Docker daemon chạy (Docker Desktop phải bật)
- PostGIS image trong Testcontainers phải match version (postgis/postgis:16-3.4-alpine)
- Test có thể chậm hơn do start container — dùng singleton container pattern
- Nếu test hiện tại đang dùng profile `local`, cần chuyển sang `test`

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 2.6 - Testcontainers setup.
Thêm Testcontainers PostgreSQL dependency. Tạo application-test.yml.
Tạo BaseIntegrationTest với singleton PostGIS container.
Cập nhật test hiện có để dùng Testcontainers. Chạy test không cần docker compose.
```

---

### C. Auth Module

---

## [ ] Phase 3.1 - User entity và JPA repository

### Goal

Tạo User domain entity và JPA repository, mapping với bảng `users` trong V1 schema.

### What will be done

- Tạo `User` entity trong `modules/user/domain/` mapping bảng `users`
- Entity kế thừa `BaseEntity`
- Tạo `UserRepository` interface trong `modules/user/domain/`
- Tạo `JpaUserRepository` implementation trong `modules/user/infrastructure/`
- Tạo `UserResponse` DTO (không bao giờ trả password_hash)
- Tạo integration test verify entity mapping

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/user/domain/User.java` (mới)
- `backend/src/main/java/com/tripwise/modules/user/domain/UserRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/user/infrastructure/JpaUserRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/user/application/dto/UserResponse.java` (mới)
- `backend/src/test/java/com/tripwise/modules/user/` (test mới)

### Done when

- User entity maps correctly với bảng users
- Repository có `findByEmail(String email)`
- DTO không expose password_hash
- Integration test pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Test phải pass, entity mapping phải validate thành công với Hibernate validate mode
```

### Risks

- Entity column names phải match V1 schema exactly (snake_case mapping)
- Không expose `passwordHash` trong bất kỳ DTO/response nào
- `@Column(name = "password_hash")` phải match schema

### Suggested prompt

```
Đọc AGENTS.md và V1__init_schema.sql. Thực hiện Phase 3.1 - User entity và JPA repository.
Tạo User entity mapping bảng users. Tạo UserRepository interface + JpaUserRepository.
Tạo UserResponse DTO (không có password_hash). Tạo integration test. Chạy test.
```

---

## [ ] Phase 3.2 - PasswordEncoder config (bcrypt)

### Goal

Configure Spring Security PasswordEncoder với bcrypt.

### What will be done

- Thêm `BCryptPasswordEncoder` bean trong SecurityConfig hoặc riêng AuthConfig
- Tạo `PasswordService` wrapper nếu cần
- Đảm bảo test verify encode/verify hoạt động

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/config/SecurityConfig.java` (thêm PasswordEncoder bean)
- `backend/src/test/java/com/tripwise/config/SecurityConfigTest.java` (mới nếu cần)

### Done when

- `PasswordEncoder` bean khả dụng trong Spring context
- Có thể encode và verify password
- Test pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Chỉ dùng bcrypt, không MD5/SHA1
- BCrypt strength nên 10-12 (default 10 là OK)

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.2 - PasswordEncoder config.
Thêm BCryptPasswordEncoder bean vào SecurityConfig. Test encode/verify. Chạy test.
```

---

## [ ] Phase 3.3 - Register endpoint

### Goal

Tạo endpoint POST `/api/v1/auth/register` để user đăng ký bằng email/password.

### What will be done

- Tạo `RegisterRequest` DTO với validation (@Email, @NotBlank, password rules)
- Tạo `RegisterUseCase` trong `modules/auth/application/`
- Tạo `AuthController` với POST `/api/v1/auth/register`
- Hash password với bcrypt trước khi lưu
- Trả `UserResponse` khi thành công
- Handle duplicate email → `ConflictException`
- Tạo unit test cho use case
- Tạo controller test

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/auth/application/dto/RegisterRequest.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/RegisterUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/presentation/AuthController.java` (mới)
- `backend/src/test/java/com/tripwise/modules/auth/` (tests mới)

### Done when

- POST `/api/v1/auth/register` với body `{email, password, fullName}` tạo user thành công
- Duplicate email trả 409 Conflict
- Invalid email/password trả 400 validation errors
- Password được hash, không lưu plaintext
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Register
curl -X POST http://localhost:8080/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234!\",\"fullName\":\"Test User\"}"
# Phải trả success với user info (không có password)

# Duplicate register
curl -X POST http://localhost:8080/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234!\",\"fullName\":\"Test User\"}"
# Phải trả 409 Conflict
```

### Risks

- Không trả password_hash trong response
- Phải validate email format và password strength
- Phải check unique email trước khi insert

### Suggested prompt

```
Đọc AGENTS.md, V1__init_schema.sql, docs/04-architecture/04-api-design.md, docs/04-architecture/05-security-architecture.md.
Thực hiện Phase 3.3 - Register endpoint.
Tạo RegisterRequest, RegisterUseCase, AuthController. Hash password bcrypt. Handle duplicate email.
Tạo unit test và controller test. Chạy test. Test thủ công bằng curl.
```

---

## [ ] Phase 3.4 - JWT token generation và validation

### Goal

Tạo service để generate và validate JWT access token.

### What will be done

- Thêm JWT dependency (jjwt hoặc spring-security-oauth2-jose) vào pom.xml
- Tạo `JwtProperties` config class cho JWT secret, expiration time
- Tạo `JwtTokenService` với:
  - `generateAccessToken(User user)` → JWT string
  - `validateToken(String token)` → boolean
  - `extractUserId(String token)` → Long
  - `extractEmail(String token)` → String
- Config JWT properties trong application.yml (local: static secret, prod: env var)
- Tạo unit test cho JwtTokenService

### Files/Folders likely changed

- `backend/pom.xml` (thêm JWT dependency)
- `backend/src/main/java/com/tripwise/modules/auth/infrastructure/JwtTokenService.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/infrastructure/JwtProperties.java` (mới)
- `backend/src/main/resources/application.yml` (thêm jwt config)
- `backend/src/main/resources/application-local.yml` (thêm jwt secret local)
- `backend/src/test/java/com/tripwise/modules/auth/infrastructure/JwtTokenServiceTest.java` (mới)

### Done when

- JWT token có thể generate với userId, email, expiration
- Token có thể validate (valid/expired/tampered)
- Claims có thể extract
- Unit test pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# JWT service tests phải pass
```

### Risks

- JWT secret phải đủ dài (ít nhất 256 bits cho HS256)
- Access token expiration nên 15-30 phút
- Không hardcode JWT secret trong code — dùng config file/env var
- Prod profile phải đọc JWT secret từ env var

### Suggested prompt

```
Đọc AGENTS.md và docs/04-architecture/05-security-architecture.md. Thực hiện Phase 3.4.
Thêm jjwt dependency. Tạo JwtTokenService, JwtProperties.
JWT access token 15 phút, chứa userId/email. Tạo unit test. Chạy test.
Local dùng static secret, prod dùng env var.
```

---

## [ ] Phase 3.5 - Login endpoint

### Goal

Tạo endpoint POST `/api/v1/auth/login` để user đăng nhập và nhận JWT access token.

### What will be done

- Tạo `LoginRequest` DTO
- Tạo `LoginResponse` DTO (accessToken, tokenType, expiresIn)
- Tạo `LoginUseCase` trong `modules/auth/application/`
- Verify email/password, trả JWT access token
- Handle wrong credentials → `UnauthorizedException`
- Handle inactive user
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/auth/application/dto/LoginRequest.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/dto/LoginResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/LoginUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/presentation/AuthController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/auth/` (tests)

### Done when

- POST `/api/v1/auth/login` trả JWT access token khi credentials đúng
- Wrong email hoặc password trả 401
- Inactive user trả 401
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Register trước (nếu chưa có)
curl -X POST http://localhost:8080/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234!\",\"fullName\":\"Test User\"}"

# Login
curl -X POST http://localhost:8080/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"Test1234!\"}"
# Phải trả accessToken

# Wrong password
curl -X POST http://localhost:8080/api/v1/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"wrong\"}"
# Phải trả 401
```

### Risks

- Không log password trong error message
- Generic error message cho wrong email/password (không reveal which is wrong)
- Không trả stack trace

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.5 - Login endpoint.
Tạo LoginRequest, LoginResponse, LoginUseCase. Verify credentials, trả JWT.
Handle wrong credentials (401). Generic error message. Tạo tests. Chạy test và curl.
```

---

## [ ] Phase 3.6 - JWT authentication filter

### Goal

Tạo filter để validate JWT token trên mọi authenticated request.

### What will be done

- Tạo `JwtAuthenticationFilter` extends `OncePerRequestFilter`
- Extract JWT từ Authorization header (`Bearer <token>`)
- Validate token, load user, set SecurityContext
- Tạo `UserDetailsService` implementation
- Cập nhật SecurityConfig để thêm JWT filter vào filter chain
- Test authenticated/unauthenticated access

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/auth/infrastructure/JwtAuthenticationFilter.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/infrastructure/CustomUserDetailsService.java` (mới)
- `backend/src/main/java/com/tripwise/config/SecurityConfig.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/auth/` (tests)

### Done when

- Request với valid JWT → authenticated, SecurityContext có user info
- Request không có JWT → 401 cho protected endpoints
- Request với expired/invalid JWT → 401
- Public endpoints (health, auth) vẫn accessible không cần JWT
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Access protected endpoint without token
curl http://localhost:8080/api/v1/some-protected-endpoint
# Phải trả 401

# Login để lấy token
# Dùng token access protected endpoint
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/some-protected-endpoint
# Phải được phép
```

### Risks

- Filter không được throw exception gây 500 — phải handle gracefully
- Không log JWT token trong log
- Filter phải skip cho public endpoints

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.6 - JWT authentication filter.
Tạo JwtAuthenticationFilter (OncePerRequestFilter). Extract Bearer token, validate, set SecurityContext.
Tạo CustomUserDetailsService. Cập nhật SecurityConfig. Test auth flow. Chạy test.
```

---

## [ ] Phase 3.7 - Get current user endpoint (/me)

### Goal

Tạo endpoint GET `/api/v1/auth/me` để user xem thông tin cá nhân.

### What will be done

- Tạo `GetCurrentUserUseCase`
- Thêm GET `/api/v1/auth/me` vào AuthController
- Lấy user từ SecurityContext, trả `UserResponse`
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/auth/application/GetCurrentUserUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/presentation/AuthController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/auth/` (tests)

### Done when

- GET `/api/v1/auth/me` với valid JWT trả user info
- Không có JWT trả 401
- Response không chứa password_hash
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Login lấy token
# GET /me
curl -H "Authorization: Bearer <token>" http://localhost:8080/api/v1/auth/me
# Phải trả user info
```

### Risks

- Chỉ trả thông tin của chính user đang login, không user khác

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.7 - Get current user (/me).
Tạo GetCurrentUserUseCase. Thêm GET /api/v1/auth/me. Trả UserResponse.
Không trả password. Test auth flow. Chạy test.
```

---

## [x] Phase 3.8 - Refresh token rotation

### Goal

Implement refresh token với rotation policy — mỗi lần refresh, token cũ bị revoke và token mới được cấp.

### What will be done

- Tạo `RefreshToken` entity mapping bảng `refresh_tokens` (V1 schema)
- Tạo `RefreshTokenRepository`
- Tạo `RefreshTokenService`:
  - Generate refresh token (random, hash trước khi lưu)
  - Validate refresh token
  - Rotate: revoke old, issue new
- Cập nhật `LoginUseCase` để trả cả refreshToken
- Tạo POST `/api/v1/auth/refresh` endpoint
- Cập nhật `LoginResponse` thêm refreshToken
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/auth/domain/RefreshToken.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/domain/RefreshTokenRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/infrastructure/JpaRefreshTokenRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/RefreshTokenService.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/RefreshTokenUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/dto/RefreshRequest.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/application/dto/LoginResponse.java` (cập nhật)
- `backend/src/main/java/com/tripwise/modules/auth/application/LoginUseCase.java` (cập nhật)
- `backend/src/main/java/com/tripwise/modules/auth/presentation/AuthController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/auth/` (tests)

### Done when

- Login trả cả accessToken và refreshToken
- POST `/api/v1/auth/refresh` nhận refreshToken, trả new accessToken + new refreshToken
- Old refresh token bị revoke sau khi dùng
- Revoked token không dùng lại được
- Expired token không dùng được
- Refresh token lưu dạng hash trong DB
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Login
curl -X POST http://localhost:8080/api/v1/auth/login ...
# Trả accessToken + refreshToken

# Refresh
curl -X POST http://localhost:8080/api/v1/auth/refresh ^
  -H "Content-Type: application/json" ^
  -d "{\"refreshToken\":\"<token>\"}"
# Trả new accessToken + new refreshToken

# Dùng lại old refresh token
curl -X POST http://localhost:8080/api/v1/auth/refresh ^
  -H "Content-Type: application/json" ^
  -d "{\"refreshToken\":\"<old-token>\"}"
# Phải trả 401
```

### Risks

- Refresh token phải hash trước khi lưu DB (SHA-256 hoặc bcrypt)
- Refresh token expiration 7 ngày
- Nếu phát hiện reuse của revoked token → revoke tất cả token của user (security best practice)
- Không log refresh token value

### Suggested prompt

```
Đọc AGENTS.md và docs/04-architecture/05-security-architecture.md. Thực hiện Phase 3.8.
Tạo RefreshToken entity, repository, service. Implement rotation policy.
Hash token trước khi lưu. Login trả cả refresh token. POST /api/v1/auth/refresh.
Test rotation: old token phải bị reject. Chạy test.
```

---

## [x] Phase 3.9 - Logout endpoint

### Goal

Tạo endpoint POST `/api/v1/auth/logout` để revoke refresh token.

### What will be done

- Tạo `LogoutUseCase` — revoke current user's refresh token
- Thêm POST `/api/v1/auth/logout` vào AuthController
- Nhận refreshToken trong body, revoke nó
- Optionally: revoke tất cả refresh tokens của user
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/auth/application/LogoutUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/auth/presentation/AuthController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/auth/` (tests)

### Done when

- POST `/api/v1/auth/logout` revoke refresh token
- Revoked token không thể dùng refresh nữa
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

# Login → lấy refreshToken → Logout → Try refresh → phải fail
```

### Risks

- Access token vẫn valid cho đến khi expire (stateless JWT)
- Logout chỉ revoke refresh token, không invalidate access token

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.9 - Logout endpoint.
Tạo LogoutUseCase. POST /api/v1/auth/logout revoke refresh token.
Test flow: login → logout → refresh phải fail. Chạy test.
```

---

## [x] Phase 3.10 - Auth integration tests

### Goal

Tạo comprehensive integration tests cho toàn bộ auth flow.

### What will be done

- Tạo integration test class `AuthIntegrationTest`
- Test full flow: register → login → /me → refresh → logout → refresh fail
- Test edge cases: duplicate email, wrong password, expired token, invalid token
- Dùng Testcontainers (từ Phase 2.6)
- Test security: protected endpoints require auth, public endpoints accessible

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/auth/AuthIntegrationTest.java` (mới)

### Done when

- Integration test cover full auth lifecycle
- Tất cả edge cases được test
- Test pass với Testcontainers

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Tất cả auth tests phải pass
```

### Risks

- Test phải clean up data giữa các test cases
- Token expiration tests có thể cần mock time

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.10 - Auth integration tests.
Tạo AuthIntegrationTest cover full flow: register → login → /me → refresh → logout.
Test edge cases. Dùng Testcontainers. Chạy test.
```

---

## [x] Phase 3.11 - Rate limiting cho auth endpoints

### Goal

Thêm rate limiting để bảo vệ auth endpoints khỏi brute force attacks.

### What will be done

- Thêm rate limiting library (bucket4j hoặc resilience4j-ratelimiter)
- Tạo rate limit filter/interceptor cho `/api/v1/auth/login` và `/api/v1/auth/register`
- Limit: 5 requests/minute per IP cho login, 3 requests/minute per IP cho register
- Trả 429 Too Many Requests khi vượt limit
- Config rate limit values trong application.yml
- Tạo tests

### Files/Folders likely changed

- `backend/pom.xml` (thêm rate limit dependency)
- `backend/src/main/java/com/tripwise/common/ratelimit/` (mới)
- `backend/src/main/resources/application.yml` (thêm rate limit config)
- `backend/src/test/java/com/tripwise/common/ratelimit/` (tests)

### Done when

- Login endpoint bị limit khi gọi quá 5 lần/phút
- Register endpoint bị limit khi gọi quá 3 lần/phút
- Trả 429 khi exceed
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

# Manual test: gọi login 6 lần liên tiếp
# Lần thứ 6 phải trả 429
```

### Risks

- Rate limit per IP có thể không chính xác nếu behind proxy — cần check X-Forwarded-For header
- Redis-based rate limit tốt hơn in-memory cho production multi-instance
- MVP có thể dùng in-memory trước

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 3.11 - Rate limiting cho auth endpoints.
Thêm rate limit cho login (5/min) và register (3/min). Trả 429 khi exceed.
Config trong application.yml. Tạo tests. Chạy test.
```

---

### D. Place Module / PostGIS

---

## [x] Phase 4.1 - PlaceCategory entity, repository, và seed data migration

### Goal

Tạo PlaceCategory entity mapping bảng `place_categories` và seed data categories cơ bản.

### What will be done

- Tạo `PlaceCategory` entity trong `modules/place/domain/`
- Tạo `PlaceCategoryRepository`
- Tạo Flyway migration V2 để seed categories: Biển, Ẩm thực, Check-in, Văn hóa, Giải trí, Thiên nhiên, Mua sắm, Tâm linh
- Tạo `PlaceCategoryResponse` DTO
- Tạo GET `/api/v1/places/categories` endpoint
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/place/domain/PlaceCategory.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/domain/PlaceCategoryRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/infrastructure/JpaPlaceCategoryRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/application/dto/PlaceCategoryResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/presentation/PlaceCategoryController.java` (mới)
- `backend/src/main/resources/db/migration/V2__seed_place_categories.sql` (mới)
- `backend/src/test/java/com/tripwise/modules/place/` (tests)

### Done when

- PlaceCategory entity mapping đúng bảng place_categories
- V2 migration seed 8+ categories thành công
- GET `/api/v1/places/categories` trả danh sách categories
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
curl http://localhost:8080/api/v1/places/categories
# Phải trả danh sách categories
```

### Risks

- Migration V2 phải idempotent (dùng INSERT ... ON CONFLICT DO NOTHING)
- Category slugs phải unique và lowercase

### Suggested prompt

```
Đọc AGENTS.md và V1__init_schema.sql. Thực hiện Phase 4.1.
Tạo PlaceCategory entity, repository. Flyway V2 seed categories (Biển, Ẩm thực, Check-in, etc.).
GET /api/v1/places/categories endpoint. Tests. Chạy test.
```

---

## [x] Phase 4.2 - Place entity và JPA repository với PostGIS

### Goal

Tạo Place entity mapping bảng `places` với PostGIS geography support.

### What will be done

- Thêm Hibernate Spatial dependency (hibernate-spatial) vào pom.xml
- Tạo `Place` entity với PostGIS `Point` mapping cho `location` column
- Tạo `PlaceRepository` interface với spatial query methods
- Tạo `JpaPlaceRepository`
- Test entity mapping và spatial queries

### Files/Folders likely changed

- `backend/pom.xml` (thêm hibernate-spatial)
- `backend/src/main/java/com/tripwise/modules/place/domain/Place.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/domain/PlaceRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/infrastructure/JpaPlaceRepository.java` (mới)
- `backend/src/test/java/com/tripwise/modules/place/` (tests)

### Done when

- Place entity maps tất cả columns trong bảng places
- Geography Point hoạt động với Hibernate Spatial
- Repository CRUD operations work
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Hibernate Spatial version phải compatible với Spring Boot 3.2.5
- geography vs geometry type mapping cần đúng (schema dùng geography)
- SRID = 4326 phải match

### Suggested prompt

```
Đọc AGENTS.md, V1__init_schema.sql. Thực hiện Phase 4.2 - Place entity với PostGIS.
Thêm hibernate-spatial dependency. Tạo Place entity với geography Point mapping.
Tạo PlaceRepository. Test entity mapping. Chạy test.
```

---

## [x] Phase 4.3 - Place seed data (Nha Trang verified places)

### Goal

Seed dữ liệu địa điểm thật, đã verify tại Nha Trang để demo và test.

### What will be done

- Tạo Flyway migration V3 seed 20-30 địa điểm Nha Trang thật:
  - Bãi biển: Trần Phú, Dốc Lết, Bãi Dài, Hòn Chồng
  - Ẩm thực: Bún chả cá, Nem nướng Ninh Hòa, Bánh căn
  - Check-in: Tháp Bà Ponagar, Hòn Tằm, Vinpearl
  - Thiên nhiên: Vịnh Nha Trang, Hòn Mun, Suối Hoa Lan
  - Tâm linh: Nhà thờ Đá, Chùa Long Sơn
- Mỗi place phải có tọa độ thật (latitude, longitude)
- Mỗi place phải có category, tags, rating, price_level, visit_duration
- Đánh dấu `is_verified = true`

### Files/Folders likely changed

- `backend/src/main/resources/db/migration/V3__seed_nha_trang_places.sql` (mới)

### Done when

- V3 migration chạy thành công
- 20-30 places Nha Trang trong database
- Tọa độ thật, verify được trên bản đồ
- Tất cả places có category, tags, location

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local

# Query database
docker exec -e PGPASSWORD=tripwise_local_password -it tripwise-db-local ^
  psql -U tripwise_user -d tripwise -c "SELECT name, city, ST_AsText(location) FROM places LIMIT 5;"
# Phải thấy Nha Trang places với tọa độ
```

### Risks

- Tọa độ phải chính xác, không bịa — verify trên Google Maps/OpenStreetMap
- Dùng ST_MakePoint(longitude, latitude) đúng thứ tự (lng trước, lat sau)
- Migration V3 phải ON CONFLICT DO NOTHING cho idempotency

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 4.3 - Seed Nha Trang places.
Tạo Flyway V3 seed 20-30 địa điểm Nha Trang thật với tọa độ chính xác.
Bao gồm biển, ẩm thực, check-in, thiên nhiên, tâm linh. is_verified=true.
Verify tọa độ trên OpenStreetMap. Chạy migration. Query DB verify.
```

---

## [x] Phase 4.4 - Search/filter places API

### Goal

Tạo API search và filter places theo nhiều tiêu chí.

### What will be done

- Tạo `SearchPlacesUseCase`
- Tạo `PlaceResponse` DTO
- Tạo GET `/api/v1/places` với query params:
  - `city` (filter by city)
  - `categoryId` (filter by category)
  - `tags` (filter by tags)
  - `priceLevel` (filter by price level)
  - `keyword` (search by name/description)
  - `page`, `size` (pagination)
- Trả `PageResponse<PlaceResponse>`
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/place/application/SearchPlacesUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/application/dto/PlaceResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/presentation/PlaceController.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/infrastructure/PlaceMapper.java` (mới)
- `backend/src/test/java/com/tripwise/modules/place/` (tests)

### Done when

- GET `/api/v1/places?city=Nha Trang` trả places ở Nha Trang
- Filter by category, tags, priceLevel hoạt động
- Keyword search hoạt động
- Pagination hoạt động
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
curl "http://localhost:8080/api/v1/places?city=Nha%20Trang&page=0&size=10"
# Phải trả paginated places
```

### Risks

- SQL injection prevention — dùng parameterized queries (JPA Criteria hoặc Specification)
- Performance: pagination phải dùng DB-level LIMIT/OFFSET, không load all then filter

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 4.4 - Search/filter places API.
GET /api/v1/places với city, categoryId, tags, priceLevel, keyword, pagination.
Dùng JPA Specification cho dynamic filtering. Tạo tests. Chạy test.
```

---

## [x] Phase 4.5 - Nearby places API (PostGIS spatial query)

### Goal

Tạo API tìm places gần vị trí cho trước, dùng PostGIS spatial query.

### What will be done

- Tạo `NearbyPlacesUseCase`
- Tạo GET `/api/v1/places/nearby` với params:
  - `lat` (latitude)
  - `lng` (longitude)
  - `radius` (meters, default 5000)
  - `categoryId` (optional filter)
  - `limit` (optional, default 20)
- Dùng PostGIS `ST_DWithin` hoặc `ST_Distance` cho spatial query
- Kết quả sorted by distance
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/place/application/NearbyPlacesUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/presentation/PlaceController.java` (cập nhật)
- `backend/src/main/java/com/tripwise/modules/place/infrastructure/JpaPlaceRepository.java` (thêm native query)
- `backend/src/test/java/com/tripwise/modules/place/` (tests)

### Done when

- GET `/api/v1/places/nearby?lat=12.25&lng=109.19&radius=5000` trả places trong bán kính 5km
- Results sorted by distance
- Distance included trong response
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
curl "http://localhost:8080/api/v1/places/nearby?lat=12.2388&lng=109.1967&radius=5000"
# Phải trả places gần trung tâm Nha Trang
```

### Risks

- PostGIS spatial query trên geography type dùng meters (không phải degrees)
- Validate lat/lng range (-90 to 90, -180 to 180)
- Performance: GIST index phải được sử dụng

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 4.5 - Nearby places API.
GET /api/v1/places/nearby với lat, lng, radius. Dùng PostGIS ST_DWithin.
Sort by distance. Validate coordinates. Test với Nha Trang data. Chạy test.
```

---

## [x] Phase 4.6 - Place detail API

### Goal

Tạo API xem chi tiết một place.

### What will be done

- Tạo `GetPlaceDetailUseCase`
- Tạo GET `/api/v1/places/{id}` endpoint
- Trả `PlaceDetailResponse` (có thêm category info, full description)
- Handle place not found → 404
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/place/application/GetPlaceDetailUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/application/dto/PlaceDetailResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/place/presentation/PlaceController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/place/` (tests)

### Done when

- GET `/api/v1/places/{id}` trả chi tiết place
- Place not found trả 404
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
curl http://localhost:8080/api/v1/places/1
# Phải trả place detail

curl http://localhost:8080/api/v1/places/99999
# Phải trả 404
```

### Risks

- Không trả internal data không cần thiết

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 4.6 - Place detail API.
GET /api/v1/places/{id}. Trả PlaceDetailResponse. Handle 404. Tạo tests. Chạy test.
```

---

## [ ] Phase 4.7 - Place module tests

### Goal

Đảm bảo test coverage đầy đủ cho Place module.

### What will be done

- Review và bổ sung unit tests cho use cases
- Integration test cho spatial queries
- Controller test cho endpoints
- Edge case tests: empty results, invalid coordinates, large radius

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/place/` (bổ sung tests)

### Done when

- Test coverage >80% cho Place module
- Spatial query tests pass với Testcontainers
- Edge cases covered
- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Tất cả place tests pass
```

### Risks

- Testcontainers PostGIS phải chạy spatial queries đúng
- Seed data phải consistent trong tests

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 4.7 - Place module tests.
Bổ sung unit/integration/controller tests cho Place module.
Test spatial queries, edge cases. Đảm bảo coverage >80%. Chạy test.
```

---

### E. AI / Gemini Integration

---

## [ ] Phase 5.1 - Gemini API client configuration

### Goal

Setup HTTP client để gọi Gemini API.

### What will be done

- Thêm dependency cho HTTP client (RestClient hoặc WebClient)
- Tạo `GeminiProperties` config class cho API key, model, timeout
- Tạo `GeminiClient` trong `modules/ai/infrastructure/`
- Config API key qua env var (không hardcode)
- Config timeout (30s default)
- Tạo test với mocked HTTP

### Files/Folders likely changed

- `backend/pom.xml` (thêm deps nếu cần)
- `backend/src/main/java/com/tripwise/modules/ai/infrastructure/GeminiClient.java` (mới)
- `backend/src/main/java/com/tripwise/modules/ai/infrastructure/GeminiProperties.java` (mới)
- `backend/src/main/resources/application.yml` (thêm gemini config)
- `backend/src/main/resources/application-local.yml` (thêm gemini API key placeholder)
- `backend/src/test/java/com/tripwise/modules/ai/` (tests)

### Done when

- GeminiClient có thể gọi Gemini API
- API key đọc từ env var / config
- Timeout configured
- Test pass (mocked)

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Không hardcode API key
- Không log API key
- Timeout phải đủ ngắn để không block thread quá lâu
- Rate limit awareness (Gemini có quota)

### Suggested prompt

```
Đọc AGENTS.md và docs/07-ai-working/02-prompt-engineering.md. Thực hiện Phase 5.1.
Tạo GeminiClient, GeminiProperties. API key từ env var. Timeout 30s.
Test với mocked HTTP. Không hardcode API key. Chạy test.
```

---

## [ ] Phase 5.2 - Prompt template cho trip parsing

### Goal

Tạo prompt template chuẩn để gửi cho Gemini parse yêu cầu du lịch tiếng Việt.

### What will be done

- Tạo `PromptTemplate` class hoặc resource file cho system prompt
- System prompt phải:
  - Định nghĩa role cho Gemini
  - Mô tả task: parse Vietnamese travel request
  - Định nghĩa strict JSON output schema
  - Bao gồm examples
  - Cấm Gemini bịa địa điểm/tọa độ
- Tạo `TripParsingPromptBuilder` service
- Tạo output schema class: `ParsedTripRequest`
- Tạo test verify prompt generation

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/ai/application/TripParsingPromptBuilder.java` (mới)
- `backend/src/main/java/com/tripwise/modules/ai/application/dto/ParsedTripRequest.java` (mới)
- `backend/src/main/resources/prompts/trip-parsing-system.txt` (mới, hoặc inline)
- `backend/src/test/java/com/tripwise/modules/ai/` (tests)

### Done when

- Prompt template produce valid, well-structured prompt
- ParsedTripRequest có: destination, startDate, endDate, numDays, budgetLevel, interests[], preferences
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Prompt phải rõ ràng để Gemini trả đúng schema
- Prompt không được quá dài (token limit)
- Phải test với nhiều kiểu input tiếng Việt

### Suggested prompt

```
Đọc AGENTS.md và docs/07-ai-working/02-prompt-engineering.md. Thực hiện Phase 5.2.
Tạo TripParsingPromptBuilder, ParsedTripRequest DTO. System prompt chuẩn.
Strict JSON schema. Cấm bịa địa điểm. Examples. Tests. Chạy test.
```

---

## [ ] Phase 5.3 - Trip requirement parsing use case

### Goal

Tạo use case parse yêu cầu du lịch từ text tiếng Việt thành structured data.

### What will be done

- Tạo `ParseTripRequirementUseCase`
- Flow: nhận raw text → build prompt → call Gemini → parse JSON response → validate → return ParsedTripRequest
- Handle Gemini error/timeout → fallback hoặc error message
- Handle invalid JSON response → retry hoặc error
- Tạo tests (mocked Gemini response)

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/ai/application/ParseTripRequirementUseCase.java` (mới)
- `backend/src/test/java/com/tripwise/modules/ai/` (tests)

### Done when

- Input: "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển và hải sản, tiết kiệm"
- Output: ParsedTripRequest { destination: "Nha Trang", numDays: 3, interests: ["biển", "hải sản"], budgetLevel: "BUDGET" }
- Gemini error handled gracefully
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Gemini output phải validate — không trust AI output blindly
- Retry logic cần rate limit awareness
- Fallback phải clear cho user

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 5.3 - Trip requirement parsing use case.
Tạo ParseTripRequirementUseCase. Call Gemini, parse JSON, validate output.
Handle errors/timeout. Tạo tests với mocked Gemini response. Chạy test.
```

---

## [ ] Phase 5.4 - AI output validation và fallback

### Goal

Đảm bảo mọi output từ Gemini đều được validate và có fallback khi lỗi.

### What will be done

- Tạo `AiOutputValidator` service
- Validate ParsedTripRequest: destination required, numDays > 0, dates valid
- Tạo fallback strategy:
  - Nếu Gemini trả sai schema → retry 1 lần
  - Nếu retry fail → trả error message gợi ý user nhập lại
  - Nếu Gemini down → trả error "AI service unavailable"
- Tạo tests cho mọi failure scenario

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/ai/application/AiOutputValidator.java` (mới)
- `backend/src/test/java/com/tripwise/modules/ai/` (tests)

### Done when

- Invalid AI output bị reject
- Retry logic hoạt động
- Fallback error messages rõ ràng
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Retry không nên retry quá nhiều (max 1-2 times)
- Error message phải user-friendly, không technical

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 5.4 - AI output validation và fallback.
Tạo AiOutputValidator. Validate ParsedTripRequest fields. Retry logic.
Fallback error messages. Test mọi failure scenario. Chạy test.
```

---

## [ ] Phase 5.5 - AI module tests (mocked Gemini)

### Goal

Comprehensive tests cho AI module.

### What will be done

- Unit tests cho prompt builder
- Unit tests cho output validator
- Integration test cho parsing use case (mocked Gemini)
- Test various Vietnamese input formats
- Test error scenarios

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/ai/` (bổ sung tests)

### Done when

- Test coverage >80% cho AI module
- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Mocked Gemini responses phải realistic

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 5.5 - AI module tests.
Bổ sung tests cho prompt builder, output validator, parsing use case.
Test nhiều kiểu input tiếng Việt. Test error scenarios. Chạy test.
```

---

### F. Trip Management

---

## [ ] Phase 6.1 - Trip entity và repository

### Goal

Tạo Trip entity mapping bảng `trips`.

### What will be done

- Tạo `Trip` entity trong `modules/trip/domain/`
- Tạo `TripRepository` interface
- Tạo `JpaTripRepository`
- Tạo `TripStatus` enum (DRAFT, GENERATED, SAVED)
- Test entity mapping

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/trip/domain/Trip.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/domain/TripStatus.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/domain/TripRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/infrastructure/JpaTripRepository.java` (mới)
- `backend/src/test/java/com/tripwise/modules/trip/` (tests)

### Done when

- Trip entity maps correctly với bảng trips
- TripStatus enum hoạt động
- Repository CRUD works
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- interests column là TEXT[] — cần proper JPA mapping cho array type
- ai_metadata là JSONB — cần proper JPA mapping

### Suggested prompt

```
Đọc AGENTS.md và V1__init_schema.sql. Thực hiện Phase 6.1 - Trip entity và repository.
Tạo Trip entity mapping bảng trips. TripStatus enum. Repository. Tests. Chạy test.
```

---

## [ ] Phase 6.2 - Create trip (save parsed request)

### Goal

Tạo use case và endpoint để tạo trip từ parsed AI request.

### What will be done

- Tạo `CreateTripRequest` DTO
- Tạo `CreateTripUseCase`
- Flow: nhận raw text → parse (AI) → tạo Trip entity → persist → trả response
- Tạo POST `/api/v1/trips/generate` endpoint
- Trip linked to authenticated user
- Tạo `TripResponse` DTO
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/trip/application/dto/CreateTripRequest.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/application/dto/TripResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/application/CreateTripUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/presentation/TripController.java` (mới)
- `backend/src/test/java/com/tripwise/modules/trip/` (tests)

### Done when

- POST `/api/v1/trips/generate` với text → tạo trip linked to user
- Trip saved trong database
- Response có trip info
- Requires authentication
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
# Login → lấy token
curl -X POST http://localhost:8080/api/v1/trips/generate ^
  -H "Authorization: Bearer <token>" ^
  -H "Content-Type: application/json" ^
  -d "{\"request\":\"Tôi muốn đi Nha Trang 3 ngày 2 đêm\"}"
# Phải trả trip info
```

### Risks

- Must require authentication
- Phải link trip to current user
- Rate limit cho trip generation (expensive AI call)

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 6.2 - Create trip.
POST /api/v1/trips/generate. Parse text qua AI, tạo Trip, persist. Auth required.
Tạo DTOs, use case, controller. Tests. Chạy test.
```

---

## [ ] Phase 6.3 - List user trips API

### Goal

Tạo API liệt kê trips của user hiện tại.

### What will be done

- Tạo `ListUserTripsUseCase`
- Tạo GET `/api/v1/trips` — chỉ trả trips của authenticated user
- Paginated response
- Sort by createdAt descending
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/trip/application/ListUserTripsUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/presentation/TripController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/trip/` (tests)

### Done when

- GET `/api/v1/trips` trả paginated trips của current user
- Không trả trips của user khác
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Authorization: chỉ trả trips của chính user đang login

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 6.3 - List user trips.
GET /api/v1/trips. Paginated. Chỉ trả trips của current user. Tests. Chạy test.
```

---

## [ ] Phase 6.4 - Trip detail API

### Goal

Tạo API xem chi tiết một trip.

### What will be done

- Tạo `GetTripDetailUseCase`
- Tạo GET `/api/v1/trips/{id}`
- Chỉ owner mới xem được trip
- Include itinerary data nếu có
- Handle not found → 404, not owner → 403
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/trip/application/GetTripDetailUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/application/dto/TripDetailResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/presentation/TripController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/trip/` (tests)

### Done when

- GET `/api/v1/trips/{id}` trả chi tiết trip
- Not found → 404
- Not owner → 403
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Authorization check critical — không để user xem trip của người khác

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 6.4 - Trip detail API.
GET /api/v1/trips/{id}. Owner check. 404/403. Tests. Chạy test.
```

---

## [ ] Phase 6.5 - Delete trip API

### Goal

Tạo API xóa trip.

### What will be done

- Tạo `DeleteTripUseCase`
- Tạo DELETE `/api/v1/trips/{id}`
- Chỉ owner mới xóa được
- Cascade delete itinerary data
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/trip/application/DeleteTripUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/presentation/TripController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/trip/` (tests)

### Done when

- DELETE `/api/v1/trips/{id}` xóa trip
- Only owner
- Cascade delete works
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Cascade delete phải đúng — không để orphan records
- Authorization check critical

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 6.5 - Delete trip API.
DELETE /api/v1/trips/{id}. Owner check. Cascade delete. Tests. Chạy test.
```

---

## [ ] Phase 6.6 - Trip ownership authorization

### Goal

Review và strengthen authorization logic cho trip access.

### What will be done

- Tạo `TripAuthorizationService` hoặc annotation-based authorization
- Ensure consistent ownership check across all trip endpoints
- Tạo security-focused tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/trip/application/TripAuthorizationService.java` (mới)
- `backend/src/test/java/com/tripwise/modules/trip/` (security tests)

### Done when

- Consistent authorization across all trip endpoints
- Security tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Phải test cross-user access thoroughly

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 6.6 - Trip ownership authorization.
Tạo TripAuthorizationService. Ensure consistent owner checks. Security tests. Chạy test.
```

---

## [ ] Phase 6.7 - Trip module tests

### Goal

Comprehensive tests cho Trip module.

### What will be done

- Unit tests cho tất cả use cases
- Integration tests cho full trip lifecycle
- Authorization tests
- Edge case tests

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/trip/` (bổ sung tests)

### Done when

- Test coverage >80% cho Trip module
- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Tests cần proper user setup

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 6.7 - Trip module tests.
Comprehensive tests cho trip lifecycle, authorization, edge cases. Chạy test.
```

---

### G. Itinerary Generation

---

## [ ] Phase 7.1 - Scoring model (interest, budget, distance)

### Goal

Tạo scoring model để rank và select places phù hợp với yêu cầu du lịch.

### What will be done

- Tạo `PlaceScoringService` trong `modules/itinerary/domain/`
- Scoring criteria:
  - Interest match (tags match user interests → +score)
  - Budget match (price_level match budget → +score)
  - Rating (higher rating → +score)
  - Distance penalty (quá xa → -score) (tạm dùng straight-line distance, OSRM integration sau)
- Tạo `PlaceScore` value object
- Tạo unit tests với various scenarios

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/domain/PlaceScoringService.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/domain/PlaceScore.java` (mới)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Scoring service rank places theo interest/budget/rating/distance
- Unit tests pass với different scenarios
- Scoring logic transparent, testable

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Scoring weights cần tunable — dùng config không hardcode
- Distance calculation tạm dùng Haversine, OSRM integration ở Phase 8

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.1 - Scoring model.
Tạo PlaceScoringService: interest match, budget match, rating, distance penalty.
Configurable weights. Unit tests. Chạy test.
```

---

## [ ] Phase 7.2 - Candidate place selection use case

### Goal

Tạo use case chọn candidate places cho trip dựa trên scoring.

### What will be done

- Tạo `SelectCandidatePlacesUseCase`
- Flow: lấy ParsedTripRequest → query places by destination → score → select top N
- N = numDays × 3-4 places/day (configurable)
- Filter out inactive/unverified places
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/application/SelectCandidatePlacesUseCase.java` (mới)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Use case select top places based on scoring
- Correct number of places selected
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Không đủ places cho destination → handle gracefully
- Cần diversity trong selection (không chỉ một category)

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.2 - Candidate place selection.
Tạo SelectCandidatePlacesUseCase. Query by destination, score, select top N.
Ensure diversity across categories. Tests. Chạy test.
```

---

## [ ] Phase 7.3 - Day/time-slot grouping algorithm

### Goal

Tạo algorithm phân bổ places vào ngày/buổi (MORNING, AFTERNOON, EVENING).

### What will be done

- Tạo `ItineraryGroupingService`
- Algorithm:
  - Group places by proximity (cluster gần nhau cùng ngày)
  - Assign time slots based on place type (biển → sáng, ẩm thực → trưa/tối, check-in → chiều)
  - Respect visit_duration
  - Max 3-4 places per day
  - Avoid too much travel between places in same day
- Tạo `ItineraryDay` và `ItineraryItem` value objects/DTOs
- Tạo tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryGroupingService.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryDayPlan.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryItemPlan.java` (mới)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Places grouped into days with time slots
- No day has too many places
- Nearby places grouped together
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Grouping algorithm complexity — keep it simple for MVP
- Edge cases: only 1 day, many days, few places

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.3 - Day/time-slot grouping.
Tạo ItineraryGroupingService. Group by proximity, assign time slots.
Max 3-4 places/day. Respect visit_duration. Tests. Chạy test.
```

---

## [ ] Phase 7.4 - Itinerary persistence (itinerary_days, itinerary_items)

### Goal

Tạo entities và repositories cho itinerary_days và itinerary_items.

### What will be done

- Tạo `ItineraryDay` entity mapping `itinerary_days`
- Tạo `ItineraryItem` entity mapping `itinerary_items`
- Tạo repositories
- Tạo persistence service
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryDay.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryItem.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryDayRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/domain/ItineraryItemRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/infrastructure/` (JPA repos)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Entities map correctly
- CRUD operations work
- Cascade from Trip → Days → Items works
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Entity relationships: Trip → many Days → many Items
- Cascade delete must work properly

### Suggested prompt

```
Đọc AGENTS.md và V1__init_schema.sql. Thực hiện Phase 7.4 - Itinerary persistence.
Tạo ItineraryDay, ItineraryItem entities. Repositories. Cascade relationships.
Tests. Chạy test.
```

---

## [ ] Phase 7.5 - Generate itinerary endpoint

### Goal

Tạo endpoint hoàn chỉnh generate itinerary cho trip.

### What will be done

- Tạo `GenerateItineraryUseCase`
- Orchestrate: parse request → select places → group → persist → return
- Cập nhật POST `/api/v1/trips/generate` hoặc tạo endpoint riêng
- Return full itinerary response
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/application/GenerateItineraryUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/trip/presentation/TripController.java` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Trip generation produces full itinerary with days and items
- Each item linked to real place from DB
- Response includes itinerary details
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
# Generate trip → should return itinerary
```

### Risks

- Phải ensure places come from DB, not AI
- Handle case: no places available for destination

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.5 - Generate itinerary endpoint.
Orchestrate full flow: parse → select → group → persist → return.
All places from DB. Tests. Chạy test.
```

---

## [x] Phase 7.6 - Itinerary detail API

### Goal

Tạo API xem chi tiết itinerary của trip.

### What will be done

- Tạo `GetItineraryDetailUseCase`
- Itinerary detail returned as part of trip detail (Phase 6.4)
- Tạo `ItineraryResponse`, `ItineraryDayResponse`, `ItineraryItemResponse` DTOs
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/application/GetItineraryDetailUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/application/dto/` (DTOs mới)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Trip detail includes full itinerary with days, items, places
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- N+1 query problem — use fetch join

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.6 - Itinerary detail API.
Itinerary DTOs. Include in trip detail. Avoid N+1 queries. Tests. Chạy test.
```

---

## [x] Phase 7.7 - AI description generation cho itinerary items

### Goal

Dùng Gemini sinh mô tả cho mỗi hoạt động trong lịch trình.

### What will be done

- Tạo `GenerateDescriptionUseCase` dùng Gemini
- Cho mỗi itinerary item: dùng AI sinh mô tả ngắn, giải thích tại sao gợi ý place này
- Save vào `ai_description` column
- Tests (mocked)

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/application/GenerateDescriptionUseCase.java` (mới)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Itinerary items có ai_description
- Descriptions meaningful, tiếng Việt
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Gemini call for each item có thể slow — batch hoặc single prompt cho cả itinerary
- Fallback nếu Gemini fail: để description trống, không block itinerary

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.7 - AI description generation.
Gemini sinh mô tả cho itinerary items. Tiếng Việt. Fallback nếu fail.
Tests mocked. Chạy test.
```

---

## [x] Phase 7.8 - Itinerary module tests

### Goal

Comprehensive tests cho Itinerary module.

### What will be done

- Unit tests cho scoring, grouping, selection
- Integration test cho full generation flow
- Edge case tests

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/itinerary/` (bổ sung)

### Done when

- Coverage >80% cho Itinerary module
- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Integration test cần seed data

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 7.8 - Itinerary module tests.
Comprehensive tests: scoring, grouping, selection, generation. Chạy test.
```

---

### H. OSRM Routing

---

## [x] Phase 8.1 - OSRM HTTP client

### Goal

Tạo HTTP client gọi OSRM API cho routing.

### What will be done

- Tạo `OsrmClient` trong `modules/route/infrastructure/`
- Tạo `OsrmProperties` config (base URL, timeout)
- Implement `getRoute(lat1, lng1, lat2, lng2, profile)` → RouteResult
- Parse OSRM response: distance, duration, geometry
- Config OSRM URL (demo server cho development, self-hosted cho production)
- Tests (mocked)

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/route/infrastructure/OsrmClient.java` (mới)
- `backend/src/main/java/com/tripwise/modules/route/infrastructure/OsrmProperties.java` (mới)
- `backend/src/main/java/com/tripwise/modules/route/domain/RouteResult.java` (mới)
- `backend/src/main/resources/application.yml` (thêm OSRM config)
- `backend/src/test/java/com/tripwise/modules/route/` (tests)

### Done when

- OsrmClient can call OSRM API
- Response parsed correctly
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- OSRM demo server has rate limits — don't abuse
- OSRM API URL format: `http://router.project-osrm.org/route/v1/driving/{lng1},{lat1};{lng2},{lat2}`
- Note: OSRM uses lng,lat order

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 8.1 - OSRM HTTP client.
Tạo OsrmClient, OsrmProperties. getRoute returns distance/duration/geometry.
Config URL. Tests mocked. Chạy test.
```

---

## [x] Phase 8.2 - Route cache repository

### Goal

Implement route caching để giảm gọi OSRM API.

### What will be done

- Tạo `RouteCache` entity mapping `route_cache` table
- Tạo `RouteCacheRepository`
- Cache lookup by origin+destination+profile
- TTL logic (expires_at check)
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/route/domain/RouteCache.java` (mới)
- `backend/src/main/java/com/tripwise/modules/route/domain/RouteCacheRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/route/infrastructure/JpaRouteCacheRepository.java` (mới)
- `backend/src/test/java/com/tripwise/modules/route/` (tests)

### Done when

- Route cache lookup works
- TTL expiration works
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Cache key precision — round coordinates to avoid too many cache misses
- TTL default: 7 days (routes don't change often)

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 8.2 - Route cache repository.
RouteCache entity, repository. Cache lookup by points+profile. TTL logic. Tests. Chạy test.
```

---

## [ ] Phase 8.3 - Route calculation use case

### Goal

Tạo use case tính route với cache logic.

### What will be done

- Tạo `CalculateRouteUseCase`
- Flow: check cache → if miss → call OSRM → save cache → return
- Handle OSRM error → fallback straight-line estimate
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/route/application/CalculateRouteUseCase.java` (mới)
- `backend/src/test/java/com/tripwise/modules/route/` (tests)

### Done when

- Route calculation with cache works
- Cache hit skips OSRM call
- OSRM error handled with fallback
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Fallback distance estimate phải rõ ràng cho user
- Cache miss shouldn't fail entire request

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 8.3 - Route calculation use case.
Cache first, OSRM on miss, fallback on error. Tests. Chạy test.
```

---

## [x] Phase 8.4 - Integrate routing vào itinerary generation

### Goal

Tích hợp OSRM routing vào itinerary generation để tối ưu thứ tự và hiển thị route.

### What will be done

- Cập nhật itinerary generation để tính route giữa các places
- Store distance/duration giữa consecutive items
- Cập nhật grouping để ưu tiên nearby places cùng ngày (dùng real route distance thay vì straight-line)
- Cập nhật itinerary response include route info

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/itinerary/` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/itinerary/` (tests)

### Done when

- Itinerary items have route info between consecutive places
- Grouping uses real route distances
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Multiple OSRM calls can be slow — use cache aggressively
- OSRM rate limit: batch requests or add delays

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 8.4 - Integrate routing vào itinerary.
Route info between items. Real distances for grouping. Cache. Tests. Chạy test.
```

---

## [x] Phase 8.5 - Route API endpoint

### Goal

Tạo API endpoint để frontend request route giữa 2 points.

### What will be done

- Tạo GET `/api/v1/routes` với params: originLat, originLng, destLat, destLng, profile
- Return route with distance, duration, geometry (encoded polyline)
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/route/presentation/RouteController.java` (mới)
- `backend/src/main/java/com/tripwise/modules/route/application/dto/RouteResponse.java` (mới)
- `backend/src/test/java/com/tripwise/modules/route/` (tests)

### Done when

- GET `/api/v1/routes?originLat=...&originLng=...&destLat=...&destLng=...` trả route info
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Validate coordinates
- Rate limit this endpoint

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 8.5 - Route API endpoint.
GET /api/v1/routes. Validate coords. Return distance/duration/geometry. Tests. Chạy test.
```

---

## [ ] Phase 8.6 - Route module tests (mocked OSRM)

### Goal

Comprehensive tests cho Route module.

### What will be done

- Unit tests cho cache logic, route calculation
- Integration tests
- Mocked OSRM tests
- Edge case: OSRM down, invalid coordinates

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/route/` (bổ sung)

### Done when

- Coverage >80% cho Route module
- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Tests không nên call real OSRM API

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 8.6 - Route module tests.
Comprehensive tests, mocked OSRM. Edge cases. Chạy test.
```

---

### I. Weather Integration

---

## [ ] Phase 9.1 - Weather API client (Open-Meteo)

### Goal

Tạo HTTP client gọi Open-Meteo API (free, no API key needed).

### What will be done

- Tạo `WeatherClient` trong `modules/weather/infrastructure/`
- Tạo `WeatherProperties` config
- Implement `getForecast(lat, lng, startDate, endDate)` → WeatherForecast
- Parse Open-Meteo response
- Tests (mocked)

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/weather/infrastructure/WeatherClient.java` (mới)
- `backend/src/main/java/com/tripwise/modules/weather/infrastructure/WeatherProperties.java` (mới)
- `backend/src/main/java/com/tripwise/modules/weather/domain/WeatherForecast.java` (mới)
- `backend/src/main/resources/application.yml` (weather config)
- `backend/src/test/java/com/tripwise/modules/weather/` (tests)

### Done when

- WeatherClient can call Open-Meteo
- Response parsed correctly
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Open-Meteo is free but has rate limits
- Timeout config important

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 9.1 - Weather API client.
Open-Meteo API, no API key. getForecast. Parse response. Tests mocked. Chạy test.
```

---

## [ ] Phase 9.2 - Weather cache repository

### Goal

Implement weather caching theo bảng weather_cache.

### What will be done

- Tạo `WeatherCache` entity mapping `weather_cache`
- Tạo `WeatherCacheRepository`
- Cache lookup by city+date
- TTL logic
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/weather/domain/WeatherCache.java` (mới)
- `backend/src/main/java/com/tripwise/modules/weather/domain/WeatherCacheRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/weather/infrastructure/JpaWeatherCacheRepository.java` (mới)
- `backend/src/test/java/com/tripwise/modules/weather/` (tests)

### Done when

- Cache entity works
- TTL logic works
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Weather TTL: 6-12 hours (weather changes frequently)
- Cache key: city + date

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 9.2 - Weather cache repository.
WeatherCache entity, repository. TTL logic. Tests. Chạy test.
```

---

## [ ] Phase 9.3 - Weather forecast use case

### Goal

Tạo use case lấy weather forecast với cache.

### What will be done

- Tạo `GetWeatherForecastUseCase`
- Check cache → miss → call API → cache → return
- Handle API error → return last cached or "unavailable"
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/weather/application/GetWeatherForecastUseCase.java` (mới)
- `backend/src/test/java/com/tripwise/modules/weather/` (tests)

### Done when

- Forecast with cache works
- API error handled
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Weather API failure shouldn't block trip generation

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 9.3 - Weather forecast use case.
Cache first, API on miss. Fallback on error. Tests. Chạy test.
```

---

## [ ] Phase 9.4 - Weather adjustment cho itinerary

### Goal

Điều chỉnh itinerary dựa trên dự báo thời tiết.

### What will be done

- Tạo `WeatherAdjustmentService`
- Logic:
  - Mưa lớn → suggest indoor activities, move beach to another day
  - Nắng → OK for outdoor
  - Storm → warning
- Cập nhật itinerary generation để include weather check
- Store weather summary in itinerary_days
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/weather/application/WeatherAdjustmentService.java` (mới)
- `backend/src/main/java/com/tripwise/modules/itinerary/` (cập nhật)
- `backend/src/test/java/com/tripwise/modules/weather/` (tests)

### Done when

- Itinerary adjusted based on weather
- Weather summary in itinerary days
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Weather data might not be available for future dates → handle gracefully
- Don't over-adjust — just suggest

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 9.4 - Weather adjustment.
WeatherAdjustmentService. Adjust itinerary for rain/storm. Weather summary per day. Tests. Chạy test.
```

---

## [x] Phase 9.5 - Weather API endpoint

### Goal

Tạo weather API cho frontend.

### What will be done

- Tạo GET `/api/v1/weather/{city}?startDate=...&endDate=...`
- Return weather forecast for date range
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/weather/presentation/WeatherController.java` (mới)
- `backend/src/main/java/com/tripwise/modules/weather/application/dto/WeatherResponse.java` (mới)
- `backend/src/test/java/com/tripwise/modules/weather/` (tests)

### Done when

- Weather API returns forecast
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

curl "http://localhost:8080/api/v1/weather/Nha%20Trang?startDate=2026-07-01&endDate=2026-07-03"
```

### Risks

- Validate date range (not too far in future)

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 9.5 - Weather API endpoint.
GET /api/v1/weather/{city}. Date range. Tests. Chạy test.
```

---

## [ ] Phase 9.6 - Weather module tests

### Goal

Comprehensive tests cho Weather module.

### What will be done

- Full test suite
- Mocked API tests
- Cache tests
- Edge cases

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/weather/` (bổ sung)

### Done when

- Coverage >80%
- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- None specific

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 9.6 - Weather module tests. Comprehensive tests. Chạy test.
```

---

### J. Hotel / Transport Suggestions

---

## [x] Phase 10.1 - Hotel entity và repository

### Goal

Tạo Hotel entity mapping bảng `hotels`.

### What will be done

- Tạo `Hotel` entity với PostGIS location
- Tạo `HotelRepository`
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/hotel/domain/Hotel.java` (mới)
- `backend/src/main/java/com/tripwise/modules/hotel/domain/HotelRepository.java` (mới)
- `backend/src/main/java/com/tripwise/modules/hotel/infrastructure/JpaHotelRepository.java` (mới)
- `backend/src/test/java/com/tripwise/modules/hotel/` (tests)

### Done when

- Hotel entity maps correctly
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- PostGIS geography type like Place

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 10.1 - Hotel entity và repository.
Hotel entity với PostGIS location. Repository. Tests. Chạy test.
```

---

## [x] Phase 10.2 - Hotel seed data

### Goal

Seed hotel data cho Nha Trang.

### What will be done

- Flyway migration V4 seed 10-15 hotels Nha Trang với tọa độ thật
- Various star ratings, price ranges

### Files/Folders likely changed

- `backend/src/main/resources/db/migration/V4__seed_nha_trang_hotels.sql` (mới)

### Done when

- Migration runs successfully
- Hotels in database

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
docker exec -e PGPASSWORD=tripwise_local_password -it tripwise-db-local ^
  psql -U tripwise_user -d tripwise -c "SELECT name, star_rating, city FROM hotels;"
```

### Risks

- Real coordinates, verified

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 10.2 - Hotel seed data.
Flyway V4 seed 10-15 Nha Trang hotels thật. Tọa độ chính xác. Various star/price. Chạy migration.
```

---

## [x] Phase 10.3 - Hotel suggestion API (by area/budget)

### Goal

Tạo MVP hotel suggestion endpoint.

### What will be done

- Tạo `SuggestHotelsUseCase`
- GET `/api/v1/hotels/suggestions?city=...&budget=...&starRating=...`
- PostGIS nearby query optional
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/hotel/application/SuggestHotelsUseCase.java` (mới)
- `backend/src/main/java/com/tripwise/modules/hotel/application/dto/HotelResponse.java` (mới)
- `backend/src/main/java/com/tripwise/modules/hotel/presentation/HotelController.java` (mới)
- `backend/src/test/java/com/tripwise/modules/hotel/` (tests)

### Done when

- Hotel suggestions API works
- Filter by city/budget/star
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test

curl "http://localhost:8080/api/v1/hotels/suggestions?city=Nha%20Trang"
```

### Risks

- MVP only — no real booking

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 10.3 - Hotel suggestion API.
GET /api/v1/hotels/suggestions. Filter by city/budget/star. MVP. Tests. Chạy test.
```

---

## [x] Phase 10.4 - Transport suggestion logic (MVP)

### Goal

Tạo basic transport suggestion.

### What will be done

- Tạo `TransportSuggestionService`
- MVP logic: suggest transport mode based on distance (walk <1km, taxi <10km, bus etc.)
- Include trong itinerary response
- Tests

### Files/Folders likely changed

- `backend/src/main/java/com/tripwise/modules/transport/application/TransportSuggestionService.java` (mới)
- `backend/src/test/java/com/tripwise/modules/transport/` (tests)

### Done when

- Transport suggestion based on distance works
- Tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Keep MVP simple — just distance-based suggestion

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 10.4 - Transport suggestion MVP.
Distance-based transport mode suggestion. Tests. Chạy test.
```

---

## [x] Phase 10.5 - Hotel/Transport tests

### Goal

Comprehensive tests.

### What will be done

- Tests cho hotel and transport modules
- Edge cases

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/modules/hotel/` (bổ sung)
- `backend/src/test/java/com/tripwise/modules/transport/` (bổ sung)

### Done when

- All tests pass

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- None specific

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 10.5 - Hotel/Transport tests. Comprehensive tests. Chạy test.
```

---

### K. Backend Integration và Polish

---

## [x] Phase 11.1 - End-to-end trip generation flow test

### Goal

Test toàn bộ flow: register → login → generate trip → view trip → delete trip.

### What will be done

- Tạo `TripGenerationE2ETest` integration test
- Test full flow with Testcontainers
- Verify all data correct

### Files/Folders likely changed

- `backend/src/test/java/com/tripwise/e2e/TripGenerationE2ETest.java` (mới)

### Done when

- Full flow test pass end-to-end
- All data consistent

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
```

### Risks

- Test cần mocked Gemini and OSRM
- Test setup complexity

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 11.1 - E2E trip generation test.
Register → login → generate → view → delete. Testcontainers. Mocked external APIs. Chạy test.
```

---

## [x] Phase 11.2 - API documentation (Springdoc/OpenAPI)

### Goal

Tự động generate API documentation.

### What will be done

- Thêm springdoc-openapi-starter-webmvc-ui dependency
- Configure Swagger UI at `/swagger-ui.html`
- Add OpenAPI annotations to controllers
- Đảm bảo Swagger UI accessible nhưng protected trong production

### Files/Folders likely changed

- `backend/pom.xml` (thêm springdoc dep)
- `backend/src/main/resources/application.yml` (springdoc config)
- Controllers (thêm @Operation, @Tag annotations)
- `backend/src/main/java/com/tripwise/config/SecurityConfig.java` (allow swagger)

### Done when

- Swagger UI accessible at http://localhost:8080/swagger-ui.html
- All endpoints documented
- Auth endpoints work trong Swagger

### How to verify

```bash
cd backend
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
# Open http://localhost:8080/swagger-ui.html
```

### Risks

- Swagger UI phải disabled hoặc protected trong production
- Không expose internal API details

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 11.2 - API documentation.
Thêm springdoc-openapi. Swagger UI. Annotate controllers. Protect in prod. Chạy bootRun verify.
```

---

## [x] Phase 11.3 - Backend performance review

### Goal

Review và optimize backend performance trước khi làm frontend.

### What will be done

- Review N+1 queries — add fetch joins where needed
- Review database indexes — add missing indexes
- Add connection pool config (HikariCP tuning)
- Review Redis cache opportunities
- Review API response times

### Files/Folders likely changed

- Repository classes (fetch join)
- `application.yml` (connection pool, Redis config)
- Flyway migration V5 (nếu cần thêm index)

### Done when

- No N+1 queries
- Connection pool configured
- Response times <500ms for common queries

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Enable SQL logging, check no N+1
```

### Risks

- Don't over-optimize — focus on obvious issues

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 11.3 - Backend performance review.
Check N+1 queries, indexes, connection pool. Fix issues found. Chạy test.
```

---

## [x] Phase 11.4 - Security review backend

### Goal

Security review trước khi expose API cho frontend.

### What will be done

- Verify no secrets in response
- Verify no stack traces in error responses
- Verify CORS config
- Verify JWT security
- Verify input validation on all endpoints
- Verify SQL injection prevention
- Verify rate limiting works

### Files/Folders likely changed

- Các file security nếu cần fix

### Done when

- Security checklist pass
- No vulnerabilities found

### How to verify

```bash
cd backend
.\mvnw.cmd clean test
# Manual security testing
```

### Risks

- Must be thorough — security issues are critical

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 11.4 - Security review.
Kiểm tra: no secrets in response, no stack traces, CORS, JWT, validation, SQL injection, rate limit.
Fix nếu có issues. Chạy test.
```

---

### L. Frontend Web

---

## [ ] Phase 12.1 - React/Next.js project setup

### Goal

Tạo frontend web project.

### What will be done

- Tạo Next.js project trong `web/` directory (theo docs hiện có)
- Setup TypeScript
- Setup ESLint + Prettier
- Setup env config (.env.local)
- Verify dev server runs

### Files/Folders likely changed

- `web/` (toàn bộ directory mới)
- `web/package.json`
- `web/.env.local`
- `web/.env.example`

### Done when

- `npm run dev` starts dev server
- Default page loads in browser
- TypeScript + ESLint configured

### How to verify

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

### Risks

- Đảm bảo .env.local trong .gitignore
- Node.js 18+ required

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.1 - Frontend web project setup.
Next.js trong web/. TypeScript. ESLint. Env config. Verify dev server. Không viết business logic.
```

---

## [ ] Phase 12.2 - Design system và UI framework

### Goal

Setup design system, CSS framework, và common UI components.

### What will be done

- Setup CSS strategy (Tailwind CSS hoặc CSS Modules)
- Setup Google Fonts (Inter/Roboto)
- Create color palette, spacing, typography tokens
- Create common components: Button, Input, Card, Loading, ErrorMessage
- Dark mode support foundation

### Files/Folders likely changed

- `web/src/styles/` (mới)
- `web/src/components/common/` (mới)
- `web/tailwind.config.js` (nếu dùng Tailwind)

### Done when

- Common components render correctly
- Design system tokens defined
- Consistent look and feel

### How to verify

```bash
cd web
npm run dev
# View components in browser
```

### Risks

- Chọn đúng CSS strategy từ đầu
- Responsive from the start

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.2 - Design system.
Setup CSS, fonts, color palette. Common components: Button, Input, Card, Loading, Error.
Responsive. Verify in browser.
```

---

## [ ] Phase 12.3 - API client và auth interceptor

### Goal

Tạo API client layer cho frontend giao tiếp với backend.

### What will be done

- Tạo API client (axios hoặc fetch wrapper)
- Base URL config from env
- Auth interceptor: add JWT to requests
- Token refresh interceptor: auto refresh on 401
- Error handling interceptor
- TypeScript types cho API responses

### Files/Folders likely changed

- `web/src/lib/api/` (mới)
- `web/src/types/` (mới)

### Done when

- API client can call backend
- JWT token auto-attached
- Token refresh works
- Error handling consistent

### How to verify

```bash
cd web
npm run dev
# Test API calls in browser console
```

### Risks

- Token storage: use httpOnly cookie hoặc memory (không localStorage cho access token)
- CORS must be configured on backend

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.3 - API client và auth interceptor.
Axios/fetch wrapper. JWT interceptor. Token refresh. Error handling. TypeScript types.
```

---

## [ ] Phase 12.4 - Auth pages (Register/Login)

### Goal

Tạo trang Register và Login.

### What will be done

- Tạo Register page (/register)
- Tạo Login page (/login)
- Form validation
- Error display
- Redirect after login
- Auth state management (Context hoặc Zustand)

### Files/Folders likely changed

- `web/src/app/register/` (mới)
- `web/src/app/login/` (mới)
- `web/src/contexts/AuthContext.tsx` (mới)

### Done when

- Register flow works
- Login flow works
- Auth state persisted
- Form validation works
- Redirect to dashboard after login

### How to verify

```bash
# Start backend và frontend
# Register → Login → verify auth state
```

### Risks

- Secure token storage
- CSRF protection if using cookies

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.4 - Auth pages.
Register (/register), Login (/login). Form validation. Auth context. Redirect after login.
```

---

## [ ] Phase 12.5 - Trip request form

### Goal

Tạo form nhập yêu cầu du lịch bằng tiếng Việt tự nhiên.

### What will be done

- Tạo trip request page (/trips/new)
- Textarea cho natural language input
- Optional form fields: destination, dates, budget, interests
- Submit → call generate API
- Loading state during AI processing
- Error handling

### Files/Folders likely changed

- `web/src/app/trips/new/` (mới)

### Done when

- User can type travel request
- Form submits to backend
- Loading state shows during processing
- Error messages display

### How to verify

```bash
# Navigate to /trips/new
# Type request → Submit → See loading → See result
```

### Risks

- AI processing may take time — show loading
- Handle timeout gracefully

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.5 - Trip request form.
Natural language textarea. Optional fields. Submit to API. Loading state. Error handling.
```

---

## [ ] Phase 12.6 - Itinerary result page

### Goal

Hiển thị kết quả lịch trình du lịch.

### What will be done

- Tạo itinerary result page (/trips/{id})
- Display day-by-day itinerary
- Each day: list of places with time slots
- Place details: name, description, duration, AI description
- Route info between places
- Save trip button

### Files/Folders likely changed

- `web/src/app/trips/[id]/` (mới)
- `web/src/components/itinerary/` (mới)

### Done when

- Itinerary displays correctly
- Day/time-slot layout clear
- Place details shown
- Route info between places

### How to verify

```bash
# Generate trip → View itinerary result
```

### Risks

- Data structure must match API response

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.6 - Itinerary result page.
Day-by-day display. Place details. AI descriptions. Route info. Save button.
```

---

## [ ] Phase 12.7 - Leaflet map integration

### Goal

Hiển thị bản đồ OpenStreetMap với Leaflet, show places trên map.

### What will be done

- Install react-leaflet
- Tạo Map component
- Display markers cho places trong itinerary
- Popup cho mỗi marker (place info)
- Center map on destination
- Zoom to fit all markers

### Files/Folders likely changed

- `web/package.json` (thêm react-leaflet)
- `web/src/components/map/` (mới)

### Done when

- Map renders with OpenStreetMap tiles
- Markers show for places
- Popups work
- Map auto-centers

### How to verify

```bash
# View itinerary → Map shows with markers
```

### Risks

- Leaflet CSS must be imported
- SSR compatibility with Next.js (use dynamic import)
- Public OpenStreetMap tile server có thể ổn cho local/dev nhưng không nên mặc định giữ nguyên cho production traffic lớn

### Production reminder

Trước khi deploy production, cần thay hoặc xác nhận lại các điểm sau:

- Nếu frontend còn dùng `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, phải đánh giá chuyển sang tile provider production hoặc self-host; đồng thời giữ attribution đúng policy
- Nếu backend còn dùng `https://router.project-osrm.org`, phải chuyển sang OSRM self-host hoặc provider route ổn định hơn cho production
- `NEXT_PUBLIC_API_BASE_URL` phải đổi sang domain production thật, không để `localhost`
- `GEMINI_API_KEY`, JWT secret, DB credentials, Redis credentials phải lấy từ environment variables hoặc secret manager production, không dùng giá trị local/default
- CORS và allowlist domain phải siết theo domain production thật

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.7 - Leaflet map.
React-leaflet. OpenStreetMap tiles. Markers with popups. Auto-center/zoom.
Handle SSR with dynamic import.
```

---

## [ ] Phase 12.8 - Route polyline trên map

### Goal

Hiển thị route polyline giữa places trên map.

### What will be done

- Decode OSRM geometry (encoded polyline)
- Draw polylines between consecutive places
- Color coding per day
- Legend

### Files/Folders likely changed

- `web/src/components/map/` (cập nhật)
- `web/src/lib/polyline.ts` (mới — polyline decoder)

### Done when

- Route lines shown on map
- Different colors per day
- Visual clarity

### How to verify

```bash
# View itinerary → Map shows routes between places
```

### Risks

- Polyline decoding must be correct
- Performance with many points

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.8 - Route polyline.
Decode OSRM geometry. Draw polylines. Color per day. Legend.
```

---

## [ ] Phase 12.9 - Saved trips page

### Goal

Tạo trang xem danh sách trips đã lưu.

### What will be done

- Tạo saved trips page (/trips)
- List user's trips with title, destination, dates
- Pagination
- Click to view detail
- Delete trip button

### Files/Folders likely changed

- `web/src/app/trips/` (mới/cập nhật)

### Done when

- List trips page works
- Pagination works
- Delete works
- Navigation to detail works

### How to verify

```bash
# Login → View saved trips → Click detail → Delete
```

### Risks

- Confirm before delete

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.9 - Saved trips page.
List trips. Pagination. View detail. Delete with confirm.
```

---

## [ ] Phase 12.10 - Loading/error states và UX polish

### Goal

Polish UX across all pages.

### What will be done

- Consistent loading spinners
- Error messages with retry buttons
- Empty states
- Toast notifications
- Transitions/animations
- Skeleton loading

### Files/Folders likely changed

- Various components

### Done when

- All pages have proper loading/error states
- UX feels polished

### How to verify

```bash
# Test all pages with slow network / API errors
```

### Risks

- Don't over-animate

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.10 - UX polish.
Loading spinners, error messages, empty states, toasts, transitions, skeleton loading.
```

---

## [ ] Phase 12.11 - Responsive UI

### Goal

Đảm bảo UI hoạt động tốt trên mobile/tablet/desktop.

### What will be done

- Responsive layout cho tất cả pages
- Mobile navigation
- Map responsive
- Form responsive

### Files/Folders likely changed

- CSS/style files
- Layout components

### Done when

- UI works on 320px to 1920px widths
- Navigation works on mobile

### How to verify

```bash
# Test with browser dev tools responsive mode
```

### Risks

- Map might need special handling on mobile

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.11 - Responsive UI.
Responsive layout all pages. Mobile navigation. Test 320px to 1920px.
```

---

## [ ] Phase 12.12 - Frontend tests

### Goal

Frontend testing.

### What will be done

- Setup Jest + React Testing Library
- Unit tests cho components
- Integration tests cho pages
- API mocking

### Files/Folders likely changed

- `web/src/__tests__/` (mới)
- `web/jest.config.js` (mới)

### Done when

- Tests pass
- Key flows covered

### How to verify

```bash
cd web
npm test
```

### Risks

- SSR components may need special test setup

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 12.12 - Frontend tests.
Jest + RTL. Component tests. Page tests. API mocking. Chạy test.
```

---

### M. Mobile Flutter

---

## [ ] Phase 13.1 - Flutter project setup

### Goal

Tạo Flutter project cho mobile app.

### What will be done

- Tạo Flutter project trong `mobile/`
- Setup project structure
- Setup package dependencies (http, provider/riverpod)
- Configure env (API base URL)
- Verify build trên emulator

### Files/Folders likely changed

- `mobile/` (toàn bộ mới)

### Done when

- Flutter project builds
- Default screen runs on emulator
- Dependencies installed

### How to verify

```bash
cd mobile
flutter pub get
flutter run
```

### Risks

- Flutter SDK version compatibility
- Android/iOS emulator required

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.1 - Flutter project setup.
Flutter project trong mobile/. Structure, dependencies, env config. Verify on emulator.
```

---

## [ ] Phase 13.2 - API client và auth flow

### Goal

API client và authentication cho mobile.

### What will be done

- HTTP client (dio)
- Auth interceptor
- Token storage (flutter_secure_storage)
- Login/Register screens
- Auth state management

### Files/Folders likely changed

- `mobile/lib/core/` (mới)
- `mobile/lib/features/auth/` (mới)

### Done when

- Register and login work on mobile
- Token management works

### How to verify

```bash
# Run app → Register → Login → Verify auth state
```

### Risks

- Secure token storage essential on mobile

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.2 - Mobile API client và auth.
Dio HTTP client. Auth interceptor. Secure storage. Login/Register. Auth state.
```

---

## [ ] Phase 13.3 - Trip generation screen

### Goal

Tạo screen nhập yêu cầu du lịch trên mobile.

### Files/Folders likely changed

- `mobile/lib/features/trip/` (mới)

### Done when

- Trip request form works on mobile
- Loading state during processing

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.3 - Mobile trip generation screen.
Natural language input. Submit to API. Loading state.
```

---

## [ ] Phase 13.4 - Itinerary display screen

### Goal

Hiển thị itinerary trên mobile.

### Files/Folders likely changed

- `mobile/lib/features/itinerary/` (mới)

### Done when

- Itinerary displays correctly on mobile

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.4 - Mobile itinerary screen.
Day-by-day display. Place details. Scrollable.
```

---

## [ ] Phase 13.5 - Map screen (Flutter map)

### Goal

Bản đồ OpenStreetMap trên mobile.

### Files/Folders likely changed

- `mobile/lib/features/map/` (mới)

### Done when

- Map shows with markers and routes

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.5 - Mobile map screen.
flutter_map + OpenStreetMap. Markers. Route polylines.
```

---

## [ ] Phase 13.6 - Saved trips screen

### Goal

Xem danh sách trips đã lưu trên mobile.

### Files/Folders likely changed

- `mobile/lib/features/trips/` (mới)

### Done when

- List trips. View detail. Delete.

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.6 - Mobile saved trips.
List, detail, delete. Pagination.
```

---

## [ ] Phase 13.7 - State management (Riverpod/Bloc)

### Goal

Proper state management setup.

### Files/Folders likely changed

- `mobile/lib/` (refactor)

### Done when

- Consistent state management across screens

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.7 - Mobile state management.
Riverpod hoặc Bloc. Consistent across screens.
```

---

## [ ] Phase 13.8 - Mobile tests

### Goal

Flutter tests.

### Files/Folders likely changed

- `mobile/test/` (mới)

### Done when

- Widget tests pass. Unit tests pass.

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 13.8 - Mobile tests.
Widget tests. Unit tests. API mocking.
```

---

### N. DevOps / CI/CD

---

## [ ] Phase 14.1 - Dockerfile backend (multi-stage)

### Goal

Tạo Dockerfile cho backend.

### What will be done

- Multi-stage Dockerfile: build stage (Maven) → runtime stage (JRE 21)
- Minimal image size
- Non-root user
- Health check

### Files/Folders likely changed

- `backend/Dockerfile` (mới)
- `.dockerignore` (mới hoặc cập nhật)

### Done when

- `docker build` thành công
- Container runs backend
- Health check works

### How to verify

```bash
cd backend
docker build -t tripwise-backend .
docker run -p 8080:8080 tripwise-backend
curl http://localhost:8080/api/v1/health
```

### Risks

- Maven cache in Docker layer — optimize
- JRE image size — use slim/alpine variant

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 14.1 - Dockerfile backend.
Multi-stage: Maven build → JRE 21 runtime. Non-root user. Health check. Optimize layers.
```

---

## [ ] Phase 14.2 - Docker Compose production-like

### Goal

Tạo Docker Compose config cho production-like environment.

### What will be done

- Tạo `docker-compose.prod.yml`
- Backend container
- PostgreSQL with production settings
- Redis
- Nginx reverse proxy
- Environment variables

### Files/Folders likely changed

- `docker-compose.prod.yml` (mới)
- `infra/nginx/` (mới)

### Done when

- `docker compose -f docker-compose.prod.yml up` runs full stack
- Nginx reverse proxy works

### How to verify

```bash
docker compose -f docker-compose.prod.yml up -d
curl http://localhost
```

### Risks

- Secrets via env vars, not in compose file

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 14.2 - Docker Compose production-like.
Backend + PostgreSQL + Redis + Nginx. Production settings. Env vars for secrets.
```

---

## [ ] Phase 14.3 - GitHub Actions: build và test

### Goal

CI pipeline cho automated build và test.

### What will be done

- Tạo `.github/workflows/ci.yml`
- On PR to develop/main: checkout → setup JDK 21 → Maven build → test → report
- Cache Maven dependencies

### Files/Folders likely changed

- `.github/workflows/ci.yml` (mới)

### Done when

- GitHub Actions runs on PR
- Build and test pass

### How to verify

```
Push PR → Check GitHub Actions tab
```

### Risks

- Testcontainers trong CI cần Docker-in-Docker hoặc service containers

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 14.3 - GitHub Actions CI.
Build + test on PR. JDK 21. Maven cache. Testcontainers support.
```

---

## [ ] Phase 14.4 - GitHub Actions: Docker image build

### Goal

CI/CD build Docker image.

### What will be done

- Extend CI workflow: build Docker image on merge to main
- Push to Docker registry (GitHub Container Registry hoặc Docker Hub)
- Tag with version/commit SHA

### Files/Folders likely changed

- `.github/workflows/ci.yml` (cập nhật)

### Done when

- Docker image built and pushed on merge

### How to verify

```
Merge to main → Check Docker registry for new image
```

### Risks

- Registry credentials as GitHub secrets

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 14.4 - Docker image build in CI.
Build + push Docker image on merge to main. Tag with version. Registry secrets.
```

---

## [ ] Phase 14.5 - Environment secrets strategy

### Goal

Document và implement secrets management.

### What will be done

- Document all secrets needed
- GitHub Secrets for CI/CD
- Environment files for deployment
- No secrets in code/config

### Files/Folders likely changed

- `.env.example` (cập nhật)
- `docs/06-devops/` (cập nhật)

### Done when

- All secrets documented
- Strategy clear for local/CI/production

### How to verify

```bash
# Grep codebase for hardcoded secrets
```

### Risks

- Must be thorough

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 14.5 - Secrets strategy.
Document all secrets. GitHub Secrets for CI. Env files for deploy. Audit code for leaks.
```

---

## [ ] Phase 14.6 - Database migration strategy production

### Goal

Define migration strategy cho production database.

### What will be done

- Document Flyway migration rules
- Backup before migration
- Rollback strategy
- Migration testing in staging

### Files/Folders likely changed

- `docs/06-devops/` (cập nhật)

### Done when

- Migration strategy documented
- Backup procedure defined

### How to verify

```
# Review documentation
```

### Risks

- Production data loss prevention critical

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 14.6 - DB migration strategy.
Document Flyway rules, backup before migrate, rollback strategy, staging test.
```

---

### O. Production Deploy

---

## [ ] Phase 15.1 - Choose hosting và provision server

### Goal

Chọn hosting và setup server cho production.

### What will be done

- Evaluate hosting options (VPS, cloud VM, managed containers)
- Provision server
- Install Docker
- Setup firewall
- Setup SSH access

### Files/Folders likely changed

- `docs/06-devops/03-deployment-guide.md` (cập nhật)

### Done when

- Server provisioned
- Docker installed
- SSH access configured
- Firewall configured

### How to verify

```bash
ssh user@server docker --version
```

### Risks

- Security: SSH keys only, no password auth
- Firewall: only expose needed ports

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.1 - Provision server.
Choose hosting. Install Docker. Firewall. SSH keys. Document.
```

---

## [ ] Phase 15.2 - Setup reverse proxy (Nginx) và SSL

### Goal

Setup Nginx reverse proxy với SSL certificate.

### What will be done

- Install Nginx
- Configure reverse proxy to backend
- Setup Let's Encrypt SSL
- Auto-renewal

### Files/Folders likely changed

- `infra/nginx/` (configs)

### Done when

- HTTPS works
- Reverse proxy forwards to backend
- SSL auto-renews

### How to verify

```bash
curl https://yourdomain.com/api/v1/health
```

### Risks

- DNS must be configured first
- SSL cert validation

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.2 - Nginx + SSL.
Reverse proxy. Let's Encrypt. Auto-renewal. Test HTTPS.
```

---

## [ ] Phase 15.3 - Deploy backend

### Goal

Deploy backend lên production server.

### What will be done

- Pull Docker image
- Run with production env vars
- Connect to production database
- Health check

### Files/Folders likely changed

- Deployment scripts

### Done when

- Backend running on production
- Health endpoint returns UP

### How to verify

```bash
curl https://yourdomain.com/api/v1/health
```

### Risks

- Production env vars must be set correctly
- Database connection must work

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.3 - Deploy backend.
Pull image, run with prod env vars, verify health endpoint.
```

---

## [ ] Phase 15.4 - Deploy frontend web

### Goal

Deploy frontend lên production.

### What will be done

- Build frontend production bundle
- Deploy (Nginx static files hoặc Vercel hoặc container)
- Configure API endpoint
- Review lại cấu hình map tiles nếu frontend còn trỏ vào public OpenStreetMap tile server

### Files/Folders likely changed

- Frontend build config
- Nginx config (nếu serve static)

### Done when

- Frontend accessible via domain
- API calls work

### How to verify

```bash
# Open https://yourdomain.com in browser
```

### Risks

- API URL must be correct
- CORS must allow production domain
- Public tile server/dev config không phù hợp nếu production traffic tăng

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.4 - Deploy frontend.
Build production. Deploy. Configure API URL. Verify.
```

---

## [ ] Phase 15.5 - Production database setup và migration

### Goal

Setup production PostgreSQL và run migrations.

### What will be done

- Setup managed PostgreSQL (hoặc Docker on server)
- PostGIS extension
- Create database and user
- Run Flyway migrations
- Seed initial data

### Files/Folders likely changed

- Deployment scripts

### Done when

- Production DB running
- Migrations applied
- Seed data loaded

### How to verify

```bash
# Connect to prod DB, verify tables and data
```

### Risks

- Production DB credentials must be secure
- Backup before any migration

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.5 - Production DB.
PostgreSQL + PostGIS. Create DB/user. Run migrations. Seed data. Backup.
```

---

## [ ] Phase 15.6 - Production smoke test

### Goal

Verify tất cả hoạt động trên production.

### What will be done

- Test all endpoints
- Register → Login → Generate trip → View → Delete
- Check map loads
- Check weather
- Performance check
- Xác nhận frontend không còn trỏ `localhost`, map tile không còn phụ thuộc cấu hình dev, và backend không còn dùng secret/default demo values

### Files/Folders likely changed

- Không (chỉ test)

### Done when

- Full flow works on production
- Performance acceptable

### How to verify

```bash
# Manual testing on production URL
```

### Risks

- Don't test destructive operations carelessly

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.6 - Production smoke test.
Test all flows. Register, login, generate trip, view, delete. Performance. Map. Weather.
```

---

## [ ] Phase 15.7 - Backup schedule

### Goal

Setup automated backup cho production database.

### What will be done

- Setup pg_dump cron job
- Store backups in object storage
- Retention policy (7 daily, 4 weekly)
- Test restore

### Files/Folders likely changed

- `infra/scripts/backup.sh` (mới)

### Done when

- Backup runs daily
- Restore tested
- Retention policy enforced

### How to verify

```bash
# Check backup files exist
# Test restore to staging
```

### Risks

- Backup must include PostGIS data
- Test restore regularly

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 15.7 - Backup schedule.
pg_dump daily. Object storage. Retention policy. Test restore.
```

---

### P. Production Readiness / Security

---

## [ ] Phase 16.1 - CORS production configuration

### Goal

Configure CORS đúng cho production.

### What will be done

- CORS chỉ allow production domain
- Không wildcard
- Proper methods/headers config

### Files/Folders likely changed

- Backend CORS config

### Done when

- CORS works for production domain only
- No wildcard

### How to verify

```bash
# Test CORS headers from different origins
```

### Risks

- Must test thoroughly

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.1 - CORS production.
Configure CORS cho production domain only. No wildcard. Test.
```

---

## [ ] Phase 16.2 - Actuator protection production

### Goal

Protect actuator endpoints trong production.

### What will be done

- Only health/liveness/readiness public
- Other endpoints protected hoặc disabled
- Spring Security config

### Files/Folders likely changed

- SecurityConfig
- application-prod.yml

### Done when

- Actuator protected in production

### How to verify

```bash
curl https://yourdomain.com/actuator/env
# Should return 401/403
```

### Risks

- Don't accidentally expose sensitive actuator endpoints

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.2 - Actuator protection.
Only health/liveness/readiness public. Others protected. Test.
```

---

## [ ] Phase 16.3 - JWT secret management production

### Goal

Ensure JWT secret properly managed in production.

### What will be done

- Generate strong JWT secret
- Store as environment variable
- Rotate secret procedure documented

### Files/Folders likely changed

- Deployment docs

### Done when

- Strong JWT secret in production
- Rotation procedure documented

### How to verify

```bash
# Verify env var set on server
```

### Risks

- Weak secret = security vulnerability

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.3 - JWT secret production.
Generate strong secret. Env var. Document rotation procedure.
```

---

## [ ] Phase 16.4 - Rate limiting production

### Goal

Verify rate limiting works in production.

### What will be done

- Verify auth rate limits
- Add rate limit for trip generation
- Monitor rate limit triggers

### Files/Folders likely changed

- Rate limit config

### Done when

- Rate limits enforced in production

### How to verify

```bash
# Test rate limit on production
```

### Risks

- Rate limits not too aggressive for real users

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.4 - Rate limiting production.
Verify and tune rate limits. Trip generation rate limit. Monitor.
```

---

## [ ] Phase 16.5 - Dependency vulnerability scan

### Goal

Scan dependencies cho known vulnerabilities.

### What will be done

- Run dependency check (OWASP dependency-check hoặc Maven plugin)
- Fix critical vulnerabilities
- Setup automated scan in CI

### Files/Folders likely changed

- `backend/pom.xml` (plugin)
- `.github/workflows/` (CI update)

### Done when

- No critical vulnerabilities
- Automated scan in CI

### How to verify

```bash
cd backend
.\Mavenw.bat dependencyCheckAnalyze
```

### Risks

- Some vulnerabilities may not have fixes yet

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.5 - Dependency vulnerability scan.
OWASP dependency-check. Fix criticals. CI integration. Chạy scan.
```

---

## [ ] Phase 16.6 - Logging sensitive data audit

### Goal

Audit logs cho sensitive data leaks.

### What will be done

- Review all log statements
- Ensure no passwords, tokens, API keys logged
- Ensure stack traces not in client responses

### Files/Folders likely changed

- Various files nếu có issues

### Done when

- No sensitive data in logs
- Audit complete

### How to verify

```bash
# Review log output during testing
```

### Risks

- Must be thorough

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.6 - Logging audit.
Review all log statements. No passwords/tokens/keys. Fix if found.
```

---

## [ ] Phase 16.7 - Load test cơ bản

### Goal

Basic load test để đảm bảo production xử lý được traffic.

### What will be done

- Setup k6 hoặc JMeter
- Test key endpoints: health, login, places search, trip generation
- Target: 100 concurrent users
- Identify bottlenecks

### Files/Folders likely changed

- `infra/loadtest/` (mới)

### Done when

- Load test runs
- No crashes under 100 concurrent users
- Bottlenecks identified

### How to verify

```bash
# Run load test
# Check results report
```

### Risks

- Don't run against production without coordination
- Trip generation rate limited — adjust test

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.7 - Load test.
k6 hoặc JMeter. Health, login, places, trip generation. 100 concurrent users. Report.
```

---

## [ ] Phase 16.8 - Disaster recovery checklist

### Goal

Document disaster recovery procedures.

### What will be done

- Document recovery steps for: DB failure, server failure, security breach
- Test backup restore
- Define RTO/RPO
- Document incident response procedure

### Files/Folders likely changed

- `docs/06-devops/` (mới doc)

### Done when

- DR checklist documented
- Backup restore tested

### How to verify

```
# Review documentation
# Execute backup restore test
```

### Risks

- Must be tested, not just documented

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 16.8 - Disaster recovery.
Document DR procedures. Test backup restore. Define RTO/RPO. Incident response.
```

---

### Q. Final Documentation

---

## [ ] Phase 17.1 - API documentation hoàn chỉnh

### Goal

API docs đầy đủ cho developers.

### What will be done

- Review OpenAPI/Swagger docs
- Ensure all endpoints documented
- Add examples
- Export to static HTML/Markdown

### Files/Folders likely changed

- `docs/04-architecture/04-api-design.md` (cập nhật)

### Done when

- All endpoints documented with examples

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 17.1 - API documentation.
Review OpenAPI. All endpoints documented. Examples. Export.
```

---

## [ ] Phase 17.2 - Architecture diagram cập nhật

### Goal

Architecture diagram phản ánh hệ thống thực tế.

### What will be done

- Update system architecture diagram
- Module interaction diagram
- Database ER diagram
- Deployment diagram

### Files/Folders likely changed

- `docs/04-architecture/` (cập nhật)

### Done when

- Diagrams accurate and current

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 17.2 - Architecture diagram.
System, module, database, deployment diagrams. Mermaid hoặc draw.io.
```

---

## [ ] Phase 17.3 - Deployment guide cập nhật

### Goal

Deployment guide phản ánh setup thực tế.

### What will be done

- Update docs/06-devops/03-deployment-guide.md
- Step-by-step deployment procedure
- Rollback procedure
- Troubleshooting guide

### Files/Folders likely changed

- `docs/06-devops/03-deployment-guide.md` (cập nhật)

### Done when

- Guide accurate and testable

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 17.3 - Deployment guide.
Step-by-step. Rollback. Troubleshooting.
```

---

## [ ] Phase 17.4 - User guide

### Goal

User guide cho end users.

### What will be done

- How to register/login
- How to create trip
- How to view itinerary
- How to use map
- How to manage saved trips
- Screenshots

### Files/Folders likely changed

- `docs/user-guide.md` (mới)

### Done when

- Guide complete with screenshots

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 17.4 - User guide.
Register, login, create trip, view itinerary, map, saved trips. Screenshots.
```

---

## [ ] Phase 17.5 - Demo script

### Goal

Script cho demo presentation.

### What will be done

- Step-by-step demo scenario
- Expected outputs at each step
- Talking points

### Files/Folders likely changed

- `docs/demo-script.md` (mới)

### Done when

- Demo script ready to execute

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 17.5 - Demo script.
Step-by-step scenario. Expected outputs. Talking points.
```

---

## [ ] Phase 17.6 - Final project checklist

### Goal

Final verification checklist.

### What will be done

- All features working
- All tests passing
- Security review done
- Documentation complete
- Production deployed
- Monitoring active
- Backups working

### Files/Folders likely changed

- `docs/final-checklist.md` (mới)

### Done when

- All checklist items verified

### Suggested prompt

```
Đọc AGENTS.md. Thực hiện Phase 17.6 - Final checklist.
Verify all features, tests, security, docs, deploy, monitoring, backups.
```

---

## 4. Progress Tracking Checklist

### A. Foundation / Repository / Local Dev

- [x] Phase 1.1 - Git hygiene và repository cleanup
- [x] Phase 1.2 - Backend configuration cleanup (warnings)
- [x] Phase 1.3 - Profile configuration (local/dev/prod)
- [x] Phase 1.4 - Actuator và health endpoint mở rộng
- [x] Phase 1.5 - Logging format và correlation ID cải thiện
- [x] Phase 1.6 - Local development documentation cập nhật

### B. Backend Core Foundation

- [x] Phase 2.1 - Base entity và audit columns
- [x] Phase 2.2 - Exception hierarchy mở rộng
- [x] Phase 2.3 - Validation strategy và custom validators
- [x] Phase 2.4 - Pagination và sorting support
- [x] Phase 2.5 - MapStruct setup và base mapper
- [x] Phase 2.6 - Testcontainers setup cho integration test

### C. Auth Module

- [x] Phase 3.1 - User entity và JPA repository
- [x] Phase 3.2 - PasswordEncoder config (bcrypt)
- [x] Phase 3.3 - Register endpoint
- [x] Phase 3.4 - JWT token generation và validation
- [x] Phase 3.5 - Login endpoint
- [x] Phase 3.6 - JWT authentication filter
- [x] Phase 3.7 - Get current user endpoint (/me)
- [x] Phase 3.8 - Refresh token rotation
- [x] Phase 3.9 - Logout endpoint
- [x] Phase 3.10 - Auth integration tests
- [x] Phase 3.11 - Rate limiting cho auth endpoints

### D. Place Module / PostGIS

- [x] Phase 4.1 - PlaceCategory entity, repository, và seed data migration
- [x] Phase 4.2 - Place entity và JPA repository với PostGIS
- [x] Phase 4.3 - Place seed data (Nha Trang verified places)
- [x] Phase 4.4 - Search/filter places API
- [x] Phase 4.5 - Nearby places API (PostGIS spatial query)
- [x] Phase 4.6 - Place detail API
- [x] Phase 4.7 - Place module tests

### E. AI / Gemini Integration

- [x] Phase 5.1 - Gemini API client configuration
- [x] Phase 5.2 - Prompt template cho trip parsing
- [x] Phase 5.3 - Trip requirement parsing use case
- [x] Phase 5.4 - AI output validation và fallback
- [x] Phase 5.5 - AI module tests (mocked Gemini)

### F. Trip Management

- [x] Phase 6.1 - Trip entity và repository
- [x] Phase 6.2 - Create trip (save parsed request)
- [x] Phase 6.3 - List user trips API
- [x] Phase 6.4 - Trip detail API
- [x] Phase 6.5 - Delete trip API
- [x] Phase 6.6 - Trip ownership authorization
- [x] Phase 6.7 - Trip module tests

### G. Itinerary Generation

- [x] Phase 7.1 - Scoring model (interest, budget, distance)
- [x] Phase 7.2 - Candidate place selection use case
- [x] Phase 7.3 - Day/time-slot grouping algorithm
- [x] Phase 7.4 - Itinerary persistence (itinerary_days, itinerary_items)
- [x] Phase 7.5 - Generate itinerary endpoint
- [x] Phase 7.6 - Itinerary detail API
- [x] Phase 7.7 - AI description generation cho itinerary items
- [x] Phase 7.8 - Itinerary module tests

### H. OSRM Routing

- [x] Phase 8.1 - OSRM HTTP client
- [x] Phase 8.2 - Route cache repository
- [x] Phase 8.3 - Route calculation use case
- [x] Phase 8.4 - Integrate routing vào itinerary generation
- [x] Phase 8.5 - Route API endpoint
- [x] Phase 8.6 - Route module tests (mocked OSRM)

### I. Weather Integration

- [x] Phase 9.1 - Weather API client (Open-Meteo)
- [x] Phase 9.2 - Weather cache repository
- [x] Phase 9.3 - Weather forecast use case
- [x] Phase 9.4 - Weather adjustment cho itinerary
- [x] Phase 9.5 - Weather API endpoint
- [x] Phase 9.6 - Weather module tests

### J. Hotel / Transport Suggestions

- [x] Phase 10.1 - Hotel entity và repository
- [x] Phase 10.2 - Hotel seed data
- [x] Phase 10.3 - Hotel suggestion API (by area/budget)
- [x] Phase 10.4 - Transport suggestion logic (MVP)
- [x] Phase 10.5 - Hotel/Transport tests

### K. Backend Integration và Polish

- [x] Phase 11.1 - End-to-end trip generation flow test
- [x] Phase 11.2 - API documentation (Springdoc/OpenAPI)
- [x] Phase 11.3 - Backend performance review
- [x] Phase 11.4 - Security review backend

### L. Frontend Web

- [x] Phase 12.1 - React/Next.js project setup
- [x] Phase 12.2 - Design system và UI framework
- [x] Phase 12.3 - API client và auth interceptor
- [x] Phase 12.4 - Auth pages (Register/Login)
- [x] Phase 12.5 - Trip request form
- [x] Phase 12.6 - Itinerary result page
- [x] Phase 12.7 - Leaflet map integration
- [ ] Phase 12.8 - Route polyline trên map
- [ ] Phase 12.9 - Saved trips page
- [ ] Phase 12.10 - Loading/error states và UX polish
- [ ] Phase 12.11 - Responsive UI
- [ ] Phase 12.12 - Frontend tests

### M. Mobile Flutter

- [ ] Phase 13.1 - Flutter project setup
- [ ] Phase 13.2 - API client và auth flow
- [ ] Phase 13.3 - Trip generation screen
- [ ] Phase 13.4 - Itinerary display screen
- [ ] Phase 13.5 - Map screen (Flutter map)
- [ ] Phase 13.6 - Saved trips screen
- [ ] Phase 13.7 - State management (Riverpod/Bloc)
- [ ] Phase 13.8 - Mobile tests

### N. DevOps / CI/CD

- [ ] Phase 14.1 - Dockerfile backend (multi-stage)
- [ ] Phase 14.2 - Docker Compose production-like
- [ ] Phase 14.3 - GitHub Actions: build và test
- [ ] Phase 14.4 - GitHub Actions: Docker image build
- [ ] Phase 14.5 - Environment secrets strategy
- [ ] Phase 14.6 - Database migration strategy production

### O. Production Deploy

- [ ] Phase 15.1 - Choose hosting và provision server
- [ ] Phase 15.2 - Setup reverse proxy (Nginx) và SSL
- [ ] Phase 15.3 - Deploy backend
- [ ] Phase 15.4 - Deploy frontend web
- [ ] Phase 15.5 - Production database setup và migration
- [ ] Phase 15.6 - Production smoke test
- [ ] Phase 15.7 - Backup schedule

### P. Production Readiness / Security

- [ ] Phase 16.1 - CORS production configuration
- [ ] Phase 16.2 - Actuator protection production
- [ ] Phase 16.3 - JWT secret management production
- [ ] Phase 16.4 - Rate limiting production
- [ ] Phase 16.5 - Dependency vulnerability scan
- [ ] Phase 16.6 - Logging sensitive data audit
- [ ] Phase 16.7 - Load test cơ bản
- [ ] Phase 16.8 - Disaster recovery checklist

### Q. Final Documentation

- [ ] Phase 17.1 - API documentation hoàn chỉnh
- [ ] Phase 17.2 - Architecture diagram cập nhật
- [ ] Phase 17.3 - Deployment guide cập nhật
- [ ] Phase 17.4 - User guide
- [ ] Phase 17.5 - Demo script
- [ ] Phase 17.6 - Final project checklist

---

**Total phases: 88**

---

> **Lưu ý quan trọng:** File này là living document. Cập nhật progress thường xuyên.
> Sau mỗi phase hoàn thành, tick `[x]` và commit file này cùng code changes.
