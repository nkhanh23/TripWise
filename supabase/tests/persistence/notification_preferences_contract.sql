\set ON_ERROR_STOP on
begin;
create function pg_temp.np_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Notification preference assertion failed: %',label; end if; end $$;

select pg_temp.np_assert((select relrowsecurity from pg_class where oid='public.notification_preferences'::regclass),'RLS enabled');
select pg_temp.np_assert(not has_table_privilege('anon','public.notification_preferences','SELECT,INSERT,UPDATE,DELETE,TRUNCATE'),'anonymous no grants');
select pg_temp.np_assert(not has_table_privilege('authenticated','public.notification_preferences','DELETE,TRUNCATE'),'no delete/truncate path');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.notification_preferences default values;
select pg_temp.np_assert((select not trip_reminders and not itinerary_reminders from public.notification_preferences),'defaults false and owner select');
insert into public.notification_preferences default values on conflict(user_id) do nothing;
update public.notification_preferences set trip_reminders=true;
select pg_temp.np_assert((select trip_reminders and not itinerary_reminders and user_id=auth.uid() from public.notification_preferences),'owner update and server identity');
do $$ begin
  begin insert into public.notification_preferences(user_id) values('22222222-2222-4222-8222-222222222222');
    raise exception 'Cross-owner insert accepted'; exception when insufficient_privilege then null; end;
  begin update public.notification_preferences set user_id='22222222-2222-4222-8222-222222222222';
    raise exception 'Owner reassignment accepted'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select pg_temp.np_assert((select count(*)=0 from public.notification_preferences),'B cannot read A');
do $$ declare affected integer; begin
  update public.notification_preferences set trip_reminders=false where user_id='11111111-1111-4111-8111-111111111111';
  get diagnostics affected=row_count;
  perform pg_temp.np_assert(affected=0,'B cannot update A');
end $$;
insert into public.notification_preferences(itinerary_reminders) values(true);
select pg_temp.np_assert((select count(*)=1 from public.notification_preferences),'one row per own user');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select pg_temp.np_assert((select trip_reminders and not itinerary_reminders from public.notification_preferences),'A unchanged and cannot read B');
update public.notification_preferences set trip_reminders=false;
select pg_temp.np_assert((select not trip_reminders from public.notification_preferences),'revocation persisted');
update public.notification_preferences set updated_at='2000-01-01';
select pg_temp.np_assert((select updated_at=now() from public.notification_preferences),'updated_at server trigger');
select set_config('request.jwt.claim.sub','',true);
select pg_temp.np_assert((select count(*)=0 from public.notification_preferences),'authenticated without owner sees nothing');
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.notification_preferences; raise exception 'Anonymous select accepted'; exception when insufficient_privilege then null; end;
  begin insert into public.notification_preferences default values; raise exception 'Anonymous insert accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.users where id='11111111-1111-4111-8111-111111111111';
select pg_temp.np_assert((select count(*)=0 from public.notification_preferences where user_id='11111111-1111-4111-8111-111111111111'),'owner deletion cascades');
select 'NOTIFICATION_PREFERENCES_RLS_PASS' as result;
rollback;
