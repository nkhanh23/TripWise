from pathlib import Path
import hashlib, json, subprocess

root = Path.cwd()
e = root / '.runtime-evidence/p3-t002-exact-current'
def read(p):
    b=p.read_bytes()
    return b.decode('utf-16' if b.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig')
for p in e.iterdir():
    if p.suffix in ('.log','.txt','.json'):
        p.write_text(read(p),encoding='utf-8',newline='\n')
for gate in ['lint','typecheck','focused-jest','full-jest','persistence','remote-apply','remote-migration-list']:
    assert read(e/f'{gate}-exit.txt').strip()=='0',gate
assert '45 passed, 45 total' in read(e/'focused-jest-raw.log')
assert '561 passed, 562 total' in read(e/'full-jest-raw.log')
assert '20/21 checks passed' in read(e/'expo-doctor-raw.log')
persistence=read(e/'persistence-raw.log')
for marker in ['expense_ledger_contract_pass','expense_strict_keys_trip_binding_audit_pagination_pass','expense_aggregate_contract_pass','expense_aggregate_bounded_plan_pass']:
    assert persistence.count(marker)==2,marker
assert 'upgrade_compatibility_pass' in persistence and 'PERSISTENCE_TESTS_PASS' in persistence
remote=next(json.loads(s) for s in read(e/'remote-migration-list-raw.log').splitlines() if s.startswith('{'))
for version in ['20260907010000','20260907020000','20260907030000']:
    assert any(x['local']==version and x['remote']==version for x in remote['migrations'])
roadmap=root/'phase_doc/PHASES_FEATURES.md'
s=roadmap.read_text(encoding='utf-8')
s=s.replace('[ ] FEATURE-P3-T002','[x] FEATURE-P3-T002').replace('[ ] Decimal/accounting, N+1 và contract aggregate PASS.','[x] Decimal/accounting, N+1 và contract aggregate PASS.')
needle='- [x] FEATURE-P3-T002-S001 — Server-side aggregation và category breakdown.'
s=s.replace(needle,needle+'\n\n**T002 COMPLETE:** Original-currency PostgreSQL numeric aggregation, currency/category/day pages 1..50, exact decimal-string transport; daily attachment → UTC spent date → unassigned. Fresh/upgrade accounting, RLS và N+1/query-plan audit PASS. Focused Jest 45/45, full Jest 561 PASS + 1 skipped, lint/typecheck PASS, Expo Doctor 20/21 accepted baseline. DEV `20260907030000` aligned. Evidence: `.runtime-evidence/p3-t002-exact-current/REVIEWER_CLOSURE.md`. Android NOT RUN — deferred to FEATURE-P3-T005. Không FX/Budget Risk; T003 chưa bắt đầu.')
roadmap.write_text(s,encoding='utf-8',newline='\n')
before=json.loads(read(e/'source-hashes-before.json'))
after=[]; changed=[]
for row in before:
    p=root/row['path']; assert p.is_file(),row['path']
    digest=hashlib.sha256(p.read_bytes()).hexdigest().upper()
    after.append({'path':row['path'],'sha256':digest})
    if digest!=row['sha256']: changed.append(row['path'])
assert sorted(changed)==sorted(['mobile/src/lib/supabase/database.types.ts','supabase/tests/persistence/run.ps1','phase_doc/PHASES_FEATURES.md']),changed
created=['supabase/migrations/20260907030000_expense_aggregate.sql','supabase/tests/persistence/expense_aggregate_contract.sql','mobile/src/integration/expenseAggregate.ts','mobile/src/integration/remote/supabaseTripExpenseAggregateRepository.ts','mobile/tests/expense-aggregate-contract.test.ts','docs/05-engineering/expense-aggregate-contract.md']
for path in created:
    after.append({'path':path,'sha256':hashlib.sha256((root/path).read_bytes()).hexdigest().upper()})
(e/'source-hashes-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
(e/'migration-hash.txt').write_text(after[-6]['sha256']+'  '+created[0]+'\n',encoding='utf-8')
(e/'changed-files.json').write_text(json.dumps({'modified':changed,'created':created},indent=2),encoding='utf-8')
(e/'source-integrity.txt').write_text('SOURCE_SCOPE_PASS\nEvery pre-existing captured file still present. Only database.types.ts, persistence/run.ps1 and roadmap changed among captured files.\nBoth applied T001 migration hashes, T001 CRUD/parser/repository/tests, P1/P2 production source and tests, motion source, package.json and lockfile unchanged.\nNew T002 files separately hashed in after manifest.\n',encoding='utf-8')
plan=[]; capture=False
for line in persistence.splitlines():
    if 'EXPENSE_AGGREGATE_EXPLAIN_BEGIN' in line: capture=True
    if capture: plan.append(line)
    if 'EXPENSE_AGGREGATE_EXPLAIN_END' in line: capture=False
(e/'query-plan-raw.txt').write_text('\n'.join(plan)+'\n',encoding='utf-8')
(e/'accounting-exactness.txt').write_text('\n'.join(x for x in persistence.splitlines() if 'ACCOUNTING_EXACTNESS' in x)+'\nAdditional SQL assertion: 9999999999.99 + 9999999999.99 = 19999999999.98. numeric(24,2) max and overflow casting tested; not a trillion-row load fixture.\n',encoding='utf-8')
(e/'worktree-after.txt').write_text(subprocess.check_output(['git','status','--porcelain=v1'],text=True),encoding='utf-8')
print('T002_GATES_REMOTE_AND_SOURCE_SCOPE_PASS')
