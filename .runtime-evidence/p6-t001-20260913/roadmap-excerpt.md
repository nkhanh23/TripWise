
#### [ ] FEATURE-P6-T001 — Trip Progress State Engine

**Trạng thái:** LOCAL FOUNDATION IMPLEMENTED — event lifecycle ghi atomic qua trigger, identity theo item/revision server-owned; projection đếm scheduled/completed/skipped, không suy luận ARRIVED hoặc timezone điểm đến. Local persistence fresh/upgrade, owner/transition/idempotency/concurrency và timezone tests PASS. Chưa deploy/verify remote P6: `INSUFFICIENT_EVIDENCE — REMOTE P6 PROGRESS PERSISTENCE NOT VERIFIED`. T001/S001/checklist giữ unchecked; FEATURE-P6-T002 NOT STARTED. Evidence: `.runtime-evidence/p6-t001-20260913/REVIEW.md`.

- [ ] FEATURE-P6-T001-S001 — Persist progress event/state idempotent theo itinerary lifecycle.

##### Checklist hoàn thành

- [ ] Cô lập owner, transition và kiểm thử timezone PASS.

#### [ ] FEATURE-P6-T002 — Reminder Engine

- [ ] FEATURE-P6-T002-S001 — Schedule `TRIP_STARTING_SOON`, `DAY_STARTING`, `PLACE_UPCOMING`, `LEAVE_SOON`, `LATE_RISK`.

##### Checklist hoàn thành

- [ ] Dedupe, cancel/reconcile và bằng chứng Android native PASS.

#### [ ] FEATURE-P6-T003 — Smart Notification Policy

- [ ] FEATURE-P6-T003-S001 — Triển khai consent/preferences/revocation policy private.

##### Checklist hoàn thành

- [ ] Permission privacy và policy không chứa content nhạy cảm PASS.

#### [ ] FEATURE-P6-T004 — Runtime lifecycle notification

- [ ] FEATURE-P6-T004-S001 — Xác minh lifecycle notification khi edit/sign-out/reboot/background.

##### Checklist hoàn thành

- [ ] Bằng chứng delivery/cancellation trên Android vật lý PASS.

