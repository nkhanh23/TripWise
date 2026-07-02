# 09-ui-design (TripWise)

Thư mục này chứa **bộ tài liệu nền tảng UI/UX** cho TripWise: design system, layout Web/Mobile, danh sách màn hình, đặc tả các màn hình chính, danh sách component, thư viện prompt và ghi chú triển khai.

Mục tiêu của `09-ui-design/`:

- Chuẩn hóa **ngôn ngữ thiết kế** (màu sắc, typography, spacing, radius, shadow).
- Chuẩn hóa **bố cục split-screen** (trái: AI/itinerary, phải: map) lấy cảm hứng từ dashboard “Trek E‑MTB”.
- Chuẩn hóa **mẫu tương tác bản đồ** (marker, route line, search, turn-by-turn).
- Chuẩn hóa **trạng thái UI** (empty/loading/error) để khi code không phải “tự nghĩ lại từ đầu”.
- Làm “nguồn sự thật” để AI/dev có thể dựng UI chính xác và nhất quán.

> Lưu ý: Folder này **không chứa code UI** và không yêu cầu sửa backend/frontend hiện tại.

---

## Cách dùng nhanh

1. Bắt đầu với `design-system.md` để nắm token và quy tắc style (đây là nền cho Tailwind config và Flutter theme sau này).
2. Đọc `ui-layout-web.md` để hiểu bố cục split-screen, cấu trúc panel trái/phải, map + overlay.
3. Đọc `trip-detail-map-spec.md` để nắm **màn hình quan trọng nhất** (layout + states + micro-interactions).
4. Đọc `screen-list.md` để biết phạm vi màn hình, dữ liệu hiển thị và hành động người dùng.
5. Đọc lần lượt các spec còn lại (`landing-page-spec.md`, `dashboard-spec.md`, `ai-trip-planner-spec.md`) để hiểu flow.
6. Đọc `component-spec.md` để biết component nào cần tạo và props/behavior mong đợi.
7. Dùng `prompt-library.md` để tạo UI bằng Trae Design/Code theo đúng style, tránh prompt chung chung.
8. Dùng `implementation-notes.md` để định hướng kiến trúc UI (React/Next + Tailwind + shadcn/ui + Leaflet; Flutter + flutter_map).

---

## Thứ tự đọc khuyến nghị (trước khi tạo UI)

1. `design-system.md`
2. `ui-layout-web.md`
3. `trip-detail-map-spec.md`
4. `component-spec.md`
5. `screen-list.md`
6. `ai-trip-planner-spec.md`
7. `dashboard-spec.md`
8. `landing-page-spec.md`
9. `ui-layout-mobile.md`
10. `implementation-notes.md`
11. `prompt-library.md`

---

## Danh sách tài liệu trong folder

- `design-system.md`: token + quy tắc style (web + mobile).
- `ui-layout-web.md`: đặc tả layout split-screen cho web dashboard.
- `ui-layout-mobile.md`: đặc tả layout mobile theo kiểu vertical layering (map full-screen + floating cards + bottom sheet).
- `screen-list.md`: danh sách màn hình + mục đích + UI + dữ liệu + hành động.
- `landing-page-spec.md`: đặc tả landing page.
- `dashboard-spec.md`: đặc tả user dashboard.
- `ai-trip-planner-spec.md`: đặc tả màn hình AI trip planner (form + suggestion + preview).
- `trip-detail-map-spec.md`: đặc tả Trip Detail + Map View (core screen).
- `component-spec.md`: danh sách component UI + props/behavior/responsive.
- `prompt-library.md`: prompt mẫu cho Trae Design/Code (web + mobile).
- `implementation-notes.md`: ghi chú kiến trúc triển khai frontend (không code).

---

## Nguyên tắc ghi chú (để các file nhất quán)

- Luôn mô tả theo “vai trò UI”: **Shell → Panels → Components → States → Interactions → Data**.
- Tránh mô tả chung chung kiểu “hiện đại, đẹp”; thay bằng **token**, **khoảng cách**, **độ cao**, **mật độ thông tin**, **trạng thái**.
- Các mô tả map luôn gắn với: `Search → Marker → Route → Turn-by-turn → Focus`.
- Khi có mâu thuẫn giữa spec, ưu tiên:
  1. `design-system.md`
  2. `ui-layout-*.md`
  3. `trip-detail-map-spec.md`
  4. các spec màn hình còn lại

