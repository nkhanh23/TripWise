create function public.create_trip_graph(p_graph jsonb)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_trip_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if jsonb_typeof(p_graph) is distinct from 'object'
     or jsonb_typeof(p_graph -> 'days') is distinct from 'array' then
    raise exception 'Trip graph must contain a days array.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_graph -> 'days') = 0 then
    raise exception 'Trip graph must contain at least one itinerary day.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_graph -> 'days') as input_day(value)
    where jsonb_typeof(input_day.value -> 'items') is distinct from 'array'
  ) then
    raise exception 'Every itinerary day must contain an items array.' using errcode = '22023';
  end if;

  insert into public.trips (
    user_id,
    title,
    destination,
    start_date,
    end_date,
    estimated_budget,
    currency
  )
  values (
    v_user_id,
    p_graph ->> 'title',
    p_graph ->> 'destination',
    (p_graph ->> 'startDate')::date,
    (p_graph ->> 'endDate')::date,
    nullif(p_graph ->> 'estimatedBudget', '')::numeric,
    nullif(p_graph ->> 'currency', '')::char(3)
  )
  returning id into v_trip_id;

  insert into public.itinerary_days (
    trip_id,
    day_number,
    date,
    summary
  )
  select
    v_trip_id,
    (input_day.value ->> 'dayNumber')::integer,
    nullif(input_day.value ->> 'date', '')::date,
    input_day.value ->> 'summary'
  from jsonb_array_elements(p_graph -> 'days') as input_day(value);

  insert into public.itinerary_items (
    itinerary_day_id,
    position,
    google_place_id,
    place_name,
    place_query,
    latitude,
    longitude,
    place_address,
    place_category,
    start_time,
    end_time,
    note
  )
  select
    persisted_day.id,
    (input_item.value ->> 'position')::integer,
    input_item.value ->> 'googlePlaceId',
    input_item.value ->> 'placeName',
    input_item.value ->> 'placeQuery',
    nullif(input_item.value ->> 'latitude', '')::double precision,
    nullif(input_item.value ->> 'longitude', '')::double precision,
    input_item.value ->> 'placeAddress',
    input_item.value ->> 'placeCategory',
    nullif(input_item.value ->> 'startTime', '')::time,
    nullif(input_item.value ->> 'endTime', '')::time,
    input_item.value ->> 'note'
  from jsonb_array_elements(p_graph -> 'days') as input_day(value)
  join public.itinerary_days as persisted_day
    on persisted_day.trip_id = v_trip_id
   and persisted_day.day_number = (input_day.value ->> 'dayNumber')::integer
  cross join lateral jsonb_array_elements(input_day.value -> 'items') as input_item(value);

  return v_trip_id;
end;
$$;

comment on function public.create_trip_graph(jsonb) is
  'Atomically creates one authenticated owner trip with its nested days and items. Validation hardening and idempotency are handled by later BE-P4 tasks.';

revoke all on function public.create_trip_graph(jsonb) from public, anon;
grant execute on function public.create_trip_graph(jsonb) to authenticated;
