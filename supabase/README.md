# Supabase schema

`migrations/20260819000000_supabase_personal_app_foundation.sql` defines the P1 personal-app schema: `profiles`, `trips`, `itinerary_days`, and `itinerary_items`. Each table has Row Level Security enabled; no anonymous table privileges are granted.

`migrations/20260819010000_auth_profile_foundation.sql` adds an idempotent
`auth.users` trigger that creates a matching `public.profiles` row using the
signup `display_name` metadata. It does not change RLS policies.

## Apply to a real project

After installing the Supabase CLI and authenticating, initialize and link this repository to the intended project, then apply pending migrations:

```powershell
npx supabase init
npx supabase link
npx supabase db push
```

Do not run `db push` until the selected project is confirmed. It changes the linked remote database.

## Generate TypeScript types

After the migration is applied and the project is linked, replace the handwritten P1 foundation at `mobile/src/lib/supabase/database.types.ts` with generated types:

```powershell
npx supabase gen types typescript --linked --schema public > mobile/src/lib/supabase/database.types.ts
```

For local Supabase development, use `--local` instead of `--linked`. These are the current Supabase CLI workflows; no local Docker stack is initialized by P1.
