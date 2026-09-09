# FEATURE-P3-T004: Aggregate Pagination & Bounded Retrieval Audit

Date: 2026-09-08
Component: `BudgetRiskService` (`mobile/src/integration/remote/budgetRiskService.ts`)

## 1. Currency Aggregates
- Maximum supported currencies in system whitelist: 8 (`USD`, `VND`, `THB`, `JPY`, `EUR`, `GBP`, `SGD`, `KRW`).
- Query limit: 50.
- Result: 8 items fit within a single page of 50.
- Truncation handling: If `currencyPage.nextCursor !== null`, `paginationIncomplete = true`, resulting in `riskLevel: 'unavailable'` and reason `'pagination_limit_exceeded'`.

## 2. Category Aggregates
- Number of categories: 9 (`food`, `transport`, `accommodation`, `activity`, `shopping`, `ticket`, `personal`, `reservation`, `other`).
- Maximum possible category × currency combinations: 9 × 8 = 72 groups.
- With page limit 50, all possible groups are bounded to at most 2 pages (Page 1: 50 items, Page 2: remaining 22 items).
- Service multi-page strategy:
  1. Fetch Page 1 (`limit: 50`).
  2. If `page1.nextCursor === null`: Complete in 1 page.
  3. If `page1.nextCursor !== null`: Fetch Page 2 with `cursor = page1.nextCursor`.
  4. If `page2.nextCursor !== null`: Anomalous state (> 100 items when maximum theoretical is 72). Fails closed by marking `categoryPaginationIncomplete = true`.
  5. Validates cursor advancement (`item.key > page1.nextCursor`) and duplicate detection via `Set<string>`. Any anomaly marks `categoryPaginationIncomplete = true`.
- Zero infinite loops: Hard-bounded to at most 2 page requests.
- Cancellation: `signal` passed and checked before each page fetch.

## 3. Verified Regressions
- `handles category page 2 correctly when nextCursor is present on page 1` -> PASS (3 total aggregate calls: 1 currency + 2 category pages).
- `fails category breakdown closed if category pagination exceeds 2 pages (anomalous)` -> PASS (`riskLevel: 'unavailable'`, `completeness: 'incomplete'`).
