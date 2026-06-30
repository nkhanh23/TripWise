
---

## `docs/01-product/non-mvp-scope.md`

```md
# Non-MVP Scope - AI Smart Travel Planner

## 1. Mục tiêu tài liệu

Tài liệu này xác định rõ những phần không làm trong MVP để tránh scope creep. Các tính năng dưới đây có thể quan trọng trong tương lai, nhưng không cần thiết để chứng minh flow lõi của sản phẩm.

MVP tập trung vào:

> Nha Trang, chuyến đi 1-3 ngày, nhập prompt tiếng Việt, Gemini parse, địa điểm thật trong PostgreSQL + PostGIS, OSRM route, Weather adjustment, Web MVP, lưu lịch trình.

---

## 2. Chưa booking khách sạn thật

## 2.1 Không làm trong MVP

MVP không hỗ trợ:

- Đặt phòng khách sạn.
- Kiểm tra phòng trống thật.
- Đồng bộ giá phòng realtime.
- Hủy/đổi booking.
- Voucher khách sạn.
- Quản lý booking confirmation.
- Partner hotel dashboard.

## 2.2 Lý do

Booking thật yêu cầu:

- Hợp đồng với provider/OTA.
- Dữ liệu availability realtime.
- Chính sách hủy/hoàn tiền.
- Hỗ trợ khách hàng.
- Thanh toán.
- Xử lý tranh chấp.

Đây là phạm vi lớn hơn nhiều so với mục tiêu MVP.

## 2.3 Có thể làm trong future scale

Future có thể thêm:

- Gợi ý khu vực nên ở.
- Deep link sang Booking/Agoda/Google Travel nếu hợp pháp.
- Partner hotel integration.
- Booking flow riêng khi sản phẩm đủ trưởng thành.

---

## 3. Chưa thanh toán

## 3.1 Không làm trong MVP

MVP không hỗ trợ:

- Thanh toán online.
- Ví điện tử.
- Thẻ ngân hàng.
- Hoàn tiền.
- Invoice.
- Commission.
- Revenue sharing.

## 3.2 Lý do

Thanh toán yêu cầu:

- Tích hợp payment gateway.
- Bảo mật giao dịch.
- Pháp lý.
- Refund/chargeback.
- Kế toán.
- Chăm sóc khách hàng.

MVP chưa có booking thật nên chưa cần thanh toán.

---

## 4. Chưa vé xe/vé máy bay/vé tàu thật

## 4.1 Không làm trong MVP

MVP không hỗ trợ:

- Đặt vé xe.
- Đặt vé máy bay.
- Đặt vé tàu.
- Kiểm tra chỗ trống realtime.
- Xuất vé điện tử.
- Hủy/đổi vé.

## 4.2 Lý do

Dữ liệu phương tiện thật phức tạp, gồm:

- Lịch chạy.
- Giá vé.
- Ghế trống.
- Điều kiện hủy/đổi.
- Provider khác nhau.
- Sai lệch dữ liệu realtime.

## 4.3 MVP chỉ nên làm gì

MVP có thể lưu/gợi ý phương tiện ở mức thông tin tham khảo nếu có dữ liệu chính thức đã chuẩn hóa, ví dụ:

- TP.HCM → Nha Trang bằng xe khách khoảng 7-9 giờ.
- Chi phí dự kiến.
- Mô tả phù hợp ngân sách.

Không bán vé thật.

---

## 5. Chưa chatbot chỉnh sửa lịch trình phức tạp

## 5.1 Không làm trong MVP

MVP không hỗ trợ chatbot kiểu:

- "Đổi ngày 2 thành lịch nhẹ hơn".
- "Thay quán cà phê khác gần khách sạn".
- "Bỏ điểm này, thêm điểm kia".
- "Tối ưu lại theo sở thích mới".
- Chat nhiều lượt với context dài.

## 5.2 Lý do

Chatbot chỉnh sửa phức tạp cần:

- State management.
- Conversation memory.
- Conflict resolution.
- Re-run scoring/route/weather.
- UI hiển thị diff.
- Kiểm soát AI không bịa dữ liệu.

## 5.3 Future direction

Sau MVP có thể thêm chỉnh sửa bằng UI trước:

- Xóa địa điểm.
- Đổi thứ tự.
- Tính lại route.
- Thêm địa điểm từ danh sách đã xác minh.

Sau đó mới thêm chatbot chỉnh sửa.

---

## 6. Chưa hỗ trợ quá nhiều thành phố

## 6.1 Không làm trong MVP

MVP không hỗ trợ nhiều thành phố như:

- Đà Lạt.
- Đà Nẵng.
- Huế.
- Hội An.
- Phú Quốc.
- Hà Nội.
- TP.HCM.
- Du lịch nhiều tỉnh trong một chuyến.

## 6.2 Lý do

Mỗi thành phố cần:

- Dataset địa điểm thật.
- Tags phù hợp.
- Budget calibration.
- Thời gian tham quan.
- Khu vực trung tâm.
- Dữ liệu weather/location.
- Kiểm thử route.

Mở rộng quá sớm làm giảm chất lượng gợi ý.

## 6.3 Future direction

Sau khi Nha Trang ổn, mở rộng theo thứ tự:

1. Thành phố có dữ liệu dễ chuẩn hóa.
2. Thành phố có nhu cầu cao.
3. Thành phố có route nội đô phù hợp.
4. Thành phố có nhiều địa điểm indoor/outdoor để weather adjustment có ý nghĩa.

---

## 7. Chưa microservices

## 7.1 Không làm trong MVP

MVP không tách thành microservices như:

- auth-service.
- place-service.
- trip-service.
- ai-service.
- route-service.
- weather-service.
- media-service.

## 7.2 Lý do

Microservices sẽ tăng độ phức tạp:

- Deployment.
- Networking.
- Distributed tracing.
- Data consistency.
- CI/CD.
- Service discovery.
- DevOps/SRE effort.
- Debug lỗi liên service.

MVP cần tốc độ phát triển và kiểm thử end-to-end đơn giản hơn.

## 7.3 Hướng đúng trong MVP

Dùng Modular Monolith:

- Tách module rõ.
- Tách domain/application/infrastructure/presentation.
- Không coupling trực tiếp giữa module.
- Có port/adapter cho external API.
- Có thể tách service sau khi có bằng chứng scale thật.

---

## 8. Chưa recommendation ML phức tạp

## 8.1 Không làm trong MVP

MVP không làm:

- Train model recommendation riêng.
- Collaborative filtering.
- Ranking model ML.
- Fine-tuning Gemini.
- Vector search cho recommendation.
- Personalization dựa trên lịch sử dài hạn.
- A/B testing ranking model.

## 8.2 Lý do

MVP chưa có đủ dữ liệu user behavior để train ML có ý nghĩa.

Scoring rule-based là phù hợp hơn ở giai đoạn đầu vì:

- Dễ hiểu.
- Dễ test.
- Dễ debug.
- Dễ giải thích lý do gợi ý.
- Ít tốn chi phí.
- Không cần pipeline ML.

## 8.3 Future direction

Sau khi có dữ liệu thật, có thể xem xét:

- Lưu user feedback.
- Lưu itinerary saved/clicked.
- Lưu place skipped/selected.
- Tối ưu weight scoring.
- Thử recommendation model nhẹ.
- Dùng embedding cho semantic matching nếu cần.

---

## 9. Chưa tự động crawl dữ liệu từ nhiều nguồn không kiểm soát

## 9.1 Không làm trong MVP

MVP không tự động crawl hàng loạt từ nhiều website không rõ quyền sử dụng.

## 9.2 Lý do

Rủi ro:

- Vi phạm điều khoản sử dụng.
- Dữ liệu sai hoặc cũ.
- Khó chuẩn hóa.
- Khó kiểm duyệt.
- Có thể bị block.
- Có rủi ro pháp lý.

## 9.3 Hướng MVP

Dữ liệu nên đến từ:

- Admin nhập tay đã xác minh.
- Google Places API nếu được phép.
- OpenStreetMap/Overpass/Nominatim nếu tuân thủ policy.
- Nguồn chính thức được phép.

---

## 10. Chưa tối ưu route nâng cao kiểu logistics

## 10.1 Không làm trong MVP

MVP không làm:

- Vehicle Routing Problem.
- Multi-objective optimization phức tạp.
- Constraint solver.
- Tối ưu theo traffic realtime.
- Tối ưu theo nhiều người dùng cùng lúc.
- Tối ưu booking slots.

## 10.2 Hướng MVP

MVP dùng cách đơn giản:

- Chọn điểm phù hợp.
- Gom điểm gần nhau.
- Dùng OSRM duration.
- Nearest Neighbor.
- Giới hạn 3-5 điểm/ngày.
- Cache route.

## 10.3 Future direction

Sau khi có nhu cầu thật:

- Cho người dùng chọn pace: nhẹ/vừa/dày.
- Cho kéo thả đổi thứ tự.
- Tính lại route.
- Tối ưu theo opening hours.
- Tối ưu theo traffic nếu có data hợp pháp.

---

## 11. Chưa mobile app đầy đủ như web/admin

## 11.1 Không làm trong MVP đầu tiên

Flutter app chưa cần đủ mọi tính năng:

- Admin quản lý địa điểm.
- Data ingestion.
- Dashboard.
- Cấu hình hệ thống.
- Partner/operator tools.

## 11.2 Hướng mobile hợp lý

Flutter nên tập trung vào:

- Đăng nhập.
- Xem lịch trình đã lưu.
- Xem chi tiết ngày.
- Xem bản đồ.
- Mở lại lịch trình khi đang đi.

Web vẫn là nơi ưu tiên cho MVP tạo lịch trình đầu tiên.

---

## 12. Chưa production scale đầy đủ

## 12.1 Không làm trong MVP

MVP chưa cần:

- Multi-region deployment.
- Kubernetes phức tạp.
- Auto-scaling nâng cao.
- Full distributed tracing.
- Data warehouse.
- Advanced analytics.
- SLA chính thức.

## 12.2 Nhưng không được bỏ qua nền tảng

Dù chưa làm production scale đầy đủ, MVP vẫn cần:

- Logging không chứa secret.
- Health check.
- Env config rõ.
- Rate limit cho endpoint tốn cost.
- Cache OSRM/Weather.
- Timeout API ngoài.
- Không hardcode secret.
- Không dùng wildcard CORS trong production.