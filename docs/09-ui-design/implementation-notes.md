# Implementation Notes (UI Architecture Only)

Tài liệu này gợi ý cách triển khai UI theo đúng design spec trong folder `09-ui-design/`.  
Không viết code thật; chỉ mô tả kiến trúc, cách tách component, state, và lưu ý map/route.

---

## Web (ReactJS hoặc Next.js)

### Khuyến nghị stack UI

- Framework: ReactJS hoặc Next.js (chốt sau, nhưng thiết kế component nên portable).
- Styling: TailwindCSS (token hóa theo `design-system.md`).
- UI primitives: shadcn/ui (button, input, dialog, tabs, dropdown).
- Map: Leaflet / react-leaflet + OpenStreetMap tiles.

### Cấu trúc UI modules (gợi ý)

- `ui/shell`: AppShell, layout split-screen, responsive wrappers.
- `ui/trip`: TripHeader, TripStats, Timeline, TimelineItem, BudgetCard.
- `ui/map`: MapPanel, MapMarker, RoutePolyline, MapOverlays (SearchBar, InstructionCard, NearestLabel).
- `ui/common`: StatusTag, Card, Skeleton, EmptyState, ErrorBanner.

### State management (gợi ý)

Chia state theo scope:

- `route state`: selected day, selected stop, route geometry/steps.
- `map view state`: center/zoom, hovered marker, overlay open/close.
- `data state`: trip detail fetch, loading/error states.

Nguyên tắc:

- Selection thay đổi không được làm rerender toàn bộ map nếu tránh được.
- Tách “map rendering state” khỏi “panel list state”.

### Leaflet / OpenStreetMap notes

- Overlay layering:
  - Map canvas dưới
  - UI overlay (search/instruction) trên (z-index cao), theo glass rules.
- Safe areas:
  - không che attribution của OSM
  - không che zoom controls
- Marker:
  - marker có trạng thái selected + badge số thứ tự
  - cluster nếu số điểm nhiều (future)

### OSRM route line notes

- Route geometry có thể rất dài; cần lưu ý:
  - simplify theo zoom (client) hoặc server gửi geometry tối ưu
  - tránh setState liên tục khi user drag map
- Khi OSRM fail:
  - UI fallback: vẫn hiển thị marker
  - route: ẩn hoặc vẽ straight line nhẹ (nếu cần “cảm giác nối điểm”)

### Mapping Transportation → OSRM profile (gợi ý)

Để UI nhất quán, nên chuẩn hóa `transportationProfile` (UI) và mapping sang profile thực tế khi gọi OSRM:

| UI label | UI value | OSRM profile gợi ý | Ghi chú |
|---|---|---|---|
| Đi bộ | `walking` | `walking` | nếu server OSRM hỗ trợ; nếu không thì dùng `foot`/mapping nội bộ |
| Xe máy | `motorbike` | `driving` | OSRM public thường không có “motorbike”; dùng `driving` nhưng UI label vẫn “Xe máy” |
| Ô tô | `car` | `driving` | chuẩn |
| Xe đạp | `bicycle` | `cycling` | nếu server hỗ trợ; nếu không fallback `driving` + warning |

Nguyên tắc UX:

- Nếu backend/profile thực tế khác label UI, UI vẫn hiển thị theo lựa chọn của user nhưng có thể thêm hint nhỏ: “Tuyến đường tính theo profile gần nhất”.

### UX performance

- Split-screen layout: left panel scroll riêng để map luôn ổn định.
- Lazy load map module khi vào màn Trip Detail để giảm bundle (khuyến nghị).
- Skeleton loading giúp cảm giác nhanh.

---

## Mobile (Flutter)

### Khuyến nghị stack UI

- Flutter UI theo `ui-layout-mobile.md`.
- Map: `flutter_map` + OSM tiles.
- Bottom sheet: `DraggableScrollableSheet` (native-like) hoặc package tương đương (quyết định sau).

### Kiến trúc widget (gợi ý)

- `TripDetailMapScreen`
  - `Stack`
    - `MapWidget`
    - `TopSearchBarOverlay`
    - `TripSummaryOverlay`
    - `InstructionCardOverlay`
    - `ItineraryBottomSheet`
    - `MapControls` (zoom/recenter)

### Marker + route

- Marker nên là widget custom để:
  - giữ consistent style (brand blue + white stroke)
  - selected state (scale + glow)
  - order badge (1..n)
- Route polyline:
  - style giống web (brand blue + halo)
  - nếu geometry dài: cân nhắc simplify

### Interaction notes

- Chọn timeline item trong bottom sheet → focus map marker (animate camera).
- Khi bottom sheet expanded → giảm khả năng map pan/zoom để tránh conflict gesture.

---

## Mapping giữa spec và implementation

Luôn đối chiếu theo thứ tự ưu tiên:

1. `design-system.md` (tokens + rules)
2. `ui-layout-web.md` / `ui-layout-mobile.md` (layout)
3. `trip-detail-map-spec.md` (core behavior)
4. `component-spec.md` (API component)

---

## Các điểm cần chốt trước khi code UI

- Web: chọn ReactJS hay Next.js (ảnh hưởng routing + data fetching).
- Strategy lấy map tiles (OSM public vs self-host) và caching policy.
- Strategy route geometry: geojson vs polyline encoded.
- Quyết định “Add stop / Edit itinerary” có nằm trong MVP không (ảnh hưởng interaction và component scope).
