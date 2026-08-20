# TripWise React Native FE ↔ BE Integration Roadmap

**Owner / Agent: Codex — FE ↔ BE Integration**
**Status: NOT STARTED**

Roadmap này là active source of truth cho integration planning, nhưng không cấp quyền bắt đầu implementation.

## 1. Start gate

Integration chỉ bắt đầu khi user yêu cầu rõ ràng.

- Không mặc định phải chờ 100% mọi FE/BE phase.
- Trước mỗi INT phase, dependency BE contract và FE screen/model tương ứng phải ready và được verify.
- Giữ nguyên React Native UI đã duyệt; không redesign Stitch screens.
- Không sửa verified BE contract để khớp UI một cách ad hoc; mismatch phải được ghi và giải quyết có owner.
- Khi chưa được phép bắt đầu, FE tiếp tục mock/local data và BE tiếp tục backend độc lập.

## 2. Status overview

- **Current:** NOT STARTED
- **First phase when authorized:** INT-P0 — Integration Readiness & Contract Freeze
- **Completed phases:** None

Repository đã có pre-roadmap React Native Supabase Auth/session/profile và typed `generateTrip()` client từ P2/P3. INT status vẫn là NOT STARTED: roadmap này theo dõi việc nối production UI/data flows còn lại, không phủ nhận hay tự mở rộng các verified foundations đã có.

---

## [ ] INT-P0 — Integration Readiness & Contract Freeze

- [ ] Đọc `HANDOFF_BE.md`, `HANDOFF_FE.md`, `PHASES_BE.md`, `PHASES_FE.md`.
- [ ] Xác nhận deployed BE endpoints/functions và auth requirements.
- [ ] Xác nhận TypeScript models, services/repositories/hooks và consuming screens.
- [ ] Tạo mismatch matrix: BE DTO ↔ TypeScript model/UI state.
- [ ] Freeze request/response/error/version contracts cần cho phase tiếp theo.
- [ ] Ghi dependency readiness và blocker; không implement khi dependency chưa ready.

### Done when

- Contract checklist có owner/status cho từng mismatch.
- Không còn field/auth/error semantic mơ hồ trong scope phase kế tiếp.

---

## [ ] INT-P1 — React Native Backend Infrastructure

- [ ] Supabase/backend client setup bằng environment/config an toàn.
- [ ] Auth/session adapter tại infrastructure boundary.
- [ ] Repository abstractions và remote data-source implementations.
- [ ] DTO validation/mapping boundary.
- [ ] Stable error mapping sang UI/domain errors.
- [ ] Timeout, bounded retry và lifecycle cancellation.
- [ ] Không để widgets gọi Supabase/Edge Function trực tiếp.
- [ ] Không redesign UI.

---

## [ ] INT-P2 — Authentication Integration

- [ ] Nối React Native Auth UI với Supabase Auth thật.
- [ ] Initial session bootstrap/restore không flash sai navigation.
- [ ] Login/register/logout.
- [ ] Profile fetch/update theo RLS.
- [ ] Loading/error/confirmation states bằng dữ liệu thật.
- [ ] Restart/session/sign-out smoke tests.
- [ ] Không log password, JWT hoặc refresh token.

---

## [ ] INT-P3 — Trip Generation Integration

- [ ] Create Trip UI gọi authenticated `generate-trip`.
- [ ] Map TypeScript form model → GenerateTrip request DTO.
- [ ] Validate/map generated response → React Native itinerary preview model.
- [ ] Loading, timeout, retry và stable error UX.
- [ ] Preserve existing React Native screen structure/Stitch fidelity.
- [ ] Không persist trip trong INT-P3 nếu BE-P4 contract chưa ready.

---

## [ ] INT-P4 — Persistence Integration

- [ ] Create/save trip qua BE-P4 contract.
- [ ] Persist itinerary days/items atomically.
- [ ] Saved trips list/detail wiring.
- [ ] Ownership/RLS verification.
- [ ] Idempotency/duplicate handling.
- [ ] Partial-failure and retry UX.
- [ ] Reopen saved trip smoke test.

---

## [ ] INT-P5 — Places Integration

- [ ] Replace mock place repository/source.
- [ ] Place identity and unresolved-place behavior.
- [ ] Verified coordinates, address/category snapshot.
- [ ] Place details, photos/opening information chỉ khi backend/provider contract hỗ trợ.
- [ ] Provider quota/error/loading/empty states.
- [ ] Không tin Gemini suggestion như verified place metadata.

---

## [ ] INT-P6 — Map & Route Integration

- [ ] Render real verified coordinates.
- [ ] Wire OSRM/route source theo BE-P7 decision.
- [ ] Polyline and ordered markers.
- [ ] Timeout/error/fallback behavior.
- [ ] Map rebuild/performance regression test.

---

## [ ] INT-P7 — Remaining Real Data Integration

- [ ] Weather theo BE-P8/client ownership decision.
- [ ] Saved places nếu backend-supported.
- [ ] Profile/settings server-side data nếu product contract yêu cầu.
- [ ] Các backend-supported features còn lại, mỗi feature có contract checklist riêng.

---

## [ ] INT-P8 — Remove Mock Runtime Dependencies

- [ ] Production dependency injection không còn chọn mock repositories.
- [ ] Giữ fixtures/fakes cho tests, previews và explicit dev mode nếu hữu ích.
- [ ] Không xóa visual fixtures cần cho deterministic UI tests.
- [ ] Audit production build không chứa fake user/trip/place runtime path.

---

## [ ] INT-P9 — Integration & End-to-End QA

- [ ] Auth/register/login/session restore/logout.
- [ ] Generate trip.
- [ ] Persist trip graph atomically.
- [ ] Reopen saved trip.
- [ ] Place details/identity/coordinates.
- [ ] Map/route and fallback.
- [ ] Offline/network/error handling.
- [ ] RLS/cross-user/security tests.
- [ ] Android smoke test.
- [ ] iOS smoke test khi environment hỗ trợ.
- [ ] Regression comparison với Stitch UI.
- [ ] No secrets/tokens in logs or bundle.

## 3. Contract checklist

| Endpoint / Edge Function | Method | Auth | Request DTO | Response DTO | Error codes | TypeScript model | Service/repository/hook | Consumer | Status | Known mismatch |
|---|---|---|---|---|---|---|---|---|---|---|
| _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | NOT STARTED | _TBD_ |

## 4. Integration rule

> **Status remains NOT STARTED until explicit user authorization.**

Không phase nào trong roadmap này được tự động kích hoạt chỉ vì BE hoặc FE dependency đã hoàn thành.
