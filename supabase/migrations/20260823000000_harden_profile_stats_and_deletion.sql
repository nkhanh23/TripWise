-- Migration: 20260823000000_harden_profile_stats_and_deletion.sql
-- Description: Hardens Profile RPC privileges and adds an owner-scoped Saved Places count.

create or replace function public.get_user_trip_stats()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as '
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using
      errcode = ''28000'',
      message = ''Not authenticated'';
  end if;

  return jsonb_build_object(
    ''trips_count'', (
      select count(*)
      from public.trips
      where user_id = v_uid
    ),
    ''saved_places_count'', (
      select count(*)
      from public.saved_places
      where user_id = v_uid
    )
  );
end;
';

create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
set search_path = ''
as '
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using
      errcode = ''28000'',
      message = ''Not authenticated'';
  end if;

  delete from auth.users
  where id = v_uid;
end;
';

revoke all on function public.get_user_trip_stats() from public, anon, authenticated;
revoke all on function public.delete_user_account() from public, anon, authenticated;

grant execute on function public.get_user_trip_stats() to authenticated;
grant execute on function public.delete_user_account() to authenticated;
