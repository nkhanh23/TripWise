# Frontend Coding Rules - AI Smart Travel Planner

Bộ quy tắc lập trình bắt buộc áp dụng cho Web Frontend của TripWise.

---

## 1. Framework boundary

- Frontend web production dùng `Next.js + TypeScript`.
- Hướng routing chuẩn là `App Router`.
- Không tạo mới màn hình production bằng Vite/CRA song song với app `web/`.
- Mock UI React/Vite cũ tại `web-archive-vite-ui/` chỉ dùng làm visual reference, không phải nơi phát triển production tiếp theo.

## 2. Visual consistency với mock UI

- UI mới phải bám sát mock React đã chốt về layout, spacing, tone, phân cấp component và trải nghiệm chính.
- Có thể thay đổi implementation để phù hợp Next.js, nhưng không tự ý đổi phong cách giao diện nếu chưa có quyết định mới.
- Khi cần chuyển một màn từ mock sang app thật, ưu tiên map lại structure và states trước, rồi mới tinh chỉnh kỹ thuật.

## 3. Kết nối API & client wrapper

- Bắt buộc dùng một API client tập trung, ví dụ Fetch wrapper hoặc Axios instance.
- Chỉ đọc `NEXT_PUBLIC_*` env ở browser.
- API base URL của frontend phải đi qua env public an toàn, ví dụ `NEXT_PUBLIC_API_BASE_URL`.
- Không hardcode backend URL trong component.

## 4. Token & bảo mật

- Access token không được hardcode trong code hoặc commit vào file cấu hình.
- Frontend không được chứa Gemini API key, JWT secret, database password hay secret backend khác.
- Web client không được gọi trực tiếp Gemini API, OSRM API hoặc Weather API; mọi request phải đi qua backend TripWise.

## 5. UX states

- Tất cả thao tác có độ trễ lớn phải có loading/skeleton rõ ràng.
- Thông báo lỗi phải thân thiện với người dùng cuối, không lộ chi tiết kỹ thuật thô.
- Nút submit quan trọng phải có trạng thái disabled/pending để tránh double submit.

## 6. Rendering & performance

- Tách map thành module riêng khi đến phase map integration.
- Lazy load phần map hoặc các khối nặng khi phù hợp.
- Tránh để thay đổi state nhỏ làm rerender toàn bộ layout hoặc map panel.

## 7. Map & media rules

- Khi triển khai map, dùng Leaflet + OpenStreetMap theo đúng roadmap phase.
- Marker, route, overlays nên nhận dữ liệu qua props rõ ràng để dễ test và tái sử dụng.
- Ảnh hiển thị production nên đi qua CDN hoặc URL đã tối ưu, không dùng asset nặng bừa bãi.
