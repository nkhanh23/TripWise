# Clean Architecture - AI Smart Travel Planner

## 1. Bản đồ các lớp kiến trúc (Architecture Layers)
Dự án áp dụng mô hình **Clean Architecture (kiến trúc sạch)** ở phía backend để đảm bảo logic nghiệp vụ (core business rules) hoàn toàn độc lập với các framework, cơ sở dữ liệu và thư viện tích hợp bên ngoài.

```text
       ┌────────────────────────────────────────────────────────┐
       │                   Presentation Layer                   │
       │           (REST Controllers, DTOs, Mappers)            │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │                   Application Layer                    │
       │        (Use Cases, Commands/Queries, Ports In/Out)      │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │                      Domain Layer                      │
       │        (Entities, Value Objects, Domain Services)      │
       └────────────────────────────────────────────────────────┘
                                  ▲
                                  │
       ┌──────────────────────────┴─────────────────────────────┐
       │                  Infrastructure Layer                  │
       │       (Persistence Adapters, External API Clients)     │
       └────────────────────────────────────────────────────────┘
```

---

## 2. Chi tiết trách nhiệm từng lớp

### 2.1 Domain Layer (Lõi hệ thống)
- **Đặc điểm**: Là lớp trong cùng nhất, tuyệt đối không được import bất kỳ thư viện framework nào của Spring Boot, Hibernate hay các API ngoài.
- **Trách nhiệm**:
  - Chứa các thực thể domain (`Domain Entity`) biểu diễn các khái niệm nghiệp vụ thuần túy (ví dụ: `Place`, `Itinerary`, `User`).
  - Chứa các `Value Objects` (như tọa độ địa lý `Coordinate` chứa lat, lng và logic tự validate tính hợp lệ).
  - Chứa các logic nghiệp vụ lõi trong các `Domain Services` (ví dụ: thuật toán chấm điểm địa điểm `PlaceScoringService`).

### 2.2 Application Layer (Nghiệp vụ ứng dụng)
- **Đặc điểm**: Phụ thuộc duy nhất vào Domain Layer. Định nghĩa các luồng xử lý của ứng dụng.
- **Trách nhiệm**:
  - Chứa các lớp `Use Cases` (ví dụ: `GenerateTripUseCase`, `SaveItineraryUseCase`) để điều phối luồng dữ liệu đi vào và đi ra khỏi domain.
  - Định nghĩa các cổng giao tiếp vào (`Port In` - interfaces cho Controllers gọi) và cổng giao tiếp ra (`Port Out` - interfaces cho Infrastructure hiện thực, ví dụ: `PlaceRepositoryPort`, `OSRMClientPort`).

### 2.3 Infrastructure Layer (Hạ tầng kỹ thuật)
- **Đặc điểm**: Phụ thuộc vào Application Layer và Domain Layer. Đây là nơi chứa các công nghệ cụ thể được sử dụng.
- **Trách nhiệm**:
  - **Persistence Adapters**: Sử dụng Spring Data JPA, Hibernate và các câu lệnh SQL không gian PostGIS để hiện thực các repository ports.
  - **External API Clients**: Viết adapter gọi Gemini API, OSRM API, Weather API.
  - **Cache Adapters**: Hiện thực caching thông qua Redis.

### 2.4 Presentation Layer (Giao diện API)
- **Đặc điểm**: Lớp ngoài cùng tiếp nhận request trực tiếp từ client.
- **Trách nhiệm**:
  - Chứa các `REST Controllers` định nghĩa route API, xử lý validation dữ liệu đầu vào bằng Hibernate Validator (`@Valid`).
  - Chứa các tệp `Request DTO` và `Response DTO` đại diện cho hợp đồng API.
  - Sử dụng MapStruct để thực hiện chuyển đổi qua lại giữa DTO và Domain Entity.

---

## 3. Quy tắc phụ thuộc cốt lõi (Dependency Rule)

### 3.1 Luồng phụ thuộc từ ngoài vào trong
- Lớp ngoài cùng (Presentation/Infrastructure) có thể biết và sử dụng các lớp bên trong (Application/Domain).
- Lớp bên trong tuyệt đối **không được biết và không được import** bất kỳ lớp nào ở lớp ngoài. Ví dụ: `Domain Entity` không được chứa các anotation của JPA như `@Entity`, `@Table`, `@Column` vì đây là công nghệ lưu trữ của tầng Infrastructure.

### 3.2 Tách biệt DTO và Entity
- **Lý do**: JPA Entity phản ánh cấu trúc cơ sở dữ liệu vật lý. Nếu trả thẳng JPA Entity ra API Client (Presentation) sẽ dẫn đến:
  - Rò rỉ thông tin nhạy cảm (như password hash, database ID nội bộ).
  - Thay đổi DB sẽ lập tức làm vỡ API contract của client (Breaking change).
- **Quy tắc**:
  - Controller chỉ tiếp nhận `Request DTO` và trả về `Response DTO`.
  - Application Layer tiếp nhận Command/Query DTO và trả về Domain Entity.
  - Database persistence layer ánh xạ Domain Entity sang JPA Entity trước khi ghi xuống PostgreSQL.

### 3.3 Controller không chứa business logic
- Controller chỉ có 3 nhiệm vụ duy nhất:
  1. Kiểm tra tính hợp lệ sơ bộ của request (HTTP Concern, Validate format).
  2. Ánh xạ dữ liệu thô sang Command/Query object và chuyển tiếp cho Use Case tương ứng.
  3. Ánh xạ kết quả trả về từ Use Case sang HTTP Response DTO kèm HTTP status phù hợp (200, 201, 400...).
- Mọi logic tính toán, chấm điểm, sắp xếp thứ tự đi đều phải nằm trong Application/Domain Layer.
