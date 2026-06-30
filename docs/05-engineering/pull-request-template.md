# Pull Request Template - AI Smart Travel Planner

*Tệp tin này được dùng làm mẫu (Template) mặc định khi lập trình viên khởi tạo một Pull Request mới trên GitHub.*

---

## 1. Summary (Tóm tắt thay đổi)
*Mô tả ngắn gọn mục tiêu của Pull Request này và vấn đề nó giải quyết.*

## 2. Related Task / Issue
*Liên kết tới Task ID trong backlog.*
- Task: #P[Phase]-T[ID_Task]

## 3. Description of Changes (Chi tiết thay đổi)
*Liệt kê các file được tạo mới, sửa đổi hoặc xóa bỏ và mô tả lý do kỹ thuật.*
- `[NEW]` [tên_file] - [mục đích]
- `[MODIFY]` [tên_file] - [chi tiết thay đổi]

## 4. How to Test (Quy trình kiểm thử)
*Hướng dẫn chi tiết từng bước cho reviewer chạy thử nghiệm kiểm tra tính năng.*
1. Chạy lệnh: `...`
2. Truy cập API: `...`
3. Dữ liệu đầu vào (Payload): `...`

## 5. Architectural & System Impact (Tác động hệ thống)
*Đánh giá tác động của PR này tới các khía cạnh kỹ thuật:*
- **Database Impact**: Có chạy migration file của Flyway không? Có thêm bảng/cột mới hay đổi kiểu dữ liệu không?
- **Cache Impact**: Có làm thay đổi cấu trúc key Redis không? Có cần xóa (invalidate) cache cũ không?
- **Security Impact**: Có thay đổi phân quyền hay logic kiểm tra token không? Có lưu thông tin nhạy cảm không?
- **Performance Impact**: Có làm tăng thời gian phản hồi của API không? Có gọi thêm API ngoài không?

## 6. Screenshots / Recordings (Nếu có thay đổi UI)
*Dán hình ảnh hoặc video ngắn minh họa giao diện Web/Mobile.*

## 7. Risks & Mitigation (Rủi ro & Biện pháp giảm thiểu)
*Các rủi ro tiềm ẩn khi merge PR này (ví dụ: downtime, xung đột dữ liệu) và cách xử lý.*

## 8. Definition of Done Checklist
*Đánh dấu [x] vào các ô để tự xác nhận PR đã đạt chuẩn:*
- [ ] Code biên dịch thành công 100%, không cảnh báo nghiêm trọng.
- [ ] Đã viết đầy đủ Unit Test và tất cả các test case đều Pass.
- [ ] Input validation được áp dụng chặt chẽ cho Request DTO.
- [ ] Không hardcode secret (password, API key).
- [ ] Đã chạy test và hoạt động tốt trên môi trường cục bộ (local).
- [ ] Cập nhật tài liệu kỹ thuật liên quan (nếu có).
