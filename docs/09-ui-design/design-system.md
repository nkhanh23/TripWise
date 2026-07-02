# Design System v2 — TripWise
## Kinetic Typography × Retro Cartoon Travel

> **Version 2.0** — Nâng cấp toàn bộ từ "Premium SaaS Dashboard" sang **"Kinetic Typography Web Design + Retro Cartoon Adventure"** lấy cảm hứng thị giác từ poster du lịch thập niên 1930s, hoạt hình cao su cổ điển (rubber hose animation), arcade game aesthetic, và kinetic typography.
>
> **Lưu ý thiết kế:** Không sao chép nhân vật, logo, asset, artwork, hoặc tên thương hiệu từ Cuphead. Chỉ lấy cảm hứng thị giác thuần túy.

---

## 1. Visual Theme & Atmosphere

### Bản sắc thị giác cốt lõi

TripWise v2 phải cảm giác như một **tấm poster du lịch retro sống động** — màu ấm của giấy in cũ, nét mực đen dày khỏe, chữ lớn bật lên như biển quảng cáo, card có cảm giác như vé tàu hay tem bưu chính thập niên 1930s.

Không phải app du lịch công ty. Không phải SaaS tối giản. Là một **người bạn đồng hành phiêu lưu, vui nhộn, có phong cách mạnh mẽ**.

### Atmosphere keywords

- **Warm parchment**: nền giấy ấm, không lạnh.
- **Ink-heavy**: viền đen dày là phần trang trí, không phải giới hạn.
- **Punchy type**: chữ lớn, đậm, có shadow, có nhịp.
- **Retro travel**: postcard, vé tàu, bản đồ, la bàn, tem thư.
- **Cartoon energy**: vui nhộn, bouncy, không cứng nhắc.
- **Functional clarity**: dễ đọc, dùng được thật, UX không bị phá vỡ bởi style.

### Moodboard keywords (design reference)

Poster du lịch thập niên 1930–1950, WPA Travel Posters, Saul Bass graphic design, vintage comic book covers, arcade game UI, rubber hose animation aesthetic, retro screen printing.

---

## 2. Brand Personality

| Chiều | Cũ (SaaS) | Mới (Kinetic Retro) |
|---|---|---|
| Tone | Chuyên nghiệp, clean | Phiêu lưu, vui nhộn, đáng nhớ |
| Visual weight | Nhẹ, tối giản | Đậm, mạnh, có cá tính |
| Color feel | Mát lạnh (blue-first) | Ấm áp (cream-first + cyan accent) |
| Typography | Gọn, functional | Lớn, dramatic, kinetic |
| Motion | Subtle transitions | Bouncy, pop, slide, squash |
| Border | Nhẹ, mờ | Đen dày, comic-style |
| Shadow | Mềm, diffused | Hard offset, comic book |
| Vibe | "Travel booking app" | "Adventure planner" |

---

## 3. Color Tokens

### Base & Background

| Token | Hex | RGB | Dùng cho |
|---|---|---|---|
| `bg.canvas` | `#F7E7C6` | 247, 231, 198 | Nền tổng (warm parchment cream), toàn màn hình |
| `bg.canvasAlt` | `#F3C99B` | 243, 201, 155 | Gradient phụ, section background, outer beige |
| `bg.surface` | `#FFF6DE` | 255, 246, 222 | App shell, card chính, panel |
| `bg.panel` | `#FFFDF3` | 255, 253, 243 | Card nội dung, form container, timeline panel |
| `bg.ink` | `#111111` | 17, 17, 17 | Viền dày, text chính, comic shadow |

### Primary Accents

| Token | Hex | RGB | Dùng cho |
|---|---|---|---|
| `brand.primary` | `#20A7D8` | 32, 167, 216 | CTA chính, route line, active map marker |
| `brand.primaryDark` | `#087CA7` | 8, 124, 167 | Hover/pressed CTA, dark variant |
| `brand.primarySoft` | `#D6F1FB` | 214, 241, 251 | Nền highlight nhẹ, tag info |
| `brand.red` | `#E6392E` | 230, 57, 46 | Điểm nhấn mạnh, warning hot, destructive |
| `brand.redSoft` | `#FFDDDB` | 255, 221, 219 | Nền error nhẹ |
| `brand.yellow` | `#FFD166` | 255, 209, 102 | Hero typography highlight, chips quan trọng |
| `brand.yellowSoft` | `#FFF3C4` | 255, 243, 196 | Tag nền nhẹ, selected item |
| `brand.lime` | `#B8F24A` | 184, 242, 74 | Success, "Optimized" status, positive tags |
| `brand.limeSoft` | `#EDFCC8` | 237, 252, 200 | Nền success nhẹ |
| `brand.orange` | `#F77F00` | 247, 127, 0 | Badge, secondary accent, destination card label |
| `brand.orangeSoft` | `#FFE7C2` | 255, 231, 194 | Nền badge nhẹ |

### Text

| Token | Hex | Dùng cho |
|---|---|---|
| `text.primary` | `#111111` | Tiêu đề, nội dung chính |
| `text.secondary` | `#3A2F2A` | Mô tả, label, secondary content |
| `text.muted` | `#7A6A58` | Hint, placeholder, timestamp |
| `text.inverse` | `#FFF6DE` | Text trên nền tối/đen |
| `text.accent` | `#087CA7` | Link, active text |

### Stroke & Border

| Token | Hex | Dùng cho |
|---|---|---|
| `stroke.ink` | `#111111` | Viền chính (card, button, input) — THICK |
| `stroke.soft` | `#D8B98A` | Viền phụ, divider giữa sections |
| `stroke.light` | `#EBD8B7` | Divider nhẹ trong panel, spacer |

### State Colors

| Token | Hex | Dùng cho |
|---|---|---|
| `state.success` | `#B8F24A` | Arcade Lime |
| `state.successDark` | `#7EC413` | Text trên nền success |
| `state.warn` | `#FFD166` | Vintage Yellow |
| `state.warnDark` | `#A67C00` | Text trên nền warn |
| `state.error` | `#E6392E` | Rubber Hose Red |
| `state.errorDark` | `#9E1F16` | Text trên nền error |
| `state.info` | `#20A7D8` | Punchy Cyan |
| `state.infoDark` | `#087CA7` | Text trên nền info |

### Quy tắc màu bắt buộc

1. **Viền đen là phần trang trí, không chỉ là border** — phải xuất hiện ở mọi card, button, input.
2. Nền luôn **ấm và sáng** — không dùng màu lạnh hoặc trắng tinh thuần túy làm nền chính.
3. `brand.primary` (cyan) dùng cho **CTA chính và route** — không dùng cho text dài hoặc nền lớn.
4. `brand.yellow` dùng cho **headline/highlight** — không dùng làm nền cho chữ trắng (contrast thấp).
5. `brand.red` dùng **tiết kiệm** — chỉ cho CTA phụ quan trọng, warning mạnh, action nguy hiểm.
6. Route line trên map: **cyan `#20A7D8`**, có halo trắng/kem `3–4px`.

---

## 4. Typography Tokens

### Font Family Stack

```
Display / Hero / Wordmark:
  "Luckiest Guy", "Bangers", "Lilita One", "Baloo 2", cursive
  → Bold, retro, condensed, cartoon energy

UI / Body / Vietnamese:
  "Be Vietnam Pro", "Plus Jakarta Sans", "Inter", system-ui, sans-serif
  → Dễ đọc, rõ ràng, tốt cho tiếng Việt

Fallback system:
  system-ui, -apple-system, sans-serif
```

> **Quy tắc:** Display font (Luckiest Guy/Bangers) **chỉ** dùng cho headline hero, logo wordmark, section title lớn. Body text và UI label **phải** dùng Be Vietnam Pro / Plus Jakarta Sans.

### Type Scale — Web

| Role | Token | Size | Line-height | Weight | Font |
|---|---|---|---|---|---|
| Hero headline | `type.hero` | 72–88px | 0.90–0.95 | 900 | Display |
| Section display | `type.display` | 48–64px | 0.95–1.0 | 800–900 | Display |
| Page title | `type.h1` | 32–40px | 1.1 | 800 | Display |
| Card title | `type.h2` | 24–28px | 1.2 | 700 | Display hoặc UI |
| Sub-heading | `type.h3` | 18–22px | 1.3 | 700 | UI |
| Body default | `type.body` | 15–16px | 1.6 | 400–500 | UI |
| Body small | `type.bodySmall` | 13–14px | 1.5 | 400–500 | UI |
| Label UI | `type.label` | 13px | 1.4 | 600–700 | UI |
| Badge / Stamp | `type.badge` | 10–12px | 1.2 | 700–800 | UI uppercase |
| Micro info | `type.micro` | 10px | 1.2 | 500–600 | UI |

### Type Scale — Mobile

| Role | Size | Notes |
|---|---|---|
| Hero headline | 44–56px | Giảm nhưng vẫn phải "punchy" |
| Section display | 32–42px | — |
| Page title | 24–30px | — |
| Body | 14–15px | Không nhỏ hơn 14px |

### Typography Rules

1. **Hero headline** — có thể xuất hiện theo từng cụm từ (word pop-in), rotate nhẹ `±1–2deg` để tạo cảm giác hand-lettered, text-shadow đen offset `4–6px`.
2. **Text shadow dạng comic** — dùng cho display/h1:
   - Cơ bản: `4px 5px 0 #111111`
   - Layered: `2px 2px 0 #E6392E, 4px 4px 0 #111111` (red+black layer)
   - Yellow highlight: background-clip text hoặc highlight rect phía sau chữ
3. **Uppercase** — dùng cho badge, stamp, label ngắn. Không dùng cho body text.
4. **Letter spacing** — display font: `0–0.02em`. Body: mặc định.
5. **Tránh** dùng display font cho đoạn văn > 2 dòng.

---

## 5. Border / Radius / Shadow Tokens

### Border Radius

| Token | Value | Dùng cho |
|---|---|---|
| `radius.card` | `20–24px` | Card chính, panel container |
| `radius.button` | `14–18px` | Button thông thường |
| `radius.pill` | `9999px` | Tag, chip, badge |
| `radius.input` | `12–14px` | Input, textarea |
| `radius.mapPanel` | `24px` | Map container |
| `radius.modal` | `24–28px` | Modal, side sheet |
| `radius.tiny` | `8px` | Small decorative element |

### Border

| Token | Value | Dùng cho |
|---|---|---|
| `border.card` | `2–3px solid #111111` | Card content |
| `border.button` | `3px solid #111111` | Button primary/secondary |
| `border.input` | `2px solid #111111` | Input, textarea |
| `border.tag` | `2px solid #111111` | Status tags, chips |
| `border.soft` | `1.5px solid #D8B98A` | Dividers, subtle separators |

> **Quy tắc:** Viền đen `#111111` phải xuất hiện ở **tất cả** card, button, input quan trọng. Đây là đặc trưng nhận diện, không được bỏ qua.

### Shadow

| Token | Value | Dùng cho |
|---|---|---|
| `shadow.card` | `4px 4px 0 #111111` | Card mặc định |
| `shadow.cardLg` | `6px 6px 0 #111111` | Card lớn, hero panel |
| `shadow.button` | `4px 4px 0 #111111` | Button mặc định |
| `shadow.buttonHover` | `6px 6px 0 #111111` | Button hover (+ translate -2px) |
| `shadow.buttonPressed` | `2px 2px 0 #111111` | Button pressed (+ translate +2px) |
| `shadow.mapOverlay` | `4px 4px 0 #111111` | HUD overlay trên map |
| `shadow.modal` | `8px 8px 0 #111111` | Modal, side sheet |

### Texture & Noise

- Background canvas có thể thêm **paper grain noise** rất nhẹ: `opacity 0.04–0.08`.
- Section backgrounds có thể dùng **radial dot pattern** hoặc halftone pattern cực nhẹ.
- Không để texture làm giảm readability của text.

---

## 6. Motion Tokens

### Timing

| Token | Duration | Easing | Dùng cho |
|---|---|---|---|
| `motion.instant` | `80ms` | `ease-out` | Micro feedback |
| `motion.pop` | `150ms` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Button pop, icon appear |
| `motion.bounce` | `300ms` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Card hover lift, marker bounce |
| `motion.slide` | `250ms` | `ease-in-out` | Panel slide, drawer |
| `motion.sectionReveal` | `500ms` | `ease-out` | Scroll-triggered section |
| `motion.routeDraw` | `800–1200ms` | `ease-in-out` | Route polyline draw animation |
| `motion.heroWord` | `120ms` per word | stagger | Word pop-in for hero headline |

### Animation Patterns

**Hero Headline (Kinetic Typography):**
```
Mỗi cụm từ xuất hiện theo thứ tự với delay 80–120ms:
- translateY: 30px → 0
- opacity: 0 → 1
- scale: 0.8 → 1
- rotate: -3deg → 0deg
- Kết hợp với text-shadow pop xuất hiện sau 50ms
```

**Button Interactions:**
```
Hover:
  - transform: translate(-2px, -2px)
  - shadow: 6px 6px 0 #111111
  - duration: motion.bounce

Active/Pressed:
  - transform: translate(2px, 2px)
  - shadow: 2px 2px 0 #111111
  - duration: motion.instant

Focus:
  - outline: 3px solid brand.primary
  - outline-offset: 3px
```

**Card Hover Lift:**
```
- transform: translate(-3px, -3px)
- shadow: 7px 7px 0 #111111
- duration: motion.bounce
- Icon bên trong: wiggle nhẹ ±5deg, 1 lần
```

**Map Marker (Selected):**
```
- scale: 1.0 → 1.2 → 1.1 (bounce)
- drop-shadow glow nhẹ
- duration: motion.bounce
```

**Route Line Draw:**
```
- SVG stroke-dasharray animation
- Draw từ điểm đầu → điểm cuối
- duration: motion.routeDraw
- easing: ease-in-out
```

**Loading States:**
```
Option A: 3 dots bounce sequentially (delay 150ms each)
Option B: Stamp/seal animation spinning → thud
Option C: Route line drawing skeleton
Không dùng spinner mặc định generic.
```

### Accessibility Motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Tắt toàn bộ animation,
     giữ lại chỉ opacity transition đơn giản */
  * { animation: none !important; transition: opacity 0.1s; }
}
```

---

## 7. Component Styling Rules

### Buttons

**Primary Button (CTA chính):**
```
Background: brand.primary (#20A7D8) hoặc brand.red (#E6392E)
Text: text.inverse (#FFF6DE), weight 700–800, display font optional
Border: 3px solid #111111
Border-radius: 14–18px
Shadow: 4px 4px 0 #111111
Padding: 12–16px horizontal, 10–14px vertical

Hover: translate(-2px, -2px), shadow 6px 6px 0 #111111
Active: translate(2px, 2px), shadow 2px 2px 0 #111111
Disabled: opacity 0.45, cursor not-allowed, shadow none
Loading: dots animation bên trong, không disable hoàn toàn UX
```

**Secondary Button:**
```
Background: bg.surface (#FFF6DE)
Text: text.primary (#111111), weight 700
Border: 3px solid #111111
Shadow: 3px 3px 0 #111111

Hover: nền tint nhẹ brand.yellowSoft, shadow tăng
```

**Ghost / Icon Button:**
```
Chỉ dùng trong nav bar hoặc icon action nhỏ
Background: transparent
Border: 2px solid transparent
Hover: nền brand.yellowSoft hoặc brand.primarySoft, border stroke.soft
```

### Inputs & Forms

```
Background: bg.panel (#FFFDF3)
Border: 2px solid #111111
Border-radius: 12–14px
Placeholder: text.muted (#7A6A58)
Shadow mặc định: 3px 3px 0 #111111

Focus:
  border: 2px solid brand.primary (#20A7D8)
  outline: 3px solid brand.primarySoft
  shadow: 4px 4px 0 brand.primary

Error:
  border: 2px solid brand.red
  helper text: brand.red, weight 600
  background: brand.redSoft tint nhẹ

Prompt Textarea (Hero):
  Giống "travel note card":
  - paper texture background nhẹ
  - border dày hơn 3px
  - placeholder có cảm giác "viết tay" — dùng font italic UI
  - padding rộng hơn thông thường
```

### Cards

**Card cơ bản:**
```
Background: bg.panel (#FFFDF3)
Border: 2–3px solid #111111
Border-radius: 20–24px
Shadow: 4px 4px 0 #111111

Hover: translate(-3px, -3px), shadow 7px 7px 0 #111111
```

**Destination Card (Postcard style):**
```
Ảnh: có viền đen 3px, radius 16px bên trong card
Tag: sticker-style (border đen, nền yellow/orange/lime)
Card: slight rotation optional ±1deg
Hover: rotate về 0, pop lên, shadow tăng
```

**Continue Planning / Hero Card:**
```
Background: gradient warm hoặc map illustration
Border: 3px solid #111111
Có "big travel ticket" feel — stamp/badge ở góc
Progress bar: thick, đen, fill màu cyan
```

**Trip Card (Saved Trips):**
```
Giống postcard stack
Ảnh top với frame đen
Status tag như sticker góc trên phải
Bottom row: stat blocks (distance/stops/vehicle)
```

### Status Tags & Chips

```
Style: sticker / label phong cách

Cấu trúc:
  border: 2px solid #111111
  border-radius: pill (9999px) hoặc 8px tùy context
  padding: 2–4px 8–12px
  font: weight 700, 10–12px, optional uppercase

Màu theo trạng thái:
  Planned:     nền brand.primarySoft, border cyan, text ink
  Optimized:   nền brand.lime, border đen, text ink
  Draft:       nền bg.canvasAlt, border đen, text secondary
  Completed:   nền brand.limeSoft, border đen, text ink
  Warning:     nền brand.yellow, border đen, text ink
  Error/Alert: nền brand.red, border đen, text inverse
```

### Navigation

**Top / Side Nav:**
```
Logo "TripWise": playful wordmark, display font, bold
  - Có thể kèm small cartoon icon (la bàn / suitcase)
  - Text shadow nhẹ
Nav links: body font, weight 600
  hover: underline dạng "hand-drawn" (có thể dùng border-bottom với offset)
CTA "Get Started": primary button style, sticker feel
Mobile: hamburger menu, drawer dạng cartoon slide
```

---

## 8. Layout Principles

### Spacing System

```
Spacing scale: 4px base
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px

Gutter: 24px (desktop), 16px (tablet), 16px (mobile)
Container max-width: 1440px
Content max-width: 1280px
```

### Grid

```
Desktop: 12 columns, gutter 24px
Tablet: 8 columns, gutter 16px
Mobile: 4 columns, gutter 16px
```

### Landing Page Layout

```
Hero Section:
  - Có thể phá lưới nhẹ: chữ lớn tràn nhẹ, sticker float
  - Headline kinetic: 2–3 dòng, chữ to, có shadow comic
  - Prompt box: "travel note card" feel
  - Preview mock: cartoon poster của app cockpit
  - Tất cả trên nền bg.canvas warm

Feature Section:
  - Grid 2×2 hoặc 4 cột
  - Card nhỏ hơn nhưng vẫn border đen
  - Icon to, cartoon outline

Destination Cards:
  - Grid 3–4 cột (desktop) / carousel (mobile)
  - Postcard style

CTA Section cuối:
  - Giống vintage poster / travel banner
  - Headline lớn, nền contrast (có thể dùng bg.ink với text inverse)
  - CTA to, nổi bật

Footer:
  - Đơn giản, không chiếm không gian
```

### Dashboard Layout

```
App Shell:
  Full screen, sidebar trái cố định
  Nền: bg.canvas
  Không có rounded corner kiểu "window" — tràn màn hình

Sidebar:
  Nền: bg.surface hoặc bg.ink (dark sidebar option)
  Logo to, wordmark
  Icons + labels rõ
  Active state: highlight cartoon (background yellow hoặc cyan)

Main content:
  Padding 24–32px
  Overflow-y auto

Widgets layout (home):
  Column trái (8/12): Continue Planning hero card + Trip list
  Column phải (4/12): Weather, AI suggestions, Quick actions
  Không để quá dày đặc — cần white space thoáng
```

---

## 9. Map & Route UI Rules

### Map Container

```
Border: 3px solid #111111 (không được bỏ)
Border-radius: 24px
Shadow: 6px 6px 0 #111111
Background tile: OpenStreetMap — có thể chọn tile retro/vintage style
```

### Map Markers (Cartoon Pin)

```
Shape: circular pin, numbered badge
  - Outer circle: bg cream/white, border đen 3px
  - Number badge: nền cyan hoặc red, border đen, text cream
  - Pin tail: solid, border đen

Selected state:
  - Scale up 1.2x với bounce animation
  - Glow/aura nhẹ màu yellow
  - Z-index cao nhất

Hover state:
  - Scale up 1.1x
  - Tooltip nhỏ pop lên

Hotel / Origin marker:
  - Icon khác (house / star) thay cho số
  - Màu orange
```

### Route Polyline

```
Primary line:
  color: brand.primary (#20A7D8)
  stroke-width: 4–5px
  stroke-linecap: round
  stroke-linejoin: round

White halo (để nổi trên map):
  color: #FFFFFF hoặc #FFF6DE
  stroke-width: 8–10px
  render trước primary line

Black outer halo (cartoon effect):
  color: #111111
  stroke-width: 12px
  render đầu tiên

Highlighted segment (selected):
  color: brand.yellow
  stroke-width: 6px
  animate pulse nhẹ

Draw animation:
  stroke-dasharray, animate khi panel xuất hiện
```

### HUD Overlays

**Search Bar:**
```
Position: absolute top-left, margin 12px
Width: 320–420px
Background: bg.panel (#FFFDF3)
Border: 2–3px solid #111111
Shadow: 4px 4px 0 #111111
Border-radius: 14px
Icon: cartoon search icon
```

**Instruction Card (Turn-by-turn):**
```
Position: absolute bottom-right hoặc bottom-center
Feel: "travel ticket" hoặc "game HUD"
Background: bg.surface
Border: 3px solid #111111
Shadow: 4px 4px 0 #111111
Border-radius: 16px

Layout:
  - Arrow icon lớn (cartoon mũi tên)
  - Distance + ETA dạng stat block
  - Step counter (3/12)
  - Prev/Next controls: button nhỏ với border đen
```

**Stop Counter Badge:**
```
Position: top-right
Style: sticker badge
Nền: brand.yellow hoặc brand.primary
Border đen
Text: weight 800
```

---

## 10. Timeline / Itinerary UI Rules

### Timeline Container

```
Bên trái của split-screen
Scroll riêng, height full panel
Không phải vertical line corporate — có thể dùng dashed route line
```

### Timeline Item — "Itinerary Ticket"

```
Background: bg.panel
Border: 2px solid #111111
Shadow: 3px 3px 0 #111111
Border-radius: 16px
Padding: 12–16px

Cấu trúc item:
  [Time Stamp]  [Place Name]
  [Category tag]  [Duration]  [Cost]
  [Trailing icon action]

Time chip:
  Giống stamp/seal
  Nền brand.yellow hoặc brand.primarySoft
  Border đen 2px
  Text: weight 800, 11–13px

Selected item:
  Background: brand.yellowSoft tint
  Border: 3px solid brand.primary
  Shadow: 5px 5px 0 brand.primary
  Marker number: bounce animation
  Scale nhẹ 1.02x
```

### Transfer Item

```
Kiểu: dashed route connector (lighter than place item)
Background: transparent hoặc bg.canvas tint
Border: 2px dashed stroke.soft (#D8B98A)
Text: smaller, text.muted
Icon: small vehicle cartoon (xe máy / ô tô / đi bộ)
Không chiếm quá nhiều không gian
```

### Day Tabs

```
Style: ticket tab / boarding pass
Active tab: nền brand.yellow hoặc brand.primary, text ink, border đen, shadow nhẹ
Inactive: nền bg.surface, text.muted, border stroke.soft
Transition: slide hoặc pop khi đổi tab
```

### Optimization Score Card

```
Đặt cuối timeline hoặc sticky bottom
Background: bg.ink (#111111) — dark inverse card
Text: text.inverse (#FFF6DE)
Score number: brand.lime, display font lớn
Progress ring hoặc bar: brand.lime fill trên nền tối
Có 2–3 bullet "lý do" dạng compact
```

---

## 11. Responsive Rules

### Breakpoints

```
Mobile:   < 640px
Tablet:   640px – 1023px
Desktop:  >= 1024px
Wide:     >= 1440px
```

### Landing Page

| Section | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero | 2-col split | 2-col (stack slightly) | 1-col stack, headline first |
| Features | 4-col grid | 2-col grid | 1-col list |
| Destinations | 3–4 col grid | 2 col | Horizontal carousel |
| CTA Banner | Full width | Full width | Full width, smaller text |

### Dashboard

| Element | Desktop | Mobile |
|---|---|---|
| Layout | Sidebar + main content | Bottom nav hoặc hamburger |
| Widget grid | 12 col | 1 col stack |
| Continue card | Hero card trên cùng | Full width card |

### Trip Detail (Core Screen)

| Panel | Desktop (>= 1024px) | Mobile (< 768px) |
|---|---|---|
| Left Panel | 420–520px, fixed | Bottom sheet |
| Right Map | Remaining width | Full screen |
| Timeline | Scroll trong panel | Drag-up sheet |
| Instruction card | Overlay bottom-right | Above sheet |

### Mobile Rules Bắt Buộc

```
Touch target: tối thiểu 40×40px cho mọi interactive element
Bottom safe area: padding-bottom env(safe-area-inset-bottom)
No hover-only interactions: mọi hover phải có tap equivalent
Font minimum: 14px body, 11px label/badge
Map-first: map chiếm toàn màn hình, UI float/overlay trên map
```

---

## 12. Accessibility Rules

### Contrast Ratios (WCAG AA)

```
Body text trên bg.canvas: text.primary #111111 trên #F7E7C6
  → Contrast ratio: ~12:1 ✅

Body text trên bg.surface: text.primary #111111 trên #FFF6DE
  → Contrast ratio: ~18:1 ✅

Text trên brand.primary button: text.inverse trên #20A7D8
  → Cần kiểm tra: ~3.5:1 (AA cho large text/bold ✅)

Text trên brand.yellow: phải dùng text.primary #111111
  → Không dùng text trắng trên yellow

Text trên brand.red button: text.inverse trên #E6392E
  → Cần verify, có thể cần điều chỉnh shade
```

### Focus Management

```
Focus ring: 3px solid brand.primary, offset 3px
Không dùng outline: none trừ khi có custom focus style rõ ràng
Tab order: logical, theo đúng DOM order
Skip navigation: có "Skip to main content" link ẩn
```

### Button States

```
Mọi button phải có 4 states đầy đủ:
  default / hover / focus / active / disabled

Disabled:
  opacity: 0.45
  cursor: not-allowed
  shadow: none (không có shadow comic)
  border: vẫn giữ nhưng mờ
  Không chỉ dùng màu để biểu thị disabled
```

### Error States

```
Không chỉ dùng màu đỏ — phải có icon VÀ text helper
Text error: rõ ràng, thân thiện, có CTA
Inline error: xuất hiện ngay dưới input liên quan
Banner error: có dismiss và retry
```

### Empty States

```
Mọi list/section cần có empty state:
  - Illustration postcard/cartoon (không cartoon character có face)
  - Headline thân thiện
  - CTA rõ ràng để thoát trạng thái rỗng
```

### Loading States

```
Skeleton screens:
  - Màu: bg.canvasAlt với shimmer gradient
  - Shape match với content sẽ load
  
Progress indicators:
  - Bouncing dots: 3 dots, delay 150ms stagger
  - Route drawing: SVG animation cho map loading
  - Không dùng spinner chung chung nếu có thể tùy chỉnh
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 13. Do / Don't

### ✅ DO

- Dùng viền đen `2–3px solid #111111` cho tất cả card, button, input quan trọng.
- Dùng shadow comic `4px 4px 0 #111111` cho card và button.
- Nền warm parchment, không lạnh, không trắng tinh.
- Headline to, bold, có shadow, có kinetic energy.
- Prompt textarea giống travel note card.
- Route line cyan với halo cream trên map.
- Animation bouncy, pop, vui — không chậm, không rườm rà.
- Tag/badge dạng sticker với border đen.
- Destination cards giống postcard.
- Continue planning card giống travel ticket.
- Mobile: map-first, sheet kéo lên như ticket.
- Empty state dùng postcard/cartoon illustration vui.
- Loading dùng bouncing dots hoặc route drawing.
- Respect `prefers-reduced-motion`.

### ❌ DON'T

- Sao chép/dùng nhân vật, asset, artwork có bản quyền từ Cuphead hoặc bất kỳ IP nào.
- Dùng glassmorphism (backdrop-blur, semi-transparent panels).
- Shadow mềm diffused kiểu corporate SaaS (`box-shadow: 0 8px 24px rgba(0,0,0,0.1)`).
- Nền trắng tinh (`#FFFFFF`) làm canvas chính.
- Màu xanh SaaS `#2F7BFF` làm accent chính (đã thay bằng cyan `#20A7D8`).
- Quá nhiều animation cùng lúc — gây rối.
- Gradient quá phức tạp nhiều màu.
- Display font cho đoạn văn dài (> 2 dòng body text).
- Yellow làm nền cho chữ trắng.
- Bỏ border đen trên card/button "để sạch hơn" — đây là đặc trưng nhận diện.
- Spinner mặc định của browser không tùy chỉnh.
- Popup/modal lạnh lẽo không có viền và shadow.
- Typography quá nhỏ hoặc quá mảnh cho heading section.

---

## 14. Quick Reference Prompt Block

> Dùng block này khi tạo từng màn hình mới để đảm bảo đồng nhất style.

```
TripWise Design System v2 — Quick Prompt Block:

VISUAL THEME: Kinetic Typography × Retro Cartoon Travel poster.
  Warm, punchy, vui nhộn nhưng dùng được thật. Không game hoàn toàn.

COLOR TOKENS:
  Canvas background: #F7E7C6 (warm parchment)
  Surface/panel: #FFF6DE (vanilla paper)
  Ink/border: #111111 (cartoon ink black)
  Primary CTA: #20A7D8 (punchy cyan blue)
  Accent red: #E6392E (rubber hose red)
  Yellow highlight: #FFD166 (vintage poster yellow)
  Lime success: #B8F24A (arcade lime)
  Orange badge: #F77F00 (travel ticket orange)
  Text primary: #111111, secondary: #3A2F2A, muted: #7A6A58

TYPOGRAPHY:
  Display/Hero: Luckiest Guy hoặc Bangers — bold, retro, cartoon energy
  UI/Body: Be Vietnam Pro hoặc Plus Jakarta Sans
  Hero size: 72–88px, weight 900, text-shadow 4px 5px 0 #111111
  Section: 48–64px, weight 800

BORDER: 2–3px solid #111111 trên tất cả card, button, input
SHADOW: comic hard shadow — 4px 4px 0 #111111 (card), 6px 6px 0 #111111 (hover)
RADIUS: card 20–24px, button 14–18px, tag pill

MOTION: bouncy (cubic-bezier 0.34, 1.56, 0.64, 1)), 150–300ms
  Button hover: translate(-2px,-2px) + shadow tăng
  Card hover: translate(-3px,-3px) + shadow tăng
  Hero words: pop-in stagger 80ms/word
  Route line: draw animation 800ms

COMPONENTS:
  Button: cyan/red nền + border đen 3px + shadow 4px comic
  Card: vanilla nền + border đen 2–3px + shadow 4px
  Tag: sticker style, border đen, nền yellow/lime/cyan
  Map marker: pin cartoon, numbered, border đen, bounce on select
  Timeline: "itinerary ticket" cards, time chip = stamp
  Route: cyan line, white halo, black outer halo

SPLIT SCREEN: left panel (420–520px) timeline + right panel map
APP SHELL: full screen, no floating window, sidebar cố định
```

---

## 15. Changelog

| Version | Date | Changes |
|---|---|---|
| v1.0 | 2026-06-01 | Khởi tạo — Premium SaaS + warm travel |
| v2.0 | 2026-07-02 | **Full redesign** — Kinetic Typography × Retro Cartoon Travel |
