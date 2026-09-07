# T002 exact-current closure

Status: COMPLETE. No production source, tests, migrations or dependencies changed.

- Source freeze: source-hashes-before.json; final verification: source-hashes-after.json. All eight required SHA-256 hashes match. Aggregate is SHA-256 of ordered path=hash lines joined with LF, without trailing LF; see source-hash-match.log.
- Fresh typecheck: typecheck.log, EXIT_CODE=0.
- emulator-5554: device. TripWise development app attached to Metro 8081 (metro-connected-app.json). Reload requested after source freeze at 15:32:04Z. ReactNativeJS Running main at 22:33:20 device local time / 15:33:20Z confirms restart after reload (android-log.txt).
- Metro source map contents match disk for controller, sheet, TripDetailScreen, validator and Supabase repository (metro-source-match.json). The served Android bundle contains the linked Supabase project URL; environment matches linked project. No credentials retained.
- Production navigator mounts TripDetailScreen directly without fixture props; real UUID items use the default remote repository. Successful reopen fetches and validates get_saved_trip_detail. No fixture fallback is used for this real saved trip.
- Same-day: Khu pho Asakusa, a89559da-6845-4a79-a614-4cf793063c27, Day 1 position 1 -> 2. 03/04 show before; 05 selection; 06 saved; 07 leaves to Home; 08 reopens and retains position 2.
- Cross-day: same UUID from Day 1 position 2 -> Day 2 explicit position 1. 09-11 selection; 12 source after save; 13 destination after save; 14 leaves fully to Home; 15 source after reopen; 16 destination after reopen; 17 independently confirms selected Day 2 / position 1; 19 records all six destination UUIDs.
- Ordering: source has three items, destination six, moved UUID only in destination. Reopened graph passes parseSavedTripItem value.position === expectedPosition and every day maps expectedPosition=index+1, so both full day arrays are contiguous. This is runtime UI plus current strict transport-validation evidence, not a direct SQL query of remote tables. runtime-assertions.json records exact IDs and assertions.
- ANDROID_SAME_DAY_REORDER_EXACT_CURRENT=PASS
- ANDROID_CROSS_DAY_MOVE_EXACT_CURRENT=PASS
- ANDROID_REOPEN_PERSISTENCE_EXACT_CURRENT=PASS
- ANDROID_PROVIDER_PROVENANCE=NOT_AVAILABLE for this runtime move: selected real item is unresolved (Resolve place action); no provider resolution or fabricated provider rows were created. Existing database VERIFIED regression retained; SQL unchanged.
- Reused evidence in ../p2-t002-20260905: focused 9/9, full 63 suites/450 tests with one suite/test skipped, lint zero errors/12 warnings, Docker PERSISTENCE_TESTS_PASS and all three direct-writer markers, remote migration list includes both 20260904000000 and 20260905000000 local/remote. Fingerprints stored in reused-evidence.json. No reruns of those gates.
- Expo Doctor: existing 20/21; EXPO_DOCTOR_BASELINE=YES; EXPO_DOCTOR_T002_REGRESSION=NO. Dependencies untouched.
- Optional passive debugger-network observer did not connect; stopped without capturing requests. No network-capture evidence is claimed. Runtime evidence relies on fresh UI captures, Metro source matching, strict parser and reload log.
- User-authorized saved-trip state change remains: Asakusa is now Day 2 position 1. No additional trip/items were created or deleted.
- Production mock/fake data: NONE in tested path.
- CREATE_TRIP_GENERATION_MOTION=PAUSED_BY_USER.
- Stop after T002 closure. T003 not started.
