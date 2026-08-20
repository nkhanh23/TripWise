# generate-trip

Authenticated Supabase Edge Function that validates a small personal-trip
request, calls Gemini with a structured JSON schema, validates the returned
itinerary again, and returns it without writing to the database.

## Contract

`POST /functions/v1/generate-trip` requires a signed-in Supabase user.

```json
{
  "destination": "Nha Trang",
  "startDate": "2026-09-01",
  "endDate": "2026-09-02",
  "travelers": 2,
  "budget": 3000000,
  "currency": "VND",
  "preferences": ["biển", "ẩm thực"],
  "notes": "Lịch trình thư thả"
}
```

Success uses `{ "data": GeneratedTrip }`. Errors use:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Safe client-facing message"
  }
}
```

Supported error codes are `INVALID_REQUEST`, `UNAUTHORIZED`, `AI_TIMEOUT`,
`AI_UNAVAILABLE`, `AI_INVALID_RESPONSE`, and `INTERNAL_ERROR`.

Place names and costs are AI suggestions. The response intentionally contains
no coordinates, Google Place IDs, photos, ratings, or opening-hours claims.

## Local validation

```powershell
npx --yes deno check supabase/functions/generate-trip/index.ts
npx --yes deno lint supabase/functions/generate-trip
npx --yes deno test supabase/functions/generate-trip/contract_test.ts supabase/functions/generate-trip/gemini_test.ts supabase/functions/generate-trip/handler_test.ts supabase/functions/generate-trip/prompt_test.ts
```

Unit tests mock the authentication and Gemini boundaries and do not call Gemini.
