# Final Expo SDK 57 compatibility closure

Date: 2026-09-14

## Result

PASS. `npx expo install --check` reports dependencies up to date (exit 0), and
Expo Doctor reports 21/21 checks passed (exit 0).

## Authorized dependency alignment

| Direct package | Before | After |
|---|---:|---:|
| react-native | 0.86.2 | 0.86.3 |
| eslint-config-expo | ^57.0.1 / installed 57.0.1 | ~57.0.2 / installed 57.0.2 |
| jest-expo | ^57.0.4 / installed 57.0.4 | ~57.0.5 / installed 57.0.5 |

No other direct dependency was intentionally changed. npm naturally resolved
`@react-native/jest-preset@0.86.3` as the required transitive peer of both
React Native 0.86.3 and Jest Expo 57.0.5. It was not added to package.json.
No `expo.install.exclude` entry was added.

Current SHA-256:

- `mobile/package.json`: `797942D4DFEB56B0C9C9ED6122152D42F4D006C662566DBDBEF97EC94140182D`
- `mobile/package-lock.json`: `DB8F7F0E3DF40A6BB4DE90FE221102F17272D3962CAA775A70382190432142D2`

During execution, Expo CLI first changed the requested declarations but npm
reported an old optional peer conflict. After preserving eslint-config-expo and
jest-expo in devDependencies, npm reconciled the final dependency tree. A first
Jest attempt exposed the missing required preset; a normal final `npm install`
then installed the transitive peer. All results below were rerun after that final
installation. An earlier Android command contained a typo and did not run; the
correct Gradle invocation below is the authoritative result.

## Final verification

- `expo-install-check.txt`: dependencies up to date, exit 0.
- `lint.txt`: 0 errors and 9 existing warnings, exit 0.
- `typecheck.txt`: PASS, exit 0.
- `jest.txt`: 89 suites / 1,618 tests passed; 2 suites / 2 tests skipped
  (91 suites / 1,620 tests total), exit 0.
- `process-timezones.txt`: five process timezones PASS (UTC,
  Pacific/Kiritimati, Etc/GMT+12, America/New_York, Asia/Ho_Chi_Minh), exit 0.
- `expo-doctor.txt`: 21/21 checks passed, exit 0.
- `persistence.txt`: fresh chain, upgrade chain, legacy timezone NULL
  preservation, trip timezone contract, default ACL, and
  `PERSISTENCE_TESTS_PASS`, exit 0.
- `android-assemble-debug.txt`: current native Android project compiled directly with
  `gradlew.bat :app:assembleDebug`; `BUILD SUCCESSFUL`, 387 actionable tasks
  (278 executed, 109 up-to-date), exit 0. No prebuild or native regeneration.
- No emulator/device was connected, so launch and interactive UI smoke are
  NOT RUN. Notification runtime evidence is outside this task.

The timezone foundation source manifest is unchanged byte-for-byte. The
dependency correction did not alter one-trip timezone scope, USER_CONFIRMED
provenance, legacy NULL behavior, owner/RLS/CAS/TW009, destination invalidation,
server timestamp ownership, creation behavior, or the prohibition on provider,
device, Gemini and weather fallbacks.

No timezone source, migration, RPC, domain contract, notification code,
permission flow, roadmap state, T002, T003, T004 or P7 behavior was changed.
No commit or push was performed by this agent.
