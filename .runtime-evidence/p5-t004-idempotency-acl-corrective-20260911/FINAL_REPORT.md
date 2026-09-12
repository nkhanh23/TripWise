# FEATURE-P5-T004 — Forward-only idempotency ACL corrective

## 1. Final status

`ACL_CORRECTIVE_VERIFIED — REMOTE SELECT-ONLY CONTRACT PASS`.
T004 functional remote runtime closure remains pending. No remote users/trips created, no apply_trip_refresh functional calls, and no duplicate/stale/cross-user smoke in this corrective.

## 2. Root cause confirmed

Original evidence: `../p5-t004-remote-runtime-closure-20260911/FINAL_REPORT.md`, `security-acl-rls.txt` and `security-confirmation.txt`.
Fresh before-query in `remote-acl-before.json` confirms authenticated=arwdDxtm/postgres, including MAINTAIN on PostgreSQL 17.6. Table creation inherited broad project default ACLs; original migration revoked public/anon but not authenticated.

## 3–6. Forward migration and scope

Created through `supabase migration new harden_trip_refresh_idempotency_acl` after inspecting current migration order (last version 20260911000000):

`supabase/migrations/20260911161103_harden_trip_refresh_idempotency_acl.sql`

SHA-256: `0AFED0B5937C6918540F080B19704F03CC714C603CF7689AEF06476DA365C0F8`

Exact corrective SQL:

```sql
revoke all privileges
on table public.trip_refresh_apply_idempotency
from authenticated;

grant select
on table public.trip_refresh_apply_idempotency
to authenticated;
```

Original deployed migration was untouched: SHA-256 remains `17791E4C06DB629497FA3B6059EB406BF45D67C738577FF84C0FDE61E7102E9B`.
No RPC algorithm, adapter, DTO, hash, CAS, lock order, retry policy, rows, trigger or RLS policy changes. Global default privileges are outside T004 table scope and were not changed remotely. Before/after catalog comparison verifies they are identical. The only ALTER DEFAULT PRIVILEGES statement added is database-local test setup inside the disposable harness database.

## 7. Local effective ACL and direct-write regression

`trip_refresh_apply_contract.sql` now enumerates server-supported table privileges with aclexplode(acldefault(...)) and asserts has_table_privilege for authenticated is true only for SELECT. This includes INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER and, where supported, MAINTAIN. Anon effective privileges are all false; PUBLIC ACL grants are absent. RLS, owner SELECT policy and public RPC SECURITY INVOKER/EXECUTE assertions are retained/extended.

Authenticated INSERT, UPDATE and DELETE attempts must raise insufficient_privilege. UPDATE/DELETE target a real durable row created by the RPC, which remains unchanged afterward. Existing success, durable duplicate, no-op, conflict and rollback contracts still pass. Owner can SELECT its RPC row; user B cannot SELECT that trip's idempotency rows. These are local database tests, not remote user smoke. No destructive TRUNCATE test.

## 8. Remote-default-ACL reproduction

`trip_refresh_default_acl_regression.ps1` creates `tripwise_refresh_default_acl` in the disposable persistence container. It applies history through the original T004 migration, first granting broad authenticated default table ACL immediately before T004 creates its table. It verifies effective INSERT/UPDATE/DELETE/TRUNCATE were inherited before corrective, applies the forward migration, then runs the complete T004 SQL contract. Normal fresh/upgrade chains are unchanged and still run in addition to this regression.

Markers in `persistence-markers.txt`:

- trip_refresh_remote_default_acl_defect_reproduced
- trip_refresh_remote_default_acl_corrective_pass
- trip_refresh_effective_acl_pass (three database paths)
- trip_refresh_direct_insert_update_delete_denied_pass (three database paths)

## 9–14. Fresh gates

| Gate | Actual result | Exit |
|---|---|---:|
| Complete persistence harness | PERSISTENCE_TESTS_PASS, including concurrency and scratch ACL regression | 0 |
| Fresh chain | FRESH_PERSISTENCE_CHAIN_PASS | part of persistence exit 0 |
| Upgrade chain | UPGRADE_PERSISTENCE_CHAIN_PASS | part of persistence exit 0 |
| Focused T004 Jest | 66 passed | 0 |
| Full Jest | 85 suites passed, 1 skipped; 1438 tests passed, 1 skipped | 0 |
| Lint | 0 errors, 9 existing warnings | 0 |
| Typecheck | PASS | 0 |
| Expo Doctor | 20/21, same five package patch-version mismatch category | 1 |

Doctor classification: `20/21 — EXIT 1 — EXISTING PATCH-MISMATCH CATEGORY; NO P5-T004 DEPENDENCY CHANGE`. Do not call this an exact matching baseline or Doctor PASS: upstream expected versions increased since the accepted bundle, although installed versions and the five affected packages are unchanged.

| Package | Prior expected | Current expected | Installed (unchanged) |
|---|---|---|---|
| expo | ~57.0.21 | ~57.0.22 | 57.0.18 |
| expo-asset | ~57.0.16 | ~57.0.17 | 57.0.15 |
| expo-dev-client | ~57.0.18 | ~57.0.19 | 57.0.16 |
| expo-font | ~57.0.3 | ~57.0.4 | 57.0.2 |
| expo-secure-store | ~57.0.3 | ~57.0.4 | 57.0.2 |

Raw output and exact exits are saved per gate. Dependency files and core T004 sources were not edited. No Android run: this table-ACL corrective does not change native/mobile implementation. Local harness uses PostgreSQL 16; remote catalog validation additionally verifies PostgreSQL 17 MAINTAIN is denied.

## 15–17. Authorized remote deployment

User explicitly authorized linked T004 deployment/testing earlier and explicitly continued that authorization for this corrective. Target rechecked: TripWise, `bvblyrzbkyhcreimuumu`, `ap-northeast-1`, ACTIVE_HEALTHY, linked=true (`remote-target.json`). Ref equality and final file hashes were checked before deployment.

Dry-run: `supabase db push --linked --skip-vault --dry-run`, exit 0; exactly one pending migration, 20260911161103_harden_trip_refresh_idempotency_acl.sql. No unrelated migrations, seeds, roles or Vault changes.
Deploy: `supabase db push --linked --skip-vault --yes`, exit 0. Migration tracking confirmed version 20260911161103 remotely (`remote-migration-history.json`). No manual standalone remote REVOKE, history repair, rollback or reset.

## 18–21. Remote effective matrix and security conclusion

VERIFIED FROM LIVE PROVIDER via read-only catalog query (`remote-acl-check.sql`, before/after JSON):

| authenticated privilege | Before | After |
|---|---|---|
| SELECT | true | true |
| INSERT | true | false |
| UPDATE | true | false |
| DELETE | true | false |
| TRUNCATE | true | false |
| REFERENCES | true | false |
| TRIGGER | true | false |
| MAINTAIN | true | false |

Actual final ACL: `{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,authenticated=r/postgres}`.
RLS enabled=true; same owner SELECT policy using owner_id=auth.uid(); anon has no table privilege; PUBLIC table grants absent. RPC authenticated EXECUTE=true, anon EXECUTE=false; public function remains SECURITY INVOKER. Project default ACLs are byte-identical before/after in captured comparison.

Conclusion is limited to the ACL corrective. It does not assert T004 remote functional runtime completion. No remote table rows were mutated by this task; only tracked privilege migration was applied. Local RPC-owned writes remain verified by the full SQL contracts. Durable rows are preserved by the ACL-only migration; no remote row-level functional proof was attempted per stop boundary.

## 22. Evidence and changed files

Directory: `.runtime-evidence/p5-t004-idempotency-acl-corrective-20260911/`.
Changed source/test/docs:

- New forward migration listed above.
- supabase/tests/persistence/trip_refresh_apply_contract.sql
- supabase/tests/persistence/trip_refresh_default_acl_regression.ps1 (new)
- supabase/tests/persistence/run.ps1 (additional regression path and explicit chain markers)
- phase_doc/PHASES_FEATURES.md (only T004 status prose; prior local prose change preserved in updated status)

Evidence includes source-hashes-final.json, raw/exit gate files, markers, target identity, dry-run/deploy/history, remote before/after matrix, remote-verification.txt, and roadmap excerpt. No secrets/tokens. Existing remote-runtime evidence directory preserved. No commit/push/reset/restore/clean/stash/discard.

How to test: run `powershell -ExecutionPolicy Bypass -File supabase/tests/persistence/run.ps1`; in mobile run `npm run lint`, `npm run typecheck`, `npm test -- --runInBand trip-refresh.test.ts`, `npm test -- --runInBand`, and `npx expo-doctor`. Remote check is read-only via the saved SQL file and linked CLI.

Scalability: no data scans in the corrective migration, no new queries/indexes/cache/provider costs in production. Revoke/grant changes only the table privileges. Default-ACL reproduction is isolated to a disposable database removed with the harness container.

## 23–24. Roadmap and stop

All remain unchecked: FEATURE-P5, FEATURE-P5-T004, FEATURE-P5-T004-S001, Idempotency/conflict/no-silent-mutation checklist, FEATURE-P5-T005. Status prose records local verification, original defect, forward deployment, SELECT-only verification and pending functional remote runtime evidence.

Next single suggested task: reviewer acceptance of this ACL corrective before a separately scoped functional remote-runtime closure.

`FEATURE-P5-T005 NOT STARTED`
