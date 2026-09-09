# Provider Rights Recheck — Task B (2026-09-08)

Live official documentation and terms were audited on **2026-09-08** for AYR Tech (Pty) Ltd (`ExchangeRate-API`):
- Endpoint Documentation: `https://www.exchangerate-api.com/docs/free`
- Terms & Conditions of Use: `https://www.exchangerate-api.com/terms`

## Confirmation Findings

1. **Commercial currency conversion use:**
   - **Status:** CONFIRMED.
   - Text in `docs/free`: *"You're welcome to cache the data we respond with and to use it for either personal or commercial currency conversion purposes."*
   - Text in `terms`: *"both Free Plan and paid ExchangeRate-API accounts are suitable for either commercial or personal use."*

2. **Caching / storage permission:**
   - **Status:** CONFIRMED.
   - Text in `terms` (Data Caching Policy): *"Users are given permission to store & re-use any data retrieved from our API. Users are, however, strongly reminded of the terms in the LICENSE section above specifying that data gathered from our API cannot be re-distributed - caching is for customer end-use only."*

3. **Derived in-app conversion / display:**
   - **Status:** CONFIRMED.
   - Text in `terms` (LICENSE): *"ExchangeRate-API data may only be used for your end purposes and not in any product or service that offers programmatic or automatic access to exchange rate data."*
   - TripWise consumes data solely for internal travel budget and expense conversions displayed to authenticated users.

4. **Required Open Access attribution:**
   - **Status:** CONFIRMED.
   - Text in `docs/free`: *"Please support our service by adding attribution on the apps or pages you're using these rates with the link below: `<a href="https://www.exchangerate-api.com">Rates By Exchange Rate API</a>`"*
   - In TripWise: `FX_ATTRIBUTION = 'Rates By Exchange Rate API'` and `FX_ATTRIBUTION_URL = 'https://www.exchangerate-api.com'`. UI attribution is deferred to `FEATURE-P3-T005`.

5. **Raw feed / programmatic redistribution restriction:**
   - **Status:** CONFIRMED & COMPLIANT.
   - TripWise does NOT redistribute the raw feed or provide a public FX API. All conversions are internal to the client application.

## Conclusion
`PROVIDER_RIGHTS_RECHECK_PASS`: No material changes or contradictions were found. The provider selection remains valid and cleared for Task B.
