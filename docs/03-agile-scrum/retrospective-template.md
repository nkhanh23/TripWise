# Sprint Retrospective Template - AI Smart Travel Planner

**Sprint Number**: [Điền số Sprint, ví dụ: Sprint 1]  
**Date**: [Ngày thực hiện buổi họp cải tiến]  
**Facilitator**: [Người điều phối, thường là Scrum Master/Developer]  

---

## 1. What Went Well? (Những điểm đã làm tốt)
*Liệt kê các điểm tích cực về mặt kỹ thuật, quy trình làm việc, sự phối hợp giữa Developer và AI Coding Assistant trong Sprint.*
- [ ] Ví dụ: Cấu trúc Clean Architecture giúp việc viết Unit Test cho tầng nghiệp vụ rất nhanh và cô lập.
- [ ] Ví dụ: Hệ thống cache Redis hoạt động ổn định, giúp giảm đáng kể thời gian phản hồi của OSRM test cases.
- [ ] 

---

## 2. What Did Not Go Well? (Những điểm chưa làm tốt / Khó khăn)
*Ghi nhận các trở ngại kỹ thuật, bug khó giải quyết, sự chậm trễ tiến độ hoặc các vấn đề giao tiếp/hiểu sai yêu cầu của AI.*
- [ ] Ví dụ: AI Coding Assistant tự ý sinh thêm một số dependency bên ngoài trong quá trình dựng framework làm phình tệp cấu hình Gradle.
- [ ] Ví dụ: Cơ chế parse JSON của Gemini API thỉnh thoảng bị lỗi khi người dùng nhập câu tiếng Việt quá dài và phức tạp.
- [ ] 

---

## 3. What to Improve? (Đề xuất cải tiến)
*Các giải pháp tiềm năng để khắc phục các vấn đề chưa làm tốt ở trên.*
- [ ] Ví dụ: Cần bổ sung quy tắc kiểm tra dependency nghiêm ngặt hơn vào file `AGENTS.md` để kiểm soát AI.
- [ ] Ví dụ: Viết thêm một lớp kiểm tra schema trung gian trước khi parse trực tiếp chuỗi JSON từ Gemini.
- [ ] 

---

## 4. Action Items (Kế hoạch hành động cụ thể cho Sprint tiếp theo)
*Mỗi hành động phải có tiêu chí đo lường rõ ràng, gán trách nhiệm và thời hạn hoàn thành.*

| ID | Hành động cải tiến | Người chịu trách nhiệm | Thời hạn | Trạng thái |
| :--- | :--- | :---: | :---: | :---: |
| ACT-01 | Cập nhật file `AGENTS.md` cấm tự động import thư viện ngoài | Scrum Master | Ngày 1 của Sprint mới | [ ] Ready |
| ACT-02 | Viết thêm Use Case test kịch bản API ngoài sập | Developer | Trước ngày Review | [ ] Ready |
| | | | | |

---

## 5. AI Working Lessons (Bài học kinh nghiệm khi làm việc với AI)
*Ghi lại các bài học thực tế về cách giao tiếp và điều phối AI Coding Assistant để tối ưu hóa năng suất lập trình.*
- **Kinh nghiệm viết Prompt**: Khi ra lệnh cho AI, cần cung cấp đường dẫn tuyệt đối đến tệp thiết kế tương ứng (`system-design.md`, `testing-plan.md`) để AI không tự suy đoán.
- **Kiểm soát mã nguồn**: AI thường có xu hướng viết thêm các code tiện ích dư thừa (boilerplate code) hoặc code lan man sang module khác. Cần nhắc nhở AI luôn bám sát tiêu chuẩn **Definition of Ready (DoR)** của task nhỏ trước khi viết code.
- **Rà soát chất lượng**: Luôn yêu cầu AI giải thích giải pháp thiết kế hoặc chạy thử test suite trước khi đồng ý cho ghi đè (overwrite) các tệp mã nguồn cốt lõi.
