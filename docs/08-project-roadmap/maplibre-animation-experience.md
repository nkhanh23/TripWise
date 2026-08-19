# Phase: MapLibre GL JS Animation Experience

## Goal
Xây dựng trải nghiệm bản đồ động, trực quan và đầy cảm xúc cho quá trình lập lịch trình và chi tiết chuyến đi. Sử dụng bộ ba công nghệ MapLibre GL JS (Map Engine chính hiệu năng cao), GSAP (Hiệu ứng chuyển động mượt mà điều khiển bằng GPU), và Turf.js (Tính toán địa lý không gian) để tối ưu hóa FPS, bộ nhớ và khả năng phản hồi trên hàng triệu thiết bị.

## Scope
- Tích hợp và cấu hình MapLibre GL JS, GSAP, và Turf.js.
- Trải nghiệm lập lịch trình mượt mà từ màn hình chờ (Skeleton, AI Thinking Timeline) đến kết quả bản đồ.
- Các hiệu ứng bản đồ động bao gồm: Route Reveal (nét vẽ tuyến đường), Camera FlyTo/FitBounds, HTML Marker Staggered Entry.
- Hiệu ứng chuyển tiếp trang (Transition) sang màn hình Chi tiết chuyến đi (Trip Detail).
- Đồng bộ hóa tương tác nổi bật (Highlight sync) giữa danh sách lịch trình bên trái và bản đồ bên phải khi hover/focus.
- Hiệu ứng chuyển đổi ngày (Day switching) mượt mà và camera tự động định vị lại.
- Trải nghiệm responsive trên di động với Bottom Sheet kéo thả mượt mà theo cử chỉ vật lý.
- Tương thích và tối ưu khả năng tiếp cận (Accessibility - a11y) bao gồm điều khiển bằng bàn phím và giảm chuyển động (`prefers-reduced-motion`).
- Tối ưu hóa hiệu năng WebGL, dọn dẹp bộ nhớ chống rò rỉ WebGL context và cơ chế phục hồi khi WebGL bị crash.

## Out of Scope
- Tích hợp bản đồ 3D địa hình chi tiết nặng nề.
- Tự host Vector Tiles Server trong phạm vi phase này (sử dụng Maptiler/OpenMapTiles CDN).
- Custom animations cho mobile app Flutter (chỉ tập trung ở Frontend Web).

---

# Task: P18-T001 - Setup Dependencies (MapLibre, GSAP, Turf.js submodules)

## Description
Tích hợp các thư viện npm cho MapLibre GL JS, GSAP, các submodules của Turf.js cần thiết (tuyệt đối không cài @turf/turf) và các CSS/TS declarations liên quan vào frontend `web`.

## Acceptance Criteria
- File [package.json](file:///d:/Dev/TripWise/web/package.json) có thêm các dependencies: `maplibre-gl`, `gsap`, và `@types/geojson`.
- Chỉ cài các Turf submodules thực sự cần cho task hiện tại, tuyệt đối không cài `@turf/turf`.
- Chỉ thêm dependency nếu thực sự cần. Ưu tiên chỉ dùng `@types/geojson` hoặc type có sẵn. Tránh runtime dependency không cần thiết (không cài đặt runtime package `geojson`).
- Quá trình chạy `npm install` thành công và không tạo ra xung đột dependency.
- Import stylesheet của MapLibre GL `maplibre-gl/dist/maplibre-gl.css` duy nhất một lần tại file entry CSS [index.css](file:///d:/Dev/TripWise/web/src/index.css), tuyệt đối không import lặp lại ở các component.
- Biên dịch dự án qua Vite (`npm run build`) không có lỗi.

## Production Considerations
- Chỉ sử dụng các stable package versions (không sử dụng phiên bản beta/alpha).
- Đảm bảo các thư viện được import hỗ trợ Tree-shaking để loại bỏ các module không sử dụng ở production build.
- Không tự ý thêm bất kỳ dependency nào ngoài phạm vi của task.

## Performance Considerations
- Đóng gói (bundle sizing): Chỉ cài đặt các Turf submodules thực sự cần thiết cho task hiện tại và tránh cài trọn gói `@turf/turf` để tối ưu kích thước bundle size.
- Tránh thêm các runtime dependency không cần thiết (như package runtime `geojson`), ưu tiên sử dụng type-only dependencies `@types/geojson` hoặc các type định sẵn trong TypeScript/MapLibre.

## Security Considerations
- Sử dụng các package version ổn định và đã qua quét lỗ hổng bảo mật (không sử dụng bản beta/alpha hoặc các gói có critical CVEs).

## Risks
- Các phiên bản submodule có thể bị lệch version nếu không kiểm tra kỹ file lock. Đảm bảo đồng bộ version giữa các gói `@turf/*`.

## Estimated Complexity
- Low (30 mins)

## Estimated Files
- [package.json](file:///d:/Dev/TripWise/web/package.json)
- [index.css](file:///d:/Dev/TripWise/web/src/index.css)

### Subtasks
- [x] Thêm các dependencies `maplibre-gl`, `gsap`, các Turf submodules thực sự cần thiết cho task hiện tại và `@types/geojson` (tránh cài runtime package `geojson`) vào [package.json](file:///d:/Dev/TripWise/web/package.json).
- [x] Cài đặt npm dependencies (`npm install`).
- [x] Import MapLibre GL CSS vào file [index.css](file:///d:/Dev/TripWise/web/src/index.css) một lần duy nhất.

---

# Task: P18-T002 - Core MapLibre Component & WebGL Context Lifecycle Manager

## Description
Xây dựng component [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx) mới sử dụng MapLibre GL JS làm nền tảng bản đồ vector. Quản lý vòng đời bản đồ và giải phóng WebGL context khi unmount hoặc khi WebGL bị mất context (`webglcontextlost`).

## Acceptance Criteria
- Khởi tạo bản đồ MapLibre thành công trên UI thông qua map container ref trong component [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx).
- Unmount component giải phóng hoàn toàn WebGL memory thông qua việc gọi hàm `map.remove()`.
- Lắng nghe và xử lý sự kiện `webglcontextlost` trên canvas để dừng cập nhật và đăng ký `webglcontextrestored` nhằm khởi tạo lại bản đồ mà không làm crash trình duyệt của người dùng.

## Production Considerations
- Việc rò rỉ bộ nhớ (memory leaks) WebGL rất dễ xảy ra khi chuyển trang liên tục. Đảm bảo dọn dẹp mọi map instances, markers và event listeners khi component bị huỷ.

## Performance Considerations
- Tận dụng tối đa phần cứng GPU cho Vector Tiles rendering. Tránh re-render React không cần thiết tác động vào MapLibre instance.

## Security Considerations
- Whitelist domain và bảo mật API key cho Map Tiles Provider qua các biến môi trường cấu hình tại Vite (`VITE_MAP_TILE_KEY`).

## Risks
- Thiết bị di động cấu hình yếu có thể crash WebGL nếu mở bản đồ nhiều lần liên tiếp mà không giải phóng tài nguyên triệt để.

## Estimated Complexity
- Medium (60-90 mins)

## Estimated Files
- [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx)

### Subtasks
- [x] Thiết kế component [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx) để đóng gói logic khởi tạo và quản lý instance của MapLibre.
- [x] Hỗ trợ React StrictMode bằng cách dọn dẹp map instance cũ khi unmount và gán container ref chính xác.
- [x] Đăng ký event handler cho `webglcontextlost` và `webglcontextrestored` để reload map khi context bị crash.

---

# Task: P18-T003 - Map Adapter Layer

## Description
Xây dựng lớp Adapter cho Bản đồ (Map Adapter Layer) để trừu tượng hóa (abstract) Map Engine và Tile Provider. Đảm bảo cấu hình Tile Provider thông qua biến môi trường (`VITE_MAP_TILE_PROVIDER`, `VITE_MAP_TILE_URL`, `VITE_MAP_TILE_KEY`) thay vì hardcode trong mã nguồn, cho phép hoán đổi hoặc sử dụng các provider khác nhau mà không ảnh hưởng tới business logic của ứng dụng.

## Acceptance Criteria
- Tạo module [mapAdapter.ts](file:///d:/Dev/TripWise/web/src/lib/mapAdapter.ts) [NEW] để mapping cấu hình Tile Provider từ environment variables sang định dạng style GeoJSON/Vector của MapLibre.
- Cho phép môi trường Development và Production sử dụng các provider khác nhau (ví dụ: Maptiler ở Production, OpenStreetMap tiles ở local/development) thông qua file cấu hình môi trường `.env.local` hoặc `.env.production`.
- Thay đổi Tile Provider chỉ yêu cầu thay đổi biến môi trường, tuyệt đối không cần thay đổi source code của các components.

## Production Considerations
- Chỉ sử dụng các stable package versions (không sử dụng phiên bản beta/alpha).
- Đảm bảo cơ chế fallback hợp lý khi Tile Provider cấu hình không khả dụng hoặc bị lỗi phản hồi.

## Performance Considerations
- Cache cấu hình map style và tránh load lại style nhiều lần gây lãng phí băng thông mạng.

## Security Considerations
- Không hardcode API key, URL hay thông tin nhạy cảm của Tile Provider trong source code. Toàn bộ phải đi qua environment variables.

## Risks
- Các tile providers khác nhau có thể sử dụng các schema tiles khác nhau hoặc hệ tọa độ khác nhau. Cần đảm bảo cấu hình chuẩn hóa projection (mặc định EPSG:3857).

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [mapAdapter.ts](file:///d:/Dev/TripWise/web/src/lib/mapAdapter.ts) [NEW]
- [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx)

### Subtasks
- [x] Tạo file [mapAdapter.ts](file:///d:/Dev/TripWise/web/src/lib/mapAdapter.ts) để quản lý cấu hình tile provider dựa trên environment variables.
- [x] Định nghĩa các biến môi trường tương ứng trong file `.env.example`.
- [x] Kết nối `mapAdapter` vào hook khởi tạo bản đồ trong [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx).

---

# Task: P18-T004 - Camera Controller

## Description
Triển khai các phương thức di chuyển camera mượt mà trên bản đồ MapLibre như fitBounds cho toàn bộ ngày và flyTo fit các địa điểm cụ thể khi chuyển đổi hoặc focus.

## Acceptance Criteria
- Camera di chuyển (pan, zoom) mượt mà không bị giật hay nhảy hình đột ngột.
- Tốc độ di chuyển và thời lượng (duration) tự động thích ứng với khoảng cách địa lý (khoảng cách ngắn bay nhanh, khoảng cách dài bay chậm hơn và nâng camera cao lên).
- Tự động hủy (cancel) camera animation cũ nếu người dùng trigger sự kiện camera mới.

## Production Considerations
- Kiểm tra trạng thái bản đồ (`map.loaded()`) trước khi gọi các hàm di chuyển camera.

## Performance Considerations
- Tránh xung đột các chuyển động camera song song dẫn đến việc bản đồ bị tính toán ma trận viewport liên tục gây tụt FPS.

## Security Considerations
- Không có.

## Risks
- Hiệu ứng camera bay quá nhanh hoặc xoay trục (`bearing`, `pitch`) quá nhiều có thể gây chóng mặt cho người dùng (motion sickness). Cần cấu hình giới hạn định vị an toàn.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [useMapCamera.ts](file:///d:/Dev/TripWise/web/src/hooks/useMapCamera.ts) [NEW]

### Subtasks
- [x] Tạo file [useMapCamera.ts](file:///d:/Dev/TripWise/web/src/hooks/useMapCamera.ts) chứa hook custom `useMapCamera` làm CameraController.
- [x] Triển khai tích hợp các phương thức nền `flyTo`, `fitBounds`, `easeTo`, và `jumpTo` thông qua interface MapAdapter.
- [x] Thêm logic `cancelActiveTransitions` hỗ trợ huỷ bỏ animation camera đang chạy khi unmount hoặc đổi trip.

---

# Task: P18-T005 - Route Layer

## Description
Thực hiện render và hiệu ứng vẽ tuyến đường (Route Polyline Draw) từ từ trên bản đồ MapLibre. Sử dụng các submodules của Turf.js để tính các đoạn đường trung gian và GSAP để vẽ mượt mà theo thời gian thực.

## Acceptance Criteria
- Tuyến đường di chuyển từ điểm A sang điểm B vẽ giống như nét vẽ tự nhiên (stroke-dasharray hoặc cập nhật GeoJSON source động).
- Tốc độ vẽ tương ứng với độ dài thực tế của route.
- Có cơ chế fallback hiển thị ngay polyline tĩnh nếu tính toán spline bị lỗi.

## Production Considerations
- Chỉ sử dụng các stable package versions.
- Handle trường hợp route bị đứt đoạn hoặc dữ liệu OSRM trả về trống.

## Performance Considerations
- Hạn chế số lần gọi `setData` trên GeoJSON source của MapLibre. Sử dụng GSAP Ticker để tối ưu hóa nhịp render.
- Áp dụng `@turf/helpers` hoặc `@turf/clean` nếu có để nén các tuyến đường có quá nhiều điểm tọa độ trước khi vẽ.

## Security Considerations
- Không có.

## Risks
- Các tuyến đường dài (>100km) chứa hàng ngàn tọa độ có thể gây lag do MapLibre phải re-triangulate hình học liên tục.

## Estimated Complexity
- High (90 mins)

## Estimated Files
- [routeLayer.ts](file:///d:/Dev/TripWise/web/src/lib/routeLayer.ts) [NEW]

### Subtasks
- [x] Tạo lớp [routeLayer.ts](file:///d:/Dev/TripWise/web/src/lib/routeLayer.ts) độc lập đóng gói logic quản lý tuyến đường OSRM.
- [x] Triển khai tích hợp các phương thức `addRoute`, `updateRoute`, `removeRoute`, và `clearRoutes` tương tác trực tiếp với MapAdapter.
- [x] Tích hợp submodule `@turf/helpers` để dựng cấu trúc LineString GeoJSON chuẩn hóa từ tọa độ đầu vào.

---

# Task: P18-T006 - Marker Layer

## Description
Thiết kế Custom HTML Markers với phong cách Neobrutalism (border đen dày, bóng đổ thô) và tạo hiệu ứng xuất hiện bouncy (staggered bounce), nhảy (bounce) khi hover hoặc focus.

## Acceptance Criteria
- Marker xuất hiện tuần tự bằng animation nhảy từ dưới lên (pop-up) với độ trễ (delay) giữa các marker.
- Hover/focus marker kích hoạt animation nhảy nhẹ (vertical bounce) và hiển thị tooltip.
- Marker hoạt động selected hiển thị viền đậm, scale lớn 1.2x và đổi màu sang brand primary.

## Production Considerations
- Đảm bảo dọn dẹp các DOM nodes của Custom HTML Marker khi thay đổi ngày hoặc unmount map.

## Performance Considerations
- Giới hạn số lượng custom HTML Marker trên màn hình (dưới 50 marker cùng lúc) để tránh quá tải DOM. Với tập dữ liệu lớn, chuyên sang WebGL-based markers.

## Security Considerations
- Validate dữ liệu đầu vào (số thứ tự, tên địa điểm) hiển thị trên marker để tránh XSS injection.

## Risks
- CSS animation chạy liên tục trên quá nhiều HTML elements có thể làm chậm quá trình render vector của bản đồ.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [markerLayer.ts](file:///d:/Dev/TripWise/web/src/lib/markerLayer.ts) [NEW]

### Subtasks
- [x] Tạo lớp [markerLayer.ts](file:///d:/Dev/TripWise/web/src/lib/markerLayer.ts) độc lập đóng gói logic quản lý markers.
- [x] Triển khai tích hợp các phương thức `addMarker`, `updateMarker`, `removeMarker`, và `clearMarkers` thông qua interface MapAdapter.
- [x] Thiết kế giao diện HTML custom marker neobrutalism và chuẩn bị các trạng thái hover/focus/selected.

---

# Task: P18-T007 - Planner Loading UI

## Description
Thiết kế và lập trình giao diện Loading Screen trong lúc chờ AI phân tích và phản hồi. Sử dụng Neobrutalism Shimmer/Skeleton và Glassmorphic Panel để tạo cảm giác mượt mà khi bắt đầu lập kế hoạch.

## Acceptance Criteria
- Giao diện loading hiển thị skeleton của map panel và side panel khớp với cấu trúc màn hình thực tế.
- Các hiệu ứng nhấp nháy (shimmering) phải mượt mà đạt 60 FPS, sử dụng CSS keyframes và GPU transform.
- Sử dụng phong cách neobrutalism với viền đen dày `#111111` và nền giấy ấm `bg.canvas`.

## Production Considerations
- Đảm bảo hiển thị responsive chính xác trên mobile (kích thước của skeleton thu nhỏ tương ứng).

## Performance Considerations
- Tránh sử dụng JS-based animation để dịch chuyển shimmer; sử dụng CSS transition/keyframes kết hợp `translate3d` hoặc `will-change` để tăng hiệu suất.

## Security Considerations
- Không có.

## Risks
- Trải nghiệm có thể bị giật lag nếu các tác vụ nặng chạy song song trên Main Thread. Skeleton CSS cần hoạt động độc lập và nhẹ nhất có thể.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [LoadingSkeleton.tsx](file:///d:/Dev/TripWise/web/src/components/planner/LoadingSkeleton.tsx) [NEW]
- [ThinkingPanel.tsx](file:///d:/Dev/TripWise/web/src/components/planner/ThinkingPanel.tsx) [NEW]
- [LoadingOverlay.tsx](file:///d:/Dev/TripWise/web/src/components/planner/LoadingOverlay.tsx) [NEW]

### Subtasks
- [x] Tạo các skeletons cho Trip Summary, Timeline, Weather, và Route Summary trong [LoadingSkeleton.tsx](file:///d:/Dev/TripWise/web/src/components/planner/LoadingSkeleton.tsx) sử dụng shimmer CSS.
- [x] Tạo component [ThinkingPanel.tsx](file:///d:/Dev/TripWise/web/src/components/planner/ThinkingPanel.tsx) hiển thị các bước suy nghĩ của AI theo cấu trúc props stateless.
- [x] Tạo component [LoadingOverlay.tsx](file:///d:/Dev/TripWise/web/src/components/planner/LoadingOverlay.tsx) đóng vai trò khung hiển thị lớp phủ (overlay) có hiệu ứng mờ nhòe (backdrop blur).

---

# Task: P18-T008 - AI Thinking Timeline

## Description
Tạo component timeline động mô tả các bước xử lý của AI (Requirement Analysis -> Places Retrieval -> Scoring & Filtering -> Route Optimization -> Weather Check -> Finalizing). Sử dụng GSAP stagger để các bước xuất hiện tuần tự mượt mà.

## Acceptance Criteria
- Mỗi bước hiển thị trạng thái (Đang chạy/Hoàn tất) với icon check/spin và micro-animations.
- Các bước xuất hiện tuần tự bằng GSAP stagger delay 150ms.
- Animation fade-in và slide-up nhẹ khi xuất hiện.

## Production Considerations
- Trạng thái của timeline phải đồng bộ với API logs hoặc stream events nếu có, hoặc mô phỏng trung thực thời gian thực tế.

## Performance Considerations
- Đăng ký cleanup cho các tween/timeline của GSAP khi component unmount để tránh rò rỉ bộ nhớ.

## Security Considerations
- Đảm bảo không hiển thị các thông tin nhạy cảm trong prompt khi hiển thị bước phân tích.

## Risks
- Nếu API phản hồi quá nhanh, timeline có thể bị bỏ qua hoặc hiển thị chớp nhoáng. Cần thiết lập thời lượng hiển thị tối thiểu (min duration) cho các bước để người dùng kịp đọc.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [ThinkingPanel.tsx](file:///d:/Dev/TripWise/web/src/components/planner/ThinkingPanel.tsx)

### Subtasks
- [x] Tích hợp GSAP timeline trong [ThinkingPanel.tsx](file:///d:/Dev/TripWise/web/src/components/planner/ThinkingPanel.tsx) để tạo hiệu ứng chuyển trạng thái mượt mà (scale, fade, translate).
- [x] Sử dụng stagger animation của GSAP để làm sinh động các icon check/pending khi hoàn tất bước.
- [x] Đăng ký cơ chế cleanup tự động thông qua `gsap.context()` và hỗ trợ `prefers-reduced-motion` tắt/giảm chuyển động.

---

# Task: P18-T009 - Panel Zoom and Map Scale Transition

## Description
Tạo hiệu ứng chuyển từ màn hình Loading/Thinking sang màn hình biên tập lịch trình (Planner View). Bản đồ phóng to (scale-up) và panel bên trái trượt vào màn hình (slide-in) đồng thời bằng GSAP Timeline.

## Acceptance Criteria
- Animation chuyển cảnh diễn ra mượt mà trong 500-800ms.
- Kết thúc transition, bản đồ MapLibre tự động trigger resize event để khớp viewport mới.
- Không bị vỡ layout hoặc xuất hiện khoảng trắng ngoài mong muốn khi đang chạy animation.

## Production Considerations
- Đảm bảo các thuộc tính flex/grid của CSS hoạt động bình thường với thuộc tính thay đổi kích thước bằng animation.

## Performance Considerations
- Sử dụng CSS `will-change: transform, opacity` cho các container tham gia transition để CPU/GPU chuẩn bị trước.

## Security Considerations
- Không có.

## Risks
- Bản đồ MapLibre có thể render sai kích thước hoặc hiển thị méo mó nếu hàm `map.resize()` không được gọi kịp thời khi kết thúc transition.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [TransitionController.tsx](file:///d:/Dev/TripWise/web/src/components/planner/TransitionController.tsx) [NEW]

### Subtasks
- [x] Tạo component [TransitionController.tsx](file:///d:/Dev/TripWise/web/src/components/planner/TransitionController.tsx) quản lý các node bản đồ, loading overlay, và sidebar.
- [x] Sử dụng GSAP Timeline để đồng bộ hoá hiệu ứng phóng to bản đồ (scale), ẩn overlay (opacity), và trượt panel trái (translate).
- [x] Xử lý dọn dẹp GSAP instances thông qua `ctx.revert()` và bỏ qua animation khi prefers-reduced-motion kích hoạt.

---

# Task: P18-T010 - Map Adapter Integration

## Description
Hoàn tất kết nối và tích hợp toàn bộ các abstraction bản đồ đã xây dựng (MapCanvas, MapAdapter, CameraController, RouteLayer, MarkerLayer), đảm bảo mọi giao tiếp đi qua MapAdapter. Đồng thời kích hoạt `map.resize()` thông qua Adapter khi kết thúc quá trình chuyển đổi giao diện trong TransitionController.

## Acceptance Criteria
- Đảm bảo toàn bộ giao tiếp giữa UI/các controllers với bản đồ đi qua MapAdapter interface.
- Không có import trực tiếp `maplibre-gl` bên ngoài thư mục lib/mapAdapter.
- Khi kết thúc hiệu ứng chuyển cảnh của TransitionController, phương thức `adapter.resize()` được gọi chính xác để điều chỉnh kích cỡ bản đồ vector tiles mà không bị vỡ layout.

## Production Considerations
- Không tạo circular dependency giữa các hooks, components và adapters.
- Tránh rò rỉ bộ nhớ bằng việc dọn dẹp các event listener và instances khi unmount.

## Performance Considerations
- Gọi `resize()` đúng thời điểm để tránh kích hoạt lại cơ chế render vector tiles liên tục gây nghẽn luồng GPU.

## Security Considerations
- Không có.

## Risks
- MapCanvas unmount trước khi Transition kết thúc có thể gây lỗi gọi phương thức trên đối tượng null (đã thêm kiểm tra an toàn `if (adapter)` trước khi gọi).

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [TransitionController.tsx](file:///d:/Dev/TripWise/web/src/components/planner/TransitionController.tsx)
- [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx)

### Subtasks
- [x] Tích hợp MapAdapter vào TransitionController để kích hoạt `adapter.resize()` tập trung khi kết thúc transition.
- [x] Kiểm chứng sự phối hợp hoạt động của MapCanvas, MapAdapter, useMapCamera, RouteLayer và MarkerLayer dưới dạng các module độc lập.
- [x] Đảm bảo cấu trúc import chuẩn hóa và không phụ thuộc trực tiếp vào package `maplibre-gl` ở tầng UI.

---

# Task: P18-T011 - Side-Panel Card Items Stagger Animation in Trip Detail

## Description
Tạo hiệu ứng xuất hiện tuần tự (stagger list items) cho danh sách địa điểm và chặng di chuyển trong timeline bên trái của màn chi tiết chuyến đi. Hover/focus card item kích hoạt micro-animations (quay icon nhẹ, nâng bóng đổ).

## Acceptance Criteria
- Các item timeline xuất hiện lần lượt từ dưới lên với khoảng trễ 80ms mỗi card.
- Hiệu ứng neobrutalism hover: card dịch chuyển `-3px` theo trục X và Y, đồng thời bóng đổ dày lên.
- Icon hoạt động bên trong card tự động xoay/lắc nhẹ (wiggle) khi hover vào card.

## Production Considerations
- Đảm bảo danh sách dài hoạt động bình thường, scroll mượt mà không bị giật.

## Performance Considerations
- Sử dụng CSS transform cho hover animations (`translate3d` để ép sử dụng GPU).
- Nếu timeline chứa quá nhiều phần tử, chỉ áp dụng stagger animation cho các phần tử đầu tiên hiển thị trên viewport.

## Security Considerations
- Không có.

## Risks
- Nếu animation chạy lại mỗi lần render React sẽ gây ức chế cho người dùng khi tương tác. Chỉ kích hoạt animation một lần duy nhất lúc mount hoặc đổi ngày.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [useTimelineStagger.ts](file:///d:/Dev/TripWise/web/src/hooks/useTimelineStagger.ts) [NEW]

### Subtasks
- [x] Tạo custom hook [useTimelineStagger.ts](file:///d:/Dev/TripWise/web/src/hooks/useTimelineStagger.ts) làm TimelineListAnimation phục vụ tái sử dụng.
- [x] Triển khai GSAP `fromTo` kết hợp stagger để kích hoạt xuất hiện tuần tự (opacity, translate, scale).
- [x] Xử lý giới hạn số lượng phần tử chạy stagger trong viewport và tự động dọn dẹp bằng context revert.

---

# Task: P18-T012 - Day Switching Animation and Viewport Focus Sync

## Description
Triển khai hiệu ứng chuyển đổi mượt mà giữa các ngày du lịch (Day 1 -> Day 2). Xóa markers/route cũ bằng fade-out, vẽ markers/route mới bằng fade-in/reveal, đồng thời zoom camera của MapLibre tới ranh giới ngày mới.

## Acceptance Criteria
- Nhấp chọn ngày trên tab bar sẽ animate camera bản đồ bao phủ toàn bộ các điểm của ngày đó.
- Dữ liệu tuyến đường cũ biến mất mượt mà (opacity 1 -> 0) trước khi dữ liệu mới được vẽ lên.
- Trạng thái ngày (day index) được lưu trên URL query params để hỗ trợ reload trang.

## Production Considerations
- Đảm bảo hoạt động ổn định khi chuyển ngày cực kỳ nhanh (debounce clicks).

## Performance Considerations
- Hạn chế re-draw toàn bộ map layer. Thay đổi filter hoặc cập nhật GeoJSON data của map trong một batch xử lý duy nhất.

## Security Considerations
- Không có.

## Risks
- Nếu ngày mới chỉ có 1 địa điểm hoặc các địa điểm trùng tọa độ, camera fitBounds có thể zoom quá sâu. Phải thiết lập min/max zoom cho camera.

## Estimated Complexity
- Medium (60-90 mins)

## Estimated Files
- [useDayTransition.ts](file:///d:/Dev/TripWise/web/src/hooks/useDayTransition.ts) [NEW]

### Subtasks
- [x] Tạo custom hook [useDayTransition.ts](file:///d:/Dev/TripWise/web/src/hooks/useDayTransition.ts) đóng vai trò DayTransitionController để phối hợp vẽ bản đồ.
- [x] Triển khai dọn dẹp bản vẽ cũ (markers/routes) trước khi nạp tập hợp bản vẽ mới cho ngày được chọn.
- [x] Điều khiển Camera tự động bay (flyTo) hoặc căn chỉnh ranh giới (fitBounds) khớp địa lý ngày mới, xử lý an toàn case 1 điểm tọa độ.

---

# Task: P18-T013 - Route Highlight & Current Activity Highlight Sync

## Description
Đồng bộ hóa trạng thái focus giữa timeline bên trái và bản đồ bên phải. Hover/click hoạt động/chặng di chuyển ở danh sách sẽ highlight (đậm lên/đổi màu) đoạn đường tương ứng và marker tương ứng trên bản đồ.

## Acceptance Criteria
- Hover vào một địa điểm trong danh sách timeline sẽ zoom nhẹ marker tương ứng trên bản đồ và hiển thị tooltip mini.
- Hover vào một chặng di chuyển (transfer) trong danh sách timeline sẽ làm nổi bật đoạn đường tương ứng trên bản đồ (đoạn này dày hơn, đổi màu xanh neon rực rỡ, các đoạn khác mờ đi).
- Click vào chặng di chuyển hiển thị instruction card tương ứng trên góc bản đồ.

## Production Considerations
- Quản lý trạng thái focus trung tâm qua React Context để dễ dàng chia sẻ dữ liệu giữa timeline và map panel.

## Performance Considerations
- Sử dụng cơ chế feature-state của MapLibre để thay đổi style động thay vị cập nhật lại toàn bộ GeoJSON source, giảm tối đa thời gian tính toán của GPU.

## Security Considerations
- Không có.

## Risks
- Tốc độ hover quá nhanh có thể gây lag do component re-render liên tục. Cần áp dụng debounce/throttle cho event hover.

## Estimated Complexity
- Medium (60-90 mins)

## Estimated Files
- [useActivityHighlight.ts](file:///d:/Dev/TripWise/web/src/hooks/useActivityHighlight.ts) [NEW]
- [routeLayer.ts](file:///d:/Dev/TripWise/web/src/lib/routeLayer.ts)

### Subtasks
- [x] Tạo custom hook [useActivityHighlight.ts](file:///d:/Dev/TripWise/web/src/hooks/useActivityHighlight.ts) đóng vai trò ActivityHighlightController để đồng bộ tiêu điểm.
- [x] Triển khai highlight phân đoạn tuyến đường (`highlightSegment` và `clearHighlightSegment`) trong routeLayer.ts.
- [x] Tích hợp flyTo di chuyển camera mượt mà đến marker được highlight, tuân thủ chế độ prefers-reduced-motion.

---

# Task: P18-T014 - Responsive Adjustments & Mobile Bottom Sheet Drag Animations

## Description
Tối ưu hóa UI cho tablet và mobile. Trên màn hình nhỏ, timeline chuyển thành bottom sheet có thể kéo thả (draggable sheet) đè lên map. Sử dụng GSAP Draggable hoặc touch events để tạo hiệu ứng kéo thả mượt mà với cảm giác vật lý.

## Acceptance Criteria
- Bottom sheet hỗ trợ 3 trạng thái: Collapsed (chỉ hiện header/summary), Half (hiện nửa map nửa danh sách), Expanded (danh sách chiếm 90% màn hình).
- Sheet trượt mượt mà theo ngón tay, tự động snap về vị trí gần nhất khi thả tay ra dựa trên vận tốc kéo (velocity).
- Map tự động thay đổi bounding box/safe area để không bị che khuất bởi bottom sheet ở trạng thái collapsed/half.

## Production Considerations
- Ngăn chặn hiện tượng giật trang khi kéo thả bottom sheet trên các trình duyệt mobile khác nhau (iOS Safari, Android Chrome).

## Performance Considerations
- Chỉ thay đổi thuộc tính CSS `transform` (`translateY`) của bottom sheet để GPU tối ưu hóa tốc độ vẽ. Không thay đổi thuộc tính `height`.

## Security Considerations
- Không có.

## Risks
- Xung đột cử chỉ (gesture conflicts) giữa scroll nội dung danh sách của bottom sheet và thao tác kéo thả sheet.

## Estimated Complexity
- High (90 mins)

## Estimated Files
- [BottomSheet.tsx](file:///d:/Dev/TripWise/web/src/components/ui/BottomSheet.tsx) [NEW]

### Subtasks
- [x] Tạo component [BottomSheet.tsx](file:///d:/Dev/TripWise/web/src/components/ui/BottomSheet.tsx) phục vụ chế độ xem trên thiết bị di động.
- [x] Triển khai bắt và quản lý cử chỉ kéo thả (Pointer Gestures) sử dụng React Pointer Events.
- [x] Sử dụng GSAP để snap mượt mà về 3 vị trí (collapsed, half, expanded) mà không cản trở tương tác bản đồ nền.

---

# Task: P18-T015 - Accessibility (a11y) & Reduced Motion Adaptations

## Description
Đảm bảo khả năng tiếp cận (accessibility) cho trải nghiệm chuyển động. Phát hiện tùy chọn `prefers-reduced-motion` của hệ điều hành để tắt/đơn giản hóa hiệu ứng, đồng thời hỗ trợ điều hướng marker và timeline bằng bàn phím.

## Acceptance Criteria
- Nếu hệ thống bật reduced-motion, tất cả animation của GSAP và MapLibre camera transition lập tức tắt (hoặc chuyển thành fade-in/out tức thì).
- Marker có thể focus bằng tab và mở tooltip bằng phím Enter/Space.
- Các timeline card tuân thủ đúng thứ tự tabIndex và aria-attributes hỗ trợ screen reader.

## Production Considerations
- Kiểm tra tính tương thích của API `window.matchMedia('(prefers-reduced-motion: reduce)')` trên các trình duyệt.

## Performance Considerations
- Không có ảnh hưởng runtime lớn.

## Security Considerations
- Không có.

## Risks
- Quên gỡ bỏ event listeners khi component unmount dẫn đến rò rỉ bộ nhớ nhỏ.

## Estimated Complexity
- Medium (60 mins)

## Estimated Files
- [mapAdapter.ts](file:///d:/Dev/TripWise/web/src/lib/mapAdapter.ts)
- [BottomSheet.tsx](file:///d:/Dev/TripWise/web/src/components/ui/BottomSheet.tsx)
- [LoadingOverlay.tsx](file:///d:/Dev/TripWise/web/src/components/planner/LoadingOverlay.tsx)

### Subtasks
- [x] Triển khai keyboard events (Enter/Space) và focus/blur sync trên các custom HTML markers trong mapAdapter.ts.
- [x] Tích hợp quản lý tiêu điểm (focus capture/restoration), phím tắt đóng (Escape) và kéo snap (ArrowUp/Down) trong BottomSheet.tsx.
- [x] Tích hợp quản lý tiêu điểm và aria progressbar thông báo cho screen reader trong LoadingOverlay.tsx và ThinkingPanel.tsx.

---

# Task: P18-T016 - Production Hardening, Error Boundaries & WebGL Fallback

## Description
Hoàn thiện môi trường production cho module bản đồ và hiệu ứng chuyển động. Viết Error Boundary bắt lỗi WebGL crash, cung cấp giao diện tĩnh thay thế (static map / text timeline) nếu WebGL không khả dụng, dọn dẹp các warnings và optimize bundle size.

## Acceptance Criteria
- Khi WebGL không khả dụng hoặc bị crash đột ngột, trang hiển thị màn hình fallback neobrutalism thông báo lỗi, cho phép tải lại bản đồ và không làm hỏng trải nghiệm người dùng đối với danh sách text.
- Build production chạy thành công, tối ưu hóa bundle size qua dynamic imports (lazy load MapLibre và GSAP).
- Không có console.error hoặc memory leak warning trong production mode.

## Production Considerations
- Đảm bảo cơ chế fallback hoạt động mượt mà và không gây gián đoạn các tính năng khác của app.

## Performance Considerations
- Lazy loading các thư viện nặng (`maplibre-gl`, `gsap`, `turf.js`) giúp giảm initial page load size của ứng dụng xuống dưới mức tiêu chuẩn.

## Security Considerations
- Không có.

## Risks
- Lỗi WebGL crash có thể xảy ra bất kỳ lúc nào nếu GPU của client bị cạn kiệt tài nguyên. Việc tự động khôi phục (auto-recover) cần được test kỹ lượng.

## Estimated Complexity
- Medium (60-90 mins)

## Estimated Files
- [MapErrorBoundary.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapErrorBoundary.tsx) [NEW]
- [MapFallback.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapFallback.tsx) [NEW]
- [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx)

### Subtasks
- [x] Tạo component [MapErrorBoundary.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapErrorBoundary.tsx) bắt lỗi JS crash trong cây React.
- [x] Tạo component [MapFallback.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapFallback.tsx) thiết kế neobrutalism, cung cấp chỉ dẫn và nút thử lại có giới hạn số lần (3 lần).
- [x] Nâng cấp MapCanvas.tsx tích hợp bộ kiểm tra khả năng WebGL của trình duyệt và lắng nghe onError từ adapter để hiển thị giao diện fallback phù hợp.

---

# Task: P18-T017 - Planner Screen Integration

## Goal
Tích hợp các thành phần bản đồ và loading đã xây dựng vào màn hình khởi tạo Planner (/planner), thay thế hoàn toàn leaflet cũ và liên kết các chi tiết điều khiển.

## Deliverables
- Có thể chạy trực tiếp tại: http://localhost:5173/planner

## Acceptance Criteria
- Tích hợp thành công [MapCanvas.tsx](file:///d:/Dev/TripWise/web/src/components/map/MapCanvas.tsx) thay thế cho Leaflet trên view /planner.
- Hiển thị đúng [LoadingOverlay.tsx](file:///d:/Dev/TripWise/web/src/components/planner/LoadingOverlay.tsx) khi bắt đầu quá trình Generate Trip của AI.
- Đồng bộ hóa các luồng dữ liệu (RouteLayer, MarkerLayer, CameraController) với planner state.
- Kích hoạt [TransitionController.tsx](file:///d:/Dev/TripWise/web/src/components/planner/TransitionController.tsx) trơn tru khi kết thúc loading.
- Không sử dụng mock data. Chỉ sử dụng dữ liệu thật từ:
  - Generate Trip API
  - Weather API
  - OSRM Route
  - Trip DTO
- LoadingOverlay phải phản ánh đúng trạng thái generate thực tế.
- ThinkingPanel phải nhận state thật.
- Verify trực tiếp trên http://localhost:5173/planner.

## Production Considerations
- Đảm bảo các cleanups hoạt động đầy đủ khi chuyển đổi cảnh hoặc hủy luồng Generate Trip đột ngột.

### Subtasks
- [x] Tích hợp MapCanvas vào /planner.
- [x] Thay thế Leaflet bằng MapLibre tại Planner.
- [x] Kết nối MapAdapter với luồng Generate Trip.
- [x] Hiển thị LoadingOverlay khi AI bắt đầu sinh lịch trình.
- [x] Kết nối ThinkingPanel với trạng thái Generate Trip thực tế.
- [x] Đồng bộ CameraController với planner state.
- [x] Đồng bộ RouteLayer.
- [x] Đồng bộ MarkerLayer.
- [x] Tích hợp TransitionController.
- [x] Verify hoạt động end-to-end trên Planner.

---

# Task: P18-T018 - Planner Generate Animation

## Goal
Xây dựng và phối hợp chuỗi hoạt cảnh hoạt hình (Planner Generate Animation) khi người dùng yêu cầu AI lập kế hoạch du lịch mới tại /planner. Hoạt cảnh bao gồm vẽ đường, xuất hiện điểm, dịch camera, thay đổi trạng thái và đóng gói thông qua các chi tiết điều khiển.

## Deliverables
- Có thể chạy trực tiếp và trực quan hóa chuỗi hoạt cảnh tại: http://localhost:5173/planner trước khi chuyển trang.

## Acceptance Criteria
- Khi nhấn nút Generate, kích hoạt chuỗi hoạt ảnh đồng bộ:
  - Route Reveal: Vẽ tuyến đường động từ OSRM.
  - Marker Appear: Hiện bouncy markers tuần tự.
  - Camera Fly: Bay camera theo sát tiến trình vẽ.
  - Thinking State Transition: Đổi trạng thái hiển thị mượt mà trên ThinkingPanel.
  - LoadingOverlay Sync: Đồng bộ tắt/mở lớp phủ overlay.
  - TransitionController Sync: Kích hoạt đồng thời panel trượt và zoom tỷ lệ bản đồ.
- Toàn bộ hoạt cảnh diễn ra trơn tru, liên tục và kết thúc trước khi ứng dụng thực hiện điều hướng chuyển đổi sang chi tiết chuyến đi.

## Production Considerations
- Sử dụng GSAP timeline duy nhất để phối hợp nhịp nhàng, đảm bảo các cử chỉ pan/zoom bản đồ nền bị vô hiệu hóa tạm thời trong lúc chạy animation để tránh gián đoạn hình ảnh.

### Subtasks
- [x] Triển khai hiệu ứng vẽ tuyến đường động (Route Reveal Animation).
- [x] Triển khai hiệu ứng xuất hiện marker bouncy (Marker Appear Animation).
- [x] Đồng bộ hóa di chuyển Camera tự động (Camera Fly Animation).
- [x] Đồng bộ chuyển trạng thái AI Thinking (Thinking State Transition).
- [x] Đồng bộ hiển thị LoadingOverlay khi sinh trip (LoadingOverlay Sync).
- [x] Kích hoạt đồng thời các hiệu ứng thông qua TransitionController (TransitionController Sync).
- [x] Xác minh người dùng xem chuỗi hoạt cảnh chạy liên tục tại /planner trước khi chuyển trang.
- [x] Cancel animation nếu Generate lần nữa.
- [x] Cleanup toàn bộ GSAP timeline khi unmount.
- [x] Cleanup camera animation.
- [x] Cleanup Route animation.
- [x] Cleanup Marker animation.
- [x] Disable pan/zoom trong lúc animation.
- [x] Restore interaction sau animation.
- [x] Không tạo WebGL context mới.

---

# Task: P18-T019 - Trip Detail Screen Integration

## Goal
Thay thế Leaflet và tích hợp MapLibre cùng các controllers liên quan vào màn hình chi tiết chuyến đi (/trips/:id), kết nối timeline và đồng bộ các cử chỉ/tiêu điểm.

## Deliverables
- Có thể chạy trực tiếp tại: http://localhost:5173/trips/:id

## Acceptance Criteria
- Thay thế hoàn toàn bản đồ Leaflet cũ bằng bản đồ MapLibre mới.
- Kết nối Timeline hiển thị các cards địa điểm.
- Đồng bộ các cử chỉ Day Switching (chuyển ngày), Activity Highlight (hover/focus hoạt động) và Route Highlight (tô đậm chặng đường).
- Tự động zoom camera fitBounds/flyTo khi đổi tiêu điểm địa điểm.

## Production Considerations
- Sử dụng callback của adapter để tránh re-render React tree ngoài ý muốn khi tương tác bản đồ.

### Subtasks
- [x] Thay thế Leaflet bằng MapLibre tại Trip Detail.
- [x] Kết nối Timeline.
- [x] Kết nối Day Switching.
- [x] Kết nối Activity Highlight.
- [x] Đồng bộ Route Highlight.
- [x] Đồng bộ Marker Highlight.
- [x] Đồng bộ Camera Focus.
- [x] Verify hoạt động end-to-end trên Trip Detail.

---

# Task: P18-T020 - Planner → Trip Transition

## Goal
Liên kết hoàn chỉnh luồng chuyển dịch trạng thái từ Generator Page (Loading/Thinking) sang Trip Detail Page cùng các hiệu ứng camera/vẽ tuyến đường mượt mà.

## Deliverables
- Luồng hoàn chỉnh: Planner -> Loading -> AI Thinking -> Animation -> Transition -> Trip Detail.

## Acceptance Criteria
- Khi người dùng gửi yêu cầu sinh trip, LoadingOverlay hiển thị và ThinkingPanel cập nhật theo tiến trình thật của AI backend stream.
- Khi AI phản hồi xong, chạy đồng thời hiệu ứng camera zoom, vẽ tuyến đường OSRM động, hiển thị markers bouncy, trượt panel trái, và tự động điều hướng URL sang `/trips/{id}`.

## Production Considerations
- Đồng bộ hóa định tuyến React Router với luồng kết thúc animation của GSAP để tránh giật hình.

### Subtasks
- [x] LoadingOverlay hiển thị khi Generate Trip.
- [x] ThinkingPanel cập nhật theo tiến trình thật.
- [x] Camera animation.
- [x] Route drawing animation.
- [x] Marker appearance animation.
- [x] TransitionController.
- [x] Navigate sang Trip Detail khi hoàn tất.
- [x] Verify toàn bộ animation.

---

# Task: P18-T021 - End-to-End Testing & Bug Fixing

## Goal
Thực hiện kiểm thử đầu cuối (E2E) trên các thiết bị và trình duyệt khác nhau để phát hiện và xử lý toàn bộ lỗi blocker, nâng cao tính ổn định cho toàn bộ Phase 18.

## Deliverables
- Bộ sản phẩm kiểm thử và các bản vá lỗi được tích hợp hoàn chỉnh.

## Acceptance Criteria
- Hoàn tất kiểm thử thủ công và tự động (nếu có) trên cả Desktop và Mobile.
- Khắc phục triệt để các lỗi rò rỉ bộ nhớ (memory leaks), lỗi crash WebGL context, lỗi định vị và lỗi định tuyến.
- Không còn bug blocker nào tồn tại trước khi đóng phase.

## Production Considerations
- Đảm bảo không tạo ra regression bugs khi tiến hành sửa lỗi.

### Subtasks
- [ ] Manual test Desktop.
- [ ] Manual test Mobile.
- [ ] Responsive verification.
- [x] Accessibility verification.
- [x] Reduced Motion verification.
- [x] WebGL fallback verification.
- [x] ErrorBoundary verification.
- [x] Memory leak verification.
- [ ] Performance regression verification.
- [x] Fix toàn bộ bug phát hiện.
- [ ] Generate Trip liên tục >=20 lần.
- [ ] Day Switching liên tục.
- [x] Resize Browser.
- [ ] Browser Refresh (F5).
- [ ] Browser Back/Forward.
- [ ] Offline tile loading.
- [ ] Memory leak check.
- [x] WebGL context recovery.

---

# Task: P18-T022 - Performance Optimization

## Goal
Tối ưu hóa sâu hiệu năng của hệ thống bản đồ: lazy load MapLibre, tách file bundle (code splitting), tối ưu hóa bộ nhớ và pipeline render để đạt tốc độ khung hình (FPS) mượt mà nhất.

## Deliverables
- Gói bundle được tối ưu hóa kích thước và tốc độ tải trang ban đầu.

## Acceptance Criteria
- Lazy load thành công thư viện MapLibre GL JS và GSAP tại các routes cần thiết.
- Giảm tải dung lượng file bundle chính (index.js) xuống mức an toàn.
- Cấu hình cache tile vector tối ưu và dọn dẹp các redraw thừa của WebGL.

## Production Considerations
- Việc lazy load không được cản trở quá trình nạp dữ liệu hay gây nhấp nháy trang trắng trên client yếu.

### Subtasks
- [x] Lazy load MapLibre.
- [x] Code splitting.
- [x] Bundle optimization.
- [ ] Route rendering optimization.
- [ ] Marker rendering optimization.
- [x] Camera optimization.
- [x] Tile loading optimization.
- [ ] Cache strategy review.
- [x] Memory optimization.
- [ ] FPS profiling.

---

# Task: P18-T023 - Production Validation

## Goal
Xác minh chất lượng cuối cùng của Phase 18 trên môi trường build production thực tế, kiểm tra TypeScript, ESLint, khả năng tiếp cận (a11y) và độ ổn định tổng thể.

## Deliverables
- Build production hoàn thiện và báo cáo chất lượng Phase 18 sẵn sàng merge PR.

## Acceptance Criteria
- Ứng dụng chạy build production thành công không có lỗi TypeScript hoặc warnings nghiêm trọng.
- Kiểm tra toàn bộ hoạt động của WebGL fallback, chính sách thử lại (retry), và điều hướng bàn phím a11y.
- Đạt mốc hoàn thành toàn bộ Phase 18 và đủ điều kiện bàn giao code.

## Production Considerations
- Không commit file `.env` thật hoặc các local paths cấu hình đặc thù.

### Subtasks
- [x] Build production.
- [x] Kiểm tra không còn TypeScript errors.
- [x] Kiểm tra không còn ESLint errors.
- [x] Kiểm tra không còn memory leak.
- [x] Kiểm tra bundle size.
- [x] Kiểm tra WebGL fallback.
- [x] Kiểm tra retry strategy.
- [x] Kiểm tra accessibility.
- [x] Kiểm tra animation stability.
- [x] Đánh dấu hoàn thành Phase 18.
