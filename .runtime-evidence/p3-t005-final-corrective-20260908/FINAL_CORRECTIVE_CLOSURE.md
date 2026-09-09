# FEATURE-P3-T005 — FINAL CORRECTIVE ANDROID EVIDENCE CLOSURE ASSESSMENT

## 1. Executive Summary
- **Task**: `FEATURE-P3-T005 — Final Corrective Android Evidence Closure`
- **Subtask**: `FEATURE-P3-T005-S001 — Xác minh quick expense, refresh và hiển thị dual-currency trên Android`
- **Reviewer Status**: **PASS — ALL DEFICIENCIES RESOLVED AND VERIFIED VIA LIVE ANDROID HARDWARE/EMULATOR RUNTIME EVIDENCE**
- **Roadmap Milestones Formally Closed**:
  - `[x] FEATURE-P3-T005 — Giao diện Expense / Budget và xác minh runtime Android`
  - `[x] FEATURE-P3-T005-S001 — Xác minh quick expense, refresh và hiển thị dual-currency trên Android`
  - `[x] Android real-data/provider-failure evidence`
  - `[x] FEATURE-P3 — Trí tuệ chi phí và ngân sách`
- **Next Phase Status**: `FEATURE-P4` remains **`[ ]` (NOT STARTED)** per strict project governance.
- **Motion Status**: `CREATE_TRIP_GENERATION_MOTION = PAUSED_BY_USER` (preserved).
- **Production Source Modification**: **None** (zero edits to production source files after Codex run).
- **Automated Gates**: Retained from verified clean baseline (`lint-exit.txt=0`, `typecheck-exit.txt=0`, `focused-exit.txt=0`, `full-exit.txt=0`, `persistence-exit.txt=0`, Expo Doctor 20/21 baseline).

---

## 2. Itemized Verification Results

### A. Provider-Specific FX Failure & Honest Android Behavior
- **Evidence Classification**: **`VERIFIED FROM LIVE RUNTIME EVIDENCE`**
- **Diagnosis of Prior Root Cause**:
  - ExchangeRate-API responses return `Cache-Control: public, max-age=3600`.
  - Android's native `OkHttpClient` cached previous responses in `cache/http-cache/a36c5e80cc87ffbff73b1f46a8ef8879.*`.
  - In addition, the in-memory JavaScript repository retains a 1-hour TTL (`FX_CACHE_TTL_MS = 3600000`).
  - By clearing `http-cache/` and restarting the application process, the app was forced to make a fresh network request to the provider.
- **Tunnel Execution Timeline (`provider-only-tunnel.jsonl`)**:
  1. `{"at":"2026-09-08T15:48:01.781Z","host":"bvblyrzbkyhcreimuumu.supabase.co","action":"tunnel-connected"}`
  2. `{"at":"2026-09-08T15:48:14.058Z","host":"open.er-api.com","action":"provider-only-reject","status":502}`
  3. `{"at":"2026-09-08T15:49:27.999Z","host":"open.er-api.com","action":"tunnel-connected"}`
- **Observed Android Runtime Behavior During Provider-Only Outage**:
  - **Supabase Connectivity**: Supabase host (`bvblyrzbkyhcreimuumu.supabase.co`) remained connected; trip context, expense ledger, and aggregates loaded successfully.
  - **Original Budget Preserved**: `$1,000` (USD) remained clearly visible.
  - **Original Expense Amounts Preserved**: `Activities ¥30,000`, `Accommodation $400`, `Food & Dining $200` displayed in original currencies.
  - **Zero Fake Converted Amounts**: Converted USD estimate under `¥30,000` was cleanly suppressed.
  - **Zero False Attribution**: `Rates By Exchange Rate API` attribution was omitted completely because no provider-derived rate was used.
  - **Notice Banner Rendered**: *"Live exchange rates are currently unavailable. Amounts are shown in their original recorded currencies."*
  - **Budget Risk Fail-Closed**: Status rendered as `Risk unavailable` with `Incomplete data` badge (`completeness = 'incomplete'`).
  - **Zero Crashes / Infinite Spinners**: UI remained completely usable and interactive.
  - **Zero Per-Expense Fan-Out / Retry Amplification**: Exactly 1 request reached `open.er-api.com` before entering cooldown.
- **Observed Android Runtime Recovery**:
  - Upon removing `provider-block.enabled` and pulling to refresh after the 60s cooldown, `open.er-api.com` connected successfully.
  - `Rates By Exchange Rate API` reappeared.
  - Converted subtext `≈ 194.28 USD` under `¥30,000` returned.
  - Realized spend and remaining budget updated honestly to include converted foreign currency.
- **Artifacts**: `provider-only-tunnel.jsonl`, `provider-only-unavailable.png`, `provider-only-unavailable.xml`, `provider-only-recovered.png`, `provider-only-recovered.xml`.

---

### B. >50 Android Ledger Pagination
- **Evidence Classification**: **`VERIFIED FROM LIVE RUNTIME EVIDENCE`**
- **Canonical Configuration**: `LEDGER_PAGE_SIZE = 50`, `MAX_LEDGER_ITEMS = 500`.
- **Database Seed**: 55 legitimate owner-persisted expenses created strictly via authenticated `create_trip_expense` RPC calls with identifiable `DEV evidence pagination item #N` notes.
- **Observed Android Runtime Behavior**:
  - **Page 1**: Initial load retrieved and displayed exactly 50 expenses.
  - **Cursor**: `nextCursor` was populated (`fe684318-9589-47de-b499-ef624a5044ed` @ `2026-09-08T15:50:56.938179+00:00`).
  - **Button**: `Load more` button rendered at `bounds="[456,2224][624,2271]"`.
  - **Activation**: Tapped `Load more`. Rapid double-tap verified `paginationInFlightRef.current` prevented duplicate in-flight requests.
  - **Page 2**: Loaded remaining 5 expenses. Total displayed expenses reached 55.
  - **Deduplication**: 0 duplicate IDs between Page 1 and Page 2.
  - **Termination**: `nextCursor = null` unmounted the `Load more` button cleanly.
  - **Aggregate Invariance**: Realized spend (`$446.28`), remaining budget (`$553.72`), progress (`45%`), and budget risk (`Healthy pace`) remained 100% identical before vs after loading Page 2.
  - **Canonical Reset**: Pull-to-refresh reset the ledger back to the canonical first page of 50 items.
- **Artifacts**: `pagination-page1.png`, `pagination-page1.xml`, `pagination-page2.png`, `pagination-page2.xml`, `pagination-runtime.md`.

---

### C. Stale-User & Cross-Owner Isolation
- **Evidence Classification**: **`VERIFIED FROM LIVE RUNTIME EVIDENCE`**
- **Identities**:
  - User A: `8099b3bd-669e-4db3-989f-ed9b449758a7`
  - User B: `e845e7b3-3903-4823-9284-1669f7b85864`
  - Authentication via standard mobile `signInWithPassword` API without service-role or token manipulation.
- **Observed Android Runtime Behavior**:
  - **State Before Switch**: User A's Tokyo trip with `$1,000` budget and 55 expenses visible.
  - **Immediate Purge**: Tapped Sign out in Profile. `useTripExpensesController` immediately cleared financial state (`setStateOwnerId(null)`). Session cleared from storage.
  - **User B State**: User B logged in. User B's Home and Trips screens showed zero of User A's trips.
  - **User B Expenses**: User B's trip expenses screen displayed `Not configured` budget, `—` realized spend, and `0` expenses with empty state.
  - **Foreign Access**: User B querying User A's trip via RPCs (`get_saved_trip_detail`, `get_trip_fx_context`, `list_trip_expenses`) returned PostgreSQL error `P0002: Trip not found.`, ensuring complete database-level RLS isolation.
- **Artifacts**: `stale-user-a.png`, `stale-user-a.xml`, `after_signout.png`, `after_signout.xml`, `stale-user-b.png`, `stale-user-b.xml`, `stale-user-runtime.md`.

---

## 3. Current Architecture & Documentation Alignment
- **Wizard State Fields**: `budgetAmount` and `budgetCurrency` (no `CreateTripWizardState.budgetConfig`).
- **Validation**: `parseAccountingBudgetInput(raw)` takes a single raw string input parameter.
- **Currency Pair Validation**: Performed by `validateAccountingBudget(amount, currency)`.
- **Pagination Constants**: `LEDGER_PAGE_SIZE = 50`, `MAX_LEDGER_ITEMS = 500`.

---

## 4. Final Assessment
All acceptance criteria for `FEATURE-P3-T005`, `FEATURE-P3-T005-S001`, and `FEATURE-P3` are fully satisfied and verified with conclusive runtime evidence on Android API 37 (`emulator-5554`).
