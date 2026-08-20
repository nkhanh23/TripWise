# Theme & Localization Architectural Contract — TripWise Mobile

Tài liệu này định nghĩa kiến trúc chuẩn, quy tắc semantic tokens và hợp đồng đa ngôn ngữ (Localization) áp dụng xuyên suốt cho ứng dụng di động **TripWise React Native + TypeScript + Expo** (theo [ADR-020](../../DECISIONS.md#adr-020-theme-lightdarksystem--localization-envi-architecture)).

---

## 1. Supported Themes

TripWise hỗ trợ 3 chế độ giao diện:

| Chế độ | Mô tả |
|---|---|
| **System** (Mặc định) | Tự động phát hiện và đồng bộ theo `Appearance.getColorScheme()` / hệ điều hành của thiết bị. |
| **Light** | Chế độ sáng chính thức, đối chiếu và khớp 100% với thiết kế Google Stitch. |
| **Dark** | Chế độ tối phái sinh từ semantic tokens của Stitch, bảo đảm độ tương phản (WCAG AA) và độ sâu thị giác (elevation layers). |

> [!IMPORTANT]
> **Dark Mode không phải là một bản thiết kế lại (redesign).**
> Cấu trúc component, khoảng cách (spacing), bán kính góc (radius), hệ thống phân cấp (hierarchy) và hành vi tương tác giữ nguyên 100%. Dark Mode chỉ thay đổi bảng màu thông qua các **Semantic Color Roles**.

---

## 2. Semantic Color Roles

Tất cả các components trong ứng dụng phải tiêu thụ màu sắc thông qua Theme Tokens ngữ nghĩa, **tuyệt đối không sử dụng hard-coded hex colors** (như `'#FFFFFF'`, `'#000000'`, `'#0058BC'`):

```text
ThemePalette
├── background
│   ├── canvas          (Màu nền gốc toàn màn hình)
│   ├── surface         (Màu nền thẻ card, sheet, container)
│   └── surfaceVariant  (Màu nền thứ cấp, pill inactive, bento box)
├── text
│   ├── primary         (Chữ tiêu đề, nội dung quan trọng)
│   ├── secondary       (Chữ phụ đề, mô tả)
│   ├── muted           (Chữ placeholder, timestamp)
│   └── inverse         (Chữ trên nền tương phản cao / CTA primary)
├── brand
│   ├── primary         (Màu thương hiệu nhận diện chính)
│   ├── primaryContainer(Màu nền container nhấn mạnh, FAB, active chip)
│   ├── red             (Trạng thái lỗi, cảnh báo nguy hiểm)
│   ├── yellow          (Trạng thái đánh giá sao, rating, cảnh báo nhẹ)
│   └── lime            (Trạng thái thành công, điểm nhấn)
├── border
│   ├── default         (Đường viền thẻ, divider, input border)
│   └── subtle          (Đường phân cách mờ)
├── icon
│   ├── primary         (Màu icon chính)
│   ├── secondary       (Màu icon thứ cấp)
│   └── muted           (Màu icon vô hiệu hoặc nền mờ)
└── overlay
    ├── scrim           (Lớp phủ mờ modal, bottom sheet)
    └── gradientBottom  (Lớp phủ chuyển sắc trên hero image)
```

---

## 3. Google Stitch Relationship & Icon Rule

1. **Google Stitch là Source of Truth tối cao:**
   - Mọi kích thước hình học, phân cấp layout, typography, icon style, border radius và Light Mode palette phải khớp với Stitch.
   - Nếu Stitch có thiết kế Dark Mode chính thức: Áp dụng trực tiếp giá trị đó.
   - Nếu Stitch chưa có Dark variant cho màn hình cụ thể: Phái sinh bảng màu Dark Mode dựa trên bảng Semantic Color Roles chuẩn mà không thay đổi cấu trúc JSX.
2. **Quy tắc Icon Identity:**
   - Chuyển đổi Theme chỉ thay đổi màu sắc (`color`) của icon, **tuyệt đối không thay đổi danh tính icon**.
   - Ví dụ: `location-on` trong Light mode dùng `brand.primary`, trong Dark mode dùng `brand.primary` hoặc `icon.primary` của Dark theme. Không thay icon khác.
   - Giữ nghiêm ngặt quy tắc: 100% `@expo/vector-icons/MaterialIcons`, không emoji, không ký tự Unicode giả lập icon.

---

## 4. Supported Locales

TripWise hỗ trợ chính thức 2 ngôn ngữ hạng nhất:

| Locale ID | Ngôn ngữ | Fallback |
|---|---|---|
| `en` | English (US / Global) | Default Fallback Locale |
| `vi` | Tiếng Việt (Vietnamese) | `en` nếu thiếu key |

---

## 5. Translation Key Convention

Tất cả văn bản hiển thị cho người dùng phải được quản lý tập trung trong file tài nguyên ngôn ngữ (`mobile/src/i18n/` hoặc qua translation hook). 

### Quy ước đặt tên key theo phân cấp ngữ nghĩa:

```text
common.
  ├── ok, cancel, save, edit, delete, retry, back, close, search
navigation.
  ├── tabs: home, explore, plan, trips, profile
  └── headers: placeDetail, routePreview, tripDetail, createTrip
auth.
  ├── welcome: title, subtitle, getStarted, signIn
  ├── login: title, emailLabel, passwordLabel, submit, forgotPassword
  └── register: ...
explore.
  ├── searchPlaceholder, mapToggle, listToggle, categories.*
place.
  ├── getDirections, openingHours, tickets, reviews, bookmark
route.
  ├── transportMode.*, duration, distance, steps, unavailable
trips.
  ├── upcoming, past, emptyTitle, emptySubtitle, createTripButton
planner.
  ├── wizardSteps.*, budget.*, preferences.*, generating
tripDetail.
  ├── budgetStatus, companions, savedPlaces, viewMap, dayLabel, emptyDay
settings.
  ├── theme.*, language.*, currency.*, support
```

> [!WARNING]
> Cấm viết logic điều kiện chuỗi trực tiếp trong component JSX như:
> `language === 'vi' ? 'Chuyến đi' : 'Trips'`
> Mọi chuỗi hiển thị phải gọi qua translation function / hook: `t('trips.title')`.

---

## 6. Layout Resilience (Độ linh hoạt layout)

Ngôn ngữ tiếng Việt thường có độ dài ký tự dài hơn tiếng Anh từ 20% đến 40% đối với cùng một cụm từ.

### Yêu cầu bắt buộc khi xây dựng component:
1. **Tránh Fix Chiều Rộng Cứng (No Hard-coded Fixed Widths):**
   - Nút bấm, chip, tab và thẻ thông tin phải co giãn linh hoạt bằng `flex`, `paddingHorizontal` hoặc `minWidth`.
2. **Xử lý Xuống Dòng & Tràn Chữ (Text Wrapping & Overflow):**
   - Chỉ dùng `numberOfLines` khi thiết kế quy định rõ ràng (ví dụ: tiêu đề thẻ danh sách 1 dòng).
   - Khi cho phép xuống dòng, container phải có khả năng tự mở rộng chiều cao mà không che lấp các thành phần xung quanh.
3. **Không Thu Nhỏ Cỡ Chữ Tùy Tiện (No Arbitrary Font Size Shrinking):**
   - Không được giảm `fontSize` của tiếng Việt để ép vừa khung tiếng Anh. Typography phải giữ nguyên tỉ lệ hierarchy chuẩn.

---

## 7. Date / Number / Currency Formatting Boundary

Việc định dạng ngày tháng, số liệu và tiền tệ phải tập trung tại một ranh giới chuyên trách (Formatting Boundary), tách biệt hoàn toàn giữa **Ngôn ngữ hiển thị (Language)** và **Đơn vị tiền tệ (Currency)**:

1. **Độc lập giữa Ngôn ngữ và Tiền tệ:**
   - Người dùng có thể chọn giao diện Tiếng Việt (`vi`) nhưng quản lý ngân sách bằng `USD` ($1,500) hoặc `VND` (35.000.000 ₫).
2. **Centralized Formatters:**
   - `formatDate(date, locale)`: `Oct 12, 2026` (EN) vs `12 Th10, 2026` (VI).
   - `formatCurrency(amount, currency, locale)`: `$1,200` vs `1.200 $` / `30.000.000 ₫`.
   - `formatDistance(meters, locale)`: `1.2 km` / `450 m`.

---

## 8. Migration Strategy

Quá trình di chuyển (migration) được thực hiện tuần tự trong `FE-CROSSCUT-001` mà **không làm reset hoặc thay đổi trạng thái COMPLETED của các phase trước**:

```text
Bước 1: Thiết lập ThemeProvider, TranslationProvider và Typed Tokens/Keys.
Bước 2: Di chuyển các Shared Primitives (Screen, AppText, Buttons, Cards, Dialogs).
Bước 3: Di chuyển App Navigation Shell (Tab labels, Header titles).
Bước 4: Audit và di chuyển các màn hình đã hoàn thành (FE-P4 đến FE-P10).
Bước 5: Toàn bộ các Phase tiếp theo (FE-P11 trở đi) mặc định tiêu thụ Theme & i18n ngay từ đầu.
Bước 6: FE Phase 15 (Settings UI) xây dựng giao diện người dùng để chọn Theme / Language / Currency.
Bước 7: FE Phase 18/20 thực hiện Test Matrix kiểm tra tính nhất quán toàn diện.
```

---

## 9. Quality & Test Matrix

Mọi màn hình và luồng thao tác chính phải được kiểm thử đạt chất lượng trên ma trận 4 trạng thái:

$$\begin{pmatrix} \text{Light + EN} & \text{Light + VI} \\ \text{Dark + EN} & \text{Dark + VI} \end{pmatrix}$$

Các tiêu chí nghiệm thu:
1. **Visual Contrast:** Đạt chuẩn độ tương phản khả năng tiếp cận WCAG AA trên cả Light và Dark.
2. **Text Expansion:** Giao diện tiếng Việt không bị cắt chữ, tràn khung hoặc vỡ layout trên màn hình nhỏ.
3. **Completeness:** Không có chuỗi giao diện nào hiển thị sai translation key dạng `[missing "key"]` hoặc hard-coded tiếng Anh/Việt lẫn lộn.
4. **Verification Suites:** 100% passed `npm run lint`, `npm run typecheck`, `npm test`, `npx expo-doctor`.
