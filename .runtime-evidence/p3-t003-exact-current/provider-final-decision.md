# T003 corrective provider decision — 2026-09-08

**INSUFFICIENT_EVIDENCE — trusted FX provider rights unresolved**

RBA is removed from the approved/final production-source decision. No replacement is approved. The existing unaccepted `frankfurter-rba` implementation is preserved unchanged because the user explicitly requires STOP if a suitable source cannot be established. This is not a production clearance, source replacement, deployment, or successful corrective closure.

This decision supersedes the approval in `provider-selection.md` and `REVIEWER_CLOSURE.md`. Those historical files and raw evidence are preserved, not rewritten. See `provider-provenance-corrective-audit.md` for current official sources and unresolved questions.

## Decision criteria

All eight currencies (USD, VND, THB, JPY, EUR, GBP, SGD, KRW), actual underlying-data provenance, commercial derived-display rights, attribution, truthful reference dates, and compatibility with the unchanged seven-day maximum quote age must be established. API availability, software licensing, or a general permission detached from the dataset is insufficient.

## Results

| Candidate | Finding | Decision |
|---|---|---|
| Frankfurter / RBA | USD uses WM/Reuters Australian Dollar Fix; most other rates cross that USD observation. RBA permission explicitly excludes third-party-derived material without the relevant consent. No applicable downstream WMR permission established. | Reject as final production source. |
| ECB | Official daily reference series and reuse conditions are documented; VND is absent from its published currency list. | Cannot satisfy full coverage alone. No invented VND cross rate. |
| ExchangeRate-API Open Access | Explicit commercial conversion permission exists. Actual input sources are an undisclosed blend of central banks and commercial markets; no complete per-currency rights/provenance chain established. Update timestamp identifies blend publication, not necessarily fresh underlying observations. | Promising but insufficient for this task's exact-source requirement. This is not a claim that commercial conversion is prohibited. |
| Bank of Canada | Daily indicative quotes sourced from LSEG; VND absent from current list. | Cannot satisfy full coverage; no assertion of transferable third-party rights. |
| Banca d'Italia | Official method uses market sources and some central-bank rates; exact contributing vendors per currency are not identified in the method. Legal-notice fetch failed. | No fresh rights clearance. Do not carry forward the old categorical legal assertion as newly verified. |
| US Treasury reporting rates | Quarterly reporting schedule, confirmed by official IRS guidance. | Incompatible with unchanged seven-day quote age for routine daily use. Detailed rights/coverage audit not completed after this disqualifier. |

These are the evaluated candidates, not a claim that no suitable FX provider exists anywhere. No provider was contacted, subscription purchased, or credential created. Next prerequisite: obtain written exact-dataset provenance and downstream commercial conversion/display rights from a provider covering all eight currencies; then resume this same T003 corrective task.

## Stop boundary

No provider/cache implementation or tests changed. TTL refresh and LRU defects remain open. No live FX smoke was run because clearance is a prerequisite. Fresh mobile gates, persistence and remote verification were not run after invoking the user's explicit provider-audit STOP condition. Earlier passing logs are historical evidence only and must not be presented as corrective PASS.
