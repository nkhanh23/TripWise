# Backend Guide - AI Smart Travel Planner

Tài liệu này đặc tả quy chuẩn phát triển dành cho cấu phần **Backend** của dự án AI Smart Travel Planner.

---

## 1. Công nghệ & Kiến trúc cốt lõi
- **Ngôn ngữ & Runtime**: Java 21 (JVM).
- **Core Framework**: Spring Boot 3.x.
- **Mô hình**: **Modular Monolith** kết hợp **Clean Architecture** ở mỗi module.
- **Database**: PostgreSQL 16 + PostGIS.
- **Cache**: Redis 7.2.

---

## 2. Cấu trúc gói tin (Package Structure) đề xuất

```text
com.tripwise
├── [module_name] (Ví dụ: place, trip, auth)
│   ├── domain
│   │   ├── model/entity        # Thực thể nghiệp vụ thuần túy
│   │   ├── valueobject         # Value objects tự validate
│   │   ├── exception           # Ngoại lệ nghiệp vụ
│   │   └── service             # Logic nghiệp vụ độc lập
│   ├── application
│   │   ├── usecase             # Luồng nghiệp vụ (UseCase, Command, Query)
│   │   └── port
│   │       ├── in              # Interfaces đầu vào (UseCases)
│   │       └── out             # Interfaces đầu ra (DB, API clients)
│   ├── infrastructure
│   │   ├── persistence         # JPA Repositories, DB Entities, Flyway
│   │   ├── external            # API clients gọi Gemini, OSRM, Weather
│   │   └── cache               # Redis config & cache adapters
│   └── presentation
│       ├── controller          # REST Controller
│       ├── dto                 # Request & Response DTOs
│       └── mapper              # MapStruct mappers (DTO <-> Domain Entity)
└── shared                      # Tiện ích dùng chung không chứa business logic
```

---

## 3. Quy tắc lập trình bắt buộc (Development Rules)

### 3.1 Quy tắc Tách biệt DTO & JPA Entity
- **Cấm expose JPA Entity**: JPA Entity đại diện cho cấu trúc database vật lý chỉ được dùng ở tầng Infrastructure. Tầng Presentation bắt buộc phải dùng Request/Response DTO.
- **MapStruct**: Sử dụng MapStruct để thực hiện chuyển đổi dữ liệu chéo tầng (DTO <-> Domain Entity <-> JPA Entity).

### 3.2 Quy tắc Controller & Use Case
- **Controller**: Cấm chứa business logic. Controller chỉ được validate format đầu vào (`@Valid`), gọi Use Case thông qua Port In và trả về HTTP status phù hợp.
- **Use Case**: Nằm ở Application layer, chịu trách nhiệm điều phối luồng dữ liệu, giao tiếp với các Port Out.

### 3.3 Quy tắc Tích hợp & Chịu lỗi (External Client Rules)
- Mọi cuộc gọi HTTP Client ra bên ngoài (Gemini, OSRM, Weather) bắt buộc cấu hình Timeout (tối đa 10s cho Gemini, 3s cho OSRM/Weather).
- Tích hợp Circuit Breaker và cơ chế Fallback (suy giảm tính năng mượt mà) để bảo vệ hệ thống khi API ngoài bị sập.

### 3.4 Quy tắc Caching & Database Migration
- **Redis Cache**: Đặt Key namespace bắt đầu bằng `tripwise:`. Phải bao bọc khối gọi Redis bằng `try-catch` để tự động fallback truy cập thẳng DB khi Redis lỗi.
- **Flyway**: Mọi thay đổi DB schema bắt buộc viết qua tệp SQL Migration của Flyway. JOIN chéo bảng của hai module khác nhau bị cấm hoàn toàn.

---

## 4. Cách chạy & Kiểm thử ứng dụng

### 4.1 Khởi động Môi trường dữ liệu (Docker)
Tại thư mục gốc dự án:
```bash
docker compose up -d
```

### 4.2 Chạy Backend Spring Boot
```bash
./gradlew bootRun
```

### 4.3 Chạy Test suite (JUnit 5 & Testcontainers)
```bash
./gradlew test
```
*Lưu ý: Test suite sử dụng Testcontainers sẽ tự động khởi tạo container PostgreSQL và Redis trên Docker khi chạy tích hợp test.*
