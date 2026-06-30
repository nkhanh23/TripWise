# Backend Coding Rules - AI Smart Travel Planner

Bộ quy tắc lập trình bắt buộc áp dụng đối với mã nguồn backend Spring Boot (Java 21).

---

## 1. Clean Architecture & Package Rules
Mã nguồn phải được chia theo cấu trúc 4 lớp Clean Architecture nghiêm ngặt:
- **`domain`**: Chứa Domain Entities, Value Objects, Domain Exceptions, Domain Services. Cấm import framework Spring, Hibernate.
- **`application`**: Chứa Use Cases, Command/Query objects, Ports In, Ports Out. Chịu trách nhiệm điều phối luồng xử lý.
- **`infrastructure`**: Chứa các Persistence Adapters (JPA Repositories, Entities cơ sở dữ liệu), External Clients (Gemini API, OSRM, Weather), Caching.
- **`presentation`**: Chứa Controllers, Request/Response DTOs, Mappers (MapStruct).

---

## 2. API, DTO & Validation Rules
- **Không expose JPA Entity**: JPA Entity tuyệt đối không được dùng làm kiểu dữ liệu trả về cho Controller. Bắt buộc phải dùng DTO và map qua MapStruct.
- **Controller không chứa business logic**: Controller chỉ được làm nhiệm vụ validate format đầu vào, gọi Use Case và trả về DTO.
- **Validation**:
  - Dữ liệu Request gửi lên phải được kiểm tra bằng các annotation tiêu chuẩn: `@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Max`.
  - Sử dụng `@Valid` trong tham số của Controller.

---

## 3. Database & Transaction Rules
- **Repository Isolation**: Các JPA Repository (Spring Data JPA) chỉ được phép sử dụng bên trong lớp Persistence Adapter của Infrastructure Layer.
- **Quản lý Transaction (`@Transactional`)**:
  - Đánh dấu `@Transactional(readOnly = true)` mặc định cho các Use Cases đọc dữ liệu để tối ưu hóa hiệu năng PostgreSQL.
  - Sử dụng `@Transactional` ở Application Layer cho các Use Cases ghi/sửa dữ liệu.
  - Tránh đặt xử lý gọi API ngoài (Gemini, OSRM) bên trong block `@Transactional` để tránh chiếm giữ database connection quá lâu.

---

## 4. Tích hợp bên ngoài, Caching & Logging Rules
- **External Client**:
  - Mọi cuộc gọi HTTP Client bắt buộc cấu hình Timeout (độ trễ chờ tối đa 10s cho Gemini, 3s cho OSRM/Weather).
  - Tích hợp Circuit Breaker và cơ chế Fallback (suy giảm tính năng mượt mà).
- **Redis Cache**:
  - Sử dụng đúng Key Namespace bắt đầu bằng `tripwise:`.
  - Phải bao bọc khối gọi Redis bằng `try-catch` bắt lỗi mất kết nối Redis để kích hoạt fallback truy cập trực tiếp DB.
- **Logging & Exception**:
  - Sử dụng MDC để in log kèm theo `correlationId`.
  - Che giấu log thông tin mật khẩu, tokens và API key.
  - Sử dụng các Custom Business Exceptions thừa kế từ `RuntimeException` ở tầng Domain/Application, xử lý tập trung tại presentation layer.
