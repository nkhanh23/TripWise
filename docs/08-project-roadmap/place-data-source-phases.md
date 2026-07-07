# Place Data Source Phases

## 1. Mục tiêu

Roadmap này định nghĩa thứ tự triển khai chiến lược nguồn dữ liệu POI cho TripWise trước khi bước sang phase ảnh, media, review hoặc content enrichment nặng hơn.

Mục tiêu chính:

- Xây nguồn POI sạch, có provenance rõ ràng cho TripWise.
- Giảm phụ thuộc vào Geofabrik/OSM raw như nguồn duy nhất vì chi phí lọc và moderation cao.
- Giữ nguyên nguyên tắc public API chỉ đọc từ PostgreSQL + PostGIS nội bộ.
- Không gọi external POI API ở runtime cho request người dùng.
- Tách rõ nguồn nền identity/location/category với phase ảnh/review/media về sau.
- Chuẩn bị nền staging, dedup, moderation và benchmark để hệ thống có thể scale đến dữ liệu lớn và hàng triệu user mà không biến runtime thành external dependency.

Roadmap này chỉ nói về chiến lược nguồn dữ liệu POI.

Không nằm trong roadmap này:

- Ảnh địa điểm
- Review/tips/user generated content
- Media enrichment
- Runtime place search từ external vendors

## 2. Nguyên tắc bắt buộc

- Public API chỉ đọc dữ liệu từ DB nội bộ, không gọi Foursquare, Overture, OpenTripMap, Overpass hay nguồn POI ngoài ở runtime.
- External source chỉ được dùng cho batch, offline, staging, dry-run, admin-reviewed backfill.
- Không dùng Google Places vì dự án muốn tránh chi phí cao và tránh khóa chặt vào vendor.
- Không dùng Gemini để bịa địa điểm, tọa độ, khách sạn, quán ăn hoặc facts nguồn POI.
- Không runtime gọi Overpass, OpenTripMap, Foursquare hay Overture cho mỗi request người dùng.
- Mọi nguồn mới phải có license/terms đủ rõ trước khi cân nhắc production.
- DRY_RUN bắt buộc trước APPLY.
- Không import thẳng vào `places` public.
- Mọi source mới phải đi qua staging rồi mới dedup, moderation, admin review, APPLY.
- Dedup là bước bắt buộc trước khi merge source.
- Provenance/source metadata là bắt buộc để audit, rollback, so sánh source conflict và benchmark sau này.
- Không expose persistence entity ra API; public response vẫn phải qua DTO và contract hiện có.
- Thiết kế phải phù hợp Modular Monolith + Clean Architecture: import/source adapters là hạ tầng, business rules nằm ở application/domain.
- Tư duy scale phải là offline import + indexed DB/runtime cache, không phải external runtime dependency.

## 3. Source strategy đã chốt

| source | role | placeTypes | runtimeAllowed | productionFit | note |
|---|---|---|---|---|---|
| Geofabrik / OSM_GEOFABRIK | Baseline source hiện tại | ATTRACTION, FOOD, HOTEL, SERVICE | No | Yes, nhưng raw và tốn công lọc | Vẫn giữ làm baseline, không bỏ ngay |
| Foursquare OS Places | POC 1, primary candidate cho commercial POI sạch hơn | FOOD, HOTEL, SERVICE, một phần ATTRACTION | No | High nếu license/access/schema/coverage đạt | Ưu tiên đầu tiên để giảm gánh lọc OSM raw |
| Overture Places | POC 2, cross-check/enrich | FOOD, HOTEL, SERVICE, ATTRACTION | No | Medium-High | Mạnh ở stable IDs, confidence/status, address normalization |
| OpenTripMap | ATTRACTION/content enrichment | Chủ yếu ATTRACTION | No | Medium cho enrichment, không phù hợp làm source production duy nhất | Không được trở thành runtime dependency public API |
| Vietnam.travel | Editorial/content/seed only | Destination/editorial reference | No | Low-Medium | Chỉ dùng nếu terms rõ và chỉ cho seed/editorial |
| GitHub/Kaggle datasets | Demo/seed only | Tùy dataset | No | Low | Chỉ dùng nếu license rất rõ, không mặc định dùng production |

## 4. Phạm vi MVP data source

MVP data source nên đi theo phạm vi hẹp, review được, không import toàn quốc ngay từ đầu.

Trọng tâm đề xuất:

- FOOD, HOTEL, SERVICE: ưu tiên POC với Foursquare OS Places.
- ATTRACTION: tiếp tục dùng Geofabrik đã lọc làm baseline, sau đó mới so sánh với Overture/OpenTripMap ở phase POC riêng.
- Scope địa lý đầu tiên:
  - Nha Trang / Khánh Hòa, hoặc
  - Đà Nẵng
- Chỉ làm subset nhỏ, không import toàn quốc từ source mới trong giai đoạn đầu.
- Chưa làm ảnh/review/media trong phase data source này.

Lý do:

- Scope hẹp giúp đo coverage, category mapping, dedup rate và moderation cost trước khi mở rộng.
- Tránh tạo import cost lớn, query nặng và decision sai ở quy mô toàn quốc.
- Dễ rollback, dễ benchmark trước/sau hơn.

## 5. Ngoài phạm vi MVP

Các mục sau nằm ngoài scope roadmap data source MVP:

- Google Places
- Gemini Maps Grounding
- Runtime external POI API
- Import review/tips
- Import ảnh/media
- Full nationwide import từ source mới ngay lập tức
- Admin UI hoàn chỉnh nếu phase chưa yêu cầu
- Microservices

## 6. Data model hướng đề xuất

Đây chỉ là định hướng thiết kế, không phải migration thực thi trong task này.

Các bảng staging/report có thể cần:

- `place_source_import_batches`
- `place_source_raw_records`
- `place_source_staging_places`
- `place_source_dedup_candidates`
- `place_source_mapping_rules`
- `place_moderation_reports`

Ý nghĩa đề xuất:

- `place_source_import_batches`
  - Theo dõi mỗi lần lấy dữ liệu từ source nào, scope nào, file nào, thời điểm nào.
- `place_source_raw_records`
  - Lưu raw payload để audit, debug mapping, replay parser.
- `place_source_staging_places`
  - Bản ghi đã normalized sơ bộ, chưa merge vào `places`.
- `place_source_dedup_candidates`
  - Kết quả so khớp staging với `places` hiện có hoặc với source khác.
- `place_source_mapping_rules`
  - Rule map category/source field sang internal placeType/risk labels.
- `place_moderation_reports`
  - Báo cáo DRY_RUN, auto-approve candidate, pending, rejected, false positive/negative sample.

Các field chính cần được giữ xuyên suốt:

- `source_name`
- `source_external_id`
- `raw_payload`
- `normalized_name`
- `latitude`
- `longitude`
- `province`
- `city`
- `category`
- `source_category`
- `mapped_place_type`
- `confidence` hoặc `source_confidence`
- `operating_status` nếu source có
- `dedup_status`
- `moderation_status`
- `import_batch_id`
- `created_at`
- `updated_at`

Nguyên tắc thiết kế:

- Không thay thế trực tiếp bảng `places` hiện tại.
- Mọi source mới phải đi qua staging trước.
- Giữ provenance đầy đủ để audit và rollback.
- Nếu phải truy vấn không gian trên staging, cần định hướng GIST index từ đầu.
- Nếu dữ liệu tăng lớn, mọi API/report nội bộ cũng phải có pagination/filter/sort hoặc batch scope rõ ràng.

## 7. Phase 1 — Source Roadmap and Decision Alignment

### Mục tiêu

- Tạo roadmap này.
- Đồng bộ với `place-data-source-selection.md`.
- Chốt rõ rằng phase data source đi trước ảnh/media.

### Acceptance criteria

- File roadmap được tạo.
- Có bảng source strategy.
- Có phase ưu tiên rõ ràng.
- Không code, không DB, không migration.

## 8. Phase 2 — Foursquare OS Places Access and License Verification

### Mục tiêu

- Kiểm tra cách tải Foursquare OS Places.
- Kiểm tra license/terms chính thức.
- Kiểm tra schema fields chính.
- Không import DB.

### Acceptance criteria

- Có report official download/access path.
- Có report confidence về license/terms.
- Có report schema fields quan trọng.
- Xác nhận mức report rằng có thể lọc Việt Nam hay không.
- Xác nhận category có phù hợp FOOD/HOTEL/SERVICE hay không.
- Không update DB.

### Output

- `backend/target/foursquare-os-places-license-access-report.md`
- Hoặc report tương đương trong `docs/` nếu phù hợp hơn với phạm vi tài liệu

## 9. Phase 3 — Foursquare OS Places Small File Inspection

### Mục tiêu

- Tải hoặc chuẩn bị sample dataset theo cách hợp lệ.
- Inspect schema/file format thật.
- Không import main DB.

### Scope

- Chỉ sample nhỏ.
- Nếu dataset lớn thì chỉ inspect metadata hoặc sample rows.
- Không tải dữ liệu lớn nếu chưa cần.

### Acceptance criteria

- Biết format thực tế: parquet/csv/json/iceberg export hoặc format liên quan.
- Biết các field cần map.
- Có sample category hữu ích.
- Có estimate độ phức tạp import/parser.
- Không DB update.

## 10. Phase 4 — Foursquare Vietnam Subset Extraction POC

### Mục tiêu

- Lọc subset Việt Nam hoặc tỉnh/thành đầu tiên.
- Chỉ tạo output file/report.
- Không import places chính.

### Scope

- Nha Trang / Khánh Hòa hoặc Đà Nẵng.
- PlaceTypes ưu tiên:
  - FOOD
  - HOTEL
  - SERVICE
  - ATTRACTION nếu source có dữ liệu đủ dùng

### Acceptance criteria

- Có tổng số record trong scope.
- Có category distribution.
- Có số bản ghi có tọa độ.
- Có số bản ghi có address/city/province.
- Có số bản ghi map được sang TripWise placeType.
- Có sample 50 records để audit tay.
- Không DB update.

## 11. Phase 5 — Staging Schema Design for External POI Sources

### Mục tiêu

- Thiết kế Flyway migration plan cho staging source tables.
- Chưa APPLY nếu task chỉ là design.
- Đảm bảo phù hợp Clean Architecture.

### Acceptance criteria

- Có migration plan rõ.
- Có index strategy rõ:
  - unique trên `source_name + source_external_id`
  - GIST index cho geometry
  - index cho `mapped_place_type`, `moderation_status`, `source_category`
  - index cho `import_batch_id`
- Chỉ mô tả thiết kế, chưa tạo migration trong phase roadmap này.

## 12. Phase 6 — Foursquare Staging Import POC

### Mục tiêu

- Import subset nhỏ vào staging table.
- Không đụng `places` public.

### Scope

- Một tỉnh/thành.
- Một batch.
- Có rollback hoặc cleanup strategy cho staging.

### Acceptance criteria

- Import vào staging thành công.
- Có batch metadata.
- Không ghi vào `places` chính.
- Có test cho repository/import service nếu phase đó có code.
- Có report coverage sau import.

## 13. Phase 7 — Dedup Against Existing Places

### Mục tiêu

- So sánh Foursquare staging với `places` hiện tại từ Geofabrik và `MANUAL_SEED`.
- Chỉ tạo kết quả dedup, không merge.

### Dedup logic đề xuất

- `source_external_id` nếu đã có.
- `normalized_name`.
- Spatial proximity.
- Same city/province.
- Category compatibility.
- Confidence score nếu source có.

### Acceptance criteria

- Có report duplicate candidates.
- Có report likely new places.
- Có report conflict category.
- Không update `places` chính.

## 14. Phase 8 — Moderation DRY_RUN for Foursquare Candidates

### Mục tiêu

- Đánh giá candidate nào có thể public.
- Chỉ DRY_RUN.

### Acceptance criteria

- Có tổng candidate.
- Có `wouldAutoApproved`.
- Có `wouldPending`.
- Có `wouldRejected`.
- Có false positive sample.
- Có false negative sample.
- Không update DB chính.
- No APPLY.

## 15. Phase 9 — APPLY Approved Foursquare Candidates Local/Dev

### Mục tiêu

- Chỉ sau khi user/admin xác nhận, APPLY batch nhỏ vào `places`.
- Chỉ local/dev trước.

### Acceptance criteria

- APPLY scope rõ.
- Không đụng record ngoài batch.
- Có inserted/updated count.
- Có provenance đầy đủ.
- Có verify count qua public API nội bộ sau khi load.
- Có rollback/cleanup plan nếu cần.

## 16. Phase 10 — Overture Places POC

### Mục tiêu

- Làm POC thứ hai với Overture.
- Dùng để cross-check hoặc enrich confidence/status/address.

### Acceptance criteria

- License/access được verify.
- Vietnam subset hoặc scope nhỏ được inspect.
- Có so sánh với Foursquare và Geofabrik.
- Có report usefulness của confidence/status.
- Không merge nếu chưa duyệt.

## 17. Phase 11 — OpenTripMap ATTRACTION/Content POC

### Mục tiêu

- Kiểm tra OpenTripMap cho ATTRACTION/content.
- Không biến nó thành runtime dependency.
- Không dùng production nếu plan/terms không phù hợp.

### Acceptance criteria

- License/pricing/terms được verify.
- Scope nhỏ, review được.
- Có report coverage ATTRACTION.
- Có report content fields.
- Public API không gọi runtime tới OpenTripMap.

## 18. Phase 12 — Source Priority Decision

### Mục tiêu

- Sau các POC, chốt nguồn production theo placeType.

### Output decision matrix

| placeType | primary source | secondary source | fallback | notes |
|---|---|---|---|---|
| FOOD | TBD sau POC | TBD | Geofabrik baseline | Chốt sau benchmark |
| HOTEL | TBD sau POC | TBD | Geofabrik baseline | Chốt sau benchmark |
| SERVICE | TBD sau POC | TBD | Geofabrik baseline | Chốt sau benchmark |
| ATTRACTION | TBD sau POC | TBD | Geofabrik baseline + curated seed | Chốt sau benchmark |

### Acceptance criteria

- FOOD source được chốt.
- HOTEL source được chốt.
- SERVICE source được chốt.
- ATTRACTION source được chốt.
- Source priority được document rõ.
- Cập nhật `DECISIONS.md` nếu cần quyết định kiến trúc/chính sách mới.

## 19. Phase 13 — Public Data Quality Benchmark

### Mục tiêu

- So sánh trước/sau khi có source mới.

### Metrics

- total public places by placeType
- coverage by province/city
- percent with known city/province
- dedup rate
- pending/rejected rate
- false positive sample
- API response size
- map marker count

### Acceptance criteria

- Có benchmark report.
- Public API không có query full-table thiếu pagination khi dữ liệu tăng.
- Có review index/query plan nếu volume tăng lớn.
- Có đánh giá rủi ro payload và map marker density.

## 20. Phase 14 — Prepare for Media Roadmap

### Mục tiêu

- Chỉ sau khi source POI ổn định mới bắt đầu media roadmap.

### Acceptance criteria

- place IDs đủ ổn định cho media linking.
- source provenance rõ.
- wikidata/wikipedia fields nếu có thì đã được lưu hoặc có mapping strategy.
- Có quyết định tạo file roadmap riêng cho media như `place-media-and-review-link-phases.md`.

## 21. Prioritized Task List

1. Create this roadmap file.
2. Verify Foursquare OS Places license/access/schema.
3. Inspect Foursquare sample file.
4. Extract Vietnam/Nha Trang subset report-only.
5. Design staging schema.
6. Import Foursquare subset to staging.
7. Dedup staging vs existing places.
8. Moderation DRY_RUN.
9. APPLY local/dev only after approval.
10. Overture POC.
11. OpenTripMap ATTRACTION/content POC.
12. Source priority decision.
13. Public data quality benchmark.
14. Start media roadmap.

## 22. Risks

- License/terms của source có thể thay đổi theo thời gian.
- Coverage Việt Nam có thể không đủ hoặc không đồng đều.
- Category mapping có thể sai, nhất là SERVICE và ATTRACTION.
- Dataset lớn gây khó khăn cho inspect, extract, import và benchmark.
- Dedup sai có thể gây trùng record hoặc làm mất place tốt hiện có.
- Conflict giữa Geofabrik, Foursquare, Overture có thể làm moderation khó hơn.
- Public API payload có thể tăng mạnh nếu source mới làm dữ liệu dày hơn.
- Index/query performance có thể xuống khi staging và public tables tăng lớn.
- Source POI không đồng nghĩa với có ảnh/review chất lượng; roadmap này chưa xử lý phần đó.

## 23. Decisions

- Làm data source trước media.
- Foursquare OS Places là POC first.
- Overture là POC second.
- OpenTripMap chỉ dành cho ATTRACTION/content enrichment.
- Geofabrik vẫn giữ vai trò baseline source.
- External source không được gọi runtime.
- Mọi source mới phải đi qua staging + dedup + moderation DRY_RUN + admin review trước APPLY.
- Review/ảnh/media là roadmap sau.

## 24. Next suggested task

Verify Foursquare OS Places license/access/schema and create a report, no DB update.
