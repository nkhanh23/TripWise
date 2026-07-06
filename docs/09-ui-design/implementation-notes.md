# Implementation Notes (UI Architecture Only)

Tài liệu này mô tả hướng triển khai UI theo đúng design spec trong `docs/09-ui-design/`.
Không viết business logic thật; chỉ mô tả kiến trúc, cách tách component, state và các lưu ý khi dựng map/route.

---

## Web (ReactJS + Vite)

### Quyết định hiện tại

- Frontend web production đã chốt dùng `ReactJS + Vite`.
- Hướng triển khai nhất quán là `React Router`.
- Source UI từ `web-archive-vite-ui/` đã được dùng làm nền chính cho production web trong `web/`.
- Ở các phase UI tiếp theo, code mới phải bám cấu trúc Vite hiện tại nhưng giao diện vẫn phải giữ đúng visual language đã chốt.

### Vì sao chọn Vite

- Phù hợp với yêu cầu mới là dùng ReactJS thuần cho production web mà không phụ thuộc Next.js.
- Giữ cấu hình frontend đơn giản, build nhanh, phù hợp với web client tách riêng backend Spring Boot.
- Dễ tái sử dụng trực tiếp các page/component/layout từ `web-archive-vite-ui/`.

### Visual reference rules

- `web-archive-vite-ui/` là nguồn tham chiếu chính cho layout, spacing, phân cấp component và phong cách retro.
- Sau migration, `web/` là codebase production chính còn `web-archive-vite-ui/` là archive/source tham chiếu.
- Khi có khác biệt giữa code production trong `web/` và archive UI, ưu tiên:
  1. Giữ đúng trải nghiệm thị giác và flow người dùng của mock UI.
  2. Chuyển implementation sang pattern phù hợp với ReactJS + Vite.
  3. Chỉ điều chỉnh nhỏ nếu cần cho SSR/client boundary hoặc maintainability.

### Khuyến nghị stack UI

- Framework: ReactJS + Vite + TypeScript.
- Styling nền tảng: CSS tokens và CSS modules hoặc giải pháp nhẹ tương đương theo scope phase.
- UI primitives: xây theo design system nội bộ, không cần kéo thêm framework lớn nếu chưa thật sự cần.
- Map: Leaflet / react-leaflet + OpenStreetMap tiles ở phase map integration.

### Cấu trúc UI modules gợi ý

- `src/main.tsx`: bootstrap Vite app.
- `src/App.tsx`: route tree chính bằng React Router.
- `src/pages`: page-level wrappers/components cho route production.
- `src/components/layout`: app shell, split-screen layout, responsive wrappers.
- `src/components/ui`: primitive components như button, input, card, status, skeleton.
- `src/components/features/*`: component theo màn hình hoặc flow nghiệp vụ.
- `src/lib`: helper nhẹ, constants, formatter, env parsing.

### State management gợi ý

Chia state theo scope:

- `route state`: selected day, selected stop, route geometry/steps.
- `map view state`: center/zoom, hovered marker, overlay open/close.
- `data state`: trip detail fetch, loading/error states.

Nguyên tắc:

- Tránh để selection làm rerender toàn bộ map nếu không cần.
- Tách state render map khỏi state của panel danh sách.
- Chỉ thêm state library khi thật sự cần ở phase phù hợp.

### Leaflet / OpenStreetMap notes

- Overlay layering:
  - Map canvas ở dưới.
  - UI overlay ở trên với z-index rõ ràng.
- Safe areas:
  - Không che attribution của OSM.
  - Không che zoom controls.
- Marker:
  - Có selected state.
  - Có badge thứ tự nếu flow cần.

### OSRM route line notes

- Route geometry có thể dài; cần cân nhắc simplify theo zoom hoặc response tối ưu từ backend.
- Tránh cập nhật state liên tục khi người dùng kéo map.
- Khi OSRM fail:
  - Vẫn hiển thị marker.
  - Route có thể ẩn hoặc dùng fallback nhẹ nếu phase cho phép.

### UX performance

- Split-screen layout: panel trái scroll riêng để map ổn định.
- Lazy load map module khi vào màn Trip Detail.
- Có skeleton/loading rõ ràng để giữ cảm giác phản hồi nhanh.

---

## Mobile (Flutter)

### Khuyến nghị stack UI

- Flutter UI theo `ui-layout-mobile.md`.
- Map: `flutter_map` + OSM tiles.
- Bottom sheet: `DraggableScrollableSheet` hoặc tương đương.

### Kiến trúc widget gợi ý

- `TripDetailMapScreen`
  - `Stack`
  - `MapWidget`
  - `TopSearchBarOverlay`
  - `TripSummaryOverlay`
  - `InstructionCardOverlay`
  - `ItineraryBottomSheet`
  - `MapControls`

### Marker + route

- Marker nên là widget custom để giữ brand consistency.
- Route polyline nên đồng bộ style với web.
- Nếu geometry dài, cân nhắc simplify.

### Interaction notes

- Chọn timeline item trong bottom sheet sẽ focus map marker.
- Khi bottom sheet mở rộng, cần tránh conflict gesture với map.

---

## Mapping giữa spec và implementation

Luôn đối chiếu theo thứ tự ưu tiên:

1. `design-system.md`
2. `ui-layout-web.md` / `ui-layout-mobile.md`
3. `trip-detail-map-spec.md`
4. `component-spec.md`
5. `web-archive-vite-ui/` như visual reference cho web

---

## Các điểm đã chốt trước khi code UI

- Web production dùng `React Router` trong app Vite.
- UI web phải bám mock archive tại `web-archive-vite-ui/`.
- Backend vẫn là nguồn dữ liệu duy nhất; frontend không gọi trực tiếp Gemini, OSRM hay Weather.
- Leaflet/OSM và route polyline để đúng phase map integration, không kéo sớm vào phase setup/design system.
