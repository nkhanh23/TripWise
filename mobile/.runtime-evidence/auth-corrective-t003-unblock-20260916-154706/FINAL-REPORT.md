# AUTH CORRECTIVE + T003 UNBLOCK REPORT

## AUTH_CORRECTIVE

Status: VERIFIED FROM ANDROID RUNTIME / VERIFIED FROM TEST EVIDENCE

Root cause: bootstrap and auth-event handling trusted the user embedded in locally persisted `getSession()` results. That cached user could survive after the corresponding Auth owner was removed. Pending profile reads also lacked an account-generation guard.

Correction:
- Every restored session and non-null auth event is validated with Supabase Auth `getUser(access_token)` before it reaches authenticated UI state.
- Invalid/expired credentials clear only the local persisted session and fail closed.
- Auth epochs prevent profile work from a previous identity repopulating current state.
- A missing profile row remains `profileStatus=absent` for a server-valid Auth identity.

Android before: historical bundle `mobile/.runtime-evidence/T003-real-trip-runtime-20260916-151148/`; live reproduction showed the invalid cached owner could access Create Trip and retained wizard state.

Android after: cold launch on emulator-5554 rendered the signed-out Welcome screen with `Get started` and `I already have an account`. Create Trip, the prior wizard state, and the generic generate failure were absent.

Focused tests: 4 suites passed, 28 tests passed.
Full Jest gate: 97 suites passed, 2 skipped; 1728 passed, 2 skipped (run before the final additional subscription regression; the final focused run passed 28/28).
Typecheck: PASS.
Targeted ESLint: PASS with pre-existing import-order warnings only.
Full lint: BASELINE FAILURE, 6 errors outside the changed files.
Expo Doctor: BLOCKED because `npx.cmd`/expo-doctor is not installed or available in the current shell runtime.

Generation error mapping: NOT CHANGED. After the auth correction an invalid server identity cannot enter authenticated generation navigation; no trustworthy post-fix reproduction justified changing the mapping.

## T003

Real owner status: VALID_DEV_AUTH_OWNER_NOT_AVAILABLE.
No new Auth account was created.
No disposable trip was created.
T003 native closure was not resumed.

`mobile/src/integration/reminderScheduling.ts` SHA-256: BE6441A4643F2A0F33020EC55016639BAF8DEB42B2341BC165295A6E423FBD3E

Roadmap: unchanged by this task.
FEATURE-P6-T004: NOT STARTED.
