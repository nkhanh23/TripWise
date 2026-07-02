# AI Trip Planner Spec

Màn hình AI Trip Planner là nơi user nhập thông tin chuyến đi (prompt hoặc form) để AI tạo itinerary.  
Mục tiêu: **tạo được trip chất lượng cao với ít thao tác**, nhưng vẫn cho phép user chỉnh các ràng buộc quan trọng.

---

## Layout (Web)

Khuyến nghị bố cục 2 cột (nhưng không nhất thiết split-map ở màn này):

- Trái: Form nhập thông tin
- Phải: AI suggestion + preview itinerary

Trên mobile: form dạng step/section + preview ở dưới hoặc bottom sheet.

---

## Form nhập thông tin chuyến đi

### 1) Destination

- UI: search input (autocomplete) + optional “near me” (future)
- Dữ liệu: `destinationName`, `destinationId` (nếu có), `lat/lng` (optional)
- Validation:
  - required
  - nếu destination không có dữ liệu trong hệ thống: hiển thị warning “Hiện chưa có đủ dữ liệu địa điểm, bạn vẫn có thể thử nhưng kết quả có thể hạn chế.”

### 2) Date range

- UI: date range picker
- Dữ liệu: `startDate`, `endDate` hoặc `days/nights`
- Validation:
  - required
  - giới hạn MVP: 1–3 ngày (theo scope)
  - nếu vượt: show message “MVP hỗ trợ tối đa 3 ngày.”

### 3) Budget

- UI: segmented control (Thấp / Trung bình / Cao) + optional numeric range (future)
- Dữ liệu: `budgetLevel`
- Mapping gợi ý:
  - Low: tiết kiệm
  - Medium: tiêu chuẩn
  - High: thoải mái

### 4) Travel style

- UI: chips/multi-select
- Dữ liệu: `travelStyle`
- Options gợi ý:
  - Chill/Relax
  - Foodie
  - Check-in
  - Nature
  - Culture
  - Adventure (nhẹ)

### 5) Number of travelers

- UI: stepper (1–10)
- Dữ liệu: `travelerCount`
- Validation: min 1

### 6) Transportation

- UI: select hoặc chips (Walking / Motorbike / Car / Bicycle)
- Dữ liệu: `transportationProfile`
- Note:
  - Profile ảnh hưởng OSRM routing và thời gian di chuyển.
  - Nếu user chọn “Walking” nhưng itinerary quá xa: warning “Có thể đi bộ sẽ mất nhiều thời gian.”

### 7) Food preference

- UI: chips/multi-select + “All”
- Dữ liệu: `foodPreference`
- Options gợi ý:
  - Hải sản
  - Ăn vặt/đường phố
  - Quán cafe
  - Chay
  - Ít cay / Không hải sản (allergy) (future)

### Prompt tự nhiên (tuỳ chọn nhưng khuyến nghị)

- UI: textarea “Mô tả chuyến đi bằng lời của bạn”
- Hành vi:
  - Nếu user nhập prompt: hệ thống parse ra field và show “AI đã hiểu…” (read-only summary).
  - User có thể override bằng form.

---

## Khu vực AI suggestion

### Mục tiêu

AI suggestion phải:

- Cụ thể, có thể hành động (“Áp dụng”) hoặc bỏ qua.
- Không bịa dữ liệu địa điểm. Chỉ là gợi ý về ràng buộc và cấu trúc itinerary.

### UI

- Card “Gợi ý của TripWise AI”
- Mỗi suggestion item gồm:
  - icon + title ngắn
  - 1–2 câu giải thích
  - CTA: `Áp dụng` / `Bỏ qua`

### Ví dụ suggestion

- “Ưu tiên điểm ngoài trời buổi sáng” (nếu thời tiết tốt)
- “Giảm mật độ xuống 3 điểm/ngày để thoải mái” (nếu travel style chill)
- “Thêm 1 block ‘ăn hải sản’ buổi tối” (nếu foodie)

---

## Preview itinerary

### Mục tiêu

Preview phải đủ để user quyết định “Generate” nhưng không thay thế Trip Detail screen.

### UI

- Tabs theo ngày (Day 1/2/3)
- Mỗi ngày hiển thị 3–5 item dạng compact:
  - time slot (Sáng/Trưa/Chiều/Tối hoặc giờ)
  - place name
  - meta (duration/cost) (optional)

### Dữ liệu

- `itineraryPreview.days[]`
  - `title`
  - `items[]` (name, category, timeSlot, costEstimate)

---

## Generate / Regenerate

### Nút hành động

- Primary button: `Tạo lịch trình`
- Sau khi đã có kết quả: `Tạo lại` (regenerate) + `Lưu` (save)

### Confirmation (khi regenerate)

- Modal nhẹ: “Tạo lại sẽ thay đổi lịch trình hiện tại. Bạn có muốn tiếp tục?”
- Option: “Lưu bản hiện tại thành bản sao” (future)

---

## Loading state khi AI đang tạo

### Trạng thái cần có

1. `Parsing`: đang phân tích yêu cầu
2. `Selecting places`: đang chọn địa điểm phù hợp
3. `Routing`: đang tính tuyến đường
4. `Composing`: đang tạo mô tả itinerary

### UI

- Progress indicator (stepper hoặc progress bar)
- Skeleton cho preview itinerary
- Hint: “Bạn có thể chỉnh thông tin trong khi AI đang xử lý” (tuỳ flow)

---

## Error states

### Case: AI timeout / rate limit

- Message rõ: “Tạm thời không thể tạo lịch trình, vui lòng thử lại sau.”
- CTA: `Thử lại`

### Case: thiếu dữ liệu địa điểm

- Message: “Chưa đủ địa điểm phù hợp với sở thích/budget của bạn.”
- CTA:
  - `Giảm số ngày`
  - `Bỏ bớt filter`
  - `Chọn travel style khác`

