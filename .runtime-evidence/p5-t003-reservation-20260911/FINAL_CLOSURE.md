# FEATURE-P5-T003 reservation-safety + live-evidence closure

## Final status

COMPLETE — source corrective PASS, fresh gates PASS, REAL OPEN-METEO SUCCESS. This report supersedes the prior 20260910 PARTIAL report for current closure. FEATURE-P5-T004 NOT STARTED.

## Exact files changed in this corrective

- mobile/src/integration/weatherSchedulingPolicy.ts
- mobile/tests/weather-scheduling.test.ts
- docs/05-engineering/weather-scheduling-policy.md
- phase_doc/PHASES_FEATURES.md

New evidence in this directory: pre-change-hashes.json, preserved-source-check.json, lint-raw.txt/lint-exit.txt, typecheck-raw.txt/typecheck-exit.txt, focused-raw.txt/focused-exit.txt, full-jest-raw.txt/full-jest-exit.txt, regressions-raw.txt/regressions-exit.txt, live-raw.txt/live-exit.txt, doctor-raw.txt/doctor-exit.txt, FINAL_CLOSURE.md, source-hashes.json. Historical evidence remains untouched. No Git/GitHub operations.

## Canonical reservation semantics and protection

SavedTripItemBase.contact uses WorkspaceContactPatch; reservationCode is optional string|null. TripContact also exposes reservationCode. Canonical workspace validation accepts nonempty trimmed length 1..128; absent/null is optional, empty/whitespace-only is invalid. Policy reuses the canonical contact type, copies contact into the snapshot before await, rejects invalid reservation scalar without erasing it, and treats nonempty reservationCode as confirmed/bound metadata for this T003 policy.

A sensitive reserved activity under high rain returns no_change/timed_or_bound_activity and the complete baseline. Its exact calendar day, canonical position, MUST_DO priority and reservation metadata remain unchanged. Moving another activity may not indirectly shift a reservation's position, including reservations not in the sensitivity list. This is not a new booking provider claim or persistence model.

Booking URL and booking source links alone do not imply a completed reservation and do not restrict weather moves. Existing startTime/endTime, transport/accommodation metadata, transport/accommodation/reservation item kinds, completed/skipped and FIXED protection remain intact. T001/T002 source is unchanged. The new composition tests demonstrate both one weather request for another eligible activity and the existing atomic no-change behavior when a sensitive bound activity blocks the proposal.

## Weather/T001/T002 regression

All prior 73 focused tests retained; 13 reservation cases added. These cover reserved flexible place, exact day/position/MUST_DO, absent/null/invalid-empty code, booking links, item kinds, composition, indirect position shifts, contact snapshot and no persistence. Existing tests cover time/transport/accommodation/FIXED, forecast/date/threshold/null behavior, T001 validation, T002 compatibility, cancellation and controlled provider failures. No thresholds or date/location policy changes.

## Fresh gates (cwd mobile)

| Command | Result | Exit | Raw |
|---|---|---|---|
| npm run lint | 0 errors, 9 baseline warnings | 0 | lint-raw.txt |
| npm run typecheck | PASS | 0 | typecheck-raw.txt |
| npm test -- --runInBand weather-scheduling.test.ts | 86/86 PASS | 0 | focused-raw.txt |
| npm test -- --runInBand | 84 suites PASS, 1 skipped; 1372 tests PASS, 1 skipped | 0 | full-jest-raw.txt |
| npm test -- --runInBand deterministic-constraint-engine.test.ts route-optimization.test.ts integration-weather.test.ts TripDetailScreen.test.tsx integration-remote-repositories.test.ts integration-validation.test.ts | 6 suites, 197/197 PASS | 0 | regressions-raw.txt |
| npx expo-doctor | 20/21 BASELINE — EXIT 1 — NO P5-T003 REGRESSION | 1 | doctor-raw.txt |

Doctor retains the same five package patch mismatches (expo, expo-asset, expo-dev-client, expo-font, expo-secure-store); no dependency changes. Every command has a separate exact exit artifact. No Android/native/UI changes; no new Android runtime claim.

## REAL OPEN-METEO SUCCESS

Command: npx tsx tests/weather-scheduling.live-smoke.ts 2026-09-11 2026-09-12. Exit 0.
Production OpenMeteoWeatherRepository(..., 'scheduling'), one bounded attempt only. Harness source unchanged from pre-corrective snapshot; source settled before invocation.

- Explicit coordinate: 13.7498558, 100.4915765 (The Grand Palace); prior accepted Google Places coordinate provenance in .runtime-evidence/p4-t001-20260909/live-smoke-provider-evidence.md. Schedule and sensitivity are test-only, not invented production booking state.
- Location-local dates: 2026-09-11 and 2026-09-12; timezone request auto; forecastDays=2.
- Logical requests=1; instrumented HTTP attempts=1; retries=0; persistence writes=0.
- Normalized facts:

| Calendar date | WMO code | Max C | Min C | Precipitation probability |
|---|---:|---:|---:|---:|
| 2026-09-11 | 55 | 30.8 | 24.6 | 91% |
| 2026-09-12 | 95 | 31.2 | 23.4 | 95% |

Result: no_change/no_lower_risk_day. Both dates are present and facts normalized. There is no allowed day below 30%, so not moving is correct. T001 isValid=true, conflicts=[], MUST_DO retained. Pure-policy replay matches the fetched-policy result exactly. This proves real facts reached the scheduling boundary; positive relocation remains controlled-test evidence. No repeated provider request and no substitution of fixture weather.

## Controlled evidence and call terminology

CONTROLLED FAILURE/FALLBACK EVIDENCE: network, timeout, 429, 503 and malformed response remain passing tests using controlled transport. These are not real outages. LogicalForecastRequestCount counts repository invocations, not arbitrary upstream HTTP behavior; this live run separately instrumented exactly one HTTP attempt. Default T003 single-attempt behavior and accepted Trip Detail retries are unchanged.

## Persistence, security and scalability

No database write, mutation, RPC, migration, endpoint, Edge deployment, saved-place change, refresh/version work or new secret. Trusted origin, normalized transport validation, 16-day horizon, one request, bounded item/preferences policy remain. Reservation checks only traverse already bounded canonical items; no provider fan-out. No automatic commit or persistence of proposals.

## Source hashes and preserved behavior

source-hashes.json is regenerated after source, docs, final roadmap and this report. Includes all changed/source/evidence-critical files, canonical reservation contracts/validation, live harness and raw evidence; excludes itself to avoid recursive hashing. preserved-source-check.json compares pre-corrective hashes. T001/T002, weatherScheduling.ts, reliability, provider repository, index, weather UI, canonical contracts and live harness remain unchanged in this corrective. Manifest scope is T003 evidence, not the whole repository.

## Exact final roadmap

- [x] FEATURE-P5-T001
- [x] FEATURE-P5-T002
- [x] FEATURE-P5-T003
- [x] FEATURE-P5-T003-S001
- [x] Weather failure không chặn trip; kiểm thử rule PASS
- [ ] FEATURE-P5
- [ ] FEATURE-P5-T004

Remaining scope limitations are unchanged: explicit caller sensitivity, single exact forecast location, precipitation-only daily proposals, no generation/UI wiring or automatic persistence. No later P5 work is needed or authorized here.

FEATURE-P5-T004 NOT STARTED. Stop after T003 closure.
