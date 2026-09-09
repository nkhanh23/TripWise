# FEATURE-P3-T004: Suggestion Safety & Activity Eligibility Matrix

Date: 2026-09-08
Policy: `TRIPWISE_BUDGET_RISK_V1`

## Principle
1. Zero autonomous action: Suggestions are informative enum codes only; no mutation or automated changes to user budget or expenses.
2. Privacy safe: Zero prompt-injection, zero external LLM generation, zero vendor or financial data egress.
3. Fail-closed on activity cuts: Category aggregates alone do NOT contain itinerary item priority or `must_do` status. The absence of `must_do` in an aggregate MUST NOT be inferred as an optional activity eligible for removal.

## Suggestion Codes
| Code | Category | Impact Level | Trigger Conditions | Eligibility Requirements |
|---|---|---|---|---|
| `MAINTAIN_CURRENT_PACE` | `general` | `low` | `riskLevel === 'healthy'` | Realized spend < 80% and planned <= 100% |
| `REDUCE_DAILY_SPENDING` | `general` | `medium` (warning) / `high` (critical) | `riskLevel === 'warning'` or `critical'` | Realized spend >= 80% or planned > 100% |
| `REVIEW_FOOD_SPEND` | `food` | `medium` | `riskLevel === 'warning'` or `'critical'`, and Food spend >= 30% of budget | Category aggregate must be complete (`categoryPaginationIncomplete: false`) |
| `LOOK_FOR_FREE_ALTERNATIVE` | `activity` | `high` | `riskLevel === 'warning'` or `'critical'`, and planned activity spend > 0 | **Requires explicit trusted proof**: `optionalPaidActivityReviewEligible: true`. Default is `false`. |
| `REVIEW_OPTIONAL_PAID_ACTIVITY` | `activity` | `medium` | `riskLevel === 'warning'` or `'critical'`, and planned activity spend > 0 | **Requires explicit trusted proof**: `optionalPaidActivityReviewEligible: true`. Default is `false`. |

## Verified Regressions
1. `category aggregate alone never produces REVIEW_OPTIONAL_PAID_ACTIVITY without explicit eligibility` (`optionalPaidActivityReviewEligible: false` -> NO activity removal suggestions).
2. Explicit trusted proof (`optionalPaidActivityReviewEligible: true`) emits `REVIEW_OPTIONAL_PAID_ACTIVITY` and `LOOK_FOR_FREE_ALTERNATIVE`.
3. `must_do` items can never be targeted or removed.
4. `BudgetRiskService` hardwires `optionalPaidActivityReviewEligible: false` because T002 aggregates do not provide item-level priorities.
