# Media & CDN Strategy - AI Smart Travel Planner

Tài liệu này đặc tả thiết kế lưu trữ hình ảnh và chiến lược mạng phân phối nội dung (CDN) của dự án nhằm tối ưu băng thông và tăng tốc độ tải trang cho người dùng.

---

## 1. Các nguyên tắc lưu trữ Media cốt lõi
Để đảm bảo hiệu năng và khả năng scale lớn, hệ thống áp dụng các nguyên tắc tuyệt đối sau:
- **Không lưu trữ dữ liệu nhị phân (binary/blob) của ảnh trực tiếp vào PostgreSQL**: Việc này sẽ làm dung lượng database phình to nhanh chóng, làm chậm truy vấn và gây khó khăn cho việc backup. Database chỉ lưu trữ đường dẫn URL tĩnh dạng chuỗi.
- **Không phục vụ (serve) file ảnh tĩnh trực tiếp từ backend Spring Boot**: Việc này tiêu tốn nhiều CPU thread và băng thông mạng của ứng dụng backend. Tầng Presentation chỉ chịu trách nhiệm nhận metadata hoặc cung cấp link upload, việc tải ảnh phải do hạ tầng chuyên dụng đảm nhận.

---

## 2. Thiết kế hạ tầng Media: Object Storage & CDN

```text
  [ Client Web / Mobile ]
     │                 │
     │ 1. Xin link     │ 3. Tải trực tiếp ảnh (Static Assets)
     │    upload       │
     ▼                 ▼
[ Spring Boot ]   [ Cloudflare CDN ]
     │                 │ (Cache hit)
     │ 2. Trả          ├────────────────► [ Trả về Client ]
     │    presigned URL│ (Cache miss)
     ▼                 ▼
                  [ Object Storage ]
                  (AWS S3 / MinIO)
```

### 2.1 Object Storage (S3 / MinIO)
- **Vai trò**: Kho lưu trữ tập tin gốc. 
- Sử dụng **AWS S3** cho môi trường production và **MinIO** (API tương thích S3) chạy container cho môi trường local/staging để dễ kiểm thử.

### 2.2 CDN (Content Delivery Network - Cloudflare)
- **Vai trò**: Bộ đệm biên đặt gần vị trí địa lý của người dùng.
- Cloudflare đứng trước Object Storage. Khi có yêu cầu tải ảnh, CDN kiểm tra nếu có sẵn trong bộ nhớ đệm (Cache Hit) sẽ trả về ngay cho user, tránh truy cập vào S3 giúp giảm chi phí truyền tải dữ liệu (egress cost).

---

## 3. Tối ưu hóa kích thước & Cache Control

### 3.1 Xử lý phân cấp ảnh (Image Scaling)
Khi người dùng tải lên một hình ảnh địa điểm (kích thước gốc có thể lên tới 10MB), một background job bất đồng bộ sẽ tự động resize và nén ảnh thành 3 phiên bản:
- **`original`**: Lưu ảnh gốc (giới hạn nén nhẹ về định dạng `.webp` để tiết kiệm).
- **`medium`**: Ảnh hiển thị trên thẻ card (rộng tối đa 800px).
- **`thumbnail`**: Ảnh thu nhỏ cho avatar hoặc bản đồ marker (rộng tối đa 200px).

### 3.2 Cấu hình Cache-Control Headers
Tất cả các tài nguyên ảnh tĩnh được CDN phục vụ bắt buộc cấu hình header HTTP Cache-Control dài hạn để trình duyệt không tải lại file nhiều lần:
```http
Cache-Control: public, max-age=31536000, immutable
```

---

## 4. Kiểm soát an toàn file tải lên (Upload Validation)
Để bảo vệ hệ thống khỏi mã độc và tống tiền (ransomware):
- **Giới hạn dung lượng (File size limit)**: Tối đa **5MB** đối với ảnh gốc.
- **Danh sách định dạng cho phép (MIME type allowlist)**: Chỉ cho phép tải lên các định dạng ảnh phổ biến: `image/jpeg`, `image/png`, `image/webp`. Cấm hoàn toàn định dạng có khả năng thực thi như `.svg` (để tránh lỗi XSS).
- **Signed URL (Tương lai)**: Người dùng muốn tải ảnh lên sẽ gửi request lên backend, backend tạo một link upload tạm thời có thời hạn (Presigned URL) của S3. Client sử dụng link này để đẩy trực tiếp file lên S3, không đi qua Spring Boot.
- **CDN Invalidation**: Thiết lập cơ chế tự động gửi API dọn dẹp cache CDN (invalidation) khi admin thực hiện thay thế hoặc xóa ảnh địa điểm cũ.
