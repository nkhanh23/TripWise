                                                    # Place Data Source Selection

Mục tiêu của tài liệu này là chọn nguồn POI sạch nhất và phù hợp nhất cho TripWise sau khi Geofabrik/OSM raw đã cho thấy chi phí lọc quá cao.

Phạm vi:

- Chỉ phân tích nguồn dữ liệu POI
- Chỉ ra nguồn nào phù hợp cho production, POC, content/seed
- Không code import pipeline
- Không update DB
- Không APPLY

---

## Summary

Kết luận chính:

- **Foursquare OS Places** là lựa chọn POC đầu tiên tốt nhất cho TripWise nếu ưu tiên POI sạch hơn OSM raw, coverage rộng, category phong phú, và license/terms có thể đọc được từ official docs.
- **Overture Places** là nguồn secondary rất mạnh để cross-check/enrich nhờ bulk download, schema rõ, confidence score, operating_status, stable IDs, và data access offline tốt.
- **OpenTripMap** phù hợp nhất cho **ATTRACTION/content enrichment** và POC chuyên sâu cho sightseeing, nhưng không phù hợp làm nguồn production duy nhất vì plan free là **non-commercial** và service có quota/runtime dependency.
- **Vietnam.travel / VNA tourism** chỉ nên dùng làm **content/seed/editorial reference** nếu terms cho phép; không nên coi là POI database đầy đủ.
- **GitHub/Kaggle travel datasets** chỉ nên dùng cho demo/seed khi license rõ ràng; không nên dùng production nếu license mơ hồ.

Khuyến nghị thực thi:

1. POC đầu tiên: **Foursquare OS Places subset**
2. POC thứ hai: **Overture Places subset**
3. OpenTripMap: chỉ dùng cho **ATTRACTION/content**
4. Vietnam.travel: chỉ dùng **content/seed**
5. GitHub/Kaggle: **demo/seed only** nếu license rõ

---

## Files changed

- `docs/08-project-roadmap/place-data-source-selection.md`

## Database changed

- Không có.

## Sources evaluated

### Official sources

- OpenTripMap API product, pricing, terms: <https://dev.opentripmap.org/product>, <https://dev.opentripmap.org/price>, <https://dev.opentripmap.org/legal/short-offer>
- OpenTripMap main site: <https://opentripmap.com/>
- Foursquare OS Places landing page: <https://opensource.foursquare.com/os-places/>
- Foursquare OS Places schema docs: <https://docs.foursquare.com/data-products/docs/places-os-data-schema>
- Foursquare OS Places access docs: <https://docs.foursquare.com/data-products/docs/access-fsq-os-places>
- Foursquare pricing page: <https://foursquare.com/pricing/>
- Overture documentation home: <https://docs.overturemaps.org/>
- Overture quickstart/data access: <https://docs.overturemaps.org/getting-data/>
- Overture attribution/licensing: <https://docs.overturemaps.org/attribution/>
- Overture places schema reference: <https://docs.overturemaps.org/schema/reference/places/place/>
- Vietnam.travel official homepage: <https://vietnam.travel/>

### Notes on verification

- OpenTripMap official docs were accessible and explicitly showed pricing/terms.
- Foursquare OS Places official docs were accessible and explicitly showed Apache 2.0 for the open-source schema/data docs.
- Overture official docs were accessible and explicitly showed bulk data access plus per-theme licensing and attribution.
- Vietnam.travel homepage clearly identifies itself as the official tourism website and exposes Terms of Use / Privacy Policy links, but the linked terms page could not be fetched in this environment, so it should be treated as **content reference only** until manually verified.

---

## Comparison table

| source | bestFor | license/terms confidence | bulk/offline | runtime cost risk | data cleanliness | Vietnam coverage risk | import complexity | recommended role |
|---|---|---:|---:|---:|---:|---:|---:|---|
| Foursquare OS Places | FOOD, HOTEL, SERVICE, mixed POI base | High | Yes | Low if offline; high if using API | High | Medium | Medium | POC 1, likely primary production candidate |
| Overture Places | Cross-check/enrich, stable IDs, confidence, address/contact | High | Yes | Low if offline | High | Medium | Medium-High | POC 2, secondary production source |
| OpenTripMap | ATTRACTION, sightseeing content, descriptions | Medium-High | Partial via API; export/download exists | High if API used at runtime | Medium | Medium-High | Low-Medium | ATTRACTION/content only |
| Vietnam.travel / VNA tourism | Editorial content, inspiration, curated seed text | Medium at site level; terms need manual check | No real bulk POI dataset | None at runtime if used as content only | High for editorial copy, not POI identity | High for coverage as a POI database | Low | Content/seed only |
| GitHub/Kaggle travel datasets | Demo, seed, exploration | Low unless each dataset has a clear license file | Sometimes yes | Low offline; undefined legally | Variable | Variable | Medium | Demo/seed only |

---

## Recommended ranking

1. **Foursquare OS Places**
2. **Overture Places**
3. **OpenTripMap**
4. **Vietnam.travel / VNA tourism**
5. **GitHub/Kaggle datasets**

### Why Foursquare OS Places ranks first

- Official docs expose a clear open-source data model and access path.
- The dataset is large enough for nationwide coverage experiments.
- It has richer POI attributes than raw OSM for FOOD/HOTEL/SERVICE.
- The schema docs explicitly show **Apache 2.0** for the open-source data docs.
- It can be downloaded and processed offline, so it fits TripWise’s no-runtime-external-API rule.

### Why Overture ranks second

- Official docs expose bulk download and latest-release access.
- The schema is structured, with confidence and operating_status.
- Stable IDs help dedupe and cross-source reconciliation.
- License attribution is clear and production-friendly, but the source mix means Vietnam coverage still needs benchmarking.

### Why OpenTripMap ranks third

- Very relevant for attraction/sightseeing content.
- Official pricing and terms are simple to verify.
- However, the free plan is non-commercial and API-driven, so it is not a clean primary production source for TripWise.

---

## Best fit for TripWise

### ATTRACTION

- Best primary POC source: **Overture Places**
- Best attraction/content supplement: **OpenTripMap**

Reasoning:

- Overture gives structured places, confidence, addresses, and stable IDs.
- OpenTripMap is strong for sightseeing-specific descriptions and attraction discovery, but should not be the production dependency.

### FOOD

- Best primary POC source: **Foursquare OS Places**

Reasoning:

- Better category depth and place attributes for commercial POI than raw OSM.
- Clear dataset access path and open-source docs.
- Good fit for restaurant/cafe/food-court style categories.

### HOTEL

- Best primary POC source: **Foursquare OS Places**
- Secondary cross-check: **Overture Places**

Reasoning:

- Foursquare exposes hotel-like POIs and contact/address data.
- Overture adds confidence and operating status that help with dedupe and validation.

### SERVICE

- Best primary POC source: **Foursquare OS Places**
- Secondary cross-check: **Overture Places**

Reasoning:

- SERVICE needs broader commercial POI coverage and category detail.
- Foursquare is stronger on practical venue coverage.

### Content/description

- Best source: **OpenTripMap**
- Best official editorial reference: **Vietnam.travel** if terms allow reuse of text fragments or inspiration only

Reasoning:

- OpenTripMap is more attraction-centric.
- Vietnam.travel is official tourism editorial content, not a POI database.

### Demo/seed only

- **GitHub/Kaggle datasets**

Reasoning:

- Use only when the specific dataset has a clear, permissive license file.
- Otherwise keep it out of production to avoid legal and provenance risk.

---

## Runtime strategy

TripWise public API must **not** call external POI sources at runtime.

Recommended runtime rule:

- Public API reads only from PostgreSQL + PostGIS
- External POI sources are used offline or in batch jobs only
- External source calls are allowed only in:
  - offline import
  - staging/enrichment batch
  - dry-run audit
  - admin-reviewed backfill

This keeps runtime predictable and avoids:

- quota failures
- vendor outages
- variable latency
- hidden cost per user request

---

## Batch import strategy

Proposed flow:

1. Download source release or export snapshot offline
2. Land raw files in staging storage
3. Normalize to source-specific staging tables
4. Map to internal `placeType`
5. Deduplicate against existing places using:
   - `source + sourceExternalId`
   - normalized name
   - province/city
   - spatial proximity
6. Run moderation as **DRY_RUN**
7. Review admin report
8. APPLY only for approved batch scope
9. Keep provenance fields so future cross-source reconciliation remains auditable

Design constraints:

- No runtime coupling to vendor APIs
- No direct overwrite of high-confidence records with low-confidence records
- Keep source metadata and confidence in the model
- Preserve batch reproducibility

---

## First POC recommendation

### Source

- **Foursquare OS Places**

### Scope

- One province/city subset with known TripWise baseline data
- Recommended first scope: **Nha Trang / Khánh Hòa**

### Place types

- `FOOD`
- `HOTEL`
- `SERVICE`
- `ATTRACTION`

### Output report

- total records ingested in staging
- category distribution
- Vietnam subset coverage
- dedupe collision count
- unresolved flags / confidence distribution
- candidate auto-public count by placeType
- top false-positive / false-negative samples
- comparison against current Geofabrik/OSM baseline

### Constraints

- Do not update main `places` table
- Do not APPLY
- Do not expose public API changes

### Why this POC first

- It gives the most direct signal for whether a cleaner POI dataset can replace part of the OSM raw cleanup burden.
- It covers the largest practical share of TripWise demand: FOOD, HOTEL, SERVICE, and enough ATTRACTION for comparison.

---

## Risks

- **Foursquare OS Places**
  - License is clear in official docs, but the portal/onboarding flow still needs operational verification.
  - Vietnam-specific coverage must be benchmarked, not assumed.
- **Overture Places**
  - Great technical fit, but the mix of upstream sources means some Vietnam categories may still be incomplete.
  - Cross-source dedupe will still be needed.
- **OpenTripMap**
  - Free tier is non-commercial.
  - API dependency is not a good fit for TripWise runtime.
- **Vietnam.travel**
  - Terms could not be fetched in this environment.
  - Use only as editorial reference until terms are manually checked.
- **GitHub/Kaggle**
  - License provenance varies by dataset.
  - Production use is unsafe unless each dataset is individually verified.

---

## Open questions

1. Do we want to spend time on a legal pass for Foursquare portal terms before any production decision?
2. Should the first POC benchmark use **Nha Trang / Khánh Hòa** or **Đà Nẵng**?
3. Do we want Overture as the default cross-check layer after the first POC?
4. Should OpenTripMap remain strictly an ATTRACTION/content source, or should it be excluded entirely from production planning because of the non-commercial free tier?
5. Are there any specific GitHub/Kaggle datasets the team already trusts and has a license file for?

---

## Recommendation

- **USE_FOURSQUARE_OS_PLACES_POC_FIRST**

Why:

- Best balance of cleaner POI structure, broad category coverage, offline/batch friendliness, and explicit open-source documentation.
- Strong enough for FOOD/HOTEL/SERVICE, which are the areas where Geofabrik raw is currently most expensive to clean.
- Still leaves Overture available as the second source for confidence and dedupe.

---

## Next suggested task

- Làm một POC rất nhỏ: benchmark **Foursquare OS Places subset cho Nha Trang / Khánh Hòa** theo staging-only, report coverage + dedupe + category distribution, không chạm DB chính.

