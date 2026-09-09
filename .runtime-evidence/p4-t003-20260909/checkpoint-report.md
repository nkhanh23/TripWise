# T003 SERVER PROVIDER ACCESS CHECKPOINT = PASS

This supersedes only the earlier preflight execution-path blocker; those historical
provider-preflight artifacts remain unchanged. It is not final FEATURE-P4-T003 closure.

## Implementation and verification

Created supabase/functions/discover-events/index.ts, events.ts, events_test.ts and
README.md. Added only [functions.discover-events] verify_jwt=true to supabase/config.toml.
Mobile, migrations, roadmap and unrelated functions were not modified.

Runtime contract/bounds/time/security semantics are documented in the function README.
Dedicated JWT-authenticated function accesses TICKETMASTER_API_KEY only on server.
Source inspection plus 54 tests cover strict request/parser, bytes, errors,
timeout, cancellation, absent fields, zero results and single provider call.

Fresh final gates (raw output and exact exits in checkpoint-*-raw/exit files):
- deno check supabase/functions/discover-events/index.ts: exit 0.
- deno lint supabase/functions/discover-events: exit 0.
- deno test supabase/functions/discover-events: exit 0; 54 passed, 0 failed.
- deno test --allow-env supabase/functions/explore-places: exit 0; 41 passed, 0 failed.
- deno test --allow-env supabase/functions/get-place-metadata: exit 0; 17 passed, 0 failed.
An initial lint run found an intentional control-character regex; rewritten as
character-code validation before these final gates. No test was disabled.
Mobile gates were not run: this checkpoint changes backend only.

## Deployment

npx --yes supabase functions deploy discover-events --project-ref bvblyrzbkyhcreimuumu --use-api
Exit 0. DEV version 1, ACTIVE, verify_jwt=true. The seven existing functions retain
their version/auth/status (checkpoint-deployment-scope.json).

npx --yes supabase functions download discover-events --project-ref bvblyrzbkyhcreimuumu --use-api --workdir .runtime-evidence/p4-t003-20260909/checkpoint-dev-download
Exit 0. Both runtime files index.ts and events.ts match local SHA256 byte-for-byte
(checkpoint-source-equivalence.json). Tests and README are not runtime bundle files.
The checked T001/T002 source/test manifests have zero mismatches.

## Single normal-user real-provider smoke

Normal signInWithPassword, authenticated role, non-anonymous, public client config.
Credentials were read from the user-authorized existing operator script without
executing it. No trip creation or service-role authentication was performed.

POST /functions/v1/discover-events:
city London, countryCode GB, startDateTime 2026-09-10T00:00:00Z,
endDateTime 2026-09-17T00:00:00Z, limit 3.
Upstream fixed https://app.ticketmaster.com/discovery/v2/events.json with size=3,
page=0, sort=date,asc, includeTest=no, includeTBA=no, includeTBD=no.
No upstream URL containing a credential was recorded.

Edge HTTP 200, provider HTTP 200, three genuine normalized events:
- 17uOv0G6CLhx0EA: London Eye - Standard Experience; venue KovZ9177wO7,
  The London Eye, latitude 51.500992, longitude -0.11735.
- 17uOv0G6GEptIVX: Madame Tussauds London - Standard Entry; venue KovZ9177YW0,
  Madame Tussauds London, latitude 51.52248, longitude -0.15526.
- 17uOv0G6uhjo1KI: London Dungeon - Standard Entry; venue KovZ9177wuf,
  The London Dungeon, latitude 51.500992, longitude -0.11735.

All three start at 2026-09-10T09:00:00Z, with supplied local date 2026-09-10,
time 10:00:00 and Europe/London. End absent. These are Ticketmaster event listings
for attraction admission; no claim that they are unique festivals/concerts.
All retain REVIEW_REQUIRED and SERVER_RECEIVED provenance. Server observation is
2026-09-09T12:52:19.759Z, not provider factual-update time. Client/server clock
skew exists in receipt evidence; no cross-host timestamp ordering is asserted.

Edge request ID: 01a08639-e743-76b4-8d90-c2cc823dad9d.
Edge execution ID: 8a59f0ed-dba6-40c7-bc4f-988538935bf2.
Client smoke exit 0. Raw normalized response and safe network metadata are saved
in checkpoint-live-response.json and checkpoint-live-network.json.

## Rate limits and count evidence

Observed numeric headers: rate-limit 5000, rate-limit-available 4999,
rate-limit-over 0, rate-limit-reset 1789044739634. No reliable per-second header.
PER-SECOND RATE LIMIT = UNRESOLVED / ACCOUNT-SPECIFIC.
Pagination reports size 3, number 0, totalElements 1183, totalPages 395; no next
page was fetched. Provider label is preserved; ATTRIBUTION DISPLAY REQUIREMENT =
REQUIRES FINAL T005 REVIEW. No branding/source-link requirement is invented.

One Edge client attempt, one execution identified by response header, one completed
Ticketmaster request reported by the verified server code with HTTP 200. This is
server-path evidence, not an independently obtained Ticketmaster access log.
No retries/fan-out/pagination. Cancellation is tested locally, not live; no claim
about upstream execution of a cancelled live request. No additional smoke sent.

## Impact and stop

No persistence path in function or smoke. No database writes, migrations, cache,
UI or mobile integration. No fresh before/after database snapshot is claimed.
No unrestricted quota/scale readiness or full T003 acceptance is claimed.
Roadmap untouched: T001/T002 accepted; P4, T003, T003-S001, attribution/bounded
results/provider-failure checklist, T004 and T005 all unchecked.

Final secret scan is in checkpoint-secret-scan.txt. Historical preflight artifacts
remain historical, not current status. See checkpoint-files.txt for exact artifacts.

FEATURE-P4-T004 NOT STARTED
