# UI Layout Web (Split-screen Dashboard)

Tài liệu này mô tả layout web theo phong cách dashboard split-screen (inspiration Trek E‑MTB): **trái là trip detail / itinerary timeline / AI assistant**, phải là **bản đồ tương tác**.

Mục tiêu layout:

- Cho cảm giác “thiết bị / cockpit”: khung app nổi trên nền ấm, bo góc lớn, shadow mềm.
- Panel trái tối ưu đọc và thao tác nhanh (scroll nội bộ, sticky header).
- Panel phải ưu tiên map (tương tác mượt, overlay tối giản, route + marker rõ).

---

## Outer background

- Nền page: dùng `bg.canvas` hoặc gradient nhẹ `bg.canvas → bg.canvasAlt`.
- Có thể thêm noise rất nhẹ (optional) để bớt “phẳng”, nhưng không được làm rối.
- App shell luôn nằm giữa và có khoảng thở:
  - Desktop: margin 24–32px (tùy kích thước màn hình).
  - Tablet: margin 16–20px.

---

## Main app shell

### Kích thước và cấu trúc

- App shell là container bo góc lớn (24–32px), shadow `shadow.lg`.
- Bên trong chia 2 cột:
  - Trái: “Trip panel”
  - Phải: “Map panel”

### Tỉ lệ đề xuất (Desktop)

| Element | Width |
|---|---|
| Left panel | 420–520px (tối ưu 480px) |
| Right panel | phần còn lại |

Quy tắc:

- Left panel **không quá hẹp** (timeline + cards sẽ bị bí).
- Right panel phải đủ rộng để map nhìn “đã” (không dưới 55% chiều ngang trên desktop).

### Scroll strategy

- `body`: không scroll (hoặc scroll rất ít).
- App shell chiều cao gần full viewport.
- Left panel: scroll riêng (itinerary dài).
- Map panel: không scroll (map pan/zoom).

---

## Left sidebar (tuỳ chọn)

Tuỳ theo scope MVP, “sidebar” có thể là:

- **Option A (MVP-friendly)**: Không có sidebar riêng; thay bằng top header nhỏ trong left panel (logo + quick actions).
- **Option B (Full dashboard)**: Sidebar hẹp 72–84px chứa icon navigation.

Khuyến nghị MVP: **Option A** để giảm complexity, vẫn giữ đúng “feel” Trek bằng cách dùng header + cards.

### Nếu có sidebar (Option B)

- Width: 72–84px
- Items: icon-only, tooltip on hover
- Active: nền `brand.primarySoft`, icon `brand.primary`
- Footer: avatar + settings

---

## Left trip detail panel

### Cấu trúc khối (từ trên xuống)

1. **Trip header (sticky)**:
   - Trip title (1–2 dòng)
   - Duration + date range
   - Status tags (2–4 tag)
   - Quick actions: Save, Share, Regenerate (icon buttons)
2. **Summary stats row**:
   - Distance, Vehicle, Weather, Estimated cost
3. **AI assistant summary card** (nếu có):
   - “Vì sao lịch trình này hợp?” (ngắn)
   - “Điều chỉnh theo thời tiết/budget” (bullet ngắn)
4. **Interactive timeline**:
   - Tabs/ngày (Day 1, Day 2, Day 3…) hoặc segment control
   - Timeline list có thời gian, địa điểm, meta (cost, duration, tags)
5. **Optimization score card**:
   - Score /100 + hint (ví dụ: “Ít di chuyển”, “Phù hợp budget”)
   - CTA nhỏ: “Tối ưu lại”

### Trek/cockpit density rules (để giống ảnh mẫu)

- Header + stats phải cho cảm giác “instrument cluster”:
  - label nhỏ (12px) + value đậm (14–16px)
  - chia block rõ bằng gap 8–12 hoặc divider mảnh `stroke.subtle`
- Timeline item không “card hóa” quá dày: ưu tiên list item với background highlight khi selected, để giống bảng điều khiển.
- Chỉ dùng xanh dương cho: selected day/item, route highlight, CTA chính (tránh bôi xanh lan man).

### Sticky behavior

- Trip header sticky trong left panel (top: 0).
- Tabs ngày sticky ngay dưới header nếu list dài.

### Timeline item interaction

Khi hover/click 1 timeline item:

- Highlight item (nền `brand.primarySoft` nhẹ).
- Map focus marker tương ứng.
- Hiển thị “route instruction card” (bên phải, trên map) nếu item là bước di chuyển.

---

## Right map panel

### Layout cơ bản

Map panel là khung bo góc 24–32px (khớp app shell), nền `bg.panel`, chiếm full height trong shell.

Chứa:

- Map canvas (Leaflet)
- Overlay: search bar, route instruction card, nearest place label, map controls

### Map safe areas

Để tránh overlay che attribution/zoom controls:

- Góc dưới phải: dành chỗ attribution (Leaflet/OSM) + scale bar.
- Góc trên phải: dành chỗ zoom controls (hoặc đưa zoom xuống dưới).

---

## Search bar (map)

Search bar là overlay chính trên map (giống Trek: thanh tìm kiếm nằm trong khung).

### Vị trí và kích thước

- Desktop: top-left trong map, cách mép 16px.
- Width: 320–420px.
- Height: 44px.
- Radius: 999px hoặc 16–20px (tùy cảm giác muốn “pill”).

### Chức năng

- Search place (địa điểm trong DB + suggestion).
- Có 2 mode:
  - `Search`: gõ để tìm, enter để focus.
  - `Filter`: filter category/tag (optional).

### Kết quả tìm kiếm

- Dropdown overlay dưới search bar, max-height 280–340px, scroll.
- Item hiển thị:
  - Tên
  - Category/tag
  - Khoảng cách tới route hiện tại (nếu có)

---

## Route geometry (polyline)

### Visual

- Màu: `brand.primary` (xanh dương sáng).
- Stroke width:
  - Desktop: 4–5px
  - Zoom gần: 5–6px (tùy scale)
- Outer stroke (halo): trắng 2px để nổi trên nền map.
- Thêm “direction cues” nhẹ (optional): dashed overlay hoặc arrows rất nhẹ.

### Quy tắc hiển thị

- Không render polyline quá dày gây “bệt” map.
- Với route nhiều điểm: ưu tiên hiển thị theo ngày (Day tabs) để giảm rối.
- Khi hover 1 timeline item: highlight đoạn route tương ứng (đậm hơn), phần còn lại mờ đi.

---

## Marker system

### Phân loại marker

- `itinerary stop`: marker có số thứ tự.
- `suggested` (từ search): marker màu trung tính + viền xanh.
- `hotel/origin`: marker đặc biệt (icon home/bed), không dùng số.

### Trạng thái marker

- Default: bình thường.
- Selected: scale 1.1 + glow + z-index cao.
- Visited/done: dùng accent lime, giảm độ nổi.

### Popup/tooltip

Tooltip (hover) ngắn:

- Tên địa điểm + thời gian dự kiến.

Popup (click) đầy đủ:

- Tên + ảnh nhỏ (nếu có)
- Category + tags
- Cost + duration
- CTA: “Thêm vào lịch trình” (nếu từ search) hoặc “Xem chi tiết”

---

## Bottom navigation / route instruction card (map overlay)

Mục tiêu: mô phỏng “instruction card” như dashboard GPS, nằm trên map nhưng không che quá nhiều.

### Vị trí

- Desktop: bottom-center hoặc bottom-right (ưu tiên bottom-right để giống Trek).
- Cách mép: 16px.
- Width: 320–420px.

### Nội dung

- Next step (turn-by-turn): icon mũi tên + mô tả ngắn
- Distance + ETA cho step hiện tại
- Controls:
  - Previous / Next step
  - “Focus route”
  - “Open full directions” (optional)

### Hành vi

- Mặc định ẩn khi chưa có route.
- Hiện khi user:
  - chọn timeline item liên quan di chuyển, hoặc
  - bật “Directions mode”.
- Có thể collapse (chỉ còn 1 dòng) để nhìn map.

### Shortcut/quick controls (desktop, optional)

- `F`: focus route (fit bounds)
- `[` / `]`: previous/next step (khi directions mode)
- `Esc`: đóng directions mode / đóng popup (tuỳ thứ tự ưu tiên)

---

## Empty / loading / error states

### Empty (chưa có trip)

Left panel:

- Empty illustration nhỏ + text: “Chưa có lịch trình. Hãy tạo chuyến đi.”
- CTA: “Tạo chuyến đi”

Map panel:

- Map vẫn hiển thị (cho phép search place).
- Không có marker/route, chỉ có search bar.

### Loading (AI đang tạo lịch trình)

Left panel:

- Skeleton cards cho header + timeline.
- Loading message có tiến trình giả lập: “Đang phân tích sở thích”, “Đang tối ưu tuyến đường”.

Map panel:

- Nếu có origin/destination: hiển thị marker tạm.
- Route polyline chỉ hiện khi có geometry.

### Error

Nguyên tắc:

- Thông báo “thân thiện”, không lộ stacktrace.
- Có nút retry.

Case nên có:

- AI timeout / rate limit
- OSRM lỗi (fallback: vẫn hiển thị marker, route dùng đường thẳng hoặc ẩn)
- Không đủ dữ liệu địa điểm (gợi ý đổi filter hoặc giảm ngày)
