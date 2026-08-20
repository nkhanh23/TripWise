create or replace function public.create_trip_graph(p_graph jsonb)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_trip_id uuid;
  v_start_date date;
  v_end_date date;
  v_day_date date;
  v_day_count integer;
  v_total_items integer := 0;
  v_day_ordinal bigint;
  v_item_ordinal bigint;
  v_day jsonb;
  v_item jsonb;
  v_has_latitude boolean;
  v_has_longitude boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;

  if jsonb_typeof(p_graph) is distinct from 'object' then
    raise exception 'Trip graph must be a JSON object.' using errcode = '22023';
  end if;

  if pg_column_size(p_graph) > 262144 then
    raise exception 'Trip graph exceeds the 256 KiB limit.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_graph) as top_level_key(value)
    where not (top_level_key.value = any (array[
      'title', 'destination', 'startDate', 'endDate',
      'estimatedBudget', 'currency', 'days'
    ]::text[]))
  ) then
    raise exception 'Trip graph contains an unsupported top-level field.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_graph -> 'title') is distinct from 'string'
     or length(btrim(p_graph ->> 'title')) not between 1 and 160 then
    raise exception 'title is required and must not exceed 160 characters.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_graph -> 'destination') is distinct from 'string'
     or length(btrim(p_graph ->> 'destination')) not between 1 and 120 then
    raise exception 'destination is required and must not exceed 120 characters.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_graph -> 'startDate') is distinct from 'string'
     or (p_graph ->> 'startDate') !~ '^\d{4}-\d{2}-\d{2}$'
     or jsonb_typeof(p_graph -> 'endDate') is distinct from 'string'
     or (p_graph ->> 'endDate') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'startDate and endDate must use YYYY-MM-DD.' using errcode = '22023';
  end if;

  v_start_date := (p_graph ->> 'startDate')::date;
  v_end_date := (p_graph ->> 'endDate')::date;

  if v_start_date::text <> (p_graph ->> 'startDate')
     or v_end_date::text <> (p_graph ->> 'endDate')
     or v_end_date < v_start_date then
    raise exception 'Trip date range is invalid.' using errcode = '22023';
  end if;

  if (v_end_date - v_start_date + 1) not between 1 and 14 then
    raise exception 'Trip duration must be between 1 and 14 days.' using errcode = '22023';
  end if;

  if p_graph ? 'estimatedBudget' and jsonb_typeof(p_graph -> 'estimatedBudget') <> 'null' then
    if jsonb_typeof(p_graph -> 'estimatedBudget') is distinct from 'number'
       or (p_graph ->> 'estimatedBudget')::numeric < 0
       or (p_graph ->> 'estimatedBudget')::numeric > 1000000000 then
      raise exception 'estimatedBudget must be a number from 0 to 1000000000.' using errcode = '22023';
    end if;
  end if;

  if p_graph ? 'currency' and jsonb_typeof(p_graph -> 'currency') <> 'null' then
    if jsonb_typeof(p_graph -> 'currency') is distinct from 'string'
       or (p_graph ->> 'currency') !~ '^[A-Z]{3}$' then
      raise exception 'currency must be a three-letter uppercase code.' using errcode = '22023';
    end if;
  end if;

  if jsonb_typeof(p_graph -> 'days') is distinct from 'array' then
    raise exception 'days must be an array.' using errcode = '22023';
  end if;

  v_day_count := jsonb_array_length(p_graph -> 'days');
  if v_day_count not between 1 and 14
     or v_day_count <> (v_end_date - v_start_date + 1) then
    raise exception 'days must contain exactly one entry per trip date, up to 14 days.' using errcode = '22023';
  end if;

  for v_day, v_day_ordinal in
    select input_day.value, input_day.ordinality
    from jsonb_array_elements(p_graph -> 'days') with ordinality as input_day(value, ordinality)
  loop
    if jsonb_typeof(v_day) is distinct from 'object' then
      raise exception 'Every itinerary day must be a JSON object.' using errcode = '22023';
    end if;

    if exists (
      select 1
      from jsonb_object_keys(v_day) as day_key(value)
      where not (day_key.value = any (array[
        'dayNumber', 'date', 'summary', 'items'
      ]::text[]))
    ) then
      raise exception 'An itinerary day contains an unsupported field.' using errcode = '22023';
    end if;

    if jsonb_typeof(v_day -> 'dayNumber') is distinct from 'number'
       or (v_day ->> 'dayNumber')::numeric <> trunc((v_day ->> 'dayNumber')::numeric)
       or (v_day ->> 'dayNumber')::numeric <> v_day_ordinal then
      raise exception 'dayNumber must be contiguous and match array order starting at 1.' using errcode = '22023';
    end if;

    if jsonb_typeof(v_day -> 'date') is distinct from 'string'
       or (v_day ->> 'date') !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Every itinerary day requires a YYYY-MM-DD date.' using errcode = '22023';
    end if;

    v_day_date := (v_day ->> 'date')::date;
    if v_day_date::text <> (v_day ->> 'date')
       or v_day_date <> v_start_date + (v_day_ordinal::integer - 1) then
      raise exception 'Day dates must be contiguous and match the trip date range.' using errcode = '22023';
    end if;

    if v_day ? 'summary' and jsonb_typeof(v_day -> 'summary') <> 'null' then
      if jsonb_typeof(v_day -> 'summary') is distinct from 'string'
         or length(btrim(v_day ->> 'summary')) not between 1 and 500 then
        raise exception 'Day summary must not exceed 500 characters.' using errcode = '22023';
      end if;
    end if;

    if jsonb_typeof(v_day -> 'items') is distinct from 'array'
       or jsonb_array_length(v_day -> 'items') not between 1 and 6 then
      raise exception 'Each itinerary day must contain between 1 and 6 items.' using errcode = '22023';
    end if;

    v_total_items := v_total_items + jsonb_array_length(v_day -> 'items');

    for v_item, v_item_ordinal in
      select input_item.value, input_item.ordinality
      from jsonb_array_elements(v_day -> 'items') with ordinality as input_item(value, ordinality)
    loop
      if jsonb_typeof(v_item) is distinct from 'object' then
        raise exception 'Every itinerary item must be a JSON object.' using errcode = '22023';
      end if;

      if exists (
        select 1
        from jsonb_object_keys(v_item) as item_key(value)
        where not (item_key.value = any (array[
          'position', 'googlePlaceId', 'placeName', 'placeQuery',
          'latitude', 'longitude', 'placeAddress', 'placeCategory',
          'startTime', 'endTime', 'note'
        ]::text[]))
      ) then
        raise exception 'An itinerary item contains an unsupported field.' using errcode = '22023';
      end if;

      if jsonb_typeof(v_item -> 'position') is distinct from 'number'
         or (v_item ->> 'position')::numeric <> trunc((v_item ->> 'position')::numeric)
         or (v_item ->> 'position')::numeric <> v_item_ordinal then
        raise exception 'Item position must be contiguous and match array order starting at 1.' using errcode = '22023';
      end if;

      if jsonb_typeof(v_item -> 'placeName') is distinct from 'string'
         or length(btrim(v_item ->> 'placeName')) not between 1 and 160 then
        raise exception 'placeName is required and must not exceed 160 characters.' using errcode = '22023';
      end if;

      if v_item ? 'placeQuery' and jsonb_typeof(v_item -> 'placeQuery') <> 'null' then
        if jsonb_typeof(v_item -> 'placeQuery') is distinct from 'string'
           or length(btrim(v_item ->> 'placeQuery')) not between 1 and 200 then
          raise exception 'placeQuery must not exceed 200 characters.' using errcode = '22023';
        end if;
      end if;

      if v_item ? 'googlePlaceId' and jsonb_typeof(v_item -> 'googlePlaceId') <> 'null' then
        if jsonb_typeof(v_item -> 'googlePlaceId') is distinct from 'string'
           or length(btrim(v_item ->> 'googlePlaceId')) not between 1 and 255 then
          raise exception 'googlePlaceId must not exceed 255 characters.' using errcode = '22023';
        end if;
      end if;

      if v_item ? 'placeAddress' and jsonb_typeof(v_item -> 'placeAddress') <> 'null' then
        if jsonb_typeof(v_item -> 'placeAddress') is distinct from 'string'
           or length(btrim(v_item ->> 'placeAddress')) not between 1 and 500 then
          raise exception 'placeAddress must not exceed 500 characters.' using errcode = '22023';
        end if;
      end if;

      if v_item ? 'placeCategory' and jsonb_typeof(v_item -> 'placeCategory') <> 'null' then
        if jsonb_typeof(v_item -> 'placeCategory') is distinct from 'string'
           or length(btrim(v_item ->> 'placeCategory')) not between 1 and 100 then
          raise exception 'placeCategory must not exceed 100 characters.' using errcode = '22023';
        end if;
      end if;

      if v_item ? 'note' and jsonb_typeof(v_item -> 'note') <> 'null' then
        if jsonb_typeof(v_item -> 'note') is distinct from 'string'
           or length(btrim(v_item ->> 'note')) not between 1 and 500 then
          raise exception 'Item note must not exceed 500 characters.' using errcode = '22023';
        end if;
      end if;

      if v_item ? 'startTime' and jsonb_typeof(v_item -> 'startTime') <> 'null' then
        if jsonb_typeof(v_item -> 'startTime') is distinct from 'string'
           or (v_item ->> 'startTime') !~ '^([01]\d|2[0-3]):[0-5]\d$' then
          raise exception 'startTime must use HH:MM.' using errcode = '22023';
        end if;
      end if;

      if v_item ? 'endTime' and jsonb_typeof(v_item -> 'endTime') <> 'null' then
        if jsonb_typeof(v_item -> 'endTime') is distinct from 'string'
           or (v_item ->> 'endTime') !~ '^([01]\d|2[0-3]):[0-5]\d$' then
          raise exception 'endTime must use HH:MM.' using errcode = '22023';
        end if;
      end if;

      if jsonb_typeof(v_item -> 'startTime') = 'string'
         and jsonb_typeof(v_item -> 'endTime') = 'string'
         and (v_item ->> 'endTime')::time < (v_item ->> 'startTime')::time then
        raise exception 'endTime must not be earlier than startTime.' using errcode = '22023';
      end if;

      v_has_latitude := v_item ? 'latitude' and jsonb_typeof(v_item -> 'latitude') <> 'null';
      v_has_longitude := v_item ? 'longitude' and jsonb_typeof(v_item -> 'longitude') <> 'null';

      if v_has_latitude <> v_has_longitude then
        raise exception 'latitude and longitude must both be null or both be provided.' using errcode = '22023';
      end if;

      if v_has_latitude then
        if jsonb_typeof(v_item -> 'latitude') is distinct from 'number'
           or jsonb_typeof(v_item -> 'longitude') is distinct from 'number'
           or (v_item ->> 'latitude')::numeric not between -90 and 90
           or (v_item ->> 'longitude')::numeric not between -180 and 180 then
          raise exception 'Coordinates are outside the valid range.' using errcode = '22023';
        end if;
      end if;
    end loop;
  end loop;

  if v_total_items > 84 then
    raise exception 'Trip graph exceeds the 84-item limit.' using errcode = '22023';
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
    btrim(p_graph ->> 'title'),
    btrim(p_graph ->> 'destination'),
    v_start_date,
    v_end_date,
    case
      when jsonb_typeof(p_graph -> 'estimatedBudget') = 'number'
        then (p_graph ->> 'estimatedBudget')::numeric
      else null
    end,
    case
      when jsonb_typeof(p_graph -> 'currency') = 'string'
        then p_graph ->> 'currency'
      else null
    end
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
    (input_day.value ->> 'date')::date,
    nullif(btrim(input_day.value ->> 'summary'), '')
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
    nullif(btrim(input_item.value ->> 'googlePlaceId'), ''),
    btrim(input_item.value ->> 'placeName'),
    nullif(btrim(input_item.value ->> 'placeQuery'), ''),
    case
      when jsonb_typeof(input_item.value -> 'latitude') = 'number'
        then (input_item.value ->> 'latitude')::double precision
      else null
    end,
    case
      when jsonb_typeof(input_item.value -> 'longitude') = 'number'
        then (input_item.value ->> 'longitude')::double precision
      else null
    end,
    nullif(btrim(input_item.value ->> 'placeAddress'), ''),
    nullif(btrim(input_item.value ->> 'placeCategory'), ''),
    case
      when jsonb_typeof(input_item.value -> 'startTime') = 'string'
        then (input_item.value ->> 'startTime')::time
      else null
    end,
    case
      when jsonb_typeof(input_item.value -> 'endTime') = 'string'
        then (input_item.value ->> 'endTime')::time
      else null
    end,
    nullif(btrim(input_item.value ->> 'note'), '')
  from jsonb_array_elements(p_graph -> 'days') as input_day(value)
  join public.itinerary_days as persisted_day
    on persisted_day.trip_id = v_trip_id
   and persisted_day.day_number = (input_day.value ->> 'dayNumber')::integer
  cross join lateral jsonb_array_elements(input_day.value -> 'items') as input_item(value);

  return v_trip_id;
end;
$$;

comment on function public.create_trip_graph(jsonb) is
  'Atomically creates one bounded, owner-derived trip graph. Rejects unknown fields and malformed trip/day/item structures; idempotency and public error mapping remain separate tasks.';

revoke all on function public.create_trip_graph(jsonb) from public, anon;
grant execute on function public.create_trip_graph(jsonb) to authenticated;
