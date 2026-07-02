# Landing Page Spec (TripWise)

Landing Page cần truyền tải cảm giác “travel-tech + AI assistant” và dẫn người dùng vào flow tạo trip nhanh.  
Tone: hiện đại, sạch, ấm áp (beige/cam pastel), CTA xanh dương.

---

## Header / Top nav

### Nội dung

- Logo “TripWise”
- Links: `Features`, `How it works`, `Destinations`, `Pricing` (optional)
- Actions:
  - `Sign in` (secondary)
  - `Get started` (primary)

### Behavior

- Sticky nhẹ khi scroll (shadow `shadow.sm`).
- Trên mobile: hamburger + CTA “Get started”.

---

## Hero section

### Mục tiêu

- User hiểu ngay: “Nhập nhu cầu → TripWise tạo itinerary + route + map”.
- Thể hiện split-screen “Trek-like” ngay ở hero (mock preview).

### Layout

2 cột (desktop):

- Trái: headline + subheadline + prompt box + CTA.
- Phải: **hero preview** mô phỏng app shell split-screen (không cần functional), có:
  - panel trái: timeline ngắn (3–4 item)
  - panel phải: map preview + route line

### Copy gợi ý

- Headline: “Lập lịch du lịch bằng AI, nhìn route trực quan trên bản đồ.”
- Sub: “Nhập điểm đến, thời gian, ngân sách, sở thích. TripWise tạo lịch trình theo ngày, gợi ý địa điểm thật, kèm tuyến đường di chuyển.”

### CTA

- Primary: `Tạo lịch trình ngay`
- Secondary: `Xem demo itinerary`

---

## Trip search prompt (hero input)

### Input modes

1. **Prompt tự nhiên** (textarea 2–4 dòng)
2. **Quick fields** (optional): destination + date range + budget

Khuyến nghị MVP: cho phép cả 2 nhưng ưu tiên prompt tự nhiên.

### Thành phần UI

- Textarea “Bạn muốn đi đâu?” (placeholder có ví dụ).
- Chip examples (click để fill):
  - “Nha Trang 3 ngày 2 đêm, thích biển, hải sản, tiết kiệm”
  - “Đà Lạt 2 ngày, thích cafe, chụp ảnh, đi nhẹ nhàng”
- CTA button `Tạo lịch trình`
- Hint nhỏ:
  - “TripWise dùng dữ liệu địa điểm thật”
  - “AI tạo trong khoảng 10–20 giây”

### Validation

- Required: destination hoặc prompt phải đủ thông tin.
- Nếu thiếu: gợi ý “Bạn muốn đi mấy ngày?” (inline).

---

## Feature cards

### Mục tiêu

Chốt 4–6 giá trị rõ ràng, mỗi card 1 thông điệp.

### Cards đề xuất

1. **Itinerary theo ngày**: timeline rõ ràng, dễ chỉnh.
2. **Bản đồ + route**: xem marker + polyline theo ngày.
3. **Weather-aware**: gợi ý theo thời tiết (nếu có).
4. **Budget-friendly**: ước tính chi phí và cảnh báo over budget.
5. **Save & reuse**: lưu trip và tái dùng.

### Visual style

- Card nền trắng, radius 16, shadow md.
- Icon duotone 24.
- Có accent line nhỏ màu `brand.primary`.

---

## How it works

### Bố cục

Section 3–4 bước, có minh họa nhỏ (mini mock).

### Steps đề xuất

1. Nhập nhu cầu (prompt hoặc form).
2. AI phân tích sở thích và ràng buộc.
3. Hệ thống chọn địa điểm thật + sắp lịch theo ngày.
4. Tính route và hiển thị trên bản đồ.

### Nội dung cần có

- Nhấn mạnh “AI không bịa địa điểm”.
- Nhấn mạnh “route là route thật (OSRM)”.

---

## Popular destinations

### Mục tiêu

Giúp user bắt đầu nhanh + tạo cảm giác “đã có dữ liệu”.

### UI

- Horizontal scroll cards (mobile) / grid (desktop)
- Card gồm:
  - ảnh (placeholder)
  - tên thành phố
  - 2–3 tag (beach / food / chill)
  - CTA nhỏ: `Tạo trip`

### Dữ liệu

MVP có thể hardcode 6–8 điểm:

- Nha Trang (demo)
- Đà Lạt
- Đà Nẵng
- Hội An
- Phú Quốc
- Hà Nội / TP.HCM (city break)

---

## AI travel planning showcase

### Mục tiêu

Thể hiện “AI assistant” theo cách cụ thể, tránh hype.

### UI gợi ý

- Split mini: trái là prompt + “AI reasoning” (ngắn), phải là timeline preview.
- Có các “reason chips”:
  - “Tối ưu di chuyển”
  - “Phù hợp budget”
  - “Tránh mưa (nếu có)”

---

## CTA section (bottom)

- Headline ngắn: “Sẵn sàng cho chuyến đi tiếp theo?”
- CTA primary: `Bắt đầu lập kế hoạch`
- Secondary: `Đăng nhập`
- Trust note: “Không cần thẻ / lưu trip miễn phí” (tuỳ product).

---

## Footer

- Links: Terms, Privacy, Contact, Docs (optional)
- Social (optional)

---

## Responsive behavior

### Mobile

- Hero preview thu gọn: chỉ hiển thị map preview hoặc 1 card snapshot.
- Prompt input full width, CTA sticky ở cuối hero.
- Popular destinations dạng carousel.

### Tablet

- Giữ 2 cột nhưng hero preview giảm độ chi tiết.

### Desktop

- Full split hero preview (tạo cảm giác “Trek dashboard” ngay từ đầu).

