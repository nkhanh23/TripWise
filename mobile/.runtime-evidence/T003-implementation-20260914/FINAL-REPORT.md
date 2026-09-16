1. **Final status: INSUFFICIENT_RUNTIME_EVIDENCE.** Source implementation and local automated verification are complete; Android T003 acceptance is not proven. This is not a PASS/roadmap closure.

2. **LIVE LOCAL inspected:** README.md, AGENTS.md, DECISIONS.md, TASKS.md, phase_doc/PHASES_FEATURES.md, relevant React Native/Stitch/security contracts, T002 accepted source manifest, the 25 files in changed-files.txt, T002 engine/scheduler/native repository/cache/index/navigation/tests, auth/session/mapping/reliability/validation/Supabase repositories, installed Expo notification APIs, Android source/merged manifests and existing persistence bootstrap/migration chain.

3. **Approved contract implemented:** owner-private intent, separate device permission, pure effective policy, explicit permission request, privacy-first OFF amendment, generic EN/VI content, stale-response isolation and one explicit-system-settings return refresh/reconcile. VERIFIED FROM SOURCE and VERIFIED FROM TEST EVIDENCE only.

4. **Migration/schema/RLS:** notification_preferences has user_id PK/default auth.uid()/FK auth.users ON DELETE CASCADE; two NOT NULL booleans default false; created_at/updated_at timestamps and existing update trigger. RLS SELECT/INSERT/UPDATE checks auth.uid(); UPDATE has USING and WITH CHECK. PUBLIC/anon/authenticated broad grants revoked before granting authenticated SELECT/INSERT/UPDATE. No delete/truncate grant, RPC, Edge Function or service-role production path.

5. **Mapping:** tripReminders -> TRIP_STARTING_SOON; itineraryReminders -> DAY_STARTING, PLACE_UPCOMING, LEAVE_SOON, LATE_RISK. T002 constants and candidate rules unchanged.

6. **Permission states:** unknown, granted, denied_requestable, denied_blocked, legacy_enabled, legacy_disabled. Durable intent, permission, effective policy, pending sync and session revocation are independent. Denial preserves durable intent but disables effective scheduling.

7. **Android requests:** API <33 never requests runtime POST_NOTIFICATIONS; it reads legacy enabled/disabled. API >=33 requests only after explicit successful ON persistence and requestable permission, with session guards and real T002 channel preparation before the dialog. No request on bootstrap, mount, ordinary resume, retry/load or reconcile. Blocked state offers explicit system settings. One ticket consumes one return refresh/reconcile.

8. **Repository:** validated owner response, no owner field in write payload, server auth.uid() default, owner-filtered update, missing row defaults OFF. One-attempt 10-second bounded transport; sanitized errors. Database applied only in isolated local Docker databases; not deployed to the app's configured Supabase backend.

9. **Eligibility:** pure policy exposes canSchedule, allowedTypes, diagnostic reason and presentationFor; projection supplies existing ReminderEligibility without editing T002. Actual ReminderScheduler and ExpoReminderNotificationRepository are used. OFF bypasses trip/route loading. Native calls are serialized so earlier dispatched work drains before newer enumeration. Opt-in input loading is bounded (61-ID overflow sentinel, <=60 detail RPCs); truncated input never reconciles. This bounded 1+N detail path remains a latency risk at unusually high owner trip counts; no high-volume performance claim is made.

10. **ON:** successful persistence -> permission query/request when allowed -> effective policy -> bounded reconcile. No optimistic scheduling on failed write. Denied intent remains ON while effective permission is OFF.

11. **OFF:** synchronous session-local false -> immediate native affected-type reconcile starts before remote save -> persist false. Failed save cannot restore local true through stale reads/remount/same-owner token refresh. Explicit retry handles pending persistence/native revocation. Unaffected types remain outside cancellation scope.

12. **EN/VI presentation:** static title only; no private itinerary body.

    | Type | EN | VI |
    | --- | --- | --- |
    | TRIP_STARTING_SOON | Your trip reminder is ready. | Nhắc nhở chuyến đi của bạn đã sẵn sàng. |
    | DAY_STARTING | You have an itinerary reminder today. | Bạn có một nhắc nhở lịch trình hôm nay. |
    | PLACE_UPCOMING | An itinerary activity is coming up. | Một hoạt động trong lịch trình sắp diễn ra. |
    | LEAVE_SOON | It may be time to leave for your next activity. | Có thể đã đến lúc bạn nên đi đến hoạt động tiếp theo. |
    | LATE_RISK | Your next itinerary activity may need attention. | Hoạt động tiếp theo trong lịch trình có thể cần bạn chú ý. |

13. **Stale user/account switch:** immutable session identity/expiry and abort guards surround reads, writes, permission requests and native dispatch. Old owner async results are discarded. Native operations already dispatched cannot be recalled, but no subsequent stale dispatch is allowed. A/B switch resets policy; no user A intent is consumed by B. Sign-out invalidation is not T004 native cleanup.

14. **Boundaries:** T003 only explicit consent/preference policy reactions and explicit system-settings return. No edit/sign-out/reboot/general-background orchestration (T004), geofence/ARRIVED (P7), or exact-alarm path. All 14 accepted T002 manifest entries match byte-for-byte, including scheduler hash be6441a4643f2a0f33020ec55016639baf8deb42b2341bc165295a6e423fbd3e. No Git/history operations used; no T002 evidence edited.

15. **Security/RLS tests:** local Docker full migration chain + SQL RLS PASS, exit 0. Final database tripwise_t003_20260914230441 simulates broad default grants, then verifies migration restricts them; owner select/insert/update, cross-owner spoof/reassignment/read/write denial, anonymous denial, missing owner, default false, duplicate creation, revocation, timestamp trigger and auth-user cascade. Marker NOTIFICATION_PREFERENCES_RLS_PASS. rls-final.log. No remote RLS or live-user claim.

16. **Policy/controller tests:** 7 focused T002/T003 suites, 97 tests PASS; additional Settings suite 7 tests PASS (EN/VI, Light/Dark, denied/blocked/retry, explicit switch dispatch and no mount action). Includes permission API <33/>=33, denial/no nag, failed persistence/OFF overlay, stale load/write/permission, real T002 scoped cancellation, native serialization and bootstrap no prompt. jest-focused.log and jest-settings.log.

17. **Full Jest:** 97 passed, 2 skipped, 0 failed suites (99 total); 1722 passed, 2 skipped, 0 failed tests (1724 total), exit 0. jest-full-closure.log. Skips are existing tests, not introduced to pass gates.

18. **Quality:** lint exit 0, 0 errors/9 warnings; typecheck exit 0; Expo Doctor 21/21 exit 0; expo install --check dependencies up to date exit 0. Authoritative logs: lint-closure.log, typecheck-closure.log, expo-doctor-retry.log, expo-install-check-retry.log. Initial Expo attempts exit 1 due sandbox EACCES; successful retries used network permission. No dependency/package edits.

19. **Android build:** gradlew.bat :app:assembleDebug PASS exit 0, 1m32s, 387 tasks (25 executed/362 up-to-date), android-build-retry.log. First attempt exit 1 because sandbox denied Gradle download; retry succeeded. No clean/prebuild/native regeneration. This does not prove current JavaScript executes on-device.

20. **Android T003 runtime:** NOT RUN / INSUFFICIENT EVIDENCE. adb devices has no connected emulator or physical device. No model/API/version, permission grant/deny, native T003 content, preference persistence or actual OFF cancellation is claimed observed. See ANDROID-ACCEPTANCE-PLAN.md for exact remaining evidence. Do not substitute Jest for native proof.

21. **Exact-alarm/privacy:** source and merged debug manifests each have 0 SCHEDULE_EXACT_ALARM/USE_EXACT_ALARM matches. POST_NOTIFICATIONS is present in merged manifest. Static generic-copy/opaque-metadata audits and Proxy privacy tests PASS; no sensitive candidate fields read by presentation. Secret-pattern scan of evidence found zero JWT/private-key patterns. Actual native T003 request audit remains unproven. See privacy-exact-alarm-audit.md and manifest-audit.txt.

22. **Roadmap:** unchanged. T002 remains completed; T003/S001/checklist remain unchecked. T004/P7/parent P6 untouched. roadmap-excerpt.txt.

23. **Exact files changed:** 25 source/test/migration/runner paths listed in changed-files.txt, final hashes in source-hashes-final.txt; new evidence only in this T003-implementation-20260914 directory. Existing unrelated local changes preserved. Build/cache outputs are generated artifacts, not intentional source edits. No files deleted, no commit/push/reset/restore/clean/stash/discard.

24. **Migration created:** supabase/migrations/20260914000000_notification_preferences_t003.sql. Local isolated application/testing only; no remote deployment. No RPC/Edge/dependency changes. Isolated databases retained for inspection; none deleted.

25. **Remaining blocker:** connect an Android development emulator/device and complete real T003 grant/deny/persistence/private-native-content/revocation evidence against an authorized backend with this migration applied. The tripwise-runtime-closure evidence rule and user acceptance prevent closure on automated tests alone. STOP after T003; T004/P7 not started.
