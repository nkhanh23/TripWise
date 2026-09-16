-- FEATURE-P6-T003: durable, owner-private notification intent. OS permission is device-local.
create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  trip_reminders boolean not null default false,
  itinerary_reminders boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select, insert, update on public.notification_preferences to authenticated;

create policy "notification_preferences_select_own"
on public.notification_preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy "notification_preferences_insert_own"
on public.notification_preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "notification_preferences_update_own"
on public.notification_preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on table public.notification_preferences is
  'FEATURE-P6-T003 durable owner intent only. Android notification permission remains device-local and is never persisted here.';
