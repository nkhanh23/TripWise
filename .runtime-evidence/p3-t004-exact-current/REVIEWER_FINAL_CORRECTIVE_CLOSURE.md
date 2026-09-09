# FEATURE-P3-T004: FINAL FINANCIAL EXACTNESS CORRECTIVE CLOSURE

Date: 2026-09-08
Task: `FEATURE-P3-T004 — Budget Risk`
Subtask: `FEATURE-P3-T004-S001 — Tạo deterministic budget-risk signal không tự tăng ngân sách`
Acceptance Criteria: `Rule risk, suggestion an toàn và privacy PASS`
Status: **FORMALLY ACCEPTED (FINAL)**

> [!IMPORTANT]
> This document explicitly **SUPERSEDES** all prior T004 closure documents:
> - `REVIEWER_CLOSURE.md` (superseded)
> - `REVIEWER_CORRECTIVE_CLOSURE.md` (superseded)

---

## 1. EXACT DEFECTS RESOLVED

1. **Defect A — Full-Range Exact Basis Points String Representation**:
   - `fractionOfBudgetBasisPoints` updated from `number` to `string`.
   - Formatted as canonical non-negative base-10 integer string without leading zero (except `"0"`).
   - Computed purely via BigInt: `((spend.realized * 10000n) / budgetMinor).toString()`.
   - Never converts through JavaScript `Number` or IEEE 754 floating point.
   - Exact over the entire accepted T002/T004 monetary input range up to `numeric(24, 2)`.
   - Unclamped: May exceed `"10000"` when over budget (e.g. 200% = `"20000"`).

2. **Defect B — 2-Decimal Accounting FX Conversion vs Display Rounding**:
   - Implemented T004-specific `convertToAccountingCents(sourceAmountDecimal, rateString)`.
   - Performs half-up rounding to exact 2-decimal accounting minor units (cents) using BigInt integer arithmetic:
     `((absSource * rateInt * 2n + denominator) / (denominator * 2n))`
   - Does NOT round through 0-decimal display conventions (e.g. `VND`, `JPY`, `KRW`).
   - T003 `convertFx` remains in `fxConversionsApplied` for display and provenance logging, but budget risk arithmetic uses `convertToAccountingCents`.
   - Verified that exact fractional cents are preserved for USD/EUR conversions into VND, JPY, and KRW.

3. **Expo Doctor Baseline & Exit Code Clarification**:
   - Recorded actual command output: `20/21 checks passed (1 check failed: patch version mismatches; process exit code: 1)`.
   - Documented honestly without modifying dependencies.

4. **Reviewer-Readable UTF-8 Evidence**:
   - Generated fresh UTF-8 plain-text log files for all quality gates:
     - `focused-jest-final-utf8.log`
     - `full-jest-final-utf8.log`
     - `lint-final-utf8.log`
     - `typecheck-final-utf8.log`
     - `expo-doctor-final-utf8.log`
     - `persistence-final-utf8.log`

---

## 2. SOURCE HASH BINDING

### Before Final Edits (`final-exactness-source-hashes-before.json`)
* `budgetRiskContract.ts`: `9465329324915F2A2DA2692EC46C374846C21FC3FAD5C78367DEDEF0A13D0426`
* `budgetRiskService.ts`: `0F3EB0F49C5C9222586983F6A9CDB3687E16FB1223E838E2568601EDD8C6904D`
* `budget-risk-contract.test.ts`: `414052D43E3DDA1C3E3D3E15965B42938C0A83C4F81C5FEC88FA90A5406149F0`
* `budget-risk-service.test.ts`: `743EED04B1C25F1838DF5263228D81DA3FB4DA8B8FE894DBF7A82AD95F2678B1`

### After Final Edits (`final-exactness-source-hashes-after.json`)
* `budgetRiskContract.ts`: `CEF0FC7D954D2C4B02C6C75B35C8E8551B8C4E2F82EA3DFE6377BEBA68FB9E72`
* `budgetRiskService.ts`: `0F3EB0F49C5C9222586983F6A9CDB3687E16FB1223E838E2568601EDD8C6904D`
* `budget-risk-contract.test.ts`: `17F2CDF02B1A0A8CA96270FACD5722B1CE1B5296DF6CFFC87D29402AA7135A11`
* `budget-risk-service.test.ts`: `0410AEEB1AB6B100D4413BF0580182FC6126C664CCBD1B9A77E6C529CB1F987B`

---

## 3. FRESH QUALITY GATES

1. **TypeScript Typecheck**:
   - Log: `typecheck-final-utf8.log`
   - Exit code: `0` (`typecheck-exit.txt`)
2. **ESLint**:
   - Log: `lint-final-utf8.log`
   - Exit code: `0` (`lint-exit.txt`) (0 errors, 12 pre-existing warnings in unrelated screens)
3. **Focused Jest Suite**:
   - Log: `focused-jest-final-utf8.log`
   - Exit code: `0` (`focused-jest-exit.txt`)
   - Totals: 2 test suites, 40 tests passed (`focused-jest-totals.txt`)
4. **Full Jest Suite**:
   - Log: `full-jest-final-utf8.log`
   - Exit code: `0` (`full-jest-exit.txt`)
   - Totals: 71 test suites passed, 1 skipped (`PAUSED_BY_USER`), 748 tests passed (`full-jest-totals.txt`)
5. **Expo Doctor Baseline**:
   - Log: `expo-doctor-final-utf8.log`
   - Exit code: `1` (`expo-doctor-exit.txt`)
   - Status: 20/21 checks passed (5 minor patch version mismatches; accepted baseline)
6. **Authoritative Persistence Harness**:
   - Log: `persistence-final-utf8.log`
   - Exit code: `0` (`persistence-exit.txt`)
   - Markers: T001, T002, T003 markers PASS, `upgrade_compatibility_pass`, `PERSISTENCE_TESTS_PASS`.

---

## 4. CONTRACT & RUNTIME STATUS

* **Database Migration**: None required.
* **Android Target**: `ANDROID = NOT RUN — DEFERRED TO FEATURE-P3-T005`.
* **Motion Status**: `CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`.
* **Roadmap Status**: `FEATURE-P3-T004` and `FEATURE-P3-T004-S001` marked `[x]`. Parent `FEATURE-P3` and sibling `FEATURE-P3-T005` remain `[ ]`.
