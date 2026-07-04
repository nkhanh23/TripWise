# Place Schema Expansion For Nationwide Data Model

Tai lieu nay chot schema database thuc te cho Phase 4.10. No bien thiet ke cua Phase 4.8 va 4.9 thanh cau truc PostgreSQL + PostGIS cu the ma TripWise se dung de luu du lieu place toan Viet Nam.

Phase nay giai quyet:

- Bang nao duoc them hoac mo rong
- Cot nao duoc them
- Index va constraint nao duoc them
- Cach giu backward compatibility voi MVP hien tai

Phase nay khong giai quyet:

- Job import batch that
- Sync enrich tu provider that
- API public moi cho map/list toan quoc

Nhung phan do thuoc Phase 4.11 va 4.12.

---

## 1. Nguyen tac schema

Schema moi phai dam bao:

- `places` van la bang core identity + location
- Du lieu enrich/editorial/derived duoc tach bang rieng de tranh phinh bang `places`
- Du lieu hien co cua Nha Trang van tiep tuc chay ma khong vo API/search hien tai
- Co metadata de import toan quoc, audit va dedupe

Vi vay Phase 4.10 chon huong:

- Mo rong `places` cho metadata core
- Them cac bang phu 1-1 hoac 1-n cho enrichment, image, editorial, popularity, data source audit

---

## 2. Mo rong bang `places`

Bang `places` giu vai tro:

- identity
- location
- category
- trang thai active
- metadata can thiet cho import va review

### 2.1 Cac cot moi

- `province`
- `district`
- `ward`
- `display_address`
- `source`
- `source_external_id`
- `raw_tags` `jsonb`
- `verification_status`
- `last_synced_at`
- `stale_at`

### 2.2 Quy tac du lieu

- `source` la bat buoc va duoc backfill thanh `MANUAL_SEED` cho du lieu seed hien tai
- `verification_status` la bat buoc va duoc backfill tu `is_verified`
- `raw_tags` la bat buoc, default `{}` de giu cho imported OSM tags ve sau
- `province` duoc backfill `Khanh Hoa` cho seed `Nha Trang` hien tai de giu ngu canh dia ly co ban

### 2.3 Index va constraint moi

- unique partial index `uq_places_source_external_id`
- index `idx_places_province_city_category_active`
- index `idx_places_verification_status_active`
- index `idx_places_source_last_synced_at`
- GIN index `idx_places_raw_tags_gin`
- check constraint `ck_places_verification_status`

---

## 3. Bang `place_enrichments`

Bang nay luu snapshot enrich hien tai cho mot place.

### 3.1 Muc dich

- rating
- review count
- opening hours
- price level
- ticket price
- provider metadata

### 3.2 Cot chinh

- `place_id` PK + FK sang `places`
- `provider_name`
- `provider_place_id`
- `rating`
- `review_count`
- `opening_hours` `jsonb`
- `price_level`
- `ticket_price_min`
- `ticket_price_max`
- `confidence_level`
- `provider_updated_at`
- `synced_at`

### 3.3 Ly do tach bang

- Enrich thay doi thuong xuyen hon core identity
- Moi provider co the co do tin cay khac nhau
- Can audit theo provider ma khong muon phinh bang `places`

---

## 4. Bang `place_images`

Bang nay luu anh duoc phep su dung cho tung place.

### 4.1 Cot chinh

- `id`
- `place_id`
- `image_url`
- `source_name`
- `source_image_id`
- `attribution_text`
- `license_name`
- `is_primary`
- `display_order`

### 4.2 Constraint/index

- partial unique index `uq_place_images_primary_per_place`
- index `idx_place_images_place_id_order`

Ly do tach bang:

- Mot place co the co nhieu anh
- Can luu attribution va license rieng cho tung anh

---

## 5. Bang `place_editorial_contents`

Bang nay luu noi dung do TripWise tu viet hoac duyet.

### 5.1 Cot chinh

- `place_id`
- `short_description`
- `travel_highlights`
- `best_time`
- `visit_duration_minutes`
- `tips`
- `family_fit`
- `couple_fit`
- `student_fit`
- `editorial_status`
- `reviewed_by_user_id`
- `reviewed_at`

### 5.2 Ly do tach bang

- Editorial la lop khac voi fact/enrich
- Can workflow review va publish rieng
- Can cho phep admin override ma khong mat provenance cua fact

---

## 6. Bang `place_popularity_metrics`

Bang nay luu metrics derived ma TripWise tu so huu.

### 6.1 Cot chinh

- `place_id`
- `popularity_score`
- `tripwise_score`
- `saved_count`
- `itinerary_pick_count`
- `detail_view_count`
- `last_interaction_at`
- `computed_at`

### 6.2 Ly do tach bang

- Metrics nay co the duoc recompute theo batch
- Can toi uu cho ranking/filter ma khong muon ghi de lien tuc vao `places`

---

## 7. Bang `place_data_sources`

Bang nay luu audit trail theo nhom field va nguon du lieu.

### 7.1 Cot chinh

- `place_id`
- `field_group`
- `source_name`
- `source_reference`
- `source_url`
- `verification_status`
- `confidence_level`
- `synced_at`
- `notes`

### 7.2 Muc dich

- Tra loi field nay den tu dau
- Phan biet `CORE`, `ENRICHMENT`, `EDITORIAL`, `IMAGE`, `DERIVED`
- Ho tro review va debug sync batch ve sau

---

## 8. Backward compatibility

Phase 4.10 khong duoc lam vo API `/api/v1/places` hien tai.

Vi vay migration duoc thiet ke theo huong:

- Khong xoa cot cu
- Khong sua migration cu da chay
- Giu `rating`, `price_level`, `description`, `is_verified` tren `places` de MVP hien tai van chay
- Chi them bang/cot moi de phase sau chuyen dan logic sang model nationwide

Dieu nay giup:

- test hien tai van pass
- frontend Explore/Favorites hien tai khong bi anh huong
- import execution o Phase 4.11 co schema de ghi du lieu ma khong can refactor lon ngay lap tuc

---

## 9. Trade-off da chon

### 9.1 Vi sao chua bo cot cu tren `places`

Neu di chuyen ngay `rating`, `price_level`, `description` sang bang rieng trong phase nay:

- se lam vo repository/DTO/search hien tai
- se thanh refactor lon ngoai scope

Nen Phase 4.10 uu tien expansion truoc, refactor doc/use sau khi import va API moi da san sang.

### 9.2 Vi sao dung `jsonb`

`raw_tags` va `opening_hours` duoc chon `jsonb` vi:

- can luu payload co cau truc nhung linh hoat
- can query/co index khi can
- phu hop PostgreSQL, khong can dua them database khac

---

## 10. Deliverables cua Phase 4.10

Sau phase nay, team phai biet ro:

- bang nao da ton tai cho nationwide place model
- cot nao, index nao, constraint nao da duoc them
- schema nao duoc dung cho import, enrich, editorial va derived metrics

Sau khi schema nay co san, Phase 4.11 moi co the bat dau viet import/sync/dedupe execution that.
