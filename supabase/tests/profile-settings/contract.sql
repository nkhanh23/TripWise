\set ON_ERROR_STOP on

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception '%', p_message;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'profile_unprivileged') then
    create role profile_unprivileged nologin;
  end if;
end
$$;

select pg_temp.assert_true(
  to_regprocedure('public.get_user_trip_stats()') is not null,
  'get_user_trip_stats() is missing.'
);
select pg_temp.assert_true(
  to_regprocedure('public.delete_user_account()') is not null,
  'delete_user_account() is missing.'
);
select pg_temp.assert_true(
  (select pronargs = 0 and not prosecdef and proconfig = array['search_path=""']
   from pg_proc where oid = 'public.get_user_trip_stats()'::regprocedure),
  'Stats RPC signature/security/search_path mismatch.'
);
select pg_temp.assert_true(
  (select pronargs = 0 and prosecdef and proconfig = array['search_path=""']
   from pg_proc where oid = 'public.delete_user_account()'::regprocedure),
  'Delete RPC signature/SECURITY DEFINER/search_path mismatch.'
);
select pg_temp.assert_true(
  has_function_privilege('authenticated', 'public.get_user_trip_stats()', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.delete_user_account()', 'EXECUTE'),
  'Authenticated EXECUTE grant is missing.'
);
select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.get_user_trip_stats()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.delete_user_account()', 'EXECUTE'),
  'Anon unexpectedly has EXECUTE.'
);
select pg_temp.assert_true(
  not has_function_privilege('profile_unprivileged', 'public.get_user_trip_stats()', 'EXECUTE')
  and not has_function_privilege('profile_unprivileged', 'public.delete_user_account()', 'EXECUTE'),
  'Unprivileged role unexpectedly inherits PUBLIC EXECUTE.'
);
select pg_temp.assert_true(
  not exists (
    select 1
    from pg_proc p,
      lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where p.oid in (
      'public.get_user_trip_stats()'::regprocedure,
      'public.delete_user_account()'::regprocedure
    )
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  'PUBLIC EXECUTE grant remains on a Profile RPC.'
);

insert into public.profiles (id, display_name, home_country)
values
  ('11111111-1111-4111-8111-111111111111', 'Owner A', 'VN'),
  ('22222222-2222-4222-8222-222222222222', 'Owner B', 'TH');

insert into public.trips (id, user_id, title, destination, start_date, end_date)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '11111111-1111-4111-8111-111111111111', 'A1', 'Hue', '2027-01-01', '2027-01-01'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '11111111-1111-4111-8111-111111111111', 'A2', 'Da Nang', '2027-02-01', '2027-02-01'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '22222222-2222-4222-8222-222222222222', 'B1', 'Bangkok', '2027-03-01', '2027-03-01');

insert into public.itinerary_days (id, trip_id, day_number, date)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaad1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 1, '2027-01-01'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbd1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 1, '2027-03-01');

insert into public.itinerary_items (id, itinerary_day_id, position, place_name)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaae1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaad1', 1, 'Owner A place'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbe1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbd1', 1, 'Owner B place');

insert into public.saved_places (user_id, google_place_id, place_name, latitude, longitude)
values
  ('11111111-1111-4111-8111-111111111111', 'owner-a-place-1', 'A saved 1', 10, 106),
  ('11111111-1111-4111-8111-111111111111', 'owner-a-place-2', 'A saved 2', 11, 107),
  ('22222222-2222-4222-8222-222222222222', 'owner-b-place-1', 'B saved 1', 13, 100);

set role authenticated;
select set_config('request.jwt.claim.sub', '', false);
do $$
begin
  begin
    perform public.delete_user_account();
    raise exception 'Unauthenticated delete unexpectedly succeeded.';
  exception when invalid_authorization_specification then
    null;
  end;
end
$$;
reset role;

select pg_temp.assert_true(
  (select count(*) from auth.users) = 2,
  'Unauthenticated delete changed auth users.'
);

set role anon;
do $$
begin
  begin
    perform public.get_user_trip_stats();
    raise exception 'Anon stats unexpectedly executed.';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.delete_user_account();
    raise exception 'Anon delete unexpectedly executed.';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;

set role profile_unprivileged;
do $$
begin
  begin
    perform public.get_user_trip_stats();
    raise exception 'Unprivileged stats unexpectedly executed.';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform public.delete_user_account();
    raise exception 'Unprivileged delete unexpectedly executed.';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select pg_temp.assert_true(
  public.get_user_trip_stats() = '{"trips_count": 2, "saved_places_count": 2}'::jsonb,
  'Owner A statistics mismatch.'
);
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
select pg_temp.assert_true(
  public.get_user_trip_stats() = '{"trips_count": 1, "saved_places_count": 1}'::jsonb,
  'Owner B statistics mismatch/cross-user leak.'
);
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.delete_user_account();
reset role;

select pg_temp.assert_true(not exists (
  select 1 from auth.users where id = '11111111-1111-4111-8111-111111111111'
), 'Owner A auth row was not deleted.');
select pg_temp.assert_true(not exists (
  select 1 from public.profiles where id = '11111111-1111-4111-8111-111111111111'
), 'Owner A profile did not cascade.');
select pg_temp.assert_true(not exists (
  select 1 from public.trips where user_id = '11111111-1111-4111-8111-111111111111'
), 'Owner A trips did not cascade.');
select pg_temp.assert_true(not exists (
  select 1 from public.itinerary_days where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaad1'
), 'Owner A itinerary days did not cascade.');
select pg_temp.assert_true(not exists (
  select 1 from public.itinerary_items where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaae1'
), 'Owner A itinerary items did not cascade.');
select pg_temp.assert_true(not exists (
  select 1 from public.saved_places where user_id = '11111111-1111-4111-8111-111111111111'
), 'Owner A saved places did not cascade.');
select pg_temp.assert_true(
  exists (select 1 from auth.users where id = '22222222-2222-4222-8222-222222222222')
  and exists (select 1 from public.profiles where id = '22222222-2222-4222-8222-222222222222')
  and exists (select 1 from public.trips where user_id = '22222222-2222-4222-8222-222222222222')
  and exists (select 1 from public.itinerary_days where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbd1')
  and exists (select 1 from public.itinerary_items where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbe1')
  and exists (select 1 from public.saved_places where user_id = '22222222-2222-4222-8222-222222222222'),
  'Owner B data was affected by Owner A deletion.'
);

select 'PROFILE_SETTINGS_CONTRACT_PASS' as result;
