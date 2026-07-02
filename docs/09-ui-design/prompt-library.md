# Prompt Library (Trae Design/Code)

Thư viện prompt này dùng để tạo UI (design hoặc code) về sau, đảm bảo bám sát phong cách split-screen “Trek E‑MTB dashboard”.

Quy tắc khi dùng prompt:

- Luôn dán kèm “Design Tokens” (màu/radius/shadow) để model không tự bịa style.
- Luôn mô tả rõ layout split-screen và mối liên hệ timeline ↔ map.
- Luôn yêu cầu state đầy đủ: empty/loading/error.
- Không yêu cầu sinh backend logic; chỉ UI.

---

## Block: Design tokens (dán kèm)

Dán block này vào mọi prompt (có thể rút gọn nếu cần):

```text
TripWise design tokens (light):
- Outer background: warm beige #F6E3D3 (optional gradient #F6E3D3 -> #F7D9C4)
- App shell: #F8FAFC / white panels, big rounded corners (24–32px shell, 16px cards, 12px controls)
- Primary accent: bright blue #2F7BFF (hover #2563EB, soft bg #E8F0FF)
- Secondary accent: lime #B8F24A (soft bg #F0FCE1)
- Text: slate-900/700/500 style
- Shadows: soft and premium (card: 0 8px 24px rgba(15,23,42,0.10); overlay stronger)
- Typography: Inter / Plus Jakarta Sans / Be Vietnam Pro
Style: modern, clean, premium SaaS dashboard, travel-tech AI assistant, split-screen cockpit feel.
```

---

## Prompt: Landing Page (Design)

```text
Thiết kế Landing Page cho ứng dụng TripWise (AI smart travel planner).

Yêu cầu:
- Tone: modern premium SaaS + travel-tech + warm background.
- Header sticky: logo TripWise + links + Sign in (secondary) + Get started (primary).
- Hero 2 cột: trái là headline/subheadline + prompt textarea + example chips + CTA; phải là mock preview split-screen (trái timeline, phải map với route line).
- Sections: Feature cards (5 cards), How it works (4 steps), Popular destinations (grid + cards), AI planning showcase (prompt -> itinerary preview), CTA cuối trang, Footer.
- Responsive: mobile stack, hero preview simplified, destinations carousel.
- Include empty/loading states cho prompt box (submit).

Output: một thiết kế hoàn chỉnh, spacing rõ ràng, dùng đúng design tokens bên trên.
```

---

## Prompt: Dashboard (Design)

```text
Thiết kế màn hình User Dashboard cho TripWise.

Yêu cầu:
- Layout dạng card-based premium.
- Cột trái: Continue planning hero card + Trip list (cards).
- Cột phải: Weather cards + Saved destinations + AI suggestions + Quick actions tiles.
- Mỗi card cần mô tả rõ: title, meta, actions, states (empty/loading/error).
- Dùng typography rõ ràng cho dữ liệu (tabular numbers).
- Dùng đúng design tokens.

Output: dashboard UI với hierarchy rõ (title/section/card), có states, có responsive.
```

---

## Prompt: AI Trip Planner (Design)

```text
Thiết kế màn hình AI Trip Planner cho TripWise.

Yêu cầu:
- 2 cột (desktop): trái là form, phải là AI suggestions + preview itinerary.
- Form fields: Destination (autocomplete), Date range (1–3 days MVP), Budget (low/med/high), Travel style chips, Travelers stepper, Transportation profile, Food preference chips, Prompt textarea optional.
- Có phần "AI đã hiểu" (read-only summary) khi user nhập prompt.
- Preview itinerary: tabs Day 1/2/3, list compact items.
- CTA: Generate / Regenerate / Save, có confirm khi regenerate.
- Loading state: progress steps (Parsing/Selecting/Routing/Composing) + skeleton.
- Error state: AI timeout, thiếu dữ liệu địa điểm, OSRM lỗi.

Output: UI đặc tả chi tiết, dùng design tokens.
```

---

## Prompt: Trip Detail + Map View (Design - Core)

```text
Thiết kế màn hình Trip Detail + Map View (core screen) cho TripWise, lấy cảm hứng dashboard split-screen kiểu Trek E‑MTB.

Layout desktop:
- Outer warm background (beige/cam pastel).
- App shell nổi, bo 24–32px, shadow mềm.
- Split-screen: trái (420–520px) là trip detail + timeline; phải là map OpenStreetMap.

Left panel gồm:
- Trip header sticky: title, duration/date, 2–4 status tags, quick actions (save/share/regenerate).
- Summary stats row: distance, vehicle, weather, estimated cost.
- Interactive timeline theo ngày (Day tabs), timeline items có time chip + meta + tags.
- Optimization score / estimated cost card.

Right map panel gồm:
- Search bar overlay top-left.
- Markers (numbered stops + hotel/origin).
- Route polyline màu brand blue có halo trắng.
- Nearest place label overlay nhỏ.
- Turn-by-turn instruction card overlay bottom-right (next step, distance, ETA, prev/next, focus).

Interactions:
- click timeline item -> focus marker + highlight route segment + show instruction card.
- đổi ngày -> map cập nhật marker/route theo ngày.
- states: empty/loading/error (OSRM fail fallback hiển thị marker thôi).

Mobile:
- Map full-screen + floating search bar + trip summary card + bottom sheet itinerary + instruction card.

Output: thiết kế đầy đủ, rõ spacing/radius/shadow, bám design tokens.
```

---

## Prompt: Mobile Map View (Design)

```text
Thiết kế Trip Detail Map View cho mobile (TripWise).

Yêu cầu:
- Map full-screen background.
- Floating top search bar + optional trip summary card.
- Draggable bottom sheet itinerary với 3 snap points (collapsed/mid/expanded), có day tabs + list items.
- Instruction card nằm ngay trên sheet (next step + ETA).
- FAB: recenter + directions mode.
- Touch targets >= 40px, safe areas cho notch và gesture bar.

Output: UI mobile map-first, bám design tokens.
```

---

## Prompt: React + Tailwind + shadcn/ui (Code generation)

```text
Tạo UI React (Next.js hoặc React) + TailwindCSS + shadcn/ui cho TripWise theo design tokens.

Yêu cầu code:
- Không sinh backend, chỉ UI components.
- Dùng Tailwind config theo tokens:
  - canvas bg #F6E3D3, primary #2F7BFF, lime #B8F24A, radius lớn.
- Tạo layout split-screen: LeftTripPanel + RightMapPanel (map placeholder).
- Component tối thiểu: AppShell, TripHeader, StatusTag, TripStats, Timeline, TimelineItem, SearchBar, RouteInstructionCard.
- Có states: empty/loading/error cho Trip Detail screen.
- Không dùng data thật; dùng mock data typed theo UI contract.

Output: cấu trúc thư mục + components + page layout, clean và dễ mở rộng.
```

---

## Prompt: Flutter mobile UI (Code generation)

```text
Tạo UI Flutter cho TripWise (map-first) theo design tokens.

Yêu cầu:
- Map layer dùng flutter_map (placeholder tiles ok).
- Layout dùng Stack + Positioned + SafeArea.
- Floating search bar, trip summary card, draggable bottom sheet itinerary, instruction card.
- Marker custom widget (selected + order badge).
- Không gọi API thật, dùng mock models.

Output: widget tree rõ ràng, tách component nhỏ, chuẩn bị cho state management.
```

