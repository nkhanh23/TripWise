# TripWise — Lộ trình hoàn tất tính năng sản phẩm

**Nguồn:** [`FEATURES.md`](../FEATURES.md) cùng audit implementation LIVE LOCAL ngày 2026-09-03. Trạng thái tài liệu không được coi là bằng chứng runtime.

## Quy ước theo dõi tiến độ

Checkbox là nguồn theo dõi tiến độ **authoritative** của roadmap này.

- Phase dùng heading `### [ ] FEATURE-Px — ...`; chỉ tick `[x]` khi mọi task bắt buộc và acceptance của phase PASS.
- Mỗi task dùng heading độc lập `#### [ ] FEATURE-Px-Tyyy — ...`; không dùng việc chỉ nhắc ID trong phần phạm vi làm tracking chính.
- Mỗi bước thực thi dùng `- [ ] FEATURE-Px-Tyyy-Snnn — ...`. Khi một subtask hoàn thành, agent phải tick chính checkbox đó; chỉ khi toàn bộ subtask và checklist PASS mới tick task, và chỉ khi mọi task bắt buộc PASS mới tick phase.
- Không được tick checkbox chỉ vì code đã viết. Runtime bắt buộc chưa chạy, defect, hoặc thiếu bằng chứng thì task/phase vẫn giữ `[ ]`.
- Nhãn bằng chứng canonical được giữ nguyên: `VERIFIED FROM LIVE LOCAL SOURCE`, `VERIFIED FROM PROVIDED EVIDENCE`, `REPORTED BY AGENT`, `NOT RUN`, `BLOCKED`, `INSUFFICIENT EVIDENCE`.

| Baseline | Trạng thái |
|---|---|
| Integration (`INT-P0` through `INT-P9`) | COMPLETE — this roadmap does not create `INT-P10+` |
| Runtime sản phẩm hiện tại | React Native + TypeScript + Expo; React Navigation; Android là target hiện tại; Supabase Auth/PostgreSQL/RLS/Edge Functions |
| Motion / animation | **PAUSED BY USER**; bảo toàn code/bằng chứng hiện có; không tiếp tục `MOTION-T007` nếu chưa được ủy quyền lại rõ ràng |
| Trạng thái roadmap | FEATURE-P0 COMPLETE; FEATURE-P1 COMPLETE |
| Phase thực thi tiếp theo | `FEATURE-P2` cần ủy quyền rõ ràng |
| `FEATURE-P0` | **COMPLETE (baseline và contract freeze chỉ-tài-liệu)** |

## Thẩm quyền, bất biến và non-goals

Đây chỉ là kế hoạch implementation trong tương lai. Kế hoạch phải bảo toàn owner isolation, stale-user isolation, secure session, dữ liệu production thật, Gemini phía server, Google Places verification/photo/metadata đáng tin cậy, Google Maps, OSRM, Open-Meteo, Saved Places, Profile/Settings, Trip Detail/Trip Map, EN/VI, Light/Dark/System, semantic theme token, accessibility, MaterialIcons, visual source Stitch hiện được duyệt và hành vi Wikimedia attribution/User-Agent còn áp dụng. Fixture chỉ hợp lệ trong test hoặc explicit fixture/demo mode.

Gemini có thể reasoning, composition, trích xuất candidate hoặc giải thích, nhưng không bao giờ là nguồn sự thật cho place identity, tọa độ, provider status/hours, sự kiện, weather, FX, route metric hoặc persistence tự động. Mọi persistent write phải JWT-authenticated, owner-authorized (`auth.uid()`), RLS-safe, DTO/input-validated, safe-error-mapped và stale-user safe. Authenticated không đồng nghĩa authorized.

Non-goal vẫn là hotel marketplace, flight-ticket marketplace, payment gateway và expense-splitting platform. Roadmap không mở lại Integration, không khôi phục mock production data, không thêm enterprise infrastructure sớm, và không tuyên bố implementation khi thiếu bằng chứng bắt buộc.

## ĐỐI CHIẾU TRẠNG THÁI FEATURES — audit LIVE LOCAL

Phân loại: `IMPLEMENTED_RUNTIME` có production path và bằng chứng được chấp nhận; `PARTIAL_RUNTIME` chỉ có production subset bị giới hạn; `DOMAIN_FOUNDATION_ONLY` có type/helper/test nhưng thiếu persistence → repository → validated boundary → UI → runtime evidence; `PLANNED` và `FUTURE` chưa có completion path. Mỗi heading capability `###` trong `FEATURES.md` được map đúng một lần: **50 / 50; unmapped: 0**.

| # | FEATURES capability | FEATURES status | LIVE LOCAL status and evidence | Roadmap |
|---:|---|---|---|---|
| 1 | Smart Itinerary Generation | IMPLEMENTED | `IMPLEMENTED_RUNTIME`: protected `generate-trip`, validated output, atomic save path | Preserve; P0/P5 |
| 2 | Candidate Discovery | PLANNED | `PARTIAL_RUNTIME`: `explore-places` discovery only; not generation candidate pipeline | P4 |
| 3 | Google Places Verification | IMPLEMENTED | `IMPLEMENTED_RUNTIME`: `resolve-place`, provenance/RLS contracts | Preserve; P1/P4/P5 |
| 4 | Live Place Intelligence | PLANNED | `PARTIAL_RUNTIME`: photo/rating metadata; no trusted live hours/status contract | P4 |
| 5 | Live Event Intelligence | PLANNED | `PLANNED` | P4 |
| 6 | Feasibility / Constraint Engine | PLANNED | `PLANNED` | P5 |
| 7 | Route-Aware Generation | IMPLEMENTED / PLANNED | `PARTIAL_RUNTIME`: OSRM display route exists; no generation optimization | P5 |
| 8 | Weather-Aware Generation | IMPLEMENTED / PLANNED | `PARTIAL_RUNTIME`: Open-Meteo retrieval/display exists; no scheduling engine | P5 |
| 9 | Multi-Stage Trip Refresh | PLANNED | `PLANNED` | P5 |
| 10 | Explainable Itinerary | PLANNED | `PLANNED` | P5 |
| 11 | Reminder Engine | PLANNED | `PLANNED`; Settings switches explicitly have no native alerts | P6 |
| 12 | Geofencing & Arrival | PLANNED | `PLANNED` | P7 |
| 13 | Trip Progress State Engine | PLANNED | `PLANNED` | P6 |
| 14 | Context Engine | PLANNED | `PLANNED` | P7 |
| 15 | Contextual AI | PLANNED | `PLANNED` | P8 |
| 16 | Weather Risk | PLANNED | `PLANNED`; retrieval alone is not risk detection | P7 |
| 17 | Skip / Delay Detection | PLANNED | `PLANNED` | P7 |
| 18 | Dynamic Replanning | PLANNED | `PLANNED` | P8 |
| 19 | Smart Notification Policy | PLANNED | `PLANNED` | P6 |
| 20 | What Now? | PLANNED | `PLANNED` | P8 |
| 21 | Fix My Day | PLANNED | `PLANNED` | P8 |
| 22 | Live Editable Itinerary | PLANNED | `PARTIAL_RUNTIME`: owner-scoped note RPC only | P1/P2 |
| 23 | Itinerary Item Types | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: `travelWorkspace.ts`; schema/RPC/UI absent | P1/P2 |
| 24 | Fixed / Flexible | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: type/helper/test only | P1/P2 |
| 25 | Activity Priority | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: type/helper/test only | P1/P2 |
| 26 | Transport Segment | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: type only | P1/P2 |
| 27 | Accommodation | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: type only | P1/P2 |
| 28 | Contacts and Source Links | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: type only | P1/P2 |
| 29 | Trip Inbox / Booking Import | PLANNED | `PLANNED` | P9 |
| 30 | Trip Idea Import | PLANNED | `PLANNED` | P9 |
| 31 | Expense Tracking | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: types/summarizer test only | P3 |
| 32 | Budget Intelligence | PLANNED | `PLANNED` | P3 |
| 33 | Dual-Currency Display | PLANNED | `DOMAIN_FOUNDATION_ONLY`: money type only; settings currency is local preference | P3 |
| 34 | FX Requirement | PLANNED | `PLANNED` | P3 |
| 35 | Budget Breakdown | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: in-memory local-currency grouping only | P3 |
| 36 | Budget Risk | PLANNED | `PLANNED` | P3/P8 |
| 37 | My Experience | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: private draft type/helper/test only | P10 |
| 38 | My Experience → Future Social | FUTURE | `FUTURE` | P12 |
| 39 | Private vs Public Data | FUTURE | `FUTURE` | P12 |
| 40 | Future Public Review | FUTURE | `FUTURE` | P12/P13 |
| 41 | Future Trip Sharing | FUTURE | `FUTURE` | P12 |
| 42 | Future Social Network | FUTURE | `FUTURE` | P13 |
| 43 | Experience vs Google Reviews | IMPLEMENTED | `PARTIAL_RUNTIME`: provider metadata distinct; no My Experience runtime | Preserve; P10/P12 |
| 44 | Actual Visit Data | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: type only | P10 |
| 45 | Personal Duration Learning | PLANNED | `PLANNED` | P10 |
| 46 | Automatic Trip Journal | PLANNED | `PLANNED` | P10 |
| 47 | Daily / Trip Spending Summary | Domain / Planned | `DOMAIN_FOUNDATION_ONLY`: expense summarizer only | P3/P10 |
| 48 | Smart Packing List | PLANNED | `PLANNED` | P11 |
| 49 | Offline Travel Pack | PLANNED | `PLANNED`: persisted server snapshots are not local offline storage | P11 |
| 50 | Preference Learning | PLANNED | `PLANNED` | P11 |

Khuyến nghị chỉnh sửa `FEATURES.md` trong tương lai: giữ nguyên định hướng đã nêu, nhưng dùng các trạng thái đã đối chiếu phía trên khi tuyên bố implementation—đặc biệt là các model workspace/budget/journal chỉ ở domain; phần OSRM/Open-Meteo hiện có so với lập lịch thông minh; Candidate Discovery chỉ thuộc Explore; và provider metadata khác Live Place Intelligence.

## Cổng triển khai xuyên phase

Mỗi phase implementation chỉ dùng migration forward-only, không bao giờ viết lại migration đã apply, và phải bảo vệ UI cùng provider contract đã được duyệt. Danh sách phải có pagination/filter/sort bị giới hạn; truy cập database cần owner index và không N+1; provider fan-out/image fan-out phải bị giới hạn; request cần cancellation, stale-response guard, retry hữu hạn, safe error và không có render/map-camera fetch loop. Chỉ dùng cache khi có TTL/invalidation/freshness policy rõ ràng; không cache plaintext credentials/tokens. Background location, notification và offline storage cần policy rõ ràng về pin, dung lượng, cleanup và revoke/sign-out.

Các quality gate baseline bắt buộc khi phù hợp:

```powershell
cd mobile
npm run lint
npm run typecheck
npm test -- --runInBand
npx expo-doctor
```

Với Edge Functions có thay đổi: `deno check`, `deno lint`, `deno test`. Với database: migration/contract/RLS owner và cross-user tests; chỉ remote smoke khi cần. Bằng chứng emulator/device Android là bắt buộc cho native notifications, geofencing, background behavior, offline, deep links, maps hoặc location. Chỉ được tuyên bố iOS khi có bằng chứng macOS/Xcode.

## Kế hoạch thực thi theo phase

### [x] FEATURE-P0 — Baseline tính năng sản phẩm và Contract Freeze

**Mục tiêu / lý do:** biến audit này thành feature contract đã được duyệt và có thể kiểm thử, không implementation feature hoặc mở lại Integration.

**Phụ thuộc:** Integration COMPLETE; `FEATURES.md`; roadmap này. **Phạm vi/task:** `FEATURE-P0-T001` audit lại 50 capability claim theo source/remote evidence; `T002` freeze boundary domain, provider, privacy và no-mock; `T003` duyệt ma trận dependency/data ownership. **Ngoài phạm vi:** schema, UI, provider call, migration, motion work.

**Domain/schema; Supabase; mobile; providers:** documentation/contract only; inventory existing tables/RPCs/functions without mutation. **Security/RLS:** freeze JWT, `auth.uid()`, owner and stale-user tests; identify future public projection boundary. **Performance/resilience:** baseline request/fan-out/list/cache measurements only—no performance claim. **UI/Stitch:** current approved screens remain source of truth; no redesign. **Localization/theme/accessibility:** preserve EN/VI, themes, semantic tokens, MaterialIcons, accessibility.

**Kiểm thử / Android / bằng chứng:** inventory source và test, kiểm tra coverage Markdown, `git diff --check`; Android `NOT RUN` cho task chỉ-tài-liệu này. **Điều kiện hoàn thành:** đối chiếu đủ 50 heading; P1 contract được freeze phía dưới; không có source change. **Rủi ro rollback/regression:** tài liệu stale có thể ủy quyền write sai; giảm thiểu bằng cách đọc lại source hiện tại trước P1. **Cổng phase tiếp theo:** user ủy quyền rõ ràng `FEATURE-P1`.

### [x] FEATURE-P1 — Nền tảng Live Editable Travel Workspace

**Mục tiêu / lý do:** thiết lập persisted model owner-scoped an toàn trước khi UI có mutation hoặc planning phụ thuộc vào nó.

**Phụ thuộc:** P0 đã duyệt; trip graph/provenance contract hiện có. **Phạm vi/task:** `FEATURE-P1-T001` version activity-kind, fixed/flexible, priority, status, contacts, links, transport/accommodation và custom-activity validation; `T002` forward migration/RPC command model với ordering invariant; `T003` owner-scoped mutation/repository contract; `T004` migration/RLS/transport tests. **Ngoài phạm vi:** editor hoàn thiện, social, automatic replanning, custom activity chưa verified bị xem như Place.

**Domain/schema:** persist PLACE, CUSTOM_ACTIVITY, RESTAURANT, TRANSPORT, ACCOMMODATION, RESERVATION, NOTE; schedule fields, contacts/source links, and explicit state. Custom activity never requires Google verification; only place-like items can acquire trusted provider provenance. **Supabase:** forward migrations, ownership indexes, SECURITY INVOKER RPCs unless narrowly justified otherwise. **Mobile:** typed validated mapper/repository boundary only. **Providers:** reuse protected Google verification; no fabricated ID/coordinates.

**Security/RLS:** derive owner from `auth.uid()`, validate allowed field-kind combinations, test owner/cross-user/stale-user/forged provider fields. **Performance/resilience:** transactionally preserve contiguous positions; avoid whole-day rewrite races using version/concurrency strategy; bounded payloads. **UI/Stitch:** no redesign before approved editing states. **Localization/theme/accessibility:** define message keys and accessible semantic labels.

**Kiểm thử / Android / bằng chứng:** migration upgrade/fresh tests, RPC/RLS matrix, repository/mapper tests; Android chưa là acceptance. **Điều kiện hoàn thành:** nền tảng persisted owner-safe không chỉ là domain claim. **Rủi ro rollback/regression:** graph migration có thể phá read hiện có—xác minh backward mapper và provider provenance. **Cổng phase tiếp theo:** migration/RLS và contract evidence của P1 PASS.

#### [x] FEATURE-P1-T001 — Contract domain và validation Workspace

**Trạng thái:** COMPLETE — chỉ documentation/contract. Task này freeze requirement cho `FEATURE-P1-T002`; không thêm migration, RPC, repository mutation, Edge Function, UI hoặc test.

- [x] FEATURE-P1-T001-S001 — Audit LIVE LOCAL schema, provenance, repository, contract và test boundary.
- [x] FEATURE-P1-T001-S002 — Freeze semantics bảy item kinds, field/kind validation matrix, fixed/flexible, priority và lifecycle.
- [x] FEATURE-P1-T001-S003 — Freeze compatibility legacy, ordering/concurrency, provider protection và security test requirements.

##### Checklist hoàn thành

- [x] Domain contract, validation matrix, legacy strategy và provider ownership không còn blocker cho T002.

##### Baseline LIVE LOCAL dùng cho contract này

- Persisted graph hiện tại là `trips → itinerary_days → itinerary_items`. `itinerary_days.day_number` và `itinerary_items.position` dương, unique theo parent; detail hiện tại sắp xếp cả hai một cách deterministic.
- Tạo graph hiện tại chỉ nhận historical place-shaped item payload. `SavedTripItem` là read model phân biệt `UNRESOLVED | VERIFIED`; provider field chỉ được emit cho item `VERIFIED`.
- `place_resolved_at` là server provenance marker. Provenance trigger chặn insert/update bởi authenticated/anon đối với Google ID, tọa độ, address, category, marker và đổi tên trên verified item. `apply_verified_place_snapshot` chỉ dành cho service-role và protected resolver derive owner từ JWT.
- Saved-trip capability có thể ghi hiện tại cố ý chỉ giới hạn ở `update_itinerary_item_note` owner-scoped; `SupabaseSavedTripsRepository` expose note mutation cùng list/detail/delete. Không có item-kind, schedule, ordering, status, transport, accommodation, contact, link, expense, journal hoặc social mutation.
- `travelWorkspace.ts` chỉ có domain union/helper lower-case. `mobile/tests/travel-workspace.test.ts` kiểm thử các helper đó; đây không phải persistence hay Android evidence.

##### Domain workspace canonical

Wire/TypeScript values remain lower-case and map losslessly to the following canonical names: `place` ↔ `PLACE`, `custom_activity` ↔ `CUSTOM_ACTIVITY`, `restaurant` ↔ `RESTAURANT`, `transport` ↔ `TRANSPORT`, `accommodation` ↔ `ACCOMMODATION`, `reservation` ↔ `RESERVATION`, and `note` ↔ `NOTE`.

| Kind | Frozen semantics | Place/provenance rule |
|---|---|---|
| PLACE | Activity dạng địa điểm có provider backing, hoặc gợi ý địa điểm unresolved do user duyệt đang chờ verification. | Verified snapshot field chỉ được tạo/refresh qua protected resolver. PLACE unresolved có thể giữ `place_query` nhưng không được bịa identity hoặc tọa độ. |
| CUSTOM_ACTIVITY | Activity free-form do user tạo như nghỉ ngơi, mua SIM, thuê xe máy hoặc ghi chú check-in khách sạn. | Không bao giờ cần Google verification. Tọa độ vắng mặt trừ khi future user-location contract riêng được ủy quyền; P1 không được bịa để render map marker. |
| RESTAURANT | Activity ăn uống dạng place-like. Có thể bắt đầu unresolved từ query user/Gemini, sau đó provider-verified qua protected resolver giống PLACE. | Gemini output chỉ là candidate. Provider field tuân theo rule PLACE; dữ liệu restaurant unresolved không phải map/route/geofence truth. |
| TRANSPORT | Đoạn itinerary user-owned, không phải booking/ticketing system. | Không cần Google verification. Nó sở hữu transport detail có cấu trúc và có thể tham chiếu estimated/planned cost tương lai, nhưng P1 không tạo expense ledger. |
| ACCOMMODATION | Item itinerary lưu trú/check-in/check-out user-owned, không phải hotel booking. | Optional place identity có thể được verify qua protected resolver; reservation/contact/link fact vẫn user-owned cho đến khi được verify độc lập. |
| RESERVATION | Bản ghi local user-owned cho booking/reservation context. | Không marketplace, payment hoặc provider booking mutation. Có thể link eligible verified place nhưng không biến booking metadata thành provider truth. |
| NOTE | Item thông tin user-owned. | Không bao giờ cần Places verification và không thể mang provider snapshot field hoặc tọa độ bịa. |

##### Fixed / flexible, priority và trạng thái activity

| Field contract | Giá trị canonical | Default an toàn cho legacy | Hành vi đã freeze |
|---|---|---|---|
| Flexibility | `FIXED`, `FLEXIBLE` | `FIXED` | FIXED is protected from automatic rescheduling. FLEXIBLE is only eligible for a future P5/P8 planning candidate; P1 never moves any item and P2 is the future manual-edit owner. |
| Priority | `MUST_DO`, `WANT_TO_DO`, `OPTIONAL` | `MUST_DO` | Itinerary legacy đã accept được bảo vệ theo hướng thận trọng. Constraint/replanning tương lai bảo vệ MUST_DO; priority không bao giờ đổi provider provenance. |
| Activity status | `SCHEDULED`, `COMPLETED`, `SKIPPED` | `SCHEDULED` | User-driven only. Valid state changes are `SCHEDULED → COMPLETED`, `SCHEDULED → SKIPPED`, `COMPLETED → SCHEDULED`, and `SKIPPED → SCHEDULED`; direct COMPLETED ↔ SKIPPED is forbidden and must be corrected through SCHEDULED. |

Nếu T002 persist status timestamp, `completed_at` chỉ được đặt khi `SCHEDULED → COMPLETED`, `skipped_at` chỉ khi `SCHEDULED → SKIPPED`, cả hai bị xóa khi trở về SCHEDULED và không bao giờ cùng tồn tại. Timestamp này biểu thị explicit user action, không phải physical arrival. `ARRIVED` không bao giờ được P1 suy ra hoặc persist; arrival/geofencing thuộc FEATURE-P7.

##### Metadata có cấu trúc và giới hạn

These are contract-level limits for T002 validation; they do not alter the current TypeScript type or database today.

| Structure | Frozen contract |
|---|---|
| Contact | Object optional: `name` 1–120 ký tự đã trim; `phone` 1–64 ký tự đã trim chỉ chứa tập ký tự điện thoại bảo thủ (`+`, chữ số, space, `-`, `(`, `)`, `.`); `address` 1–500; `websiteUrl` và `bookingUrl` là URL `https:` tuyệt đối hợp lệ tối đa 2.048 ký tự; `reservationCode` opaque 1–128. Dữ liệu contact là private/user-owned, không được chứa payment credential. |
| Source link | Danh sách optional có giới hạn, tối đa 12 mỗi item. Type chính xác là `google_maps`, `facebook`, `instagram`, `tiktok`, `website`, `booking` hoặc `other`; URL chỉ là `https:` tuyệt đối và ≤2.048 ký tự; label optional 1–120. `other` vẫn cần HTTPS URL an toàn và label. Cấm URL `javascript:`, `data:`, `file:`, `intent:`, relative và thiếu scheme. |
| Transport details | Chỉ bắt buộc cho TRANSPORT: `mode` là một trong `walk`, `drive`, `transit`, `bus`, `train`, `flight`, `motorbike`, `ferry`, `other`; `transit` nghĩa là public transit. Optional origin/destination label có giới hạn (1–160), operator (1–160), cặp departure/arrival ISO timestamp, contact và source link. Nếu có một transport timestamp thì bắt buộc có cả hai và arrival không được trước departure. Planned-cost reference optional user-owned có thể mang amount không âm cùng currency ISO 4217, nhưng chưa là expense hoặc budget calculation đến P3. |
| Accommodation details | Chỉ bắt buộc cho ACCOMMODATION dưới dạng object có cấu trúc; optional check-in/check-out ISO timestamp phải đi thành cặp và check-out sau check-in; optional `nights` là số nguyên 0–365 và, khi có cả hai ngày, phải khớp calendar-night calculation. Contact/source link dùng cấu trúc chung. Eligible place identity optional vẫn tuân theo protected resolver rule. |
| Reservation details | User-owned bounded reservation code/contact/source-link and schedule context only. P1 never validates a booking with a third party, stores payment data, or creates a purchase/payment flow. |
| Note/text | `note` hiện có vẫn optional, trim và ≤500 ký tự. Required display text của NOTE item nằm trong field `place_name` tương thích legacy; đây là user-owned text, không phải provider identity. |

**Rà soát thiếu hụt type hiện tại:** `TransportDetails` hiện thiếu contact/source-link và planned-cost reference; `AccommodationDetails` thiếu contact/source-link và optional verified-place association. Các field này được freeze cho transport/domain evolution của T002, nhưng T001 không sửa `travelWorkspace.ts` chỉ để type hiện tại trông đầy đủ.

##### Ma trận tương thích field / kind

Chú giải: **R** là required user-owned field; **O** là optional user-owned field; **F** là forbidden; **VSO** là verified-server-only, chỉ eligible qua protected resolver; **C** là conditional theo quy định bên dưới. `place_name` là display field non-null hiện có, được giữ để tương thích ngược. Với item đang VERIFIED, `place_name` cũng là provider snapshot data được bảo vệ và general user mutation không được ghi đè.

| Field | PLACE | CUSTOM_ACTIVITY | RESTAURANT | TRANSPORT | ACCOMMODATION | RESERVATION | NOTE |
|---|---|---|---|---|---|---|---|
| `place_name` / display text | R | R | R | R | R | R | R |
| `place_query` | O | F | O | F | O | F | F |
| Google Place ID | VSO | F | VSO | F | VSO | F | F |
| coordinates | VSO | F | VSO | F | VSO | F | F |
| provider address/category/provenance | VSO | F | VSO | F | VSO | F | F |
| schedule start/end | O | O | O | C | O | O | F |
| flexibility | R | R | R | R | R | R | R |
| priority | R | R | R | R | R | R | R |
| activity status | R | R | R | R | R | R | R |
| transport metadata | F | F | F | R | F | F | F |
| accommodation metadata | F | F | F | F | R | F | F |
| contacts | O | O | O | O | O | O | O |
| source links | O | O | O | O | O | O | O |
| note/text | O | O | O | O | O | O | O |

`C` với TRANSPORT nghĩa là generic item schedule vắng mặt hoặc khớp chính xác với cặp departure/arrival bắt buộc; T002 phải từ chối duplicate time mâu thuẫn. Với mọi place-like kind, `VSO` bị cấm trong general client edit command kể cả khi item hiện có các giá trị đó. PLACE/RESTAURANT/ACCOMMODATION unresolved có thể có `place_name` và `place_query` nhưng không có provider ID, tọa độ, verified address/category hoặc provenance timestamp.

##### Freeze tương thích ngược, ordering và concurrency

1. Legacy rows are read as `PLACE + FIXED + MUST_DO + SCHEDULED` only at the new-domain interpretation boundary; T002 must make this explicit via nullable/default-safe additions so existing database rows and current `SavedTripItem` parsing remain readable before any backfill.
2. Semantics `UNRESOLVED` hiện có vẫn hợp lệ: vắng provider field/provenance không phải lỗi và không được auto-resolve. Verified snapshot field hiện có cùng `place_resolved_at` giữ nguyên ý nghĩa được bảo vệ.
3. Không viết lại migration đã apply. Hành vi `list_saved_trips`, `get_saved_trip_detail`, generate/persist graph, Trip Detail, Trip Map và note mutation hiện có phải contract-compatible; mọi extension phải additive và omitted/null-safe cho legacy read.
4. `day_number` vẫn deterministic; `position` vẫn deterministic và contiguous trong một ngày. Future reorder/cross-day move phải atomic và không được dùng shortcut full delete/reinsert làm đổi item ID, mất provenance hoặc làm yếu identity.
5. T002 phải chọn và ghi nhận optimistic version/conflict mechanism rõ ràng (hoặc server conflict detection tương đương có thể chứng minh) tại trip/day mutation scope phù hợp. Stale client phải nhận safe conflict/refetch outcome, không bao giờ silent overwrite state mới hơn.

##### Contract bảo mật và kiểm thử implementation bắt buộc trong tương lai

T002–T004 phải thêm/chạy test cho: owner read; owner mutation; cross-user mutation bị chặn; stale-user mutation bị chặn; anonymous bị chặn; client-supplied owner/owner-like field bị từ chối; Google ID/tọa độ/address/category/provenance giả bị từ chối; kind/field pair không hợp lệ bị từ chối; status transition không hợp lệ bị từ chối; ordering invalid/duplicate/non-contiguous bị từ chối; graph/contact/link payload quá dài bị từ chối; URL scheme không an toàn bị từ chối; provider snapshot không đổi bởi general edit; và safe sanitized error mapping không lộ SQL, provider body, token hoặc secret. Mọi write path tương lai vẫn JWT + `auth.uid()` + RLS owner-scoped; authenticated không đồng nghĩa authorized.

##### Xác minh T001 và cổng tiếp theo

- [x] All seven kinds have frozen semantics and provider applicability.
- [x] Fixed/flexible, priority, lifecycle/defaults/transitions are frozen.
- [x] Structured metadata limits and complete field/kind matrix are frozen.
- [x] Legacy and provenance compatibility, ordering, and stale-write requirements are frozen.
- [x] No migration-design semantic blocker remains for T002.
- [x] No production/test/migration/remote change was made by T001.

`FEATURE-P1-T002 = READY_FOR_EXPLICIT_USER_AUTHORIZATION` — it is not started by this task.

### [ ] FEATURE-P2 — Runtime Workspace production

**Mục tiêu / lý do:** biến Trip Detail thành workspace live an toàn thay vì chủ yếu chỉ trình bày read-only.

**Phụ thuộc:** P1. **Phạm vi/task:** `FEATURE-P2-T001` add/edit và đổi thời gian; `T002` reorder/move-day với conflict feedback; `T003` skip/complete và note mutation; `T004` form transport/accommodation/contact/link; `T005` remote refresh và Android evidence. **Ngoài phạm vi:** automatic planning/replanning, expense ledger (P3), social sharing.

**Domain/schema:** sử dụng semantics activity của P1 và bảo toàn trusted snapshot bất biến. **Supabase:** mutation đã validate theo phạm vi owner, với thao tác đổi position/ngày atomic. **Mobile:** hook Trip Detail/Planner, cancellation, optimistic UI chỉ khi có rollback, không fallback về fixture. **Provider:** chỉ Google verification khi người dùng chọn một place; luồng custom item vẫn không phụ thuộc provider.

**Bảo mật/RLS:** authorization theo owner cho từng item thông qua trip graph; không bao giờ nhận owner/user ID từ mobile; lỗi an toàn. **Hiệu năng/khả năng phục hồi:** debounce/serialize thao tác lưu, hủy race, danh sách có giới hạn, không refresh N+1. **UI/Stitch:** trạng thái tạo/sửa cần Stitch audit hiện hành hoặc state được duyệt rõ ràng; không tự thay thế thẩm mỹ. **Địa phương hóa/theme/accessibility:** validation EN/VI, theme token, control 44dp, trạng thái cho screen reader.

**Kiểm thử / Android / bằng chứng:** component/repository/RLS regression cùng Android evidence add/edit/reorder/move/skip/complete/reopen trên real data. **Điều kiện hoàn thành:** đủ bảy kind và các mutation đã liệt kê hoạt động end-to-end owner-safe. **Rủi ro rollback/regression:** ordering và mất stale mutation; phải chứng minh retry/conflict behavior. **Cổng phase tiếp theo:** P2 Android và regression matrix PASS.

### [ ] FEATURE-P3 — Trí tuệ chi phí và ngân sách

**Mục tiêu / lý do:** làm thông tin expense và budget bền vững, đáng tin cậy trước khi companion advice sử dụng.

**Phụ thuộc:** P1; P2 chỉ cho optional attachment UI. **Phạm vi/task:** `FEATURE-P3-T001` expense ledger/categories/origins/attachments; `T002` estimated-versus-actual và breakdown; `T003` home/destination currency cùng FX quote provenance; `T004` budget risk; `T005` UI/runtime verification. **Ngoài phạm vi:** payment, booking transaction, splitting, silent home-budget replacement.

**Domain/schema:** home budget gốc bất biến; các expense row planned/actual/unplanned, phân bổ theo ngày/category, hiển thị local/home và quote record `{source,destination,rate,provider,quotedAt,freshness}`. **Supabase:** RLS theo owner, index theo trip/date/category/item, RPC/projection tổng hợp. **Mobile:** quick-expense và UI xử lý FX unavailable một cách an toàn. **Provider:** chọn/review FX provider đáng tin cậy; Gemini không bao giờ là nguồn sự thật FX.

**Bảo mật/RLS:** expense là private, chỉ owner, input decimal/currency/time phải validate; không dùng service-role ở client. **Hiệu năng/khả năng phục hồi:** ledger phân trang, tổng hợp ở server, cache FX có nhãn freshness/TTL, không khuếch đại retry; mất FX không được chặn trip. **UI/Stitch:** dùng ngôn ngữ trực quan budget đã được duyệt; không dùng rate giả. **Địa phương hóa/theme/accessibility:** định dạng tiền tệ theo locale, giá trị kép và freshness của rate có thể truy cập.

**Kiểm thử / Android / bằng chứng:** accounting/rounding, RLS A/B, FX unavailable, ledger pagination, Android quick-add và refresh. **Điều kiện hoàn thành:** expense được persist thật và budget risk dual-currency trung thực. **Rủi ro rollback/regression:** money precision và rate staleness; giữ nguyên original amount/rate. **Cổng phase tiếp theo:** P3 data, provider, Android evidence PASS.

### [ ] FEATURE-P4 — Candidate và Live Intelligence

**Mục tiêu / lý do:** cung cấp factual input đáng tin cậy, có giới hạn cho deterministic planning ở phase sau.

**Phụ thuộc:** P0; Google verification baseline. **Phạm vi/task:** `FEATURE-P4-T001` candidate discovery contract/ranking input; `T002` live place hours/business status/provenance; `T003` event provider và temporal/location validation; `T004` cache/freshness/error policy; `T005` review UI. **Ngoài phạm vi:** Gemini factual truth, autonomous insertion, itinerary optimization.

**Domain/schema:** provenance/freshness của candidate và quan sát từ provider, không ingest POI toàn cục không giới hạn. **Supabase:** provider proxy chứa secret, DTO chuẩn hóa và dữ liệu candidate đã lưu theo owner chỉ khi được duyệt. **Mobile:** trạng thái discovery/review phân trang, cancellation và trạng thái rỗng/lỗi. **Provider:** Google chỉ cho các trường được phép; nguồn event đã thẩm định; mọi dữ liệu vẫn truy nguyên được nguồn.

**Bảo mật/RLS:** dùng JWT khi tham chiếu dữ liệu người dùng, cô lập secret, whitelist input provider và không nhận URL tùy ý. **Hiệu năng/khả năng phục hồi:** giới hạn số lần gọi/trường/kết quả từ provider, TTL/invalidation, giới hạn image fan-out, không tạo camera-fetch loop. **UI/Stitch:** các state Explore/Place hiện hành vẫn là authority. **Địa phương hóa/theme/accessibility:** địa phương hóa status/freshness an toàn mà không dịch sai fact của provider.

**Kiểm thử / Android / bằng chứng:** function contract/provider parser/timeout test, no-fake data audit, Android discovery/details state. **Điều kiện hoàn thành:** trusted candidate/live fact có thể review nhưng không silently persist. **Rủi ro rollback/regression:** quota, stale hours/events, source mismatch. **Cổng phase tiếp theo:** P4 provider provenance/freshness evidence PASS.

### [ ] FEATURE-P5 — Lập kế hoạch thông minh nhận thức constraint

**Mục tiêu / lý do:** chuyển các input đáng tin cậy thành lịch trình khả thi, có thể giải thích, đồng thời giữ quyền kiểm soát của người dùng.

**Phụ thuộc:** P1, P3, P4 và behavior OSRM/Open-Meteo đã được chấp nhận. **Phạm vi/task:** `FEATURE-P5-T001` constraint deterministic; `T002` clustering và tối ưu route/time; `T003` rule nhận thức weather; `T004` refresh/diff đa giai đoạn; `T005` output có thể giải thích và xác nhận. **Ngoài phạm vi:** companion chạy nền, mutation im lặng lên plan đã xác nhận, factual data bịa đặt.

**Domain/schema:** snapshot constraint/result/version/reason và semantics `MUST_DO`/`FIXED` được bảo vệ. **Supabase:** chỉ điều phối phía server khi secret hoặc persistence yêu cầu; refresh được persist phải explicit/idempotent. **Mobile:** review diff/accept/reject và trạng thái an toàn không thay đổi. **Provider:** OSRM cung cấp route metric, Open-Meteo cung cấp weather, provider P4 cung cấp fact, Gemini chỉ tổng hợp phần giải thích.

**Bảo mật/RLS:** input/output theo phạm vi owner, không rò rỉ giữa trip, validation transport nghiêm ngặt. **Hiệu năng/khả năng phục hồi:** batch/cache các lời gọi route/weather có giới hạn, cancellation, giảm cấp về plan thiếu rõ ràng; không tuyên bố cải thiện định lượng nếu không có số đo đối chứng. **UI/Stitch:** thay đổi planner cần state hiện hành được duyệt. **Địa phương hóa/theme/accessibility:** lý do được địa phương hóa cùng provenance/freshness và thay đổi có thể truy cập.

**Kiểm thử / Android / bằng chứng:** kiểm thử constraint deterministic, provider failure, item được bảo vệ, owner/RLS, luồng Android generated→review→confirm. **Điều kiện hoàn thành:** nhận thức route/weather phải là scheduling, không chỉ retrieval. **Rủi ro rollback/regression:** thay đổi route/weather và refresh conflict; dùng diff/undo có version. **Cổng phase tiếp theo:** bằng chứng feasibility/explanation/runtime P5 PASS.

### [ ] FEATURE-P6 — Engine tiến độ chuyến đi và nhắc nhở

**Mục tiêu / lý do:** tạo state machine và notification policy có giới hạn trước behavior được kích hoạt bởi location.

**Phụ thuộc:** P2, P5. **Phạm vi/task:** `FEATURE-P6-T001` progress state/event; `T002` schedule `TRIP_STARTING_SOON`, `DAY_STARTING`, `PLACE_UPCOMING`, `LEAVE_SOON`, `LATE_RISK`; `T003` policy/preference opt-in; `T004` lifecycle local notification. **Ngoài phạm vi:** geofencing (P7), xử lý nền không kiểm soát, hạ tầng push trừ khi được duyệt riêng.

**Domain/schema:** record reminder/event idempotent và consent/preference notification của người dùng. **Supabase:** dữ liệu policy theo phạm vi owner; chỉ schedule ở server khi cần và có giới hạn chi phí. **Mobile:** UX permission explicit, schedule/cancel/reconcile cục bộ khi edit/sign-out. **Provider:** fact route/weather chỉ đến từ nguồn đã được chấp nhận.

**Bảo mật/RLS:** consent là private và có thể thu hồi; không bao giờ gửi chi tiết itinerary nhạy cảm qua kênh notification không an toàn. **Hiệu năng/khả năng phục hồi:** dedupe, giới hạn, expiry, cancellation, timezone/DST chính xác và không tạo retry storm. **UI/Stitch:** switch Settings chỉ ngừng là UI-only sau khi có state mapping được duyệt. **Địa phương hóa/theme/accessibility:** nội dung notification được địa phương hóa, control Settings theme/a11y.

**Kiểm thử / Android / bằng chứng:** kiểm thử scheduler/state và bằng chứng Android vật lý về permission, delivery, edit/cancel, reboot/behavior nền. **Điều kiện hoàn thành:** reminder là opt-in, có giới hạn, chính xác và hủy được. **Rủi ro rollback/regression:** thông báo trùng/muộn và quyền riêng tư notification. **Cổng phase tiếp theo:** bằng chứng native Android P6 PASS.

### [ ] FEATURE-P7 — Đồng hành vị trí và ngữ cảnh

**Mục tiêu / lý do:** chỉ thêm tín hiệu arrival và context theo nguyên tắc privacy-first sau khi đã có policy và semantics itinerary.

**Phụ thuộc:** P2, P5, P6. **Phạm vi/task:** `FEATURE-P7-T001` consent location explicit và lifecycle geofence; `T002` capture `ARRIVED`/actual visit; `T003` phát hiện weather risk và skip/delay; `T004` context engine có giới hạn. **Ngoài phạm vi:** theo dõi liên tục, chia sẻ location lên social, replanning tự động.

**Domain/schema:** consent, đăng ký geofence, dữ liệu event/actual-visit tối thiểu kèm policy retention/deletion. **Supabase:** đồng bộ event chỉ cho owner; event local-first chỉ upload theo contract explicit. **Mobile:** permission của OS, giới hạn background, thay thế/dọn dẹp geofence và UI battery. **Provider:** chỉ dùng OSRM/Open-Meteo đã được chấp nhận; không có tọa độ giả.

**Bảo mật/RLS:** tối thiểu hóa dữ liệu, giới hạn mục đích, truy cập chỉ cho owner, precise location không bao giờ public mặc định. **Hiệu năng/khả năng phục hồi:** giới hạn số lượng/bán kính geofence, chiến lược significant-event, theo dõi battery/storage, cancellation và không tạo location loop. **UI/Stitch:** dùng state đã duyệt hoặc xin design được duyệt. **Địa phương hóa/theme/accessibility:** giải thích consent/risk rõ ràng bằng EN/VI.

**Kiểm thử / Android / bằng chứng:** kiểm thử simulation/unit cùng bằng chứng Android thực về permission foreground/background, arrival, denial, revoke, battery và cleanup. **Điều kiện hoàn thành:** behavior companion privacy-first có giới hạn. **Rủi ro rollback/regression:** khác biệt OS, hao pin, geofence stale. **Cổng phase tiếp theo:** bằng chứng native runtime/privacy P7 PASS.

### [ ] FEATURE-P8 — Hỗ trợ động

**Mục tiêu / lý do:** cung cấp hỗ trợ do người dùng kiểm soát sau khi context và constraint đáng tin cậy đã tồn tại.

**Phụ thuộc:** P3, P5, P6, P7. **Phạm vi/task:** `FEATURE-P8-T001` contract từ context event đến recommendation; `T002` Dynamic Replanning; `T003` What Now?; `T004` Fix My Day; `T005` giải thích AI theo context và xác nhận của người dùng. **Ngoài phạm vi:** edit tự động, tự tăng budget, recommendation không đáng tin cậy.

**Domain/schema:** record audit recommendation/run/version/decision; bảo vệ `FIXED`/`MUST_DO`. **Supabase:** orchestration authenticated theo phạm vi owner và rate limit. **Mobile:** luồng explain/review/apply/reject/undo, hủy response stale. **Provider:** engine deterministic quyết định feasibility; Gemini chỉ giải thích/tổng hợp.

**Bảo mật/RLS:** không có quyết định ẩn trên dữ liệu người dùng, lỗi an toàn và tối thiểu hóa prompt. **Hiệu năng/khả năng phục hồi:** giới hạn generation/provider fan-out, dedupe context giống nhau, cancellation và trạng thái unavailable. **UI/Stitch:** state assistant mới cần source được duyệt. **Địa phương hóa/theme/accessibility:** tóm tắt lý do và tác động có thể truy cập bằng EN/VI.

**Kiểm thử / Android / bằng chứng:** bằng chứng protected-item, refusal, undo, budget-risk, provider failure và xác nhận người dùng trên Android. **Điều kiện hoàn thành:** hỗ trợ có thể giải thích, opt-in và đảo ngược được. **Rủi ro rollback/regression:** suggestion gây hại/lỗi thời; bắt buộc preview/version guard. **Cổng phase tiếp theo:** ma trận safety/runtime P8 PASS.

### [ ] FEATURE-P9 — Nhập và trích xuất

**Mục tiêu / lý do:** chuyển material do người dùng cung cấp thành candidate đã review, không bao giờ thành fact tự động.

**Phụ thuộc:** P1, P4, P5. **Phạm vi/task:** `FEATURE-P9-T001` metadata Trip Inbox/upload; `T002` extraction PDF/image/screenshot/text; `T003` validation candidate booking (flight/hotel/train/etc.); `T004` import idea → place verification; `T005` review/xác nhận explicit/persist. **Ngoài phạm vi:** ingest credential mailbox, booking tự động, mutation trip tự động, lưu raw file nhạy cảm vĩnh viễn khi không có policy.

**Domain/schema:** lifecycle source file, candidate/confidence extraction, audit validation/review/confirmation. **Supabase:** object storage private/RLS/signed access và boundary extraction Edge Function. **Mobile:** tiến độ picker/capture/upload, state review và lỗi. **Provider:** Gemini extraction có cấu trúc; Google xác minh các place candidate áp dụng được.

**Bảo mật/RLS:** input private, giới hạn malware/content/size, không log secret, control retention/deletion, authorization owner. **Hiệu năng/khả năng phục hồi:** job async/có giới hạn, design sẵn sàng cho queue, upload có thể tiếp tục, quota và không chặn UI. **UI/Stitch:** cần state Inbox/review được duyệt. **Địa phương hóa/theme/accessibility:** upload/review có thể truy cập và validation được địa phương hóa.

**Kiểm thử / Android / bằng chứng:** kiểm thử parser adversarial, storage RLS, cô lập A/B, cancellation, review-required và luồng picker/camera/document Android. **Điều kiện hoàn thành:** input → extraction candidate → validation → verification khi áp dụng → user review → explicit confirm → persist. **Rủi ro rollback/regression:** extraction hallucinated hoặc retention dữ liệu nhạy cảm. **Cổng phase tiếp theo:** bằng chứng security và Android P9 PASS.

### [ ] FEATURE-P10 — Nhật ký du lịch riêng tư và học hỏi

**Mục tiêu / lý do:** chuyển dữ liệu actual trip private thành lịch sử cá nhân hữu ích mà không biến nó thành social.

**Phụ thuộc:** P2, P3, P7. **Phạm vi/task:** `FEATURE-P10-T001` My Experience/rating/review/tips/visit date private; `T002` actual arrival/departure/duration; `T003` daily journal/trip summary/tóm tắt favorite/skipped; `T004` personal duration learning; `T005` projection spending theo ngày/trip. **Ngoài phạm vi:** hiển thị public, social feed, expose private notes/expenses.

**Domain/schema:** experience private, note private, actual visit, journal summary và aggregate cá nhân có thể giải thích; future photo chỉ sau khi có storage policy. **Supabase:** table/index RLS private và projection gọn. **Mobile:** control journal private-first và correction. **Provider:** không cần provider cho fact do người dùng tạo; giữ phân biệt với Google review.

**Bảo mật/RLS:** private mặc định không thể đổi chỉ bằng một boolean thông thường; export/deletion chỉ cho owner và cô lập stale-user. **Hiệu năng/khả năng phục hồi:** aggregate tăng dần, journal phân trang, không scan toàn bộ history; derived view local invalidation an toàn. **UI/Stitch:** cần xin state journal được duyệt. **Địa phương hóa/theme/accessibility:** date/duration/currency được địa phương hóa và ngôn ngữ private-state có thể truy cập.

**Kiểm thử / Android / bằng chứng:** bằng chứng privacy/RLS/deletion, duration calculation, summary và Android create/edit/reopen. **Điều kiện hoàn thành:** personal journal private và hữu ích; chỉ riêng type `MyExperience` không còn được coi là runtime hoàn chỉnh. **Rủi ro rollback/regression:** rò rỉ privacy hoặc aggregate hỏng. **Cổng phase tiếp theo:** bằng chứng private-data P10 PASS.

### [ ] FEATURE-P11 — Offline và tiện ích du lịch

**Mục tiêu / lý do:** tạo tiện ích du lịch explicit, có khả năng phục hồi mà không tuyên bố dữ liệu server đã là offline.

**Phụ thuộc:** P2, P3, P5, P6, P10. **Phạm vi/task:** `FEATURE-P11-T001` design/encryption/size policy cho local offline pack; `T002` download/version/evict itinerary, trusted place, note, booking, essential image, expense, private journal, local reminder; `T003` behavior offline an toàn; `T004` packing list; `T005` preference learning private có thể giải thích. **Ngoài phạm vi:** AI/latest weather/events/FX/fresh route offline, sync nền không giới hạn.

**Domain/schema:** chiến lược persistence local được mã hóa cùng pack manifest/version/checksum/freshness; domain packing/preference. **Supabase:** manifest package theo owner/metadata sync chỉ khi cần. **Mobile:** lifecycle database/file local, chuyển trạng thái network, wipe khi sign-out/account-delete. **Provider:** nhãn online-only cho AI/weather/events/FX/route.

**Bảo mật/RLS:** dữ liệu private local được mã hóa/tối thiểu hóa, không chia sẻ pack, wipe/revoke an toàn. **Hiệu năng/khả năng phục hồi:** giới hạn download, sync có thể tiếp tục và có giới hạn, eviction/storage budget, không crash khi offline. **UI/Stitch:** indicator/state offline cần mapping được duyệt. **Địa phương hóa/theme/accessibility:** thông điệp freshness/online-only rõ ràng bằng EN/VI.

**Kiểm thử / Android / bằng chứng:** bằng chứng storage migration, airplane-mode, pack hỏng, wipe khi sign-out, low-storage, Android navigation/reminder offline. **Điều kiện hoàn thành:** persistence local thực và tính năng online-only unavailable được xử lý an toàn. **Rủi ro rollback/regression:** dữ liệu stale/private còn lại trên thiết bị. **Cổng phase tiếp theo:** bằng chứng Android offline/storage P11 PASS.

### [ ] FEATURE-P12 — Nền tảng social opt-in

**Mục tiêu / lý do:** thiết lập public projection riêng, an toàn trước khi có bất kỳ bề mặt đọc social nào.

**Phụ thuộc:** P10, P11. **Phạm vi/task:** `FEATURE-P12-T001` contract publish/unpublish explicit; `T002` projection experience/review/photo/tip public-safe; `T003` chia sẻ trip private/unlisted/public và day/experience được chọn; `T004` security/revocation của link unlisted; `T005` policy moderation/reporting. **Ngoài phạm vi:** publish mặc định, expose private notes/expenses/credentials/owner metadata, follow/feed/comments.

**Domain/schema:** private source vẫn tách biệt; published projection, asset được chọn, share slug/visibility/revocation — không phải boolean trên private journal row. **Supabase:** public read model/RLS riêng biệt và chỉ dùng service role với phạm vi thận trọng nếu không thể tránh. **Mobile:** review explicit từng field được expose và UI revoke/share. **Provider:** không republish Google review/rating do provider sở hữu thành social content của TripWise.

**Bảo mật/RLS:** consent explicit, allowlist projection, control abuse, rate limit, boundary asset signed/private. **Hiệu năng/khả năng phục hồi:** query public projection có index/phân trang/cache được cùng invalidation an toàn. **UI/Stitch:** cần state social/share được duyệt. **Địa phương hóa/theme/accessibility:** giải thích privacy và control visibility có thể truy cập.

**Kiểm thử / Android / bằng chứng:** ma trận projection redaction, A/B owner/public/unlisted/revoked, bằng chứng Android publish/revoke/share. **Điều kiện hoàn thành:** private vẫn là mặc định và public view chỉ thấy projection được chọn. **Rủi ro rollback/regression:** rò rỉ privacy không thể đảo ngược; dùng preview/revoke/audit. **Cổng phase tiếp theo:** security review và bằng chứng runtime P12 PASS.

### [ ] FEATURE-P13 — Mạng xã hội du lịch

**Mục tiêu / lý do:** cung cấp lớp social discovery tùy chọn ở cuối, sau khi privacy projection đã được chứng minh.

**Phụ thuộc:** P12. **Phạm vi/task:** `FEATURE-P13-T001` public profile/follow; `T002` discovery/search; `T003` likes/comments/report/moderation; `T004` save place của người khác/copy itinerary/fork trip; `T005` AI customize một shared trip với xác nhận người dùng. **Ngoài phạm vi:** marketplace, payment, expose bản gốc, copy field bị hạn chế, follow/import tự động.

**Domain/schema:** public profile, follow graph, engagement/moderation, provenance fork và copied-trip graph an toàn. **Supabase:** public read projection, RLS write authenticated, phân trang/index/rate limit. **Mobile:** discovery, report, review copy/fork và tạo destination private. **Provider:** factual place được copy phải giữ/refresh trusted provenance; Gemini chỉ customize sau deterministic validation.

**Bảo mật/RLS:** control block/private/report, chống enumeration, xử lý lạm dụng content, không có metadata private trong public endpoint. **Hiệu năng/khả năng phục hồi:** feed/search theo keyset, tránh fan-out, cache invalidation và giới hạn notification. **UI/Stitch:** lấy social design hiện hành đã được duyệt; không suy diễn thành redesign. **Địa phương hóa/theme/accessibility:** moderation/consent được địa phương hóa và control social có thể truy cập.

**Kiểm thử / Android / bằng chứng:** public/private projection, abuse follow/block/comment, pagination/load, fork isolation/provenance, bằng chứng Android end-to-end. **Điều kiện hoàn thành:** social network opt-in không bao giờ vượt qua privacy boundary của P12. **Rủi ro rollback/regression:** privacy, abuse và quy mô feed; cần kế hoạch rollout/revoke/kill-switch theo giai đoạn. **Cổng phase tiếp theo:** người dùng chọn công việc sau roadmap; không tự tạo phase mới.

## Sổ theo dõi task authoritative

Registry này materialize các task ID đã được mô tả trong từng phase. Các heading phase ở kế hoạch thực thi giữ quyền thể hiện trạng thái phase; các task/subtask dưới đây là nguồn tracking chi tiết. Nội dung mô tả, dependency, non-scope, domain, bảo mật, hiệu năng và evidence trong các section phase/evidence phía trên vẫn là contract đầy đủ.

#### [x] FEATURE-P1-T002 — Migration forward-only và persistence contract

- [x] FEATURE-P1-T002-S001 — Thiết kế và tạo migration additive/default-safe cùng persistence contract theo T001.

**Trạng thái evidence hiện tại:** `COMPLETE` — migration `20260903000000_workspace_persistence_foundation.sql` đã được xác minh bằng official Docker persistence harness cho cả fresh schema và upgrade path. Kết quả cuối gồm `fresh_contract_pass`, `saved_trip_contract_pass`, `concurrency_pass`, `source_link_concurrency_pass`, `upgrade_compatibility_pass` và `PERSISTENCE_TESTS_PASS`. Generated database types đã đồng bộ. Regression suite bảo toàn saved-trip read/note, RLS owner/cross-user và provider provenance; đồng thời chứng minh NOTE không có schedule, accommodation nights nhất quán, giới hạn 12 source link an toàn dưới concurrent insert, initial workspace revision luôn do server đặt thành `1`, mọi workspace write được phép đều tăng revision, item mới luôn bắt đầu `SCHEDULED`, lifecycle timestamp do server tạo/xóa và direct `COMPLETED ↔ SKIPPED` bị chặn.

**Contract persistence T002:** `CONCURRENCY_STRATEGY = trips.workspace_revision`. Trigger server-controlled ghi đè mọi initial revision thành `1` và tăng revision cho mutation trên trip, day, item và source link, bao gồm `update_itinerary_item_note`; authenticated client không thể chọn initial/subsequent revision. T003 phải compare-and-set `expectedRevision` trong transaction owner-scoped. Lifecycle trigger chỉ cho item mới ở `SCHEDULED`, sinh timestamp khi `SCHEDULED → COMPLETED|SKIPPED`, xóa timestamp khi trở về `SCHEDULED`, chặn chỉnh timestamp riêng và chặn direct `COMPLETED ↔ SKIPPED`. `itinerary_items` được mở rộng additive với kind/flexibility/priority/status, contact scalar có giới hạn, transport/accommodation metadata có constraint và source link chuẩn hóa/RLS. Source-link cap khóa theo parent item, không dùng global lock. Contract read JSON hiện có không đổi; T003/P2 mới sở hữu việc expose mutation/read workspace mới. Verified provider fields vẫn thuộc protected resolver/service-role path và provenance trigger hiện hữu không bị nới lỏng.

**Evidence mobile:** lint PASS với 8 warning hiện hữu; Jest PASS 57/58 suites và 420/421 tests, 1 suite/test skip; typecheck FAIL tại lỗi hiện hữu ngoài phạm vi `mobile/src/navigation/MainTabs.tsx:43`; Expo Doctor đạt 20/21 và FAIL do năm Expo package lệch patch version. T002 không sửa navigation hoặc dependency để che các gate ngoài phạm vi này.

##### Checklist hoàn thành

- [x] Migration fresh/upgrade, generated types, legacy read, RLS, workspace revision, source-link concurrency và provider provenance PASS.

#### [x] FEATURE-P1-T003 — Contract mutation owner-scoped và repository

- [x] FEATURE-P1-T003-S001 — Tạo validated transport, RPC/repository mutation contract owner-scoped.

##### Checklist hoàn thành

- [x] Contract owner/stale-user/conflict, strict JSON scalar và safe-error mapping PASS. Docker harness xác nhận `workspace_mutation_contract_pass`, `workspace_lock_order_concurrency_pass`, `workspace_source_link_lock_order_concurrency_pass` và `PERSISTENCE_TESTS_PASS`; `KIND_MUTABILITY = IMMUTABLE`. Lệnh item/status khóa `item → trip`; thay source-link khóa child theo UUID tăng dần rồi `item → trip`, tránh vòng chờ với CRUD source-link trực tiếp.

#### [x] FEATURE-P1-T004 — Kiểm thử migration, RLS và transport

- [x] FEATURE-P1-T004-S001 — Chạy ma trận migration/RLS/transport theo contract T001.

##### Checklist hoàn thành

- [x] Fresh/upgrade, anonymous, owner/cross-user, stale-session, forged-owner/provider, bảy kind, lifecycle, transport/accommodation, contact/source-link, ordering và safe-error tests PASS. Migration `20260903020000_workspace_ordering_contiguity.sql` dùng deferred final-state constraint trigger, chặn gap day/item từ direct CRUD nhưng cho phép renumber atomic; harness xác nhận `workspace_ordering_matrix_pass`. Android không là acceptance của nền tảng P1.

#### [ ] FEATURE-P2-T001 — Thêm/sửa hoạt động và thay đổi thời gian

- [ ] FEATURE-P2-T001-S001 — Triển khai mutation/UI add, edit và đổi thời gian qua repository contract.

##### Checklist hoàn thành

- [ ] Runtime owner-safe, validation, rollback và bằng chứng Android PASS.

#### [ ] FEATURE-P2-T002 — Sắp xếp lại và chuyển ngày

- [ ] FEATURE-P2-T002-S001 — Triển khai reorder/move-day atomic với conflict feedback.

##### Checklist hoàn thành

- [ ] Ordering contiguous, stale conflict và regression khi reopen PASS.

#### [ ] FEATURE-P2-T003 — Bỏ qua, hoàn thành và ghi chú

- [ ] FEATURE-P2-T003-S001 — Triển khai trạng thái skip/complete và note mutation theo lifecycle frozen.

##### Checklist hoàn thành

- [ ] Transition validation, cô lập owner và bằng chứng Android PASS.

#### [ ] FEATURE-P2-T004 — Form transport, accommodation, contact và source link

- [ ] FEATURE-P2-T004-S001 — Triển khai editor cho metadata theo field/kind matrix.

##### Checklist hoàn thành

- [ ] URL/field validation, a11y/EN/VI và không giả mạo provider PASS.

#### [ ] FEATURE-P2-T005 — Refresh remote và bằng chứng Android workspace

- [ ] FEATURE-P2-T005-S001 — Xác minh add/edit/reorder/move/skip/complete/reopen trên Android bằng dữ liệu thực.

##### Checklist hoàn thành

- [ ] Runtime Android và ma trận regression PASS.

#### [ ] FEATURE-P3-T001 — Sổ cái chi phí, danh mục và nguồn gốc

- [ ] FEATURE-P3-T001-S001 — Tạo ledger private cho planned/actual/unplanned và expense attachment.

##### Checklist hoàn thành

- [ ] RLS theo owner, category/origin validation và pagination PASS.

#### [ ] FEATURE-P3-T002 — Chi phí ước tính/thực tế và breakdown

- [ ] FEATURE-P3-T002-S001 — Triển khai aggregation daily/category và estimated-versus-actual.

##### Checklist hoàn thành

- [ ] Decimal/accounting, N+1 và contract aggregate PASS.

#### [ ] FEATURE-P3-T003 — Tiền tệ nhà/đích và FX provenance

- [ ] FEATURE-P3-T003-S001 — Chọn trusted FX provider, quote freshness và dual-currency contract.

##### Checklist hoàn thành

- [ ] Original home budget được bảo toàn; trạng thái FX unavailable PASS.

#### [ ] FEATURE-P3-T004 — Budget Risk

- [ ] FEATURE-P3-T004-S001 — Tạo deterministic budget-risk signal không tự tăng ngân sách.

##### Checklist hoàn thành

- [ ] Rule risk, suggestion an toàn và privacy PASS.

#### [ ] FEATURE-P3-T005 — Runtime ngân sách/chi phí

- [ ] FEATURE-P3-T005-S001 — Xác minh quick expense, refresh và hiển thị dual-currency trên Android.

##### Checklist hoàn thành

- [ ] Bằng chứng Android real-data và provider failure PASS.

#### [ ] FEATURE-P4-T001 — Contract Candidate Discovery

- [ ] FEATURE-P4-T001-S001 — Xây candidate discovery/ranking input contract có review boundary.

##### Checklist hoàn thành

- [ ] Query có giới hạn, cancellation và không auto-persist PASS.

#### [ ] FEATURE-P4-T002 — Trí tuệ Place trực tiếp

- [ ] FEATURE-P4-T002-S001 — Thêm trusted opening-hours/business-status provenance và freshness contract.

##### Checklist hoàn thành

- [ ] Parser provider, TTL và trạng thái unavailable PASS.

#### [ ] FEATURE-P4-T003 — Trí tuệ Event trực tiếp

- [ ] FEATURE-P4-T003-S001 — Chọn/vet event provider và validate time/location candidates.

##### Checklist hoàn thành

- [ ] Attribution, kết quả có giới hạn và provider-failure PASS.

#### [ ] FEATURE-P4-T004 — Policy cache/freshness/error

- [ ] FEATURE-P4-T004-S001 — Định nghĩa cache TTL/invalidation và safe provider error behavior.

##### Checklist hoàn thành

- [ ] Không có retry amplification/fan-out regression PASS.

#### [ ] FEATURE-P4-T005 — UI review cho intelligence

- [ ] FEATURE-P4-T005-S001 — Triển khai trạng thái review/empty/error theo Stitch được duyệt.

##### Checklist hoàn thành

- [ ] Bằng chứng Android discovery/detail và a11y PASS.

#### [ ] FEATURE-P5-T001 — Constraint engine tất định

- [ ] FEATURE-P5-T001-S001 — Triển khai constraints bảo vệ FIXED và MUST_DO.

##### Checklist hoàn thành

- [ ] Validation deterministic và kiểm thử protected-item PASS.

#### [ ] FEATURE-P5-T002 — Gom cụm/tối ưu route-aware

- [ ] FEATURE-P5-T002-S001 — Dùng OSRM metrics đã validate cho clustering/optimization bounded.

##### Checklist hoàn thành

- [ ] Batching/cache/fallback route PASS.

#### [ ] FEATURE-P5-T003 — Lập lịch weather-aware

- [ ] FEATURE-P5-T003-S001 — Dùng Open-Meteo facts cho scheduling rule có fallback.

##### Checklist hoàn thành

- [ ] Weather failure không chặn trip; kiểm thử rule PASS.

#### [ ] FEATURE-P5-T004 — Multi-Stage Trip Refresh

- [ ] FEATURE-P5-T004-S001 — Tạo refresh version/diff/explicit-confirm contract.

##### Checklist hoàn thành

- [ ] Idempotency, conflict và không silent mutation PASS.

#### [ ] FEATURE-P5-T005 — Explainable Itinerary

- [ ] FEATURE-P5-T005-S001 — Hiển thị explanation với factual provenance tách Gemini composition.

##### Checklist hoàn thành

- [ ] Reason validation, EN/VI và review/confirm Android PASS.

#### [ ] FEATURE-P6-T001 — Trip Progress State Engine

- [ ] FEATURE-P6-T001-S001 — Persist progress event/state idempotent theo itinerary lifecycle.

##### Checklist hoàn thành

- [ ] Cô lập owner, transition và kiểm thử timezone PASS.

#### [ ] FEATURE-P6-T002 — Reminder Engine

- [ ] FEATURE-P6-T002-S001 — Schedule `TRIP_STARTING_SOON`, `DAY_STARTING`, `PLACE_UPCOMING`, `LEAVE_SOON`, `LATE_RISK`.

##### Checklist hoàn thành

- [ ] Dedupe, cancel/reconcile và bằng chứng Android native PASS.

#### [ ] FEATURE-P6-T003 — Smart Notification Policy

- [ ] FEATURE-P6-T003-S001 — Triển khai consent/preferences/revocation policy private.

##### Checklist hoàn thành

- [ ] Permission privacy và policy không chứa content nhạy cảm PASS.

#### [ ] FEATURE-P6-T004 — Runtime lifecycle notification

- [ ] FEATURE-P6-T004-S001 — Xác minh lifecycle notification khi edit/sign-out/reboot/background.

##### Checklist hoàn thành

- [ ] Bằng chứng delivery/cancellation trên Android vật lý PASS.

#### [ ] FEATURE-P7-T001 — Consent và geofence lifecycle

- [ ] FEATURE-P7-T001-S001 — Triển khai consent, geofence registration/replacement/cleanup bounded.

##### Checklist hoàn thành

- [ ] Kiểm thử denial/revoke/geofence-cap/privacy PASS.

#### [ ] FEATURE-P7-T002 — `ARRIVED` và Actual Visit

- [ ] FEATURE-P7-T002-S001 — Capture arrival/actual-visit chỉ sau native signal hợp lệ.

##### Checklist hoàn thành

- [ ] Không suy diễn arrival; bằng chứng Android foreground/background PASS.

#### [ ] FEATURE-P7-T003 — Weather risk và skip/delay detection

- [ ] FEATURE-P7-T003-S001 — Tạo bounded risk/delay signals từ context trusted.

##### Checklist hoàn thành

- [ ] Behavior false-positive/failure và battery cost PASS.

#### [ ] FEATURE-P7-T004 — Context Engine

- [ ] FEATURE-P7-T004-S001 — Hợp nhất context theo consent, freshness và data minimization.

##### Checklist hoàn thành

- [ ] RLS, retention, cancellation và runtime Android PASS.

#### [ ] FEATURE-P8-T001 — Contract từ context đến recommendation

- [ ] FEATURE-P8-T001-S001 — Định nghĩa recommendation/version/decision contract từ context.

##### Checklist hoàn thành

- [ ] Phạm vi owner, rate limit và stale-response guard PASS.

#### [ ] FEATURE-P8-T002 — Dynamic Replanning

- [ ] FEATURE-P8-T002-S001 — Tạo replanning preview bảo vệ FIXED/MUST_DO.

##### Checklist hoàn thành

- [ ] Explicit confirmation, undo và kiểm thử conflict PASS.

#### [ ] FEATURE-P8-T003 — What Now?

- [ ] FEATURE-P8-T003-S001 — Đưa gợi ý bối cảnh có provenance và unavailable state.

##### Checklist hoàn thành

- [ ] Validation factual-source và review Android PASS.

#### [ ] FEATURE-P8-T004 — Fix My Day

- [ ] FEATURE-P8-T004-S001 — Tạo đề xuất điều chỉnh ngày có thể xem trước/reject.

##### Checklist hoàn thành

- [ ] Không autonomous edit, bảo vệ budget và undo PASS.

#### [ ] FEATURE-P8-T005 — Contextual AI explanation

- [ ] FEATURE-P8-T005-S001 — Dùng Gemini chỉ để giải thích/composition sau deterministic result.

##### Checklist hoàn thành

- [ ] Prompt minimization, lỗi an toàn và EN/VI/a11y PASS.

#### [ ] FEATURE-P9-T001 — Trip Inbox và upload metadata

- [ ] FEATURE-P9-T001-S001 — Tạo private inbox/source lifecycle và upload boundary.

##### Checklist hoàn thành

- [ ] Storage RLS, size/quota/cancel và retention PASS.

#### [ ] FEATURE-P9-T002 — Trích xuất PDF/image/screenshot/text

- [ ] FEATURE-P9-T002-S001 — Trích xuất structured candidates từ input người dùng.

##### Checklist hoàn thành

- [ ] Parser adversarial, không auto-trust và failure an toàn PASS.

#### [ ] FEATURE-P9-T003 — Booking candidate validation

- [ ] FEATURE-P9-T003-S001 — Validate candidate flight/hotel/train mà không tạo booking flow.

##### Checklist hoàn thành

- [ ] Review-required và contract privacy PASS.

#### [ ] FEATURE-P9-T004 — Trip Idea Import và Places verification

- [ ] FEATURE-P9-T004-S001 — Chuyển ý tưởng trích xuất thành place candidate qua Google verification.

##### Checklist hoàn thành

- [ ] Không có place/coordinates bịa đặt; provenance PASS.

#### [ ] FEATURE-P9-T005 — Review, confirm và persist

- [ ] FEATURE-P9-T005-S001 — Bắt buộc user review/explicit confirm trước persistence/replanning.

##### Checklist hoàn thành

- [ ] Bằng chứng Android picker/camera/document và cancellation PASS.

#### [ ] FEATURE-P10-T001 — My Experience riêng tư

- [ ] FEATURE-P10-T001-S001 — Persist private rating/review/tips/visit-date experience.

##### Checklist hoàn thành

- [ ] RLS private, create/edit/reopen và deletion PASS.

#### [ ] FEATURE-P10-T002 — Actual Visit

- [ ] FEATURE-P10-T002-S001 — Persist actual arrival/departure/duration với user correction.

##### Checklist hoàn thành

- [ ] Duration validation, privacy và bằng chứng Android PASS.

#### [ ] FEATURE-P10-T003 — Nhật ký Trip tự động

- [ ] FEATURE-P10-T003-S001 — Tạo daily journal/trip summary/favorite/skipped projections private.

##### Checklist hoàn thành

- [ ] Aggregation tăng dần, pagination và privacy PASS.

#### [ ] FEATURE-P10-T004 — Personal Duration Learning

- [ ] FEATURE-P10-T004-S001 — Suy ra preference duration riêng tư và giải thích được.

##### Checklist hoàn thành

- [ ] Không rò rỉ public, explainability và correction PASS.

#### [ ] FEATURE-P10-T005 — Projection tổng hợp chi tiêu

- [ ] FEATURE-P10-T005-S001 — Hiển thị daily/trip spending từ P3 ledger.

##### Checklist hoàn thành

- [ ] Tính đúng đắn aggregate và runtime private PASS.

#### [ ] FEATURE-P11-T001 — Thiết kế Offline Travel Pack

- [ ] FEATURE-P11-T001-S001 — Freeze encrypted local persistence, manifest/version/size policy.

##### Checklist hoàn thành

- [ ] Contract wipe khi sign-out/account-delete PASS.

#### [ ] FEATURE-P11-T002 — Download/version/evict offline pack

- [ ] FEATURE-P11-T002-S001 — Đồng bộ itinerary, verified place, notes, bookings, essential image, expense/journal/reminder bounded.

##### Checklist hoàn thành

- [ ] Sync có thể tiếp tục, eviction và recovery khi corruption PASS.

#### [ ] FEATURE-P11-T003 — Behavior offline an toàn

- [ ] FEATURE-P11-T003-S001 — Hiển thị online-only AI/weather/events/FX/route state không crash.

##### Checklist hoàn thành

- [ ] Bằng chứng Android airplane-mode PASS.

#### [ ] FEATURE-P11-T004 — Smart Packing List

- [ ] FEATURE-P11-T004-S001 — Tạo packing suggestions từ destination/date/weather/activity/duration.

##### Checklist hoàn thành

- [ ] Behavior explainable/private và unavailable-weather PASS.

#### [ ] FEATURE-P11-T005 — Preference Learning

- [ ] FEATURE-P11-T005-S001 — Học signals private có opt-out/correction policy.

##### Checklist hoàn thành

- [ ] Privacy, retention và bằng chứng Android storage PASS.

#### [ ] FEATURE-P12-T001 — Contract publish/unpublish explicit

- [ ] FEATURE-P12-T001-S001 — Tạo publish/revoke explicit consent contract.

##### Checklist hoàn thành

- [ ] Private mặc định, audit và revoke PASS.

#### [ ] FEATURE-P12-T002 — Projection public-safe

- [ ] FEATURE-P12-T002-S001 — Tạo projection allowlist cho review/photo/tip public.

##### Checklist hoàn thành

- [ ] Redaction private note/expense/location/owner metadata PASS.

#### [ ] FEATURE-P12-T003 — Chia sẻ Trip

- [ ] FEATURE-P12-T003-S001 — Hỗ trợ private/unlisted/public selected sharing qua projection.

##### Checklist hoàn thành

- [ ] Access/revocation/RLS unlisted PASS.

#### [ ] FEATURE-P12-T004 — Bảo mật link unlisted

- [ ] FEATURE-P12-T004-S001 — Thiết kế slug, revoke và anti-enumeration boundary.

##### Checklist hoàn thành

- [ ] An toàn token/slug và behavior expired/revoked PASS.

#### [ ] FEATURE-P12-T005 — Policy moderation/reporting

- [ ] FEATURE-P12-T005-S001 — Xác định report/moderation/abuse policy cho public projection.

##### Checklist hoàn thành

- [ ] Privacy, rate-limit và bằng chứng moderation an toàn PASS.

#### [ ] FEATURE-P13-T001 — Profile public và follow

- [ ] FEATURE-P13-T001-S001 — Tạo profile public projection và follow graph opt-in.

##### Checklist hoàn thành

- [ ] Block/privacy/RLS và pagination PASS.

#### [ ] FEATURE-P13-T002 — Discovery/search social

- [ ] FEATURE-P13-T002-S001 — Tạo discovery/search trên projection public paginated.

##### Checklist hoàn thành

- [ ] Anti-enumeration, cache và behavior load PASS.

#### [ ] FEATURE-P13-T003 — Likes/comments/report

- [ ] FEATURE-P13-T003-S001 — Tạo engagement/moderation writes authenticated.

##### Checklist hoàn thành

- [ ] Behavior abuse/rate-limit/block/report PASS.

#### [ ] FEATURE-P13-T004 — Save/copy/fork itinerary

- [ ] FEATURE-P13-T004-S001 — Copy/fork vào private graph, giữ provenance và không copy private fields.

##### Checklist hoàn thành

- [ ] Cô lập fork, provenance và RLS owner PASS.

#### [ ] FEATURE-P13-T005 — AI customize shared trip

- [ ] FEATURE-P13-T005-S001 — Dùng AI customize sau deterministic validation và user confirm.

##### Checklist hoàn thành

- [ ] Không autonomous write, provider truth và review Android PASS.

## Ghi chú tiếp tục motion

`CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`. File được yêu cầu `PHASES_CREATE_TRIP_GENERATION_MOTION.md` không có trong live checkout này (tìm filename toàn repository và `MOTION-T00x` không có kết quả), nên không thể patch status nếu phải bịa/tạo lại roadmap. Nếu file được khôi phục hoặc cung cấp sau này, chỉ cập nhật status tối thiểu: `PAUSED BY USER`, `MOTION-T007` chưa được ủy quyền, bảo toàn code/evidence/assets của `MOTION-T001` đến `MOTION-T006`, và chỉ resume khi user ủy quyền rõ ràng.

## Checklist xác minh chỉ-tài-liệu

- [x] Roadmap mới tồn tại trong `phase_doc/`.
- [x] 50 / 50 capability heading của `FEATURES.md` đã map; unmapped count là 0.
- [x] Không có `INT-P10` hoặc Integration phase sau đó được tạo.
- [x] Motion được đánh dấu `PAUSED_BY_USER`; không motion source/test/asset nào thay đổi.
- [x] Không production source, test, migration, Edge Function, deployment, commit hoặc push nào thuộc roadmap task này.
- [x] Audit và contract freeze `FEATURE-P0` hoàn thành bên dưới; `FEATURE-P1` chưa bắt đầu toàn phase.

## FEATURE-P0 — BẰNG CHỨNG BASELINE VÀ CONTRACT FREEZE

**Ngày closure:** 2026-09-03. **Phương pháp:** đã inspect source LIVE LOCAL, migration, Edge Function contract, repository boundary và test hiện có; không remote mutation, paid-provider call, Android run hoặc full suite nào được thực hiện ở P0. `PHASES_INTEGRATION.md` và phần kết thúc authoritative của `HANDOFF_INTEGRATION.md` xác nhận `INT-P0` đến `INT-P9 = COMPLETE`.

#### [x] FEATURE-P0-T001 — Ma trận xác minh 50 capability

- [x] FEATURE-P0-T001-S001 — Audit 50 heading trong `FEATURES.md` với source, persistence, repository, UI/test/runtime evidence.

##### Checklist hoàn thành

- [x] 50/50 capability được map; `UNMAPPED=0`; phân loại reconciliation có evidence LIVE LOCAL.

Legend: `P` = persistence; `R/T` = repository/validated transport; `UI` = normal production UI; `T` = source/test evidence; `A` = accepted Android evidence recorded in the Integration handoff, not rerun in P0. `—` means no audited local implementation layer, not a negative claim about future work.

| # | Capability | Classification | Source paths / P | R/T + UI | T / A | Missing layers | Owner |
|---:|---|---|---|---|---|---|---|
| 1 | Smart Itinerary Generation | IMPLEMENTED_RUNTIME | `generate-trip`; `create_trip_graph` migrations | `SupabaseTripGenerationRepository`, planner save | generation/persistence tests; A recorded | preserve/future intelligence | P5 |
| 2 | Candidate Discovery | PARTIAL_RUNTIME | no user candidate persistence | `explore-places`, Explore only | `integration-explore.test.ts`; A Explore safe canvas | generation pipeline/review | P4 |
| 3 | Google Places Verification | IMPLEMENTED_RUNTIME | item provenance migration | `resolve-place` repository; map/detail | resolver tests; A recorded | preserve boundary | P1/P4 |
| 4 | Live Place Intelligence | PARTIAL_RUNTIME | no hours/status storage | photo/metadata functions only | photo/metadata tests; A recorded | hours/status/provenance/freshness | P4 |
| 5 | Live Event Intelligence | PLANNED | — | — | — | all | P4 |
| 6 | Feasibility / Constraint Engine | PLANNED | — | — | — | all | P5 |
| 7 | Route-Aware Generation | PARTIAL_RUNTIME | no scheduling persistence | `OsrmRouteRepository`, map/preview | route tests; A recorded | clustering/generation | P5 |
| 8 | Weather-Aware Generation | PARTIAL_RUNTIME | no scheduling persistence | `OpenMeteoWeatherRepository`, detail badge | weather tests; A recorded | rule engine/scheduling | P5 |
| 9 | Multi-Stage Trip Refresh | PLANNED | — | — | — | all | P5 |
| 10 | Explainable Itinerary | PLANNED | — | — | — | all | P5 |
| 11 | Reminder Engine | PLANNED | — | Settings preference only | Settings test says no OS alerts; A not rerun | scheduler/native delivery | P6 |
| 12 | Geofencing & Arrival | PLANNED | — | — | — | consent/location/native runtime | P7 |
| 13 | Trip Progress State Engine | PLANNED | — | — | — | all | P6 |
| 14 | Context Engine | PLANNED | — | — | — | all | P7 |
| 15 | Contextual AI | PLANNED | — | — | — | all | P8 |
| 16 | Weather Risk | PLANNED | — | weather retrieval only | weather tests; A recorded retrieval | risk rules/context | P7 |
| 17 | Skip / Delay Detection | PLANNED | — | — | — | state/detection/UI | P7 |
| 18 | Dynamic Replanning | PLANNED | — | — | — | all | P8 |
| 19 | Smart Notification Policy | PLANNED | local settings store only | no native policy consumer | Settings test | persistent consent/scheduler | P6 |
| 20 | What Now? | PLANNED | — | — | — | all | P8 |
| 21 | Fix My Day | PLANNED | — | — | — | all | P8 |
| 22 | Live Editable Itinerary | PARTIAL_RUNTIME | item `note` exists | note RPC/repository; detail is read-first | saved-trip/repository tests; A read path recorded | all other mutations | P1/P2 |
| 23 | Itinerary Item Types | DOMAIN_FOUNDATION_ONLY | no kind column | `travelWorkspace.ts` types only | `travel-workspace.test.ts` | P/R/T/UI/A | P1/P2 |
| 24 | Fixed / Flexible | DOMAIN_FOUNDATION_ONLY | no field | type/helper only | workspace test | P/R/T/UI/A | P1/P2 |
| 25 | Activity Priority | DOMAIN_FOUNDATION_ONLY | no field | type/helper only | workspace test | P/R/T/UI/A | P1/P2 |
| 26 | Transport Segment | DOMAIN_FOUNDATION_ONLY | no field | `TransportDetails` type only | workspace source | P/R/T/UI/A | P1/P2 |
| 27 | Accommodation | DOMAIN_FOUNDATION_ONLY | no field | `AccommodationDetails` type only | workspace source | P/R/T/UI/A | P1/P2 |
| 28 | Contacts and Source Links | DOMAIN_FOUNDATION_ONLY | no fields | type only | workspace source | P/R/T/UI/A | P1/P2 |
| 29 | Trip Inbox / Booking Import | PLANNED | — | — | — | all | P9 |
| 30 | Trip Idea Import | PLANNED | — | — | — | all | P9 |
| 31 | Expense Tracking | DOMAIN_FOUNDATION_ONLY | no expense table | `TripExpense` type/summarizer only | workspace test | P/R/T/UI/A | P3 |
| 32 | Budget Intelligence | PLANNED | trip has `estimated_budget/currency` only | planner input/display only | generation/persistence tests | ledger/FX/risk/UI | P3 |
| 33 | Dual-Currency Display | DOMAIN_FOUNDATION_ONLY | no FX quote storage | money type only; Settings currency is preference | workspace test | P/R/T/UI/A | P3 |
| 34 | FX Requirement | PLANNED | — | — | — | provider/quote/fallback | P3 |
| 35 | Budget Breakdown | DOMAIN_FOUNDATION_ONLY | no expense ledger | local grouping helper only | workspace test | P/R/T/UI/A | P3 |
| 36 | Budget Risk | PLANNED | — | — | — | all | P3/P8 |
| 37 | My Experience | DOMAIN_FOUNDATION_ONLY | no experience table | private-draft helper only | workspace test | P/R/T/UI/A | P10 |
| 38 | My Experience → Future Social | FUTURE | — | — | — | all | P12 |
| 39 | Private vs Public Data | FUTURE | — | — | — | safe projection | P12 |
| 40 | Future Public Review | FUTURE | — | — | — | all | P12/P13 |
| 41 | Future Trip Sharing | FUTURE | — | — | — | all | P12 |
| 42 | Future Social Network | FUTURE | — | — | — | all | P13 |
| 43 | Experience vs Google Reviews | PARTIAL_RUNTIME | provider metadata, no user experience | metadata repository/Saved consumer | metadata tests; A recorded | private/public experience runtime | P10/P12 |
| 44 | Actual Visit Data | DOMAIN_FOUNDATION_ONLY | no visit table | `ActualVisit` type only | workspace source | P/R/T/UI/A | P10 |
| 45 | Personal Duration Learning | PLANNED | — | — | — | all | P10 |
| 46 | Automatic Trip Journal | PLANNED | — | — | — | all | P10 |
| 47 | Daily / Trip Spending Summary | DOMAIN_FOUNDATION_ONLY | no ledger/summary | expense helper only | workspace test | P/R/T/UI/A | P3/P10 |
| 48 | Smart Packing List | PLANNED | — | — | — | all | P11 |
| 49 | Offline Travel Pack | PLANNED | server snapshot only | safe unavailable states; no local DB | integration handoff says no offline DB | local persistence/runtime | P11 |
| 50 | Preference Learning | PLANNED | — | — | — | all | P11 |

**Audit totals:** `TOTAL=50`; `IMPLEMENTED_RUNTIME=2`; `PARTIAL_RUNTIME=6`; `DOMAIN_FOUNDATION_ONLY=12`; `PLANNED=25`; `FUTURE=5`; `OUT_OF_SCOPE_NON_GOAL=0`; `UNMAPPED=0`. The product non-goals (marketplace, payment gateway, expense splitting) remain excluded from the 50 headings and from all FEATURE phases.

#### [x] FEATURE-P0-T002 — Freeze kiến trúc, dữ liệu, provider, privacy và bảo mật

- [x] FEATURE-P0-T002-S001 — Freeze boundary architecture, real data, Gemini, provider, JWT/RLS và private-first.

##### Checklist hoàn thành

- [x] Không mở lại Integration, không mock runtime production, không thay đổi source/remote.

| Boundary | Frozen requirement |
|---|---|
| Architecture | `Screen → hook/controller → repository → validated transport boundary → Supabase/provider`. No raw Supabase/provider payload in JSX; no screen directly owns provider call logic. |
| Real production data | No fake Google Place ID, coordinates, ratings, opening hours, events, route metrics, weather, FX, or provider metadata. Fixture/mock data is test-only or explicit fixture/demo mode. |
| Gemini | Allowed: reasoning, composition, extraction candidates, explanation. Prohibited as factual source: identity, coordinates, place hours/status, events, weather, route metrics, FX, or persisted owner identity. |
| Trusted factual sources | Protected Google boundary owns verified place snapshot; Google metadata/photo stay provider-owned; OSRM owns route metrics; Open-Meteo owns weather; future vetted provider owns events/FX. Deterministic engines own feasibility and accounting logic. |
| Authentication/authorization | JWT establishes session; `auth.uid()` derives owner; RLS and owner-scoped RPCs enforce access. Authenticated does not imply authorized. Every persistent feature requires cross-user and stale-user isolation tests. |
| Secrets/service role | Mobile contains no server secret. Edge Functions isolate secret-bearing provider calls. Service-role use is prohibited by default and, if later unavoidable, needs a narrowly reviewed server-only boundary, reason, and audit. |
| Transport/errors | Validate DTOs at boundary, restrict accepted fields and values, map safe stable errors, never return raw SQL/provider/secret details. |
| Privacy/social | Private is the default. Future path is `PRIVATE SOURCE → explicit publish → PUBLIC-SAFE PROJECTION`; no public default for notes, journal internals, expenses, credentials, owner metadata, or precise location history. |
| Existing acceptance | Preserve React Navigation, Android target, EN/VI, Light/Dark/System, semantic tokens, accessibility, MaterialIcons, approved Stitch screens, and applicable Wikimedia attribution/User-Agent behavior. |

#### [x] FEATURE-P0-T003 — Ma trận dependency và ownership FEATURE-P1 đến FEATURE-P13

- [x] FEATURE-P0-T003-S001 — Freeze dependency/domain/DB/mobile/provider/security/Stitch/Android ownership matrix.

##### Checklist hoàn thành

- [x] P1 contract readiness, UI/Stitch readiness và ownership performance risk đã được ghi nhận.

| Phase | Tiên quyết | Owner Domain / DB-Supabase | Owner Mobile | Owner provider | Phụ thuộc bảo mật | Phụ thuộc Stitch/UI | Android / bằng chứng runtime bắt buộc |
|---|---|---|---|---|---|---|---|
| P1 Workspace foundation | P0 | activity graph + forward migrations/RPC contracts | typed mapper/repository only | protected Google verification reuse | owner/RLS, snapshot protection | existing detail extension contract | migration/RLS/contract evidence; no native proof yet |
| P2 Runtime Workspace | P1 | semantics mutation/ordering | editor Trip Detail/Planner | Google chỉ cho việc chọn place | control mutation owner/stale | state edit/reorder được duyệt | Android add/edit/move/reorder/skip/complete/reopen với dữ liệu thực |
| P3 Chi phí/Ngân sách | P1; attachment P2 tùy chọn | ledger, budget, FX quote | UI expense/budget | FX đáng tin cậy (TBD) | ledger private theo owner | state budget được duyệt | Android quick expense, refresh, FX-unavailable |
| P4 Candidate/Live intelligence | P0, boundary place | candidate/provenance/freshness | Explore/review | Google + event đã thẩm định | boundary secret và input | state discovery hiện hành/được duyệt | Android discovery/details/provider failure |
| P5 Lập kế hoạch thông minh | P1/P3/P4 | record constraint/diff/explanation | luồng review/confirm | OSRM, Open-Meteo, fact P4, giải thích Gemini | input owner; không autonomous write | review/diff planner được duyệt | Android generate→review→confirm |
| P6 Tiến độ/reminder | P2/P5 | policy progress/reminder | lifecycle permission/local notification | dữ liệu route/weather đã chấp nhận | consent private và revocation | state notification được duyệt | bằng chứng notification/background Android vật lý |
| P7 Location/context | P2/P5/P6 | event arrival/context | lifecycle permission/geofence | OSRM/Open-Meteo | data minimization/RLS | state consent/risk được duyệt | Android vật lý foreground/background/revoke/battery |
| P8 Hỗ trợ động | P3/P5/P6/P7 | quyết định recommendation/version | explain/review/apply/undo | engine deterministic + giải thích Gemini | rate-limit/owner/reversibility | state assistant được duyệt | Android confirmation/undo/provider-failure |
| P9 Import/extraction | P1/P4/P5 | record inbox/candidate/review | picker/upload/review | Gemini extract + Google verify | storage RLS/retention | state Inbox/review được duyệt | Android document/image/camera/cancel |
| P10 Journal/learning | P2/P3/P7 | experience/visit/journal private | UI journal private | không có cho fact do người dùng tạo | RLS/deletion private | state journal được duyệt | Android create/edit/reopen/privacy |
| P11 Offline/utilities | P2/P3/P5/P6/P10 | metadata manifest/sync | pack local mã hóa/packing/preferences | nhãn online-only | wipe/revoke local | state offline được duyệt | Android airplane-mode/storage/wipe khi sign-out |
| P12 Nền tảng social | P10/P11 | record projection/share public-safe | publish/revoke/review | không republish review do provider sở hữu | projection/RLS/moderation | state social/share được duyệt | Android publish/revoke/unlisted |
| P13 Mạng social | P12 | profile/follow/engagement/fork | UI discovery/social | giữ Google verification trên place đã copy | boundary anti-abuse/public | design social được duyệt | Android public/private/fork/report |

### Ma trận sẵn sàng UI/Stitch

| Feature group | Current approved UI status | P0 freeze |
|---|---|---|
| Existing Trip Detail, Trip Map, Planner, Saved, Profile, Settings, Route, Weather | Current production screens accepted through Integration | Preserve; any changed interaction must be an extension, not a redesign. |
| Workspace editing, expenses/budget, intelligence review, reminders, context, import, journal, offline, social | No approved implementation state established by this P0 audit | Before implementation, inspect current callable Stitch project; obtain or explicitly approve required states. |
| Native/permission UI | Settings notification toggles are preference-only | Do not claim native behavior or change toggle semantics without P6/P7 approved state and Android gate. |

All future UI must retain React Navigation, MaterialIcons, semantic tokens, EN/VI, Light/Dark/System, accessibility labels/roles/hints/states, text expansion, safe areas, and 44dp touch targets. P0 performs no Stitch write or redesign.

### Ownership rủi ro hiệu năng và khả năng phục hồi

| Risk to audit; no improvement claim in P0 | Owning phase |
|---|---|
| mutation races, contiguous ordering, duplicate save, cancellation, stale response | P1/P2 |
| unbounded expense/journal lists, aggregation/N+1, FX cache TTL/invalidation | P3/P10 |
| provider/image fan-out, duplicate discovery requests, unstable refs, map camera-fetch loops | P4 |
| route/weather batching, cache freshness, retry amplification, explanation fan-out | P5/P8 |
| notification duplication, scheduler retry, timezone/DST | P6 |
| background location battery, geofence count, memory leaks, location loops | P7 |
| extraction queue/size/quota/retry and upload cancellation | P9 |
| offline storage growth, sync bounds, eviction and corruption | P11 |
| public feed/query pagination, fan-out and abuse/rate limits | P12/P13 |

### FEATURE-P1 frozen contract — Nền tảng Live Editable Travel Workspace

1. **Owner graph and compatibility.** Existing `trips → itinerary_days → itinerary_items` remains the authoritative personal graph. Existing persisted items lacking new fields must remain readable with backward-compatible defaults; no applied migration is rewritten. New persistent writes derive owner exclusively from `auth.uid()` and use forward-only migration/RLS/RPC work.
2. **Kinds.** Persist and validate exactly `PLACE`, `CUSTOM_ACTIVITY`, `RESTAURANT`, `TRANSPORT`, `ACCOMMODATION`, `RESERVATION`, and `NOTE` (wire naming may use the established lower-case TypeScript convention but must map losslessly). A `CUSTOM_ACTIVITY` is user-authored and must not require Google Places verification. Place-like kinds may use a verified snapshot only through the protected resolver; client input cannot forge/overwrite provider-owned fields or provenance.
3. **Scheduling semantics.** `FIXED` is protected from automatic rescheduling; `FLEXIBLE` can become a future replanning candidate but is not silently moved in P1. Priorities are `MUST_DO`, `WANT_TO_DO`, `OPTIONAL`; later planning protects MUST_DO. P1 persists semantics; P2 exposes mutations; P5/P8 consume them.
4. **Activity status semantics.** P1 must define a validated state model that at minimum represents scheduled/planned, completed, and skipped; transitions must be owner-authorized, explicit, auditable, and never infer arrival. Arrival-derived evidence belongs to P7. Exact UI presentation and automatic transition policy are explicitly deferred.
5. **Structured responsibility.** Transport records own mode, endpoints, operator, departure/arrival and related contact/link/cost references. Accommodation owns check-in/check-out/nights and contact/link data. Contacts/source links are user-owned structured metadata; each URL/phone/address must be validated and bounded. P1 persists/contracts; P2 supplies editor UX; P3 owns actual ledger behavior.
6. **Ordering and concurrency.** Day order is deterministic `day_number`; item order is deterministic contiguous `position`. Cross-day moves/reorders must be atomic. P1 must introduce an explicit optimistic-concurrency/version or equivalent conflict-detection requirement at trip/day mutation scope; a stale client must receive a safe conflict/refetch outcome, never silently overwrite another current state. The exact column/RPC algorithm is intentionally P1 design work, not P0 implementation.
7. **Security and transport.** Validated DTOs whitelist fields/kind-specific combinations and size limits; owner/cross-user/stale-user, forged-ID/provider-field, invalid transition/order and safe-error tests are mandatory. `SECURITY INVOKER` and RLS are the default; any exception requires separate explicit review.
8. **Provider snapshot protection.** Existing verified Google place ID/name/coordinate/address/category/provenance and accepted photo/metadata behavior remain protected. P1 cannot downgrade verification, fabricate coordinates, or let a general edit mutate provider-owned snapshot data.

### Câu hỏi contract còn mở / blocker

`NONE` for P1 authorization. P0 freezes the requirements above without selecting migration column names, exact RPC shapes, event retention durations, an FX/event provider, or final UI layouts; those are deliberate phase-owned design decisions, not unresolved P1 blockers. Any future proposal that changes the frozen semantics requires an explicit contract review before implementation.

### Kết luận sẵn sàng P1

`FEATURE-P1 = READY_FOR_EXPLICIT_USER_AUTHORIZATION`.

P0 acceptance evidence is complete: 50/50 capability mapping, live-local reconciliation, architecture/data/provider/privacy/security freeze, ownership/dependency/UI/performance matrices, and a P1 contract with no blocker. This verdict does not authorize P1 work automatically.
