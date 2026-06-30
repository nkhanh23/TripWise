# Target Users - AI Smart Travel Planner

## 1. Tổng quan nhóm người dùng

AI Smart Travel Planner phục vụ người dùng muốn lập kế hoạch du lịch tự túc nhanh, thực tế và cá nhân hóa. MVP tập trung vào Nha Trang, chuyến đi 1-3 ngày, nhập nhu cầu bằng tiếng Việt và xem lịch trình trên web.

Các nhóm người dùng chính:

1. Guest.
2. Registered User.
3. Admin.
4. Future Partner/Operator.

---

## 2. Guest

## 2.1 Mô tả

Guest là người dùng chưa đăng nhập, truy cập web để thử tạo lịch trình nhanh. Đây là nhóm quan trọng để giảm rào cản dùng thử.

## 2.2 Nhu cầu

- Muốn thử sản phẩm nhanh mà chưa cần tạo tài khoản.
- Muốn nhập yêu cầu du lịch bằng tiếng Việt.
- Muốn xem lịch trình mẫu hoặc kết quả tạo lịch trình.
- Muốn biết sản phẩm có đáng tin không trước khi đăng ký.

## 2.3 Quyền trong MVP

Guest có thể:

- Nhập prompt tiếng Việt.
- Chọn ngày bắt đầu.
- Chọn nơi xuất phát nếu flow MVP hỗ trợ.
- Tạo lịch trình giới hạn.
- Xem kết quả lịch trình.
- Xem bản đồ, marker, route nếu hệ thống tạo thành công.
- Xem cảnh báo thời tiết nếu có dữ liệu.

Guest không thể:

- Lưu lịch trình lâu dài.
- Xem lại lịch trình trên thiết bị khác.
- Quản lý danh sách lịch trình.
- Truy cập tính năng admin.
- Gọi API không giới hạn.

## 2.4 Giới hạn đề xuất

- Rate limit theo IP.
- Giới hạn số lần tạo lịch trình/ngày.
- Không lưu dữ liệu cá nhân dài hạn nếu chưa đăng ký.
- Có CTA rõ ràng: "Đăng ký để lưu lịch trình".

---

## 3. Registered User

## 3.1 Mô tả

Registered User là người dùng đã đăng ký hoặc đăng nhập qua OAuth2. Đây là nhóm người dùng chính của sản phẩm thật.

## 3.2 Nhu cầu

- Tạo lịch trình cá nhân hóa.
- Lưu lại lịch trình.
- Mở lại lịch trình trước hoặc trong chuyến đi.
- Xem route, bản đồ, thời tiết.
- Có trải nghiệm ổn định trên web và sau này trên Flutter app.

## 3.3 Quyền trong MVP

Registered User có thể:

- Đăng ký/đăng nhập.
- Tạo lịch trình Nha Trang 1-3 ngày.
- Lưu lịch trình.
- Xem danh sách lịch trình đã lưu.
- Xem chi tiết lịch trình.
- Xóa lịch trình của chính mình.
- Mở lại itinerary trên web.
- Sử dụng access token ngắn hạn và refresh token rotation.

## 3.4 Quyền trong future scale

Registered User có thể được mở rộng:

- Chỉnh sửa lịch trình.
- Chia sẻ lịch trình cho bạn bè.
- Xuất lịch trình PDF.
- Đồng bộ sang mobile app.
- Đánh giá địa điểm sau chuyến đi.
- Tạo nhiều chuyến đi ở nhiều thành phố.
- Nhận thông báo thay đổi thời tiết.
- Nhận gợi ý khách sạn/phương tiện nâng cao.

---

## 4. Admin

## 4.1 Mô tả

Admin chịu trách nhiệm quản lý dữ liệu địa điểm, nguồn dữ liệu và chất lượng nội dung trong hệ thống. Vì sản phẩm không cho Gemini tự bịa địa điểm, Admin có vai trò quan trọng trong việc đảm bảo dữ liệu thật.

## 4.2 Nhu cầu

- Thêm/sửa/xóa địa điểm.
- Gắn tag, category, budget level.
- Nhập tọa độ hoặc link nguồn.
- Xác minh dữ liệu địa điểm.
- Quản lý trạng thái active/inactive.
- Kiểm tra dữ liệu sai hoặc thiếu.
- Theo dõi lỗi đồng bộ dữ liệu nếu có.

## 4.3 Quyền trong MVP

Admin có thể:

- Quản lý địa điểm Nha Trang.
- Thêm địa điểm thủ công đã xác minh.
- Quản lý thông tin cơ bản:
  - Tên địa điểm.
  - Thành phố.
  - Category.
  - Tags.
  - Estimated cost.
  - Duration minutes.
  - Best time.
  - Indoor/outdoor.
  - Latitude/longitude.
  - Source.
  - Verification status.
- Ẩn địa điểm không còn phù hợp.
- Kiểm tra dữ liệu route/weather cache ở mức vận hành nếu có admin internal.

## 4.4 Ràng buộc bảo mật

- Admin endpoint phải được bảo vệ.
- Không dùng chung quyền admin với user thường.
- Không expose API quản trị cho public.
- Mọi thay đổi dữ liệu quan trọng nên có audit fields:
  - createdBy.
  - updatedBy.
  - createdAt.
  - updatedAt.
  - source.
  - verificationStatus.

---

## 5. Future Partner/Operator

## 5.1 Mô tả

Partner/Operator là nhóm mở rộng trong tương lai, gồm:

- Công ty tour địa phương.
- Khách sạn.
- Nhà xe.
- Dịch vụ thuê xe.
- Đơn vị vận hành trải nghiệm du lịch.
- Đối tác cung cấp dữ liệu địa phương.

Nhóm này không thuộc MVP nhưng cần được định hướng sớm để tránh thiết kế sản phẩm bị khóa cứng.

## 5.2 Nhu cầu tương lai

- Đăng thông tin dịch vụ.
- Cập nhật giá/phòng/tuyến/phương tiện nếu có tích hợp.
- Nhận lead từ người dùng.
- Cung cấp dữ liệu chính thức.
- Theo dõi hiệu quả hiển thị.
- Kết nối với lịch trình người dùng theo ngữ cảnh.

## 5.3 Không thuộc MVP

Trong MVP không làm:

- Partner dashboard.
- Booking thật.
- Thanh toán.
- Quản lý tồn phòng.
- Quản lý vé xe/vé máy bay.
- Contract với operator.
- Commission/revenue sharing.

## 5.4 Lý do vẫn cần ghi nhận

Dù chưa làm, sản phẩm nên tránh các quyết định khiến future partner khó tích hợp, ví dụ:

- Không hardcode chỉ một loại địa điểm.
- Có source rõ ràng cho dữ liệu.
- Có thể phân biệt place, hotel, transport, activity.
- Có khả năng thêm verification status.
- Có khả năng thêm owner/partnerId trong tương lai.