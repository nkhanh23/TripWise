# UI Layout Mobile (Vertical Layering)

Mobile định hướng theo “map-first”: **bản đồ full-screen** là background, UI phủ lên bằng **floating cards** và **bottom sheet**. Tinh thần giống Trek: ít chrome, tập trung vào route + step + summary nhanh.

---

## Tổng quan nguyên tắc

- Map luôn hiện (trừ một số màn “public/auth”).
- Nội dung dày (timeline) nằm trong bottom sheet để:
  - không che map liên tục
  - dễ kéo lên/xuống theo nhu cầu
- Thao tác chính:
  - Search địa điểm
  - Focus marker
  - Xem itinerary theo ngày
  - Xem hướng dẫn di chuyển (turn-by-turn)

---

## Full-screen map background

### Layout

- Map chiếm toàn màn hình, dưới tất cả lớp.
- Các overlay “floating” có shadow mạnh hơn `shadow.mapOverlay` để nổi trên map.
- Dành safe area cho:
  - status bar/notch
  - map attribution (góc dưới)
  - gesture navigation bar (Android/iOS)

### Map controls

- Zoom controls: ưu tiên custom (nút +/-) đặt bên phải giữa màn hình, tránh bị bottom sheet che.
- Recenter button: nút tròn (FAB phụ) đặt gần zoom controls.

---

## Floating top search bar

### Vị trí

- Top, cách status bar + 8–12px.
- Canh giữa ngang hoặc canh trái (tùy phong cách).

### Kích thước

- Height: 44–48
- Radius: 999 (pill) hoặc 18–20
- Padding ngang: 14–16

### Chức năng

- Search place (địa điểm có trong DB + gợi ý).
- Có icon leading (search) + trailing (filter hoặc voice optional).
- Khi focus:
  - dim map nhẹ (overlay 10–16% đen) để tập trung vào dropdown list.
  - list kết quả hiển thị dạng card list, tối đa 60–70% chiều cao.

---

## Floating trip summary card

Card tóm tắt giúp user “nắm nhanh” tình trạng trip khi map đang chiếm màn hình.

### Nội dung

- Trip title
- Date range hoặc “3N2Đ”
- 2–3 status tags
- Summary stats compact: distance / weather / cost
- CTA nhỏ: “Mở chi tiết” (đẩy bottom sheet lên)

### Vị trí

Hai option:

- **Option A (khuyến nghị)**: đặt dưới search bar, width gần full trừ margin 16.
- Option B: đặt dạng “floating pill” ngang ở top, ít nội dung hơn.

### Hành vi

- Khi bottom sheet kéo lên mức cao: summary card collapse (chỉ còn 1 dòng) hoặc ẩn.
- Khi user đang trong “Directions mode”: summary card ưu tiên nhường chỗ cho instruction card.

---

## Bottom sheet itinerary

### Các mức (snap points)

- `Collapsed` (~15–20%): chỉ hiển thị “handle” + day tabs + 1–2 item tiếp theo.
- `Mid` (~45–55%): hiển thị timeline đủ để chọn item.
- `Expanded` (~85–92%): gần full, cho phép xem lịch trình dài + details.

### Nội dung bottom sheet

1. Handle + title “Itinerary”
2. Day tabs (Day 1/2/3)
3. Timeline list:
   - item có time chip, title, meta (cost/duration/tags)
   - item click để focus marker trên map
4. Section phụ (optional):
   - Optimization score
   - AI explanation (ngắn)

### Interaction

- Drag sheet: map vẫn tương tác khi sheet collapsed/mid (tuỳ threshold).
- Khi sheet expanded: ưu tiên scroll list (map interaction giảm).
- Khi user chọn timeline item:
  - sheet tự “snap” về mid (để vẫn thấy map) hoặc giữ nguyên (tuỳ preference).

---

## Turn-by-turn instruction card

### Vị trí

- Nằm trên map, ngay phía trên bottom sheet (tránh chồng lên).
- Dạng card bo 16–20, shadow mạnh.

### Nội dung

- Next instruction (icon mũi tên + câu ngắn)
- Distance + ETA
- Progress: “Step 3/12”
- Buttons: Previous/Next + Focus

### Hành vi

- Hiện khi:
  - Directions mode bật, hoặc
  - user chọn segment route từ timeline
- Có thể swipe ngang để next/prev step (nice-to-have).

---

## Bottom navigation bar

MVP gợi ý 4 tab:

- Home/Dashboard
- Plan (AI Trip Planner)
- Trips (Saved trips)
- Profile

Quy tắc:

- Map screens (Trip detail) có thể ẩn bottom nav và dùng back + quick actions để tối ưu không gian.
- Nếu vẫn giữ bottom nav: bottom sheet phải chừa safe area để không che tab bar.

---

## Responsive behavior

### Small phones

- Giảm padding overlay xuống 12–14.
- Summary card rút gọn (chỉ 1 hàng stats).
- Bottom sheet default ở `Mid` để dễ thao tác.

### Tablets

- Có thể mở “split view” nhẹ: map + panel dạng side sheet nếu đủ rộng.

---

## Flutter implementation notes (không code)

- Map: dùng `flutter_map` (OpenStreetMap tiles) + polyline route.
- Bottom sheet:
  - dùng `DraggableScrollableSheet` hoặc `sliding_up_panel` (tuỳ quyết định sau).
- Floating cards:
  - dùng `Stack` + `Positioned` + `SafeArea`.
- Marker:
  - custom widget marker để hỗ trợ trạng thái selected + badge số thứ tự.
- Performance:
  - route geometry dài nên simplify theo zoom (client-side) hoặc dùng polyline encoded (nếu backend cung cấp).
  - tránh rebuild toàn map khi chỉ đổi selection; tách state.

