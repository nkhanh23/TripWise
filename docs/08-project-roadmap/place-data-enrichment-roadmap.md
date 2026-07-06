# Place Data Enrichment Roadmap

> Tài liệu định hướng roadmap dữ liệu địa điểm cho TripWise.
> Giúp AI coding assistant (Codex/DeepSeek/AI khác) giữ đúng hướng khi làm các task về place data/enrichment.
> File này không thay thế `phases.md` — nó là tài liệu tham chiếu chiến lược cho mọi task liên quan đến place data.

---

## 1. Purpose

TripWise cần dữ liệu POI chất lượng cao trên toàn Việt Nam để phục vụ Explore, Trip Generation và Recommendation.

File này định nghĩa:
- Chiến lược nguồn dữ liệu
- Các quyết định không thương lượng
- Roadmap các phase enrichment từ audit đến rollout
- Nguyên tắc dedup, scale, và AI assistant task rules

Mục tiêu cuối cùng: **mọi tỉnh/thành phố Việt Nam đều có dữ liệu POI đủ dùng và chất lượng cho sản phẩm du lịch.**

---

## 2. Current State

### Trạng thái nguồn dữ liệu

- **Primary source:** OSM_GEOFABRIK (import pipeline + filter + moderation đã hoàn thiện)
- **Source of truth:** PostgreSQL + PostGIS (backend tự quản lý, không phụ thuộc runtime API ngoài)
- **Public Explore API** đã có filter `placeType`:
  - `ALL`
  - `ATTRACTION`
  - `FOOD`
  - `HOTEL`
  - `SERVICE`
- **Public API** chỉ trả về `AUTO_APPROVED` và `VERIFIED` + `is_recommendable = TRUE`
- **Admin review UI** đã có (backend + frontend)

### Dữ liệu hiện tại (sau import pilot TP.HCM + pipeline nationwide sẵn sàng)

| PlaceType | TP.HCM AUTO_APPROVED | TP.HCM PENDING | Toàn quốc (ước lượng) |
|---|---|---|---|
| ATTRACTION | ~12 | Thấp | Rất thấp so với kỳ vọng |
| FOOD | ~388 | ~36 | Cao (do quality rule được tối ưu) |
| HOTEL | Trung bình | Trung bình | Cần audit |
| SERVICE | Thấp | Thấp | Cần audit chi tiết hơn |

Số liệu trên dựa trên dữ liệu TP.HCM đã import (pilot). Toàn quốc là ước lượng dựa trên mật độ OSM trung bình, chưa có audit chính thức.

### Vấn đề chính

- **ATTRACTION nationwide rất thấp** — OSM Việt Nam đánh tag `tourism=attraction` không đồng đều, nhiều điểm du lịch thực tế bị thiếu hoặc tag sai
- **HOTEL mapping** — hotel trong OSM chủ yếu qua tag `tourism=hotel|guest_house|hostel`, nhưng nhiều khách sạn thực tế không có tag tourism
- **SERVICE mapping** — định nghĩa SERVICE còn hẹp, cần review lại filter rules
- **TP.HCM chỉ là pilot/debug case** — vì ATTRACTION ở TP.HCM đặc biệt thấp nên dễ thấy vấn đề, mục tiêu là toàn quốc

### Import pipeline

- Pipeline import Geofabrik đã hoàn thiện (Phase 4.8, 4.11, 4.12)
- OSM Filter (`OsmPlaceFilter.java`) có classification tag → PlaceType chi tiết
- Moderation evaluator (`PlaceModerationEvaluator.java`) có quality scoring và auto-approve
- Backfill runner (`OsmModerationBackfillDryRunService.java`) hỗ trợ DRY_RUN và APPLY
- Dữ liệu import driven bằng input file (cấu hình `tripwise.place-import.input-file`), pipeline thiết kế cho toàn quốc, không giới hạn TP.HCM
- Đã chạy import pilot cho TP.HCM (tỉnh/thành đầu tiên) để kiểm tra pipeline và FOOD auto-approve — kết quả FOOD auto-approve hoạt động tốt

---

## 3. Non-negotiable Decisions

Các quyết định sau KHÔNG được thay đổi trong bất kỳ task nào:

### Nguồn dữ liệu

- **Geofabrik là primary source** cho dữ liệu địa điểm nền
- **PostgreSQL + PostGIS only** — không MongoDB, NoSQL, hay database phụ
- **Không microservices cho MVP** — giữ Modular Monolith
- **Public API không được gọi external POI APIs tại runtime** — mọi dữ liệu phải có sẵn trong DB nội bộ

### Overpass / OSM trực tiếp

- **Overpass chỉ dùng cho batch enrichment/dry-run/debug tag** — không runtime production
- **Không dùng Overpass public server để feed production**

### AI / Gemini

- **Gemini không được bịa địa điểm, tọa độ, khách sạn, nhà hàng**
- **Gemini chỉ viết mô tả/presentation từ fact đã xác minh** — không sinh fact
- **Không dùng Gemini làm nguồn dữ liệu địa điểm production**

### PlaceType

- **FOOD là travel POI hợp lệ** — không đổi FOOD thành ATTRACTION
- **FOOD có quality rule riêng** (threshold 75 thay vì 80 cho public)
- **Không gộp FOOD vào ATTRACTION** dù UI có thể nhóm khác đi

### Quy trình dữ liệu

- **Nguồn curated/manual seed có độ ưu tiên cao hơn nguồn external confidence thấp**
- **DRY_RUN phải trước APPLY** — không apply trực tiếp khi chưa có báo cáo
- **APPLY phải có scope hẹp** (province/city/placeType cụ thể) và **xác nhận rõ từ admin**
- **Không overwrite dữ liệu confidence cao bằng nguồn thấp**

### Import

- **Không import dữ liệu license không rõ vào production**
- **Attribution OSM phải tuân thủ** policy sử dụng

---

## 4. Source Strategy

| Source | Role | Use for | MVP status | Notes |
|---|---|---|---|---|
| **Geofabrik Vietnam Extract** | **Primary** | Base place layer: identity, location, category, raw tags | ✅ Active | Import offline batch vào PostGIS; source of truth chính |
| **Overpass / OSM deep query** | Secondary batch enrichment | Dry-run tag exploration, backfill nhỏ, debug mapping | ✅ Pilot ready | Chỉ batch/dry-run, KHÔNG runtime production |
| **Curated/manual seed** | Editorial | Top attractions cho mỗi tỉnh/thành, verified POI | ✅ Active (25 Nha Trang) | License rõ, admin review trước public |
| **Administrative dataset Việt Nam** | Normalization | Province/district/ward mapping, chuẩn hóa địa danh | 🔲 Phase sau | Cần tìm nguồn license rõ |
| **Foursquare OS Places** | Optional enrich (POC) | Rating, review count, opening hours | 🔲 POC/phase sau | Cần kiểm tra license và cost |
| **OpenTripMap** | Optional enrich (POC) | Rating, description, image | 🔲 POC/phase sau | Free tier giới hạn, cần kiểm tra license |
| **Geoapify** | Search/autocomplete | Place search gợi ý, geocoding | 🔲 Phase sau, không MVP | Không bulk, không source of truth |
| **Goong** | Search/autocomplete | Tìm kiếm tiếng Việt, địa danh Việt Nam | 🔲 Phase sau, không MVP | Không bulk, không source of truth |
| **VietMap** | Search/autocomplete | Bản đồ nền, search POI | 🔲 Phase sau, không MVP | Không bulk, không source of truth |
| **Luxstay destinations** | Destination metadata | Thông tin điểm đến, destination marketing | 🔲 Phase sau | Không full POI source |
| **VietNam-Travel-Recommendation-System** | Tham khảo | Học mapping, category, travel patterns | 🔲 Tham khảo | Dataset nghiên cứu, cần verify license |

### Kết luận source strategy

- **Geofabrik = primary** — nguồn duy nhất cho base place layer production
- **Overpass = secondary batch enrichment** — dry-run, audit tag, backfill nhỏ
- **Curated/manual seed = top attractions** — cho các điểm quan trọng mỗi tỉnh/thành
- **Admin dataset = normalization** — chuẩn hóa địa danh hành chính
- **Foursquare/OpenTripMap = optional POC/phase sau** — enrich rating, review, hours
- **Goong/VietMap/Geoapify = search/autocomplete hoặc phase sau** — không bulk source MVP
- **Luxstay = destination metadata** — không full POI source
- **Dataset license không rõ không import production**

---

## 5. Nationwide PlaceType Strategy

| PlaceType | Primary source | Secondary source | Moderation focus | Risks |
|---|---|---|---|---|
| **ATTRACTION** | Geofabrik (`tourism=attraction|museum|viewpoint`, `historic=*`, `natural=beach|waterfall`) | Overpass backfill, curated manual seed | Quality score threshold 80; strong tourism signal required; promotion guard | OSM Việt Nam thiếu tag tourism=attraction; nhiều điểm du lịch thực tế bị miss hoặc tag sai |
| **FOOD** | Geofabrik (`amenity=restaurant|cafe|fast_food|food_court`) | Overpass enrich rating/hours sau này | Quality score threshold 75; name validation (không số điện thoại, địa chỉ) | Dễ bị spam promotion; nhiều quán không có tên rõ; quality thấp khó auto-public |
| **HOTEL** | Geofabrik (`tourism=hotel|guest_house|hostel|resort|apartment`) + bảng `hotels` riêng | Curated seed cho các khách sạn lớn | Tourism tag bắt buộc; quality score + completeness | OSM không đồng đều; nhiều khách sạn không có tag tourism; hotel data bảng riêng cần đồng bộ |
| **SERVICE** | Geofabrik (`amenity=library|cinema|marketplace`, `leisure=sports_centre|stadium|marina`) | Overpass cho tag exploration | Định nghĩa SERVICE còn hẹp; cần review filter rules | SERVICE dễ bị nhầm với non-travel POI; cần định nghĩa rõ travel relevance |

### Nguyên tắc chung

- Mỗi PlaceType có threshold quality score riêng cho auto-public
- ATTRACTION cần strong tourism signal + quality >= 80
- FOOD có threshold thấp hơn (75) + guard checks bổ sung
- HOTEL cần có đủ thông tin cơ bản (tên, địa chỉ, sao)
- SERVICE cần review filter rules trước khi mở rộng auto-public

---

## 6. Phase A — Geofabrik Nationwide Audit

**Mục tiêu:**
- Audit raw OSM/Geofabrik tags toàn quốc
- Tìm bottleneck ATTRACTION/HOTEL/SERVICE
- **DRY_RUN only** — không update DB

**Acceptance criteria:**
- Report count theo province/city/placeType
- Report pending/approved/rejected counts
- Report tag distribution (OSM tags → PlaceType mapping)
- Report moderation reasons (tại sao bị REJECTED/PENDING)
- Report quality score distribution
- Identify missing parser/rule improvements
- Identify provinces/cities có ATTRACTION thấp bất thường

**Cách thực hiện:**
- Dùng `OsmModerationBackfillDryRunService` với mode `DRY_RUN`
- Chạy trên toàn quốc hoặc theo batch province/city
- Output report dạng file CSV/JSON

**Giới hạn:**
- Không code pipeline mới
- Không thay đổi filter rules
- Không update DB
- Chỉ dry-run và báo cáo

---

## 7. Phase B — Geofabrik Moderation Improvements

**Mục tiêu:**
- Cải thiện rule auto-public theo placeType dựa trên kết quả Phase A
- Review `OsmPlaceFilter.java` classification rules
- Review `PlaceModerationEvaluator.java` quality score thresholds

**Scope:**
- Review `tourism=attraction` tag — có thể mở rộng thêm tag đồng nghĩa
- Review hotel/accommodation tags — phát hiện hotel bị miss (vd: `building=hotel`)
- Review SERVICE tags — mở rộng hoặc thu hẹp định nghĩa
- Điều chỉnh quality score thresholds nếu cần

**Quy tắc:**
- **DRY_RUN trước APPLY** — chạy dry-run để xem tác động của rule mới
- Mỗi thay đổi là một task riêng
- Có báo cáo so sánh trước/sau khi thay đổi rule
- Chỉ APPLY sau khi đã xác nhận kết quả dry-run

---

## 8. Phase C — Overpass Batch Enrichment POC

**Mục tiêu:**
- Pilot Overpass enrichment cho 1 tỉnh/thành (ví dụ TP.HCM)
- Query multi-placeType: ATTRACTION, FOOD, HOTEL, SERVICE
- **DRY_RUN report only** — không insert vào DB
- Dedup với DB hiện tại (source_external_id, name, location)

**Lưu ý:**
- Pilot không phải scope cuối — thiết kế phải mở rộng toàn quốc
- Overpass query phải có rate limit và timeout
- Output phải có báo cáo dedup (bao nhiêu mới, bao nhiêu trùng, bao nhiêu conflict category)
- Không dùng Overpass public server cho production sau này

**Giới hạn:**
- Không thay đổi pipeline import hiện tại
- Không thêm dependency mới
- Chỉ POC cho 1 tỉnh/thành

---

## 9. Phase D — Multi-City Benchmark

**Mục tiêu:**
- Chạy dry-run audit trên 5 tỉnh/thành đại diện để hiểu rõ chất lượng dữ liệu OSM Việt Nam

**5 tỉnh/thành:**
1. **TP.HCM** — đô thị lớn nhất, nhiều FOOD
2. **Hà Nội** — thủ đô, cân bằng ATTRACTION/FOOD/HOTEL
3. **Đà Nẵng** — du lịch biển, ATTRACTION trung bình
4. **Khánh Hòa / Nha Trang** — du lịch biển hàng đầu, so sánh với manual seed
5. **Lâm Đồng / Đà Lạt** — du lịch cao nguyên, ATTRACTION thiên nhiên

**Chỉ DRY_RUN/report.**

**Output:**
- So sánh số lượng POI giữa các tỉnh/thành
- So sánh chất lượng (quality score, verification_status)
- So sánh tag distribution
- Đề xuất ưu tiên cho Phase E

---

## 10. Phase E — Nationwide Batch Rollout

**Mục tiêu:**
- Rollout import Geofabrik cho toàn quốc theo province/city batch
- Không chạy toàn quốc không kiểm soát

**Nguyên tắc:**
- Mỗi batch là một province/city
- Mỗi batch có:
  - Dry-run report trước
  - Admin review sau dry-run
  - APPLY với xác nhận
- Có dedup, moderation, stale detection (FULL_SYNC mode)
- Có log import chi tiết

**Thứ tự ưu tiên:**
1. Các tỉnh/thành du lịch trọng điểm (Đà Nẵng, Khánh Hòa, Lâm Đồng, Quảng Ninh, Huế, Hội An)
2. Các đô thị lớn (Hà Nội, TP.HCM đã chạy)
3. Các tỉnh du lịch tiềm năng
4. Toàn quốc

---

## 11. Phase F — Curated Top Attractions Seed

**Mục tiêu:**
- Seed top attractions quan trọng cho mỗi tỉnh/thành bằng curated data
- Chỉ dùng nguồn license rõ (admin nhập tay, dữ liệu mở có license rõ ràng)
- Admin review trước khi public

**Scope:**
- Mỗi tỉnh/thành: 5-10 điểm du lịch quan trọng nhất
- Nguồn: admin nhập, dữ liệu có license rõ
- Source: `MANUAL_SEED`

**Nguyên tắc:**
- Không copy nội dung từ nguồn không rõ quyền
- Không dùng Gemini để sinh địa điểm
- Mỗi place cần có: tên, tọa độ thật, category, mô tả ngắn
- Source = `MANUAL_SEED`, verification = `VERIFIED`

---

## 12. Phase G — Optional External Datasets / APIs

Các nguồn này CHỈ được cân nhắc khi Phase A-F đã hoàn thành hoặc có lý do đặc biệt.

| Nguồn | Khi nào cân nhắc | Risk |
|---|---|---|
| **Foursquare OS Places** | Khi cần rating/review_count/opening hours cho enrichment layer | License phải rõ; không overwrite identity layer; chi phí nếu exceed free tier |
| **OpenTripMap** | Khi cần rating/mô tả/ảnh cho ATTRACTION | Free tier giới hạn; chất lượng dữ liệu Việt Nam không rõ |
| **Geoapify** | Khi cần place search autocomplete cho UI | Không bulk import production; chỉ search |
| **Goong** | Khi cần tìm kiếm tiếng Việt cho UI | Không bulk import; chi phí API |
| **VietMap** | Bản đồ nền hoặc search POI Việt Nam | Không bulk import; cần test chất lượng |
| **Luxstay** | Destination metadata, destination description | Không full POI; chỉ destination-level |
| **Travel recommendation datasets** | Tham khảo mapping, category, pattern | License nghiên cứu thường không cho production; cần verify từng dataset |

**Nguyên tắc:**
- MVP KHÔNG cần các nguồn này
- Nếu thêm, phải có POC nhỏ trước
- Không làm source of truth cho identity layer
- Chỉ enrich, không overwrite

---

## 13. Dedup Strategy

### Dedup keys (theo thứ tự ưu tiên)

1. **source + source_external_id**: unique nhất, dùng làm khóa chính cho dedup
2. **normalized name + province + city**: fuzzy match tên gần đúng
3. **PostGIS distance**: 2 điểm cách nhau < 150m (configurable) có thể là trùng
4. **same placeType/category nearby**: cùng category gần nhau nghi ngờ trùng
5. **Manual review**: các trường hợp không rõ đưa vào hàng đợi

### Priority khi conflict

```
MANUAL_SEED > VERIFIED > AUTO_APPROVED > PENDING
```

- **MANUAL_SEED** luôn thắng nếu trùng với OSM import
- **VERIFIED** thắng AUTO_APPROVED
- Không overwrite dữ liệu confidence cao bằng nguồn thấp
- Nếu source_external_id khác nhưng location quá gần + cùng category → admin review

### Fuzzy matching

- Dùng normalized name (lowercase, trim, remove diacritics)
- Levenshtein distance hoặc trigram similarity
- Threshold: > 0.8 similarity cho cùng province/city
- Nếu 2 điểm cùng category, distance < 150m, name similarity > 0.6 → needs review

---

## 14. Scaling Rules

### Batch strategy

- Import, dry-run, backfill đều theo **batch province/city**
- Không chạy toàn quốc không kiểm soát
- Mỗi batch có log riêng

### Database

- Không query toàn bảng khi có thể filter (luôn WHERE province/city)
- API public có pagination bắt buộc
- Composite index cần cân nhắc: `(province, city, place_type, verification_status)`, `(source, source_external_id)`
- PostGIS GIST index trên `location` column
- Partial index cho public queries: `WHERE is_active = TRUE AND is_recommendable = TRUE AND verification_status IN ('AUTO_APPROVED', 'VERIFIED')`

### External API

- Overpass batch: timeout, rate limit, retry có giới hạn
- **Không gọi external API trong public runtime**
- External enrichment chỉ chạy batch/background job

### Long-running tasks

- Import, backfill, enrichment đều thiết kế cho background job
- MVP dùng Spring `@Async` hoặc `@Scheduled`
- Không tự ý thêm queue/event bus

### Performance checklist cho mỗi task

- [ ] Có pagination/filter/sort chưa?
- [ ] Có nguy cơ query toàn bảng không?
- [ ] Có N+1 query không?
- [ ] Có index cho WHERE/JOIN/ORDER BY mới không?
- [ ] Có PostGIS spatial index không?
- [ ] External API có timeout/rate limit không?
- [ ] Cache có TTL và key namespace không?
- [ ] Response payload có quá lớn không?

---

## 15. AI Assistant Task Rules

### Mỗi task chỉ làm một bước nhỏ

- Không code lan sang task khác
- Không gộp nhiều phase trong một task
- Nếu task quá lớn, chia nhỏ và đề xuất

### Phân biệt audit/code/apply

| Loại task | Được làm | Không được làm |
|---|---|---|
| **Audit/dry-run** | Đọc code, đọc DB (read-only), chạy dry-run, tạo report | Update DB, sửa code, thêm migration |
| **Code improvement** | Sửa code, tạo test | Update DB trực tiếp (cần migration), chạy import |
| **Apply** | Chạy APPLY với scope cụ thể | Chạy toàn quốc không kiểm soát, bypass dry-run |
| **Import** | Import file OSM, seed data | Tạo/bịa dữ liệu, import license không rõ |

### Nguyên tắc APPLY

- APPLY phải có:
  - Dry-run report đã xem
  - Scope rõ: province, city, placeType
  - Xác nhận từ admin
- Không APPLY khi chưa có dry-run
- Nếu task chỉ là dry-run: **không code, không update DB**

### Scope creep prevention

- Không tự ý thêm nguồn dữ liệu mới
- Không tự ý thêm dependency
- Không tự ý đổi rule auto-public mà không có task

### Báo cáo sau mỗi task

Bắt buộc theo format AGENTS.md section 12:

```
### Summary
[Tóm tắt ngắn gọn đã làm gì]

### Files changed
[File đã tạo/sửa/xóa]

### Database changed
[Có migration mới không? Có update dữ liệu không?]

### Test result
[Test đã chạy và kết quả]

### Risks
[Rủi ro còn lại]

### Next suggested task
[Task tiếp theo nên làm]
```

### Câu hỏi tự kiểm tra trước khi code

1. Task này có đúng scope phase hiện tại không?
2. Có đọc AGENTS.md, README.md, phases.md và tài liệu place liên quan chưa?
3. Có đọc source code và test code liên quan chưa?
4. Đã chạy dry-run chưa (nếu task cần APPLY)?
5. Có vi phạm non-negotiable decisions không?
6. Có cần migration mới không?
7. Có ảnh hưởng API public không?
8. Có ảnh hưởng data hiện tại không?
9. Có cần test mới không?
10. Có vi phạm scaling rules không?
