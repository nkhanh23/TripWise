# Provider selection and legal data-terms evaluation (2026-09-07)

## 1. Final Selection: Frankfurter v2, pinned to Reserve Bank of Australia (RBA)

Select **Frankfurter v2, pinned to Reserve Bank of Australia (providers=RBA)**.
Provider identifier: `frankfurter-rba`.
Attribution: `Frankfurter / Reserve Bank of Australia (RBA); reference rate, derived display`.
One public provider transport, one explicitly identified central-bank source; do not use blended rates.
Keyless, public API, no private user/trip/budget data transmitted.

---

## 2. Legal / Data-Terms Blocker Audit: Banca d'Italia (BDI) vs Reserve Bank of Australia (RBA)

### A. Banca d'Italia (BDI) — Rejected Due to Commercial Restrictions
Codex initially provisionally examined Frankfurter v2 with Banca d'Italia (`providers=BDI`). However, audit of the official underlying terms of Banca d'Italia revealed:
- **Official Legal Notice (`bancaditalia.it/note-legali`):**
  - "Users are permitted to print and save material from the website, but **only for personal use**."
  - "It is **strictly forbidden to use any material for profit or any form of financial gain**."
  - "Reproduction of the website or any part thereof on other websites or public/private information systems is **not permitted without the Bank's explicit prior written authorization**."
- **Open Data Scope:** Only datasets published directly on the Italian public administration portal (`dati.gov.it`) carry a CC-BY 4.0 license. The foreign exchange portal (`tassidicambio.bancaditalia.it`) is separate, carries its own copyright notice, and is not listed as open data under CC-BY 4.0.
- **Conclusion:** BDI's official terms explicitly prohibit commercial use and reproduction on external information systems without prior written authorization. BDI cannot be finalized as the production provider for TripWise.

### B. European Central Bank (ECB) — Rejected Due to Missing Currency Coverage
- ECB publishes daily Euro reference rates under free reuse with attribution.
- However, ECB **does not publish Vietnamese Đồng (VND)**, which is the primary home/destination currency for TripWise's core market.

### C. Bank of Canada (BOC) — Rejected Due to Third-Party Data Sourcing
- BOC publishes daily rates, but terms note that underlying quotes are sourced from LSEG (formerly Refinitiv), introducing third-party data licensing restrictions.

### D. Reserve Bank of Australia (RBA) — Approved and Selected
- **Official Copyright & Disclaimer (`rba.gov.au/copyright`):**
  - **Section 5 ("Financial Data terms and conditions"):**
    *"Subject to the permissions outlined above and below, the Financial Data and Financial Data Materials may be used, reproduced, published, communicated to the public or otherwise referenced for personal or commercial use only if it is not stated, represented or in any way implied (other than in respect of proper attribution as required by Section 3 above) that the RBA endorses any use, reproduction, publication, communication to the public or referencing of the Financial Data..."*
  - **Section 3 ("Attribution of RBA"):**
    *"Unless any RBA Material specifies otherwise, the following form of attribution of RBA Material is required: Source: Reserve Bank of Australia [year] OR Source: RBA [year]"*
- **Currency Coverage:** RBA calculates and publishes daily exchange rates for all 8 TripWise Settings currencies: USD, VND, THB, JPY, EUR, GBP, SGD, and KRW (as part of its Trade Weighted Index / daily statistical release).
- **Public Transport:** Accessible keylessly via Frankfurter v2 at `https://api.frankfurter.dev/v2/rates?base={SRC}&quotes={DST}&providers=RBA&expand=providers`.
- **Conclusion:** RBA explicitly authorizes both personal and commercial reuse with attribution and covers all TripWise currencies.

---

## 3. Official References Inspected
- https://frankfurter.dev/ — public keyless API, daily rates, base/quotes/providers semantics, expand=providers, HTTP errors.
- https://www.rba.gov.au/copyright/ — Section 5 permits personal and commercial reuse of Financial Data; Section 3 attribution rules.
- https://www.rba.gov.au/statistics/frequency/exchange-rates.html — daily statistical release covering USD, EUR, GBP, JPY, KRW, SGD, THB, VND.
- https://www.bancaditalia.it/note-legali/ — BDI general terms forbidding commercial use and unauthorized reproduction.
- https://github.com/lineofflight/frankfurter/blob/main/LICENSE — Frankfurter software license (MIT).

---

## 4. Contract Direction, Precision, and Freshness
- Canonical rate formula: `destinationAmount = sourceAmount × rate`. No implicit reciprocal.
- Exact number tokens are read losslessly from JSON before binary float parsing via `parseProviderJson`.
- Date precision: day precision (`timestampPrecision: 'day'`). Quoted timestamp is set to UTC midnight of reference date, not an invented intraday trading instant.
- Retrieval timestamp: `fetchedAt` separately records client retrieval instant.
- Freshness:
  - `fresh`: quote reference age <= 4 days and cache retrieval age <= 1 hour.
  - `stale`: quote reference age <= 7 days.
  - `unavailable` (`expired`): quote reference age > 7 days.
- Future tolerance: up to 5 minutes clock skew accepted.

---

## 5. Architectural Boundaries & Resilience
- Pure public transport: No private trip ID, user ID, JWT, budget amount, expense amount, or Supabase headers are sent to Frankfurter.
- Bounded cache: LRU in-memory cache bounded to 64 entries.
- Active fetch concurrency: Bounded to maximum 2 concurrent active provider fetches via semaphore.
- Coalescing: Concurrent requests for the same currency pair share a single in-flight network request.
- Failure cooldown: 60 seconds cooldown on provider failure prevents request storms.
- Subscriber cancellation resilience: An individual subscriber aborting detached from the in-flight fetch without cancelling useful shared work for other consumers.
- Identity conversion: Source === destination handled locally without network I/O; rate is exactly `'1'`, provider is `'identity'`.
- FX context: Read-only `SECURITY INVOKER` RPC `get_trip_fx_context` provides exact original budget and home currency from `trips` table. Destination currency is explicitly `null` with source `unavailable`.
