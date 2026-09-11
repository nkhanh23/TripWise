# FEATURE-P5-T003 — FINAL STATUS

## 1. Final status

PARTIAL — VERIFIED FROM SOURCE / VERIFIED FROM TEST EVIDENCE; runtime BLOCKED — REAL OPEN-METEO UNAVAILABLE. Không đóng T003/S001/checklist do chưa có real-provider success. FEATURE-P5-T004 NOT STARTED.

## 2. Existing weather architecture

WeatherRepository.getForecast -> OpenMeteoWeatherRepository -> executeWithReliability -> parseOpenMeteoForecast -> mapOpenMeteoForecast -> WeatherForecast/DailyWeather. Origin cố định, timezone=auto, forecastDays 1..16, bốn daily variables hiện tại giữ nguyên. Trip Detail badge, mapper, validation, contracts/repositories không đổi. Default retry policy Trip Detail giữ hai attempt; T003 chọn usage=scheduling với một attempt/8 giây.

## 3. Exact files changed

Tạo mới:
- mobile/src/integration/weatherSchedulingPolicy.ts
- mobile/src/integration/weatherScheduling.ts
- mobile/tests/weather-scheduling.test.ts
- mobile/tests/weather-scheduling.live-smoke.ts
- docs/05-engineering/weather-scheduling-policy.md

Sửa:
- mobile/src/integration/reliability.ts
- mobile/src/integration/remote/publicProviderRepositories.ts
- mobile/src/integration/index.ts
- phase_doc/PHASES_FEATURES.md

Evidence mới nằm riêng tại .runtime-evidence/p5-t003-weather-scheduling-20260910/. Danh sách tên file và SHA-256 đầy đủ trong source-hashes.json; không ghi đè evidence T001/T002. Không chạy Git/GitHub, commit/push/reset/restore/clean/stash/discard.

## 4–6. Policy architecture, sensitivity and rule

Pure applyWeatherSchedulingPolicy nhận canonical itinerary, explicit preferences, local calendar context và normalized located weather facts. evaluateWeatherScheduling phụ trách fetch; createWeatherSchedulingEvaluator hỗ trợ latest-only cancellation. Không đọc provider JSON trong rule.

Canonical SavedTripItem/Workspace metadata không có outdoor/indoor/weather-sensitivity. Caller phải cung cấp source=user_explicit, sensitivity=avoid_precipitation, itemId và allowedDayNumbers; validate unique existing IDs/targets. Không suy luận từ tên, category, Google/Ticketmaster title, Gemini hoặc tọa độ. Không tự wire metadata chưa tồn tại vào generation preview UNRESOLVED.

TripWise policy mới: precipitation >=60% -> chọn ngày được cho phép có <30%, ưu tiên probability thấp nhất rồi dayNumber thấp nhất. Chỉ di chuyển activity flexible chưa có giờ/booking metadata, giữ mọi item. WMO code, nhiệt độ và UI descriptions không điều khiển rule. Null weather code không bị diễn giải là sunny. Các ngưỡng là product-policy, không phải khuyến nghị Open-Meteo.

## 7–8. Date/timezone and location

localToday phải được caller cung cấp theo calendar tại vị trí forecast. Core không gọi clock, không thêm Z, không convert provider dates qua timezone thiết bị. Gregorian ordinal dùng kiểm tra horizon; facts chỉ match exact YYYY-MM-DD. Missing/duplicate/invalid date hoặc null/missing probability đều giữ baseline. Không mượn weather từ ngày khác.

Tối đa một forecast tại tọa độ VERIFIED chính xác chung cho các item có explicit sensitivity. Không dùng first-coordinate của Trip Detail đại diện cho distant activities. Invalid/missing coordinates -> location_unavailable; khác tọa độ -> multiple_locations, zero requests. Không rounding/grouping theo khoảng cách giả định, không (0,0) fallback. Mọi itinerary date ngoài 1..16 ngày -> forecast_out_of_horizon trước fetch.

## 9–12. Protected constraints and T002

FIXED không được đổi day/time/position hay drop; gặp preference mưa cao -> protected_constraint_conflict + baseline. Move một flexible item mà làm dịch FIXED position cũng bị T001 reject. MUST_DO không drop/downgrade. T001 validate baseline trước route/weather projection, validate từng candidate và final proposal; oversized input không được duyệt lại sau rejection. Invalid itinerary trả schedule=null, không sửa âm thầm.

T002 source giữ nguyên hash. Proposal T003 tương thích T001/T002; không có OSRM call, route scoring hay N-squared logic mới. Route composition không là dependency của weather success. Đây là weather preference proposal, không tuyên bố route/time feasibility hoàn chỉnh.

## 13–16. Fallback, request bounds, races, determinism

Status/reason machine-readable: applied, no_weather_sensitive_items, no_change, forecast_unavailable, forecast_out_of_horizon, incomplete_forecast_facts, location_unavailable, protected_constraint_conflict, cancelled, invalid_input. Network/timeout/429/provider unavailable/null/invalid weather giữ baseline, không clear trip hay tạo sunny facts. Repository null không cung cấp nguyên nhân cụ thể, nên không đoán outage reason.

Hard bounds: T001 60 days/50 items per day/500 total, tối đa 20 explicit preferences, 16 target days/preference, 16 forecast days, 1 logical forecast request. Default T003 repository one upstream attempt, timeout 8 giây; không retry amplification. Logical request count không đồng nghĩa HTTP attempts khi caller inject repository khác.

Pre-cancel: zero calls. In-flight abort races provider promise; late success không thành applied proposal. Latest-only evaluator abort run cũ. Không global result state hoặc automatic commit. Caller phải bỏ qua cancelled result. Stable preference ID order, target probability/dayNumber order; provider array order và input canonical permutations không làm đổi kết quả.

## 17–21. Fresh gates and regressions

| Gate / command (cwd mobile) | Raw output | Result | Exit |
|---|---|---|---|
| npm run lint | lint-final-raw.txt | 0 errors, 9 baseline warnings | 0 |
| npm run typecheck | typecheck-final-raw.txt | PASS | 0 |
| npm test -- --runInBand weather-scheduling.test.ts | focused-final-raw.txt | 73/73 tests | 0 |
| npm test -- --runInBand | full-jest-final-raw.txt | 84 suites PASS, 1 skipped; 1359 tests PASS, 1 skipped | 0 |
| npx expo-doctor | doctor-final-raw.txt | 20/21 BASELINE — EXIT 1 — NO P5-T003 REGRESSION | 1 |
| npm test -- --runInBand deterministic-constraint-engine.test.ts route-optimization.test.ts integration-weather.test.ts TripDetailScreen.test.tsx integration-remote-repositories.test.ts integration-validation.test.ts | regressions-raw.txt | 6 suites, 197/197 tests | 0 |

Mỗi raw output có file *-exit.txt tương ứng. Initial typecheck từng exit 2 vì node:assert import trong manual live test không thuộc mobile type config; đã thay bằng local assertion helper, final typecheck exit 0. Initial và final logs giữ nguyên để audit. Doctor đúng năm patch mismatches accepted: expo, expo-asset, expo-dev-client, expo-font, expo-secure-store; không sửa dependency. Existing act/console warnings còn trong raw test logs.

## 22–24. Live vs controlled evidence and counts

Real command: npx tsx tests/weather-scheduling.live-smoke.ts 2026-09-10 2026-09-11.
- Coordinate: latitude 13.7498558, longitude 100.4915765 — The Grand Palace, từ accepted real Google Places result trong p4-t001-20260909/live-smoke-provider-evidence.md. Smoke itinerary và sensitivity là test-only, không phải persisted user data hay khẳng định place inherently outdoor.
- forecastDays=2, timezone=auto, trusted Open-Meteo origin.
- Logical forecast requests=1; instrumented fetch/HTTP attempts=1.
- Normalized forecast=null. Không có returned date/precipitation/weather facts để báo như success.
- Result=forecast_unavailable/missing_forecast; baseline giữ nguyên, T001 isValid=true; persistenceWrites=0.
- Exit=1; runtime BLOCKED. Repository đã che nguyên nhân optional failure; không thể kết luận chính xác network/timeout/429/provider outage từ null.
- real-open-meteo-raw.txt / real-open-meteo-exit.txt giữ bằng chứng. Không retry provider, không fake replacement. Live run trước thay assertion helper trong harness; production source không đổi sau live run. Đây không phải live-success evidence cho final hash.

CONTROLLED FAILURE/FALLBACK EVIDENCE: focused suite dùng production OpenMeteoWeatherRepository với injected transport cho network, timeout, 429, 503 và malformed response; mỗi scheduling case 1 attempt, baseline retained. Default Trip Detail 503 vẫn 2 attempts. Mock timeout không được gọi là real outage. Positive reordering chỉ VERIFIED FROM TEST EVIDENCE, chưa VERIFIED FROM LIVE PROVIDER.

## 25–26. Security, persistence and hashes

Không Supabase mutation, RPC, migration, endpoint mới, Edge work/deploy, saved_places write, trip replacement hoặc refresh/version. Origin cố định, public/no-secret, validated coordinates/horizon/response, sanitized status/reason. Production policies không import database modules hay đọc secrets.

source-hashes.json được tạo sau final source/docs/roadmap/report, gồm mọi source đổi mới và evidence-critical files, initial/final logs, baseline files, provider-coordinate provenance và báo cáo này. Manifest loại chính nó để tránh recursive hash. preserved-source-check.json ghi đối chiếu pre-change: T001, T002, weather UI, contracts, repositories, mappers, validation vẫn giữ nguyên. Đây là manifest T003 có scope rõ, không claim hash toàn repository.

## 27. Exact roadmap

- [x] FEATURE-P5-T001
- [x] FEATURE-P5-T002
- [x] FEATURE-P5-T002-S001
- [x] Batching/cache/fallback route PASS
- [ ] FEATURE-P5-T003
- [ ] FEATURE-P5-T003-S001
- [ ] Weather failure không chặn trip; kiểm thử rule PASS
- [ ] FEATURE-P5
- [ ] FEATURE-P5-T004

## 28. Remaining limitations / next bounded action

T003 chưa closure: cần một bounded REAL OPEN-METEO SUCCESS khi provider khả dụng. Không tự lập lịch retry. UI/generation chưa cung cấp explicit sensitivity; boundary được chuẩn bị cho caller, không claim end-to-end weather-aware generation. Chỉ single exact location, untimed flexible activity, precipitation day-level; không hourly scheduling, geographic grouping, temperature policy hoặc full route feasibility. Không Android runtime mới vì không đổi native/UI và scope này là policy/repository; Trip Detail regression automated PASS, không thay thế runtime proof. Không bắt đầu T004 để giải quyết các giới hạn này.

## 29. Stop boundary

FEATURE-P5-T004 NOT STARTED.
