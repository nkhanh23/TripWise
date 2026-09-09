# FEATURE-P3-T004: CORRECTIVE RISK / SUGGESTION SAFETY CLOSURE

Date: 2026-09-08
Task: `FEATURE-P3-T004 — Budget Risk`
Subtask: `FEATURE-P3-T004-S001 — Tạo deterministic budget-risk signal không tự tăng ngân sách`
Acceptance Criteria: `Rule risk, suggestion an toàn và privacy PASS`
Status: **ACCEPTED**

---

## 1. EXACT DEFECTS RESOLVED

1. **Defect 1 — Incomplete Data Emitting Confident Risk**:
   - Extended `BudgetRiskLevel` with `'unavailable'`.
   - When any required input is incomplete (missing FX quote, unavailable FX, unsupported currency, pagination limit exceeded), `riskLevel` immediately returns `'unavailable'` with `completeness: 'incomplete'` and explicit reason codes.
   - When risk is unavailable, no financial-control suggestions are emitted (suggestions array is strictly `[]`).
   - Stale FX (within 7-day TTL) continues to emit normal risk with `completeness: 'stale_fx'`.

2. **Defect 2 — Inferred Optional Activity Removal**:
   - Replaced negative condition with positive explicit eligibility: `optionalPaidActivityReviewEligible?: boolean` (defaults to `false`).
   - Category aggregates alone never produce `REVIEW_OPTIONAL_PAID_ACTIVITY` or `LOOK_FOR_FREE_ALTERNATIVE`.
   - Service hardwires `optionalPaidActivityReviewEligible: false` since T002 aggregates do not provide trusted item priorities.
   - `must_do` items can never be targeted or suggested for removal.

3. **Defect 3 — Misleading Projected Spend Double-Counting**:
   - Removed `totalProjectedSpend` from `BudgetRiskAmounts`.
   - Realized spend (`actual + unplanned`), planned commitments (`planned`), and `remainingBudget` (based on realized spend) remain strictly independent dimensions.
   - Does not invent unreconciled sums of planned and actual spend.

4. **Defect 4 — Category Pagination Truncation**:
   - Implemented bounded 2-page pagination strategy in `BudgetRiskService` based on maximum theoretical 72 groups (9 categories × 8 currencies).
   - Validates cursor progress, duplicate key prevention, cancellation between pages, and fails closed (`categoryPaginationIncomplete = true`, `riskLevel = 'unavailable'`) if pagination exceeds 2 pages or detects anomalies.

5. **Defect 5 — Exact Financial Ratio Representation**:
   - Replaced floating-point `fractionOfBudget: number` with exact integer basis points: `fractionOfBudgetBasisPoints: number` (`Number((spend.realized * 10000n) / budgetMinor)`).
   - Zero floating-point arithmetic throughout the evaluator.

6. **Zero-Decimal Currency Accounting Precision**:
   - Preserved stored 2-decimal precision for `VND`, `JPY`, and `KRW` without silent truncation.
   - Evaluator operates on uniform minor units (cents / 100).

7. **Service Typing Safety**:
   - Eliminated `let fxResults: any[] = []`. Fully typed as `FxResult[]`.

---

## 2. SOURCE HASH BINDING

### Before Corrective Edits (`corrective-source-hashes-before.json`)
* `budgetRiskContract.ts`: `4365E922FD049CEAD901D6230553A6E3941C2FC8E3360394D55DE6021C877675`
* `budgetRiskService.ts`: `643321AAF639CBBB79A45BB6D872B086CFFB285CC9F9BD397938443C74A29B17`
* `budget-risk-contract.test.ts`: `D4A051C2F58B8839C42C3ACF8B9DD351474C98D43C9C34E13098FAD6E55F3316`
* `budget-risk-service.test.ts`: `CF36D485DB57D5B2182CCECA38F9DE9DBE57BFBB7C3FE6F0D244C67A21002A8A`

### After Corrective Edits (`corrective-source-hashes-after.json`)
* `budgetRiskContract.ts`: `9465329324915F2A2DA2692EC46C374846C21FC3FAD5C78367DEDEF0A13D0426`
* `budgetRiskService.ts`: `0F3EB0F49C5C9222586983F6A9CDB3687E16FB1223E838E2568601EDD8C6904D`
* `budget-risk-contract.test.ts`: `414052D43E3DDA1C3E3D3E15965B42938C0A83C4F81C5FEC88FA90A5406149F0`
* `budget-risk-service.test.ts`: `743EED04B1C25F1838DF5263228D81DA3FB4DA8B8FE894DBF7A82AD95F2678B1`

---

## 3. FRESH QUALITY GATES

1. **TypeScript Typecheck**:
   - Log: `typecheck-raw.log`
   - Exit code: `0` (`typecheck-exit.txt`)
2. **ESLint**:
   - Log: `lint-raw.log`
   - Exit code: `0` (`lint-exit.txt`) (0 errors, 12 pre-existing warnings in unrelated screens)
3. **Focused Jest Suite**:
   - Log: `focused-jest-raw.log`
   - Exit code: `0` (`focused-jest-exit.txt`)
   - Totals: 2 test suites, 29 tests passed (`focused-jest-totals.txt`)
4. **Full Jest Suite**:
   - Log: `full-jest-raw.log`
   - Exit code: `0` (`full-jest-exit.txt`)
   - Totals: 71 test suites passed, 1 skipped (`PAUSED_BY_USER`), 737 tests passed (`full-jest-totals.txt`)
5. **Expo Doctor**:
   - Log: `expo-doctor-raw.log`
   - Exit code: `0` / 20/21 baseline (`expo-doctor-exit.txt`)
6. **Authoritative Persistence Harness**:
   - Log: `persistence-raw.log`
   - Exit code: `0` (`persistence-exit.txt`)
   - Markers: T001, T002, T003 markers PASS, `upgrade_compatibility_pass`, `PERSISTENCE_TESTS_PASS`.

---

## 4. CONTRACT & RUNTIME STATUS

* **Database Migration**: None required.
* **Android Target**: `ANDROID = NOT RUN — DEFERRED TO FEATURE-P3-T005`.
* **Motion Status**: `CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER`.
* **Roadmap Status**: `FEATURE-P3-T004` and `FEATURE-P3-T004-S001` marked `[x]`. Parent `FEATURE-P3` and sibling `FEATURE-P3-T005` remain `[ ]`.
