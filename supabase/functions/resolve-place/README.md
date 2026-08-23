# resolve-place

JWT-protected Edge Function that resolves one persisted itinerary suggestion with Google Places (New) and atomically stores a trusted snapshot.

`POST /functions/v1/resolve-place` accepts only `{ "itineraryItemId": "UUID" }`. The caller never supplies a Google response, place ID, coordinates, address, category, or owner ID.

- `GOOGLE_PLACES_API_KEY` is a Supabase Edge Function secret only.
- Uses `POST https://places.googleapis.com/v1/places:searchText` and the fixed field mask `places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.types`.
- A result is persisted only when exactly one deterministic high-confidence
  candidate exists. Matching requires requested-name evidence from the provider
  canonical name or formatted address plus the primary destination locality;
  this supports localized canonical names without trusting `results[0]`.
  No result and ambiguity leave the row unchanged.
- Google calls have an 8-second default timeout (configurable 1–15 seconds) and one retry only for transport/5xx failures. Auth, 429, malformed response, no-match and ambiguity are not retried.
- No Google response cache is used for MVP: the durable verified snapshot prevents read-time provider calls and no observed query/cost evidence justifies another cache layer.

Local checks:

```powershell
npx --yes deno check supabase/functions/resolve-place/index.ts
npx --yes deno lint supabase/functions/resolve-place
npx --yes deno test supabase/functions/resolve-place/*_test.ts
```
