# FEATURE-P4-T003 provider access preflight — 2026-09-09

Status: BLOCKED — SERVER_SIDE_PREFLIGHT_EXECUTION_PATH_REQUIRED

## Verified
- DEV project: bvblyrzbkyhcreimuumu.
- Live Management API secret/function inventory read: exit 0; TICKETMASTER_API_KEY present by NAME only. No secret values or digests captured.
- Remote function names: generate-trip, resolve-place, get-place-photo, get-place-metadata, get-wikimedia-image, explore-places, search-destinations. No event preflight harness present.
- Local event/provider search found no T003 implementation in mobile/src, supabase, docs or scripts.
- T001 manifest: 9 source/test entries match current SHA256; the only mismatch among 10 entries is phase_doc/PHASES_FEATURES.md, which now also records accepted T002. T002 manifest: 13/13 match. This is file integrity evidence, not fresh runtime/regression tests.
- Current roadmap: T001/T002 checked; P4, T003, T003-S001, Attribution/results/failure checklist, T004 and T005 unchecked. Roadmap not changed.

## Execution blocker
The configured secret is available inside hosted Edge Functions through Deno.env.get. No existing Ticketmaster execution path or remote Edge code-execution tool is available in this session. The task explicitly prohibits creating an Event Edge Function and changing unrelated production source. No function was created, modified or deployed. Secret presence does not prove provider access. No request was sent with a secret inventory digest or a substitute credential.

The request JSON is a proposal only, NOT an executed query. HTTP status, result count, events and runtime headers are null because there was no provider request; this is not a legitimate empty provider result or an authentication failure. Actual provider calls: 0. No retries, pagination, fan-out, persistence, fixtures, migrations or UI.

A permitted server-side diagnostic execution path with access to the existing secret is required to complete the single-call smoke. T003 implementation remains unstarted.

## Official provider terms reviewed
- Discovery API v2 supports a fixed event search endpoint and structured event/venue identity, date/time and location. Documented default daily quota: 5,000 calls/day. No runtime rate headers observed. PER-SECOND RATE LIMIT = UNRESOLVED / ACCOUNT-SPECIFIC. Do not adopt a universal per-second constant from conflicting documentation.
- Event Content may only be stored/cached for reasonable periods needed to provide the service; this is not permission for indefinite retention.
- Owner-requested content removal must occur within 24 hours.
- General terms restrict replacing Ticketmaster's essential experience and selling/leasing/sublicensing or deriving revenue from API use. Do not assume general commercial permission.
- No precise mandatory logo/text/source-link display rule established by this preflight. ATTRIBUTION DISPLAY REQUIREMENT = REQUIRES FINAL T005 REVIEW. No invented branding requirement. Source URLs were not captured because no provider response exists.

Official references:
- https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
- https://developer.ticketmaster.com/support/terms-of-use/
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/reference/api/v1-list-all-secrets

Only the six provider-* evidence artifacts in this directory were created. No production source changed; no deployment. Full gates were not run for this evidence-only blocked preflight.

FEATURE-P4-T004 NOT STARTED
