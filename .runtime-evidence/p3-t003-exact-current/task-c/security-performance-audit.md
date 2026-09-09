# Final Security & Performance Audit — Task C (2026-09-08)

## 1. Security & Privacy Audit
- **Zero Private Data Transmission:** Verified that the HTTP request dispatched to `https://open.er-api.com/v6/latest/USD` contains strictly method `GET`, header `Accept: application/json`. No authorization headers, cookies, user IDs, trip IDs, budget amounts, or expense details are transmitted.
- **Zero Private Secret in Bundle:** The endpoint is keyless Open Access; no API key or sensitive secret is embedded in client code or environment variables.
- **Owner-Scoped RPC Isolation:** RPC `get_trip_fx_context` is `SECURITY INVOKER` with `auth.uid()` scoping. Foreign trip queries return non-disclosing `P0002` (trip not found). Anonymous and JWT-less requests are rejected.
- **Safe Error Handling:** Raw provider errors, HTML responses, or transport exceptions are sanitized into typed domain reasons (`network`, `timeout`, `busy`, `providerUnavailable`, `invalidResponse`). No raw third-party payloads or stack traces are leaked to calling layers.

## 2. Performance & Resilience Audit
- **Single USD Snapshot:** A single USD snapshot serves all 8 supported fiat currencies (56 directional pairs). Zero HTTP requests per expense item; zero HTTP requests per pair when snapshot is valid (< 1h).
- **Request Coalescing:** Concurrent callers share a single in-flight `this.refresh` Promise. All consumers await the shared result without generating parallel network requests.
- **Cancellation Isolation:** Pre-aborted requests reject immediately without I/O. Cancellation of one consumer during shared refresh detaches only that caller via `raceWithAbort`, allowing the in-flight snapshot to complete for remaining callers.
- **True LRU Memory Bounds:** `FxLruCache` constrains stored quote entries to a maximum of 64 entries (sufficient for all 56 supported nonidentity pairs). Hits and updates promote entries; excess keys trigger LRU eviction.
- **Streaming & Content Bounds:** Response body size is checked against Content-Length, streaming chunk accumulator, and UTF-8 encoding bounds ($\le 16,384$ bytes).
- **Anti-Stampede Cooldown:** Failed refresh attempts set a cooldown (`FX_FAILURE_COOLDOWN_MS` = 60s, or 20 minutes on HTTP 429), during which usable retained quotes are served as `stale` and repeated network requests are blocked.
