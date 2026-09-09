# Cache Behavior Summary — Task A (2026-09-08)

The cache and fallback behavior in `ExchangeRateFxRepository` satisfies the 7 contract states:

- **State A (Cache < 1 hour):**
  Cached result returned immediately from `FxLruCache` or derived from the in-memory `snapshot` (< 1h `fetchedAt`). Zero network calls dispatched.

- **State B (Cache > 1 hour):**
  When cached quote or snapshot is older than `FX_CACHE_TTL_MS` (1 hour), a background provider refresh is attempted via `this.fetchSnapshot()`.

- **State C (Refresh Success):**
  New snapshot replaces `this.snapshot`. `fetchedAt` is updated to the current completion timestamp. New quotes derived from the snapshot are placed into the LRU cache with state `fresh`.

- **State D (Refresh Failure + Reference Quote <= 7 days):**
  When refresh fails (e.g. 503, network, timeout), the existing snapshot is retained. Derived quotes are returned with state `stale`. A failure cooldown is established (`FX_FAILURE_COOLDOWN_MS` = 60s, or 20 minutes on HTTP 429).

- **State E (During Cooldown):**
  Calls during active cooldown return the retained stale quote without issuing any provider requests.

- **State F (After Cooldown):**
  Once `nowProvider() >= cooldown.expiresAt`, exactly one new provider request is permitted across all concurrent consumers.

- **State G (Reference Quote > 7 days):**
  Quotes whose `quotedAt` is older than `FX_MAX_AGE_MS` (7 days) are NEVER returned as stale; they immediately transition to `unavailable` with reason `expired`.
