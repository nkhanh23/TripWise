# Provider Smoke Summary — Task B (2026-09-08)

Live smoke test performed against production endpoint:
- **URL:** https://open.er-api.com/v6/latest/USD
- **HTTP Status:** 200 OK
- **Result:** success
- **Base Currency:** USD
- **Provider:** https://www.exchangerate-api.com
- **Documentation:** https://www.exchangerate-api.com/docs/free
- **Terms of Use:** https://www.exchangerate-api.com/terms
- **Publication Timestamp (quotedAt):** 2026-09-08T00:02:31.000Z

## Supported Eight Currencies Rates
| Currency | Rate per USD | Rate Valid |
|---|---|---|
| USD | 1 | Yes |
| VND | 25969.409056 | Yes |
| THB | 32.880758 | Yes |
| JPY | 154.414743 | Yes |
| EUR | 0.860364 | Yes |
| GBP | 0.738631 | Yes |
| SGD | 1.265814 | Yes |
| KRW | 1345.378849 | Yes |

- **USD exact rate:** 1 (matches exact 1)
- **Representative Cross-Rate (EUR -> VND):** 30184.211631356030703284 (usd-cross-half-up-18dp, state: fresh)

## Privacy & Security Verification
- Request method: GET
- Request headers: Accept: application/json
- Private parameters sent: None (no user ID, trip ID, JWT, budget, or expense data).
- Rate persistence: Not persisted into test fixtures or application DB.
