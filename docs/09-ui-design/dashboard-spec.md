# User Dashboard Spec

Dashboard là “home base” cho user: xem nhanh các trip, tiếp tục trip đang lập kế hoạch, và truy cập nhanh vào AI planner + saved items.

Phong cách: card-based, sạch, “premium SaaS”, đồng bộ design tokens trong `design-system.md`.

---

## Layout tổng (Web)

### Header

- Greeting: “Chào {name}”
- Quick actions:
  - `New trip` (primary)
  - `Import` (optional)
  - Avatar menu

### Grid bố cục

Khuyến nghị 12-column grid:

- Cột trái (8): trip list + continue planning
- Cột phải (4): weather cards + saved destinations + AI suggestions

---

## Danh sách chuyến đi (Trip list)

### Mục tiêu

User thấy ngay:

- Trip sắp tới / gần đây
- Trạng thái (draft/planned/completed)
- Last updated

### UI

- Card list hoặc grid (tuỳ mật độ).
- Mỗi trip card gồm:
  - Title + destination
  - Date range / duration
  - Status tags (draft/planned)
  - Mini stats: distance (nếu có), estimated cost (nếu có)
  - CTA: `Open` + kebab menu (rename/duplicate/delete)

### Dữ liệu cần hiển thị

- `tripId`, `title`, `destination`
- `startDate`, `endDate` hoặc `days/nights`
- `status`
- `estimatedCost` (optional)
- `totalDistance` (optional)
- `updatedAt`

### Hành động

- Open trip detail
- Create new trip
- Rename/duplicate/delete
- Filter theo destination/status (optional)

---

## Chuyến đi đang lập kế hoạch (Continue planning)

### Mục tiêu

Nút “tiếp tục” rõ ràng cho trip draft để tăng retention.

### UI

- Card lớn (hero card) đặt trên cùng cột trái.
- Nội dung:
  - Trip title
  - Progress indicator (ví dụ: “Đã chọn ngày”, “Chưa chọn ngân sách”)
  - CTA primary: `Tiếp tục`
  - CTA secondary: `Tạo lại` (regenerate) hoặc `Xoá draft`

### Dữ liệu

- Trip draft summary (fields đã nhập, trạng thái AI generation)

---

## Weather cards

### Mục tiêu

Tạo cảm giác “travel assistant” ngay trên dashboard.

### UI

- 2–3 mini cards:
  - `Hôm nay` / `Ngày mai` / `Trong trip gần nhất`
- Card gồm:
  - Icon thời tiết
  - Nhiệt độ min/max
  - Mô tả ngắn
  - Tag cảnh báo mưa (nếu có)

### Dữ liệu

- `date`, `tempMin`, `tempMax`, `rainProbability`, `summary`
- Liên kết tới trip gần nhất (optional)

---

## Saved destinations

### Mục tiêu

Cho phép user “thu thập” nơi muốn đi, sau đó lập trip nhanh.

### UI

- List 4–6 item (card nhỏ):
  - Tên địa điểm
  - Category/tag
  - CTA: `Plan trip` hoặc `Add to trip`

### Dữ liệu

- `placeId`, `name`, `category`, `tags`, `city`

---

## AI suggestions

### Mục tiêu

AI gợi ý mang tính “tăng giá trị” chứ không spam.

### UI

- Card “Gợi ý cho bạn”:
  - 2–3 suggestion items
  - Mỗi item có icon + 1 câu gợi ý
  - CTA nhỏ: `Áp dụng` / `Xem thêm`

### Loại gợi ý (examples)

- “Bạn thường chọn trip 2–3 ngày, muốn đặt default không?”
- “Trip Nha Trang sắp tới có khả năng mưa ngày 2, cân nhắc đổi điểm trong nhà.”

### Dữ liệu

- suggestion list (text + type + optional action payload)

---

## Quick actions

### UI

Hàng button/tiles (2×2) ở cột phải hoặc dưới header:

- `Tạo trip mới`
- `Xem trips đã lưu`
- `Tìm địa điểm`
- `Cập nhật sở thích`

---

## States

### Empty state (user mới)

- Hero card: “Tạo chuyến đi đầu tiên”
- Gợi ý prompt examples
- Hide một số section (weather/saved) hoặc show placeholders.

### Loading state

- Skeleton cho trip list + cards.

### Error state

- Card lỗi nhỏ theo section, có nút retry.

