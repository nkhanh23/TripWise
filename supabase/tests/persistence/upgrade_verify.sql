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

  if not exists (
    select 1
    from public.trips as trip
    join public.itinerary_days as day on day.trip_id = trip.id
    join public.itinerary_items as item on item.itinerary_day_id = day.id
    where trip.id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and trip.workspace_revision = 1
      and item.item_kind = 'place'
      and item.flexibility = 'fixed'
      and item.priority = 'must_do'
      and item.activity_status = 'scheduled'
      and item.completed_at is null
      and item.skipped_at is null
      and not item.accommodation_details_present
      and item.place_resolved_at is null
  ) then
    raise exception 'Workspace legacy defaults did not preserve the legacy graph.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.itinerary_items'::regclass
      and conname in (
        'itinerary_items_kind_check',
        'itinerary_items_flexibility_check',
        'itinerary_items_priority_check',
        'itinerary_items_activity_status_check',
        'itinerary_items_activity_status_timestamp_check',
        'itinerary_items_place_like_provider_fields_check',
        'itinerary_items_note_schedule_check',
        'itinerary_items_accommodation_timestamp_check',
        'itinerary_items_accommodation_nights_check'
      )
    group by conrelid
    having count(*) = 9
  ) then
    raise exception 'Workspace enum/status/provenance constraints are incomplete after upgrade.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.itinerary_item_source_links'::regclass
      and relrowsecurity
  ) then
    raise exception 'Workspace source links table/RLS is missing after upgrade.';
  end if;

  if not has_function_privilege(
    'authenticated', 'public.create_trip_graph(text,jsonb)', 'EXECUTE'
  ) then
    raise exception 'Authenticated RPC grant is missing after upgrade.';
  end if;

  if to_regprocedure('public.mutate_travel_workspace(jsonb)') is null
     or not has_function_privilege('authenticated', 'public.mutate_travel_workspace(jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.mutate_travel_workspace(jsonb)', 'EXECUTE')
     or exists (
       select 1 from pg_proc
       where oid='public.mutate_travel_workspace(jsonb)'::regprocedure
         and prosecdef
     ) then
    raise exception 'T003 SECURITY INVOKER RPC/grant contract is missing after upgrade.';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid='public.itinerary_days'::regclass
      and conname='itinerary_days_trip_day_number_key'
      and condeferrable
  ) or not exists (
    select 1 from pg_constraint
    where conrelid='public.itinerary_items'::regclass
      and conname='itinerary_items_day_position_key'
      and condeferrable
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid='public.itinerary_days'::regclass
      and tgname='itinerary_days_enforce_contiguous_numbers'
      and tgdeferrable
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid='public.itinerary_items'::regclass
      and tgname='itinerary_items_enforce_contiguous_positions'
      and tgdeferrable
  ) then
    raise exception 'Deferred ordering-contiguity invariant is missing after upgrade.';
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
