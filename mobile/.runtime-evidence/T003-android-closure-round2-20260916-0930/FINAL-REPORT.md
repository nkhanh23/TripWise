# T003 Android closure — round 2

## 1. Final status: NEEDS_FIX

Expo Doctor proves an Expo SDK patch mismatch that requires a dependency update. Android runtime closure remains blocked because no authorized Android device/emulator is currently available. No source or dependency patch was made in this round.

## 2. Device

- Serial: none
- Android/API: not available
- Model: not available
- Connection stability: blocked; `adb devices -l` was empty, `adb reconnect` found no device/emulator, and the installed emulator tool reported no configured AVD.

## 3. Source freeze

PASS. All 16 approved T003 source/migration/roadmap hashes match the prior baseline. Files changed outside evidence by this round: NONE.

## 4. Static gates

- lint: PASS, exit 0; 0 errors and 9 pre-existing warnings.
- typecheck: PASS, exit 0.
- full Jest: PASS, exit 0.
- focused T003 Jest: PASS, exit 0.
- Expo Doctor: FAIL, exit 1 due to patch version mismatch.
- Expo install check: NOT RUN. The execution policy rejected it because a check may modify dependencies/node_modules; no workaround was used.
- Android `:app:assembleDebug`: PASS, exit 0.

## 5. Exact Jest counts

- Full: 97 passed suites, 2 skipped suites, 0 failed suites; 1,722 passed tests, 2 skipped tests, 0 failed tests.
- T003-focused: 7 passed suites, 73 passed tests, 0 skipped, 0 failed.

## 6. Initial permission state

NOT RUN this round: no connected device. Previous device state is not reused as current runtime proof.

## 7–12. Launch, ON/grant, schedule/privacy, denial, blocked-denial, mapping

BLOCKED: no Android target exists for real UI/runtime execution. No adb permission grant, notification injection, app-data clear, or device wipe was used.

## 13. OFF-persistence-failure deterministic evidence

PASS. Focused suite includes `OFF is immediate and cancellation starts before unresolved persistence` in `notification-policy-controller.test.ts`.

## 14. EN/VI runtime

BLOCKED: requires a real device. Existing localization source is hash-preserved but is not runtime proof.

## 15. Durable preference reload

BLOCKED: requires a real app process and backend/session state. No storage damage or fabricated success was used.

## 16. Stale-user/account-switch

NOT RUN: no device and no safe second authenticated account were available.

## 17. RLS/migration verification

BLOCKED. Docker client is installed but daemon connection to `localhost:2375` was refused. No remote migration deployment was attempted.

## 18. Expo dependency mismatch

- Current: `expo ~57.0.22`, `expo-notifications ~57.0.18`.
- SDK expected: `expo ~57.0.23`, `expo-notifications ~57.0.19`.
- Safe patch recommendation: update only these two package ranges/lockfile through the Expo-supported command in a separately authorized dependency-fix task, then rerun Expo Doctor, full Jest, Android assembleDebug, and device smoke.

## 19. Exact alarm audit

PASS. No `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM` occurrence in source, merged debug manifest, or debug APK.

## 20. T002 preservation

PASS. All 14 approved T002 source/test/config/manifest hashes match the prior native closure baseline. Runtime T003 ON/OFF preservation cannot be newly proven without a device.

## 21. Roadmap state

READ ONLY. T003 remains unchecked; T004 and P7 were not modified.

## 22. Remote migration deployment

NOT DEPLOYED.

## 23. Remaining blockers

1. Patch-align Expo and expo-notifications.
2. Restore one authorized Android device/emulator with existing app state.
3. Restore local Docker daemon for isolated migration/RLS verification.

## 24. PATCH REQUIRED

- Exact files: `mobile/package.json` and `mobile/package-lock.json`.
- Root cause: Expo SDK 57 requires `expo ~57.0.23` and `expo-notifications ~57.0.19`; installed ranges are one patch behind.
- Minimal proposed patch: Expo-supported patch-only dependency alignment, no source behavior change.
- Required validation: Expo Doctor, Expo install check, lint, typecheck, full/focused Jest, assembleDebug, install/retest real device permission/scheduling/denial/OFF flows.
