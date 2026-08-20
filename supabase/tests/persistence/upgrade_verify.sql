\set ON_ERROR_STOP on

do $$
begin
  if not exists (
    select 1
    from public.trips t
    join public.itinerary_days d on d.trip_id = t.id
    join public.itinerary_items i on i.itinerary_day_id = d.id
    where t.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and t.idempotency_key is null
      and t.idempotency_request_hash is null
      and i.place_query is null
      and i.latitude = 16.463700
      and i.longitude = 107.590900
  ) then
    raise exception 'Upgrade compatibility did not preserve the legacy graph.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.itinerary_items'::regclass
      and conname = 'itinerary_items_coordinate_pair_check'
  ) then
    raise exception 'Coordinate-pair invariant is missing after upgrade.';
  end if;

  if not has_function_privilege(
    'authenticated', 'public.create_trip_graph(text,jsonb)', 'EXECUTE'
  ) then
    raise exception 'Authenticated RPC grant is missing after upgrade.';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
begin
  if (select count(*) from public.trips where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 1
     or (select count(*) from public.itinerary_days where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1
     or (select count(*) from public.itinerary_items where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') <> 1 then
    raise exception 'Legacy owner cannot read the upgraded graph through RLS.';
  end if;
end
$$;

reset role;
select 'upgrade_compatibility_pass' as result;

