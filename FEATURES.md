# TripWise: Trợ lý Du lịch Cá nhân AI & Không gian Làm việc Du lịch

TripWise là một **Trợ lý Du lịch Cá nhân AI (Personal AI Travel Companion)** + **Không gian Làm việc Du lịch Trực tiếp (Live Travel Workspace)** + **Nhật ký Du lịch (Travel Journal)** + **Trí tuệ Ngân sách (Budget Intelligence)**.
Trong ngắn hạn, TripWise là ứng dụng hoàn toàn RIÊNG TƯ / ƯU TIÊN CÁ NHÂN (PRIVATE / PERSONAL-FIRST).
Định hướng tương lai bao gồm MẠNG XÃ HỘI DU LỊCH TÙY CHỌN (OPT-IN SOCIAL TRAVEL NETWORK).

TripWise HIỆN TẠI KHÔNG hướng tới việc trở thành sàn giao dịch đặt phòng khách sạn, nền tảng đặt vé máy bay, cổng thanh toán, hay ứng dụng chia tiền (expense splitting app).

---

## 1. Tính năng Lịch trình Thông minh (Smart Itinerary Features)

### Lập Lịch trình Thông minh (Smart Itinerary Generation)
Trạng thái: ĐÃ TRIỂN KHAI (IMPLEMENTED)
**Quy tắc cốt lõi:** AI suy luận và biên soạn. Các nhà cung cấp tin cậy xác thực dữ kiện. Các engine tất định thực thi tính khả thi. Gemini KHÔNG phải là nguồn dữ liệu gốc (source of truth) cho tọa độ, danh tính địa điểm, giờ mở cửa, thời lượng tuyến đường, thời tiết, tỷ giá hối đoái, hoặc sự tồn tại của sự kiện.

### Khám phá Ứng viên (Candidate Discovery)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Xác thực qua Google Places (Google Places Verification)
Trạng thái: ĐÃ TRIỂN KHAI (IMPLEMENTED)
Một địa điểm chỉ được sử dụng cho bản đồ thực, tuyến đường và hàng rào địa lý khi nó có nguồn gốc đã được xác thực từ nhà cung cấp.

### Trí tuệ Địa điểm Trực tiếp (Live Place Intelligence)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Giờ mở cửa, trạng thái hoạt động. *(Ảnh địa điểm cơ bản, đánh giá / siêu dữ liệu ĐÃ TRIỂN KHAI)*

### Trí tuệ Sự kiện Trực tiếp (Live Event Intelligence)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Engine Tính Khả thi / Ràng buộc (Feasibility / Constraint Engine)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Nhận thức Tuyến đường (Route-Aware Generation)
Trạng thái: ĐÃ TRIỂN KHAI (Định tuyến OSRM) / LÊN KẾ HOẠCH (Tối ưu hóa gom cụm)

### Nhận thức Thời tiết (Weather-Aware Generation)
Trạng thái: ĐÃ TRIỂN KHAI (Lấy dữ liệu cơ bản) / LÊN KẾ HOẠCH (Lập lịch nhận thức)

### Làm mới Chuyến đi Đa giai đoạn (Multi-Stage Trip Refresh)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Lịch trình Có thể Giải thích (Explainable Itinerary)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

---

## 2. Tính năng Trợ lý Chuyến đi Thông minh (Smart Trip Companion Features)

### Engine Nhắc nhở (Reminder Engine)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Bao gồm: TRIP_STARTING_SOON (Chuyến đi sắp bắt đầu), DAY_STARTING (Ngày mới bắt đầu), PLACE_UPCOMING (Địa điểm sắp tới), LEAVE_SOON (Sắp phải đi), LATE_RISK (Nguy cơ trễ).

### Hàng rào Địa lý & Đến nơi (Geofencing & Arrival)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Bao gồm: ARRIVED (Đã đến nơi).

### Engine Trạng thái Tiến độ Chuyến đi (Trip Progress State Engine)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Engine Ngữ cảnh (Context Engine)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### AI Ngữ cảnh (Contextual AI)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Rủi ro Thời tiết (Weather Risk)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Phát hiện Bỏ qua / Trì hoãn (Skip / Delay Detection)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Bao gồm: SKIPPED (Đã bỏ qua).

### Tối ưu hóa lại Động (Dynamic Replanning)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Chính sách Thông báo Thông minh (Smart Notification Policy)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Làm gì Bây giờ? (What Now?)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

### Chữa lỗi Ngày (Fix My Day)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)

---

## 3. Không gian Làm việc Du lịch Trực tiếp (Live Editable Travel Workspace)

### Lịch trình Có thể Chỉnh sửa Trực tiếp (Live Editable Itinerary)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Các hành động tương lai của người dùng: Thêm hoạt động, sửa hoạt động, đổi thời gian, di chuyển hoạt động, chuyển sang ngày khác, bỏ qua hoạt động, đánh dấu hoàn thành, thêm ghi chú, thêm chi phí. Lịch trình chuyến đi cuối cùng sẽ trở thành một không gian làm việc sống động chứ không chỉ là kết quả đầu ra chỉ đọc.

### Các loại Mục Lịch trình (Itinerary Item Types)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Hỗ trợ khái niệm cho các Loại (Kinds): ĐỊA ĐIỂM (PLACE), HOẠT ĐỘNG TÙY CHỈNH (CUSTOM_ACTIVITY), NHÀ HÀNG (RESTAURANT), DI CHUYỂN (TRANSPORT), CHỖ Ở (ACCOMMODATION), ĐẶT CHỖ (RESERVATION), GHI CHÚ (NOTE).
*CUSTOM_ACTIVITY KHÔNG được yêu cầu xác thực Google Places (ví dụ: Nghỉ ngơi, Thuê xe máy, Mua SIM, Nhận phòng).*

### Cố định / Linh hoạt (Fixed / Flexible)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Hỗ trợ CỐ ĐỊNH (FIXED) (ví dụ: Chuyến bay, Đặt phòng) và LINH HOẠT (FLEXIBLE) (ví dụ: Quán cà phê, Massage). Tính năng Chữa lỗi Ngày (Fix My Day) nên ưu tiên di chuyển các hoạt động LINH HOẠT.

### Mức độ Ưu tiên Hoạt động (Activity Priority)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Hỗ trợ PHẢI LÀM (MUST_DO), MUỐN LÀM (WANT_TO_DO), TÙY CHỌN (OPTIONAL). Tính năng tối ưu hóa lại (Replanning) phải bảo vệ các hoạt động MUST_DO.

### Chặng Di chuyển (Transport Segment)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Các phương thức: đi bộ, lái xe, xe máy, xe buýt, tàu hỏa, chuyến bay, phương tiện công cộng, phà, khác. Bao gồm điểm đi, điểm đến, nhà điều hành, giờ đi, giờ đến, liên hệ, đặt chỗ, chi phí ước tính/thực tế. Thời gian di chuyển sẽ trở thành một ràng buộc lịch trình.

### Chỗ ở (Accommodation)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Bao gồm tên Khách sạn/Homestay, giờ nhận phòng, giờ trả phòng, số đêm, địa chỉ, điện thoại, URL, mã đặt chỗ, chi phí. Có thể đóng vai trò là điểm xuất phát/kết thúc của tuyến đường.

### Liên hệ và Liên kết Nguồn (Contacts and Source Links)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Bao gồm điện thoại, địa chỉ, trang web, URL đặt chỗ. Các nguồn bên ngoài: Google Maps, Facebook, Instagram, TikTok, Website, Booking, Khác.

---

## 4. Nhập & Trích xuất (Import & Extraction)

### Hộp thư Chuyến đi / Nhập Đặt chỗ (Trip Inbox / Booking Import)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Đầu vào: PDF, Ảnh chụp màn hình, Hình ảnh, Văn bản xác nhận (Chuyến bay, Khách sạn, Tàu, v.v.).
Quy trình: Đầu vào → trích xuất → ứng viên có cấu trúc → người dùng xem xét → xác nhận → ràng buộc chuyến đi. Không tự động tin cậy (No automatic trust).

### Nhập Ý tưởng Chuyến đi (Ảnh chụp màn hình / PDF → Chuyến đi)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Quy trình: Ảnh màn hình / Hình ảnh / PDF → AI trích xuất tên ứng viên → Google Places xác thực → người dùng xác nhận → thêm vào chuyến đi / tối ưu hóa lại.

---

## 5. Trí tuệ Ngân sách & Chi phí (Budget Intelligence & Expenses)

### Theo dõi Chi phí (Expense Tracking)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Bao gồm Chi phí Ước tính (Estimated Cost), Chi phí Thực tế (Actual Cost), Chênh lệch (Difference). Nhập nhanh Chi phí (Quick Expense).
Danh mục chi phí: Đồ ăn, Di chuyển, Chỗ ở, Hoạt động, Mua sắm, Vé, Cá nhân, Đặt chỗ, Khác.
Nguồn gốc chi phí: LÊN KẾ HOẠCH (PLANNED), THỰC TẾ (ACTUAL), NGOÀI KẾ HOẠCH (UNPLANNED).

### Trí tuệ Ngân sách (Budget Intelligence)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Người dùng có TIỀN TỆ QUÊ NHÀ (HOME CURRENCY) và Điểm đến có TIỀN TỆ ĐỊA PHƯƠNG/ĐIỂM ĐẾN (LOCAL/DESTINATION CURRENCY). TripWise PHẢI BẢO TỒN giá trị gốc của tiền tệ quê nhà (ví dụ: 8.000.000 VND) và cũng hiển thị giá trị tương đương tại điểm đến được tin cậy mới nhất (ví dụ: THB). KHÔNG thay thế giá trị gốc của quê nhà.

### Hiển thị Đa Tiền tệ (Dual-Currency Display)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Trong khi đi du lịch, tiền tệ Điểm đến là chính cho việc chi tiêu/lập kế hoạch tại địa phương. Tiền tệ Quê nhà là so sánh phụ. Cả hai phải luôn khả dụng.

### Yêu cầu về Tỷ giá (FX Requirement)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Nguồn tỷ giá hối đoái phải là tỷ giá tin cậy mới nhất hiện có. KHÔNG sử dụng Gemini làm nguồn sự thật tỷ giá. Nhà cung cấp hiện CHƯA XÁC ĐỊNH (TBD). Lưu vết: tiền tệ gốc, tiền tệ đích, tỷ giá, nhà cung cấp, dấu thời gian, trạng thái làm mới. Việc lỗi hệ thống tỷ giá không được làm hỏng việc sử dụng chuyến đi.

### Phân bổ Ngân sách (Budget Breakdown)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Tổng Ngân sách, Chi phí Cố định, Chi tiêu Theo kế hoạch/Thực tế/Ngoài kế hoạch, Ngân sách Còn lại, Ngân sách Sẵn có Hàng ngày, Phân bổ theo Danh mục.

### Rủi ro Ngân sách (Budget Risk)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Sự kiện ngữ cảnh BUDGET_RISK. Gợi ý tương lai: hoạt động rẻ hơn, phương án thay thế miễn phí, đồ ăn rẻ hơn, loại bỏ hoạt động phải trả phí tùy chọn. Không bao giờ âm thầm tự động tăng ngân sách của người dùng.

---

## 6. Trải nghiệm của Tôi & Du lịch Xã hội (My Experience & Social Travel)

### Trải nghiệm của Tôi (My Experience)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
ĐỊNH HƯỚNG SẢN PHẨM HIỆN TẠI: NHẬT KÝ DU LỊCH CÁ NHÂN RIÊNG TƯ (PRIVATE PERSONAL TRAVEL JOURNAL).
Các trường: Đánh giá 1–5, Nhận xét, Sẽ ghé thăm lại, Mẹo, Ghi chú cá nhân, Ảnh (bổ sung sau), Ngày tham quan, Trải nghiệm thực tế. Mặc định hiện tại: RIÊNG TƯ (PRIVATE).

### Trải nghiệm của Tôi → Mạng xã hội Tương lai (My Experience → Future Social)
Trạng thái: TƯƠNG LAI (FUTURE)
Kiến trúc tương lai: Trải nghiệm Riêng tư của Tôi → Chủ động Xuất bản (Explicit Publish) → Trải nghiệm / Đánh giá Công khai → Cộng đồng Địa điểm → Chia sẻ Chuyến đi → Khám phá Xã hội. Không tự động xuất bản.

### Nguyên tắc Kiến trúc Dữ liệu Riêng tư vs Công khai (Private vs Public Data)
Trạng thái: TƯƠNG LAI (FUTURE)
NGUỒN RIÊNG TƯ (PRIVATE SOURCE) → hành động xuất bản chủ động → BẢN CHIẾU AN TOÀN CHO CÔNG KHAI (PUBLIC-SAFE PROJECTION).
KHÔNG xử lý dữ liệu nhật ký riêng tư như dữ liệu công khai chỉ bằng cách bật/tắt một cờ (boolean) không bị hạn chế. Các ghi chú cá nhân và chi phí phải được loại trừ/chọn lọc rõ ràng đối với các bản chiếu công khai.

### Đánh giá Công khai Tương lai (Future Public Review)
Trạng thái: TƯƠNG LAI (FUTURE)
Tác giả, địa điểm, đánh giá, nhận xét, các ảnh được chọn, ngày tham quan, thời gian xuất bản, mẹo công khai. (Siêu dữ liệu: lượt thích, bình luận, slug chia sẻ).

### Chia sẻ Chuyến đi Tương lai (Future Trip Sharing)
Trạng thái: TƯƠNG LAI (FUTURE)
Chế độ: Riêng tư, Liên kết Không công khai, Công khai. Người dùng có thể chia sẻ: Toàn bộ Chuyến đi, Các ngày đã chọn, Các trải nghiệm đã chọn, Nhật ký Du lịch, Mẫu Chuyến đi. Chuyến đi riêng tư vẫn là riêng tư theo mặc định.

### Mạng Xã hội Tương lai (Future Social Network)
Trạng thái: TƯƠNG LAI (FUTURE)
Hồ sơ công khai, theo dõi người du lịch, khám phá chuyến đi được chia sẻ, đọc đánh giá trên TripWise, thích trải nghiệm, bình luận, lưu địa điểm của người khác, sao chép lịch trình, fork chuyến đi, dùng AI để tùy chỉnh chuyến đi được chia sẻ.

### Đánh giá Trải nghiệm vs Đánh giá Google (Experience vs Google Reviews)
Trạng thái: ĐÃ TRIỂN KHAI (Lấy siêu dữ liệu từ Google)
Xếp hạng / Siêu dữ liệu Đánh giá của Google = dữ liệu do nhà cung cấp sở hữu.
Trải nghiệm của Tôi (TripWise) = nội dung cá nhân thuộc sở hữu người dùng.
Trải nghiệm Công khai (TripWise) = nội dung mạng xã hội TƯƠNG LAI của TripWise.
Không bao giờ hợp nhất/trộn lẫn các khái niệm này.

---

## 7. Trí tuệ Du lịch & Học hỏi (Travel Intelligence & Learning)

### Dữ liệu Tham quan Thực tế (Actual Visit Data)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Giờ Đến Theo kế hoạch, Giờ Đến Thực tế, Giờ Đi Thực tế, Thời lượng Thực tế.

### Học Thời lượng Cá nhân (Personal Duration Learning)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Ví dụ: Đền/Chùa: ~60 phút, Bảo tàng: ~40 phút. Chỉ sử dụng chức năng này để hỗ trợ cá nhân hóa.

### Nhật ký Chuyến đi Tự động (Automatic Trip Journal)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Nhật ký hàng ngày (Địa điểm Đã đến, Hoạt động, Khoảng cách, Đã chi tiêu, Mục Yêu thích, Mục Đã bỏ qua).
Tóm tắt chuyến đi (Thời lượng, Tổng Chi tiêu, Trải nghiệm Hàng đầu, Địa điểm Đã lưu).

### Tóm tắt Chi tiêu Hàng ngày / Chuyến đi (Daily / Trip Spending Summary)
Trạng thái: NỀN TẢNG ĐÃ TRIỂN KHAI (Domain) / LÊN KẾ HOẠCH (Runtime)
Ngân sách Hôm nay vs Đã lên kế hoạch/Thực tế/Ngoài kế hoạch/Còn lại. Ngân sách Gốc Quê nhà vs Tương đương Điểm đến vs Chi tiêu Thực tế.

### Danh sách Đóng gói Thông minh (Smart Packing List)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Đầu vào: điểm đến, ngày, thời tiết, hoạt động, thời lượng, loại chuyến đi.

### Gói Du lịch Ngoại tuyến (Offline Travel Pack)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Lịch trình đã tải xuống, thông tin địa điểm đã xác thực, địa chỉ, tọa độ, ghi chú, đặt chỗ, hình ảnh thiết yếu, chi phí, nhật ký riêng tư, nhắc nhở cục bộ đã lên lịch.
Giới hạn chỉ khi có mạng (online-only): AI, thời tiết trực tiếp, sự kiện trực tiếp, tỷ giá mới nhất, tuyến đường mới.

### Học Sở thích (Preference Learning)
Trạng thái: LÊN KẾ HOẠCH (PLANNED)
Tín hiệu: Các địa điểm đã lưu, các địa điểm đã bỏ qua, các gợi ý được chấp nhận/từ chối, đánh giá, có muốn quay lại không, danh mục, nhịp độ, thói quen chi tiêu, thời lượng tham quan thực tế. Ưu tiên quyền riêng tư và có thể giải thích được.

---

## Cấu trúc Trí tuệ Sản phẩm (Product Intelligence Stack)

```text
Sở thích người dùng
       +
Yêu cầu chuyến đi
       +
Các Đặt chỗ Đã nhập
       ↓
Khám phá Ứng viên
       ↓
Xác thực qua Google Places
       +
Sự kiện Trực tiếp
       +
Siêu dữ liệu Địa điểm
       +
Thời tiết
       +
Tuyến đường
       +
Tỷ giá (FX) hiện tại
       ↓
Engine Ràng buộc
       ↓
Engine Xếp hạng
       ↓
Engine Ngân sách
       ↓
Bộ Tối ưu hóa Lịch trình Gemini
       ↓
Lịch trình Đã Xác thực
       ↓
Không gian Làm việc Du lịch Trực tiếp
       ↓
Gói Du lịch Ngoại tuyến
       ↓
Engine Nhắc nhở
       ↓
Thời gian + Hàng rào địa lý
       ↓
Engine Ngữ cảnh
       ↓
Vị trí + Thời tiết + Lịch trình + Tuyến đường + Ngân sách
       ↓
Làm gì Bây giờ? (What Now?)
Chữa lỗi Ngày (Fix My Day)
AI Ngữ cảnh (Contextual AI)
       ↓
Lời khuyên / Tối ưu hóa lại
       ↓
Nhật ký Chuyến đi / Trải nghiệm của Tôi
       ↓
Xuất bản Xã hội Tùy chọn trong Tương lai
```
