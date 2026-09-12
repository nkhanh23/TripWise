# FEATURE-P5-T004 remote runtime evidence — 2026-09-11

## 1. Final status

`NEEDS_FIX` — remote privilege contract fails. Evidence-only execution stopped before test identities or trip creation. No implementation corrective was performed.

## 2. Explicit authorization

The user explicitly stated in the current conversation:

> Tôi cho phép deploy migration T004 lên linked Supabase hiện tại; tạo và mutate disposable remote test identities/data; chạy bounded authenticated runtime evidence; và cleanup disposable data của lượt kiểm chứng này.

## 3. Target

Local `supabase/.temp/project-ref` and live `supabase projects list --output json` agree: `bvblyrzbkyhcreimuumu`, project name `TripWise`, region `ap-northeast-1`, status `ACTIVE_HEALTHY`, linked=true. No project switch. CLI commands used the linked target.

## 4. Source hash preflight

`source-hash-comparison.json`: real Get-FileHash SHA256 of all 10 files matches the accepted manifest, including migration, tripRefresh, errors, reliability, remote repositories, database types and focused tests. Full paths were explicitly enumerated from the accepted FINAL_REPORT file list; hashes were extracted from the manifest and compared in that list order, not resolved from its truncated display paths. Repeated after remote inspection with all matches true. No production source changes.

## 5. Migration

Before deployment, authoritative migration list had all prior local versions present remotely and only 20260911000000 absent. `db push --linked --skip-vault --dry-run` reported only `20260911000000_apply_trip_refresh_atomic.sql`, no seeds/roles. Applied via normal `db push --linked --skip-vault --yes` workflow. `migration-deploy.txt` records success; `migration-after.txt` confirms remote version 20260911000000. Migration remains applied. No history repair, reset, partial SQL deployment or Vault changes.

## 6. Remote RPC/security finding

VERIFIED FROM LIVE PROVIDER, via read-only catalog queries:

- public.apply_trip_refresh(jsonb) exists; authenticated EXECUTE=true; anon EXECUTE=false; SECURITY DEFINER=false (SECURITY INVOKER).
- Idempotency table exists and RLS is enabled.
- Own-row SELECT policy is scoped by owner_id = auth.uid(). This is catalog evidence, not a completed two-user runtime test.
- **FAIL:** authenticated INSERT=true, UPDATE=true, DELETE=true, TRUNCATE=true.
- Actual ACL: authenticated=arwdDxtm/postgres.
- Remote public-schema table default ACL for postgres includes authenticated=arwdDxtm/postgres.
- The migration revokes table privileges from public and anon, then grants SELECT to authenticated, but never revokes the pre-existing default grants from authenticated.

Evidence: `security-privileges.txt`, `security-confirmation.txt` (default ACL), `security-acl-rls.txt` (second effective privilege check and policy). The multi-statement confirmation command returned only its final result; earlier statements in that invocation are not claimed as captured evidence. A separate single-statement query captured ACL/RLS.

This is a reproducible deployed privilege defect, not an access/environment blocker. SELECT-only RLS limits ordinary row writes; the finding does not establish an exploited PostgREST cross-user write. No destructive privilege test was attempted. Private-schema PostgREST exposure and TW015–TW021 runtime behavior were NOT RUN because execution stopped at this failed security gate.

## 7–16. Runtime checks

Disposable identities/trip: NOT CREATED. Proposal zero-write, owner confirm, baseline/final revision, authoritative reread comparison, durable duplicate confirmation, stale revision, cross-user isolation, non-scheduling provenance, and optional no-op: NOT RUN after security gate failed. No fake provider data. Retry identity instrumentation was not run; accepted local test evidence was not promoted to remote evidence.

## 17. Mutation accounting

| Operation | Count |
|---|---:|
| Authoritative trip reads | 0 |
| Proposal generations | 0 |
| Logical apply_trip_refresh RPC calls | 0 |
| Effective refresh mutations | 0 |
| Duplicate confirmations | 0 |
| Stale attempts | 0 |
| Cross-user attempts | 0 |
| Workspace revision advances | 0 |
| Test identities/trips created | 0 |
| Migration deployments | 1 |
| Remote migration-history reads | 2 |
| Live project-list reads | 1 |
| Read-only security query invocations | 3 |
| Migration dry-runs | 1 |

RPC calls and graph mutations are separate; catalog/history reads are not authoritative trip reads.

## 18. Cleanup

Not applicable: no disposable users, trips or idempotency rows were created. No cleanup failures. Migration intentionally retained, as required. No unrelated data was modified.

## 19. Evidence directory

`.runtime-evidence/p5-t004-remote-runtime-closure-20260911/`. Artifacts contain sanitized project identity, hashes, migration state and catalog metadata only. No credentials, tokens, JWT bodies or service-role keys were printed or saved.

## 20. Roadmap, checks and limitations

Only T004 status prose updated to acknowledge existing atomic implementation and remote security failure. P5, T004, T004-S001, idempotency/conflict/no-silent-mutation checklist, and T005 remain unchecked. See `roadmap-excerpt.txt`.

No full local gate rerun: source hashes unchanged and only evidence/docs modified. Accepted local evidence remains historical local verification, not remote closure. The accepted report records Expo Doctor 20/21, exit 1 baseline; this run does not claim Doctor PASS.

Files changed: this new evidence directory and T004 prose in phase_doc/PHASES_FEATURES.md. No new migration file or endpoint created. Existing migration deployed. No scalability implementation changes; no large-table/user-data scans or provider calls were used.

Next single suggested task: reviewer-approved forward-only T004 idempotency privilege corrective, including a regression check reproducing remote default ACLs, before resuming remote closure. Do not edit the already-applied migration as a substitute.

`FEATURE-P5-T005 NOT STARTED`
