# Timezone foundation Expo quality-gate corrective

Date: 2026-09-14

## Status

BLOCKED. The five packages named by the task were aligned to the versions required
by Expo SDK 57. Expo Doctor then reported three additional mandatory compatibility
updates outside the authorized dependency list: react-native 0.86.3,
eslint-config-expo ~57.0.2, and jest-expo ~57.0.5. They were not changed.

Timezone source/schema semantics are byte-for-byte unchanged against
`.runtime-evidence/trip-timezone-20260913/source-sha256.txt`.

## Package versions

| Package | Declared before | Installed before | Declared/installed after |
|---|---:|---:|---:|
| expo | ~57.0.15 | 57.0.18 | ~57.0.22 / 57.0.22 |
| expo-asset | ~57.0.13 | 57.0.15 | ~57.0.17 / 57.0.17 |
| expo-dev-client | ~57.0.14 | 57.0.16 | ~57.0.19 / 57.0.19 |
| expo-font | ~57.0.1 | 57.0.2 | ~57.0.4 / 57.0.4 |
| expo-secure-store | ~57.0.1 | 57.0.2 | ~57.0.4 / 57.0.4 |

Only these five direct declarations changed. npm refreshed their transitive lock
resolution; no unrelated direct dependency was intentionally upgraded. No
`expo.install.exclude` suppression was added.

Current hashes:

- `mobile/package.json`: `580A26AC6736AC1DDBCA44155A2BE6A31C6521772C59FAB07CFAD096B0A60739`
- `mobile/package-lock.json`: `9DBD7F34CCB7F4233C21DE6A7AB1D8B42ADC26307AC97FE55D5955E1E51268A9`

## Fresh evidence

- `expo-install-check-before.txt`: exit 1; exactly the original five package
  mismatches.
- `expo-install-check-after.txt`: exit 1; the original five are resolved, but
  the updated Expo compatibility matrix requires react-native 0.86.3,
  eslint-config-expo ~57.0.2, and jest-expo ~57.0.5.
- `lint.txt`: exit 0; 0 errors, 9 existing warnings.
- `typecheck.txt`: exit 0.
- `jest.txt`: exit 0; 89 suites and 1,618 tests passed; 2 suites / 2 tests
  skipped (91 suites / 1,620 tests total).
- `process-timezones.txt`: exit 0; UTC, Pacific/Kiritimati, Etc/GMT+12,
  America/New_York, and Asia/Ho_Chi_Minh all PASS.
- `expo-doctor.txt`: exit 1; 20/21 checks pass. The package compatibility check
  fails only for the three newly surfaced dependencies above.
- `persistence.txt`: exit 0; fresh, upgrade, legacy-null preservation,
  timezone contract, default-ACL matrix, and `PERSISTENCE_TESTS_PASS` all pass.
- `adb devices`: no connected emulator/device. Android app-start smoke was not
  run. Native-facing packages changed, so a regenerated development build is
  required before later device runtime evidence; this task did not generate or
  modify native project files.

Evidence classifications: automated results are VERIFIED FROM TEST EVIDENCE;
timezone byte-manifest comparison is VERIFIED FROM SOURCE; Android runtime is
NOT RUN because no device was available and the dependency compatibility gate
remains blocked.

No migration, timezone SQL/RPC, timezone transport/domain file, Edge Function,
notification implementation, permission flow, roadmap state, T002, T003, T004,
or P7 behavior was changed. No commit or push was performed.
