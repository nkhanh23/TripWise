# FEATURE-P6-T001 / S001 — reviewer evidence

## 1. Final status

LOCAL DOMAIN / PERSISTENCE FOUNDATION IMPLEMENTED. Local automated contract/security/timezone gates PASS. Not accepted/complete remotely. T001, S001, owner/transition/timezone checklist and parent P6 remain unchecked. FEATURE-P6-T002 NOT STARTED.

`INSUFFICIENT_EVIDENCE — REMOTE P6 PROGRESS PERSISTENCE NOT VERIFIED`

Formal input baseline: FEATURE-P5 = ACCEPTED / COMPLETE. No Git/GitHub operation, remote migration, deployment, native permission or notification operation was performed.

## 2. Existing lifecycle baseline found — VERIFIED FROM SOURCE

`contracts.ts` / `SavedTripItemBase.activityStatus` and the workspace controller already own scheduled/completed/skipped. The existing workspace repository sends one validated CAS RPC, single attempt. Controller conflict handling refreshes authoritative detail once without replaying the draft; stale-user generation guards remain unchanged.

`20260903000000_workspace_persistence_foundation.sql` owns the BEFORE status trigger, server timestamps, and AFTER revision bump. `20260903010000_workspace_owner_scoped_mutation_contract.sql` owns the status command/CAS and safe errors. `SavedTripDetail` has no authoritative destination timezone and does not expose lifecycle timestamps. No new timestamp fields are required on this existing read model.

P5 T004 remains schedule-only, one atomic RPC; its direct lifecycle writes remain forbidden. Settings notification switches remain preference-only. The existing date formatter uses device-local methods, so P6 deliberately does not consume it. Provider-local timezone facts from event intelligence/weather are not authoritative trip timezone data.

## 3. Exact files changed

New source/tests:

- `supabase/migrations/20260913000000_trip_progress_events.sql`
- `mobile/src/integration/tripProgress.ts`
- `mobile/src/integration/remote/supabaseTripProgressRepository.ts`
- `mobile/tests/trip-progress.test.ts`
- `mobile/tests/trip-progress-timezones.cjs`
- `supabase/tests/persistence/trip_progress_contract.sql`
- `supabase/tests/persistence/trip_progress_concurrency.ps1`
- `supabase/tests/persistence/trip_progress_legacy_seed.sql`
- `supabase/tests/persistence/trip_progress_legacy_verify.sql`

Modified:

- `mobile/src/integration/errors.ts`: maps new TW024 atomic sink failure to persistenceFailed.
- `mobile/src/lib/supabase/database.types.ts`: adds the new JSON RPC signature only.
- `mobile/tests/intelligence-freshness-policy.test.ts`: fixes the existing supersession test's implicit real clock using its existing nowProvider argument. The fixture expired on 12 September; the original test independently failed on 13 September. Production cache source is unchanged; no assertion was removed.
- `supabase/tests/persistence/run.ps1`: adds P6 contract, concurrency, legacy upgrade and broad-default-ACL checks.
- `phase_doc/PHASES_FEATURES.md`: adds local status/evidence note, no checkbox changes.

Evidence: files in this directory (logs, before/final hashes, gate manifest, roadmap excerpt, this report). No applied migration was edited. No file was deleted.

## 4. Canonical event/state contract

Authoritative fact: itinerary item's lifecycle status and server timestamps. `ProgressTransition` is a discriminated from/to pair, representing item became completed, became skipped, or returned to scheduled. No arbitrary UI event string.

Persisted identity: event UUID, tripId, itemId, positive server revision, server-derived idempotencyKey `itemId:revision`, fromStatus, toStatus, occurredAt. Storage additionally has created_at. No free-form payload, full snapshot, location, provider payload, reservation/contact content, owner field, or notification content.

Derived state: exact scheduled/completed/skipped counts per current day and their component-wise trip sum. Days are sorted by UUID using ordinal comparison, independent of locale or itinerary display order. Revision is supplied by server, or null for the frozen legacy graph. No percentage/status equates skipped with completed. `calendar = unavailable_timezone` is explicit.

## 5. Source of truth

Lifecycle mutation -> existing BEFORE validation/timestamp -> existing AFTER revision bump -> AFTER progress trigger -> commit together. The progress table never drives activity_status. Current projection reads the authoritative graph, not a replay of possibly incomplete historical events. Existing mobile write path is unchanged, with no second client progress write.

## 6. Persistence / RPC / trigger

One forward-only migration creates `trip_progress_events`, private `record_trip_progress` sink, revoked trigger function `record_itinerary_progress_transition`, and SECURITY INVOKER `read_trip_progress(jsonb)`.

Trigger name sorts after `itinerary_items_bump_workspace_revision`; the same item/trip transaction and locks are retained. Trigger runs only when actual status differs. New items, same-state updates, note/provider edits and schedule refresh do not create events. Every sink exception aborts the lifecycle mutation.

The migration guards the installed workspace function definition and adds only propagation of TW024 to its error handler, preserving the rest of the installed implementation. An unexpected/missing guard causes migration failure instead of silently replacing a changed implementation. Existing grants are preserved. Safe search_path and explicit function/table revocations are included.

Read request: `{tripId, kind: state}` or `{tripId, kind: events, limit?, beforeRevision?}`. SQL default page size 25, maximum 50, one lookahead row; client API requires explicit bounded limit. Unknown fields, malformed UUIDs, null/invalid cursors and invalid kinds are rejected.

## 7. Idempotency

The idempotency identity is SERVER-DERIVED, not a new client command key. Durable UNIQUE(trip_id, revision), plus CHECK(key = item_id || ':' || revision), prevents duplicate effective event identity. Private sink INSERT ON CONFLICT compares item/from/to/timestamp exactly; identical replay returns the stored UUID, differing payload raises TW023. No in-memory dedupe authority.

Ambiguous status transport retry retains the ORIGINAL accepted CAS behavior: old revision -> TW009, no second event. This does not promise a second success response for an old workspace command. Two duplicate concurrent lifecycle commands produce one committed event and one stale rejection. Clients cannot separately post progress payloads or select event timestamps.

## 8. Owner / RLS — VERIFIED FROM TEST EVIDENCE

Canonical read ownership: event -> trip -> trips.user_id -> auth.uid(). Canonical write authorization: existing item -> day -> trip owner RLS, followed by server-only trigger. trip_id on the event supplies historical trip scope and the actual trip/revision query key; no duplicate user_id/owner column.

| Case | Local result |
|---|---|
| Owner lifecycle transition + event read | PASS |
| Foreign item used in owner trip command | TW008, zero mutation/event |
| Foreign trip progress read | TW008 |
| Cross-user event SELECT | Zero visible rows |
| Anonymous RPC | Execute denied |
| Missing session auth.uid() | TW006 |
| Forged owner in lifecycle command | TW013 |
| Direct event INSERT / UPDATE / DELETE | Denied |
| Private sink EXECUTE from authenticated | Denied |
| Broad default table ACL at creation | PASS, direct writes still denied |
| Mobile expired/null session | Rejected before RPC |
| Mobile session switch during request | Stale response rejected |

Local SQL harness simulates roles/auth.uid; it does not establish real remote JWT expiry, Auth revocation, or remote RLS deployment. Those remain unverified. No service-role mobile path was added.

## 9. Transition matrix

| From | To | Result |
|---|---|---|
| scheduled | completed | Accept, event + server completed_at |
| scheduled | skipped | Accept, event + server skipped_at |
| completed | scheduled | Accept, append reversal; lifecycle timestamps cleared |
| skipped | scheduled | Accept, append reversal; lifecycle timestamps cleared |
| completed | skipped | TW012, zero event |
| skipped | completed | TW012, zero event |
| same | same | Existing workspace behavior retained, zero progress event |

## 10. Reversal

Append reversal with its server time/revision; prior events remain. Current counts reflect scheduled again. Explicit existing item/trip/account deletion cascades event rows, as documented by FKs; a reversal never deletes history.

## 11. Stale / failed mutations

Each transition test retries its previous revision and asserts unchanged event count. Invalid direct terminal transitions also leave count unchanged. Fault injection rejects the event INSERT and proves TW024 propagates, activity_status stays scheduled, revision stays unchanged, and no event persists. Explicit transaction rollback also leaves zero extra event.

## 12. Legacy compatibility

Upgrade harness creates real completed and skipped lifecycle facts immediately before P6 migration. After migration, both original server timestamp values are byte-for-byte/equality preserved, current counts remain 1 completed + 1 skipped, and event history is empty. No fabricated backfill times or fake events. Existing saved-trip APIs remain readable and unchanged.

## 13. Timezone contract

No authoritative trip timezone exists. T001 therefore derives lifecycle counts only; destination-local calendar state is unavailable. Pure reducer does not read Date.now, device timezone, location, provider data, schedule dates/times, or the network. Timestamp parser accepts validated ISO instants with explicit numeric offset/Z, rejects timezone-less or invalid calendar values, preserves fractional server precision, and orders events by revision rather than local time.

## 14. DST / calendar

UTC offset boundary, +14, -12 and date rollover timestamp cases PASS. Four distinct Node processes verify their actual timezone offsets and all three lifecycle projections (12 cases). Named New York timezone is ONLY a simulated device setting. No authoritative IANA timezone or destination calendar calculation was introduced; DST destination-local interpretation tests are NOT APPLICABLE, not fabricated PASS.

## 15. No ARRIVED

Event union accepts only four lifecycle pairs. ARRIVED values are rejected by tests. Reducer never reads location, schedule, route completion, foreground state or hidden clock. Completed remains explicit lifecycle action, not physical arrival.

## 16. No notification side effects

New repository performs only `read_trip_progress`; source imports contain no notification scheduler/permissions/native delivery modules. No UI consumer or polling is mounted. Existing Settings screen, activity controller and workspace write repository retain their initial hashes. Reminder types, consent, native lifecycle, geofencing and Context Engine were not implemented.

## 17. Performance / retention

- State: one per-trip grouped item/day query, no history read and no N+1 network calls. Existing indexes itinerary_days(trip_id), itinerary_items(itinerary_day_id), trips(user_id) remain in useable query paths.
- Event history: UNIQUE(trip_id,revision) supports bounded descending keyset reads; primary event UUID and item_id FK index support identity/deletion. No redundant idempotency-key index required because key is constrained to server identity.
- Pure graph projection: O(items), bounded to 60 days / 400 items per day; read-model validation rejects oversized graphs safely. Server aggregate has per-trip linear cost, not a whole lifetime event scan. Existing detail APIs are unchanged.
- Exactly one small row per accepted changed status; no polling writes, provider costs, timers, render loops or background execution. Reads have existing timeout/cancellation and at most two attempts; status CAS stays single-attempt.
- Explicit transition history can grow with real user actions. No destructive time-based retention duration invented; future product retention policy remains necessary if high-volume usage warrants it. Existing explicit deletion cascades apply.

## 18. Focused tests

`npm test -- --runInBand trip-progress.test.ts`: 62 passed, exit 0 (`focused.log`). Canonical validation, transition matrix, projection/reversal/legacy, offsets, request/page validation, safe errors, no clock, auth/stale/cancel and bounded single RPC included.

`node tests/trip-progress-timezones.cjs`: four real process timezones / 12 lifecycle cases PASS, exit 0 (`timezones.log`).

## 19. Fresh / upgrade

Complete current `supabase/tests/persistence/run.ps1`, exit 0 (`persistence.log`):

- FRESH_PERSISTENCE_CHAIN_PASS
- UPGRADE_PERSISTENCE_CHAIN_PASS
- trip_progress_owner_transition_idempotency_pass (fresh, upgrade and broad ACL DB)
- trip_progress_sink_failure_atomic_rollback_pass
- trip_progress_legacy_no_backfill_pass
- trip_progress_default_acl_matrix_pass
- PERSISTENCE_TESTS_PASS

Existing graph, workspace, move, direct-writer, expense, FX, T004 refresh/idempotency/ACL checks run as part of the unchanged complete harness plus additive P6 checks. No linked remote database is used by this harness, including markers containing the word remote.

## 20. Concurrency evidence

Two independent authenticated SQL jobs use the same original revision; assertions require exactly one SUCCESS and one TW009. Final count is five (four prior transition events plus precisely one race event). Marker: `trip_progress_concurrency_one_event_pass`. Private durable sink replay returns identical UUID; same identity with changed payload raises TW023 and unchanged count.

## 21. Full Jest

88 suites passed, 2 skipped; 1,559 tests passed, 2 skipped; exit 0 (`full-jest.log`). P5 deterministic constraints, route optimization, weather scheduling, trip refresh and explainable itinerary suites PASS. Workspace/editor/stale-user regressions PASS. Existing skipped remote/runtime suites are not evidence of remote success.

The first full run and isolated diagnostic exposed the existing expired-fixture clock dependency; `freshness-diagnostic.log` retains that failure. Only that test's clock was made explicit; the final full run passes with current source.

## 22. Lint / typecheck

Both exit 0. Lint: 0 errors, 9 warnings in existing unchanged UI files (`lint.log`); typecheck PASS (`typecheck.log`). No dependency changes.

## 23. Expo Doctor

Actual online execution: 20/21, exit 1 (`doctor.log`). Package mismatch check failed:

| Package | Expected | Found |
|---|---|---|
| expo | ~57.0.22 | 57.0.18 |
| expo-asset | ~57.0.17 | 57.0.15 |
| expo-dev-client | ~57.0.19 | 57.0.16 |
| expo-font | ~57.0.4 | 57.0.2 |
| expo-secure-store | ~57.0.4 | 57.0.2 |

Initial sandboxed npm attempt was blocked by registry EACCES; the requested Doctor gate was rerun with network permission. No packages were upgraded or exclusions added. Supabase CLI was unavailable locally and its discovery via npx was blocked; migration is hand-authored and validated by the complete Docker/psql harness.

## 24. Remote classification

`INSUFFICIENT_EVIDENCE — REMOTE P6 PROGRESS PERSISTENCE NOT VERIFIED`

No P6 remote migration/testing authorization was inferred from P5. No deployment, linked database mutation or remote auth smoke was attempted.

## 25. Android classification

`NOT REQUIRED FOR P6-T001 DOMAIN/PERSISTENCE FOUNDATION`

No new progress UI or native change. No Android notification evidence claimed.

## 26. Source hashes / evidence

`source-hashes.csv` identifies exact current source/tests/migrations/roadmap; `before-hashes.json` and `preserved-baseline.json` demonstrate preservation of the inspected Settings/controller/workspace repository. `freshness-before-hash.json` captures the test before its clock correction. `gates.json` records exact final exits/classifications. `roadmap-excerpt.md` is copied from current local.

Official security reference consulted: https://supabase.com/docs/guides/database/postgres/row-level-security (RLS plus grants; local execution, not the document alone, is the security evidence). Changelog markdown fetch was unsupported by web transport; no new Supabase SDK feature is used.

## 27. Exact roadmap / next task

- [ ] FEATURE-P6
- [ ] FEATURE-P6-T001
- [ ] FEATURE-P6-T001-S001
- [ ] Cô lập owner, transition và kiểm thử timezone PASS
- [ ] FEATURE-P6-T002 / S001
- [ ] FEATURE-P6-T003 / S001
- [ ] FEATURE-P6-T004 / S001

Previous phase: P5 ACCEPTED / COMPLETE. Current: P6-T001 local foundation awaiting remote evidence. Next suggested small task: explicitly authorized remote P6 migration/owner-RLS verification. No request for authorization is needed to review these local artifacts.

## 28. Stop boundary

`FEATURE-P6-T002 NOT STARTED`

## Reproduction

From repository root:

```powershell
powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1
cd mobile
npm run lint
npm run typecheck
npm test -- --runInBand trip-progress.test.ts
node tests/trip-progress-timezones.cjs
npm test -- --runInBand
npx expo-doctor
```
