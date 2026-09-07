from pathlib import Path
import hashlib
import json
import subprocess

root = Path.cwd()
e = root / '.runtime-evidence/p3-t001-exact-current'
def read(p):
    data = p.read_bytes()
    return data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')

# PowerShell redirection may produce UTF-16; preserve text verbatim as UTF-8.
for p in e.iterdir():
    if p.suffix in ('.log', '.txt', '.json'):
        p.write_text(read(p), encoding='utf-8', newline='\n')
for gate in ['lint','typecheck','focused-jest','full-jest','persistence','remote-apply','remote-migration-list']:
    assert read(e / f'{gate}-exit.txt').strip() == '0', gate
persist = read(e / 'persistence-raw.log')
assert persist.count('expense_ledger_contract_pass') == 2
assert 'upgrade_compatibility_pass' in persist and 'PERSISTENCE_TESTS_PASS' in persist
assert '35 passed, 35 total' in read(e / 'focused-jest-raw.log')
assert '516 passed, 517 total' in read(e / 'full-jest-raw.log')
assert '20/21 checks passed' in read(e / 'expo-doctor-raw.log')
remote = next(json.loads(line) for line in read(e / 'remote-migration-list-raw.log').splitlines() if line.startswith('{'))
for version in ['20260907010000','20260907020000']:
    assert any(row['local'] == version and row['remote'] == version for row in remote['migrations'])

p = root / 'phase_doc/PHASES_FEATURES.md'
s = p.read_text(encoding='utf-8')
s = s.replace('[ ] FEATURE-P3-T001', '[x] FEATURE-P3-T001')
s = s.replace('[ ] RLS theo owner, category/origin validation và pagination PASS.', '[x] RLS theo owner, category/origin validation và pagination PASS.')
s = s.replace('**Trạng thái:** NEEDS_FIX — corrective closure đang chờ exact-current gates.', '**Trạng thái:** COMPLETE — T001 corrective closure PASS; exact-current evidence: `.runtime-evidence/p3-t001-exact-current/REVIEWER_CLOSURE.md`. Android: NOT RUN — deferred to FEATURE-P3-T005.')
s = s.replace('24 Jest tests PASS; mobile test suite 66/67 PASS (505 tests pass, 1 skipped).', '35/35 focused Jest PASS; full Jest 66 suites PASS, 1 skipped (516 tests PASS, 1 skipped).')
needle = '- [x] Forward migration `20260907010000_expense_ledger_foundation.sql` đã apply cả local Docker (`freshDb` và `upgradeDb` PASS) và remote Supabase DEV.'
s = s.replace(needle, needle + '\n- [x] Corrective `20260907020000_expense_ledger_contract_corrective.sql`: strict JSON whitelist, update/delete trip binding, column-level audit protection; SECURITY INVOKER/RLS giữ nguyên. Fresh/upgrade expense regressions PASS; DEV chỉ apply migration mới, local/remote aligned.\n- [x] Exact-current lint PASS (0 errors, 12 warnings), typecheck PASS; Expo Doctor 20/21 accepted baseline (5 patch mismatches), dependencies không đổi.')
p.write_text(s, encoding='utf-8', newline='\n')

before = json.loads(read(e / 'source-hashes-before.json'))
after = []
changed = []
for row in before:
    p = root / row['path']
    assert p.is_file(), f'Missing original file: {p}'
    digest = hashlib.sha256(p.read_bytes()).hexdigest().upper()
    after.append({'path':row['path'],'sha256':digest})
    if digest != row['sha256']:
        changed.append(row['path'])
allowed = [
    'mobile/src/integration/remote/supabaseTripExpenseRepository.ts',
    'mobile/src/lib/supabase/database.types.ts',
    'mobile/tests/expense-ledger-contract.test.ts',
    'phase_doc/PHASES_FEATURES.md',
    'supabase/tests/persistence/expense_ledger_contract.sql',
    'supabase/tests/persistence/run.ps1',
    'supabase/tests/persistence/upgrade_verify.sql',
]
assert sorted(changed) == sorted(allowed), changed
migration = 'supabase/migrations/20260907020000_expense_ledger_contract_corrective.sql'
after.append({'path':migration,'sha256':hashlib.sha256((root/migration).read_bytes()).hexdigest().upper()})
(e/'source-hashes-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8')
(e/'changed-files.json').write_text(json.dumps({'modified':changed,'createdSource':[migration], 'evidenceFiles':sorted(p.name for p in e.iterdir())},indent=2),encoding='utf-8')
(e/'source-integrity.txt').write_text('SOURCE_SCOPE_PASS\nAll pre-existing files present. Only the seven listed scoped files changed.\nFoundation migration SHA256 unchanged: 5933F8376DF12904D01F847223BE416BA8959A13AC8B3A981779B8D5316697BD\nP1/P2 production source, migrations and regression tests unchanged.\nMobile package.json and lockfile unchanged; no dependency upgrades.\nMotion source unchanged; CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER.\n',encoding='utf-8')
(e/'worktree-after.txt').write_text(subprocess.check_output(['git','status','--porcelain=v1'],text=True),encoding='utf-8')
print('EVIDENCE_GATES_AND_SOURCE_SCOPE_PASS')
