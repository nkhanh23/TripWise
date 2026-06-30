# User Personas - AI Smart Travel Planner

## 1. Persona 1: Sinh viên / nhóm bạn đi tiết kiệm

## 1.1 Thông tin chung

- Tên đại diện: Minh
- Tuổi: 20-24
- Nhóm: Sinh viên hoặc nhóm bạn trẻ
- Thiết bị chính: Điện thoại và laptop
- Ngân sách: Thấp
- Kiểu du lịch: Tự túc, tiết kiệm, thích check-in
- Thành phố MVP quan tâm: Nha Trang

## 1.2 Mục tiêu

- Có lịch trình 2-3 ngày tiết kiệm.
- Ưu tiên điểm miễn phí hoặc chi phí thấp.
- Muốn nhiều địa điểm chụp ảnh đẹp.
- Muốn biết nên đi điểm nào gần nhau để tiết kiệm tiền di chuyển.
- Muốn tránh lịch trình quá dày gây mệt.

## 1.3 Hành vi hiện tại

- Tìm review trên TikTok, Facebook, Google.
- Lưu địa điểm rải rác trong note hoặc chat nhóm.
- Mở Google Maps để xem từng điểm.
- Thường không tính kỹ thời gian di chuyển.
- Dễ bị hấp dẫn bởi địa điểm nổi tiếng nhưng không biết có phù hợp ngân sách không.

## 1.4 Pain points

- Có quá nhiều thông tin, khó chọn.
- Không biết điểm nào miễn phí hoặc rẻ.
- Không biết sắp xếp thứ tự đi sao cho hợp lý.
- Lịch trình nhóm dễ bị tranh luận nhiều.
- Nếu mưa, không biết đổi sang điểm nào.

## 1.5 Cách sản phẩm hỗ trợ

- Cho nhập prompt: "Đi Nha Trang 3 ngày 2 đêm, nhóm bạn, tiết kiệm, thích biển và check-in".
- Gemini parse nhu cầu thành budget low, interests beach/check-in/food.
- Place scoring ưu tiên điểm miễn phí, gần trung tâm, có tag check-in.
- OSRM tính route để gom điểm gần nhau.
- Weather API cảnh báo mưa và ưu tiên điểm trong nhà.
- Cho lưu lịch trình để chia sẻ hoặc mở lại.

## 1.6 Tiêu chí thành công

- Tạo được lịch trình trong dưới vài phút.
- Có ít nhất 70% địa điểm phù hợp ngân sách.
- Lịch trình không quá 3-5 điểm/ngày.
- Hiển thị rõ thời gian di chuyển.
- Có thể lưu lại lịch trình.

---

## 2. Persona 2: Cặp đôi

## 2.1 Thông tin chung

- Tên đại diện: An và Linh
- Tuổi: 24-30
- Nhóm: Cặp đôi đi du lịch ngắn ngày
- Thiết bị chính: Điện thoại, laptop
- Ngân sách: Trung bình
- Kiểu du lịch: Thư giãn, chụp ảnh, ăn uống, trải nghiệm đẹp

## 2.2 Mục tiêu

- Có lịch trình đẹp, không quá vội.
- Ưu tiên điểm lãng mạn, view biển, cà phê đẹp.
- Muốn có thời gian nghỉ ngơi.
- Muốn biết điểm nào nên đi buổi sáng/chiều/tối.
- Muốn có khách sạn/khu vực lưu trú phù hợp.

## 2.3 Hành vi hiện tại

- Xem review khách sạn, quán ăn, quán cà phê.
- Tìm điểm check-in đẹp trên mạng xã hội.
- Tự ghép lịch trình bằng Google Maps.
- Thường ưu tiên trải nghiệm hơn số lượng địa điểm.

## 2.4 Pain points

- Lịch trình từ internet thường chung chung.
- Không biết địa điểm nào gần khách sạn/khu trung tâm.
- Sợ lịch trình quá dày làm chuyến đi mất vui.
- Khó điều chỉnh khi thời tiết xấu.
- Khó cân bằng giữa ăn uống, nghỉ ngơi và tham quan.

## 2.5 Cách sản phẩm hỗ trợ

- Prompt mẫu: "Đi Nha Trang 2 ngày 1 đêm cho cặp đôi, thích biển, cà phê đẹp, ăn hải sản, lịch nhẹ".
- Scoring ưu tiên view đẹp, check-in, ăn uống, lịch trình nhẹ.
- Itinerary builder phân bổ sáng/chiều/tối hợp lý.
- OSRM giúp giảm thời gian di chuyển không cần thiết.
- Weather API đề xuất đổi sang quán cà phê/điểm trong nhà nếu mưa.
- Lưu lịch trình để mở lại khi đi.

## 2.6 Tiêu chí thành công

- Lịch trình có nhịp độ thoải mái.
- Có lý do gợi ý rõ ràng cho từng điểm.
- Có bản đồ và route dễ hiểu.
- Có thể xem trên mobile khi đang đi.
- Người dùng cảm thấy lịch trình "hợp gu".

---

## 3. Persona 3: Gia đình

## 3.1 Thông tin chung

- Tên đại diện: Chị Hạnh
- Tuổi: 32-45
- Nhóm: Gia đình có trẻ em hoặc người lớn tuổi
- Thiết bị chính: Điện thoại, laptop
- Ngân sách: Trung bình đến cao
- Kiểu du lịch: An toàn, tiện lợi, ít di chuyển quá xa

## 3.2 Mục tiêu

- Có lịch trình an toàn, dễ đi.
- Không di chuyển quá nhiều trong ngày.
- Có điểm ăn uống/nghỉ ngơi hợp lý.
- Ưu tiên địa điểm phù hợp trẻ em/người lớn tuổi.
- Tránh lịch trình quá khuya hoặc quá vội.
- Có thông tin thời tiết để chuẩn bị.

## 3.3 Hành vi hiện tại

- Thường hỏi bạn bè/người quen.
- Tìm review gia đình trên mạng.
- Ưu tiên điểm nổi tiếng và tiện di chuyển.
- Cần chắc chắn hơn trước khi chọn địa điểm.

## 3.4 Pain points

- Khó tìm lịch trình phù hợp cho nhiều độ tuổi.
- Trẻ em/người lớn tuổi dễ mệt nếu đi quá nhiều.
- Thời tiết xấu ảnh hưởng mạnh đến trải nghiệm.
- Không muốn thử các địa điểm quá rủi ro hoặc thiếu thông tin.
- Cần thông tin rõ, không mơ hồ.

## 3.5 Cách sản phẩm hỗ trợ

- Cho nhập prompt: "Gia đình đi Nha Trang 3 ngày, có trẻ em, muốn lịch nhẹ, ăn uống tiện, ít di chuyển xa".
- Scoring ưu tiên điểm dễ đi, gần nhau, chi phí phù hợp.
- Giới hạn số điểm mỗi ngày.
- Weather API cảnh báo mưa/nắng gắt.
- Route OSRM giúp tránh lịch trình vòng vèo.
- Lưu lịch trình để cả nhà xem lại.

## 3.6 Tiêu chí thành công

- Lịch trình rõ ràng, ít rủi ro.
- Không quá nhiều điểm trong một ngày.
- Có thông tin route và thời gian di chuyển.
- Có fallback khi thời tiết xấu.
- Người dùng tin tưởng dữ liệu địa điểm.

---

## 4. Persona 4: Người bận rộn muốn lịch trình nhanh

## 4.1 Thông tin chung

- Tên đại diện: Quân
- Tuổi: 25-38
- Nhóm: Nhân viên văn phòng, freelancer, người đi công tác kết hợp du lịch
- Thiết bị chính: Laptop, điện thoại
- Ngân sách: Trung bình
- Kiểu du lịch: Nhanh, tiện, ít thao tác

## 4.2 Mục tiêu

- Có lịch trình nhanh trong vài phút.
- Không muốn tự tìm quá nhiều.
- Muốn kết quả đủ tốt để dùng ngay.
- Muốn có bản đồ và route rõ ràng.
- Muốn lưu lại để mở khi cần.

## 4.3 Hành vi hiện tại

- Tìm "Nha Trang 2 ngày 1 đêm nên đi đâu".
- Copy lịch trình mẫu từ blog.
- Dùng Google Maps để kiểm tra khoảng cách.
- Ít có thời gian chỉnh sửa chi tiết.

## 4.4 Pain points

- Không có thời gian nghiên cứu.
- Lịch trình trên blog có thể cũ.
- Không biết lịch trình có hợp thời tiết không.
- Muốn kết quả nhanh nhưng vẫn đáng tin.
- Không muốn nhập quá nhiều form.

## 4.5 Cách sản phẩm hỗ trợ

- Prompt ngắn: "Lập lịch trình Nha Trang 2 ngày, lịch nhẹ, ăn ngon, ít phải suy nghĩ".
- Gemini parse request nhanh.
- Backend lấy place thật và tạo itinerary.
- OSRM tính route.
- Weather cache giảm thời gian chờ.
- UI ưu tiên kết quả rõ ràng, có nút lưu.

## 4.6 Tiêu chí thành công

- Hoàn thành flow tạo lịch trình nhanh.
- Ít bước nhập liệu.
- Kết quả dễ đọc.
- Bản đồ giúp hiểu ngay vị trí.
- Có thể lưu và mở lại.