# FEATURE-P3-T004: FX Accounting vs Display Conversion Audit

Date: 2026-09-08
Component: `convertToAccountingCents` (`mobile/src/integration/budgetRiskContract.ts`)

## 1. Distinction Between T003 Display Conversion and T004 Accounting Conversion

### T003 `convertFx` (Display-Oriented):
- Purpose: Formats converted currency amounts for user display.
- Display scale:
  - `VND`, `JPY`, `KRW` -> 0 fractional digits (e.g. `25000 VND`).
  - `USD`, `EUR`, `GBP`, etc. -> 2 fractional digits (e.g. `10.50 USD`).
- Behavior: Integer rounding to display scale.
- Why insufficient for T004: TripWise DB budgets and expense ledgers store all currencies with 2 fractional digits (`numeric(..., 2)`). Reconstructing cents from a 0-decimal display amount would truncate or distort non-zero cents (e.g. `25705.01 VND` becoming `25705.00 VND`).

### T004 `convertToAccountingCents` (Accounting-Oriented):
- Purpose: Authoritative financial math for budget risk evaluation.
- Semantics:
  $$\text{destinationAccountingCents} = \text{roundHalfUp}\left(\frac{\text{sourceCents} \times \text{rateInt}}{10^{\text{rateScale}}}\right)$$
- Always produces exact 2-decimal accounting minor units (cents) via pure BigInt arithmetic.
- Never rounds to whole units for zero-display currencies.
- Relies directly on validated T003 `FxResult` and `quote.rate` without altering T003 contracts or introducing new providers.
- Display trace preserved: T003 `FxConversion` remains in `fxConversionsApplied` for display and provenance logging, but the risk thresholds are evaluated solely against the exact accounting cents.

## 2. Verified Threshold Boundary Tests
All verified in `mobile/tests/budget-risk-contract.test.ts`:
1. **USD -> VND Fractional Cents**:
   `1.01 USD` * `25450.50` = `25705.005` -> rounds half-up to `25705.01 VND`. Evaluates to exact `25705.01`.
2. **USD -> JPY Fractional Cents**:
   `10.00 USD` * `155.455` = `1554.55 JPY`. Preserves `.55` cents.
3. **USD -> KRW Fractional Cents**:
   `10.00 USD` * `1350.25` = `13502.50 KRW`. Preserves `.50` cents.
4. **Foreign -> VND 80% Boundary**:
   Budget = `100,000.00 VND`. 80% threshold = `80,000.00 VND`.
   - Spend `79,800.00 VND` (< 80%) -> `riskLevel: 'healthy'`.
   - Spend `80,000.00 VND` (== 80%) -> `riskLevel: 'warning'`.
5. **Foreign -> JPY 100% Boundary**:
   Budget = `15,000.00 JPY`.
   - Spend `15,000.00 JPY` (== 100%) -> `riskLevel: 'warning'`, `remainingBudget: '0.00'`.
   - Spend `15,001.50 JPY` (> 100%) -> `riskLevel: 'critical'`, `remainingBudget: '-1.50'`.
6. **Stale FX**:
   Evaluates with identical exact accounting conversion and sets `completeness: 'stale_fx'`.
7. **Unavailable FX**:
   Fails closed to `riskLevel: 'unavailable'`, `completeness: 'incomplete'`.
8. **Same-Currency VND/JPY/KRW**:
   2-decimal stored values remain completely unchanged.
