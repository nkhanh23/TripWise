# USER_CONFIRMED trip timezone foundation

Verification date: 2026-09-14. Scope: one explicitly owner-confirmed schedule timezone;
not provider-verified geography. No UI, notifications, permission, T003/T004/P7 or roadmap changes.

## Result

Foundation implemented and local database runtime verified. Closure remains BLOCKED
by Expo Doctor's existing five SDK patch-version mismatches (20/21 checks, exit 1).
No dependency upgrade was performed incidentally. T002 scheduling was not started.

## Live source inspected

- README.md, AGENTS.md, DECISIONS.md, TASKS.md, phase_doc/PHASES_FEATURES.md.
- Relevant engineering/security and React Native/Stitch mapping contracts.
- supabase/migrations/: trips creation, workspace revision/order/owner mutation,
  stable create_trip_graph wrappers, get_saved_trip_detail, refresh/CAS and P6 progress migrations.
- mobile/src/lib/supabase/database.types.ts.
- mobile/src/integration/contracts.ts, validation.ts, mappers.ts, savedTripMappers.ts,
  tripProgress.ts, tripRefresh.ts, errors.ts, reliability.ts and related tests.
- mobile/src/integration/remote/supabaseTripRepositories.ts,
  supabaseTripProgressRepository.ts and auth/session handling.
- mobile/src/features/planner/generation.ts, generationContracts.ts, persistence.ts,
  destinationSearch.ts, screens/CreateTripWizardScreen.tsx and components/StepDestination.tsx.
- Current generate-trip, search-destinations, verified-place and get-place-metadata boundaries;
  OSRM/Open-Meteo and P5 route/weather schedule contracts (no timezone authority promoted).
- supabase/tests/persistence/run.ps1, bootstrap/upgrade, workspace/RLS/CAS,
  trip-progress and broad-default-ACL contracts.

## Source files changed by this task

1. supabase/migrations/20260913155554_user_confirmed_trip_timezone.sql
2. supabase/tests/persistence/run.ps1
3. supabase/tests/persistence/trip_timezone_contract.sql
4. supabase/tests/persistence/trip_timezone_upgrade_seed.sql
5. supabase/tests/persistence/trip_timezone_upgrade_verify.sql
6. mobile/src/lib/supabase/database.types.ts
7. mobile/src/integration/contracts.ts
8. mobile/src/integration/validation.ts
9. mobile/src/integration/tripTimezone.ts
10. mobile/src/integration/remote/supabaseTripTimezoneRepository.ts
11. mobile/src/integration/tripProgress.ts
12. mobile/src/integration/tripRefresh.ts
13. mobile/tests/trip-timezone.test.ts
14. mobile/tests/trip-progress-timezones.cjs
15. mobile/tests/trip-refresh.test.ts
16. docs/05-engineering/trip-timezone-contract.md

Evidence-only files in this directory: REVIEW.md, lint.txt, typecheck.txt, jest.txt,
doctor.txt, process-timezones.txt, persistence.txt, source-sha256.txt.
Git history/worktree advanced externally during the task. This agent ran no git write,
commit, reset, restore, stash, discard or push. The manifest identifies the tested files.

## Contract and security

VERIFIED FROM SOURCE / VERIFIED FROM TEST EVIDENCE:

- Nullable trip tuple: schedule_timezone / timezone_provenance / timezone_confirmed_at.
  All NULL, or a supported geographic IANA name + USER_CONFIRMED + finite server timestamp.
- Narrow set_trip_timezone({tripId, expectedRevision, timezone}) public invoker wrapper,
  private definer with auth.uid(), owner predicate, row lock and canonical workspace_revision CAS.
- Same-value current-revision call is a no-op; changed value/clear increments once;
  stale TW009 has zero row side effects. Foreign TW008; anonymous permission denied.
- Raw authenticated tuple INSERT/UPDATE blocked with TW013. No client provenance/timestamp.
- Exact PostgreSQL pg_timezone_names membership and independently explicit Intl support;
  bounded geographic-name subset excludes abbreviations, offsets, Etc and POSIX names.
- Legacy/new trips remain NULL. No automatic confirmation from any provider or device.
- Destination change atomically clears the tuple. No destination editor introduced.
- Detail/progress reads validate the tuple. Lifecycle unchanged; available_user_confirmed
  exposes authority only. P5 refresh cannot change/drop the confirmed timezone.
- Repository checks initiating session identity/expiry before and after one bounded call;
  sign-out/switch/session replacement discards the response. No retry or optimistic cache.

## Gates and runtime evidence

- npm run lint: exit 0, 0 errors / 9 existing warnings (lint.txt).
- npm run typecheck: exit 0 (typecheck.txt).
- npm test -- --runInBand: exit 0, 89 suites / 1,618 tests passed; 2 suites / 2 tests
  skipped (91 suites / 1,620 tests total). No tests disabled by this task.
- node tests/trip-progress-timezones.cjs: exit 0, five timezone processes PASS
  (UTC, Kiritimati, Etc/GMT+12, New_York, Ho_Chi_Minh); no implicit clock fallback.
- npx expo-doctor: exit 1, 20/21 checks PASS; patch mismatches:
  expo 57.0.18 vs ~57.0.22; expo-asset 57.0.15 vs ~57.0.17;
  expo-dev-client 57.0.16 vs ~57.0.19; expo-font 57.0.2 vs ~57.0.4;
  expo-secure-store 57.0.2 vs ~57.0.4. No package files changed.
- supabase/tests/persistence/run.ps1: exit 0, FRESH_PERSISTENCE_CHAIN_PASS,
  UPGRADE_PERSISTENCE_CHAIN_PASS, TRIP_TIMEZONE_UPGRADE_LEGACY_NULL_PASS,
  TRIP_TIMEZONE_CONTRACT_PASS on fresh/upgrade/default-ACL databases,
  TRIP_TIMEZONE_DEFAULT_ACL_PASS and PERSISTENCE_TESTS_PASS.
- Earlier SQL test runs exposed an ambiguous fixture variable and a fixture UUID
  collision with the existing legacy seed; both corrected, final harness passed.

Database evidence is controlled LOCAL PostgreSQL runtime with authenticated/anonymous
roles and simulated JWT subject settings, not hosted Supabase JWT gateway evidence.
Final fixture 7a000000-0000-4000-8000-000000000001:
owner set/read-back Asia/Ho_Chi_Minh at revision 3 with server timestamp;
stale rejected TW009; DST zone accepted; clear at revision 5 with three NULLs;
foreign rejected TW008. Legacy null and upgrade preservation assertions passed.

Remote deploy/provider smoke and Android notification verification: NOT RUN, out of scope.
No applied migration rewritten. No second revision counter. Each mutation touches one
owner-scoped primary-key row; no provider calls, scan-based app lookup or N+1 introduced.

## Remaining work

Resolve the existing Expo patch-version gate in a separate dependency task before
claiming full prerequisite closure. Future approved timezone UI wiring remains separate;
it is not hidden in creation. Do not start T002 within this task.
