# User Journey - AI Smart Travel Planner

## 1. Tổng quan journey

Journey chính của người dùng trong MVP:

1. Trước chuyến đi.
2. Nhập nhu cầu.
3. Xem lịch trình.
4. Xem bản đồ/route.
5. Lưu lịch trình.
6. Mở lại lịch trình.

MVP ưu tiên trải nghiệm web. Flutter app được định hướng cho trải nghiệm mở lại lịch trình và sử dụng khi đang di chuyển trong các giai đoạn sau.

---

## 2. Giai đoạn 1: Trước chuyến đi

## 2.1 Mục tiêu người dùng

- Tìm ý tưởng du lịch.
- Xác định đi đâu, đi mấy ngày, đi với ai.
- Ước lượng ngân sách.
- Tìm lịch trình phù hợp.

## 2.2 Hành động

- Tìm kiếm trên Google/TikTok/Facebook.
- Hỏi bạn bè.
- Xem review địa điểm.
- Mở bản đồ để kiểm tra vị trí.
- Ghi chú các địa điểm quan tâm.

## 2.3 Pain points

- Quá nhiều nguồn thông tin.
- Không biết nguồn nào đáng tin.
- Địa điểm nổi tiếng nhưng chưa chắc phù hợp.
- Không biết đi điểm nào trước.
- Không biết thời tiết ảnh hưởng thế nào.
- Không biết tổng thời gian di chuyển.

## 2.4 Improvement opportunities

- Cung cấp prompt examples theo từng nhu cầu:
  - Đi tiết kiệm.
  - Đi cặp đôi.
  - Đi gia đình.
  - Đi lịch nhẹ.
- Cho người dùng tạo lịch trình từ một câu tiếng Việt.
- Hiển thị rõ sản phẩm dùng dữ liệu địa điểm thật, không để AI bịa.
- Cho xem sample itinerary Nha Trang để tăng niềm tin.

---

## 3. Giai đoạn 2: Nhập nhu cầu

## 3.1 Mục tiêu người dùng

- Mô tả chuyến đi nhanh.
- Không phải điền quá nhiều trường.
- Nhận kết quả phù hợp với mong muốn.

## 3.2 Hành động

Người dùng nhập:

- Prompt tiếng Việt.
- Ngày bắt đầu.
- Nơi xuất phát nếu cần.
- Có thể chọn thêm budget hoặc style nếu hệ thống cần làm rõ.

Ví dụ:

> "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí."

## 3.3 Hệ thống xử lý

- Gemini parse prompt thành JSON có cấu trúc.
- Validate output của Gemini.
- Nếu thiếu thông tin quan trọng, hệ thống hỏi lại hoặc dùng default an toàn.
- Không để Gemini tự tạo địa điểm.
- Backend dùng dữ liệu PostgreSQL + PostGIS cho bước gợi ý.

## 3.4 Pain points

- Người dùng nhập thiếu thông tin.
- Prompt có thể mơ hồ.
- Người dùng không biết nên viết như thế nào.
- Gemini có thể parse sai nếu prompt quá dài hoặc nhiều ý.

## 3.5 Improvement opportunities

- Gợi ý prompt mẫu.
- Hiển thị phần "Hệ thống đã hiểu" trước khi tạo lịch trình:
  - Điểm đến.
  - Số ngày.
  - Ngân sách.
  - Sở thích.
  - Phong cách.
- Cho phép chỉnh nhanh parsed result nếu sai.
- Giới hạn prompt length để tránh lỗi và cost cao.

---

## 4. Giai đoạn 3: Xem lịch trình

## 4.1 Mục tiêu người dùng

- Hiểu nhanh chuyến đi được đề xuất.
- Biết mỗi ngày đi đâu, vào thời điểm nào.
- Biết vì sao hệ thống gợi ý các điểm đó.
- Biết lịch trình có phù hợp ngân sách/thời tiết không.

## 4.2 Hành động

Người dùng xem:

- Lịch trình theo ngày.
- Timeline sáng/trưa/chiều/tối.
- Tên địa điểm.
- Lý do gợi ý.
- Chi phí dự kiến.
- Thời gian tham quan.
- Cảnh báo thời tiết nếu có.
- Tổng quan ngân sách nếu MVP hỗ trợ.

## 4.3 Hệ thống xử lý

- Lọc địa điểm theo thành phố.
- Chấm điểm địa điểm theo sở thích, ngân sách, tag, thời gian, indoor/outdoor.
- Chia địa điểm theo ngày.
- Ưu tiên 3-5 điểm mỗi ngày.
- Nếu mưa, ưu tiên điểm trong nhà.
- Gemini chỉ viết mô tả từ dữ liệu đã chọn, không tự thêm địa điểm ngoài DB.

## 4.4 Pain points

- Kết quả có thể quá dài.
- Người dùng khó biết điểm nào quan trọng nhất.
- Nếu dữ liệu địa điểm ít, lịch trình có thể chưa phong phú.
- Nếu Weather API lỗi, người dùng có thể thiếu thông tin.

## 4.5 Improvement opportunities

- Hiển thị lịch trình theo card từng ngày.
- Có badge:
  - Miễn phí.
  - Gần trung tâm.
  - Phù hợp check-in.
  - Nên đi buổi sáng.
  - Trong nhà.
- Có reason ngắn gọn cho từng điểm.
- Có thông báo rõ nếu weather unavailable.
- Có CTA xem bản đồ ngay.

---

## 5. Giai đoạn 4: Xem bản đồ/route

## 5.1 Mục tiêu người dùng

- Biết các điểm nằm ở đâu.
- Hiểu thứ tự di chuyển.
- Biết route có hợp lý không.
- Biết khoảng cách và thời gian di chuyển.

## 5.2 Hành động

Người dùng xem:

- OpenStreetMap.
- Marker từng địa điểm.
- Popup chi tiết.
- Polyline route từ OSRM.
- Distance/duration từng chặng.
- Tổng thời gian di chuyển trong ngày.

## 5.3 Hệ thống xử lý

- Gọi OSRM để lấy route, distance, duration, geometry.
- Cache route theo cặp điểm/profile.
- Không gọi OSRM liên tục khi người dùng kéo bản đồ.
- Nếu OSRM lỗi, vẫn hiển thị marker và thông báo chưa tính được route.

## 5.4 Pain points

- Route có thể chưa tối ưu tuyệt đối.
- OSRM public server có thể bị giới hạn.
- Người dùng có thể không hiểu vì sao route được sắp như vậy.
- Trên mobile, bản đồ cần tối ưu hiển thị.

## 5.5 Improvement opportunities

- Hiển thị "Tổng di chuyển hôm nay".
- Cho focus map khi click vào item trong itinerary.
- Dùng màu/đánh số marker theo thứ tự.
- Có fallback line đơn giản nếu OSRM lỗi.
- Future: cho kéo thả đổi thứ tự điểm và tính lại route.

---

## 6. Giai đoạn 5: Lưu lịch trình

## 6.1 Mục tiêu người dùng

- Lưu lại lịch trình để xem sau.
- Không mất kết quả sau khi đóng trình duyệt.
- Có thể mở lại trước hoặc trong chuyến đi.

## 6.2 Hành động

- Bấm "Lưu lịch trình".
- Nếu chưa đăng nhập, hệ thống mời đăng ký/đăng nhập.
- Sau khi lưu, người dùng có thể xem trong danh sách lịch trình.

## 6.3 Hệ thống xử lý

- Lưu trip.
- Lưu itinerary days.
- Lưu itinerary items.
- Lưu route geometry nếu cần.
- Lưu weather snapshot nếu cần.
- Gắn itinerary với user.
- Bảo vệ dữ liệu bằng auth.

## 6.4 Pain points

- Nếu bắt đăng ký quá sớm, user có thể bỏ.
- Nếu lưu thất bại, user có thể mất niềm tin.
- Nếu không có autosave/draft, kết quả có thể mất.

## 6.5 Improvement opportunities

- Cho guest tạo trước, chỉ yêu cầu đăng nhập khi lưu.
- Sau khi đăng nhập, tiếp tục flow lưu hiện tại.
- Hiển thị trạng thái "Đã lưu".
- Future: autosave draft cho registered user.

---

## 7. Giai đoạn 6: Mở lại lịch trình

## 7.1 Mục tiêu người dùng

- Xem lại lịch trình đã lưu.
- Mở nhanh khi đang đi.
- Xem lại map/route/thời tiết.

## 7.2 Hành động

- Vào trang Saved Trips.
- Chọn lịch trình.
- Xem chi tiết từng ngày.
- Mở bản đồ.
- Xóa lịch trình nếu không cần.

## 7.3 Hệ thống xử lý

- Lấy danh sách itinerary của user.
- Chỉ trả dữ liệu thuộc user hiện tại.
- Không expose dữ liệu user khác.
- Có pagination nếu danh sách dài.
- Dữ liệu route/weather đã lưu hoặc cache giúp tải nhanh hơn.

## 7.4 Pain points

- Nếu danh sách nhiều, khó tìm.
- Nếu mobile UX kém, khó dùng khi đang di chuyển.
- Nếu route/weather đã cũ, cần phân biệt dữ liệu snapshot và dữ liệu mới.

## 7.5 Improvement opportunities

- Hiển thị card trip theo destination/start date.
- Có search/filter trong future.
- Flutter app ưu tiên mở nhanh lịch trình đã lưu.
- Future: offline snapshot cơ bản cho mobile.