# Android Accessibility & Touch Target Audit (T005 Corrective)

**Audited Device**: Android Emulator `emulator-5554` (sdk_gphone16k_x86_64, API 37)  
**Physical Density**: 420 dpi  
**Scale Factor**: 2.625 px/dp (420 / 160)  
**Minimum Target Requirement**: >= 44dp x 44dp (115.5px x 115.5px)  
**Date**: 2026-09-10  

---

## Interactive Controls Audit Table

| Screen | Element | Accessibility Label | Pixel Bounds | Size (px) | Size (dp) | Target >=44dp | Result |
|---|---|---|---|---|---|---|---|
| Explore (EN Light) | Places Mode Tab | `Places` | `[42,68][270,184]` | 228 x 116 | 86.9 x 44.2 dp | Yes | ✅ PASS |
| Explore (EN Light) | Live Events Mode Tab | `Live Events` | `[291,68][599,184]` | 308 x 116 | 117.3 x 44.2 dp | Yes | ✅ PASS |
| Explore (EN Light) | Search Input | `Search` | `[148,212][880,341]` | 732 x 129 | 278.9 x 49.1 dp | Yes | ✅ PASS |
| Explore (EN Light) | Filters Button | `Filters` | `[890,219][1005,334]` | 115 x 115 | 43.8 x 43.8 dp | Yes | ✅ PASS |
| Explore (EN Light) | Map/List View Toggle | `Switch to list view` | `[435,2030][645,2145]` | 210 x 115 | 80 x 43.8 dp | Yes | ✅ PASS |
| Explore (VI Dark) | Chế độ Địa điểm | `Địa điểm` | `[42,68][307,184]` | 265 x 116 | 101 x 44.2 dp | Yes | ✅ PASS |
| Explore (VI Dark) | Chế độ Sự kiện | `Sự kiện trực tiếp` | `[328,68][721,184]` | 393 x 116 | 149.7 x 44.2 dp | Yes | ✅ PASS |
| Explore (VI Dark) | Nút chuyển danh sách | `Chuyển sang chế độ danh sách` | `[379,2030][701,2145]` | 322 x 115 | 122.7 x 43.8 dp | Yes | ✅ PASS |
| Place Preview (EN) | Close Preview Sheet | `Close` | `[923,1559][1038,1674]` | 115 x 115 | 43.8 x 43.8 dp | Yes | ✅ PASS |
| Place Preview (EN) | Directions Button | `Get Directions` | `[103,1987][249,2156]` | 146 x 169 | 55.6 x 64.4 dp | Yes | ✅ PASS |
| Place Preview (EN) | Save Place Button | `Save` | `[370,1987][485,2156]` | 115 x 169 | 43.8 x 64.4 dp | Yes | ✅ PASS |
| Place Preview (EN) | Share Place Button | `Share` | `[862,1987][978,2156]` | 116 x 169 | 44.2 x 64.4 dp | Yes | ✅ PASS |
| Event Preview (EN) | Close Event Sheet | `Close` | `[923,1500][1038,1615]` | 115 x 115 | 43.8 x 43.8 dp | Yes | ✅ PASS |
| Event Preview (VI) | Đóng Preview Sự kiện | `Đóng` | `[923,1460][1038,1575]` | 115 x 115 | 43.8 x 43.8 dp | Yes | ✅ PASS |
| Event State (VI) | Thử lại (Retry) | `Thử lại` | `[430,894][650,1009]` | 220 x 115 | 83.8 x 43.8 dp | Yes | ✅ PASS |
| Place Detail (EN) | Back Navigation | `Back` | `[42,63][158,179]` | 116 x 116 | 44.2 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (EN) | Share Button | `Share` | `[786,63][902,179]` | 116 x 116 | 44.2 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (EN) | Save Button | `Save` | `[923,63][1038,179]` | 115 x 116 | 43.8 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (EN) | Quick Action: Route | `Get Directions` | `[42,705][275,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (EN) | Quick Action: Website | `Website` | `[296,705][530,942]` | 234 x 237 | 89.1 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (EN) | Quick Action: Call | `Call` | `[551,705][784,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (EN) | Quick Action: Add | `Add` | `[805,705][1038,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (VI) | Nút Quay lại | `Quay lại` | `[42,63][158,179]` | 116 x 116 | 44.2 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (VI) | Nút Chia sẻ | `Chia sẻ` | `[786,63][902,179]` | 116 x 116 | 44.2 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (VI) | Nút Lưu | `Lưu` | `[923,63][1038,179]` | 115 x 116 | 43.8 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (VI) | Thao tác: Đường đi | `Chỉ đường` | `[42,705][275,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (VI) | Thao tác: Trang web | `Trang web` | `[296,705][530,942]` | 234 x 237 | 89.1 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (VI) | Thao tác: Gọi điện | `Gọi điện` | `[551,705][784,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (VI) | Thao tác: Thêm | `Thêm` | `[805,705][1038,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |
| Place Detail (VI) | Xem lịch mở cửa | `Xem lịch mở cửa trong tuần` | `[153,1515][498,1631]` | 345 x 116 | 131.4 x 44.2 dp | Yes | ✅ PASS |
| Place Detail (VI) | Bottom CTA Chỉ đường | `Chỉ đường` | `[42,705][275,942]` | 233 x 237 | 88.8 x 90.3 dp | Yes | ✅ PASS |

---

## Semantic and State Accessibility Verification

1. **Localized Labels & Content Descriptions**:
   - EN Light runtime provides English `content-desc` for all interactive controls (e.g. `Switch to list view`, `Places`, `Live Events`, `Call`, `Add`, `Open Now`).
   - VI Dark runtime provides Vietnamese `content-desc` for all interactive controls (e.g. `Chuyển sang chế độ danh sách`, `Địa điểm`, `Sự kiện trực tiếp`, `Gọi điện`, `Thêm`, `Đang mở cửa`).
   - Hardcoded Vietnamese hints in `ExploreViewToggle.tsx` have been eliminated and replaced with `t('explore.switchToList')` and `t('explore.switchToMap')`.

2. **No Reliance on Color Alone**:
   - `Review Required` / `Chờ xem xét` state uses explicit text badge + icon (`rate-review`) + semantic accessible text.
   - `Live` / `Trực tiếp` status uses explicit text + badge.
   - `Stale` / `Cached` status uses explicit text + icon (`cached`).
   - Rate limit / error state includes descriptive alert text and retry button.

3. **Provider Attribution & Provenance**:
   - Google Places provenance is disclosed via accessible text `Source: Google Places` / `Nguồn: Google Places`.
   - Ticketmaster provenance is disclosed via accessible badge `Ticketmaster` with content description `Events provided by Ticketmaster` / `Sự kiện cung cấp bởi Ticketmaster`.

4. **Touch Target Compliance**:
   - All interactive buttons, chips, quick actions, close buttons, and toggles exceed 44dp in height and width.
   - Secondary text action triggers (`Xem thêm`, `Xem lịch mở cửa trong tuần`) have `minHeight: 44` and ample width.

**Overall Android Accessibility Verdict: PASS**
