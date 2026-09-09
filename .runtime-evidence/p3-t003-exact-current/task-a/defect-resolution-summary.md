# Defect Resolution Summary — Task A (2026-09-08)

Reconciliation of Phase A Defect Inventory against current local source and test suite:

1. **Provider Rights & RBA Removal:**
   - Status: RESOLVED.
   - Evidence: Provider selected is `ExchangeRate-API Open Access` (`https://open.er-api.com/v6/latest/USD`). RBA transport is completely eliminated from production. `FrankfurterFxRepository` is preserved solely as a deprecated alias pointing to `ExchangeRateFxRepository`.

2. **TTL Refresh Baseline:**
   - Status: RESOLVED.
   - Evidence: `cached.fetchedAt` timestamp ISO string is compared against `FX_CACHE_TTL_MS` (1 hour) in `now - Date.parse(cached.fetchedAt!) <= FX_CACHE_TTL_MS`. If older than 1 hour, refresh is triggered.

3. **LRU Promotion and Eviction:**
   - Status: RESOLVED.
   - Evidence: `FxLruCache` promotes accessed entries on both `get()` and `set()`. When size exceeds capacity (bounded <= 64), the least recently used key is evicted. Unit tests verify 64-entry boundary, promotion, and eviction.

4. **Stale Retained-Quote Fallback:**
   - Status: RESOLVED.
   - Evidence: On refresh failure or network error, `ExchangeRateFxRepository` retains the existing snapshot and returns quotes as `stale` as long as `now - Date.parse(snapshot.quotedAt) <= FX_MAX_AGE_MS` (7 days).

5. **Historical Documentation Scope:**
   - Status: RESOLVED.
   - Evidence: Historical RBA approval records remain historical reference and are explicitly superseded by `provider-rights-resolution.md`.

6. **Strict FxResult Shape & No Quote Leakage:**
   - Status: RESOLVED.
   - Evidence: `fxUnavailable` constructs a clean object containing strictly `{ sourceCurrency, destinationCurrency, state: 'unavailable', quote: null, reason }`. `classifyFxQuote` passes only currency pair keys to `fxUnavailable('expired')`. Tested with `expect(Object.keys(result).sort()).toEqual(['destinationCurrency', 'quote', 'reason', 'sourceCurrency', 'state'])`.

7. **Cooldown on Expired Provider Observation:**
   - Status: RESOLVED.
   - Evidence: `fetchSnapshot()` checks if the snapshot `quotedAt` is older than 7 days; if so, sets cooldown with reason `'expired'`, preventing retry storms.

8. **Reliable Completion Timestamps:**
   - Status: RESOLVED.
   - Evidence: Snapshot parsing and cooldown baseline use `nowProvider()` at network completion time. Abort check occurs before parsing. Late responses after reliability timeout cannot publish to cache.

9. **Shared Refresh & Cancellation Isolation:**
   - Status: RESOLVED.
   - Evidence: All callers share a single `this.refresh` Promise. Pre-aborted requests reject immediately without network I/O. Individual consumer cancellation races with the shared Promise via `raceWithAbort`, leaving the shared fetch running for remaining callers.

10. **Response Byte Size Bounds:**
    - Status: RESOLVED.
    - Evidence: `readBody` validates Content-Length header, enforces a 16,384-byte ceiling during streaming receipt via `reader.read()`, and checks UTF-8 byte count via `TextEncoder().encode(text).byteLength`.

11. **Strict JSON Grammar Before Tokenization:**
    - Status: RESOLVED.
    - Evidence: `parseProviderJson` validates original grammar via preliminary `JSON.parse(text)` before token replacement. Malformed numeric keys (e.g. `{1:2}`), unquoted tokens, and invalid exponents are rejected.

12. **Nullable trips.currency Invariant:**
    - Status: RESOLVED.
    - Evidence: `parseTripFxContext` preserves `originalBudget.currency = null` and `homeCurrency = null` honestly without falling back to settings or guessing.

13. **Trip ID Response Binding:**
    - Status: RESOLVED.
    - Evidence: `SupabaseTripFxContextRepository` validates `if (context.tripId !== tripId.toLowerCase()) throw new IntegrationError('invalidResponse')`.

14. **LRU Testable Independent of Production Currencies:**
    - Status: RESOLVED.
    - Evidence: `FxLruCache` is directly tested with capacity constraints and integer keys without fabricating unapproved currency codes.
