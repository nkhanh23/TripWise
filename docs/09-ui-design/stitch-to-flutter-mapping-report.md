# SUPERSEDED / HISTORICAL — Flutter implementation mapping

> Báo cáo này được giữ để bảo toàn lịch sử thử nghiệm Flutter. Không dùng các Dart paths, widget APIs hoặc phase recommendations bên dưới cho production mobile. Active stack/mapping: React Native + TypeScript + Expo tại [`stitch-to-react-native-mapping-report.md`](./stitch-to-react-native-mapping-report.md).

## 1. Tóm Tắt (Summary)
Đã hoàn thành phân tích toàn diện 26+ màn hình và design tokens từ Google Stitch (`stitch_tripwise_design_system` & `.stitch/designs`), xây dựng bảng ánh xạ màn hình (Screen Mapping), ánh xạ thành phần dùng chung (Component Mapping), cấu trúc thư mục Flutter theo chuẩn Clean Feature-First Architecture, trích xuất đầy đủ bộ tokens (Màu sắc, Typography Inter, Spacing 8pt, Radius, Shadows), và khởi tạo nền tảng Design Tokens cho mobile app.

---

## 2. Bảng Ánh Xạ Màn Hình (Stitch → Flutter Screen Mapping)

| # | Stitch Screen / Thư Mục | Flutter Screen Widget | Feature Module | Đường Dẫn / Route | Trạng Thái / Ghi Chú |
|---|---|---|---|---|---|
| 1 | `welcome` | `WelcomeScreen` | `features/auth` | `/welcome` | Màn hình khởi đầu giới thiệu giá trị |
| 2 | `sign_in` | `SignInScreen` | `features/auth` | `/sign-in` | Đăng nhập tài khoản |
| 3 | `sign_up` | `SignUpScreen` | `features/auth` | `/sign-up` | Đăng ký tài khoản mới |
| 4 | `forgot_password` | `ForgotPasswordScreen` | `features/auth` | `/forgot-password` | Khôi phục mật khẩu qua email |
| 5 | `explore_map` | `ExploreMapScreen` | `features/explore` | `/explore` (Tab 0) | Bản đồ khám phá POI với thanh tìm kiếm nổi |
| 6 | `selected_place` | `SelectedPlaceModal` | `features/place` | `/place/preview` | Bottom sheet xem nhanh thông tin địa điểm |
| 7 | `place_detail` | `PlaceDetailScreen` | `features/place` | `/place/:id` | Chi tiết địa điểm, đánh giá, giờ mở cửa |
| 8 | `route_preview` | `RoutePreviewScreen` | `features/route` | `/route/preview` | Xem trước cung đường & thời gian |
| 9 | `route_options` | `RouteOptionsScreen` | `features/route` | `/route/options` | Lựa chọn phương tiện (đi bộ, xe, transit) |
| 10 | `route_detail` | `RouteDetailScreen` | `features/route` | `/route/detail` | Chi tiết các chặng di chuyển theo lượt |
| 11 | `my_trips` | `MyTripsScreen` | `features/trips` | `/trips` (Tab 1) | Danh sách chuyến đi (Sắp tới & Đã qua) |
| 12 | `create_trip` / `plan_new_trip` | `CreateTripScreen` | `features/trips` | `/trips/create` | Wizard tạo chuyến đi mới |
| 13 | *Wizard Step: Dates* | `TravelDatesStep` | `features/trips` | `/trips/create/dates` | Chọn khoảng thời gian du lịch |
| 14 | *Wizard Step: Preferences* | `TripPreferencesStep` | `features/trips` | `/trips/create/preferences` | Chọn phong cách / sở thích |
| 15 | *Wizard Step: Pace* | `TravelPaceStep` | `features/trips` | `/trips/create/pace` | Nhịp độ (Thư thả, Cân bằng, Nhanh) |
| 16 | *Wizard Step: Budget* | `BudgetStep` | `features/trips` | `/trips/create/budget` | Ngân sách (Tiết kiệm, Vừa phải, Sang trọng) |
| 17 | *Wizard Step: Summary* | `TripSummaryStep` | `features/trips` | `/trips/create/summary` | Tóm tắt cấu hình trước khi tạo |
| 18 | `create_trip_success` | `CreateTripSuccessScreen` | `features/trips` | `/trips/create/success` | Màn hình chúc mừng tạo thành công |
| 19 | `trip_detail` | `TripDetailScreen` | `features/itinerary` | `/trips/:id` | Chi tiết lịch trình theo ngày, ngân sách |
| 20 | `trip_detail_empty_state` | `EmptyItineraryView` | `features/itinerary` | *(embedded state)* | Trạng thái chưa có địa điểm nào |
| 21 | `add_place_confirmation` | `AddPlaceBottomSheet` | `features/itinerary` | `/trips/:id/add-place` | Sheet xác nhận thêm địa điểm vào ngày |
| 22 | `trip_map` | `TripMapScreen` | `features/itinerary` | `/trips/:id/map` | Toàn cảnh bản đồ và lộ trình chuyến đi |
| 23 | `saved_places` | `SavedPlacesScreen` | `features/saved` | `/saved` (Tab 2) | Danh sách địa điểm đã lưu yêu thích |
| 24 | `saved_empty_state` | `SavedEmptyStateView` | `features/saved` | *(embedded state)* | Trạng thái trống khi chưa lưu địa điểm |
| 25 | `profile` | `ProfileScreen` | `features/profile` | `/profile` (Tab 3) | Trang cá nhân, thống kê hành trình |
| 26 | `edit_profile` | `EditProfileScreen` | `features/profile` | `/profile/edit` | Chỉnh sửa thông tin tài khoản |
| 27 | `settings` | `SettingsScreen` | `features/settings` | `/settings` | Cài đặt ứng dụng |
| 28 | `language` | `LanguageScreen` | `features/settings` | `/settings/language` | Tùy chọn ngôn ngữ giao diện |
| 29 | `currency` | `CurrencyScreen` | `features/settings` | `/settings/currency` | Tùy chọn đơn vị tiền tệ hiển thị |
| 30 | `help_support` | `HelpSupportScreen` | `features/settings` | `/settings/help` | Trợ giúp và phản hồi |
| 31 | `sign_out_confirmation` | `SignOutDialog` | `features/auth` | *(dialog / sheet)* | Hộp thoại xác nhận đăng xuất |
| 32 | `delete_account_confirmation` | `DeleteAccountDialog` | `features/profile` | *(dialog / sheet)* | Hộp thoại xác nhận xóa tài khoản |

---

## 3. Bảng Ánh Xạ Thành Phần Tái Sử Dụng (Stitch → Flutter Component Mapping)

| Stitch Component | Flutter Reusable Widget | Thư Mục Triển Khai | Mô Tả & Biến Thể (Variants) |
|---|---|---|---|
| Nút bấm chính / phụ | `TWButton` | `lib/shared/widgets/buttons/tw_button.dart` | Biến thể: `primary`, `secondary`, `outline`, `tonal`, `danger`. Hỗ trợ icon và loading indicator. |
| Nút bấm tròn (Icon) | `TWIconButton` | `lib/shared/widgets/buttons/tw_icon_button.dart` | Nút tròn nền mờ / elevated cho bản đồ và thanh điều hướng. |
| Thanh tìm kiếm nổi | `TWSearchBar` | `lib/shared/widgets/inputs/tw_search_bar.dart` | Floating container trên bản đồ, tích hợp icon kính lúp và filter. |
| Ô nhập liệu văn bản | `TWTextField` | `lib/shared/widgets/inputs/tw_text_field.dart` | Hỗ trợ label, helper text, error text, toggle ẩn/hiện mật khẩu. |
| Thẻ lọc & Trạng thái | `TWChip` | `lib/shared/widgets/chips/tw_chip.dart` | Biến thể: `choice` (chọn lọc), `filter`, `statusBadge` (tag trạng thái). |
| Khay trượt đáy màn hình | `TWBottomSheet` | `lib/shared/widgets/sheets/tw_bottom_sheet.dart` | Draggable scrollable sheet với thanh grabber và snap points. |
| Ghim vị trí bản đồ | `TWMapMarker` | `lib/shared/widgets/maps/tw_map_marker.dart` | Ghim hình giọt nước có icon danh mục và nhãn trạng thái active. |
| Cụm điều khiển bản đồ | `TWMapControls` | `lib/shared/widgets/maps/tw_map_controls.dart` | Cột nút nổi: định vị GPS, phóng to, thu nhỏ, đổi lớp bản đồ. |
| Thẻ địa điểm | `TWPlaceCard` | `lib/shared/widgets/cards/tw_place_card.dart` | Biến thể: thẻ ngang compact, thẻ dọc lưới, thẻ hero lớn. |
| Header thông tin địa điểm | `TWPlaceHeader` | `lib/shared/widgets/cards/tw_place_header.dart` | Tiêu đề, số sao rating, lượt review, badge thể loại, nút lưu. |
| Bộ sưu tập ảnh ngang | `TWPlaceGallery` | `lib/shared/widgets/cards/tw_place_gallery.dart` | Danh sách ảnh cuộn ngang snap mượt mà, bo góc chuẩn. |
| Thẻ thông tin lộ trình | `TWRouteCard` | `lib/shared/widgets/cards/tw_route_card.dart` | Thời gian di chuyển (ETA), khoảng cách, icon phương tiện. |
| Chặng chỉ đường chi tiết | `TWRouteStep` | `lib/shared/widgets/cards/tw_route_step.dart` | Icon chỉ hướng rẽ, câu hướng dẫn, độ dài đoạn đường. |
| Bộ chọn phương tiện | `TWTransportSelector` | `lib/shared/widgets/selectors/tw_transport_selector.dart` | Hàng chọn: Đi bộ (Walk), Xe hơi (Drive), Bus/Transit, Xe đạp. |
| Thẻ chuyến đi | `TWTripCard` | `lib/shared/widgets/cards/tw_trip_card.dart` | Ảnh banner, thời gian đi, địa điểm, avatar bạn đồng hành, tag trạng thái. |
| Bộ chọn ngày hành trình | `TWDaySelector` | `lib/shared/widgets/selectors/tw_day_selector.dart` | Thanh tab pill dính đầu trang (`Day 1 • Oct 12`, `Day 2`,...). |
| Thẻ điểm dừng lịch trình | `TWItineraryCard` | `lib/shared/widgets/cards/tw_itinerary_card.dart` | Cột mốc giờ, tên địa điểm, icon phân loại, ảnh thu nhỏ, nút chỉ đường. |
| Đường trục thời gian | `TWItineraryTimeline` | `lib/shared/widgets/cards/tw_itinerary_timeline.dart` | Trục dọc nét liền/đứt kết nối các điểm dừng theo thứ tự thời gian. |
| Thanh điều hướng đáy | `TWBottomNavigation` | `lib/shared/widgets/navigation/tw_bottom_navigation.dart` | 4 tab chính: Khám phá, Chuyến đi, Đã lưu, Cá nhân. |
| Bộ chọn khoảng ngày | `TWDateRangePicker` | `lib/shared/widgets/pickers/tw_date_range_picker.dart` | Lịch tháng chọn ngày bắt đầu - ngày kết thúc trực quan. |
| Thẻ lựa chọn tùy chỉnh | `TWSelectionCard` | `lib/shared/widgets/selectors/tw_selection_card.dart` | Thẻ lựa chọn sở thích du lịch kèm viền active khi bấm chọn. |
| Bộ chọn mức chi tiêu | `TWBudgetSelector` | `lib/shared/widgets/selectors/tw_budget_selector.dart` | 3 mức: Tiết kiệm ($), Vừa phải ($$), Cao cấp ($$$). |
| Ảnh đại diện người dùng | `TWAvatar` | `lib/shared/widgets/avatars/tw_avatar.dart` | Avatar đơn hoặc cụm avatar xếp chồng (+2 companions). |
| Dòng mục trong Cài đặt | `TWSettingsRow` | `lib/shared/widgets/lists/tw_settings_row.dart` | Icon đầu dòng, tiêu đề, mô tả, nút gạt switch hoặc chevron. |
| Giao diện rỗng / Lỗi | `TWEmptyState` | `lib/shared/widgets/feedback/tw_empty_state.dart` | Hình minh họa, tiêu đề, mô tả hướng dẫn và nút kêu gọi hành động (CTA). |

---

## 4. Cấu Trúc Thư Mục Flutter (Clean Feature-First Architecture)

```
mobile/
├── pubspec.yaml
├── lib/
│   ├── main.dart
│   ├── app/
│   │   ├── app.dart                  # Cấu hình MaterialApp & inject Theme
│   │   └── router.dart               # Quản lý định tuyến tập trung
│   ├── core/
│   │   ├── theme/
│   │   │   ├── app_colors.dart       # Bảng mã màu chuẩn Stitch
│   │   │   ├── app_typography.dart   # Kiểu chữ Inter & phân cấp phân giải
│   │   │   ├── app_spacing.dart      # Hệ lưới khoảng cách 8pt (4..32)
│   │   │   ├── app_radius.dart       # Độ bo góc chuẩn (4, 8, 12, 16, 24, full)
│   │   │   ├── app_shadows.dart      # Đổ bóng ambient levels 1, 2, 3
│   │   │   └── app_theme.dart        # Builder ThemeData Light & Dark
│   │   ├── constants/
│   │   │   ├── app_constants.dart    # Chuỗi hằng số, title mặc định
│   │   │   └── asset_paths.dart      # Đường dẫn ảnh/icon tĩnh
│   │   └── utils/
│   │       ├── formatters.dart       # Format tiền tệ, ngày tháng, khoảng cách
│   │       └── responsive.dart       # Helper breakpoint co giãn màn hình
│   ├── shared/
│   │   ├── models/                   # Mock data models (Place, Trip, Day, Route)
│   │   └── widgets/
│   │       ├── avatars/              # TWAvatar, TWAvatarGroup
│   │       ├── buttons/              # TWButton, TWIconButton
│   │       ├── cards/                # TWPlaceCard, TWTripCard, TWItineraryCard, TWRouteCard
│   │       ├── chips/                # TWChip, TWStatusBadge
│   │       ├── feedback/             # TWEmptyState, TWLoadingOverlay
│   │       ├── inputs/               # TWTextField, TWSearchBar
│   │       ├── lists/                # TWSettingsRow
│   │       ├── maps/                 # TWMapMarker, TWMapControls, TWMapCanvas
│   │       ├── navigation/           # TWBottomNavigation, TWTopAppBar
│   │       ├── pickers/              # TWDateRangePicker
│   │       ├── selectors/            # TWDaySelector, TWTransportSelector, TWBudgetSelector
│   │       └── sheets/               # TWBottomSheet
│   └── features/
│       ├── auth/                     # Welcome, Sign In, Sign Up, Forgot Password
│       ├── explore/                  # Explore Map Screen & Category Filter Bar
│       ├── place/                    # Selected Place Bottom Sheet & Place Detail Screen
│       ├── route/                    # Route Preview, Route Options, Route Steps
│       ├── trips/                    # My Trips Screen & Wizard tạo chuyến đi 5 bước
│       ├── itinerary/                # Trip Detail, Timeline chặng, Add Place, Trip Map
│       ├── saved/                    # Saved Places Screen & Empty State
│       ├── profile/                  # Profile Screen, Edit Profile, Delete Account
│       └── settings/                 # Settings Screen, Language, Currency, Help & Support
```

---

## 5. Design Tokens Trích Xuất Từ Stitch

### 5.1 Bảng Màu (`AppColors`)
- **Primary / Brand:**
  - `primary`: `#0058BC` (Bright Travel Blue)
  - `primaryContainer`: `#0070EB` (Active Highlight / Primary CTA)
  - `primaryFixed`: `#D8E2FF` / `primaryFixedDim`: `#ADC6FF`
- **Surface & Canvas:**
  - `background`: `#FCF9F8` (Warm soft canvas)
  - `surfaceContainerLowest`: `#FFFFFF` (Card nâng nổi & Bottom Sheet)
  - `surfaceContainerLow`: `#F6F3F2` / `surfaceContainer`: `#F0EDED`
  - `surfaceContainerHigh`: `#EAE7E7` / `surfaceVariant`: `#E5E2E1`
- **Văn bản & Viền:**
  - `onSurface`: `#1C1B1B` (Tiêu đề chính có độ tương phản cao)
  - `onSurfaceVariant`: `#414755` (Văn bản phụ, chú thích)
  - `outline`: `#717786` (Viền icon, input)
  - `outlineVariant`: `#C1C6D7` (Đường phân cách dividers)
- **Điểm nhấn & Trạng thái:**
  - `secondary`: `#54606B` / `secondaryContainer`: `#D8E4F2`
  - `tertiary`: `#BC000A` (Ghim bản đồ nổi bật, đánh giá sao)
  - `error`: `#BA1A1A` / `errorContainer`: `#FFDAD6`

### 5.2 Kiểu Chữ (`AppTypography` - Inter)
- `display`: `32px` | Line Height: `40px` | Bold (`FontWeight.w700`) | Letter Spacing: `-0.64px`
- `titleLarge`: `22px` | Line Height: `28px` | SemiBold (`FontWeight.w600`)
- `titleMedium`: `18px` | Line Height: `24px` | SemiBold (`FontWeight.w600`)
- `titleSmall`: `16px` | Line Height: `22px` | SemiBold (`FontWeight.w600`)
- `bodyLarge`: `16px` | Line Height: `24px` | Regular (`FontWeight.w400`)
- `bodyMedium`: `14px` | Line Height: `20px` | Regular (`FontWeight.w400`)
- `bodySmall`: `12px` | Line Height: `16px` | Regular (`FontWeight.w400`)
- `labelLarge`: `14px` | Line Height: `20px` | SemiBold (`FontWeight.w600`)
- `labelMedium`: `12px` | Line Height: `16px` | SemiBold (`FontWeight.w600`)
- `caption`: `11px` | Line Height: `14px` | Regular (`FontWeight.w400`)

### 5.3 Khoảng Cách (`AppSpacing`), Bo Góc (`AppRadius`) & Đổ Bóng (`AppShadows`)
- **Spacing:** `xs: 4.0`, `sm: 8.0`, `md: 12.0`, `lg: 16.0`, `xl: 20.0`, `xxl: 24.0`, `xxxl: 32.0`
- **Radius:** `sm: 4.0`, `md: 8.0`, `lg: 12.0`, `xl: 16.0`, `xxl: 24.0`, `pill: 9999.0`
- **Shadows:**
  - `level1`: `Offset(0, 4), blurRadius: 8, color: rgba(0,0,0,0.04)`
  - `level2`: `Offset(0, 4), blurRadius: 16, color: rgba(0,0,0,0.08)`
  - `level3`: `Offset(0, 12), blurRadius: 24, color: rgba(0,0,0,0.12)`

---

## 6. Kế Hoạch Triển Khai Theo Giai Đoạn (Implementation Order)

1. **Phase 1 (Nền tảng & Điều hướng chính):** Khởi tạo Tokens (`AppColors`, `AppTypography`, `AppSpacing`, `AppRadius`, `AppShadows`, `AppTheme`), Widget nguyên tử dùng chung (`TWButton`, `TWIconButton`, `TWTextField`, `TWSearchBar`, `TWChip`, `TWAvatar`, `TWBottomNavigation`), và Khung điều hướng `MainTabsScaffold`.
2. **Phase 2 (Xác thực người dùng):** `WelcomeScreen`, `SignInScreen`, `SignUpScreen`, `ForgotPasswordScreen`.
3. **Phase 3 (Bản đồ Khám phá & Chi tiết địa điểm):** `ExploreMapScreen`, `SelectedPlaceModal`, `PlaceDetailScreen`.
4. **Phase 4 (Xem & Lựa chọn lộ trình di chuyển):** `RoutePreviewScreen`, `RouteOptionsScreen`, `RouteDetailScreen`.
5. **Phase 5 (Quản lý & Tạo chuyến đi):** `MyTripsScreen`, `CreateTripScreen` (Wizard 5 bước), `CreateTripSuccessScreen`.
6. **Phase 6 (Chi tiết Lịch trình & Bản đồ chuyến đi):** `TripDetailScreen`, `TWDaySelector`, `TWItineraryTimeline`, `TWItineraryCard`, `AddPlaceBottomSheet`, `TripMapScreen`.
7. **Phase 7 (Đã lưu, Cá nhân & Cài đặt):** `SavedPlacesScreen`, `ProfileScreen`, `EditProfileScreen`, `SettingsScreen`, `LanguageScreen`, `CurrencyScreen`, `HelpSupportScreen`, cùng các Dialog xác nhận.

---

## 7. Đánh Giá Khả Năng Mở Rộng & Hiệu Năng (Scalability & Performance)
- **Tách biệt giao diện & Logic:** Tất cả các widget được thiết kế stateless / stateful nhẹ nhàng, không bị phụ thuộc cứng vào API trực tiếp; mock models độc lập giúp dễ dàng gắn BLoC/Riverpod/Supabase sau này.
- **Tối ưu Re-render:** Toàn bộ hằng số TextStyle, Padding, Radius, Shadows đều được khai báo dạng `const` và sử dụng `const constructor` cho các widget tĩnh.
- **Tối ưu hình ảnh di động:** Sử dụng `NetworkImage` / `CachedNetworkImage` với kích thước giới hạn `cacheWidth`/`cacheHeight` phù hợp, tránh tràn RAM GPU khi hiển thị danh sách nhiều thẻ địa điểm.
- **Tránh trùng lặp code (DRY):** Các biến thể của thẻ (`TWPlaceCard`, `TWTripCard`, `TWChip`) được gom chung vào một widget duy nhất thay vì tạo nhiều widget đơn lẻ cho từng màn hình.
