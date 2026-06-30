# Problem Statement - AI Smart Travel Planner

## 1. Bối cảnh vấn đề

Du lịch tự túc ngày càng phổ biến, nhưng việc lập kế hoạch vẫn gây nhiều khó khăn. Người dùng thường phải tự tìm kiếm địa điểm, so sánh review, kiểm tra bản đồ, tính thời gian di chuyển, xem thời tiết và tự ghép thành lịch trình.

Với người dùng phổ thông, đặc biệt là sinh viên, nhóm bạn, cặp đôi, gia đình hoặc người bận rộn, quá trình này mất nhiều thời gian và dễ tạo ra lịch trình không khả thi.

AI Smart Travel Planner giải quyết vấn đề bằng cách tạo lịch trình cá nhân hóa dựa trên yêu cầu tiếng Việt, dữ liệu địa điểm thật, route thực tế và điều kiện thời tiết.

---

## 2. Vấn đề người dùng gặp khi lập kế hoạch du lịch

### 2.1 Tốn quá nhiều thời gian tìm kiếm

Người dùng phải tìm:

- Địa điểm nổi bật.
- Quán ăn.
- Quán cà phê.
- Điểm check-in.
- Khách sạn hoặc khu vực nên ở.
- Phương tiện di chuyển.
- Tuyến đường giữa các điểm.
- Thời tiết theo ngày.

Mỗi nguồn cung cấp một phần thông tin, khiến người dùng phải tự tổng hợp.

### 2.2 Lịch trình dễ bị quá tải

Người dùng thường chọn quá nhiều địa điểm trong một ngày mà không biết:

- Khoảng cách giữa các điểm.
- Thời gian di chuyển thực tế.
- Thời gian tham quan hợp lý.
- Nên đi điểm nào trước.
- Điểm nào nên đi sáng, chiều hoặc tối.

Kết quả là lịch trình có thể đẹp trên giấy nhưng khó thực hiện.

### 2.3 Không biết địa điểm nào thật sự phù hợp

Một địa điểm nổi tiếng chưa chắc phù hợp với mọi người. Người dùng cần lịch trình theo:

- Ngân sách.
- Sở thích.
- Phong cách du lịch.
- Thời lượng chuyến đi.
- Thời tiết.
- Nhóm đi cùng.

Ví dụ:

- Sinh viên cần điểm tiết kiệm.
- Cặp đôi cần điểm lãng mạn, check-in đẹp.
- Gia đình cần điểm an toàn, dễ di chuyển.
- Người bận rộn cần lịch trình nhanh, ít thao tác.

### 2.4 Dễ bị ảnh hưởng bởi thông tin thiếu chính xác

Nếu chỉ dùng AI tạo text, hệ thống có thể bịa địa điểm hoặc gợi ý địa điểm không có tọa độ chính xác. Nếu chỉ dùng tìm kiếm thủ công, người dùng có thể gặp thông tin cũ, thiếu kiểm chứng hoặc không phù hợp.

Sản phẩm cần dựa trên dữ liệu thật đã chuẩn hóa trong PostgreSQL + PostGIS.

### 2.5 Thời tiết làm thay đổi kế hoạch

Du lịch phụ thuộc nhiều vào thời tiết. Nếu trời mưa, các điểm ngoài trời như biển, đảo, quảng trường, điểm ngắm cảnh có thể không phù hợp.

Người dùng cần hệ thống:

- Cảnh báo thời tiết xấu.
- Ưu tiên địa điểm trong nhà khi mưa.
- Vẫn tạo được lịch trình nếu Weather API lỗi.
- Không làm hỏng toàn bộ trải nghiệm vì một API ngoài bị lỗi.

### 2.6 Chi phí API và dữ liệu ngoài cần kiểm soát

Sản phẩm thật không thể gọi Gemini, OSRM, Weather hoặc Google Places không giới hạn.

Cần có:

- Cache route.
- Cache weather.
- Rate limit endpoint tốn cost.
- Timeout khi gọi API ngoài.
- Fallback khi API lỗi.
- Đồng bộ dữ liệu thật về database để giảm phụ thuộc nguồn ngoài.

---

## 3. Pain points chính

| Pain point | Mô tả | Hậu quả |
|---|---|---|
| Tốn thời gian | Người dùng phải tự tìm kiếm nhiều nguồn | Dễ bỏ cuộc hoặc chọn lịch trình sơ sài |
| Lịch trình không thực tế | Không tính khoảng cách và thời gian di chuyển | Mệt mỏi, trễ lịch, bỏ bớt điểm |
| Không cá nhân hóa | Gợi ý chung chung, không theo ngân sách/sở thích | Người dùng không thấy phù hợp |
| AI có thể bịa | Chatbot thuần text có thể tạo địa điểm sai | Mất niềm tin |
| Thời tiết thay đổi | Mưa/nắng ảnh hưởng lịch trình | Trải nghiệm chuyến đi kém |
| Khó lưu và xem lại | Lịch trình nằm rải rác trong note/chat | Dễ mất thông tin |
| Khó dùng trên di động | Khi đang đi cần mở lại nhanh | Nếu UX kém sẽ không dùng tiếp |

---

## 4. Tác động nếu giải quyết tốt

Nếu giải quyết tốt, sản phẩm có thể tạo ra các tác động sau:

### 4.1 Với người dùng

- Giảm thời gian lập lịch trình.
- Có kế hoạch thực tế hơn.
- Dễ ra quyết định hơn.
- Giảm rủi ro chọn sai địa điểm.
- Tự tin hơn khi đi du lịch tự túc.
- Có thể xem lại lịch trình trong chuyến đi.

### 4.2 Với sản phẩm

- Tăng tỷ lệ người dùng hoàn thành flow tạo lịch trình.
- Tăng tỷ lệ lưu lịch trình.
- Tăng khả năng quay lại app trước và trong chuyến đi.
- Có nền tảng mở rộng sang khách sạn, phương tiện, partner/operator trong tương lai.

### 4.3 Với kỹ thuật/vận hành

- Giảm cost API ngoài nhờ cache.
- Giảm lỗi do phụ thuộc dữ liệu không kiểm soát.
- Có nền tảng dữ liệu địa điểm thật để cải thiện chất lượng gợi ý.
- Dễ mở rộng sang nhiều thành phố nếu module và dữ liệu được thiết kế đúng.

---

## 5. Ràng buộc thực tế

### 5.1 Ràng buộc chi phí

- Gemini API có thể phát sinh cost theo số lượng request/token.
- OSRM demo server có thể bị giới hạn, cần cache hoặc self-host khi scale.
- Weather API cần cache để tránh gọi lặp.
- Google Places API nếu dùng enrich dữ liệu phải kiểm soát quota và cost.
- Object Storage + CDN chỉ nên dùng cho media/static assets, không lạm dụng backend để serve file nặng.

### 5.2 Ràng buộc dữ liệu

- Địa điểm production phải là dữ liệu thật.
- Dữ liệu cần có tọa độ hợp lệ.
- Dữ liệu cần source rõ ràng: manual, google_places, openstreetmap, official_source.
- Dữ liệu cần trạng thái xác minh nếu do admin nhập tay.
- Không để Gemini tự tạo địa điểm/tọa độ.
- Dữ liệu khách sạn/phương tiện ở MVP chỉ nên ở mức gợi ý, chưa booking thật.

### 5.3 Ràng buộc thời tiết

- Dự báo thời tiết có thể sai hoặc API lỗi.
- Weather chỉ nên là tín hiệu hỗ trợ điều chỉnh lịch trình, không phải nguồn quyết định tuyệt đối.
- Khi Weather API lỗi, hệ thống vẫn phải tạo lịch trình và thông báo rõ rằng chưa có dữ liệu thời tiết.

### 5.4 Ràng buộc thời gian di chuyển

- Route thực tế cần OSRM.
- Không nên gọi OSRM quá nhiều trong một request.
- MVP giới hạn 1-3 ngày, 3-5 địa điểm/ngày.
- Route phải cache theo cặp điểm và profile.
- Khi OSRM lỗi, vẫn hiển thị marker và có thể fallback bằng thông báo chưa tính được route.

### 5.5 Ràng buộc trải nghiệm

- Người dùng không muốn nhập form quá dài.
- Kết quả phải dễ hiểu, không chỉ là JSON hoặc text dài.
- Web MVP phải ưu tiên flow nhập prompt → xem itinerary → xem bản đồ → lưu.
- Flutter app ở giai đoạn sau cần tối ưu xem lại lịch trình khi đang di chuyển.