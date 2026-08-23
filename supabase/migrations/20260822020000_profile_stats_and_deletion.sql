-- Migration: 20260822020000_profile_stats_and_deletion.sql
-- Description: Adds home_country to profiles, trip stats RPC, and secure account deletion.

-- 1. Add home_country
alter table public.profiles
  add column home_country varchar(2) not null default '';

-- 2. Add trip stats RPC
create or replace function public.get_user_trip_stats()
returns jsonb
language sql
security invoker
set search_path = ''
as '
  select jsonb_build_object(
    ''trips_count'', (select count(*) from public.trips where user_id = auth.uid())
  );
';

grant execute on function public.get_user_trip_stats() to authenticated;

-- 3. Add secure account deletion RPC
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as '
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception ''Not authenticated'';
  end if;

  delete from auth.users where id = v_uid;
end;
';

grant execute on function public.delete_user_account() to authenticated;
