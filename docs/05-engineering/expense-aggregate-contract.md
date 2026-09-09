# FEATURE-P3-T002: original-currency expense accounting

Production read path: consumer → `TripExpenseAggregateRepository` → validated request → `get_trip_expense_aggregate(p_request jsonb)` → parsed `ExpenseAggregatePage`. The standalone `travelWorkspace.ts` number-based summarizer remains a domain helper; this read path does not use it. No UI, FX, risk label, trip-budget write, new ledger mutation, or client owner identity is introduced.

## Request and bounded response

Only `{tripId, groupBy, limit?, cursor?}` is accepted. `groupBy` is `currency`, `category`, or `day`; default limit 20, allowed 1..50. Unknown keys (including user/owner/provider fields) are rejected. `cursor`, when supplied, is the last returned group key. It must belong to the selected grouping. Omit optional fields instead of passing null.

Response: `{tripId, groupBy, items, nextCursor}`. Each item contains `key`, `currency`, `category`, `day`, `planned`, `actual`, `unplanned`, `actualPlusUnplanned`, `variance`. Money values are canonical decimal strings with exactly two fractional digits. At most 50 items, with a 51st internal sentinel to determine continuation; no ledger rows are returned. Empty ledger returns `items: [], nextCursor: null`, without inventing a currency for zero amounts. A missing origin in an existing group is `"0.00"`. Absent categories/currencies/days are omitted consistently.

The client asks for the desired dimension; it does not fetch all ledger pages to compute totals. For example, `groupBy: currency` returns comparison totals, `category` returns category × currency groups, `day` returns day bucket × currency groups. Each group has all three origin totals. There is no combined cross-currency total.

## Money and comparison

- Planned rows contribute only to `planned` (estimated/planned total).
- Actual rows contribute only to `actual`.
- Unplanned rows contribute only to `unplanned`, remaining separately visible.
- `actualPlusUnplanned = actual + unplanned`: explicit combined spend under this contract.
- `variance = actualPlusUnplanned - planned`: positive means recorded combined spend exceeds recorded planned expenses **in that currency**, not that the trip is over its original budget. Negative means it is lower. No matching/reconciliation between individual planned and actual rows is inferred.

PostgreSQL sums the accepted stored `numeric(12,2)` amounts. There is no new per-sum rounding: summing two-decimal rows is exact. Each returned subtotal and derived value is bounded by `numeric(24,2)`: nonnegative values up to `9999999999999999999999.99`; signed variance has the corresponding negative bound. Overflow raises safe `22003`, never truncates or saturates. This exceeds a single-row bound; the SQL tests demonstrate `9999999999.99 + 9999999999.99 = 19999999999.98` and exact `0.10 + 0.20 = 0.30`. The numeric representation boundary is separately tested with PostgreSQL casts; this does not claim a fixture containing trillions of rows.

Mobile retains branded decimal strings, rejecting JSON numbers, NaN/infinity, scientific notation, malformed scale, leading zeros, negative zero, negative subtotals and out-of-bound digits. Exact BigInt minor units validate derived-value consistency and support lossless formatting; JavaScript floating-point is not an accounting engine. Consumers should retain decimal strings/BigInt for subsequent display formatting.

## Deterministic day buckets and order

1. A same-trip attached item joins its persisted itinerary day. Bucket identity is that day's UUID, even if its date is null or `spent_at` disagrees. Metadata: `{kind: itinerary, itineraryDayId, date}`. No date is guessed from trip start/day number.
2. Otherwise a non-null `spent_at` uses its **UTC calendar date**, independent of DB/client timezone. Metadata: `{kind: spentDate, itineraryDayId: null, date}`. It is not assigned to an itinerary day that happens to share a date.
3. Otherwise `{kind: unassigned, itineraryDayId: null, date: null}`. Such expenses remain fully included.

Keys are `c|USD`, `k:food|USD`, `i:<day-uuid>|USD`, `s:2028-01-02|USD`, `u|USD`. Ordering and cursor comparisons use bytewise SQL `COLLATE "C"`, ascending. Thus currency is alphabetic; categories alphabetic; day buckets sort by kind prefix, then UUID/date and currency. This is deterministic, **not a chronological display-order promise for itinerary UUIDs**. Item/date mutation affects the next read without rewriting expenses.

Each RPC uses one PostgreSQL statement snapshot; requests/pages are live and do not share a retained snapshot. If the ledger/attachment changes while paging, consumers should restart their aggregate read for a consistent fresh presentation, rather than merge old and new totals. No client aggregate cache is introduced.

## Security and query cost

SECURITY INVOKER, authenticated-only execute grant, owner derived from `auth.uid()`, explicit trip ownership plus existing table RLS. Foreign/missing trips share `P0002`; repository maps to `notFound` without server details. JWT-less `28000`, denied execution `42501`, invalid input `22023`, aggregate overflow `22003` retain safe mappings. Existing read policy provides timeout, bounded retry and cancellation. Caller/session changes are never served from an aggregate cache.

One trip-filtered ledger relation, at most two primary-key joins for day grouping, one grouped SQL calculation. No PL/pgSQL per-expense/day loop; no application N+1/network query loop; no full itinerary graph DTO. Existing expense trip indexes and item/day PKs are retained; no demonstrated need for another index. Database RLS subplans/index lookups can execute per scanned row internally, which is visible in EXPLAIN and must not be misrepresented as constant database work.

Output is bounded, but exact aggregation necessarily reads applicable trip rows and groups them; cost grows with a trip's ledger and is repeated on subsequent aggregate pages. The local EXPLAIN fixture is not a high-load benchmark. The 10-second client read timeout does not by itself prove server-side cancellation. Larger-scale summary caching/materialization or operational statement-timeout policy would need separate evidence and scope.

## Verification and scope

`supabase/tests/persistence/run.ps1` runs T001 contracts unchanged and T002 accounting/security/bounded-plan checks on fresh and upgrade databases. `mobile/tests/expense-aggregate-contract.test.ts` covers validators, exact parsing, safe transport errors, cancellation and bounded retries. Exact-current logs/hashes/EXPLAIN: `.runtime-evidence/p3-t002-exact-current/`.

Android: NOT RUN — deferred to FEATURE-P3-T005. T001 migrations and accepted P1/P2 behavior stay unchanged. FEATURE-P3-T003 FX and FEATURE-P3-T004 Budget Risk are not started.
