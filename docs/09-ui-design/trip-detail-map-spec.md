# Trip Detail + Map View Spec (Core Screen)

Đây là màn hình quan trọng nhất của TripWise, lấy cảm hứng trực tiếp từ dashboard split-screen “Trek E‑MTB”: **cảm giác cockpit**, khung app nổi trên nền ấm, panel trái dày thông tin, panel phải là map + overlay tinh gọn.

Tài liệu này mô tả:

- Layout desktop split-screen
- Layout mobile map-first + bottom sheet
- Component và dữ liệu
- Trạng thái (empty/loading/error)
- Interaction giữa timeline ↔ map ↔ route instructions

---

## Mục tiêu UX

- User luôn trả lời được 3 câu hỏi:
  1. “Hôm nay đi đâu, theo thứ tự nào?”
  2. “Đường đi ra sao, mất bao lâu?”
  3. “Trip này có ổn với budget/thời tiết không?”
- Tương tác phải nhanh:
  - click timeline item → focus map marker + highlight route segment
  - đổi ngày → map cập nhật marker/route theo ngày
  - search → thêm địa điểm (nếu cho phép) hoặc xem chi tiết

---

## Trek E‑MTB cues (áp dụng cụ thể cho màn này)

Để màn Trip Detail “ra chất Trek”, ngoài token màu/radius/shadow, cần các cues sau trong chính layout:

1. “Cockpit header”: header trái dạng cụm thông tin kỹ thuật:
   - title + duration
   - status tags ít nhưng đắt giá
   - số liệu hiển thị như stat blocks (label nhỏ + value đậm)
2. “HUD overlays” trên map:
   - search bar + instruction card nổi như HUD (glass + shadow mapOverlay)
   - overlay có safe area rõ, không che zoom/attribution
3. “Focus loop”: chọn timeline luôn tạo phản hồi đồng thời ở map (marker + segment + instruction).

---

## Layout Desktop (>= 1024px)

### Split-screen structure

- Outer background: `bg.canvas` / `bg.canvasAlt`
- App shell: bo 24–32px, shadow `shadow.lg`, height gần full viewport
- Left panel: 420–520px, scroll riêng
- Right panel: map full height

### Outer padding

- 24px (desktop), 16px (tablet)

---

## Bên trái: Trip detail panel

### 1) Trip title

- Style: `text.h1` (20/28), max 2 dòng, ellipsis nếu dài.
- Subtitle: destination + date range (text.secondary)

### 2) Duration

Hiển thị:

- “3 ngày 2 đêm” hoặc “01/07 – 03/07”
- Nếu có: “Start at 08:00” (optional)

### 3) Status tags

Tag hiển thị ngay dưới title (tối đa 4):

- `Draft` / `Planned` / `Completed`
- `Optimized` (lime)
- `Rain risk` (warn) (nếu weather)
- `Over budget` (error) (nếu cost)

Khuyến nghị hiển thị label tiếng Việt (để thống nhất app):

- `Nháp` / `Đã lên kế hoạch` / `Hoàn tất`
- `Đã tối ưu`
- `Nguy cơ mưa`
- `Vượt ngân sách`

### 4) Summary stats

Hiển thị dạng row 2×2 hoặc 1 hàng scroll ngang:

- Distance (km)
- Vehicle (profile)
- Weather (icon + summary ngắn)
- Estimated cost (VND)

Quy tắc:

- Số liệu dùng tabular numbers.
- Không hiển thị quá dài; có tooltip xem chi tiết.

### 5) Interactive timeline

#### Điều hướng theo ngày

- Tabs: Day 1 / Day 2 / Day 3 (hoặc theo date).
- Khi đổi tab:
  - Map update marker/route của ngày đó.
  - Timeline scroll về top ngày.

#### Cấu trúc timeline item

Mỗi item gồm:

- Time chip (08:00 hoặc “Sáng”)
- Place name (primary)
- Meta line:
  - category / tags (1–2 tag)
  - duration (phút)
  - cost estimate (nếu có)
- Trailing:
  - icon action: “more” (optional)

Nếu timeline có “đoạn di chuyển” (step giữa 2 điểm), nên thể hiện như một item riêng (nhẹ, ít nổi) để hỗ trợ turn-by-turn:

- Item type: `transfer`
- Hiển thị: “Di chuyển đến {nextPlace} • {duration} • {distance}”
- Click: highlight segment tương ứng + mở instruction card tại step đầu của segment đó

#### Interaction timeline

- Hover: highlight nhẹ, show quick preview trên map (tooltip marker).
- Click:
  - set `selectedStopId`
  - map focus marker
  - route instruction card (nếu item có “di chuyển tới”) hiện step liên quan
- Long list:
  - virtualize (future) nhưng MVP có thể scroll thường nếu data nhỏ.

Keyboard (web, tối thiểu):

- `↑/↓`: di chuyển selection trong timeline (khi focus trong list)
- `Enter`: focus marker trên map
- `Esc`: clear selection (map về trạng thái route/day)

### 6) Optimization score / estimated cost

Card riêng dưới timeline hoặc sticky bottom (tuỳ thiết kế):

- Score /100 (progress ring hoặc bar)
- 2–3 bullet “tại sao”:
  - “Ít di chuyển”
  - “Phù hợp budget”
  - “Ưu tiên ngoài trời buổi sáng”
- Estimated total cost + breakdown nhỏ (optional)

CTA:

- `Tối ưu lại` (primary small) hoặc `Tạo lại` (nếu scope)

---

## Bên phải: Map panel

### 1) Search bar

Overlay top-left, width 320–420.

Chức năng:

- Search place (DB) + suggestion.
- Nếu trip đang mở: có mode “Add stop to Day X”.

### 2) Map

Map canvas:

- Tile layer OSM
- Markers theo ngày/route
- Route line (polyline)

### 3) Markers

Marker types:

- numbered stops (1..n)
- hotel/origin marker
- search result marker

Marker selected:

- scale 1.1 + glow + z-index.

Hover behavior (desktop):

- Hover marker: highlight timeline item tương ứng (nếu có).
- Hover timeline item: highlight marker tương ứng.

### 4) Route line

Visual:

- stroke `brand.primary`, halo trắng.
- segment highlight khi chọn timeline item.

### 5) Nearest place label

Mục tiêu: micro-overlay nhỏ (giống Trek hiển thị label):

- Hiển thị “Nearest: {placeName} • {distance}m”
- Chỉ hiện khi:
  - user pan map ra khỏi route, hoặc
  - user hover marker, hoặc
  - selection thay đổi
- Auto-hide sau 2–4 giây (trừ khi hover).

### 6) Turn-by-turn instruction card

Overlay bottom-right (khuyến nghị) hoặc bottom-center.

Nội dung:

- Next instruction + icon direction
- Distance + ETA
- Step index (3/12)
- Controls: prev/next + focus

Hành vi:

- Mặc định ẩn nếu chưa có route.
- Hiện khi:
  - user bật directions mode, hoặc
  - user click item “di chuyển” trong timeline.

Ngoài ra:

- Khi user `Next/Prev` step: map có thể auto-pan nhẹ để “đi theo” step (tuỳ bật/tắt).
- Có nút `Tắt chỉ đường` để quay về map sạch.

---

## Layout Mobile (< 768px)

Mobile ưu tiên map full-screen + bottom sheet itinerary theo `ui-layout-mobile.md`.

### Cấu trúc

- Map full-screen
- Top: search bar + (optional) summary card
- Bottom: draggable itinerary sheet (collapsed/mid/expanded)
- Instruction card: nằm ngay trên sheet

### Hành vi quan trọng

- Khi user chọn timeline item trong sheet:
  - map focus marker
  - sheet snap về mid (khuyến nghị) để vẫn thấy map
- Khi user kéo sheet expanded:
  - giảm interaction map (tránh scroll conflict)

---

## Data contract (UI-level, không gắn entity)

### Trip summary

- `tripId`
- `title`
- `destinationName`
- `dateRange` hoặc `days/nights`
- `status`
- `stats`: distance, duration, cost, weatherSummary

### Itinerary model (UI)

- `days[]`:
  - `dayIndex`, `label`, `date`
  - `items[]`:
    - `stopId`
    - `timeLabel` (giờ hoặc slot)
    - `placeName`
    - `placeCategory`
    - `tags[]`
    - `estimatedCost`
    - `durationMinutes`
    - `lat`, `lng`

### Route model (UI)

- `profile` (walking/driving/cycling/motorbike mapping)
- `totalDistanceMeters`, `totalDurationSeconds`
- `geometry` (LineString)
- `steps[]` (turn-by-turn):
  - `instruction`, `distance`, `duration`, `maneuverType`

---

## Empty / Loading / Error states

### Empty

Case: trip id không tồn tại hoặc user chưa tạo itinerary.

- Left panel: empty card + CTA “Tạo lịch trình”
- Map: vẫn render map + search; không marker/route.

### Loading

Case: đang fetch trip detail hoặc đang generate route.

- Left: skeleton header + timeline
- Map:
  - show markers nếu đã có stops
  - polyline hiển thị khi geometry sẵn

### Error

Case:

- Trip fetch lỗi (401/404/500)
- OSRM lỗi (route không có)
- Weather lỗi (chỉ ẩn weather)

UI:

- Thông báo theo vùng:
  - error banner nhỏ trong left panel
  - toast nhẹ (optional)
- Với OSRM lỗi: show fallback “Không tính được tuyến đường, vẫn hiển thị các điểm.”
