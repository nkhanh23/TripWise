\set ON_ERROR_STOP on

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception '%', p_message;
  end if;
end
$$;

select pg_temp.assert_true(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'home_country'
      and is_nullable = 'NO'
  ),
  'home_country was not added by upgrade.'
);
select pg_temp.assert_true(
  (select home_country = '' from public.profiles where id = '11111111-1111-4111-8111-111111111111'),
  'Existing profile did not receive the safe home_country default.'
);

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select pg_temp.assert_true(
  public.get_user_trip_stats() = '{"trips_count": 1, "saved_places_count": 1}'::jsonb,
  'Upgrade statistics mismatch.'
);
reset role;

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.get_user_trip_stats()', 'EXECUTE')
  and not has_function_privilege('anon', 'public.delete_user_account()', 'EXECUTE'),
  'Upgrade retained anon EXECUTE.'
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
  'Upgrade retained PUBLIC EXECUTE.'
);

select 'PROFILE_SETTINGS_UPGRADE_PASS' as result;
