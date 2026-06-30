# Rollback Strategy - AI Smart Travel Planner

Tài liệu này đặc tả quy trình và kịch bản rút lui (Rollback Strategy) khi xảy ra sự cố nghiêm trọng sau khi triển khai phiên bản mới trên môi trường Production.

---

## 1. Tiêu chí kích hoạt Rollback (When to Rollback)
Hoạt động rollback chỉ được thực hiện khi phiên bản ứng dụng mới triển khai gặp một trong các lỗi nghiêm trọng sau và không thể khắc phục nhanh bằng bản vá (hotfix) trong vòng 15 phút:
- Tỷ lệ lỗi API đột biến vượt quá `10%` trong 5 phút liên tiếp (HTTP 5xx).
- PostgreSQL bị khóa bảng diện rộng hoặc xung đột dữ liệu dẫn đến sập kết nối.
- Rò rỉ thông tin bảo mật nghiêm trọng (lộ token, lộ API key).
- Khách hàng không thể thực hiện luồng nghiệp vụ chính (không tạo được lịch trình).

---

## 2. Quy trình Rollback mã nguồn (Application Rollback)
Do ứng dụng được đóng gói hoàn toàn trong Docker container và quản lý tag bằng Git commit hash, quy trình rollback code được thực hiện cực kỳ nhanh chóng:

1. **Bước 1: Xác định phiên bản ổn định gần nhất**
   - Kỹ sư vận hành (DevOps) xác định commit hash hoặc thẻ tag của phiên bản hoạt động tốt ngay trước khi triển khai (ví dụ: `tripwise-backend:v1.0.0` ổn định, phiên bản lỗi là `v1.1.0`).
2. **Bước 2: Cập nhật Tag trên Server**
   - Đổi cấu hình tag của image trong file compose trên server Production về tag ổn định cũ (`v1.0.0`).
3. **Bước 3: Khởi chạy lại Container**
   - Chạy lệnh khởi động lại container:
     ```bash
     docker compose pull backend
     docker compose up -d backend
     ```
   - Kiểm tra log và endpoint `/actuator/health` để xác nhận ứng dụng đã phục hồi về trạng thái cũ.

---

## 3. Chiến lược Rollback Cơ sở dữ liệu (Database Rollback)
Rollback database phức tạp hơn nhiều so với rollback code vì liên quan đến tính toàn vẹn dữ liệu:

### 3.1 Quy tắc thiết kế Migration tương thích ngược (Backward Compatibility)
- Để tránh phải rollback database, tất cả các tệp migration của Flyway phải được thiết kế để tương thích ngược:
  - Khi thêm cột mới: Cột mới phải cho phép giá trị Null hoặc có giá trị mặc định (Default value).
  - Không được xóa cột cũ hoặc sửa tên cột cũ ngay lập tức; duy trì cột cũ song song trong ít nhất một phiên bản để code cũ vẫn có thể đọc được nếu phải rollback code.

### 3.2 Kịch bản Rollback DB thủ công
- Nếu tệp SQL migration của Flyway bị lỗi giữa chừng khiến DB ở trạng thái lỗi:
  - Lập tức dừng chạy ứng dụng.
  - Sử dụng bản sao lưu dữ liệu (PostgreSQL dump) được tạo tự động ngay trước khi deploy để khôi phục lại trạng thái DB cũ.
  - Sửa đổi bản ghi trong bảng `flyway_schema_history` bằng câu lệnh SQL xóa dòng ghi nhận tệp migration lỗi để Flyway cho phép chạy lại sau khi đã fix tệp SQL.

---

## 4. Quyền quyết định & Kế hoạch phòng ngừa sự cố
- **Quyền quyết định**: Chỉ có **Tech Lead** hoặc **Product Owner (PO)** mới có quyền quyết định và ký duyệt lệnh rollback trên môi trường Production.
- **Biện pháp phòng ngừa (Feature Flags - Tương lai)**: Tích hợp thư viện Feature Flags (như Unleash hoặc Spring Cloud Config). Khi ra mắt tính năng mới nhạy cảm (ví dụ: Thuật toán scoring mới), tính năng này được bao bọc trong Feature Flag. Nếu tính năng mới lỗi, admin chỉ cần tắt flag từ xa trên dashboard để hệ thống quay lại chạy code cũ ngay lập tức mà không cần triển khai lại code hay rollback container.
