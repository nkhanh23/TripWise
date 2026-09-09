# FEATURE-P3-T004: Incomplete Data & Risk Safety Matrix

Date: 2026-09-08
Policy: `TRIPWISE_BUDGET_RISK_V1`

## Policy & Behavior Specification
When any input required to compute the monetary totals for budget risk is missing or incomplete, the engine fails closed.
It MUST NOT return a confident risk level (`healthy`, `warning`, or `critical`) based on partial spend or incomplete aggregates.

### State Transitions
| Incomplete Condition | Completeness State | Incomplete Reason Code | Resulting `riskLevel` | Suggestions Allowed |
|---|---|---|---|---|
| Missing FX quote for foreign currency | `'incomplete'` | `'missing_fx_quote'` | `'unavailable'` | None (`[]`) |
| FX provider unavailable or network failure | `'incomplete'` | `'fx_unavailable'` | `'unavailable'` | None (`[]`) |
| Currency not supported by FX whitelist | `'incomplete'` | `'unsupported_currency'` | `'unavailable'` | None (`[]`) |
| Currency pagination truncated (`nextCursor != null`) | `'incomplete'` | `'pagination_limit_exceeded'` | `'unavailable'` | None (`[]`) |
| Category pagination anomalous (> 2 pages or cursor error) | `'incomplete'` | `'pagination_limit_exceeded'` | `'unavailable'` | None (`[]`) |
| Budget not configured (null amount/currency) | `'incomplete'` | `'no_budget_configured'` | `'not_configured'` | None (`[]`) |
| Stale FX quote within tolerance (<= 7 days) | `'stale_fx'` | None | `'healthy' \| 'warning' \| 'critical'` | Deterministic rules applied |
| All data present and quotes fresh | `'complete'` | None | `'healthy' \| 'warning' \| 'critical'` | Deterministic rules applied |

## Verified Regression Tests
All edge cases are covered and verified in `mobile/tests/budget-risk-contract.test.ts`:
1. `missing FX cannot return healthy` -> `riskLevel: 'unavailable'`, `completeness: 'incomplete'`, `suggestions: []`.
2. `unavailable FX cannot return healthy/warning/critical` -> `riskLevel: 'unavailable'`, `completeness: 'incomplete'`, `suggestions: []`.
3. `unsupported currency cannot return normal risk` -> `riskLevel: 'unavailable'`, `completeness: 'incomplete'`, `suggestions: []`.
4. `currency pagination incomplete cannot return normal risk` -> `riskLevel: 'unavailable'`, `completeness: 'incomplete'`, `suggestions: []`.
5. `incomplete result emits no confident suggestions` -> `suggestions: []` (no `MAINTAIN_CURRENT_PACE`, no financial control suggestions).
6. `stale-but-valid FX may still return deterministic risk with stale_fx completeness` -> Verified healthy/warning/critical with `completeness: 'stale_fx'`.
