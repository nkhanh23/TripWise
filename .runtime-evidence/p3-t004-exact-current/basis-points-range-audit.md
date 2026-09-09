# FEATURE-P3-T004: Basis Points Representation & Maximum Range Audit

Date: 2026-09-08
Policy: `TRIPWISE_BUDGET_RISK_V1`

## 1. Mathematical Definition
The basis points value represents the integer ratio of realized spend to trip budget in basis points (1 basis point = 0.01% = 0.0001):
$$\text{basisPoints} = \left\lfloor \frac{\text{realizedSpend}}{\text{tripBudget}} \times 10000 \right\rfloor$$

## 2. Full-Range Exactness (Defect A Correction)
In prior versions, basis points were converted to JavaScript `number`:
`Number((spend.realized * 10000n) / budgetMinor)`
This was unsafe because:
1. T002 aggregates support `numeric(24, 2)` (up to $10^{22}$ cents).
2. If the user configures a very small budget (e.g. $0.01) and has large expenses, the basis points exceed `Number.MAX_SAFE_INTEGER` ($9,007,199,254,740,991 \approx 9 \times 10^{15}$), resulting in loss of precision and scientific notation.
3. Over-budget trips exceed 10000 basis points.

### Contract Representation:
```typescript
export type CategorySpendBreakdown = {
  category: string;
  realizedSpend: string;
  plannedCommitments: string;
  fractionOfBudgetBasisPoints: string;
};
```

Canonical Format:
- Non-negative base-10 integer string.
- No leading zeros except `"0"`.
- Never converted through JavaScript `Number` or IEEE 754 floating point.
- Unclamped: May exceed `"10000"` (e.g. 200% = `"20000"`).
- Exact BigInt integer division: `(spend.realized * 10000n) / budgetMinor`.toString()`.

## 3. Verified Regressions
- 33.33% -> `"3333"`
- 100.00% -> `"10000"`
- 200.00% -> `"20000"`
- Small budget ($0.01) + large aggregate ($100T): yields `"100000000000000000000"` (10^20) exactly, with no scientific notation and zero floating-point drift.
