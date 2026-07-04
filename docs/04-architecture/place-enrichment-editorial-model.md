# Place Enrichment, Editorial Review, and Popularity Model

Tai lieu nay mo ta thiet ke logic cho Phase 4.9 cua TripWise: lam giau du lieu dia diem, tach ro fact va presentation, dinh nghia quy trinh editorial review, va chot cach tinh popularity score ma TripWise tu so huu.

Phase nay chi giai quyet:

- Kien truc nhieu lop cho du lieu place
- Ranh gioi nguon du lieu cho tung nhom field
- Quy trinh editorial review
- Nguyen tac fallback khi thieu enrich
- Cong thuc muc cao cho `popularity_score` va `tripwise_score`

Phase nay khong giai quyet:

- Migration database moi
- Chot bang/cot/index cu the trong PostgreSQL
- Trien khai batch sync enrich that
- Trien khai API public moi

Nhung phan do thuoc Phase 4.10, 4.11 va 4.12.

---

## 1. Muc tieu san pham

TripWise can du lieu dia diem du rong de phu toan Viet Nam, nhung cung du giau de:

- Hien thi place card hap dan tren web/mobile
- Loc va scoring theo chat luong du lieu
- Co mo ta, opening hours, gia ve, rating khi co
- Khong de AI tu bia fact
- Khong phu thuoc hoan toan vao mot vendor duy nhat

Vi vay du lieu place cua TripWise can duoc tach thanh nhieu lop thay vi don gian chi co mot bang places voi moi field tron lan.

---

## 2. Kien truc 4 lop cho du lieu place

### 2.1 Base place layer

Nguon chinh:

- `Geofabrik/OSM`

Tra loi cac cau hoi:

- Dia diem nay la gi
- O dau
- Thuoc loai nao

Field thuoc lop nay gom:

- `source`
- `source_external_id`
- `name`
- `location`
- `city/province`
- `category`
- `raw_tags`
- `is_active`

Nguyen tac:

- Day la lop xac dinh identity co ban cua place
- Khong doi source of truth thanh vendor enrich
- Neu enrich that bai, place van ton tai va van co the duoc hien thi/co ban do

### 2.2 Enrichment layer

Nguon hop le co the dung:

- Google Places
- Goong
- Foursquare
- Provider thuong mai khac da duoc duyet ve license va chi phi
- OSM neu mot so field ton tai ro rang va duoc danh dau do tin cay thap hon

Field enrich uu tien:

- `rating`
- `review_count`
- `opening_hours`
- `price_level`
- `ticket_price_min`
- `ticket_price_max`
- `image_url`
- `image_source`
- `provider_updated_at`

Nguyen tac:

- Moi field enrich quan trong phai co metadata nguon va thoi diem dong bo
- Khong overwrite mu thong tin editorial cua TripWise
- Provider enrich la lop bo sung, khong phai identity layer

### 2.3 Editorial/verified layer

Nguon chinh:

- Admin TripWise
- Reviewer noi bo
- Du lieu curate thu cong cho cac diem hot

Field editorial:

- `short_description`
- `travel_highlights`
- `best_time`
- `visit_duration_minutes`
- `tips`
- `family_fit`
- `couple_fit`
- `student_fit`
- `verification_status`
- `editorial_updated_at`

Nguyen tac:

- Cac field anh huong truc tiep toi recommendation chat luong cao can qua review
- Gia ve, best time, tips va nhung thong tin de gay ky vong sai phai uu tien review thu cong
- Editorial layer la noi TripWise tao kha nang khac biet san pham

### 2.4 Derived intelligence layer

Nguon chinh:

- Hanh vi nguoi dung TripWise
- So lieu tong hop noi bo

Field derived:

- `popularity_score`
- `tripwise_score`
- `saved_count`
- `itinerary_pick_count`
- `detail_view_count`
- `last_interaction_at`

Nguyen tac:

- Day la tai san du lieu rieng cua TripWise
- Khong copy nguyen xi diem pho bien tu vendor ngoai
- Co the tinh lai theo batch va thay doi trong thoi gian

---

## 3. Tach ro fact va presentation

### 3.1 Fact

Fact la nhung du lieu can co nguon va co the audit:

- ten
- toa do
- category
- opening hours
- ticket price
- rating
- review count
- image source

Nguyen tac:

- Fact phai den tu DB TripWise da duoc verify hoac da ghi ro source
- Fact khong duoc de Gemini tu sinh
- Fact quan trong can co `updated_at` va muc do tin cay

### 3.2 Presentation

Presentation la lop dien dat cho nguoi dung:

- mo ta du lich hay
- caption
- ly do goi y
- travel highlight text

Nguyen tac:

- Presentation co the do admin viet hoac AI viet
- Neu AI viet, AI chi duoc viet tu fact da xac minh
- Presentation phai bi chan khong duoc tu them gia ve, gio mo cua, rating, ten dia danh hay claim khong co trong fact

### 3.3 Ranh gioi bat buoc

TripWise phai quan ly theo nguyen tac:

- Fact sai la loi du lieu
- Presentation te la loi UX/content

Khong tron 2 loai loi nay vao mot noi, vi se rat kho audit va kho sua.

---

## 4. Nhom field logic can co

Day la nhom field logic can duoc ho tro sau khi sang phase schema expansion. Chua phai cam ket bang/cot cu the o phase nay.

### 4.1 Core

- `source`
- `source_external_id`
- `name`
- `location`
- `category`
- `raw_tags`

### 4.2 Enrichment

- `rating`
- `review_count`
- `opening_hours`
- `price_level`
- `ticket_price_min`
- `ticket_price_max`
- `image_url`

### 4.3 Editorial

- `short_description`
- `travel_highlights`
- `best_time`
- `visit_duration_minutes`
- `verification_status`

### 4.4 Derived

- `popularity_score`
- `tripwise_score`
- `last_synced_at`

---

## 5. Audit va source metadata

Voi cac field enrich va fact nhay cam, can co kha nang tra loi:

- Field nay den tu dau
- Dong bo luc nao
- Da duoc reviewer xac nhan chua
- Gia tri hien tai la tu dong hay editorial override

Toi thieu can co metadata logic cho:

- `source`
- `updated_at`
- `verification_status`
- `confidence` hoac muc do tin cay neu can

Voi mot so field nhu `opening_hours`, `ticket_price`, `rating`, `image_url`, can uu tien cho phep audit theo tung field hoac tung nhom field, thay vi chi co mot `updated_at` chung cho toan bo place.

---

## 6. Editorial workflow

Quy trinh de xuat:

1. Import du lieu nen tu Geofabrik/OSM
2. Enrich theo batch tu provider hop le
3. Danh dau cac place can review
4. Admin/reviewer xac minh cac diem quan trong
5. Chi place dat yeu cau moi vao tap recommendation chat luong cao

### 6.1 Verification status toi thieu

- `UNVERIFIED`
- `PARTIALLY_VERIFIED`
- `VERIFIED`
- `REJECTED`

### 6.2 Uu tien review

Nen uu tien review cho:

- Diem noi bat o thanh pho du lich lon
- Diem xuat hien nhieu trong recommendation
- Diem co gia ve/gio mo cua de gay anh huong lon den trai nghiem

### 6.3 Editorial override

Neu admin da review va override:

- Gia tri editorial duoc uu tien hon gia tri auto-enrich
- Van phai luu metadata de biet da override tu dau

---

## 7. Fallback khi thieu enrich

He thong van phai hoat dong neu place chi co base layer.

Nguyen tac fallback:

- Co the hien thi place card co ban voi ten, category, location
- UI phai biet field nao dang thieu de khong hien thi gia/hours/rating gia
- Scoring co the giam trong so cho place thieu enrich, nhung khong loai bo mac dinh neu no van la POI hop le
- Khong dung placeholder nghe co ve nhu fact that

Dieu nay giup TripWise mo rong nhanh toan quoc ma khong can cho du lieu phong phu 100% ngay tu dau.

---

## 8. Popularity score va TripWise score

### 8.1 Popularity score

`popularity_score` khong nen la ban sao cua mot vendor. No nen la metric tong hop noi bo.

Tin hieu dau vao de xet:

- `rating`
- `review_count`
- `itinerary_pick_count`
- `saved_count`
- `detail_view_count`

Nguyen tac:

- Rating cao nhung review qua it khong nen vuot xa diem co review on dinh
- Hanh vi that cua user TripWise phai tang trong so theo thoi gian
- Co the them decay theo thoi gian de tranh metric bi dong bang

### 8.2 TripWise score

`tripwise_score` rong hon `popularity_score`. No co the ket hop:

- `popularity_score`
- `verification_status`
- do day du enrich
- chat luong editorial
- do phu hop voi muc dich du lich

Score nay phuc vu:

- Search ranking
- Candidate selection
- Featured places

### 8.3 Nguyen tac tinh diem

Phase 4.9 chi chot logic muc cao:

- Khong hardcode cong thuc cuoi cung vao docs nhu mot chan ly bat bien
- Cong thuc phai co kha nang tune theo du lieu that
- Khong de metric de bi game boi mot tin hieu don le

---

## 9. Chien luoc rollout

### 9.1 MVP gan

- OSM/Geofabrik lam xuong song
- Curate thu cong cho cac diem hot
- Editorial review cho tap diem duoc dua vao recommendation chat luong cao

### 9.2 Giai doan mo rong

- Them provider enrich cho `rating`, `opening_hours`, `review_count`
- Dong bo batch theo thanh pho uu tien

### 9.3 Giai doan truong thanh

- Tinh `popularity_score` va `tripwise_score` tu hanh vi that cua user TripWise
- Mo rong editorial workflow va SLA refresh cho cac thanh pho quan trong

---

## 10. Security va compliance notes

- Khong scrape nguon khong ro license de lay review/anh/gio mo cua production
- Khong de Gemini sinh fact ma khong co du lieu goc da xac minh
- Cac provider enrich phai duoc cau hinh timeout, quota control, va masking secret
- Neu hien thi anh tu nguon ngoai, can luu y attribution va quyen su dung

---

## 11. Deliverables cua Phase 4.9

Sau phase nay, team phai chot duoc:

- Kien truc 4 lop cho du lieu place
- Ranh gioi giua `fact` va `presentation`
- Nhom field logic cho core, enrichment, editorial, derived
- Quy trinh review va fallback
- Dinh huong tinh `popularity_score` va `tripwise_score`

Neu chua chot duoc nhung diem tren thi khong nen sang phase 4.10 de dong schema database.
