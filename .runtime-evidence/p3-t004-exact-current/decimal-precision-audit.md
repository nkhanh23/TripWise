# FEATURE-P3-T004: Decimal Precision & Zero-Decimal Currency Audit

Date: 2026-09-08
Component: `evaluateBudgetRisk` (`mobile/src/integration/budgetRiskContract.ts`)

## 1. Storage & Accounting Precision
- Accepted T001/T002 schema stores all currency amounts with two fractional decimal digits (`numeric(12, 2)`).
- This applies universally across all currencies, including `VND`, `JPY`, and `KRW` (e.g. `25000000.50 VND`, `85000.25 JPY`).
- In Budget Risk evaluation:
  - Budget minor units are parsed as exact cents (`* 100`) regardless of currency:
    `intPart * 100 + decPart`.
  - T002 aggregates (`actualPlusUnplanned`, `planned`) use `accountingMinorUnits(v)` which directly converts `X.YY` to `BigInt(XYY)` cents.
  - Same-currency comparisons are 100% exact minor-unit additions without division or truncation.
  - Zero financial precision is lost for fractional stored values in `VND`, `JPY`, or `KRW`.

## 2. FX Conversion & Display Rounding
- When foreign currencies are converted using T003 `convertFx`:
  - `convertFx` derives converted amounts and formats them with display fraction digits:
    - 0 digits for `VND`, `JPY`, `KRW`.
    - 2 digits for other currencies (`USD`, `EUR`, etc.).
  - Budget Risk aligns with display fraction digits:
    - If converted into a 0-decimal currency, integer units are scaled up by `* 100` (`BigInt(amount) * 100`) to maintain a common accounting base of cents.
    - If converted into a 2-decimal currency, minor units are exact cents.
- Formatted output:
  - All amounts in `BudgetRiskAmounts` are formatted with 2 fraction digits (`0.00`) preserving exact minor cent values.

## 3. Financial Ratio Exactness (Basis Points)
- Replaced binary floating-point `fractionOfBudget: number` with `fractionOfBudgetBasisPoints: number`.
- Computed via exact integer math: `Number((spend.realized * 10000n) / budgetMinor)`.
- Returns an exact integer from 0 to 10000 (10000 basis points = 100.00%).
- Eliminates IEEE 754 binary floating-point representation drift.
