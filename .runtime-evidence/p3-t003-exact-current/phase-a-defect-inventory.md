# T003 Phase A source audit — 2026-09-08

Read-only source findings before implementation. Tests listed below have not been run in this turn. Historical logs are not fresh gate results.

1. RBA is still hardcoded in the repository, parser, quote identity and fixtures; its approval was withdrawn. Existing implementation is unaccepted WIP.
2. `fetchedAtMs` is written but unused. A usable cached quote returns immediately after TTL, so refresh never occurs at one hour.
3. Cache insertion evicts first inserted key; hits do not promote: FIFO, not LRU.
4. Refresh failure/cooldown returns unavailable without retained-quote fallback.
5. Historical reviewer/provider/cache files contain superseded approval, identity precision, home currency and LRU claims. Preserve them as historical, supersede explicitly.
6. `classifyFxQuote` passes an entire quote to `fxUnavailable`, whose spread leaks quote-only keys on the expired branch. Identity regression does not cover this branch.
7. A provider observation classified expired returns unavailable without writing failure cooldown: repeated callers can fetch repeatedly.
8. Fetch timestamps and cooldown baseline use time before network completion. A late operation can also continue after reliability timeout unless cache publication checks abort state.
9. Consumer cancellation is detached from shared work; queue lacks subscriber tracking, so cancelled queued work may still fetch. Queue/failure maps are indirectly constrained by the eight-code allowlist (56 nonidentity pairs), not a general explicitly bounded primitive.
10. Response size is checked after `response.text()` and counts UTF-16 code units rather than bytes; native response buffering is not bounded by that check.
11. Numeric tokenizer preserves legal strings in its intended scan, but transforms numeric object keys into strings before JSON validation (e.g. `{1:2}` can become accepted). Requires grammar validation / regression before reuse. Exponential numeric tokens also need deliberate rate normalization policy.
12. `trips.currency` is nullable in the schema and create-trip graph path; FX context parser currently requires a non-null currency. Preserve unknown currency honestly rather than guessing Settings currency.
13. FX-context repository parses returned trip UUID syntax but does not compare it to requested trip ID. Add binding validation if implementation proceeds.
14. Eight-code allowlist has only 56 nonidentity pairs: a 64-entry eviction cannot be exercised through public pair inputs. Test a reusable bounded LRU directly or a constrained test capacity without fabricating production currencies.

Preserve: read-only owner-scoped SECURITY INVOKER RPC, exact decimal text, BigInt conversion, supported identity without I/O/timestamps, missing destination as null/unavailable, accepted ledger/aggregate originals. Applied migration `20260907083901_trip_fx_context.sql` must not be rewritten.

Current roadmap verified: P3, both T003 headings, S001, budget acceptance, T004 and T005 unchecked. No UI/motion work. Source audit is ongoing; this inventory is not implementation or runtime closure.
