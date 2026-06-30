# Backup & Restore - AI Smart Travel Planner

Tài liệu này đặc tả quy trình sao lưu dữ liệu tự động (Backup) và khôi phục dữ liệu (Restore) khi xảy ra sự cố mất mát dữ liệu hoặc thảm họa hệ thống.

---

## 1. Chiến lược sao lưu dữ liệu (Backup Strategy)

Hệ thống phân tách dữ liệu thành các nhóm để áp dụng phương án sao lưu phù hợp:

### 1.1 Cơ sở dữ liệu PostgreSQL + PostGIS (Dữ liệu cốt lõi)
- **Phương pháp**: Sử dụng công cụ `pg_dump` để kết xuất dữ liệu thành tệp tin SQL nén.
- **Tần suất**: Chạy tự động **hàng ngày vào lúc 02:00 AM** (giờ thấp tải).
- **Lưu trữ**: Tệp tin nén sau khi tạo được tự động tải lên một bucket Object Storage (S3) riêng tư, được cấu hình mã hóa phía máy chủ (Server-Side Encryption).
- **Chính sách lưu giữ (Retention Policy)**: Lưu giữ bản sao lưu trong vòng **30 ngày**, các tệp cũ hơn sẽ tự động bị xóa để tiết kiệm dung lượng.

### 1.2 Object Storage (Media Assets)
- Toàn bộ tệp hình ảnh được tải lên bucket S3 chính.
- **Phương pháp**: Kích hoạt tính năng **S3 Versioning (Quản lý phiên bản)** để bảo vệ hình ảnh khỏi việc bị xóa nhầm hoặc ghi đè lỗi.
- **Cross-Region Replication**: Cấu hình tự động sao chép (replication) bất đồng bộ toàn bộ file sang một bucket S3 ở một region khác để phòng ngừa thảm họa cháy nổ trung tâm dữ liệu.

### 1.3 Redis Cache (Không cần sao lưu)
- Redis chỉ đóng vai trò là bộ đệm lưu trữ dữ liệu tạm thời (Hot Cache). Dữ liệu thật đều nằm ở PostgreSQL.
- Do đó, **không cần thiết lập sao lưu Redis**. Khi Redis sập hoặc khởi động lại, bộ nhớ RAM bị xóa sạch, backend sẽ tự động đọc lại dữ liệu từ PostgreSQL để làm đầy lại cache (Cache Warming).

---

## 2. Quy trình Khôi phục dữ liệu (Restore Drill)

Việc có bản sao lưu là chưa đủ, hệ thống yêu cầu kiểm tra tính khả dụng của file backup thông qua hoạt động diễn tập khôi phục:
- **Tần suất diễn tập**: Định kỳ **6 tháng một lần**.
- **Quy trình diễn tập khôi phục DB**:
  1. DevOps tạo một database trống trên môi trường Test/Staging.
  2. Tải tệp backup mới nhất từ S3 về máy test.
  3. Giải nén và chạy lệnh import dữ liệu:
     ```bash
     pg_restore -U tripwise_user -d tripwise_test_restore backup_file.dump
     ```
  4. Chạy smoke test ứng dụng trỏ vào database vừa restore để xác nhận dữ liệu toàn vẹn, không bị lỗi cấu trúc hình học PostGIS.

---

## 3. Chỉ số RPO & RTO mục tiêu (Tương lai)
- **RPO (Recovery Point Objective - Giới hạn mất dữ liệu tối đa)**: **24 giờ**. Do hệ thống backup hàng ngày, trong trường hợp xấu nhất, dữ liệu bị mất tối đa là các giao dịch phát sinh trong vòng 24 giờ gần nhất.
- **RTO (Recovery Time Objective - Thời gian khôi phục hệ thống tối đa)**: **2 giờ**. Kể từ khi xác định xảy ra thảm họa mất dữ liệu, kỹ sư vận hành phải hoàn thành việc cấu hình và import dữ liệu khôi phục để hệ thống hoạt động trở lại bình thường trong vòng 2 giờ.
