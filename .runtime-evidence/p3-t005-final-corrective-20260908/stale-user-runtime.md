# Stale-User & Cross-Owner Android Runtime Verification

## 1. Executive Summary & Identity Isolation Protocol
- **Primary Owner (User A)**: `8099b3bd-669e-4db3-989f-ed9b449758a7` (Sanitized Auth User A)
- **Secondary Identity (User B)**: `e845e7b3-3903-4823-9284-1669f7b85864` (Sanitized Auth User B)
- **Authentication Method**: Normal Supabase Auth (`signInWithPassword`) via mobile client; zero service-role, zero token rewriting, zero RLS weakening.
- **Trip A**: `b1b03e3b-ad23-4add-adce-97cd23b0e579` (Tokyo Exploration 2026, Configured Budget `$1,000 USD`, 55 expenses totaling `$446.28 USD` + `¥30,000 JPY`).
- **Trip B**: `d26a5d6c-d54b-45b5-bcbd-5402bfc5a387` (Bangkok INT-P6 runtime route, 0 expenses).

## 2. Step-by-Step Runtime Sequence

### Step 1: User A Active Financial State
- User A opened `TripExpensesScreen` for Trip A (`b1b03e3b-ad23-4add-adce-97cd23b0e579`).
- State verified:
  - Original Budget: `$1,000` (USD)
  - Realized Spend: `$446.28`
  - Remaining Budget: `$553.72`
  - Budget Progress: `45%`
  - Planned Commitments: `$400`
  - Budget Risk: `Healthy pace: Spending is well within budget limits`
  - Recent Expenses: 50 items displayed on Page 1 (out of 55 items total).
- Artifacts captured: `stale-user-a.png`, `stale-user-a.xml`.

### Step 2: Immediate State Purge & Sign Out
- Navigated to ProfileScreen -> Tapped "Sign out" -> Confirmed in `ProfileDestructiveDialog`.
- Observed behavior:
  - In `useTripExpensesController.ts`: `setStateOwnerId(null)` immediately purges `tripFxContext`, `aggregate`, `expenses`, `nextCursor`, and `budgetRisk`.
  - Supabase Auth session cleared from secure storage.
  - Client transitioned immediately to Welcome/Auth screen.
  - Zero financial data remained in memory or on screen.
- Artifacts captured: `after_signout.png`, `after_signout.xml`.

### Step 3: User B Login & Complete Financial Isolation
- Logged in as User B via legitimate normal Supabase Auth login flow (`LoginScreen`).
- Navigated to Home -> User A's upcoming Tokyo trip was **completely absent**.
- Navigated to Saved Trips -> Only User B's own trip (`INT-P6 runtime route`) appeared in the trips list; all 9 trips of User A were filtered out by RLS.
- Opened `TripExpensesScreen` for User B's trip:
  - Original Budget: `Not configured`
  - Realized Spend: `—`
  - Remaining Budget: `—`
  - Recent Expenses count: `0`
  - Empty state rendered: *"No expenses recorded. Add an expense to start tracking your travel spend."*
  - Zero leakage of User A's budget ($1,000), expenses (55 rows), or foreign currencies.
- Artifacts captured: `stale-user-b.png`, `stale-user-b.xml`.

### Step 4: Foreign Trip Access Verification (RLS & RPC Bounds)
- User B attempted direct access to User A's private trip (`b1b03e3b-ad23-4add-adce-97cd23b0e579`):
  1. `client.from('trips').select().eq('id', tripA)`: Returned `[]` (empty set, blocked by RLS `user_id = auth.uid()`).
  2. `client.rpc('get_saved_trip_detail')`: Returned `null` (unauthorized).
  3. `client.rpc('get_trip_fx_context')`: Returned error `P0002` (*"Trip not found."*).
  4. `client.rpc('list_trip_expenses')`: Returned error `P0002` (*"Trip not found."*).
- Foreign access fails safe: Database returns `P0002 (Trip not found)` to prevent information disclosure or existence leakage of foreign records.

## 3. Artifact Catalog
- `stale-user-a.png`
- `stale-user-a.xml`
- `after_signout.png`
- `after_signout.xml`
- `stale-user-b.png`
- `stale-user-b.xml`
- `stale-user-runtime.md`
