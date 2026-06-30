# Modular Monolith - AI Smart Travel Planner

## 1. Lý do lựa chọn kiến trúc Modular Monolith
Kiến trúc **Modular Monolith** được lựa chọn làm thiết kế cốt lõi cho hệ thống AI Smart Travel Planner trong giai đoạn hiện tại (MVP và phát triển trung hạn) thay vì triển khai Microservices ngay từ đầu.

### 1.1 Lợi ích so với Microservices ở giai đoạn đầu:
- **Tốc độ phát triển nhanh**: Toàn bộ codebase nằm trong một project duy nhất giúp dễ dàng refactor, tái sử dụng các thư viện tiện ích dùng chung và triển khai nhanh chóng.
- **Giảm tải chi phí DevOps**: Không cần duy trì hệ thống Kubernetes phức tạp, service discovery, distributed tracing hay API Gateway phân tán. Hệ thống chỉ cần chạy trên 1 hoặc 2 instance ảo (VM/VPS) tiết kiệm chi phí.
- **Tính nhất quán dữ liệu (Data Consistency)**: Cho phép sử dụng các ACID Transaction của cơ sở dữ liệu quan hệ PostgreSQL để đảm bảo dữ liệu lịch trình luôn được lưu trữ đồng bộ (ví dụ: Lưu trip thành công thì lưu chi tiết ngày đi thành công). Tránh được bài toán xử lý Distributed Transaction phức tạp (như mẫu thiết kế Saga).
- **Dễ dàng kiểm thử**: Chạy tích hợp end-to-end kiểm thử luồng tạo lịch trình diễn ra trực tiếp trên JVM, không bị ảnh hưởng bởi độ trễ mạng hay rớt kết nối giữa các microservices.

---

## 2. Thiết lập ranh giới Module (Module Boundary)

Hệ thống backend Spring Boot được chia tách thành các module nghiệp vụ tự chứa (self-contained modules) dựa trên cấu trúc package:

```text
com.tripwise
├── auth            # Quản lý đăng ký, đăng nhập, JWT, mã hóa
├── user            # Quản lý thông tin hồ sơ, phân quyền
├── place           # Dữ liệu địa điểm, tìm kiếm, PostGIS query
├── trip            # Use case chính tạo lịch trình du lịch
├── route           # Tích hợp OSRM, tính khoảng cách, cache route
├── weather         # Tích hợp Weather API, cache dự báo
├── media           # Xử lý lưu trữ file tĩnh lên Object Storage
└── shared          # Các util dùng chung (không chứa business logic)
```

---

## 3. Các quy tắc ngăn chặn Spaghetti Code (Code rối)

Để đảm bảo hệ thống không biến thành một "Big Ball of Mud" (khối code hỗn độn), các quy tắc sau bắt buộc phải được tuân thủ:

- **Quy tắc 1: Cấm truy cập trực tiếp Database chéo module**
  - Thực thể JPA của module này không được liên kết trực tiếp (ví dụ: `@ManyToOne`, `@OneToMany`) với thực thể JPA của module khác.
  - Persistence Adapter của Module `Trip` cấm truy vấn trực tiếp vào bảng cơ sở dữ liệu của Module `Place` hay `User`.
- **Quy tắc 2: Giao tiếp qua Application Port**
  - Khi Module `Trip` cần thông tin địa điểm từ Module `Place`, nó phải gọi thông qua interface `PlaceServicePort` được định nghĩa công khai, thay vì tự ý truy vấn database.
- **Quy tắc 3: Cấm Circular Dependency (Phụ thuộc vòng)**
  - Module A gọi Module B thì Module B **không được phép** gọi ngược lại Module A. Nếu có sự phụ thuộc vòng, lập tức tái cấu trúc bằng cách tách phần logic dùng chung ra một module thứ ba hoặc sử dụng cơ chế phát sự kiện bất đồng bộ (Application Events).

---

## 4. Chuẩn bị lộ trình tách rời Service trong tương lai (Scaling Path)
Thiết kế Modular Monolith phải chuẩn bị sẵn sàng cho việc bóc tách thành các dịch vụ độc lập khi hệ thống tăng tải:

- **Tách biệt Database Schema vật lý**: Mặc dù chạy chung một cơ sở dữ liệu PostgreSQL, các bảng dữ liệu của từng module phải được phân nhóm rõ ràng (ví dụ: sử dụng tiền tố tên bảng như `tb_user_`, `tb_place_`, `tb_trip_`).
- **Cấm JOIN bảng chéo module**: Mọi câu truy vấn SQL JOIN chỉ được thực hiện giữa các bảng thuộc cùng một module. Khi cần lấy dữ liệu liên kết, bắt buộc phải truy vấn ID ở module này, sau đó gửi danh sách ID sang module kia để lấy thông tin chi tiết và ghép nối ở Application layer. Quy tắc này đảm bảo khi tách DB vật lý, các câu lệnh truy vấn không bị vỡ.
- **Hướng tới Event-Driven**: Thiết kế các luồng xử lý dài không chặn (non-blocking) sử dụng cơ chế `ApplicationEventPublisher` của Spring. Khi cần chuyển sang Microservices, chỉ cần thay thế Event Publisher nội bộ bằng hàng đợi tin nhắn (Message Queue như Kafka, RabbitMQ) mà không phải sửa đổi logic nghiệp vụ của Use Case.
