# T003 Android acceptance — NOT RUN

`adb-devices.txt` has no connected emulator/device. No permission, delivery or native T003 behavior is claimed verified. Android assemble is compile evidence only; a debug APK requires the current Metro JavaScript bundle.

Use an authorized test owner and an Android development build connected to the intended Supabase environment after the new migration has been applied through an approved deployment. This task applied it only to isolated local PostgreSQL databases, not the configured production/DEV application backend.

1. Record serial/model, Android release/API, initial app-level permission and channel state. Never infer permission from the preference switches.
2. Start app and mount Settings: zero notification permission dialogs, no scheduling. Capture defaults/persisted owner preferences separately.
3. Explicit trip toggle ON: prove successful owner preference write precedes channel preparation/request. API >=33 grants exactly one user-triggered prompt when requestable. API <33 queries legacy notifications-enabled status without runtime POST_NOTIFICATIONS request.
4. Grant: native enumerate only eligible mapped reminders from real owner data, generic private title, opaque metadata, no provider/place/location/auth content. Do not create fake production itinerary data.
5. Deny: durable intent stays true, effective canSchedule false, no schedule; normal mount/resume/retry must not reprompt. Repeated blocked denial exposes an explicit system-settings action.
6. OFF: record synchronous local false and native affected-type cancellation beginning before remote save finishes. Verify unrelated category retained. With transport unavailable, false survives remount/stale remote reads and explicit retry persists false.
7. Explicitly open system settings, change permission, return: exactly one read/reconcile, no prompt. Ordinary resume without this ticket does neither.
8. A -> B, sign-out during pending permission/persistence/native enumeration: no stale response enables B or initiates a native mutation after invalidation. General sign-out cleanup remains T004.
9. Capture EN/VI + Light/Dark denied/blocked/retry switch states and accessibility semantics.
10. If visible delivery occurs label OS_MANAGED_INEXACT. No exact-alarm request. No reboot/background/geofence evidence is required here (T004/P7).

Do not mark T003 complete until these source/security/quality AND Android criteria have real evidence.
