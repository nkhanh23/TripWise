# FINAL REPORT EXACTLY

1. Final status:
LOCAL_STACK_MIGRATION_STATE_MISMATCH

2. LIVE LOCAL files inspected:
mobile/.env, mobile/test_auth.js, mobile/src/integration/remote/supabaseNotificationPreferencesRepository.ts

3. Backend target identity:
localhost:54321, project_ref: bvblyrzbkyhcreimuumu

4. Auth/repository same-stack result:
YES

5. Same-stack migration/schema result:
YES (after running `npx supabase migration up`)

6. PostgREST schema visibility:
Includes public.notification_preferences

7. Controlled Auth result:
SUCCESS (diag user created)

8. Raw read result:
{ data: null, error: null, status: 200 }

9. Exact raw read PostgREST error code/status:
null / 200

10. Raw upsert result:
SUCCESS

11. Raw update result:
SUCCESS

12. Exact production getOwn result:
{ success: true, data: { tripReminders: true, itineraryReminders: false }, getSessionIdentical: true }

13. Production getOwn IntegrationError code if failed:
N/A

14. Exact production saveOwn result:
{ success: true, data: { tripReminders: true, itineraryReminders: false } }

15. Durable reload result:
{ success: true, data: { tripReminders: true, itineraryReminders: false } }

16. Partial-patch result:
{ success: true, data: { tripReminders: true, itineraryReminders: true } }

17. Owner B isolation:
{ success: true, data: { tripReminders: false, itineraryReminders: false } }

18. Session guard evidence:
Identical session: PASS
Expired session: PASS (caught by guard)
Aborted signal: PASS (caught by guard)

19. Root-cause classification:
LOCAL_STACK_MIGRATION_STATE_MISMATCH

20. Production defect discovered YES/NO:
NO

21. Cleanup result:
SUCCESS

22. Durable files changed:
None

23. Evidence bundle path + aggregate SHA-256:
mobile/.runtime-evidence/T003-same-stack-postgrest-1
SHA256: DCE80BCB21FFBC367CF7ACE13093844420AC4676569B57DEE92DB4ABA76E72D5

24. Remaining blocker:
None
