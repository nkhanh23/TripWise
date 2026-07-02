# Component Spec (Web + Mobile)

Tài liệu này liệt kê các component UI cốt lõi cần tạo để dựng TripWise theo design system và layout đã mô tả.

Quy tắc chung:

- Props mô tả theo **UI contract**, không leak entity/persistence model.
- Component ưu tiên composition thay vì “mega component”.
- Mọi component phải có state rõ: `default / hover / active / disabled / loading / error` (nếu phù hợp).

---

## AppShell

- Props gợi ý:
  - `children`
  - `variant`: `dashboard | public`
  - `header?`, `sidebar?` (optional)
- Visual style:
  - outer padding 24–32
  - container radius 24–32, shadow lg
  - background `bg.surface`
- Behavior:
  - manage split layout grid
  - lock body scroll nếu cần
- Responsive:
  - desktop split
  - mobile stacked

---

## Sidebar (optional)

- Props:
  - `items: {id,label,icon,href}[]`
  - `activeId`
  - `collapsed?`
- Visual:
  - width 72–84
  - icon button style, active highlight
- Behavior:
  - tooltip on hover
- Responsive:
  - hidden on mobile, replaced by bottom nav

---

## SearchBar

- Props:
  - `value`
  - `onChange`
  - `onSubmit`
  - `placeholder`
  - `results`
  - `onSelectResult`
  - `loading?`, `error?`
  - `mode`: `search | add-stop`
- Visual:
  - height 44, radius 999 hoặc 18–20
  - overlay glass rules (map)
- Behavior:
  - debounce typing
  - dropdown list with keyboard nav
- Responsive:
  - full width on mobile, sticky top overlay

---

## TripHeader

- Props:
  - `title`
  - `subtitle` (destination + date range)
  - `statusTags`
  - `actions` (save/share/regenerate)
- Visual:
  - sticky area trong left panel
  - title max 2 lines
- Behavior:
  - actions show tooltip
- Responsive:
  - on mobile: condensed + back button

---

## StatusTag

- Props:
  - `label`
  - `variant`: `info | lime | warn | neutral | error`
  - `icon?`
- Visual:
  - pill, padding 10–12, icon 14
- Behavior:
  - optional dismiss (future)
- Responsive:
  - wrap, max 2 lines

---

## TripStats

- Props:
  - `items: {label,value,icon,variant?}[]`
  - `layout`: `row | grid`
- Visual:
  - card hoặc inline row
  - numbers tabular
- Behavior:
  - tooltip on overflow
- Responsive:
  - switch row → grid on narrow width

---

## Timeline

- Props:
  - `days: {id,label,date}[]`
  - `activeDayId`
  - `onChangeDay`
  - `items` (cho day hiện tại)
  - `selectedItemId?`
  - `onSelectItem`
- Visual:
  - day tabs sticky (optional)
  - spacing dọc 12–16
- Behavior:
  - scroll container riêng
  - auto-scroll selected into view
- Responsive:
  - desktop: list trong panel
  - mobile: bottom sheet list

---

## TimelineItem

- Props:
  - `id`
  - `timeLabel`
  - `title`
  - `meta` (category/tags/cost/duration)
  - `state`: `default | selected | disabled`
  - `onClick`
- Visual:
  - selected background `brand.primarySoft`
  - time chip nhỏ
- Behavior:
  - hover preview (desktop)
- Responsive:
  - truncate title 1–2 lines

---

## MapPanel

- Props:
  - `center`, `zoom`
  - `markers`
  - `selectedMarkerId?`
  - `routeGeometry?`
  - `routeSteps?`
  - `onMarkerClick`
  - `overlays` (search bar, instruction card)
- Visual:
  - full height, rounded corners match shell
- Behavior:
  - manage safe areas for overlays
  - focus marker on selection change
- Responsive:
  - mobile full-screen

---

## MapMarker

- Props:
  - `id`
  - `lat`, `lng`
  - `label?` (số thứ tự)
  - `variant`: `stop | hotel | search`
  - `state`: `default | selected | visited`
- Visual:
  - brand primary + white stroke
  - selected glow
- Behavior:
  - click opens popup or triggers selection
- Responsive:
  - keep tap target >= 40px (mobile)

---

## NearestPlaceLabel (map overlay)

- Props:
  - `label` (ví dụ: “Nearest: …”)
  - `distanceText`
  - `visible`
- Visual:
  - overlay nhỏ, radius 999 hoặc 16
  - theo glass rules + shadow mapOverlay (nhẹ hơn instruction card)
- Behavior:
  - auto-hide sau 2–4 giây (trừ khi hover/focus)
- Responsive:
  - trên mobile đặt cao hơn bottom sheet để không bị che

---

## RouteInstructionCard

- Props:
  - `stepIndex`
  - `totalSteps`
  - `instruction`
  - `distanceText`
  - `etaText`
  - `onPrev`, `onNext`
  - `onFocusRoute`
  - `collapsed?`
- Visual:
  - overlay card, shadow mapOverlay
- Behavior:
  - auto-hide / collapse (optional)
- Responsive:
  - bottom-center on small screens

---

## DestinationCard

- Props:
  - `name`
  - `category`
  - `tags`
  - `distanceText?`
  - `ctaLabel?`
  - `onClick`, `onCTA`
- Visual:
  - card 16 radius, image optional
- Behavior:
  - used in search results / favorites
- Responsive:
  - compact layout on mobile

---

## WeatherCard

- Props:
  - `dateLabel`
  - `icon`
  - `tempMin`, `tempMax`
  - `rainProbability?`
  - `summary`
  - `variant`: `normal | warn`
- Visual:
  - compact, icon 24
- Behavior:
  - tooltip detail (optional)
- Responsive:
  - horizontal scroll list on mobile

---

## BudgetCard

- Props:
  - `estimatedTotal`
  - `budgetLevel`
  - `status`: `ok | tight | over`
  - `breakdown?`
- Visual:
  - progress bar + tag
- Behavior:
  - show warning if `over`
- Responsive:
  - collapse breakdown on small screens

---

## BottomSheet (mobile)

- Props:
  - `snapPoints`
  - `initialSnap`
  - `header`
  - `children`
  - `onSnapChange`
- Visual:
  - radius 24 top corners
  - handle bar
- Behavior:
  - drag to snap
  - scroll inner list
- Responsive:
  - mobile only (web can reuse as drawer)

---

## FloatingActionButton (mobile)

- Props:
  - `icon`
  - `label?`
  - `onClick`
  - `variant`: `primary | secondary`
- Visual:
  - circle 52–56, shadow mapOverlay
  - primary uses brand
- Behavior:
  - haptic feedback (native)
- Responsive:
  - position avoids bottom sheet + safe area
