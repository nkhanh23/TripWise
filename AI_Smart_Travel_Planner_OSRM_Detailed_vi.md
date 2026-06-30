# AI Smart Travel Planner

## Hệ thống lập lịch du lịch thông minh sử dụng AI, OpenStreetMap và OSRM

---

## 1. Tổng quan dự án

**AI Smart Travel Planner** là hệ thống hỗ trợ người dùng lập lịch trình du lịch thông minh. Người dùng có thể nhập nhu cầu du lịch bằng ngôn ngữ tự nhiên, ví dụ:

> Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí.

Hệ thống sử dụng **Gemini API** để phân tích yêu cầu của người dùng, xác định điểm đến, thời gian chuyến đi, sở thích, ngân sách và phong cách du lịch. Sau đó hệ thống lấy dữ liệu thật từ **Google Places API**, **OpenStreetMap** và các nguồn chính thức, lưu vào **PostgreSQL + PostGIS**, rồi gợi ý địa điểm phù hợp, sắp xếp lịch trình theo ngày, tính tuyến đường thực tế bằng **OSRM**, và hiển thị bản đồ bằng **OpenStreetMap kết hợp Leaflet**.

Ngoài ra, hệ thống có thể tích hợp **Weather API** để dự báo thời tiết, giúp điều chỉnh lịch trình phù hợp hơn. Riêng dữ liệu khách sạn được lấy từ hệ sinh thái **OpenStreetMap** thông qua các dịch vụ truy vấn như **Nominatim** hoặc **Overpass API**, sau đó chuẩn hóa và lưu trong **PostgreSQL + PostGIS** để phục vụ gợi ý ổn định hơn.

Nguyên tắc dữ liệu của hệ thống là chỉ dùng dữ liệu thật trong môi trường production. Các ví dụ JSON trong tài liệu này chỉ là ví dụ schema để minh họa cấu trúc lưu trữ, không phải dữ liệu giả cho sản phẩm chạy thật.

---

## 2. Mục tiêu dự án

Dự án hướng đến việc xây dựng một hệ thống có thể:

1. Cho phép người dùng nhập nhu cầu du lịch bằng tiếng Việt tự nhiên.
2. Dùng AI để phân tích điểm đến, số ngày, sở thích và ngân sách.
3. Gợi ý địa điểm phù hợp dựa trên dữ liệu thật đã chuẩn hóa trong hệ thống.
4. Tạo lịch trình du lịch theo từng ngày.
5. Tính tuyến đường thực tế giữa các địa điểm bằng OSRM.
6. Hiển thị bản đồ, marker và tuyến đường bằng OpenStreetMap + Leaflet.
7. Gợi ý khách sạn và khu vui chơi phù hợp với ngân sách bằng dữ liệu thật lấy từ Google Places API, OpenStreetMap và nguồn chính thức.
8. Gợi ý phương tiện di chuyển bằng dữ liệu thật đã chuẩn hóa.
9. Tích hợp Weather API để điều chỉnh lịch trình theo thời tiết.
10. Lưu lịch trình để người dùng có thể xem lại.

---

## 3. Phạm vi dự án

### 3.1 Phạm vi MVP

Phiên bản MVP nên tập trung vào một thành phố để đảm bảo khả năng hoàn thành trong khoảng 2 tháng.

**Phạm vi đề xuất:**

- Thành phố demo: **Nha Trang**
- Thời lượng chuyến đi: **1 đến 3 ngày**
- Sở thích hỗ trợ:
  - Cà phê
  - Cảnh đẹp
  - Ăn uống
  - Check-in
  - Thiên nhiên
  - Tiết kiệm
- Ngân sách:
  - Thấp
  - Trung bình
  - Cao
- Dữ liệu địa điểm:
  - Đồng bộ từ Google Places API, OpenStreetMap/Overpass, Nominatim và các nguồn chính thức được phép
- Dữ liệu khách sạn:
  - Lấy từ Google Places API hoặc OpenStreetMap, sau đó chuẩn hóa và lưu vào PostgreSQL + PostGIS
- Dữ liệu phương tiện:
  - Đồng bộ từ nguồn chính thức của nhà xe, đường sắt, hàng không hoặc API/website được cho phép

### 3.2 Ngoài phạm vi MVP

Không nên đưa các chức năng sau vào bản đầu tiên:

- Đặt phòng khách sạn thật.
- Thanh toán.
- Booking API thật.
- Vé xe, vé tàu, vé máy bay thật.
- Hỗ trợ quá nhiều thành phố.
- Tối ưu tuyến đường nâng cao như hệ thống logistics.
- Chatbot chỉnh sửa lịch trình quá phức tạp.
- Tự động crawl dữ liệu địa điểm từ nhiều nguồn.

---

## 4. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | ReactJS |
| Bản đồ frontend | Leaflet |
| Bản đồ nền | OpenStreetMap tiles |
| Backend | Java Spring Boot |
| Database chính | PostgreSQL + PostGIS |
| Database phụ | Không dùng |
| AI | Gemini API |
| Routing | OSRM |
| Thời tiết | Open-Meteo API hoặc OpenWeather API |
| Authentication | JWT + bcrypt |
| API giao tiếp | REST API |
| Quản lý source code | GitHub |

---

## 5. Công cụ/API dùng cho từng tính năng

| Tính năng | Công cụ/API sử dụng | Ghi chú |
|---|---|---|
| Nhập yêu cầu du lịch | ReactJS Form | Người dùng nhập bằng tiếng Việt |
| Gửi yêu cầu đến backend | REST API | Frontend gọi API Spring Boot |
| Phân tích yêu cầu | Gemini API | Tách destination, days, interests, budget |
| Tạo lịch trình mô tả chi tiết | Gemini API | Viết nội dung lịch trình theo ngày |
| Lưu địa điểm | PostgreSQL + PostGIS | Dữ liệu địa điểm thật đồng bộ từ Google Places API, OpenStreetMap hoặc nhập tay qua link Google Maps đã xác minh |
| Gợi ý địa điểm | PostgreSQL + PostGIS + thuật toán scoring | Không phụ thuộc Google Places |
| Chấm điểm địa điểm | Backend logic | Dựa trên sở thích, chi phí, thời gian |
| Hiển thị bản đồ | Leaflet + OpenStreetMap tiles | Không dùng Google Maps |
| Hiển thị marker | Leaflet Marker | Hiển thị từng địa điểm |
| Popup chi tiết marker | Leaflet Popup | Xem tên, mô tả, chi phí |
| Tính tuyến đường thực tế | OSRM API | Tính route theo đường bộ |
| Tính thời gian di chuyển | OSRM API | Lấy duration từ route |
| Vẽ tuyến đường | Leaflet Polyline + OSRM geometry | Hiển thị đường đi trên bản đồ |
| Dự báo thời tiết | Weather API | Open-Meteo hoặc OpenWeather |
| Gợi ý lịch trình theo thời tiết | Weather API + Backend logic + Gemini | Ưu tiên điểm trong nhà nếu mưa |
| Gợi ý khách sạn | Google Places API + OpenStreetMap + PostgreSQL + PostGIS | Lấy POI khách sạn thật từ nguồn hợp pháp |
| Gợi ý phương tiện | Nguồn chính thức + PostgreSQL | Không dùng dữ liệu giả |
| Lưu lịch trình | PostgreSQL | Lưu itinerary, days, items |
| Đăng nhập/đăng ký | JWT + bcrypt + PostgreSQL | Có thể thêm nếu cần |

---

## 6. Lý do chọn OpenStreetMap + Leaflet + OSRM

### 6.1 Vai trò của OpenStreetMap

OpenStreetMap được dùng làm bản đồ nền và là nguồn dữ liệu POI mở. Ngoài việc hiển thị bản đồ, hệ thống còn có thể khai thác các đối tượng như `tourism=hotel`, `tourism=guest_house`, `tourism=hostel`, `tourism=resort` để lấy danh sách khách sạn trong khu vực Nha Trang.

Ngoài nguồn tự động này, hệ thống cũng cho phép admin nhập bổ sung thủ công bằng cách dán link Google Maps. Backend sẽ trích xuất tên, link tham chiếu và tọa độ nếu có, rồi chuẩn hóa về cùng một schema trước khi lưu vào PostgreSQL + PostGIS.

### 6.2 Vai trò của Leaflet

Leaflet là thư viện JavaScript dùng để tích hợp bản đồ vào frontend ReactJS.

Leaflet dùng để:

- Hiển thị bản đồ.
- Đặt marker địa điểm.
- Hiển thị popup khi bấm marker.
- Vẽ polyline tuyến đường.
- Zoom, pan, tùy chỉnh giao diện bản đồ.

### 6.3 Vai trò của OSRM

OSRM được dùng để tính tuyến đường thực tế giữa các địa điểm và có thể thay đổi theo profile phương tiện mà hệ thống chọn.

OSRM dùng để:

- Tính khoảng cách theo đường bộ.
- Tính thời gian di chuyển.
- Lấy tọa độ tuyến đường.
- Vẽ tuyến đường thực tế trên bản đồ.
- Hỗ trợ sắp xếp lịch trình hợp lý hơn.
- Chọn profile phù hợp như `driving`, `walking` hoặc `cycling` nếu cấu hình routing engine hỗ trợ.

Lưu ý: OSRM **không cung cấp dữ liệu khách sạn**. Dữ liệu khách sạn đến từ OpenStreetMap qua Nominatim hoặc Overpass API, còn OSRM chỉ xử lý route, distance và duration.

---

## 7. Chức năng chính của hệ thống

## 7.1 Nhập yêu cầu du lịch bằng ngôn ngữ tự nhiên

Người dùng nhập yêu cầu tự nhiên, ví dụ:

```text
Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí.
```

Hoặc:

```text
Lập cho tôi lịch trình Nha Trang 2 ngày, thích chụp ảnh, ăn uống và muốn tiết kiệm chi phí.
```

Hệ thống cần trích xuất được:

```json
{
  "destination": "Nha Trang",
  "days": 3,
  "nights": 2,
  "interests": ["cà phê", "cảnh đẹp"],
  "budget": "low",
  "travelStyle": "relaxing"
}
```

---

## 7.2 AI phân tích yêu cầu

Gemini API được sử dụng để phân tích câu nhập của người dùng.

### Gemini cần trả về dữ liệu có cấu trúc

Ví dụ output mong muốn:

```json
{
  "destination": "Nha Trang",
  "duration": {
    "days": 3,
    "nights": 2
  },
  "budget": "low",
  "interests": ["beach", "seafood", "check-in"],
  "travelStyle": "budget_friendly",
  "specialRequirements": []
}
```

### Lưu ý

Không nên để Gemini tự bịa địa điểm hoàn toàn. Gemini chỉ nên:

- Phân tích nhu cầu.
- Viết mô tả lịch trình.
- Giải thích lý do gợi ý.
- Sắp xếp nội dung đầu ra.

Dữ liệu địa điểm nên lấy từ PostgreSQL + PostGIS để đảm bảo địa điểm tồn tại và có tọa độ chính xác.

---

## 7.3 Gợi ý địa điểm phù hợp

Dữ liệu địa điểm được lưu sẵn trong PostgreSQL + PostGIS.

Ví dụ địa điểm:

```json
{
  "name": "Bãi biển Trần Phú",
  "city": "Nha Trang",
  "category": "Cảnh đẹp",
  "description": "Bãi biển nổi tiếng nằm ở trung tâm thành phố Nha Trang, phù hợp để dạo biển, ngắm bình minh và chụp ảnh.",
  "latitude": 12.2388,
  "longitude": 109.1967,
  "estimatedCost": 0,
  "duration": 60,
  "tags": ["cảnh đẹp", "miễn phí", "trung tâm", "check-in"],
  "bestTime": ["morning", "afternoon"],
  "indoor": false
}
```

Hệ thống lọc địa điểm theo:

- Thành phố.
- Sở thích người dùng.
- Ngân sách.
- Tags.
- Chi phí dự kiến.
- Thời điểm nên đi.
- Loại địa điểm trong nhà/ngoài trời.

---

## 7.4 Chấm điểm mức độ phù hợp của địa điểm

Mỗi địa điểm được chấm điểm dựa trên mức độ phù hợp với người dùng.

### Tiêu chí chấm điểm

| Tiêu chí | Điểm gợi ý |
|---|---:|
| Tag trùng sở thích | +30 |
| Phù hợp ngân sách | +20 |
| Phù hợp thời điểm trong ngày | +10 |
| Chi phí thấp nếu user chọn tiết kiệm | +15 |
| Có thời lượng tham quan hợp lý | +10 |
| Gần các địa điểm khác | +15 |
| Ngoài trời nhưng ngày mưa | -25 |
| Chi phí cao hơn ngân sách | -20 |

### Ví dụ

Người dùng thích:

```text
cà phê, cảnh đẹp, ít tốn tiền
```

Kết quả gợi ý:

| Địa điểm | Lý do | Điểm |
|---|---|---:|
| Bãi biển Trần Phú | Cảnh đẹp, miễn phí, gần trung tâm | 90 |
| Tháp Trầm Hương | Check-in, miễn phí | 85 |
| Cà phê view biển | Cà phê, cảnh đẹp | 82 |
| Nhà hàng cao cấp | Không phù hợp ngân sách thấp | 45 |

---

## 7.5 Tạo lịch trình theo ngày

Hệ thống chia địa điểm thành lịch trình theo ngày.

### Nguyên tắc chia lịch trình

- Mỗi ngày từ 3 đến 5 địa điểm.
- Không dồn quá nhiều địa điểm xa nhau trong cùng một ngày.
- Ngày đầu ưu tiên điểm gần trung tâm.
- Ngày cuối ưu tiên lịch nhẹ, gần nơi về.
- Buổi sáng ưu tiên cảnh đẹp, thiên nhiên, ngoài trời.
- Buổi trưa ưu tiên ăn uống, nghỉ ngơi.
- Buổi chiều ưu tiên cafe, check-in.
- Buổi tối ưu tiên chợ đêm, ăn uống, phố đi bộ.
- Nếu ngày mưa, ưu tiên địa điểm trong nhà.

### Ví dụ lịch trình

```text
Ngày 1: Khám phá trung tâm Nha Trang
08:00 - Bãi biển Trần Phú
10:00 - Tháp Trầm Hương
12:00 - Ăn trưa
14:00 - Cà phê view biển
18:00 - Chợ đêm Nha Trang

Ngày 2: Biển đảo và check-in
06:00 - Hòn Chồng
09:00 - Viện Hải dương học
12:00 - Ăn trưa
14:00 - Nhà thờ Núi
18:00 - Ăn tối

Ngày 3: Lịch trình nhẹ
08:00 - Chợ Đầm
10:00 - Mua đặc sản
12:00 - Kết thúc chuyến đi
```

---

## 7.6 Tính tuyến đường bằng OSRM

OSRM được dùng để tính route giữa các địa điểm.

### Input

Danh sách tọa độ:

```json
[
  { "name": "Bãi biển Trần Phú", "lng": 109.1967, "lat": 12.2388 },
  { "name": "Tháp Trầm Hương", "lng": 109.1969, "lat": 12.2400 }
]
```

### Gọi OSRM Route API

Ví dụ endpoint:

```text
GET /route/v1/driving/109.1967,12.2388;109.1969,12.2400?overview=full&geometries=geojson
```

### Output mong muốn

```json
{
  "distance": 900,
  "duration": 240,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [109.1967, 12.2388],
      [109.1968, 12.2393],
      [109.1969, 12.2400]
    ]
  }
}
```

### Dữ liệu dùng trong hệ thống

- `distance`: khoảng cách thực tế theo mét.
- `duration`: thời gian di chuyển theo giây.
- `geometry`: danh sách tọa độ để vẽ polyline trên Leaflet.

---

## 7.7 Sắp xếp thứ tự tham quan hợp lý

Hệ thống sử dụng dữ liệu khoảng cách/thời gian từ OSRM để sắp xếp thứ tự địa điểm.

### Cách làm MVP

Có thể dùng thuật toán đơn giản:

1. Chọn điểm bắt đầu là khách sạn hoặc điểm trung tâm.
2. Tìm địa điểm phù hợp nhất gần điểm hiện tại.
3. Di chuyển sang điểm đó.
4. Tiếp tục chọn điểm gần nhất tiếp theo.
5. Lặp lại cho đến khi đủ số điểm trong ngày.

Đây là cách gần giống thuật toán **Nearest Neighbor**.

### Tiêu chí sắp xếp

- Gần nhau.
- Phù hợp buổi trong ngày.
- Không vượt quá tổng thời gian ngày.
- Không đi vòng quá nhiều.
- Ưu tiên điểm có điểm phù hợp cao.

---

## 7.8 Hiển thị bản đồ và tuyến đường

Frontend sử dụng Leaflet để hiển thị bản đồ.

### Các thành phần bản đồ

- OpenStreetMap tile layer.
- Marker cho từng địa điểm.
- Popup chi tiết địa điểm.
- Polyline tuyến đường từ OSRM.
- Danh sách địa điểm bên cạnh bản đồ.
- Click vào địa điểm thì map focus đến marker tương ứng.

### Popup marker hiển thị

```text
Tên địa điểm: Bãi biển Trần Phú
Loại: Cảnh đẹp
Chi phí dự kiến: 0đ
Thời gian tham quan: 60 phút
Lý do gợi ý: Phù hợp vì miễn phí, gần trung tâm và có cảnh đẹp.
```

---

## 7.9 Dự báo thời tiết

Weather API được dùng để lấy dự báo thời tiết theo ngày.

### API đề xuất

- Open-Meteo API
- OpenWeather API

### Dữ liệu cần lấy

- Nhiệt độ.
- Xác suất mưa.
- Tình trạng thời tiết.
- Tốc độ gió nếu cần.
- Dự báo theo ngày.

### Ứng dụng trong lịch trình

Nếu thời tiết tốt:

- Ưu tiên địa điểm ngoài trời.
- Ưu tiên cảnh đẹp.
- Ưu tiên săn mây, hồ, đồi chè.

Nếu thời tiết xấu:

- Hạn chế điểm ngoài trời.
- Ưu tiên quán cà phê.
- Ưu tiên nhà hàng.
- Ưu tiên điểm trong nhà.
- Cảnh báo người dùng chuẩn bị áo mưa.

### Ví dụ thông báo

```text
Ngày 2 có khả năng mưa cao, hệ thống đã ưu tiên các địa điểm trong nhà như quán cà phê và nhà hàng.
```

---

## 7.10 Gợi ý khách sạn và khu vui chơi

Tính năng này lấy dữ liệu thật từ Google Places API, OpenStreetMap và các nguồn chính thức, không dùng dữ liệu giả.

### Nguồn dữ liệu khách sạn

Hệ thống truy vấn khách sạn và khu vui chơi từ các nguồn hợp pháp bằng một trong các cách:

- Dùng `Google Places API` để lấy danh sách khách sạn, khu vui chơi và điểm tham quan theo vị trí và loại địa điểm.
- Dùng `Overpass API` để bổ sung POI từ OpenStreetMap khi cần mở rộng dữ liệu.
- Dùng `Nominatim` để geocode hoặc đối soát tên khu vực khi cần hỗ trợ truy vấn bổ sung.
- Cho phép admin dán link Google Maps để thêm nhanh một khách sạn, khu vui chơi hoặc địa điểm mới vào hệ thống sau khi xác minh.

Sau khi lấy được dữ liệu, backend sẽ chuẩn hóa và lưu về PostgreSQL + PostGIS để:

- giảm số lần gọi API ngoài
- bổ sung trường ngân sách nội bộ
- lọc nhanh theo khu vực hoặc nhu cầu người dùng
- tránh phụ thuộc hoàn toàn vào dữ liệu ngoài khi người dùng thao tác
- hợp nhất dữ liệu từ Google Places, OpenStreetMap và dữ liệu nhập tay vào cùng một cấu trúc

### Schema dữ liệu khách sạn sau khi chuẩn hóa

```json
{
  "name": "New Sun Hotel",
  "city": "Nha Trang",
  "source": "google_places",
  "osmType": "node",
  "osmId": 123456789,
  "googleMapsUrl": "https://maps.google.com/?q=New+Sun+Hotel+Nha+Trang",
  "category": "hotel",
  "priceLevel": "medium",
  "location": "Trần Phú, Nha Trang",
  "latitude": 12.2381,
  "longitude": 109.1962,
  "tags": ["gần biển", "trung tâm", "phù hợp cặp đôi"],
  "description": "Khách sạn lấy từ dữ liệu thật, nằm gần khu trung tâm biển Nha Trang."
}
```

Nếu dữ liệu được nhập tay từ link Google Maps thì `source` có thể là `manual`, còn `googleMapsUrl` sẽ lưu link gốc để đối chiếu. Nếu lấy từ Google Places API thì `source` là `google_places`, còn nếu lấy từ OpenStreetMap thì `source` là `openstreetmap`.

### Tiêu chí gợi ý

- Thành phố.
- Ngân sách.
- Số đêm.
- Gần bãi biển hoặc trung tâm.
- Phù hợp nhóm bạn, cặp đôi hoặc gia đình.
- Chi phí lưu trú dự kiến.
- Khoảng cách đến các điểm trong lịch trình.

---

## 7.11 Gợi ý phương tiện

Tính năng này dùng dữ liệu phương tiện thật được đồng bộ từ nguồn chính thức và lưu trong PostgreSQL, rồi chọn cách tính khác nhau tùy loại phương tiện mà người dùng chọn.

### Cách tính theo từng phương tiện

- `Xe máy`, `ô tô`, `đi bộ`, `xe đạp`: gọi OSRM với profile tương ứng để lấy `distance`, `duration` và `geometry`.
- `Xe khách`, `tàu`, `máy bay`: dùng dữ liệu phương tiện riêng trong PostgreSQL đồng bộ từ nguồn chính thức vì OSRM không phù hợp cho lịch trình liên tỉnh kiểu này.
- Nếu cần ước lượng nhanh, backend có thể dùng Haversine làm fallback trước khi có route thật.

### Schema dữ liệu phương tiện đã chuẩn hóa

```json
{
  "from": "TP.HCM",
  "to": "Nha Trang",
  "transportType": "Xe khách",
  "estimatedTime": "7-9 giờ",
  "estimatedCost": 320000,
  "calculationSource": "official_source",
  "description": "Phù hợp với người muốn tiết kiệm chi phí."
}
```

### Tiêu chí gợi ý

- Nơi xuất phát.
- Điểm đến.
- Ngân sách.
- Thời gian di chuyển.
- Loại phương tiện.
- Mức độ tiện lợi.
- Nguồn tính toán phù hợp với từng loại phương tiện.

---

## 7.12 Lưu lịch trình

Người dùng có thể lưu lịch trình đã tạo.

### Chức năng lưu trữ

- Lưu thông tin chuyến đi.
- Lưu từng ngày trong lịch trình.
- Lưu từng địa điểm trong mỗi ngày.
- Lưu route geometry từ OSRM nếu cần.
- Lưu tổng chi phí dự kiến.
- Lưu khách sạn và phương tiện gợi ý.

---

## 8. Luồng hoạt động tổng quát

```text
Người dùng nhập yêu cầu du lịch
        ↓
Frontend ReactJS gửi request đến Backend Spring Boot
        ↓
Backend gọi Gemini API để phân tích yêu cầu
        ↓
Backend lấy danh sách địa điểm từ PostgreSQL + PostGIS
        ↓
Backend gọi Weather API để lấy thời tiết
        ↓
Backend chấm điểm địa điểm theo sở thích, ngân sách, thời tiết
        ↓
Backend chia địa điểm theo từng ngày
        ↓
Backend gọi OSRM để tính tuyến đường thực tế
        ↓
Backend sắp xếp thứ tự tham quan hợp lý
        ↓
Gemini API tạo mô tả lịch trình chi tiết
        ↓
Backend lưu lịch trình vào PostgreSQL
        ↓
Frontend hiển thị:
- Lịch trình theo ngày
- Bản đồ OpenStreetMap
- Marker địa điểm
- Tuyến đường OSRM
- Thời tiết
- Khách sạn gợi ý
- Phương tiện gợi ý
```

---

## 9. Kiến trúc hệ thống

```text
Frontend: ReactJS
│
├── Trip Request Page
├── Itinerary Result Page
├── Saved Trips Page
├── Map Component
│   ├── OpenStreetMap Tile Layer
│   ├── Leaflet Marker
│   ├── Leaflet Popup
│   └── Leaflet Polyline
├── Weather Component
├── Hotel Suggestion Component
└── Transport Suggestion Component

Backend: Java Spring Boot
│
├── Auth Controller
├── Trip Controller
├── Place Controller
├── Itinerary Controller
├── Gemini Service
├── Place Recommendation Service
├── Weather Service
├── OSRM Service
├── Route Optimization Service
├── Hotel Suggestion Service
├── Transport Suggestion Service
└── Itinerary Storage Service

Database: PostgreSQL + PostGIS
│
├── places_geo
├── hotels_geo
├── transport_geo
├── route_cache_geo
├── users
├── places
├── itineraries
├── itinerary_days
├── itinerary_items
├── hotels
├── transports
├── route_cache
└── weather_cache
```

---

## 10. Database Design

### Dữ liệu bản đồ là gì?

Trong dự án này, dữ liệu bản đồ là dữ liệu không gian phục vụ hiển thị và tính toán vị trí, gồm:

- `lat/lng` hoặc `geometry` của địa điểm
- lớp bản đồ nền từ OpenStreetMap tiles
- POI như khách sạn, khu vui chơi, điểm tham quan
- tuyến đường và đường đi giữa các điểm
- vùng tìm kiếm theo bán kính, theo bbox, theo khu vực

Phần dữ liệu không gian nên lưu và truy vấn bằng `PostgreSQL + PostGIS`. Các dữ liệu nghiệp vụ như lịch trình, cache API, trạng thái đồng bộ đều có thể lưu chung trong PostgreSQL ở giai đoạn đầu của hệ thống.

### Cách dùng PostGIS trong dự án

- Lưu điểm địa lý bằng kiểu `geography(Point, 4326)` hoặc `geometry(Point, 4326)`
- Tìm địa điểm trong bán kính
- Lọc khách sạn, khu vui chơi theo khu vực
- Tính khoảng cách giữa các điểm
- Tối ưu truy vấn bản đồ cho lượng người dùng lớn

## 10.1 Collection users

### Spatial tables trong PostGIS

```sql
CREATE TABLE places_geo (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  google_maps_url TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hotels_geo (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  source TEXT NOT NULL,
  google_maps_url TEXT,
  osm_id TEXT,
  category TEXT NOT NULL,
  price_level TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_places_geo_location ON places_geo USING GIST (location);
CREATE INDEX idx_hotels_geo_location ON hotels_geo USING GIST (location);
```

### Cách copy

Bạn có thể copy toàn bộ khối `### Spatial tables trong PostGIS` ở trên rồi dán vào phần `## 10. Database Design` ngay trước `## 10.1 Collection users`.

```json
{
  "_id": "ObjectId",
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "passwordHash": "hashed_password",
  "createdAt": "2026-06-24T10:00:00Z",
  "updatedAt": "2026-06-24T10:00:00Z"
}
```

---

## 10.2 Collection places

```json
{
  "_id": "ObjectId",
  "name": "Bãi biển Trần Phú",
  "city": "Nha Trang",
  "category": "Cảnh đẹp",
  "description": "Địa điểm nổi tiếng nằm ở trung tâm thành phố Nha Trang.",
  "latitude": 12.2388,
  "longitude": 109.1967,
  "estimatedCost": 0,
  "durationMinutes": 60,
  "tags": ["cảnh đẹp", "miễn phí", "trung tâm", "check-in"],
  "bestTime": ["morning", "afternoon"],
  "indoor": false,
  "imageUrl": "/images/bai-bien-tran-phu.jpg",
  "isActive": true,
  "createdAt": "2026-06-24T10:00:00Z",
  "updatedAt": "2026-06-24T10:00:00Z"
}
```

---

## 10.3 Collection hotels

```json
{
  "_id": "ObjectId",
  "name": "New Sun Hotel",
  "city": "Nha Trang",
  "source": "openstreetmap",
  "osmType": "node",
  "osmId": 123456789,
  "category": "hotel",
  "priceLevel": "medium",
  "location": "Trần Phú, Nha Trang",
  "latitude": 12.2381,
  "longitude": 109.1962,
  "tags": ["gần biển", "trung tâm", "cặp đôi"],
  "description": "Khách sạn được đồng bộ từ dữ liệu OpenStreetMap và chuẩn hóa trong hệ thống.",
  "rawTags": {
    "tourism": "hotel",
    "name": "New Sun Hotel"
  },
  "lastSyncedAt": "2026-06-24T10:00:00Z",
  "isActive": true
}
```

---

## 10.4 Collection transports

```json
{
  "_id": "ObjectId",
  "from": "TP.HCM",
  "to": "Nha Trang",
  "transportType": "Xe khách",
  "estimatedTime": "7-9 giờ",
  "estimatedCost": 320000,
  "description": "Phù hợp với người muốn tiết kiệm chi phí.",
  "isActive": true
}
```

---

## 10.5 Collection itineraries

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "destination": "Nha Trang",
  "days": 3,
  "nights": 2,
  "budget": "low",
  "interests": ["beach", "seafood", "check-in"],
  "travelStyle": "budget_friendly",
  "totalEstimatedCost": 2500000,
  "hotelSuggestionId": "ObjectId",
  "transportSuggestionId": "ObjectId",
  "createdAt": "2026-06-24T10:00:00Z"
}
```

---

## 10.6 Collection itinerary_days

```json
{
  "_id": "ObjectId",
  "itineraryId": "ObjectId",
  "dayNumber": 1,
  "title": "Khám phá trung tâm Nha Trang",
  "summary": "Ngày đầu tiên tập trung vào các địa điểm gần trung tâm để dễ di chuyển.",
  "weatherSummary": "Trời nắng nhẹ, phù hợp tham quan ngoài trời.",
  "totalDistanceMeters": 5200,
  "totalDurationSeconds": 1800
}
```

---

## 10.7 Collection itinerary_items

```json
{
  "_id": "ObjectId",
  "itineraryDayId": "ObjectId",
  "placeId": "ObjectId",
  "orderIndex": 1,
  "startTime": "08:00",
  "endTime": "09:00",
  "reason": "Phù hợp vì miễn phí, gần trung tâm và có cảnh đẹp.",
  "estimatedCost": 0,
  "distanceFromPreviousMeters": 0,
  "durationFromPreviousSeconds": 0
}
```

---

## 10.8 Collection route_cache

```json
{
  "_id": "ObjectId",
  "fromPlaceId": "ObjectId",
  "toPlaceId": "ObjectId",
  "profile": "driving",
  "distanceMeters": 1600,
  "durationSeconds": 360,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [109.1967, 12.2388],
      [108.4588, 11.9409],
      [109.1969, 12.2400]
    ]
  },
  "createdAt": "2026-06-24T10:00:00Z"
}
```

---

## 10.9 Collection weather_cache

```json
{
  "_id": "ObjectId",
  "city": "Nha Trang",
  "date": "2026-06-25",
  "temperatureMin": 18,
  "temperatureMax": 24,
  "rainProbability": 70,
  "weatherCode": "rain",
  "summary": "Có khả năng mưa vào buổi chiều.",
  "createdAt": "2026-06-24T10:00:00Z"
}
```

---

## 11. API Design

## 11.1 Auth APIs

### Đăng ký

```http
POST /api/auth/register
```

Request:

```json
{
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "password": "123456"
}
```

### Đăng nhập

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

Response:

```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "fullName": "Nguyen Van A",
    "email": "user@example.com"
  }
}
```

---

## 11.2 Trip APIs

### Tạo lịch trình thông minh

```http
POST /api/trips/generate
```

Request:

```json
{
  "prompt": "Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí.",
  "startDate": "2026-07-01",
  "origin": "TP.HCM"
}
```

Response:

```json
{
  "destination": "Nha Trang",
  "days": 3,
  "nights": 2,
  "interests": ["beach", "seafood", "check-in"],
  "budget": "low",
  "itinerary": [
    {
      "dayNumber": 1,
      "title": "Khám phá trung tâm Nha Trang",
      "items": [
        {
          "time": "08:00",
          "placeName": "Bãi biển Trần Phú",
          "latitude": 12.2388,
          "longitude": 109.1967,
          "reason": "Phù hợp vì miễn phí, gần trung tâm và có cảnh đẹp."
        }
      ],
      "route": {
        "distanceMeters": 5200,
        "durationSeconds": 1800,
        "geometry": {
          "type": "LineString",
          "coordinates": []
        }
      }
    }
  ],
  "hotelSuggestion": {},
  "transportSuggestion": {},
  "weather": []
}
```

---

### Lưu lịch trình

```http
POST /api/trips
```

### Lấy danh sách lịch trình đã lưu

```http
GET /api/trips
```

### Xem chi tiết lịch trình

```http
GET /api/trips/:id
```

### Xóa lịch trình

```http
DELETE /api/trips/:id
```

---

## 11.3 Place APIs

### Lấy danh sách địa điểm

```http
GET /api/places?city=Nha Trang&category=cafe
```

### Lấy chi tiết địa điểm

```http
GET /api/places/:id
```

### Tạo địa điểm thủ công đã xác minh

```http
POST /api/places
```

---

## 11.4 Route APIs

### Tính tuyến đường giữa nhiều điểm

```http
POST /api/routes
```

Request:

```json
{
  "profile": "driving",
  "points": [
    { "lng": 108.4583, "lat": 11.9404 },
    { "lng": 108.4575, "lat": 11.9419 }
  ]
}
```

Response:

```json
{
  "distanceMeters": 1600,
  "durationSeconds": 360,
  "geometry": {
    "type": "LineString",
    "coordinates": [
      [109.1967, 12.2388],
      [108.4588, 11.9409],
      [109.1969, 12.2400]
    ]
  }
}
```

---

## 11.5 Weather APIs

### Lấy thời tiết theo thành phố và ngày

```http
GET /api/weather?city=Nha Trang&startDate=2026-07-01&days=3
```

---

## 11.6 Hotel APIs

### Lấy khách sạn gợi ý

```http
GET /api/hotels/suggestions?city=Nha Trang&budget=low&nights=2
```

---

## 11.7 Transport APIs

### Lấy phương tiện gợi ý

```http
GET /api/transports/suggestions?from=TP.HCM&to=Nha Trang&budget=low
```

---

## 12. Luồng xử lý tạo lịch trình chi tiết

### Bước 1: Người dùng nhập yêu cầu

Ví dụ:

```text
Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí.
```

### Bước 2: Backend gọi Gemini API để phân tích

Output:

```json
{
  "destination": "Nha Trang",
  "days": 3,
  "nights": 2,
  "budget": "low",
  "interests": ["beach", "seafood", "check-in"],
  "travelStyle": "budget_friendly"
}
```

### Bước 3: Backend lấy địa điểm từ PostgreSQL + PostGIS

Query:

```javascript
db.places.find({
  city: "Nha Trang",
  isActive: true
})
```

### Bước 4: Chấm điểm địa điểm

Hệ thống tính điểm cho từng địa điểm dựa trên:

- Sở thích.
- Ngân sách.
- Tags.
- Weather.
- Thời điểm nên đi.
- Chi phí dự kiến.

### Bước 5: Chọn địa điểm tốt nhất

Ví dụ:

- Bãi biển Trần Phú
- Tháp Trầm Hương
- Chợ Đầm
- Cafe view đẹp
- Hòn Chồng
- Nhà thờ Núi
- Viện Hải dương học

### Bước 6: Chia địa điểm theo ngày

Ví dụ:

- Ngày 1: Trung tâm.
- Ngày 2: Điểm xa hơn.
- Ngày 3: Lịch nhẹ.

### Bước 7: Gọi OSRM để tính tuyến đường

Backend gọi OSRM cho từng ngày để lấy:

- Distance.
- Duration.
- Geometry.

### Bước 8: Tối ưu thứ tự tham quan

Nếu route quá dài hoặc thứ tự chưa hợp lý, hệ thống đổi thứ tự địa điểm.

### Bước 9: Gemini tạo mô tả lịch trình

Gemini viết mô tả:

```text
Ngày 1 tập trung vào các địa điểm gần trung tâm để bạn dễ di chuyển và tiết kiệm chi phí. Buổi sáng bắt đầu tại Bãi biển Trần Phú, sau đó ghé Tháp Trầm Hương để chụp ảnh...
```

### Bước 10: Frontend hiển thị kết quả

Giao diện hiển thị:

- Lịch trình theo ngày.
- Bản đồ.
- Marker.
- Tuyến đường.
- Thời tiết.
- Khách sạn.
- Phương tiện.
- Tổng chi phí dự kiến.

---

## 13. Thuật toán gợi ý địa điểm

### 13.1 Input

```json
{
  "destination": "Nha Trang",
  "interests": ["beach", "seafood", "check-in"],
  "budget": "low",
  "days": 3
}
```

### 13.2 Scoring

Ví dụ logic:

```text
score = 0

Nếu tag địa điểm trùng interest:
  score += 30

Nếu estimatedCost phù hợp budget:
  score += 20

Nếu địa điểm miễn phí và budget thấp:
  score += 15

Nếu địa điểm phù hợp bestTime:
  score += 10

Nếu ngày mưa và địa điểm ngoài trời:
  score -= 25

Nếu durationMinutes quá dài:
  score -= 5
```

### 13.3 Output

Danh sách địa điểm đã sắp xếp theo điểm phù hợp giảm dần.

---

## 14. Thuật toán sắp xếp route bằng OSRM

### Cách làm đơn giản cho MVP

Sử dụng **Nearest Neighbor** kết hợp OSRM duration.

Pseudo-code:

```text
current = hotel hoặc center point
remainingPlaces = danh sách địa điểm trong ngày
orderedPlaces = []

while remainingPlaces không rỗng:
    gọi OSRM để tính thời gian từ current đến từng điểm còn lại
    chọn điểm có thời gian di chuyển thấp nhất và điểm phù hợp cao
    thêm điểm vào orderedPlaces
    current = điểm vừa chọn
    xóa điểm khỏi remainingPlaces

return orderedPlaces
```

### Lưu ý

Để tránh gọi OSRM quá nhiều:

- Cache route giữa 2 địa điểm trong `route_cache`.
- Nếu đã có route trong cache thì dùng lại.
- Chỉ gọi OSRM khi chưa có dữ liệu.

---

## 15. Tối ưu số lần gọi OSRM

OSRM có thể bị giới hạn nếu dùng demo server, vì vậy cần tối ưu.

### Cách tối ưu

1. Cache route theo cặp địa điểm.
2. Không gọi OSRM liên tục mỗi khi người dùng kéo bản đồ.
3. Chỉ gọi OSRM khi tạo lịch trình.
4. Giới hạn số địa điểm mỗi ngày từ 3 đến 5.
5. Nếu nhiều điểm, gọi OSRM theo batch route.
6. Lưu geometry route vào PostgreSQL + PostGIS.

### Key cache route

Có thể tạo key:

```text
fromPlaceId_toPlaceId_profile
```

Ví dụ:

```text
placeA_placeB_driving
```

---

## 16. Giao diện đề xuất

## 16.1 Trang nhập yêu cầu

Thành phần:

- Textarea nhập yêu cầu.
- Ngày bắt đầu.
- Nơi xuất phát.
- Nút tạo lịch trình.
- Gợi ý prompt ví dụ.

Ví dụ prompt:

```text
Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí.
```

---

## 16.2 Trang kết quả lịch trình

Bố cục đề xuất:

- Cột trái: lịch trình theo ngày.
- Cột phải: bản đồ OpenStreetMap.
- Tab từng ngày.
- Marker địa điểm theo từng ngày.
- Polyline route theo ngày.
- Thời tiết từng ngày.
- Tổng chi phí.
- Khách sạn gợi ý.
- Phương tiện gợi ý.
- Nút lưu lịch trình.

---

## 16.3 Trang lịch trình đã lưu

Chức năng:

- Xem danh sách lịch trình.
- Xem chi tiết lịch trình.
- Xóa lịch trình.
- Mở lại bản đồ.

---

## 16.4 Trang quản lý địa điểm

Có thể dành cho admin:

- Thêm địa điểm.
- Sửa địa điểm.
- Xóa địa điểm.
- Gắn tags.
- Nhập tọa độ.
- Nhập chi phí.
- Nhập thời gian tham quan.

---

## 17. User Stories

| ID | User Story | Ưu tiên |
|---|---|---|
| US01 | Là người dùng, tôi muốn nhập nhu cầu du lịch bằng tiếng Việt để hệ thống hiểu chuyến đi mong muốn | Cao |
| US02 | Là người dùng, tôi muốn AI phân tích sở thích, ngân sách và số ngày để tạo lịch trình phù hợp | Cao |
| US03 | Là người dùng, tôi muốn hệ thống gợi ý địa điểm phù hợp với sở thích | Cao |
| US04 | Là người dùng, tôi muốn xem các địa điểm trên bản đồ OpenStreetMap | Cao |
| US05 | Là người dùng, tôi muốn xem tuyến đường thực tế giữa các điểm | Cao |
| US06 | Là người dùng, tôi muốn xem khoảng cách và thời gian di chuyển giữa các điểm | Cao |
| US07 | Là người dùng, tôi muốn lịch trình được chia theo từng ngày | Cao |
| US08 | Là người dùng, tôi muốn lịch trình được điều chỉnh theo thời tiết | Trung bình |
| US09 | Là người dùng, tôi muốn hệ thống gợi ý khách sạn phù hợp ngân sách | Trung bình |
| US10 | Là người dùng, tôi muốn hệ thống gợi ý phương tiện đi đến điểm du lịch | Trung bình |
| US11 | Là người dùng, tôi muốn lưu lại lịch trình đã tạo để xem lại sau | Cao |
| US12 | Là admin, tôi muốn quản lý địa điểm du lịch trong hệ thống | Trung bình |

---

## 18. Product Backlog

| ID | Chức năng | Mô tả | Ưu tiên |
|---|---|---|---|
| PB01 | Nhập yêu cầu du lịch | Form nhập prompt tiếng Việt | Cao |
| PB02 | Gemini parse request | Phân tích prompt thành JSON | Cao |
| PB03 | Quản lý dữ liệu địa điểm | Lưu địa điểm trong PostgreSQL + PostGIS | Cao |
| PB04 | Gợi ý địa điểm | Chấm điểm địa điểm theo sở thích | Cao |
| PB05 | Tạo lịch trình theo ngày | Chia điểm theo ngày và buổi | Cao |
| PB06 | Tích hợp Leaflet | Hiển thị bản đồ OSM | Cao |
| PB07 | Hiển thị marker | Marker và popup địa điểm | Cao |
| PB08 | Tích hợp OSRM | Tính route, distance, duration | Cao |
| PB09 | Vẽ tuyến đường | Vẽ polyline trên bản đồ | Cao |
| PB10 | Tích hợp Weather API | Lấy thời tiết theo ngày | Trung bình |
| PB11 | Gợi ý khách sạn | Đồng bộ POI khách sạn từ OSM và lọc theo ngân sách | Trung bình |
| PB12 | Gợi ý phương tiện | Lọc dữ liệu phương tiện thật | Trung bình |
| PB13 | Lưu lịch trình | Lưu itinerary vào PostgreSQL | Cao |
| PB14 | Đăng nhập | JWT authentication | Trung bình |
| PB15 | Admin quản lý địa điểm | CRUD địa điểm | Trung bình |

---

## 19. Kế hoạch triển khai theo Sprint

## Sprint 1: Phân tích và thiết kế

Mục tiêu:

- Hoàn thiện yêu cầu.
- Thiết kế database.
- Thiết kế API.
- Dựng project frontend/backend.

Công việc:

- Xác định phạm vi Nha Trang.
- Tạo wireframe UI.
- Tạo schema PostgreSQL.
- Setup ReactJS.
- Setup Spring Boot.
- Setup PostgreSQL + PostGIS.

Kết quả:

- Có project skeleton.
- Có tài liệu thiết kế.
- Có database schema.

---

## Sprint 2: Dữ liệu địa điểm và giao diện nhập yêu cầu

Mục tiêu:

- Đồng bộ dữ liệu địa điểm thật.
- Xây dựng form nhập yêu cầu.

Công việc:

- Tạo collection places.
- Đồng bộ dữ liệu Nha Trang từ Google Places API, OpenStreetMap và nguồn chính thức.
- Làm form nhập prompt.
- Làm API lấy danh sách địa điểm.
- Làm UI danh sách địa điểm.

Kết quả:

- Người dùng nhập được yêu cầu.
- Hệ thống có dữ liệu địa điểm thật đã chuẩn hóa.

---

## Sprint 3: Tích hợp Gemini API

Mục tiêu:

- Phân tích yêu cầu du lịch bằng AI.

Công việc:

- Viết Gemini service.
- Tạo prompt bắt Gemini trả về JSON.
- Validate JSON output.
- Xử lý lỗi khi Gemini trả về sai định dạng.
- Hiển thị kết quả phân tích.

Kết quả:

- Nhập câu tiếng Việt và hệ thống phân tích được điểm đến, số ngày, sở thích, ngân sách.

---

## Sprint 4: Gợi ý địa điểm và tạo lịch trình

Mục tiêu:

- Gợi ý địa điểm phù hợp.
- Chia lịch trình theo ngày.

Công việc:

- Viết thuật toán scoring địa điểm.
- Lọc địa điểm theo city, tags, budget.
- Chia địa điểm theo số ngày.
- Tạo timeline sáng/trưa/chiều/tối.
- Gọi Gemini để viết mô tả lịch trình.

Kết quả:

- Hệ thống tạo được lịch trình dạng text theo ngày.

---

## Sprint 5: Tích hợp OpenStreetMap + Leaflet

Mục tiêu:

- Hiển thị bản đồ và marker.

Công việc:

- Cài Leaflet/react-leaflet.
- Hiển thị OpenStreetMap tile layer.
- Hiển thị marker địa điểm.
- Hiển thị popup chi tiết địa điểm.
- Focus map khi chọn địa điểm.

Kết quả:

- Bản đồ hiển thị được các điểm đến trong lịch trình.

---

## Sprint 6: Tích hợp OSRM

Mục tiêu:

- Tính tuyến đường thực tế và vẽ route.

Công việc:

- Viết OSRM service.
- Gọi OSRM route API.
- Lấy distance, duration, geometry.
- Vẽ polyline trên Leaflet.
- Cache route vào PostgreSQL + PostGIS.
- Sắp xếp thứ tự tham quan bằng route duration.

Kết quả:

- Hệ thống hiển thị tuyến đường thực tế giữa các điểm.

---

## Sprint 7: Weather, khách sạn và phương tiện

Mục tiêu:

- Thêm tính năng mở rộng.

Công việc:

- Tích hợp Weather API.
- Hiển thị thời tiết từng ngày.
- Điều chỉnh lịch trình khi có mưa.
- Đồng bộ dữ liệu khách sạn và khu vui chơi từ Google Places API và OpenStreetMap.
- Đồng bộ dữ liệu phương tiện thật từ nguồn chính thức.
- Gợi ý khách sạn, khu vui chơi và phương tiện theo ngân sách.

Kết quả:

- Lịch trình có thông tin thời tiết, khách sạn, khu vui chơi và phương tiện.

---

## Sprint 8: Lưu lịch trình, hoàn thiện và demo

Mục tiêu:

- Hoàn thiện sản phẩm demo.

Công việc:

- Lưu lịch trình vào PostgreSQL.
- Xem lại lịch trình đã lưu.
- Xử lý lỗi.
- Tối ưu UI.
- Test toàn bộ flow.
- Chuẩn bị báo cáo và demo.

Kết quả:

- Có sản phẩm hoàn chỉnh để trình bày.

---

## 20. Definition of Done

Một chức năng được xem là hoàn thành khi:

1. Chạy được đúng yêu cầu.
2. Có giao diện để người dùng thao tác.
3. Có API backend xử lý.
4. Có validate dữ liệu đầu vào.
5. Có xử lý lỗi cơ bản.
6. Không làm crash hệ thống khi API ngoài bị lỗi.
7. Dữ liệu được lưu đúng vào PostgreSQL + PostGIS.
8. Có thể demo được trong flow tổng thể.
9. Code được commit lên GitHub.
10. Có mô tả trong tài liệu báo cáo.

---

## 21. Rủi ro và cách xử lý

| Rủi ro | Mức độ | Cách xử lý |
|---|---:|---|
| Gemini trả về JSON sai | Trung bình | Validate JSON, yêu cầu output schema rõ ràng |
| Gemini bịa địa điểm | Cao | Chỉ cho Gemini chọn từ địa điểm trong PostgreSQL + PostGIS |
| OSRM demo server bị giới hạn | Trung bình | Cache route, giới hạn request, có thể tự host nếu cần |
| Dữ liệu địa điểm thiếu | Trung bình | Bổ sung dữ liệu Nha Trang đã xác minh từ nguồn thật |
| Weather API lỗi | Thấp | Cho phép tạo lịch trình không có thời tiết |
| UI bản đồ khó xử lý | Trung bình | Tách riêng Map Component |
| Dự án quá rộng | Cao | Chỉ làm Nha Trang, 1–3 ngày |
| API ngoài phát sinh phí | Trung bình | Dùng OSM, OSRM và cache trong PostgreSQL, tránh Booking API thật |

---

## 22. Chiến lược xử lý khi API lỗi

### Gemini API lỗi

- Trả về thông báo: "Không thể phân tích yêu cầu, vui lòng thử lại."
- Có thể fallback bằng form nhập thủ công destination, days, budget, interests.

### OSRM lỗi

- Không hiển thị tuyến đường thực tế.
- Vẫn hiển thị marker.
- Có thể vẽ đường nối thẳng bằng Leaflet Polyline.
- Thông báo: "Tạm thời không tính được tuyến đường thực tế."

### Weather API lỗi

- Tạo lịch trình bình thường.
- Không hiển thị thời tiết.
- Không điều chỉnh lịch trình theo thời tiết.

### PostgreSQL lỗi

- Trả lỗi rõ ràng.
- Không tạo lịch trình nếu không lấy được địa điểm.

---

## 23. Cấu trúc thư mục đề xuất

```text
ai-smart-travel-planner/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js
│   │   │   └── env.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── trip.controller.js
│   │   │   ├── place.controller.js
│   │   │   ├── route.controller.js
│   │   │   └── weather.controller.js
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Place.js
│   │   │   ├── Hotel.js
│   │   │   ├── Transport.js
│   │   │   ├── Itinerary.js
│   │   │   ├── ItineraryDay.js
│   │   │   ├── ItineraryItem.js
│   │   │   ├── RouteCache.js
│   │   │   └── WeatherCache.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── trip.routes.js
│   │   │   ├── place.routes.js
│   │   │   ├── route.routes.js
│   │   │   └── weather.routes.js
│   │   ├── services/
│   │   │   ├── gemini.service.js
│   │   │   ├── osrm.service.js
│   │   │   ├── weather.service.js
│   │   │   ├── placeScoring.service.js
│   │   │   ├── itineraryBuilder.service.js
│   │   │   ├── routeOptimizer.service.js
│   │   │   ├── hotelSuggestion.service.js
│   │   │   └── transportSuggestion.service.js
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   ├── utils/
│   │   │   ├── timeSlot.util.js
│   │   │   ├── budget.util.js
│   │   │   └── geo.util.js
│   │   ├── ingest/
│   │   │   ├── places.sync.js
│   │   │   ├── hotels.sync.js
│   │   │   └── transports.sync.js
│   │   └── server.js
│   │
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── tripApi.js
│   │   │   ├── placeApi.js
│   │   │   └── authApi.js
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── TravelMap.jsx
│   │   │   │   ├── PlaceMarker.jsx
│   │   │   │   └── RoutePolyline.jsx
│   │   │   ├── Itinerary/
│   │   │   │   ├── ItineraryDay.jsx
│   │   │   │   └── ItineraryItem.jsx
│   │   │   ├── WeatherCard.jsx
│   │   │   ├── HotelSuggestion.jsx
│   │   │   └── TransportSuggestion.jsx
│   │   ├── pages/
│   │   │   ├── HomePage.jsx
│   │   │   ├── GenerateTripPage.jsx
│   │   │   ├── TripResultPage.jsx
│   │   │   └── SavedTripsPage.jsx
│   │   ├── hooks/
│   │   │   └── useMapFocus.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── .env
│
├── docs/
│   ├── requirements.md
│   ├── api-design.md
│   ├── database-design.md
│   └── sprint-plan.md
│
└── README.md
```

---

## 24. Environment Variables

### Backend `.env`

```env
PORT=5000
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/ai_travel_planner
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=your_password
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_gemini_api_key

OSRM_BASE_URL=https://router.project-osrm.org
OSRM_PROFILE=driving

WEATHER_PROVIDER=open-meteo
OPENWEATHER_API_KEY=your_openweather_key_if_used
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 25. Gợi ý đồng bộ dữ liệu địa điểm Nha Trang

Nên chuẩn bị ít nhất 20 đến 40 địa điểm.

Nhóm địa điểm đề xuất:

### Cảnh đẹp

- Bãi biển Trần Phú
- Hòn Chồng
- Đảo Hòn Mun
- Bãi Dài
- Bãi Tiên

### Check-in

- Tháp Trầm Hương
- Nhà thờ Núi
- Tháp Bà Ponagar
- Viện Hải dương học
- VinWonders Nha Trang

### Cà phê

- Cà phê view biển
- Cà phê gần trung tâm
- Cà phê view biển
- Rainforest
- AN Cafe

### Ăn uống

- Chợ Đầm
- Bún chả cá Nha Trang
- Nem nướng Nha Trang
- Quán nướng bình dân
- Quán ăn gần trung tâm

### Tiết kiệm

- Bãi biển Trần Phú
- Tháp Trầm Hương
- Chợ Đầm
- Nhà thờ Núi
- Các điểm check-in miễn phí

---

## 26. Demo Flow

### Kịch bản demo chính

1. Người dùng mở trang tạo lịch trình.
2. Nhập:

```text
Tôi muốn đi Nha Trang 3 ngày 2 đêm, thích biển, hải sản, check-in và tiết kiệm chi phí.
```

3. Chọn ngày bắt đầu.
4. Nhập nơi xuất phát: TP.HCM.
5. Bấm "Tạo lịch trình".
6. Hệ thống phân tích yêu cầu bằng Gemini.
7. Hệ thống gợi ý địa điểm từ PostgreSQL + PostGIS.
8. Hệ thống gọi OSRM để tính tuyến đường.
9. Hệ thống hiển thị lịch trình 3 ngày.
10. Bản đồ hiển thị marker và tuyến đường.
11. Hệ thống hiển thị thời tiết từng ngày.
12. Hệ thống gợi ý khách sạn và phương tiện.
13. Người dùng bấm lưu lịch trình.
14. Người dùng mở lại lịch trình đã lưu.

---

## 27. Điểm nổi bật khi báo cáo

Dự án có các điểm mạnh sau:

1. Có sử dụng AI thật thông qua Gemini API.
2. Có bản đồ trực quan bằng OpenStreetMap.
3. Có route thực tế bằng OSRM.
4. Có dữ liệu địa điểm tự quản lý trong PostgreSQL + PostGIS.
5. Có thuật toán scoring địa điểm theo sở thích.
6. Có tối ưu thứ tự tham quan dựa trên thời gian di chuyển.
7. Có Weather API để điều chỉnh lịch trình.
8. Có gợi ý khách sạn và phương tiện.
9. Có lưu lịch trình cá nhân.
10. Phù hợp triển khai theo Agile Scrum.
11. Không phụ thuộc Google Maps, giảm rủi ro chi phí.
12. Có thể mở rộng thành sản phẩm thực tế.

---

## 28. Kết luận chốt

Dự án **AI Smart Travel Planner** được chốt triển khai theo hướng:

```text
ReactJS + Java Spring Boot + PostgreSQL + PostGIS + Gemini API + Google Places API + OpenStreetMap + Leaflet + OSRM + Weather API
```

Trong đó:

- **Gemini API** dùng để phân tích yêu cầu và tạo mô tả lịch trình.
- **PostgreSQL + PostGIS** dùng để lưu và truy vấn dữ liệu không gian như địa điểm, khách sạn, khu vui chơi, tuyến đường và tìm kiếm theo vị trí.
- **PostgreSQL + PostGIS** dùng để lưu dữ liệu thật đã chuẩn hóa từ Google Places API, OpenStreetMap, các nguồn chính thức, cùng lịch trình và cache route.
- **Google Places API** dùng để lấy khách sạn, khu vui chơi và điểm tham quan thật.
- **OpenStreetMap** dùng làm bản đồ nền và nguồn POI mở bổ sung.
- **Leaflet** dùng để hiển thị bản đồ, marker, popup và polyline.
- **OSRM** dùng để tính tuyến đường thực tế, khoảng cách và thời gian di chuyển.
- **Weather API** dùng để dự báo thời tiết và điều chỉnh lịch trình.
- **Khách sạn** và **khu vui chơi** lấy từ Google Places API/OpenStreetMap và lưu trong PostgreSQL + PostGIS; **phương tiện** lấy từ nguồn chính thức và lưu trong PostgreSQL.

Đây là hướng triển khai phù hợp với đồ án trong khoảng 2 tháng vì vừa có AI, vừa có bản đồ, vừa có route thực tế, vừa có dữ liệu và logic xử lý riêng, nhưng vẫn kiểm soát được độ khó và chi phí.
