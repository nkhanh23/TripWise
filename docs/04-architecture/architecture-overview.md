# Architecture Overview - TripWise Personal Mobile App

> **QUYẾT ĐỊNH KIẾN TRÚC MỚI (ADR-018):**
> TripWise đã chính thức chuyển đổi từ nền tảng du lịch công cộng sang **Ứng dụng di động cá nhân (Personal AI Travel Mobile App)**.
> Kiến trúc mục tiêu sử dụng **React Native + TypeScript** kết nối trực tiếp với **Supabase (Auth + PostgreSQL + Edge Functions)**.

---

## 1. Sơ đồ Kiến trúc Mục tiêu (Target Architecture)

```text
               ┌────────────────────────────────────────────────────────┐
               │              TripWise Mobile Client                    │
               │         (React Native + TypeScript + Expo)             │
               └──────┬────────────────────┬────────────────────┬───────┘
                      │                    │                    │
        [Supabase SDK + RLS]     [Direct API Calls]    [Native Map SDK]
                      │                    │                    │
                      ▼                    ▼                    ▼
     ┌────────────────────────┐  ┌──────────────────┐ ┌─────────────────┐
     │        Supabase        │  │  Open-Meteo API  │ │ Google Maps SDK │
     │  ┌──────────────────┐  │  │  (Weather Data)  │ │ (Map & Route UI)│
     │  │  Supabase Auth   │  │  └──────────────────┘ └─────────────────┘
     │  │  (User Session)  │  │  ┌──────────────────┐ ┌─────────────────┐
     │  ├──────────────────┤  │  │   OSRM Engine    │ │  Google Places  │
     │  │  PostgreSQL + RLS│  │  │ (Public Routing) │ │ (Search/Photos) │
     │  │ (Trips/Itinerary)│  │  └──────────────────┘ └─────────────────┘
     │  ├──────────────────┤  │
     │  │  Edge Functions  │  │
     │  │  (Deno / TS)     │──┼───────────────┐
     │  └──────────────────┘  │               │ HTTPS (Secret Isolated)
     └────────────────────────┘               ▼
                                   ┌─────────────────────┐
                                   │  Google Gemini API  │
                                   │  (Trip Generation)  │
                                   └─────────────────────┘
```

---

## 2. Các Thành phần Chính trong Kiến trúc Đích

### 2.1 Mobile Client (`mobile/`)
- Xây dựng bằng **React Native + TypeScript + Expo**.
- Đảm nhận 100% giao diện người dùng: xác thực, tạo chuyến đi bằng prompt AI, hiển thị timeline lịch trình theo ngày, bản đồ tương tác Google Maps, tìm kiếm địa điểm Google Places và lưu trữ offline.

### 2.2 BaaS Layer (Supabase)
- **Supabase Auth:** Quản lý tài khoản và phiên đăng nhập bảo mật (JWT) cho chủ sở hữu.
- **Supabase PostgreSQL & RLS:** Cơ sở dữ liệu quan hệ lưu trữ `profiles`, `trips`, `itinerary_days`, `itinerary_items`. Áp dụng chính sách **Row Level Security (RLS)** nghiêm ngặt để đảm bảo an toàn truy cập.
- **Supabase Edge Functions:** Serverless TypeScript functions chạy trên Deno runtime. Đóng vai trò proxy bảo vệ `GEMINI_API_KEY`, bóc tách prompt và kiểm tra JSON schema lịch trình trước khi trả về client.

### 2.3 External Services
- **Google Maps SDK & Google Places API:** Bản đồ nền và nguồn tra cứu địa điểm, hình ảnh, đánh giá. Client API key được giới hạn theo Android Package Name/SHA-1 fingerprint và iOS Bundle ID.
- **Open-Meteo API:** Dự báo thời tiết theo tọa độ điểm đến (gọi trực tiếp từ mobile).
- **OSRM Engine:** Tính toán khoảng cách và thời gian di chuyển giữa các điểm (gọi trực tiếp từ mobile kèm client-side fallback).

---

## 3. Trạng thái Kiến trúc Cũ (Legacy Architecture Notice)

Kiến trúc cũ sử dụng Java 21 + Spring Boot 3.x, Docker PostgreSQL + PostGIS, Redis, pipeline Geofabrik/Overpass và Web Admin Portal (`web/`) hiện ở trạng thái **Legacy Migration Source / Scheduled for Removal** (theo ADR-018). Chúng được lưu giữ tạm thời để làm nguồn đối chiếu và sẽ được xóa bỏ theo lộ trình D-series.
