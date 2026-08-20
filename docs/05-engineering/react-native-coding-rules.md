# React Native + TypeScript + Expo Coding Rules - TripWise Mobile

Bộ quy tắc lập trình bắt buộc áp dụng đối với mã nguồn ứng dụng di động **React Native + TypeScript + Expo** của dự án TripWise (theo [ADR-017](../../DECISIONS.md#adr-017-react-native--typescript-as-primary-mobile-client), ADR-018 và ADR-019). Android là target implementation/runtime hiện tại; code không được khóa cứng làm cản trở iOS về sau.

---

## 1. Ngôn ngữ & TypeScript Standards

- **TypeScript Strict Mode**: Bật `strict: true` trong `tsconfig.json`. Mọi props, state, API contracts và hook return values đều phải có kiểu dữ liệu tường minh.
- **Không dùng `any`**: Tuyệt đối không sử dụng kiểu `any`. Dùng `unknown`, generic type parameters hoặc type guards khi cần xử lý dữ liệu động.
- **Explicit Return Types**: Khuyến khích định nghĩa kiểu trả về rõ ràng cho các helper functions, custom hooks và API client methods.
- **DTOs & Contract Types**: Đồng bộ kiểu dữ liệu với Supabase PostgreSQL/Edge Function contracts. Validate dữ liệu ngoài tại boundary; không đưa raw transport object vào JSX.

---

## 2. Cấu trúc Component & Hooks Rules

- **Functional Components**: 100% components viết dưới dạng Functional Components với TypeScript (`React.FC<Props>` hoặc function declaration có typed props).
- **Rules of Hooks**:
  - Không gọi hooks bên trong loops, điều kiện if/else hay nested functions.
  - Luôn khai báo đầy đủ dependency array trong `useEffect`, `useCallback`, `useMemo`.
- **Feature-Based Modular Architecture**:
  - Tổ chức code theo từng tính năng nghiệp vụ trong `src/features/<feature_name>/` (ví dụ: `auth`, `explore`, `planner`, `trips`, `map`, `profile`).
  - Mỗi feature tự đóng gói components, hooks, api calls, types và navigation sub-stack của mình.
- **Tách biệt UI và Business Logic**:
  - Components chỉ chịu trách nhiệm render UI và nhận user interactions.
  - API calls, data transformation và state management phức tạp phải được tách vào Custom Hooks (`useTripPlanner`, `usePlaceSearch`) hoặc Service classes.

---

## 3. Ranh giới API, Bảo mật & Quản lý Secret

- **Backend hiện hành là Supabase**: Dùng singleton `@supabase/supabase-js` client cho Auth, RLS-protected data và Edge Functions. Không mở rộng Spring Boot legacy.
- **Secret-bearing providers**: Gemini và Google server-side secrets chỉ được gọi qua Supabase Edge Functions. Không gọi Gemini trực tiếp từ mobile.
- **Public providers**: Open-Meteo/OSRM có thể gọi trực tiếp từ client khi đến đúng phase, với timeout, cancellation và fallback theo ADR-018.
- **Không Hardcode Secret**:
  - Không hardcode API key, backend URL production, credentials hay token trong mã nguồn JavaScript/TypeScript.
  - Dùng Expo public environment convention hiện hành (`EXPO_PUBLIC_*`) chỉ cho client-safe configuration. Không đặt server secret trong public env.
- **Lưu trữ Token an toàn (Secure Storage)**:
  - Supabase session phải đi qua storage adapter dùng `expo-secure-store`; không gọi SecureStore rải rác trong components.
  - Cấm lưu JWT tokens dạng plaintext trong `AsyncStorage`.
- **Client Map Keys Restriction**:
  - Khi cấu hình Google Maps SDK key cho mobile, bắt buộc cấu hình restriction theo Android Package Name + SHA-1 fingerprint và iOS Bundle ID. Không bao giờ dùng Unrestricted API key trên mobile.

---

## 4. UI/UX: Trạng thái Tải, Lỗi & Danh sách lớn

- **Quản lý Trạng thái Toàn diện**: Mọi màn hình và feature tương tác mạng phải xử lý đủ 4 trạng thái:
  1. `Idle` (Chờ thao tác)
  2. `Loading` (Skeleton / Shimmer placeholder, không dùng spinner chắn toàn màn hình gây khó chịu)
  3. `Success` (Hiển thị dữ liệu hoàn chỉnh)
  4. `Error` / `Empty` (Thông báo lỗi tiếng Việt thân thiện, minh họa rõ ràng kèm nút "Thử lại").
- **Danh sách lớn (Large Lists)**:
  - Sử dụng `FlatList` hoặc `@shopify/flash-list` cho danh sách địa điểm, lịch trình, saved trips.
  - Bắt buộc cung cấp `keyExtractor` duy nhất (dùng `id`), triển khai `getItemLayout` khi các item có chiều cao cố định để tối ưu hóa việc đo layout.
  - Triển khai phân trang Lazy Loading / Infinite Scroll qua `onEndReached` với `onEndReachedThreshold` phù hợp (0.3 - 0.5).
  - Tránh truyền anonymous inline functions hoặc inline object styles làm props trong `renderItem`.

---

## 5. Bản đồ, Vị trí & Xử lý Tọa độ

- **Không Render Hàng Nghìn Marker Đồng Thời**:
  - Tuyệt đối không vẽ hàng nghìn marker lên bản đồ cùng lúc gây crash bộ nhớ/drop FPS.
  - Áp dụng **Marker Clustering** (nhóm marker khi zoom xa) và truy vấn địa điểm theo **Bounding Box (bbox)** hoặc bán kính khi di chuyển bản đồ.
- **Debounce & Tối ưu Request**:
  - Áp dụng Debounce 300 - 500ms cho ô tìm kiếm địa điểm, autocomplete và sự kiện di chuyển camera bản đồ (`onRegionChangeComplete`).
  - Hủy bỏ (cancel) request cũ khi người dùng gõ từ khóa mới (sử dụng `AbortController`).
- **Tối ưu Tuyến đường**:
  - Route geometry nhận từ OSRM qua backend dưới dạng polyline nén hoặc GeoJSON tinh gọn.

---

## 6. Hiệu năng, Bộ nhớ & Tối ưu hóa Re-render

- **Tránh Premature Optimization nhưng Tối ưu Đúng Chỗ**:
  - Sử dụng `React.memo`, `useCallback`, `useMemo` khi component/callback thực sự tốn chi phí render hoặc được truyền xuống danh sách con sâu.
  - Không bọc vô tội vạ mọi hàm đơn giản trong `useCallback`.
- **Tải & Cache Hình Ảnh**:
  - Sử dụng giải pháp cache ảnh native (như `react-native-fast-image` hoặc `expo-image`) cho hình ảnh địa điểm từ CDN.
  - Thiết lập placeholder mờ và kích thước resize phù hợp với viewport thiết bị.
- **Offline Snapshot**:
  - Lưu trữ lịch trình đã lưu vào bộ nhớ đệm cục bộ (SQLite / MMKV / Realm) để người dùng có thể xem lại khi đi vào vùng mất sóng GPS/4G.

---

## 7. Khả năng Tiếp cận (Accessibility), Đa nền tảng & Parity

- **Android current target / iOS future compatibility**:
  - Android là target build/runtime hiện tại. Giữ typed/platform boundary sạch để iOS có thể triển khai sau.
  - Tách mã nguồn platform-specific (`.android.ts` / `.ios.ts` hoặc `Platform.select`) chỉ khi thực sự cần thiết do khác biệt hành vi native (ví dụ: permission flow, keyboard handling, status bar).
- **Accessibility (a11y)**:
  - Cung cấp `accessible={true}`, `accessibilityLabel`, `accessibilityRole` và `accessibilityHint` cho các nút bấm, icon và thành phần tương tác.
  - Đảm bảo kích thước vùng chạm tối thiểu (Touch Target) đạt chuẩn $\ge 44 \times 44$ pt.

---

## 8. Quản lý Dependency & Thư viện bên thứ ba

- **Dependency Review**: Trước khi cài đặt bất kỳ package npm mới nào:
  - Kiểm tra dung lượng bundle, số lượng transitive dependencies.
  - Kiểm tra tính tương thích với cả Android và iOS, kiến trúc mới (New Architecture / Fabric / TurboModules) nếu áp dụng.
  - Tránh cài đặt thư viện quá lớn chỉ để dùng 1-2 hàm tiện ích đơn giản.
- **Kiểm thử (Testing)**:
  - Viết Unit Tests với Jest và React Native Testing Library cho custom hooks, utility functions và components cốt lõi.

---

## 9. Quy tắc Theme & Đa ngôn ngữ (Localization)

Theo [ADR-020](../../DECISIONS.md#adr-020-theme-lightdarksystem--localization-envi-architecture) và [Theme & Localization Contract](../09-ui-design/theme-localization-contract.md):

- **Tiêu thụ Theme Tokens ngữ nghĩa**:
  - Mọi feature components và shared primitives bắt buộc tiêu thụ màu sắc từ semantic theme tokens / hook theme.
  - Tuyệt đối cấm sử dụng raw presentation hex colors (như `'#FFFFFF'`, `'#000000'`, `'#0058BC'`) trong mã nguồn feature mới.
  - Dark Mode là bản phái sinh ngữ nghĩa từ thiết kế Google Stitch, không làm thay đổi phân cấp layout, component geometry hay danh tính icon (`MaterialIcons`).
- **Quản lý chuỗi văn bản qua Localization Layer**:
  - Mọi chuỗi ký tự hiển thị cho người dùng (user-facing strings) phải được quản lý tập trung qua file tài nguyên ngôn ngữ (`en`, `vi`) và gọi qua translation hook/function.
  - Cấm viết điều kiện chuỗi inline trong component JSX (như `lang === 'vi' ? 'Lưu' : 'Save'`).
- **Layout Resilience cho Tiếng Việt & Đa ngôn ngữ**:
  - Components (buttons, chips, tabs, cards, sheet CTAs) phải sử dụng flex layout và padding co giãn linh hoạt, không fix cứng chiều rộng chỉ vừa cho tiếng Anh.
  - Cho phép xuống dòng hoặc mở rộng chiều cao hợp lý; cấm tự ý giảm `fontSize` của tiếng Việt để ép vừa khung.
- **Ranh giới định dạng ngày / số / tiền tệ**:
  - Tập trung định dạng qua helper formatting boundary; tách biệt độc lập giữa Ngôn ngữ hiển thị (`en`/`vi`) và Đơn vị tiền tệ (`USD`/`VND`/etc.).

---

## 10. Commands chuẩn từ repository

```powershell
cd mobile
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

Android development build khi task yêu cầu:

```powershell
cd mobile
npm run android
```

Không dùng Flutter/Dart commands để verify production mobile client. Không tự chuyển navigation sang Expo Router; source hiện tại dùng React Navigation.
