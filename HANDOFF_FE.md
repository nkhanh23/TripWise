# TripWise Mobile Frontend Handoff

**Owner / Agent: Antigravity — Mobile Frontend**
**Stack: React Native + TypeScript + Expo**
**Current target: Android**
**Status: ACTIVE — FE Phase 11 is current (FE-CROSSCUT-001 completed)**

Roadmap dài hạn: [`PHASES_FE.md`](./PHASES_FE.md)

Active Stitch implementation mapping: [`docs/09-ui-design/stitch-to-react-native-mapping-report.md`](./docs/09-ui-design/stitch-to-react-native-mapping-report.md)

## 1. Verified implementation foundation

Source/config hiện tại xác nhận:

- Expo SDK `~57.0.14`, React Native `0.86.2`, React `19.2.3`.
- TypeScript `~6.0.3`, `strict: true` qua `expo/tsconfig.base`.
- React Navigation 7; không dùng Expo Router.
- Typed native auth stack và five-tab navigator: Home, Explore, Plan, Trips, Profile với `MaterialIcons` trọn vẹn.
- `SafeAreaProvider`, `Screen`, `AppText`, typed theme tokens và feature-first `src/` structure.
- Expo SecureStore + Supabase Auth/session foundation đã tồn tại từ P2.
- Jest Expo, React Native Testing Library và ESLint Expo configured.
- Android native development build/Metro/five-tab runtime đã có user-provided PASS evidence.
- **FE-VISUAL-AUDIT-001 Verified**: 100% emoji/Unicode/ASCII icon approximations across completed FE-P4 through FE-P7 (Auth, Explore, Place, Route, MainTabs) đã được audit và thay thế bằng `@expo/vector-icons/MaterialIcons` khớp tuyệt đối Google Stitch MCP. 0 emoji icon tồn tại trong codebase `mobile/src/`.

Android là target implementation/runtime hiện tại. Không thêm Android-only shortcut làm cản trở iOS về sau; iOS local runtime chưa được coi là verified nếu không chạy trên macOS/Xcode.

## 2. Frontend architecture

```text
React Native screens/components (.tsx)
    ↓
Hooks / scoped React state / feature services
    ↓
Typed repository or data-source boundary
    ↓
Mock/local fixtures during FE UI phases
```

- `mobile/src/app/`: root providers/bootstrap.
- `mobile/src/navigation/`: React Navigation containers và typed param lists.
- `mobile/src/components/`: shared React Native primitives.
- `mobile/src/features/`: feature screens, state, services/data boundaries.
- `mobile/src/theme/`: typed design tokens.
- `mobile/tests/`: Jest/React Native Testing Library tests.

Không dùng Dart `mobile/lib/` hoặc `pubspec.yaml` làm production implementation source of truth.

## 3. Visual and component rules

- Latest Google Stitch designs vẫn là visual source of truth tuyệt đối.
- Dùng `stitch-to-react-native-mapping-report.md` làm active mapping; không dùng các Flutter mapping lịch sử để chọn paths, widgets, routes hoặc completion evidence.
- Không copy HTML/CSS trực tiếp; map sang React Native `View`, `Text`, `Pressable`, `TextInput`, virtualized lists và `StyleSheet`.
- Không invent token ngoài `mobile/src/theme/` nếu chưa có visual requirement.
- Không sử dụng emoji, Unicode glyph hay icon xấp xỉ; luôn dùng `@expo/vector-icons/MaterialIcons` khớp chính xác Stitch.
- Prefix `TW*` có thể giữ cho planned shared components, nhưng phải là typed React Native components.
- Existing source names (`AppText`, `Screen`, `PlaceholderScreen`) không rename hàng loạt chỉ để khớp roadmap.
- Không redesign Stitch UI trong FE hoặc integration session.

## 4. Navigation

Current source uses React Navigation, not Expo Router:

- Auth stack: Welcome, Login, Register, ForgotPassword.
- Auth bootstrap state: loading/authenticated/unauthenticated.
- Main tabs: Home, Explore, Plan, Trips, Profile.
- Navigation types: `AuthStackParamList`, `MainTabParamList`, `RootStackParamList` (MainTabs, PlaceDetail, RoutePreview).

Không thay navigator library hoặc tab information architecture nếu chưa có task/decision riêng.

## 5. FE independence boundary

- FE UI roadmap tiếp tục độc lập với Backend.
- UI phases dùng mock/local data và local interaction state.
- Không tự gọi Supabase/Edge Function/provider trong screen JSX.
- Không tự bắt đầu FE ↔ BE integration; xem `HANDOFF_INTEGRATION.md`.
- Existing Supabase/Auth/typed `generateTrip` code được giữ nguyên như verified implementation boundary, không mở rộng trong FE-only task.

## Theme & Localization Architecture Decision

Theo [ADR-020](DECISIONS.md#adr-020-theme-lightdarksystem--localization-envi-architecture) và [Theme & Localization Contract](docs/09-ui-design/theme-localization-contract.md):

- **Supported Themes**:
  - `System` (Mặc định tự động theo hệ điều hành)
  - `Light` (Bám sát 100% Google Stitch)
  - `Dark` (Phái sinh ngữ nghĩa theo semantic color tokens & WCAG AA)
- **Supported Locales**:
  - `en` (English - US / Global, default fallback)
  - `vi` (Tiếng Việt)
- **Source of Truth & Fidelity**:
  - Google Stitch tiếp tục là source of truth tối cao cho visual hierarchy, iconography (`MaterialIcons`), spacing, typography và Light Mode appearance.
  - Dark Mode là bản phái sinh ngữ nghĩa, không thay đổi layout hay component geometry. Danh tính icon giữ nguyên 100%.
- **Migration & Phasing**:
  - **Không reset hoặc reopen các phase FE đã hoàn thành (FE-P0 đến FE-P10)**.
  - Checkpoint `FE-CROSSCUT-001 — Theme & Localization Foundation` xây dựng nền tảng provider, typed tokens/keys và di chuyển các component/màn hình hiện có.
  - Mọi màn hình mới từ FE-P11 trở đi bắt buộc áp dụng trực tiếp semantic tokens và localization layer từ lúc khởi tạo.

## 6. Phase status

### Verified foundation

- FE Phase 0 — React Native + Expo Project Foundation.
- FE Phase 1 — Design Tokens & Theme Foundation.
- FE Phase 2 — Core Shared Component Foundation (`AppText`, `Screen`, `PlaceholderScreen`).
- FE Phase 3 — Typed Navigation & App Shell.
- FE Phase 4 — Auth UI (Welcome, Sign In, Sign Up, Forgot Password / Check Email, RNTL tests).
- FE Phase 5 — Explore UI (Map canvas, search, category chips, markers, selected preview, Map/List toggle, FlatList virtualization with 50 places, clustering boundary, RNTL tests).
- FE Phase 6 — Place UI (Place Detail screen, header, hero gallery, quick actions bento, TWPlaceCard, opening hours, tickets, reviews, local save toggle, RNTL tests).
- FE Phase 7 — Route UI (Route Preview screen, TWTransportSelector, RouteSummaryCard, RouteMapCanvas, RouteStepItem, RouteStepList with 50-item fixture, RouteUnavailableState, RNTL tests).
- FE Phase 8 — My Trips UI (MyTripsScreen, TWTripCard, PastTripCard, TripsEmptyState, Create Trip FAB, 24-trip stress test, SectionList virtualization, exact Stitch icons, RNTL tests).
- **FE-VISUAL-AUDIT-001 — Visual & Icon Fidelity Audit for FE-P4 to FE-P7 against Stitch (COMPLETE: 100% MaterialIcons, 0 emojis, 15/15 test suites passed).**
- **FE Phase 9 — Create Trip UI Wizard (`FE-P9-T001` COMPLETE: 5-step wizard with destination search & popular cards, date presets, travel interests & pace, budget & group options, summary with editable title, simulated AI generating state, exact Stitch create_trip_success screen, and 16/16 test suites passed).**
- **FE Phase 10 — Trip Detail & Itinerary UI (`FE-P10-T001` COMPLETE: Trip Detail screen, TripDetailTopBar, TripDetailHero, TripSummaryBentoCard, TripDaySelector chips, ItineraryCard with timeline nodes and time column, TripEmptyDayState, TripFAB, typed navigation from MyTrips, large 7-day 56-item fixture virtualization, exact Stitch icons, and 17/17 test suites passed).**
- **FE-CROSSCUT-001 — Theme & Localization Foundation (COMPLETE: Light/Dark semantic token palettes, `ThemeProvider` & `useTheme`, `TranslationProvider` & `useTranslation` supporting EN & VI, centralized date/time/currency/distance formatters, React Navigation 7 theme integration, 100% full migration of all screens and components from FE-P4 through FE-P10, 18/18 test suites and 97/97 tests pass, 21/21 expo-doctor checks pass).**

### Current

> **FE Phase 11 — Add Place UI Flow**

### Next

> **FE Phase 12 — Itinerary Day Edit UI Flow**

## 7. Quality commands

Run from `mobile/`:

```powershell
npm run lint
npm run typecheck
npm test
npx expo-doctor
```

Chạy build runtime Android khi cần kiểm tra native/layout thực tế:

```powershell
npm run android
```

Chạy web Metro preview để test giao diện nhanh trên browser:

```powershell
npm run web
```
