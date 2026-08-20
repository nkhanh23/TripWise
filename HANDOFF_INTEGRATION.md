# TripWise React Native FE ↔ BE Integration Handoff

**Owner / Agent: Codex — Integration**
**Status: NOT STARTED**

Roadmap dài hạn: [`PHASES_INTEGRATION.md`](./PHASES_INTEGRATION.md)

## 1. Purpose

Tài liệu này chuẩn bị contract và trách nhiệm cho phase nối React Native + TypeScript + Expo Frontend với Supabase Backend sau khi hai phía đủ ổn định. Đây không phải authorization để bắt đầu integration.

Backend và Mobile Frontend tiếp tục phát triển độc lập trong các session riêng:

- Backend status: `HANDOFF_BE.md`
- React Native Mobile Frontend status: `HANDOFF_FE.md`

## 2. Start gate

Integration chỉ được bắt đầu khi user yêu cầu rõ ràng. Trước thời điểm đó:

- FE tiếp tục dùng mock/local data.
- BE không sửa React Native UI.
- Không thêm remote repository, auth wiring hoặc persistence wiring vào React Native trong FE-only phases.
- Không redesign UI để phù hợp backend; contract adapter phải giữ UI đã được duyệt.

### Existing pre-roadmap boundary

Repository đã có React Native Supabase Auth/session/profile code và typed `generateTrip()` client từ P2/P3 trước khi INT roadmap được tách. Các foundations này được bảo toàn, nhưng không có nghĩa INT-P0+ đã bắt đầu hoặc được phép mở rộng trong FE-only/BE-only sessions.

## 3. Integration responsibilities

Codex phụ trách integration và phải:

- giữ nguyên React Native UI đã hoàn thiện và verified;
- không redesign Google Stitch UI;
- thay mock repository/data source bằng backend implementation ở đúng boundary;
- mapping backend DTO ↔ TypeScript models rõ ràng, không để raw transport objects lan vào React Native components;
- tích hợp Supabase authentication/session theo security contract được duyệt;
- gọi Supabase Edge Functions/API qua typed client boundary;
- triển khai persistence flows mà không bypass RLS;
- nối loading/error/empty states hiện có với dữ liệu thật;
- xử lý timeout, bounded retry và cancellation/lifecycle phù hợp;
- map API/function error codes thành domain/UI errors thân thiện;
- hỗ trợ pagination/cursor nếu backend contract yêu cầu;
- kiểm tra contract/version compatibility trước khi thay mock;
- thêm integration tests tại repository/data-source boundary;
- chạy end-to-end smoke tests cho các critical flows;
- không log password, JWT, refresh token, API key hoặc sensitive payload;
- không đưa service-role key hoặc Gemini secret vào Expo/React Native bundle.

## 4. Integration architecture target

```text
Existing React Native UI
    ↓
Feature controller/state
    ↓
Repository interface already used by mocks
    ↓
Supabase/Edge Function data-source implementation
    ↓
DTO validation and model mapping
    ↓
Supabase Auth + RLS-protected PostgreSQL + Edge Functions
```

Widgets không được gọi Supabase query builder hoặc Edge Function trực tiếp. Integration phải thay implementation ở boundary, không thay visual structure.

## 5. Contract checklist

Mỗi integration contract phải có một row và chỉ được đánh dấu complete sau automated/manual verification.

| Endpoint / Edge Function | HTTP method | Auth requirement | Request DTO | Response DTO | Error codes | TypeScript model | Service/repository/hook | Consuming screen/feature | Integration status | Known mismatch |
|---|---|---|---|---|---|---|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | NOT STARTED | _TBD_ |

Per-contract review:

- [ ] Endpoint/Edge Function name và deployed version đã xác nhận
- [ ] HTTP/function invocation method đã xác nhận
- [ ] Auth requirement và token propagation đã xác nhận
- [ ] Request DTO typed và validation rules documented
- [ ] Response DTO typed và validation rules documented
- [ ] Stable error codes documented
- [ ] TypeScript model mapping documented/tested
- [ ] Repository method có timeout/cancellation semantics
- [ ] Screen/feature consumer xác định rõ
- [ ] Loading/error/empty behavior mapped
- [ ] Pagination/cursor semantics documented nếu có
- [ ] Backward/version compatibility reviewed
- [ ] Known mismatch có owner và resolution trước implementation

## 6. Planned integration flows

Các flow sau chỉ là inventory chuẩn bị, chưa triển khai:

1. Authentication/session bootstrap, restore và sign out.
2. Profile read/update với RLS ownership.
3. Authenticated `generate-trip` invocation.
4. Generated-trip DTO mapping sang React Native/TypeScript preview-result models.
5. Atomic trip/day/item persistence sau khi BE-P4 contract hoàn tất.
6. Saved trips list/detail với pagination khi cần.
7. Place resolution/enrichment khi Google Places phase hoàn tất.
8. Loading, timeout, retry, error và empty-state behavior bằng dữ liệu thật.

## 7. Known contract issue to resolve before trip persistence integration

BE-P3 output chưa có verified coordinates, trong khi BE-P1 schema hiện yêu cầu `itinerary_items.latitude`/`longitude` không null. Integration không được bịa coordinates hoặc bỏ qua validation.

Backend phải chốt BE-P4 persistence contract/migration trước; TypeScript mapping chỉ được nối sau khi DTO và unresolved-place behavior ổn định.

## 8. Integration tests và smoke tests cần có sau này

- Repository/data-source tests với mocked transport boundary.
- DTO validation và mapping tests.
- Auth/session restore/sign-out integration tests.
- Authenticated Edge Function success/error/timeout tests.
- RLS ownership tests: user chỉ đọc/ghi dữ liệu của mình.
- Persistence atomicity/idempotency tests.
- Pagination tests cho list contract nếu áp dụng.
- End-to-end smoke: auth → generate → preview → save → reopen saved trip.
- Offline/network failure smoke tests cho existing UI states.
- Android runtime smoke; iOS runtime khi environment hỗ trợ.

Không dùng service-role key, không disable RLS và không tạo public test policy để làm test pass.

## 9. Integration rule

> **DO NOT START:** Không bắt đầu FE ↔ BE integration cho tới khi user yêu cầu rõ ràng.

BE và FE tiếp tục phát triển độc lập ở các session riêng. Việc một endpoint hoặc screen đã hoàn thành không tự động cho phép wiring hai phía.
