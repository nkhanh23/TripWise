-- Migration: 20260822010000_add_saved_places_update_policy.sql
-- Description: Adds UPDATE grant and policy for saved_places to support idempotent upsert.

grant update on public.saved_places to authenticated;

drop policy if exists "saved_places_update_own" on public.saved_places;

create policy "saved_places_update_own"
on public.saved_places
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
