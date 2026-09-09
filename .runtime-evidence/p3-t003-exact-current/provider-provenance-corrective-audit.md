# Official FX provenance audit — 2026-09-08

Fresh official pages inspected with web tools; summaries below are evidence assessments, not legal opinions or guarantees. No blogs, AI summaries, or software licence were used to clear data rights. Public documentation reads are not provider smoke tests.

## RBA / Frankfurter

- [RBA Exchange Rate Definitions and Sources](https://www.rba.gov.au/statistics/frequency/definitions-sources.html), paragraphs following the title: since July 2008 USD uses the WM/Reuters Australian Dollar Fix at 16:00 Sydney, AUDFIX, four decimals. Most other rates cross USD with RBA bid/ask midpoint observations. Indicative market values, not dealer execution prices. Thus RBA is not the sole origin of the underlying data.
- [RBA copyright](https://www.rba.gov.au/copyright/), sections 3, 5 and 7: general financial-data commercial reuse is conditional; third-party material and derivatives need relevant consent. Attribution requires RBA and year; attribution alone does not establish permission. No applicable WMR third-party consent was established for TripWise.
- [RBA daily rates](https://www.rba.gov.au/statistics/frequency/exchange-rates.html): foreign units per AUD, business-day dates except NSW holidays; required currencies appear in the table. Removal from the TWI can remove future currency coverage. The page cautions against commercial/regulatory reliance.
- [Frankfurter RBA source page](https://frankfurter.dev/providers/rba/) and [v2 documentation](https://frankfurter.dev/): `providers=RBA` pins the source; `expand=providers` exposes contributors. Keyless, no monthly/daily quotas, abuse rate limiting without a published numeric ceiling. Frankfurter explicitly refers users to underlying providers' terms. Cross-pair normalization does not clear source rights.
- [LSEG WMR FX Benchmarks](https://www.lseg.com/en/ftse-russell/benchmarks/wmr-fx-benchmarks): distribution via LSEG platforms/feeds and authorised redistributors does not itself grant TripWise downstream rights for RBA-derived data.

Conclusion: reject RBA as final production source. Date semantics in current parser remain day precision at UTC midnight of the reference date; this is not the actual Sydney fixing timestamp. The existing request sends only currency codes and public source selectors with an Accept header, no private application fields or credentials.

## ECB

- [Exact reference dataset](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html): daily central-bank concertation around 14:10 CET; publication around 16:00 CET on working days, informational only. EUR base; USD, THB, JPY, GBP, SGD and KRW present; VND absent.
- [Copyright rules](https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html), Copyright: accurate reuse with source credit; disclose modifications and free availability when incorporating information in sold material. Do not treat this as proof that every market input is independently rights-free. Complete upstream vendor audit was not established; coverage already fails.
- Public dataset download requires no key. Frankfurter transport limits are described above if using its ECB adapter; direct ECB numeric request quota was not established. No production call or currency substitution implemented.

## ExchangeRate-API Open Access

- [Exact data methodology](https://www.exchangerate-api.com/product/our-exchange-rate-data): blends central-bank references with bid/ask midpoints from commercial markets, age-weighted. Per-pair underlying institutions/venues and permissions are not enumerated. Update time means a blend/edge-cache refresh; less-traded inputs can be older. Rates are indicative and unsuitable for trading.
- [Terms](https://www.exchangerate-api.com/terms), Licence and Data Caching: commercial end-use and caching permitted; redistribution/programmatic access products restricted. This supports commercial conversion but does not disclose the exact input rights chain demanded here.
- [Open endpoint documentation](https://www.exchangerate-api.com/docs/free): no key; updates daily; attribution link required where used. One request hourly is documented as safe; IP 429 block lasts 20 minutes. A multi-pair client cannot assume unlimited per-pair hourly requests comply. Last/next update fields describe publication, not necessarily a market reference instant.
- [Supported currencies](https://www.exchangerate-api.com/docs/supported-currencies): all eight required codes are listed.

Conclusion: not selected under the exact-provenance criterion; do not misstate the explicit commercial-conversion permission as a blanket ban. The free account tier with a key is distinct from Open Access. Any secret-bearing tier would require server-side transport; none created.

## Bank of Canada

- [Dataset methodology and currency list](https://www.bankofcanada.ca/rates/exchange/background-information-on-foreign-exchange-rates/): LSEG notional quotes aggregated into daily indicative CAD-per-foreign-unit rates; publication by 16:30 ET on business days. VND absent; the other seven required currencies listed, including THB added in 2026. Cross normalization would require explicit tests.
- [Terms, Exchange Rates disclaimer](https://www.bankofcanada.ca/terms/): identifies LSEG input and statistical/analytical intent, not execution benchmarks. No transferable third-party right inferred. Final attribution/licensing and direct API quota audit not completed because full currency coverage fails. Public page accessible without credentials; no secret-based integration evaluated.

## Banca d'Italia

- [Official portal introduction](https://www.bancaditalia.it/compiti/operazioni-cambi/portale-tassi/index.html?com.dotmarketing.htmlpage.language=1&dotcache=refresh) identifies daily and monthly/yearly series, indicative institutional/market sources.
- [Calculation of exchange rates, linked official PDF](https://www.bancaditalia.it/compiti/operazioni-cambi/portale-tassi/Calculation_of_exchange_rates.pdf?language_id=1): TARGET operating days after ECB publication; arithmetic means of market data and some central-bank rates, previous-24-hour quotations. It does not enumerate the exact per-currency source vendors/rights.
- Attempts to open the official legal-notice URLs returned web-tool Internal Error. Do not promote historical legal assertions to fresh findings. All-eight live coverage, redistribution/derived-display terms, attribution and direct API numeric quotas remain NOT ESTABLISHED. Frankfurter is keyless if used as intermediary; that is not rights clearance.

## Treasury screening

- [Official IRS manual 4.26.16](https://www.irs.gov/irm/part4/irm_04-026-016) identifies the Treasury reporting rates as quarterly (March/June/September/December end). This alone disqualifies routine use under TripWise's seven-day maximum reference age. The requested Fiscal Data dataset page returned a web-tool error; the legacy Treasury page redirected to a report index. Exact upstream source, all-eight coverage, attribution, commercial permission and API limits were not established. No public-domain clearance is claimed.

## Audit limitations

No applicable third-party permission document or executed data licence was supplied or found for the selected RBA chain. Commercial aggregator source opacity and missing VND coverage cannot be repaired by fake rates, softened parsers, or extending the seven-day policy. No provider is approved; invoke the user's STOP condition.
