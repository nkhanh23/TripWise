# 09-ui-design (TripWise)

Thư mục này chứa bộ tài liệu nền tảng UI/UX cho TripWise: design system, layout Web/Mobile, danh sách màn hình, đặc tả các màn hình chính, danh sách component, thư viện prompt và ghi chú triển khai.

Mục tiêu của `09-ui-design/`:

- Chuẩn hóa ngôn ngữ thiết kế: màu sắc, typography, spacing, radius, shadow.
- Chuẩn hóa bố cục split-screen cho web: trái là AI/itinerary, phải là map.
- Chuẩn hóa các trạng thái UI như empty, loading, error để đội triển khai không phải tự nghĩ lại từ đầu.
- Làm nguồn tham chiếu thống nhất để code UI thật bám sát cùng một visual direction.

> Lưu ý: Folder này không chứa code UI production.

## Cách dùng nhanh

1. Bắt đầu với `design-system.md` để nắm token và quy tắc style.
2. Đọc `ui-layout-web.md` để hiểu bố cục split-screen và cấu trúc panel.
3. Đọc `trip-detail-map-spec.md` để nắm màn hình quan trọng nhất của web UI.
4. Đọc `screen-list.md` để biết phạm vi màn hình, dữ liệu hiển thị và hành động người dùng.
5. Đọc lần lượt các spec còn lại như `landing-page-spec.md`, `dashboard-spec.md`, `ai-trip-planner-spec.md`.
6. Đọc `component-spec.md` để biết component nào cần tạo và behavior mong đợi.
7. Đọc `implementation-notes.md` để hiểu hướng triển khai frontend hiện tại bằng ReactJS + Vite.

## Quy ước hiện tại cho frontend web

- Codebase production web đã chốt dùng `ReactJS + Vite` trong thư mục `web/`.
- React Router là hướng triển khai mặc định cho code mới.
- `web-archive-vite-ui/` không còn chỉ là mock reference; đây là nguồn UI gốc đã được migrate vào `web/`.
- `web-archive-vite-ui/` vẫn được giữ lại như archive/reference để so đối chiếu giao diện khi cần.
- Giao diện production phải tiếp tục bám sát layout, mood, component hierarchy và trải nghiệm đã chốt từ archive UI.

## Thứ tự đọc khuyến nghị

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

## Danh sách tài liệu trong folder

- `design-system.md`: token và quy tắc style cho web/mobile.
- `ui-layout-web.md`: đặc tả layout split-screen cho web dashboard.
- `ui-layout-mobile.md`: đặc tả layout mobile theo vertical layering.
- `screen-list.md`: danh sách màn hình, mục đích, dữ liệu và hành động.
- `landing-page-spec.md`: đặc tả landing page.
- `dashboard-spec.md`: đặc tả user dashboard.
- `ai-trip-planner-spec.md`: đặc tả màn AI trip planner.
- `trip-detail-map-spec.md`: đặc tả Trip Detail + Map View.
- `component-spec.md`: danh sách component UI và behavior mong đợi.
- `prompt-library.md`: prompt mẫu phục vụ UI generation.
- `implementation-notes.md`: ghi chú kiến trúc frontend và mapping từ mock UI sang app thật.

## Nguyên tắc ưu tiên khi có mâu thuẫn

1. `design-system.md`
2. `ui-layout-*.md`
3. `trip-detail-map-spec.md`
4. `component-spec.md`
5. Quy ước ReactJS + Vite + `web-archive-vite-ui/` trong file này và `implementation-notes.md`
