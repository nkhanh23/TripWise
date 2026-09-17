1. Final status:
EVIDENCE_FIXTURE_INVALID

2. LIVE LOCAL files inspected
Yes

3. Real Auth result
PASS

4. Raw DB trip values
PASS

5. Calculated expected TRIP_STARTING_SOON trigger
1789578000000

6. Raw get_saved_trip_detail result
PASS

7. Raw confirmedAt exact representation
2026-09-16T07:02:08.138143+00:00

8. parseTripTimezone result
PASS

9. CONFIRMATION_TIMESTAMP_ACCEPTED YES/NO
YES

10. parseSavedTripDetail result
PASS (when days are present)

11. First failing parser condition if any
duration vs days.length (in previous tests, not with the correct fixture)

12. Parsed workspaceRevision
3

13. Parsed days count vs required duration
2 vs 2

14. ReminderEngine input
PASS

15. Resolved triggerAt
1789578000000

16. Trigger > now result
true

17. Trigger <= horizon result
true

18. Generated candidate count
3

19. Generated candidate type(s)
TRIP_STARTING_SOON, DAY_STARTING

20. Controller state after ON
N/A

21. Controller error after ON
N/A

22. Reconcile result
N/A

23. Native list result
N/A

24. Exact root-cause classification
PREVIOUS_EVIDENCE_FIXTURE_DEFECT

25. Production defect discovered YES/NO
NO

26. Production file requiring correction if YES
None

27. Cleanup result
PASS

28. Zero source drift
PASS

29. Evidence bundle path
mobile/.runtime-evidence/T003-T002-rootcause-20260916-140109

30. Aggregate SHA-256
D0BC0EA88E7FDA4623A933548CD97A4B738AFA1A367D3EEF7F0ED68F1D218BA2

31. Remaining blocker
None
