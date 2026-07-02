# TripWise Web

Frontend web của TripWise dùng `Next.js + TypeScript` với `App Router`.

## Frontend direction

- `web/` là codebase production hiện tại.
- `web-archive-vite-ui/` giữ lại mock UI React/Vite ban đầu để làm visual reference.
- Các màn hình mới trong Next.js phải bám sát giao diện mock archive, nhưng implementation phải theo chuẩn Next.js hiện tại.

## Why App Router

App Router được chọn vì cấu hình gọn, là hướng mặc định của Next.js và thuận tiện mở rộng cho các phase sau như auth pages, API client, loading states và route-level layout.

## Local setup

1. Cài dependencies:

```cmd
cd web
npm install
```

2. Tạo file env local từ mẫu:

```cmd
Copy-Item .env.example .env.local
```

3. Chạy dev server:

```cmd
npm run dev
```

4. Kiểm tra lint:

```cmd
npm run lint
```

5. Build thử:

```cmd
npm run build
```

## Environment variables

- `NEXT_PUBLIC_API_BASE_URL`: base URL an toàn để frontend gọi backend TripWise, ví dụ `http://localhost:8080/api/v1`.

Không đặt Gemini API key, JWT secret, database password hay backend secret khác trong frontend.
