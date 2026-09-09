# Final Evidence Index — FEATURE-P3-T003

## Task A: Source Stabilization & Focused Contracts
Path: `.runtime-evidence/p3-t003-exact-current/task-a/`
- `source-hashes-before.json`
- `source-hashes-after.json`
- `exact-files-changed.json`
- `lint-raw.log` & `lint-exit.txt` (exit: 0, 0 errors / 12 warnings)
- `typecheck-raw.log` & `typecheck-exit.txt` (exit: 0)
- `focused-jest-raw.log`, `focused-jest-exit.txt`, `focused-jest-totals.txt` (exit: 0, 147/147 PASS)
- `defect-resolution-summary.md` (all 14 inventory items resolved)
- `cache-behavior-summary.md` (states A through G satisfied)
- `remaining-blockers.md`

## Task B: Authoritative Persistence & Live Provider Smoke
Path: `.runtime-evidence/p3-t003-exact-current/task-b/`
- `task-a-source-hashes-current-before.json` & `task-a-source-match-before.txt` (`TASK_A_SOURCE_MATCH=True`)
- `persistence-raw.log` & `persistence-exit.txt` (exit: 0)
- `persistence-markers.txt` (`fresh_contract_pass`, `upgrade_compatibility_pass`, `PERSISTENCE_TESTS_PASS`, `trip_fx_context_contract_pass`)
- `provider-smoke-sanitized.json` & `provider-smoke-summary.md` (HTTP 200, 8 currencies, exact USD=1, EUR->VND cross-rate fresh)
- `provider-rights-recheck.md` (`PROVIDER_RIGHTS_RECHECK_PASS`)
- `remote-migration-list-raw.log` & `remote-migration-list-exit.txt` (exit: 0, aligned through `20260907083901`)
- `task-a-source-hashes-current-after.json` & `task-a-source-match-after.txt` (`TASK_A_SOURCE_MATCH_AFTER=True`)
- `TASK_B_CLOSURE.md`

## Task C: Full Suite Quality & Roadmap Acceptance
Path: `.runtime-evidence/p3-t003-exact-current/task-c/`
- `source-match-before.txt` (`TASK_C_SOURCE_MATCH_BEFORE=True`)
- `focused-test-source-binding.json`
- `full-jest-raw.log`, `full-jest-exit.txt`, `full-jest-totals.txt` (exit: 0, 69/70 suites passed, 1 skipped; 708 passed, 1 skipped)
- `expo-doctor-raw.log` & `expo-doctor-exit.txt` (exit: 1, 20/21 checks passed, matching accepted baseline)
- `final-active-provider-audit.md` (ExchangeRateFxRepository active; legacy RBA transport 0 occurrences)
- `security-performance-audit.md` (zero secrets, zero private leaks, owner isolation, coalescing, LRU)
- `task-c-source-match-after.txt` & `task-c-source-hashes-after.json` (`TASK_C_SOURCE_MATCH_AFTER=True`)
- `final-evidence-index.md`

Root Closure Document:
- `.runtime-evidence/p3-t003-exact-current/REVIEWER_FINAL_CLOSURE.md`
