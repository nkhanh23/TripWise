# Nationwide Place Ingestion Pipeline

Tai lieu nay mo ta pipeline nhap du lieu dia diem toan Viet Nam cho TripWise trong Phase 4.8.

Muc tieu cua phase nay la chot duoc cach lay du lieu nen tu OpenStreetMap/Geofabrik va dua vao PostgreSQL + PostGIS mot cach co kiem soat, co kha nang mo rong, va khong phu thuoc vao runtime API public.

Phase nay chi giai quyet:

- Nguon du lieu nen cho place
- Cach import offline theo batch
- Cach loc va map tag OSM
- Cach dedupe va review
- Cach refresh du lieu dinh ky
- Ranh gioi giua du lieu nen va cac phase enrich ve sau

Phase nay khong giai quyet:

- Mo rong schema database cu the
- Viet migration moi
- Trien khai job import that
- Them rating/review/image/opening hours tu provider enrich

Nhung phan do thuoc cac phase sau, dac biet la 4.9, 4.10, 4.11 va 4.12.

---

## 1. Muc tieu san pham

TripWise can mot nguon du lieu dia diem:

- Co do phu rong tren toan Viet Nam
- Co toa do that de route, map va nearby query hoat dong dung
- Co category va tag de scoring/filter co the su dung ngay
- Co kha nang dong bo dinh ky
- Co the enrich them sau nay ma khong pha vo source of truth

Nguon duy nhat phu hop nhat voi cac rang buoc hien tai cua du an la:

- `Geofabrik Vietnam Extract` lam nguon import offline chinh
- `OpenStreetMap/Overpass` lam cong cu ho tro query nho, tag exploration va backfill co kiem soat

---

## 2. Nguyen tac kien truc

### 2.1 Source of truth

Source of truth cho place production phai la PostgreSQL + PostGIS cua TripWise, khong phai API ben ngoai.

Dieu nay co nghia:

- Client web/mobile khong query truc tiep Overpass de lay POI production
- Backend khong goi Overpass runtime de sinh danh sach dia diem cho nguoi dung
- Du lieu place phai duoc import va luu noi bo truoc khi duoc scoring, route, weather-adjust, va hien thi

### 2.2 Offline first ingestion

Thay vi phu thuoc vao public API runtime:

1. Tai file extract toan Viet Nam
2. Import vao luong xu ly noi bo
3. Loc POI phu hop voi TripWise
4. Map sang category noi bo
5. Dedupe
6. Danh dau verified/unverified
7. Dua vao database

### 2.3 Khong lam phase sau

Phase 4.8 khong tu y mo rong schema cho enrich fields nhu:

- rating
- review_count
- opening_hours chi tiet
- image_url
- popularity_score

Nhung field nay duoc xu ly o phase enrich va schema expansion sau.

---

## 3. Vai tro cua tung nguon du lieu

### 3.1 Geofabrik Vietnam Extract

Dung lam nguon du lieu nen chinh.

Dung de lay:

- ten dia diem
- toa do
- loai doi tuong OSM
- raw tags
- quan he khong gian

Ly do chon:

- Do phu toan Viet Nam
- Co the import offline
- Khong phu thuoc quota runtime
- Phu hop voi PostGIS

### 3.2 OpenStreetMap / Overpass

Khong dung lam runtime dependency production.

Chi dung cho:

- Thu nghiem query tag
- Kiem tra vung du lieu nho
- Backfill co kiem soat
- Debug mapping OSM tags

### 3.3 Goong / VietMap / Google Places / Foursquare

Khong thuoc scope Phase 4.8.

Neu dung, chi duoc xem la nguon enrich ve sau cho:

- rating
- review_count
- opening_hours
- place details phu tro

---

## 4. Du lieu can lay tu OSM

TripWise khong can ingest moi doi tuong OSM. Can uu tien cac nhom POI co gia tri cho du lich va itinerary.

### 4.1 Nhom tag uu tien

- `tourism=*`
- `amenity=restaurant|cafe|fast_food`
- `leisure=*`
- `natural=beach`
- `historic=*`
- `shop=*` co chon loc

### 4.2 Nhom nen loai bo hoac de sau

- Doi tuong qua technical, khong co gia tri du lich truc tiep
- Doi tuong khong phai POI thuc te
- Doi tuong khong co ten va khong co du lieu bo tro giup hien thi

### 4.3 Tieu chi toi thieu de ingest

Mot record OSM chi nen vao luong import place neu:

- Co ten hoac nhan dien du de review
- Co toa do hop le
- Thuoc nhom tag TripWise can
- Khong bi danh dau ro rang la khong phuc vu du lich/diem den

---

## 5. Mapping OSM sang category noi bo

TripWise dang co category noi bo va scoring logic rieng. Vi vay phai co lop mapping thay vi dua thang raw tags vao UI/business logic.

### 5.1 Nguyen tac mapping

- OSM tag la nguon dau vao
- Category noi bo la output de API/UI/scoring su dung
- Raw tags van phai duoc giu lai de audit va enrich sau

### 5.2 Vi du mapping ban dau

- `tourism=attraction` -> `check-in` hoac `nature/culture` tuy tap rule
- `tourism=museum` -> `culture`
- `tourism=hotel` -> khong vao `places`, ma route sang luong `hotels` neu co
- `amenity=restaurant` -> `food`
- `amenity=cafe` -> `cafe`
- `natural=beach` -> `beach`
- `historic=*` -> `culture`
- `leisure=park` -> `nature`

### 5.3 Quy tac quan trong

- Mapping phai deterministic
- Neu 1 doi tuong co nhieu tags, phai co uu tien mapping ro rang
- Cac truong hop mo ho phai dua ve `other` hoac `needs_review`

---

## 6. Pipeline xu ly du lieu

Pipeline de xuat:

1. Download file `vietnam-latest.osm.pbf`
2. Dua vao luong import offline
3. Trich xuat doi tuong node/way/relation thuoc tag uu tien
4. Chuan hoa du lieu co ban:
   - name
   - location
   - raw tags
   - source id
5. Map category noi bo
6. Dedupe
7. Danh dau `unverified` mac dinh neu chua qua review
8. Luu vao database TripWise
9. Tao bao cao import

### 6.1 Bao cao import toi thieu

- So record duoc doc
- So record hop le
- So record bi bo qua
- So record bi trung
- So record map category that bai
- So record vao `needs_review`

---

## 7. Chien luoc dedupe

Voi du lieu toan quoc, trung lap la van de bat buoc phai xu ly.

### 7.1 Khoa uu tien

Khi co the, uu tien:

- `source`
- `source_external_id`

### 7.2 Dedupe fuzzy

Neu khong co external id on dinh hoac co nhieu ban ghi kha nghi:

- So khop `name`
- So khop `city/province`
- So sanh khoang cach giua 2 diem
- Neu ten gan giong nhau va toa do qua gan nhau thi dua vao hang doi review

### 7.3 Nguyen tac an toan

- Khong xoa im lang mot record nghi trung neu do tin cay thap
- Doi tuong nghi trung nhung khac category can co co che review

---

## 8. Verification va review

Khong phai moi diem import tu OSM deu nen dua vao recommendation chat luong cao ngay lap tuc.

### 8.1 Trang thai toi thieu

- `VERIFIED`
- `UNVERIFIED`
- `NEEDS_REVIEW`
- `REJECTED`

### 8.2 Quy trinh

1. Import tu dong -> `UNVERIFIED`
2. Rule engine danh dau bat thuong -> `NEEDS_REVIEW`
3. Admin/reviewer duyet cac diem noi bat
4. Chi nhung diem dat chuan moi duoc uu tien trong recommendation/chat luong cao

### 8.3 Muc tieu san pham

MVP van co the dung mot tap subset verified cua Nha Trang, trong khi nationwide ingestion tao nen tang cho cac thanh pho khac.

---

## 9. Chien luoc refresh

### 9.1 Batch refresh

Khong goi runtime API public de lam moi danh sach place.

Thay vao do:

- Chay import batch theo lich
- Tai file extract moi
- So sanh record cu va moi
- Cap nhat record thay doi
- Danh dau stale cho record khong con ton tai hoac khong con hop le

### 9.2 Tam su dung ban dau

- MVP: refresh thu cong hoac theo sprint
- Giai doan sau: refresh dinh ky theo tuan/ngay tuy nhu cau

### 9.3 Yeu cau audit

Can theo doi:

- Record nao duoc tao moi
- Record nao duoc cap nhat
- Record nao bi vo hieu hoa
- Ban import nao gay loi mapping

---

## 10. Security va usage policy

### 10.1 Khong de API public thanh runtime dependency

Dieu nay giam:

- Rui ro rate limit
- Rui ro thay doi policy
- Rui ro service outage

### 10.2 Attribution va policy

Can ghi nho:

- OSM duoc dung theo policy va attribution phu hop
- Tile server public khong duoc xem la ha tang production mac dinh cho luu luong lon
- Overpass public khong duoc dung de feed production runtime cho app

### 10.3 Khong dua secret vao pipeline docs

Phase nay khong duoc hardcode API key hay local path may ca nhan.

---

## 11. Scalability notes

Pipeline toan quoc se lon hon rat nhieu so voi seed Nha Trang hien tai, nen can chuan bi:

- Xu ly theo batch
- Logging ro rang
- Dedupe co the chay lap
- Khong query full scan o runtime
- Tach ro ingestion va public query path

Day la ly do Phase 4.8 chi dung o muc pipeline design, truoc khi sang:

- Phase 4.10 cho schema
- Phase 4.11 cho import execution
- Phase 4.12 cho API map-ready

---

## 12. Deliverables cua Phase 4.8

Sau phase nay, team phai chot duoc:

- Nguon du lieu nen chinh
- Cac nhom tag OSM can ingest
- Mapping category tong quan
- Chien luoc dedupe
- Chien luoc verification
- Chien luoc refresh
- Ranh gioi giua Phase 4.8 va cac phase sau

Neu chua chot duoc nhung diem tren thi khong nen sang phase schema expansion/import execution.
