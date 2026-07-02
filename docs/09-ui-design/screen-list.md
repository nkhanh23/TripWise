# Screen List (TripWise)

Tài liệu này liệt kê toàn bộ màn hình cần thiết cho TripWise (MVP + mở rộng gần), theo nhóm chức năng.  
Mỗi màn hình có: **mục đích**, **thành phần UI chính**, **dữ liệu hiển thị**, **hành động người dùng**.

> Ghi chú: Nhóm “Admin pages” có thể tối giản hoặc hoãn nếu MVP chưa cần UI admin.

---

## Public pages

### Landing Page

- Mục đích: giới thiệu TripWise, dẫn user vào flow tạo trip.
- UI chính: hero + trip search prompt + feature cards + how-it-works + showcase + CTA.
- Dữ liệu: nội dung marketing (tĩnh), ví dụ trip mẫu (tĩnh).
- Hành động: nhập điểm đến/prompt, bấm “Bắt đầu lập kế hoạch”, scroll khám phá.

### Pricing (optional)

- Mục đích: mô tả gói (free/pro), giới hạn AI, route, lưu trip.
- UI chính: pricing cards, FAQ.
- Dữ liệu: gói (tĩnh), FAQ (tĩnh).
- Hành động: chọn gói, CTA đăng ký/đăng nhập.

### About / Terms / Privacy (optional)

- Mục đích: pháp lý + giới thiệu.
- UI chính: content page.
- Dữ liệu: văn bản tĩnh.
- Hành động: đọc, mở link liên quan.

---

## Authentication pages

### Sign In

- Mục đích: đăng nhập.
- UI chính: form email/password hoặc OAuth buttons, error banner.
- Dữ liệu: email, trạng thái auth, thông báo lỗi.
- Hành động: submit, login với provider, quên mật khẩu.

### Sign Up

- Mục đích: tạo tài khoản.
- UI chính: form đăng ký, password strength hint.
- Dữ liệu: form state, validation errors.
- Hành động: submit, chuyển sign in.

### Forgot Password / Reset Password (optional)

- Mục đích: khôi phục tài khoản.
- UI chính: form email, OTP/reset link flow.
- Dữ liệu: email, trạng thái gửi email.
- Hành động: gửi yêu cầu, đặt lại mật khẩu.

---

## User dashboard

### Dashboard (Home)

- Mục đích: overview các trip + gợi ý nhanh.
- UI chính: trip list, “continue planning”, weather mini-cards, saved destinations, quick actions.
- Dữ liệu: trips gần đây, trip draft, weather summary, saved places.
- Hành động: mở trip, tạo trip mới, pin trip, xoá/rename.

### Notifications (optional)

- Mục đích: nhắc thay đổi thời tiết, trip sắp đến.
- UI chính: list notifications.
- Dữ liệu: notification items.
- Hành động: mark read, open related trip.

---

## Trip planning pages

### AI Trip Planner

- Mục đích: nhập thông tin để AI tạo lịch trình.
- UI chính: form (destination/date/budget/style/...) + AI suggestion + itinerary preview.
- Dữ liệu: form state, parsed requirement, preview itinerary, loading/progress.
- Hành động: generate/regenerate, chỉnh field, lưu draft.

### Trip Requirement Parser (optional, nếu tách riêng)

- Mục đích: cho user nhập prompt tự nhiên và xem AI parse ra field.
- UI chính: prompt textarea + parsed JSON view (human friendly).
- Dữ liệu: raw prompt, parsed fields, validation.
- Hành động: chỉnh prompt, “áp dụng vào form”.

---

## Trip detail / map pages (core)

### Trip Detail + Map View (Core screen)

- Mục đích: xem toàn bộ itinerary, route, marker, hướng dẫn di chuyển; chỉnh nhẹ.
- UI chính: split-screen (web) hoặc map + bottom sheet (mobile); timeline; search; route instruction card.
- Dữ liệu:
  - trip summary (title, duration, status)
  - itinerary days/items
  - route geometry + distance/duration
  - weather per day
  - selected marker/item state
- Hành động:
  - chọn day
  - click item để focus map
  - search place, add/remove stop (nếu cho phép)
  - bật/tắt directions mode
  - save/share/export

### Place Detail (modal/side sheet)

- Mục đích: xem thông tin chi tiết một địa điểm.
- UI chính: ảnh, tên, category, tags, cost, duration, map mini, CTA.
- Dữ liệu: place detail, ảnh, review summary (nếu có), open hours (nếu có).
- Hành động: add to itinerary, open external link, save favorite.

### Route Details (optional)

- Mục đích: xem breakdown route theo step, total distance/time, phương tiện.
- UI chính: list steps, filters, toggle show alternatives (nếu có).
- Dữ liệu: steps, totals, selected profile.
- Hành động: next/prev step, đổi profile, focus map.

### Explore Places (Map Search) (khuyến nghị có)

- Mục đích: cho user tìm và lưu địa điểm độc lập với trip; cũng là nơi “khám phá” dữ liệu trong hệ thống.
- UI chính:
  - Web: split layout nhẹ (trái list/filter, phải map) hoặc map full + side sheet.
  - Mobile: map full-screen + search bar + results bottom sheet.
- Dữ liệu:
  - search query + filters (category, tags, budget range optional)
  - place list + place detail preview
- Hành động:
  - search/filter
  - mở place detail
  - add to favorites
  - “Add to trip…” (nếu user chọn trip mục tiêu)

---

## Saved / favorite pages

### Saved Trips (Trips library)

- Mục đích: quản lý các trip đã lưu.
- UI chính: grid/list, filters (destination/date/status), search.
- Dữ liệu: trip list, metadata, last updated.
- Hành động: open trip, duplicate, rename, delete.

### Favorites (Saved places)

- Mục đích: lưu địa điểm yêu thích để dùng lại.
- UI chính: list cards + map toggle.
- Dữ liệu: place list, tags.
- Hành động: open place, remove favorite, add to trip.

### Trip Share / Export (optional nhưng nên tính)

- Mục đích: chia sẻ lịch trình qua link hoặc export (PDF/ảnh) (có thể làm sau).
- UI chính: modal hoặc page:
  - preview itinerary dạng gọn
  - options: copy link, export file
- Dữ liệu: trip summary + itinerary preview
- Hành động: copy link, download/export

---

## Profile / settings pages

### Profile

- Mục đích: quản lý thông tin user.
- UI chính: avatar, name, email, preferences.
- Dữ liệu: user profile.
- Hành động: update profile, upload avatar (sau), logout.

### Preferences

- Mục đích: lưu sở thích du lịch mặc định.
- UI chính: travel style, food preference, budget range, mobility.
- Dữ liệu: preference model.
- Hành động: save preferences.

### Settings

- Mục đích: settings chung.
- UI chính: language, theme (future), data export.
- Dữ liệu: settings.
- Hành động: toggle, export data, delete account (optional).

---

## System pages (nên có tối thiểu)

### 404 / Not Found

- Mục đích: xử lý link sai hoặc trip không tồn tại.
- UI chính: empty state + CTA quay về dashboard.
- Dữ liệu: route info.
- Hành động: back home, search trip.

### 500 / Something went wrong

- Mục đích: fallback khi lỗi hệ thống.
- UI chính: error state + retry.
- Dữ liệu: error code (ẩn chi tiết).
- Hành động: retry, contact/support (optional).

---

## Admin pages (nếu cần cho MVP dữ liệu)

### Admin Login

- Mục đích: đăng nhập admin.
- UI chính: form + role check.
- Dữ liệu: auth state.
- Hành động: login.

### Place Management (Admin)

- Mục đích: thêm/sửa/ẩn địa điểm trong DB (đảm bảo “data thật”).
- UI chính: table + filters + create/edit form + map picker.
- Dữ liệu: places, categories, tags, location.
- Hành động: create/edit, verify status, import batch (optional).

### Hotel Management (Admin, optional)

- Mục đích: chuẩn hóa danh sách hotel.
- UI chính: table + edit.
- Dữ liệu: hotels, price level, location.
- Hành động: verify/update.
