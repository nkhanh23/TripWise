"""Capture complete merged UTF-8 process output and actual exits, outside runtime."""
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

repo = Path(__file__).resolve().parents[2]
out = Path(__file__).resolve().parent
focused = ['budget-validation', 'planner-generation', 'planner-persistence', 'CreateTripWizardScreen', 'StepBudgetGroup', 'TripExpensesScreen', 'useTripExpensesController', 'expense-aggregate-contract', 'budget-risk-contract', 'budget-risk-service', 'fx-contract', 'fx-repository']
gates = {
    'lint': ('mobile', ['cmd.exe', '/d', '/c', 'npm run lint']),
    'typecheck': ('mobile', ['cmd.exe', '/d', '/c', 'npm run typecheck']),
    'focused': ('mobile', ['cmd.exe', '/d', '/c', 'npm test -- --runInBand --verbose ' + ' '.join(focused)]),
    'full': ('mobile', ['cmd.exe', '/d', '/c', 'npm test -- --runInBand']),
    'expo-doctor': ('mobile', ['cmd.exe', '/d', '/c', 'npx expo-doctor']),
    'persistence': ('.', ['powershell.exe', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'supabase/tests/persistence/run.ps1']),
}
for name in sys.argv[1:] or gates:
    cwd, command = gates[name]
    started = datetime.now(timezone.utc).isoformat()
    env = {**os.environ, 'NO_COLOR': '1', 'FORCE_COLOR': '0', 'CI': '1', 'PYTHONIOENCODING': 'utf-8'}
    with (out / f'{name}-raw.txt').open('wb') as raw:
        p = subprocess.run(command, cwd=repo / cwd, env=env, stdout=raw, stderr=subprocess.STDOUT)
    (out / f'{name}-exit.txt').write_text(str(p.returncode) + '\n', encoding='utf-8')
    (out / f'{name}-process.json').write_text(json.dumps(dict(command=command, cwd=str(repo / cwd), started=started, ended=datetime.now(timezone.utc).isoformat(), exit=p.returncode), indent=2), encoding='utf-8')
    print(f'{name}: exit={p.returncode}', flush=True)
