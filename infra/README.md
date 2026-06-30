# Infrastructure & Operations (Infra) - AI Smart Travel Planner

Thư mục này chứa toàn bộ các script cấu hình hạ tầng, Dockerfiles, tệp tin cấu hình triển khai và công cụ tự động hóa vận hành (Ops) của dự án.

---

## 1. Cấu trúc thư mục hạ tầng (Infra Folder Layout)

```text
infra/
├── README.md               # Tài liệu hướng dẫn hạ tầng
├── docker/                 # Chứa các tệp Dockerfile tối ưu cho Production
│   └── .gitkeep
├── scripts/                # Chứa các shell scripts tự động hóa (Backup, Restore, Sync)
│   └── .gitkeep
└── deployment/             # Chứa tệp cấu hình triển khai Nginx, AWS, K8s
    └── .gitkeep
```

---

## 2. Các cấu phần hạ tầng chính

### 2.1 Cục bộ (Local Infrastructure)
- Sử dụng tệp `docker-compose.yml` ở thư mục gốc để dựng nhanh môi trường chạy thử nghiệm.
- Quản trị DB PostgreSQL cục bộ thông qua giao diện Web của **pgAdmin** chạy tại cổng `5050`.
- Giả lập S3 Object Storage qua **MinIO** chạy tại cổng `9000` (API) và cổng `9001` (Console quản trị).

### 2.2 Đóng gói (Dockerization)
- Thư mục `infra/docker/` chứa tệp `Dockerfile` tối ưu hóa đa tầng (multi-stage build) để đóng gói backend Spring Boot, frontend React và cấu hình container Nginx.

### 2.3 Kế hoạch triển khai (Deployment Configurations)
- Thư mục `infra/deployment/` chứa tệp cấu hình Reverse Proxy của **Nginx** (`nginx.conf`) để xử lý phân phối static HTML của web client và proxy các yêu cầu API v1 sang backend.

### 2.4 scripts tự động hóa (Ops Scripts)
- Thư mục `infra/scripts/` chứa các tệp:
  - `backup-postgres.sh`: scripts cron job chạy hàng ngày để pg_dump database và đẩy lên S3.
  - `restore-postgres.sh`: scripts khôi phục database phục vụ diễn tập khắc phục sự cố.

---

## 3. Lộ trình mở rộng hạ tầng (Scaling Path)
1. **MVP**: Sử dụng Docker Compose trên 1 VPS ảo chạy Nginx, Spring Boot, PostgreSQL và Redis.
2. **Scale Lớn**:
   - Tách database PostgreSQL sang dịch vụ Managed Database (như AWS RDS) hỗ trợ tự động backup và read replicas.
   - Tách Redis sang Managed Redis (như AWS ElastiCache) để tự động scale.
   - Chuyển dịch Nginx và Spring Boot lên dịch vụ quản lý container (AWS ECS hoặc Kubernetes Cluster) hỗ trợ tự động mở rộng theo lượng CPU/RAM sử dụng (Auto-scaling).
   - Tận dụng Cloudflare CDN làm tường lửa ứng dụng (WAF) và tối ưu hóa phân phối hình ảnh.
