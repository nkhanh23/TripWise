


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."apply_verified_place_snapshot"("p_owner_id" "uuid", "p_item_id" "uuid", "p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text" DEFAULT NULL::"text", "p_place_category" "text" DEFAULT NULL::"text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_resolved_at timestamptz := clock_timestamp();
begin
  if p_owner_id is null or p_item_id is null
     or length(btrim(coalesce(p_google_place_id, ''))) not between 1 and 255
     or length(btrim(coalesce(p_place_name, ''))) not between 1 and 160
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180
     or (p_place_address is not null and length(btrim(p_place_address)) > 500)
     or (p_place_category is not null and length(btrim(p_place_category)) > 100) then
    raise exception 'Verified place snapshot is invalid.' using errcode = '22023';
  end if;

  update public.itinerary_items as item
  set google_place_id = btrim(p_google_place_id),
      place_name = btrim(p_place_name),
      latitude = p_latitude,
      longitude = p_longitude,
      place_address = nullif(btrim(p_place_address), ''),
      place_category = nullif(btrim(p_place_category), ''),
      place_resolved_at = v_resolved_at
  from public.itinerary_days as day
  join public.trips as trip on trip.id = day.trip_id
  where item.id = p_item_id
    and item.itinerary_day_id = day.id
    and trip.user_id = p_owner_id;

  if not found then
    raise exception 'Itinerary item was not found for the authenticated owner.' using errcode = 'P0002';
  end if;

  return v_resolved_at;
end;
$$;


ALTER FUNCTION "public"."apply_verified_place_snapshot"("p_owner_id" "uuid", "p_item_id" "uuid", "p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."apply_verified_place_snapshot"("p_owner_id" "uuid", "p_item_id" "uuid", "p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") IS 'Service-role-only atomic Google Places snapshot writer. p_owner_id must be derived from a verified Edge Function JWT, never client input.';



CREATE OR REPLACE FUNCTION "public"."bump_workspace_revision_from_day"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.trips set workspace_revision = workspace_revision where id = new.trip_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.trips set workspace_revision = workspace_revision where id = old.trip_id;
    return old;
  end if;

  update public.trips set workspace_revision = workspace_revision where id in (new.trip_id, old.trip_id);
  return new;
end;
$$;


ALTER FUNCTION "public"."bump_workspace_revision_from_day"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_workspace_revision_from_item"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    from public.itinerary_days as day
    where day.id = new.itinerary_day_id and trip.id = day.trip_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    from public.itinerary_days as day
    where day.id = old.itinerary_day_id and trip.id = day.trip_id;
    return old;
  end if;

  update public.trips as trip
  set workspace_revision = trip.workspace_revision
  where trip.id in (
    select day.trip_id from public.itinerary_days as day
    where day.id in (new.itinerary_day_id, old.itinerary_day_id)
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."bump_workspace_revision_from_item"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_workspace_revision_from_source_link"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if tg_op = 'INSERT' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    where trip.id in (
      select day.trip_id
      from public.itinerary_items as item
      join public.itinerary_days as day on day.id = item.itinerary_day_id
      where item.id = new.itinerary_item_id
    );
    return new;
  elsif tg_op = 'DELETE' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    where trip.id in (
      select day.trip_id
      from public.itinerary_items as item
      join public.itinerary_days as day on day.id = item.itinerary_day_id
      where item.id = old.itinerary_item_id
    );
    return old;
  end if;

  update public.trips as trip
  set workspace_revision = trip.workspace_revision
  where trip.id in (
    select day.trip_id
    from public.itinerary_items as item
    join public.itinerary_days as day on day.id = item.itinerary_day_id
    where item.id in (new.itinerary_item_id, old.itinerary_item_id)
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."bump_workspace_revision_from_source_link"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."create_profile_for_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_travel_workspace_item"("p_command" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
declare
  v_user_id uuid := (select auth.uid());
  v_trip_id uuid;
  v_day_id uuid;
  v_revision integer;
  v_current_revision integer;
  v_title text;
  v_flexibility text;
  v_priority text;
  v_start time;
  v_end time;
  v_position integer;
  v_item_id uuid;
begin
  if v_user_id is null then raise exception 'Authentication is required.' using errcode = 'TW006'; end if;
  if p_command is null or jsonb_typeof(p_command) <> 'object' or octet_length(p_command::text) > 50000
     or not (p_command - 'type' - 'tripId' - 'dayId' - 'expectedRevision' - 'item' = '{}'::jsonb)
     or p_command->>'type' <> 'create_item'
     or jsonb_typeof(p_command->'tripId') <> 'string' or jsonb_typeof(p_command->'dayId') <> 'string'
     or jsonb_typeof(p_command->'expectedRevision') <> 'number' or jsonb_typeof(p_command->'item') <> 'object' then
    raise exception 'Workspace create command is invalid.' using errcode = 'TW007';
  end if;
  begin
    v_trip_id := (p_command->>'tripId')::uuid; v_day_id := (p_command->>'dayId')::uuid;
  exception when invalid_text_representation then raise exception 'Workspace create command is invalid.' using errcode = 'TW007'; end;
  if (p_command->>'expectedRevision') !~ '^[1-9][0-9]*$' then raise exception 'Workspace create command is invalid.' using errcode = 'TW007'; end if;
  v_revision := (p_command->>'expectedRevision')::integer;
  if not ((p_command->'item') - 'itemKind' - 'title' - 'flexibility' - 'priority' - 'startTime' - 'endTime' = '{}'::jsonb)
     or p_command->'item'->>'itemKind' <> 'custom_activity'
     or jsonb_typeof(p_command->'item'->'title') <> 'string'
     or jsonb_typeof(p_command->'item'->'flexibility') <> 'string'
     or jsonb_typeof(p_command->'item'->'priority') <> 'string'
     or (p_command->'item' ? 'startTime' and jsonb_typeof(p_command->'item'->'startTime') <> 'string'::text and jsonb_typeof(p_command->'item'->'startTime') <> 'null'::text)
     or (p_command->'item' ? 'endTime' and jsonb_typeof(p_command->'item'->'endTime') <> 'string'::text and jsonb_typeof(p_command->'item'->'endTime') <> 'null'::text) then
    raise exception 'Workspace item payload is invalid.' using errcode = 'TW014';
  end if;
  v_title := btrim(p_command->'item'->>'title'); v_flexibility := p_command->'item'->>'flexibility'; v_priority := p_command->'item'->>'priority';
  if length(v_title) not between 1 and 160 or v_flexibility not in ('fixed','flexible') or v_priority not in ('must_do','want_to_do','optional') then
    raise exception 'Workspace item payload is invalid.' using errcode = 'TW014';
  end if;
  begin
    v_start := nullif(p_command->'item'->>'startTime','')::time; v_end := nullif(p_command->'item'->>'endTime','')::time;
  exception when invalid_datetime_format then raise exception 'Workspace item payload is invalid.' using errcode = 'TW014'; end;
  if (v_start is not null and to_char(v_start,'HH24:MI') <> p_command->'item'->>'startTime')
     or (v_end is not null and to_char(v_end,'HH24:MI') <> p_command->'item'->>'endTime')
     or (v_start is not null and v_end is not null and v_end < v_start) then
    raise exception 'Workspace item payload is invalid.' using errcode = 'TW014';
  end if;

  select workspace_revision into v_current_revision from public.trips
  where id = v_trip_id and user_id = v_user_id for update;
  if not found then raise exception 'Trip was not found.' using errcode = 'TW008'; end if;
  if v_current_revision <> v_revision then raise exception 'Trip was updated elsewhere.' using errcode = 'TW009'; end if;
  perform 1 from public.itinerary_days where id = v_day_id and trip_id = v_trip_id for key share;
  if not found then raise exception 'Day was not found.' using errcode = 'TW008'; end if;
  select coalesce(max(position), 0) + 1 into v_position from public.itinerary_items where itinerary_day_id = v_day_id;
  insert into public.itinerary_items(itinerary_day_id, position, place_name, item_kind, flexibility, priority, activity_status, start_time, end_time)
  values (v_day_id, v_position, v_title, 'custom_activity', v_flexibility, v_priority, 'scheduled', v_start, v_end)
  returning id into v_item_id;
  select workspace_revision into v_current_revision from public.trips where id = v_trip_id;
  return jsonb_build_object('itemId', v_item_id, 'revision', v_current_revision);
exception
  when sqlstate 'TW006' then raise; when sqlstate 'TW007' then raise; when sqlstate 'TW008' then raise;
  when sqlstate 'TW009' then raise; when sqlstate 'TW011' then raise; when sqlstate 'TW014' then raise;
  when check_violation then raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
  when others then raise exception 'Workspace item creation failed.' using errcode = 'TW007';
end;
$_$;


ALTER FUNCTION "public"."create_travel_workspace_item"("p_command" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_travel_workspace_item"("p_command" "jsonb") IS 'FEATURE-P2-T001 SECURITY INVOKER owner-scoped CAS creation. Only appends CUSTOM_ACTIVITY items; the trip row lock serializes append position and revision.';



CREATE OR REPLACE FUNCTION "public"."create_trip_graph"("p_graph" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
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
$_$;


ALTER FUNCTION "public"."create_trip_graph"("p_graph" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_trip_graph"("p_graph" "jsonb") IS 'Atomically creates one bounded, owner-derived trip graph. Rejects unknown fields and malformed trip/day/item structures; idempotency and public error mapping remain separate tasks.';



CREATE OR REPLACE FUNCTION "public"."create_trip_graph"("p_idempotency_key" "text", "p_graph" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_constraint_name text;
begin
  begin
    return tripwise_private.create_trip_graph(p_idempotency_key, p_graph);
  exception
    when invalid_authorization_specification then
      raise exception using
        errcode = 'TW002',
        message = 'Authentication is required.';
    when data_exception then
      raise exception using
        errcode = 'TW001',
        message = 'Trip persistence input is invalid.';
    when unique_violation then
      get stacked diagnostics v_constraint_name = constraint_name;

      if coalesce(v_constraint_name, '') = '' then
        raise exception using
          errcode = 'TW004',
          message = 'The idempotency key is already associated with a different request.';
      end if;

      raise exception using
        errcode = 'TW005',
        message = 'Unable to persist trip.';
    when insufficient_privilege then
      raise exception using
        errcode = 'TW003',
        message = 'Trip persistence is not permitted.';
    when integrity_constraint_violation then
      raise exception using
        errcode = 'TW005',
        message = 'Unable to persist trip.';
    when others then
      raise exception using
        errcode = 'TW005',
        message = 'Unable to persist trip.';
  end;
end;
$$;


ALTER FUNCTION "public"."create_trip_graph"("p_idempotency_key" "text", "p_graph" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_trip_graph"("p_idempotency_key" "text", "p_graph" "jsonb") IS 'Stable trip-persistence boundary. Returns UUID on success and raises TW001 validation, TW002 unauthenticated, TW003 forbidden, TW004 idempotency conflict, or TW005 unexpected database failure without exposing internal details.';



CREATE OR REPLACE FUNCTION "public"."delete_saved_trip"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_trip_id is null then
    raise exception 'Trip ID is required.' using errcode = '22023';
  end if;

  delete from public.trips
  where id = p_trip_id
    and user_id = (select auth.uid());
  return found;
end;
$$;


ALTER FUNCTION "public"."delete_saved_trip"("p_trip_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_saved_trip"("p_trip_id" "uuid") IS 'Owner-scoped idempotent delete. Returns true once; false for missing, repeated, or cross-owner deletion. Child rows cascade.';



CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using
      errcode = '28000',
      message = 'Not authenticated';
  end if;

  delete from auth.users
  where id = v_uid;
end;
$$;


ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_itinerary_day_numbers_contiguous"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_trip record;
  v_new_trip_id uuid;
  v_old_trip_id uuid;
begin
  -- Lock only each affected trip in a stable order. Direct day/item writers
  -- already advance this same trip's workspace_revision, so there is no global
  -- serialization and concurrent writers for one workspace are coordinated.
  if tg_op <> 'DELETE' then v_new_trip_id := new.trip_id; end if;
  if tg_op <> 'INSERT' then v_old_trip_id := old.trip_id; end if;
  for v_trip in
    select trip.id
    from public.trips as trip
    where trip.id = any(array[v_new_trip_id, v_old_trip_id])
    order by trip.id
    for update
  loop
    if exists (
      select 1
      from (
        select day.day_number, row_number() over (order by day.day_number) as expected_number
        from public.itinerary_days as day
        where day.trip_id = v_trip.id
      ) as numbered
      where numbered.day_number <> numbered.expected_number
    ) then
      raise exception 'Itinerary day ordering must remain contiguous.' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;


ALTER FUNCTION "public"."enforce_itinerary_day_numbers_contiguous"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_itinerary_day_numbers_contiguous"() IS 'T004 deferred final-state invariant: each committed trip has day_number 1..N.';



CREATE OR REPLACE FUNCTION "public"."enforce_itinerary_item_place_provenance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog'
    AS $$
begin
  -- PostgREST clients execute as authenticated/anon. The Edge Function writes
  -- through the service-role-only RPC below, so an owner cannot self-certify.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and (
      new.google_place_id is not null
      or new.latitude is not null
      or new.longitude is not null
      or new.place_address is not null
      or new.place_category is not null
      or new.place_resolved_at is not null
    ) then
      raise exception 'Provider-owned place metadata requires server-side verification.'
        using errcode = '22023';
    end if;

    if tg_op = 'UPDATE' and (
      new.google_place_id is distinct from old.google_place_id
      or new.latitude is distinct from old.latitude
      or new.longitude is distinct from old.longitude
      or new.place_address is distinct from old.place_address
      or new.place_category is distinct from old.place_category
      or new.place_resolved_at is distinct from old.place_resolved_at
      or (old.place_resolved_at is not null and new.place_name is distinct from old.place_name)
    ) then
      raise exception 'Provider-owned place metadata requires server-side verification.'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_itinerary_item_place_provenance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_itinerary_item_positions_contiguous"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_day record;
  v_new_day_id uuid;
  v_old_day_id uuid;
begin
  -- Parent trips, rather than every table row, are locked in stable order.
  -- This validates the transaction's final day state and remains compatible
  -- with an atomic future cross-day move.
  if tg_op <> 'DELETE' then v_new_day_id := new.itinerary_day_id; end if;
  if tg_op <> 'INSERT' then v_old_day_id := old.itinerary_day_id; end if;
  for v_day in
    select day.id as day_id
    from public.itinerary_days as day
    join public.trips as trip on trip.id = day.trip_id
    where day.id = any(array[v_new_day_id, v_old_day_id])
    order by trip.id, day.id
    for update of trip
  loop
    if exists (
      select 1
      from (
        select item.position, row_number() over (order by item.position) as expected_position
        from public.itinerary_items as item
        where item.itinerary_day_id = v_day.day_id
      ) as numbered
      where numbered.position <> numbered.expected_position
    ) then
      raise exception 'Itinerary item ordering must remain contiguous.' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;


ALTER FUNCTION "public"."enforce_itinerary_item_positions_contiguous"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enforce_itinerary_item_positions_contiguous"() IS 'T004 deferred final-state invariant: each committed itinerary day has position 1..N.';



CREATE OR REPLACE FUNCTION "public"."enforce_itinerary_item_source_link_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  -- Serialize only writers for the same parent item. This prevents two
  -- concurrent 12th-link inserts from both observing a count of 11.
  if tg_op = 'INSERT' then
    perform 1
    from public.itinerary_items as item
    where item.id = new.itinerary_item_id
    for update;
  else
    perform 1
    from public.itinerary_items as item
    where item.id in (new.itinerary_item_id, old.itinerary_item_id)
    order by item.id
    for update;
  end if;

  if (
    select count(*)
    from public.itinerary_item_source_links as link
    where link.itinerary_item_id = new.itinerary_item_id
      and (tg_op = 'INSERT' or link.id <> new.id)
  ) >= 12 then
    raise exception 'An itinerary item may have at most 12 source links.' using errcode = '22023';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_itinerary_item_source_link_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_itinerary_item_status_transition"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog'
    AS $$
begin
  -- Every newly persisted item begins scheduled. Historical rows already
  -- received the additive defaults before this trigger is installed.
  if tg_op = 'INSERT' then
    if new.activity_status <> 'scheduled'
       or new.completed_at is not null
       or new.skipped_at is not null then
      raise exception 'A new itinerary activity must begin scheduled.' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.activity_status is distinct from old.activity_status then
    if old.activity_status = 'scheduled' and new.activity_status = 'completed' then
      new.completed_at := clock_timestamp();
      new.skipped_at := null;
    elsif old.activity_status = 'scheduled' and new.activity_status = 'skipped' then
      new.skipped_at := clock_timestamp();
      new.completed_at := null;
    elsif old.activity_status in ('completed', 'skipped') and new.activity_status = 'scheduled' then
      new.completed_at := null;
      new.skipped_at := null;
    else
      raise exception 'Itinerary activity status transition is invalid.' using errcode = '22023';
    end if;
  elsif new.completed_at is distinct from old.completed_at
     or new.skipped_at is distinct from old.skipped_at then
    -- Lifecycle timestamps are server-owned transition evidence, not editable
    -- client metadata.
    raise exception 'Itinerary activity status transition is invalid.' using errcode = '22023';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_itinerary_item_status_transition"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_trip_idempotency_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if new.idempotency_key is distinct from old.idempotency_key
     or new.idempotency_request_hash is distinct from old.idempotency_request_hash then
    raise exception 'Trip idempotency metadata is immutable.' using errcode = '22023';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_trip_idempotency_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_saved_trip_detail"("p_trip_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  with owned_trip as (
    select trip.* from public.trips as trip
    where trip.id = p_trip_id and trip.user_id = (select auth.uid())
  ), item_groups as (
    select item.itinerary_day_id,
      jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', item.id, 'position', item.position, 'itemKind', item.item_kind,
        'flexibility', item.flexibility, 'priority', item.priority, 'activityStatus', item.activity_status,
        'placeName', item.place_name, 'placeQuery', item.place_query,
        'resolution', case when item.place_resolved_at is null then 'UNRESOLVED' else 'VERIFIED' end,
        'googlePlaceId', case when item.place_resolved_at is not null then item.google_place_id end,
        'latitude', case when item.place_resolved_at is not null then item.latitude end,
        'longitude', case when item.place_resolved_at is not null then item.longitude end,
        'placeAddress', case when item.place_resolved_at is not null then item.place_address end,
        'placeCategory', case when item.place_resolved_at is not null then item.place_category end,
        'placeResolvedAt', item.place_resolved_at,
        'startTime', to_char(item.start_time, 'HH24:MI'), 'endTime', to_char(item.end_time, 'HH24:MI'), 'note', item.note
      )) order by item.position) as items
    from public.itinerary_items as item
    join public.itinerary_days as day on day.id = item.itinerary_day_id
    join owned_trip as trip on trip.id = day.trip_id
    group by item.itinerary_day_id
  ), day_graph as (
    select day.trip_id, jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', day.id, 'dayNumber', day.day_number, 'date', day.date, 'summary', day.summary,
      'items', coalesce(item_group.items, '[]'::jsonb)
    )) order by day.day_number) as days
    from public.itinerary_days as day join owned_trip as trip on trip.id = day.trip_id
    left join item_groups as item_group on item_group.itinerary_day_id = day.id
    group by day.trip_id
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'id', trip.id, 'title', trip.title, 'destination', trip.destination,
    'startDate', trip.start_date, 'endDate', trip.end_date, 'estimatedBudget', trip.estimated_budget,
    'currency', btrim(trip.currency), 'createdAt', trip.created_at, 'updatedAt', trip.updated_at,
    'workspaceRevision', trip.workspace_revision, 'days', coalesce(day_graph.days, '[]'::jsonb)
  )) from owned_trip as trip left join day_graph on day_graph.trip_id = trip.id;
$$;


ALTER FUNCTION "public"."get_saved_trip_detail"("p_trip_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_saved_trip_detail"("p_trip_id" "uuid") IS 'Compact owner-scoped trip/day/item graph in one SQL statement. Provider fields are emitted only when protected place_resolved_at provenance exists.';



CREATE OR REPLACE FUNCTION "public"."get_user_trip_stats"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception using
      errcode = '28000',
      message = 'Not authenticated';
  end if;

  return jsonb_build_object(
    'trips_count', (
      select count(*)
      from public.trips
      where user_id = v_uid
    ),
    'saved_places_count', (
      select count(*)
      from public.saved_places
      where user_id = v_uid
    )
  );
end;
$$;


ALTER FUNCTION "public"."get_user_trip_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_trip_workspace_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog'
    AS $$
begin
  -- New trips always begin at the canonical server-controlled revision.
  -- Never accept a client-selected initial or subsequent revision. T003 must
  -- compare an expected revision in its owner-scoped transaction.
  if tg_op = 'INSERT' then
    new.workspace_revision := 1;
    return new;
  end if;

  new.workspace_revision := old.workspace_revision + 1;
  return new;
end;
$$;


ALTER FUNCTION "public"."increment_trip_workspace_revision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_saved_places"("p_limit" integer DEFAULT 20, "p_cursor_created_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid", "p_category" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_limit integer;
  v_items jsonb;
  v_next_cursor jsonb := null;
  v_last_created_at timestamptz;
  v_last_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_limit is null then
    v_limit := 20;
  elsif p_limit < 1 or p_limit > 50 then
    raise exception 'Limit must be between 1 and 50.' using errcode = '22023';
  else
    v_limit := p_limit;
  end if;

  if (p_cursor_created_at is null and p_cursor_id is not null) or
     (p_cursor_created_at is not null and p_cursor_id is null) then
    raise exception 'Cursor timestamp and ID must be provided together.' using errcode = '22023';
  end if;

  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', sp.id,
        'googlePlaceId', sp.google_place_id,
        'placeName', sp.place_name,
        'latitude', sp.latitude,
        'longitude', sp.longitude,
        'placeAddress', sp.place_address,
        'placeCategory', sp.place_category,
        'createdAt', sp.created_at
      ) order by sp.created_at desc, sp.id desc
    ), '[]'::jsonb)
  into v_items
  from (
    select *
    from public.saved_places
    where user_id = v_user_id
      and (p_category is null or place_category = p_category)
      and (
        p_cursor_created_at is null
        or (created_at, id) < (p_cursor_created_at, p_cursor_id)
      )
    order by created_at desc, id desc
    limit (v_limit + 1)
  ) sp;

  if jsonb_array_length(v_items) > v_limit then
    select
      (v_items->(v_limit - 1)->>'createdAt')::timestamptz,
      (v_items->(v_limit - 1)->>'id')::uuid
    into v_last_created_at, v_last_id;

    v_next_cursor := jsonb_build_object(
      'createdAt', to_char(v_last_created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'id', v_last_id
    );

    v_items := (
      select jsonb_agg(elem)
      from jsonb_array_elements(v_items) with ordinality as arr(elem, idx)
      where idx <= v_limit
    );
  end if;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', v_next_cursor
  );
end;
$$;


ALTER FUNCTION "public"."list_saved_places"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid", "p_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_saved_trips"("p_limit" integer DEFAULT 20, "p_cursor_created_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_cursor_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_user_id uuid := (select auth.uid());
  v_items jsonb;
  v_has_more boolean;
  v_last_created_at timestamptz;
  v_last_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_limit is null or p_limit not between 1 and 50
     or ((p_cursor_created_at is null) <> (p_cursor_id is null)) then
    raise exception 'Saved-trip pagination input is invalid.' using errcode = '22023';
  end if;

  with limited_trips as materialized (
    select
      trip.id,
      trip.title,
      trip.destination,
      trip.start_date,
      trip.end_date,
      trip.estimated_budget,
      trip.currency,
      trip.created_at
    from public.trips as trip
    where trip.user_id = v_user_id
      and (
        p_cursor_created_at is null
        or (trip.created_at, trip.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by trip.created_at desc, trip.id desc
    limit p_limit + 1
  ), page_rows as materialized (
    select
      trip.*,
      coalesce(stats.day_count, 0) as day_count,
      coalesce(stats.item_count, 0) as item_count,
      coalesce(cover.google_place_ids, '[]'::jsonb) as cover_google_place_ids,
      row_number() over (order by trip.created_at desc, trip.id desc) as row_number
    from limited_trips as trip
    left join lateral (
      select
        count(distinct day.id)::integer as day_count,
        count(item.id)::integer as item_count
      from public.itinerary_days as day
      left join public.itinerary_items as item on item.itinerary_day_id = day.id
      where day.trip_id = trip.id
    ) as stats on true
    left join lateral (
      select jsonb_agg(candidate.google_place_id order by candidate.day_number, candidate.position, candidate.id)
        as google_place_ids
      from (
        select item.id, item.google_place_id, day.day_number, item.position
        from public.itinerary_days as day
        join public.itinerary_items as item on item.itinerary_day_id = day.id
        where day.trip_id = trip.id
          and item.place_resolved_at is not null
          and item.google_place_id is not null
        order by day.day_number, item.position, item.id
        limit 2
      ) as candidate
    ) as cover on true
  ), visible_rows as (
    select * from page_rows where row_number <= p_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', row.id,
      'title', row.title,
      'destination', row.destination,
      'startDate', row.start_date,
      'endDate', row.end_date,
      'estimatedBudget', row.estimated_budget,
      'currency', btrim(row.currency),
      'createdAt', row.created_at,
      'dayCount', row.day_count,
      'itemCount', row.item_count,
      'coverGooglePlaceIds', row.cover_google_place_ids
    ) order by row.created_at desc, row.id desc), '[]'::jsonb),
    exists(select 1 from page_rows where row_number = p_limit + 1),
    (array_agg(row.created_at order by row.created_at desc, row.id desc))[p_limit],
    (array_agg(row.id order by row.created_at desc, row.id desc))[p_limit]
  into v_items, v_has_more, v_last_created_at, v_last_id
  from visible_rows as row;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', case when v_has_more then jsonb_build_object(
      'createdAt', v_last_created_at,
      'id', v_last_id
    ) else null end
  );
end;
$$;


ALTER FUNCTION "public"."list_saved_trips"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."list_saved_trips"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") IS 'Owner-derived, keyset-paginated compact saved-trip list with at most two provenance-verified Google Place cover candidates. Internal idempotency metadata is never returned.';



CREATE OR REPLACE FUNCTION "public"."mutate_travel_workspace"("p_command" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
declare
  v_type text;
  v_trip_id uuid;
  v_item_id uuid;
  v_expected_revision integer;
  v_current_revision integer;
  v_original public.itinerary_items%rowtype;
  v_final public.itinerary_items%rowtype;
  v_patch jsonb;
  v_contact jsonb;
  v_transport jsonb;
  v_accommodation jsonb;
  v_links jsonb;
  v_link jsonb;
  v_index integer;
  v_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Workspace authentication is required.' using errcode = 'TW006';
  end if;
  if p_command is null or octet_length(p_command::text) > 50000 or jsonb_typeof(p_command) <> 'object' then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end if;

  -- Server/provider-owned keys are reported before generic allowlist failures,
  -- including when a malicious client places one at the command root.
  if p_command ?| array['ownerId', 'userId', 'workspaceRevision', 'googlePlaceId', 'latitude', 'longitude', 'placeAddress', 'placeCategory', 'placeResolvedAt', 'completedAt', 'skippedAt'] then
    raise exception 'Provider or server-owned field is not writable.' using errcode = 'TW013';
  end if;
  if not (p_command - 'type' - 'tripId' - 'itemId' - 'expectedRevision' - 'patch' - 'status' - 'links' = '{}'::jsonb)
     or not (p_command ? 'type') or not (p_command ? 'tripId') or not (p_command ? 'itemId') or not (p_command ? 'expectedRevision')
     or jsonb_typeof(p_command->'type') <> 'string'
     or jsonb_typeof(p_command->'tripId') <> 'string'
     or jsonb_typeof(p_command->'itemId') <> 'string'
     or jsonb_typeof(p_command->'expectedRevision') <> 'number' then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end if;

  v_type := p_command->>'type';
  begin
    v_trip_id := (p_command->>'tripId')::uuid;
    v_item_id := (p_command->>'itemId')::uuid;
    if (p_command->>'expectedRevision')::numeric <> trunc((p_command->>'expectedRevision')::numeric) then
      raise exception 'Workspace command is invalid.' using errcode = 'TW007';
    end if;
    v_expected_revision := (p_command->>'expectedRevision')::integer;
  exception when others then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end;
  if coalesce(v_type not in ('update_item', 'transition_item_status', 'replace_source_links'), true)
     or v_trip_id is null or v_item_id is null or v_expected_revision is null or v_expected_revision < 1 then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end if;

  -- Canonical order is item -> trip for item/status commands. A source-link
  -- replacement first locks every existing child row by stable ID, then follows
  -- item -> trip. Direct UPDATE/DELETE hold a source-link row before their
  -- revision trigger locks the trip, so this avoids a trip -> source-link cycle.
  -- Direct INSERT uses item -> trip and can finish before this command acquires
  -- the item lock; the following CAS check then returns TW009 rather than retrying.
  if v_type = 'replace_source_links' then
    perform source_link.id
    from public.itinerary_item_source_links as source_link
    where source_link.itinerary_item_id = v_item_id
    order by source_link.id
    for update;
  end if;

  select item.* into v_original
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  where item.id = v_item_id and day.trip_id = v_trip_id
  for update of item;
  if not found then
    raise exception 'Workspace resource was not found.' using errcode = 'TW008';
  end if;
  select trip.workspace_revision into v_current_revision
  from public.trips as trip
  where trip.id = v_trip_id and trip.user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Workspace resource was not found.' using errcode = 'TW008';
  end if;
  if v_current_revision <> v_expected_revision then
    raise exception 'Workspace revision conflict.' using errcode = 'TW009';
  end if;

  if v_type = 'update_item' then
    if not (p_command ? 'patch') or jsonb_typeof(p_command->'patch') <> 'object'
       or p_command ? 'status' or p_command ? 'links' then
      raise exception 'Workspace command is invalid.' using errcode = 'TW007';
    end if;
    v_patch := p_command->'patch';
    if v_patch ?| array['ownerId', 'userId', 'workspaceRevision', 'googlePlaceId', 'latitude', 'longitude', 'placeAddress', 'placeCategory', 'placeResolvedAt', 'completedAt', 'skippedAt'] then
      raise exception 'Provider or server-owned field is not writable.' using errcode = 'TW013';
    end if;
    if not exists (select 1 from jsonb_object_keys(v_patch))
       or not (v_patch - 'placeName' - 'placeQuery' - 'flexibility' - 'priority' - 'startTime' - 'endTime' - 'note' - 'contact' - 'transport' - 'accommodation' = '{}'::jsonb) then
      raise exception 'Workspace field is invalid.' using errcode = 'TW010';
    end if;
    if v_original.place_resolved_at is not null and v_patch ? 'placeName' then
      raise exception 'Provider or server-owned field is not writable.' using errcode = 'TW013';
    end if;
    v_contact := coalesce(v_patch->'contact', '{}'::jsonb);
    v_transport := coalesce(v_patch->'transport', '{}'::jsonb);
    v_accommodation := coalesce(v_patch->'accommodation', '{}'::jsonb);
    if jsonb_typeof(v_contact) <> 'object' or jsonb_typeof(v_transport) <> 'object' or jsonb_typeof(v_accommodation) <> 'object'
       or not (v_contact - 'name' - 'phone' - 'address' - 'websiteUrl' - 'bookingUrl' - 'reservationCode' = '{}'::jsonb)
       or not (v_transport - 'mode' - 'originLabel' - 'destinationLabel' - 'operatorName' - 'departureAt' - 'arrivalAt' - 'plannedCostAmount' - 'plannedCostCurrency' = '{}'::jsonb)
       or not (v_accommodation - 'checkInAt' - 'checkOutAt' - 'nights' = '{}'::jsonb) then
      raise exception 'Workspace field is invalid.' using errcode = 'TW010';
    end if;
    -- jsonb_populate_record must not coerce hostile JSON scalars. Validate the
    -- exact JSON type before mapping the explicit allowlist onto the row.
    if (v_patch ? 'placeName' and jsonb_typeof(v_patch->'placeName') <> 'string')
       or (v_patch ? 'placeQuery' and jsonb_typeof(v_patch->'placeQuery') not in ('string', 'null'))
       or (v_patch ? 'flexibility' and jsonb_typeof(v_patch->'flexibility') <> 'string')
       or (v_patch ? 'priority' and jsonb_typeof(v_patch->'priority') <> 'string')
       or (v_patch ? 'startTime' and jsonb_typeof(v_patch->'startTime') not in ('string', 'null'))
       or (v_patch ? 'endTime' and jsonb_typeof(v_patch->'endTime') not in ('string', 'null'))
       or (v_patch ? 'note' and jsonb_typeof(v_patch->'note') not in ('string', 'null'))
       or (v_contact ? 'name' and jsonb_typeof(v_contact->'name') not in ('string', 'null'))
       or (v_contact ? 'phone' and jsonb_typeof(v_contact->'phone') not in ('string', 'null'))
       or (v_contact ? 'address' and jsonb_typeof(v_contact->'address') not in ('string', 'null'))
       or (v_contact ? 'websiteUrl' and jsonb_typeof(v_contact->'websiteUrl') not in ('string', 'null'))
       or (v_contact ? 'bookingUrl' and jsonb_typeof(v_contact->'bookingUrl') not in ('string', 'null'))
       or (v_contact ? 'reservationCode' and jsonb_typeof(v_contact->'reservationCode') not in ('string', 'null'))
       or (v_transport ? 'mode' and jsonb_typeof(v_transport->'mode') not in ('string', 'null'))
       or (v_transport ? 'originLabel' and jsonb_typeof(v_transport->'originLabel') not in ('string', 'null'))
       or (v_transport ? 'destinationLabel' and jsonb_typeof(v_transport->'destinationLabel') not in ('string', 'null'))
       or (v_transport ? 'operatorName' and jsonb_typeof(v_transport->'operatorName') not in ('string', 'null'))
       or (v_transport ? 'departureAt' and jsonb_typeof(v_transport->'departureAt') not in ('string', 'null'))
       or (v_transport ? 'arrivalAt' and jsonb_typeof(v_transport->'arrivalAt') not in ('string', 'null'))
       or (v_transport ? 'plannedCostAmount' and jsonb_typeof(v_transport->'plannedCostAmount') not in ('number', 'null'))
       or (v_transport ? 'plannedCostCurrency' and jsonb_typeof(v_transport->'plannedCostCurrency') not in ('string', 'null'))
       or (v_accommodation ? 'checkInAt' and jsonb_typeof(v_accommodation->'checkInAt') not in ('string', 'null'))
       or (v_accommodation ? 'checkOutAt' and jsonb_typeof(v_accommodation->'checkOutAt') not in ('string', 'null'))
       or (v_accommodation ? 'nights' and jsonb_typeof(v_accommodation->'nights') not in ('number', 'null'))
       or (v_accommodation ? 'nights' and jsonb_typeof(v_accommodation->'nights') = 'number' and (v_accommodation->>'nights')::numeric <> trunc((v_accommodation->>'nights')::numeric)) then
      raise exception 'Workspace payload is invalid.' using errcode = 'TW014';
    end if;

    -- Populate only the explicit allowlist. JSON null deliberately clears a nullable field.
    v_final := jsonb_populate_record(v_original, jsonb_build_object(
      'item_kind', to_jsonb(v_original.item_kind),
      'place_name', case when v_patch ? 'placeName' then v_patch->'placeName' else to_jsonb(v_original.place_name) end,
      'place_query', case when v_patch ? 'placeQuery' then v_patch->'placeQuery' else to_jsonb(v_original.place_query) end,
      'flexibility', case when v_patch ? 'flexibility' then v_patch->'flexibility' else to_jsonb(v_original.flexibility) end,
      'priority', case when v_patch ? 'priority' then v_patch->'priority' else to_jsonb(v_original.priority) end,
      'start_time', case when v_patch ? 'startTime' then v_patch->'startTime' else to_jsonb(v_original.start_time) end,
      'end_time', case when v_patch ? 'endTime' then v_patch->'endTime' else to_jsonb(v_original.end_time) end,
      'note', case when v_patch ? 'note' then v_patch->'note' else to_jsonb(v_original.note) end,
      'contact_name', case when v_contact ? 'name' then v_contact->'name' else to_jsonb(v_original.contact_name) end,
      'contact_phone', case when v_contact ? 'phone' then v_contact->'phone' else to_jsonb(v_original.contact_phone) end,
      'contact_address', case when v_contact ? 'address' then v_contact->'address' else to_jsonb(v_original.contact_address) end,
      'contact_website_url', case when v_contact ? 'websiteUrl' then v_contact->'websiteUrl' else to_jsonb(v_original.contact_website_url) end,
      'contact_booking_url', case when v_contact ? 'bookingUrl' then v_contact->'bookingUrl' else to_jsonb(v_original.contact_booking_url) end,
      'reservation_code', case when v_contact ? 'reservationCode' then v_contact->'reservationCode' else to_jsonb(v_original.reservation_code) end,
      'transport_mode', case when v_transport ? 'mode' then v_transport->'mode' else to_jsonb(v_original.transport_mode) end,
      'transport_origin_label', case when v_transport ? 'originLabel' then v_transport->'originLabel' else to_jsonb(v_original.transport_origin_label) end,
      'transport_destination_label', case when v_transport ? 'destinationLabel' then v_transport->'destinationLabel' else to_jsonb(v_original.transport_destination_label) end,
      'transport_operator_name', case when v_transport ? 'operatorName' then v_transport->'operatorName' else to_jsonb(v_original.transport_operator_name) end,
      'transport_departure_at', case when v_transport ? 'departureAt' then v_transport->'departureAt' else to_jsonb(v_original.transport_departure_at) end,
      'transport_arrival_at', case when v_transport ? 'arrivalAt' then v_transport->'arrivalAt' else to_jsonb(v_original.transport_arrival_at) end,
      'transport_planned_cost_amount', case when v_transport ? 'plannedCostAmount' then v_transport->'plannedCostAmount' else to_jsonb(v_original.transport_planned_cost_amount) end,
      'transport_planned_cost_currency', case when v_transport ? 'plannedCostCurrency' then v_transport->'plannedCostCurrency' else to_jsonb(v_original.transport_planned_cost_currency) end,
      'accommodation_details_present', case when v_patch ? 'accommodation' then 'true'::jsonb else to_jsonb(v_original.accommodation_details_present) end,
      'accommodation_check_in_at', case when v_accommodation ? 'checkInAt' then v_accommodation->'checkInAt' else to_jsonb(v_original.accommodation_check_in_at) end,
      'accommodation_check_out_at', case when v_accommodation ? 'checkOutAt' then v_accommodation->'checkOutAt' else to_jsonb(v_original.accommodation_check_out_at) end,
      'accommodation_nights', case when v_accommodation ? 'nights' then v_accommodation->'nights' else to_jsonb(v_original.accommodation_nights) end
    ));
    if length(btrim(coalesce(v_final.place_name, ''))) not between 1 and 160
       or (v_final.place_query is not null and length(btrim(v_final.place_query)) > 200)
       or (v_final.note is not null and length(btrim(v_final.note)) > 500)
       or (v_final.contact_name is not null and length(btrim(v_final.contact_name)) not between 1 and 120)
       or (v_final.contact_phone is not null and (length(btrim(v_final.contact_phone)) not between 1 and 64 or btrim(v_final.contact_phone) !~ '^[+0-9 ()\.-]+$'))
       or (v_final.contact_address is not null and length(btrim(v_final.contact_address)) not between 1 and 500)
       or (v_final.reservation_code is not null and length(btrim(v_final.reservation_code)) not between 1 and 128)
       or (v_final.contact_website_url is not null and (length(v_final.contact_website_url) > 2048 or v_final.contact_website_url !~ '^https://[^[:space:]]+$'))
       or (v_final.contact_booking_url is not null and (length(v_final.contact_booking_url) > 2048 or v_final.contact_booking_url !~ '^https://[^[:space:]]+$')) then
      raise exception 'Workspace payload is invalid.' using errcode = 'TW014';
    end if;
    if v_final.item_kind not in ('place', 'custom_activity', 'restaurant', 'transport', 'accommodation', 'reservation', 'note')
       or v_final.flexibility not in ('fixed', 'flexible') or v_final.priority not in ('must_do', 'want_to_do', 'optional')
       or (v_final.item_kind not in ('place', 'restaurant', 'accommodation') and v_final.place_query is not null)
       or (v_final.item_kind = 'note' and (v_final.place_query is not null or v_final.start_time is not null or v_final.end_time is not null))
       or (v_final.item_kind = 'transport' and v_final.transport_mode not in ('walk', 'drive', 'transit', 'bus', 'train', 'flight', 'motorbike', 'ferry', 'other'))
       or (v_final.item_kind = 'transport' and (v_final.start_time is not null or v_final.end_time is not null))
       or (v_final.item_kind <> 'transport' and (v_final.transport_mode is not null or v_final.transport_origin_label is not null or v_final.transport_destination_label is not null or v_final.transport_operator_name is not null or v_final.transport_departure_at is not null or v_final.transport_arrival_at is not null or v_final.transport_planned_cost_amount is not null or v_final.transport_planned_cost_currency is not null))
       or (v_final.item_kind = 'accommodation' and not v_final.accommodation_details_present)
       or (v_final.item_kind <> 'accommodation' and (v_final.accommodation_details_present or v_final.accommodation_check_in_at is not null or v_final.accommodation_check_out_at is not null or v_final.accommodation_nights is not null)) then
      raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
    end if;
    if (v_final.transport_departure_at is null) <> (v_final.transport_arrival_at is null)
       or (v_final.transport_arrival_at is not null and v_final.transport_arrival_at < v_final.transport_departure_at)
       or (v_final.transport_origin_label is not null and length(btrim(v_final.transport_origin_label)) not between 1 and 160)
       or (v_final.transport_destination_label is not null and length(btrim(v_final.transport_destination_label)) not between 1 and 160)
       or (v_final.transport_operator_name is not null and length(btrim(v_final.transport_operator_name)) not between 1 and 160)
       or ((v_final.transport_planned_cost_amount is null) <> (v_final.transport_planned_cost_currency is null))
       or (v_final.transport_planned_cost_amount is not null and (v_final.transport_planned_cost_amount < 0 or v_final.transport_planned_cost_amount > 1000000000))
       or (v_final.transport_planned_cost_currency is not null and v_final.transport_planned_cost_currency !~ '^[A-Z]{3}$')
       or (v_final.accommodation_check_in_at is null) <> (v_final.accommodation_check_out_at is null)
       or (v_final.accommodation_check_out_at is not null and v_final.accommodation_check_out_at <= v_final.accommodation_check_in_at)
       or (v_final.accommodation_nights is not null and v_final.accommodation_nights not between 0 and 365)
       or (v_final.accommodation_nights is not null and (v_final.accommodation_check_out_at at time zone 'UTC')::date - (v_final.accommodation_check_in_at at time zone 'UTC')::date <> v_final.accommodation_nights) then
      raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
    end if;
    update public.itinerary_items as item set
      item_kind=v_final.item_kind, place_name=nullif(btrim(v_final.place_name), ''), place_query=nullif(btrim(v_final.place_query), ''), flexibility=v_final.flexibility, priority=v_final.priority,
      start_time=v_final.start_time, end_time=v_final.end_time, note=nullif(btrim(v_final.note), ''), contact_name=nullif(btrim(v_final.contact_name), ''), contact_phone=nullif(btrim(v_final.contact_phone), ''), contact_address=nullif(btrim(v_final.contact_address), ''), contact_website_url=nullif(btrim(v_final.contact_website_url), ''), contact_booking_url=nullif(btrim(v_final.contact_booking_url), ''), reservation_code=nullif(btrim(v_final.reservation_code), ''),
      transport_mode=v_final.transport_mode, transport_origin_label=nullif(btrim(v_final.transport_origin_label), ''), transport_destination_label=nullif(btrim(v_final.transport_destination_label), ''), transport_operator_name=nullif(btrim(v_final.transport_operator_name), ''), transport_departure_at=v_final.transport_departure_at, transport_arrival_at=v_final.transport_arrival_at, transport_planned_cost_amount=v_final.transport_planned_cost_amount, transport_planned_cost_currency=v_final.transport_planned_cost_currency,
      accommodation_details_present=v_final.accommodation_details_present, accommodation_check_in_at=v_final.accommodation_check_in_at, accommodation_check_out_at=v_final.accommodation_check_out_at, accommodation_nights=v_final.accommodation_nights
    where item.id=v_item_id;

  elsif v_type = 'transition_item_status' then
    if not (p_command ? 'status') or p_command ? 'patch' or p_command ? 'links' then raise exception 'Workspace command is invalid.' using errcode = 'TW007'; end if;
    v_status := p_command->>'status';
    if v_status not in ('scheduled', 'completed', 'skipped')
       or (v_original.activity_status = 'completed' and v_status = 'skipped')
       or (v_original.activity_status = 'skipped' and v_status = 'completed') then
      raise exception 'Workspace lifecycle transition is invalid.' using errcode = 'TW012';
    end if;
    update public.itinerary_items set activity_status=v_status where id=v_item_id;

  else
    if not (p_command ? 'links') or p_command ? 'patch' or p_command ? 'status' or jsonb_typeof(p_command->'links') <> 'array' or jsonb_array_length(p_command->'links') > 12 then
      raise exception 'Workspace source-link payload is invalid.' using errcode = 'TW014';
    end if;
    v_links := p_command->'links';
    for v_index in 0..jsonb_array_length(v_links)-1 loop
      v_link := v_links->v_index;
      if jsonb_typeof(v_link) <> 'object' or not (v_link - 'type' - 'url' - 'label' = '{}'::jsonb)
         or jsonb_typeof(v_link->'type') <> 'string' or jsonb_typeof(v_link->'url') <> 'string'
         or (v_link ? 'label' and jsonb_typeof(v_link->'label') <> 'string')
         or v_link->>'type' not in ('google_maps', 'facebook', 'instagram', 'tiktok', 'website', 'booking', 'other')
         or length(coalesce(v_link->>'url','')) > 2048 or coalesce(v_link->>'url','') !~ '^https://[^[:space:]]+$'
         or (v_link ? 'label' and length(btrim(coalesce(v_link->>'label',''))) not between 1 and 120)
         or (v_link->>'type' = 'other' and length(btrim(coalesce(v_link->>'label',''))) not between 1 and 120) then
        raise exception 'Workspace source-link payload is invalid.' using errcode = 'TW014';
      end if;
    end loop;
    delete from public.itinerary_item_source_links where itinerary_item_id=v_item_id;
    for v_index in 0..jsonb_array_length(v_links)-1 loop
      v_link := v_links->v_index;
      insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,label,position)
      values(v_item_id, v_link->>'type', btrim(v_link->>'url'), nullif(btrim(v_link->>'label'), ''), v_index+1);
    end loop;
  end if;

  select workspace_revision into v_current_revision from public.trips where id=v_trip_id;
  return jsonb_build_object('revision', v_current_revision);
exception
  when sqlstate 'TW006' then raise;
  when sqlstate 'TW007' then raise;
  when sqlstate 'TW008' then raise;
  when sqlstate 'TW009' then raise;
  when sqlstate 'TW010' then raise;
  when sqlstate 'TW011' then raise;
  when sqlstate 'TW012' then raise;
  when sqlstate 'TW013' then raise;
  when sqlstate 'TW014' then raise;
  when data_exception then
    raise exception 'Workspace payload is invalid.' using errcode = 'TW014';
  when check_violation then
    raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
  when others then
    raise exception 'Workspace mutation failed.' using errcode = 'TW007';
end;
$_$;


ALTER FUNCTION "public"."mutate_travel_workspace"("p_command" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mutate_travel_workspace"("p_command" "jsonb") IS 'FEATURE-P1-T003 SECURITY INVOKER owner-scoped workspace mutation boundary. It derives owner from auth.uid(), atomically compares trips.workspace_revision, validates a field/kind whitelist, and returns the trigger-controlled revision.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_place"("p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text" DEFAULT NULL::"text", "p_place_category" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_saved public.saved_places;
  v_trimmed_google_id text;
  v_trimmed_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_trimmed_google_id := trim(coalesce(p_google_place_id, ''));
  v_trimmed_name := trim(coalesce(p_place_name, ''));

  if length(v_trimmed_google_id) < 10 or length(v_trimmed_google_id) > 200 then
    raise exception 'Invalid google_place_id.' using errcode = '22023';
  end if;

  if length(v_trimmed_name) = 0 or length(v_trimmed_name) > 250 then
    raise exception 'Invalid place_name.' using errcode = '22023';
  end if;

  if p_latitude is null or p_latitude < -90 or p_latitude > 90 or
     p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates.' using errcode = '22023';
  end if;

  insert into public.saved_places (
    user_id,
    google_place_id,
    place_name,
    latitude,
    longitude,
    place_address,
    place_category
  )
  values (
    v_user_id,
    v_trimmed_google_id,
    v_trimmed_name,
    p_latitude,
    p_longitude,
    nullif(trim(coalesce(p_place_address, '')), ''),
    nullif(trim(coalesce(p_place_category, '')), '')
  )
  on conflict (user_id, google_place_id) do update
  set
    place_name = excluded.place_name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    place_address = coalesce(excluded.place_address, public.saved_places.place_address),
    place_category = coalesce(excluded.place_category, public.saved_places.place_category)
  returning * into v_saved;

  return jsonb_build_object(
    'id', v_saved.id,
    'googlePlaceId', v_saved.google_place_id,
    'placeName', v_saved.place_name,
    'latitude', v_saved.latitude,
    'longitude', v_saved.longitude,
    'placeAddress', v_saved.place_address,
    'placeCategory', v_saved.place_category,
    'createdAt', v_saved.created_at
  );
end;
$$;


ALTER FUNCTION "public"."save_place"("p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unsave_place"("p_google_place_id" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_deleted_count integer;
  v_trimmed_google_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_trimmed_google_id := trim(coalesce(p_google_place_id, ''));
  if length(v_trimmed_google_id) = 0 then
    return false;
  end if;

  delete from public.saved_places
  where user_id = v_user_id
    and google_place_id = v_trimmed_google_id;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count > 0;
end;
$$;


ALTER FUNCTION "public"."unsave_place"("p_google_place_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_itinerary_item_note"("p_item_id" "uuid", "p_note" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_item_id is null or (p_note is not null and length(btrim(p_note)) > 500) then
    raise exception 'Itinerary note input is invalid.' using errcode = '22023';
  end if;

  update public.itinerary_items as item
  set note = nullif(btrim(p_note), '')
  from public.itinerary_days as day
  join public.trips as trip on trip.id = day.trip_id
  where item.id = p_item_id
    and item.itinerary_day_id = day.id
    and trip.user_id = (select auth.uid());
  return found;
end;
$$;


ALTER FUNCTION "public"."update_itinerary_item_note"("p_item_id" "uuid", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_itinerary_item_note"("p_item_id" "uuid", "p_note" "text") IS 'Owner-scoped note-only mutation. It cannot mutate provider-owned snapshot fields.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."itinerary_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "day_number" integer NOT NULL,
    "date" "date",
    "summary" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "itinerary_days_day_number_check" CHECK (("day_number" > 0))
);


ALTER TABLE "public"."itinerary_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."itinerary_item_source_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "itinerary_item_id" "uuid" NOT NULL,
    "link_type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "label" "text",
    "position" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "itinerary_item_source_links_label_check" CHECK ((("label" IS NULL) OR (("length"("btrim"("label")) >= 1) AND ("length"("btrim"("label")) <= 120)))),
    CONSTRAINT "itinerary_item_source_links_link_type_check" CHECK (("link_type" = ANY (ARRAY['google_maps'::"text", 'facebook'::"text", 'instagram'::"text", 'tiktok'::"text", 'website'::"text", 'booking'::"text", 'other'::"text"]))),
    CONSTRAINT "itinerary_item_source_links_other_label_check" CHECK ((("link_type" <> 'other'::"text") OR ("label" IS NOT NULL))),
    CONSTRAINT "itinerary_item_source_links_position_check" CHECK (("position" > 0)),
    CONSTRAINT "itinerary_item_source_links_url_check" CHECK ((("length"("url") <= 2048) AND ("url" ~ '^https://[^[:space:]]+$'::"text")))
);


ALTER TABLE "public"."itinerary_item_source_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."itinerary_item_source_links" IS 'Owner-scoped, bounded HTTPS source links. T003 validates URL semantics and field-kind compatibility before persistence.';



CREATE TABLE IF NOT EXISTS "public"."itinerary_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "itinerary_day_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "google_place_id" "text",
    "place_name" "text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "place_address" "text",
    "place_category" "text",
    "start_time" time without time zone,
    "end_time" time without time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "place_query" "text",
    "place_resolved_at" timestamp with time zone,
    "item_kind" "text" DEFAULT 'place'::"text" NOT NULL,
    "flexibility" "text" DEFAULT 'fixed'::"text" NOT NULL,
    "priority" "text" DEFAULT 'must_do'::"text" NOT NULL,
    "activity_status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "completed_at" timestamp with time zone,
    "skipped_at" timestamp with time zone,
    "contact_name" "text",
    "contact_phone" "text",
    "contact_address" "text",
    "contact_website_url" "text",
    "contact_booking_url" "text",
    "reservation_code" "text",
    "transport_mode" "text",
    "transport_origin_label" "text",
    "transport_destination_label" "text",
    "transport_operator_name" "text",
    "transport_departure_at" timestamp with time zone,
    "transport_arrival_at" timestamp with time zone,
    "transport_planned_cost_amount" numeric(12,2),
    "transport_planned_cost_currency" character(3),
    "accommodation_details_present" boolean DEFAULT false NOT NULL,
    "accommodation_check_in_at" timestamp with time zone,
    "accommodation_check_out_at" timestamp with time zone,
    "accommodation_nights" integer,
    CONSTRAINT "itinerary_items_accommodation_details_check" CHECK (((("item_kind" = 'accommodation'::"text") AND "accommodation_details_present") OR (("item_kind" <> 'accommodation'::"text") AND (NOT "accommodation_details_present") AND ("accommodation_check_in_at" IS NULL) AND ("accommodation_check_out_at" IS NULL) AND ("accommodation_nights" IS NULL)))),
    CONSTRAINT "itinerary_items_accommodation_nights_check" CHECK ((("accommodation_nights" IS NULL) OR ((("accommodation_nights" >= 0) AND ("accommodation_nights" <= 365)) AND ("accommodation_check_in_at" IS NOT NULL) AND ("accommodation_check_out_at" IS NOT NULL) AND ("accommodation_nights" = ((("accommodation_check_out_at" AT TIME ZONE 'UTC'::"text"))::"date" - (("accommodation_check_in_at" AT TIME ZONE 'UTC'::"text"))::"date"))))),
    CONSTRAINT "itinerary_items_accommodation_timestamp_check" CHECK ((("num_nonnulls"("accommodation_check_in_at", "accommodation_check_out_at") = ANY (ARRAY[0, 2])) AND (("accommodation_check_out_at" IS NULL) OR ("accommodation_check_out_at" > "accommodation_check_in_at")))),
    CONSTRAINT "itinerary_items_activity_status_check" CHECK (("activity_status" = ANY (ARRAY['scheduled'::"text", 'completed'::"text", 'skipped'::"text"]))),
    CONSTRAINT "itinerary_items_activity_status_timestamp_check" CHECK (((("activity_status" = 'scheduled'::"text") AND ("completed_at" IS NULL) AND ("skipped_at" IS NULL)) OR (("activity_status" = 'completed'::"text") AND ("completed_at" IS NOT NULL) AND ("skipped_at" IS NULL)) OR (("activity_status" = 'skipped'::"text") AND ("skipped_at" IS NOT NULL) AND ("completed_at" IS NULL)))),
    CONSTRAINT "itinerary_items_contact_bounds_check" CHECK (((("contact_name" IS NULL) OR (("length"("btrim"("contact_name")) >= 1) AND ("length"("btrim"("contact_name")) <= 120))) AND (("contact_phone" IS NULL) OR ((("length"("btrim"("contact_phone")) >= 1) AND ("length"("btrim"("contact_phone")) <= 64)) AND ("btrim"("contact_phone") ~ '^[+0-9 ()\.-]+$'::"text"))) AND (("contact_address" IS NULL) OR (("length"("btrim"("contact_address")) >= 1) AND ("length"("btrim"("contact_address")) <= 500))) AND (("contact_website_url" IS NULL) OR (("length"("contact_website_url") <= 2048) AND ("contact_website_url" ~ '^https://[^[:space:]]+$'::"text"))) AND (("contact_booking_url" IS NULL) OR (("length"("contact_booking_url") <= 2048) AND ("contact_booking_url" ~ '^https://[^[:space:]]+$'::"text"))) AND (("reservation_code" IS NULL) OR (("length"("btrim"("reservation_code")) >= 1) AND ("length"("btrim"("reservation_code")) <= 128))))),
    CONSTRAINT "itinerary_items_coordinate_pair_check" CHECK (((("latitude" IS NULL) AND ("longitude" IS NULL)) OR (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL)))),
    CONSTRAINT "itinerary_items_flexibility_check" CHECK (("flexibility" = ANY (ARRAY['fixed'::"text", 'flexible'::"text"]))),
    CONSTRAINT "itinerary_items_kind_check" CHECK (("item_kind" = ANY (ARRAY['place'::"text", 'custom_activity'::"text", 'restaurant'::"text", 'transport'::"text", 'accommodation'::"text", 'reservation'::"text", 'note'::"text"]))),
    CONSTRAINT "itinerary_items_latitude_check" CHECK ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision))),
    CONSTRAINT "itinerary_items_longitude_check" CHECK ((("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision))),
    CONSTRAINT "itinerary_items_note_schedule_check" CHECK ((("item_kind" <> 'note'::"text") OR (("start_time" IS NULL) AND ("end_time" IS NULL)))),
    CONSTRAINT "itinerary_items_place_like_provider_fields_check" CHECK ((("item_kind" = ANY (ARRAY['place'::"text", 'restaurant'::"text", 'accommodation'::"text"])) OR (("google_place_id" IS NULL) AND ("latitude" IS NULL) AND ("longitude" IS NULL) AND ("place_address" IS NULL) AND ("place_category" IS NULL) AND ("place_resolved_at" IS NULL)))),
    CONSTRAINT "itinerary_items_place_name_check" CHECK (("length"(TRIM(BOTH FROM "place_name")) > 0)),
    CONSTRAINT "itinerary_items_place_query_kind_check" CHECK ((("place_query" IS NULL) OR ("item_kind" = ANY (ARRAY['place'::"text", 'restaurant'::"text", 'accommodation'::"text"])))),
    CONSTRAINT "itinerary_items_position_check" CHECK (("position" > 0)),
    CONSTRAINT "itinerary_items_priority_check" CHECK (("priority" = ANY (ARRAY['must_do'::"text", 'want_to_do'::"text", 'optional'::"text"]))),
    CONSTRAINT "itinerary_items_time_range_check" CHECK ((("end_time" IS NULL) OR ("start_time" IS NULL) OR ("end_time" >= "start_time"))),
    CONSTRAINT "itinerary_items_transport_details_check" CHECK (((("item_kind" = 'transport'::"text") AND ("transport_mode" = ANY (ARRAY['walk'::"text", 'drive'::"text", 'transit'::"text", 'bus'::"text", 'train'::"text", 'flight'::"text", 'motorbike'::"text", 'ferry'::"text", 'other'::"text"])) AND ("start_time" IS NULL) AND ("end_time" IS NULL)) OR (("item_kind" <> 'transport'::"text") AND ("transport_mode" IS NULL) AND ("transport_origin_label" IS NULL) AND ("transport_destination_label" IS NULL) AND ("transport_operator_name" IS NULL) AND ("transport_departure_at" IS NULL) AND ("transport_arrival_at" IS NULL) AND ("transport_planned_cost_amount" IS NULL) AND ("transport_planned_cost_currency" IS NULL)))),
    CONSTRAINT "itinerary_items_transport_planned_cost_check" CHECK (((("transport_planned_cost_amount" IS NULL) AND ("transport_planned_cost_currency" IS NULL)) OR (("transport_planned_cost_amount" IS NOT NULL) AND ("transport_planned_cost_amount" >= (0)::numeric) AND ("transport_planned_cost_currency" ~ '^[A-Z]{3}$'::"text")))),
    CONSTRAINT "itinerary_items_transport_text_bounds_check" CHECK (((("transport_origin_label" IS NULL) OR (("length"("btrim"("transport_origin_label")) >= 1) AND ("length"("btrim"("transport_origin_label")) <= 160))) AND (("transport_destination_label" IS NULL) OR (("length"("btrim"("transport_destination_label")) >= 1) AND ("length"("btrim"("transport_destination_label")) <= 160))) AND (("transport_operator_name" IS NULL) OR (("length"("btrim"("transport_operator_name")) >= 1) AND ("length"("btrim"("transport_operator_name")) <= 160))))),
    CONSTRAINT "itinerary_items_transport_timestamp_check" CHECK ((("num_nonnulls"("transport_departure_at", "transport_arrival_at") = ANY (ARRAY[0, 2])) AND (("transport_arrival_at" IS NULL) OR ("transport_arrival_at" >= "transport_departure_at")))),
    CONSTRAINT "itinerary_items_verified_snapshot_check" CHECK ((("place_resolved_at" IS NULL) OR (("google_place_id" IS NOT NULL) AND (("length"("btrim"("google_place_id")) >= 1) AND ("length"("btrim"("google_place_id")) <= 255)) AND (("length"("btrim"("place_name")) >= 1) AND ("length"("btrim"("place_name")) <= 160)) AND ("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL))))
);


ALTER TABLE "public"."itinerary_items" OWNER TO "postgres";


COMMENT ON COLUMN "public"."itinerary_items"."place_query" IS 'Optional AI-generated search hint for later provider resolution; not verified place metadata.';



COMMENT ON COLUMN "public"."itinerary_items"."place_resolved_at" IS 'Trusted server-side Google Places snapshot provenance/freshness marker. NULL means provider-looking columns are not verified.';



COMMENT ON COLUMN "public"."itinerary_items"."completed_at" IS 'Server-generated timestamp for an explicit scheduled-to-completed transition; clients cannot set or edit it directly.';



COMMENT ON COLUMN "public"."itinerary_items"."skipped_at" IS 'Server-generated timestamp for an explicit scheduled-to-skipped transition; clients cannot set or edit it directly.';



COMMENT ON CONSTRAINT "itinerary_items_coordinate_pair_check" ON "public"."itinerary_items" IS 'Coordinates are either both absent for an unresolved item or both present after verification.';



COMMENT ON CONSTRAINT "itinerary_items_verified_snapshot_check" ON "public"."itinerary_items" IS 'A verified marker requires a complete provider identity and coordinate pair; NULL marker denotes unresolved or legacy-untrusted data.';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "home_country" character varying(2) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "google_place_id" "text" NOT NULL,
    "place_name" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "place_address" "text",
    "place_category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "saved_places_google_place_id_check" CHECK ((("length"(TRIM(BOTH FROM "google_place_id")) >= 10) AND ("length"(TRIM(BOTH FROM "google_place_id")) <= 200))),
    CONSTRAINT "saved_places_latitude_check" CHECK ((("latitude" >= ('-90'::integer)::double precision) AND ("latitude" <= (90)::double precision))),
    CONSTRAINT "saved_places_longitude_check" CHECK ((("longitude" >= ('-180'::integer)::double precision) AND ("longitude" <= (180)::double precision))),
    CONSTRAINT "saved_places_place_address_check" CHECK ((("place_address" IS NULL) OR ("length"(TRIM(BOTH FROM "place_address")) <= 500))),
    CONSTRAINT "saved_places_place_category_check" CHECK ((("place_category" IS NULL) OR ("length"(TRIM(BOTH FROM "place_category")) <= 100))),
    CONSTRAINT "saved_places_place_name_check" CHECK ((("length"(TRIM(BOTH FROM "place_name")) > 0) AND ("length"(TRIM(BOTH FROM "place_name")) <= 250)))
);


ALTER TABLE "public"."saved_places" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "destination" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "estimated_budget" numeric(12,2),
    "currency" character(3),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "idempotency_key" "text",
    "idempotency_request_hash" "bytea",
    "workspace_revision" integer DEFAULT 1 NOT NULL,
    CONSTRAINT "trips_date_range_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "trips_destination_check" CHECK (("length"(TRIM(BOTH FROM "destination")) > 0)),
    CONSTRAINT "trips_estimated_budget_check" CHECK ((("estimated_budget" IS NULL) OR ("estimated_budget" >= (0)::numeric))),
    CONSTRAINT "trips_idempotency_key_format_check" CHECK ((("idempotency_key" IS NULL) OR (("idempotency_key" = "btrim"("idempotency_key")) AND (("length"("idempotency_key") >= 8) AND ("length"("idempotency_key") <= 128)) AND ("idempotency_key" ~ '^[A-Za-z0-9._:-]+$'::"text")))),
    CONSTRAINT "trips_idempotency_metadata_pair_check" CHECK (((("idempotency_key" IS NULL) AND ("idempotency_request_hash" IS NULL)) OR (("idempotency_key" IS NOT NULL) AND ("idempotency_request_hash" IS NOT NULL)))),
    CONSTRAINT "trips_idempotency_request_hash_length_check" CHECK ((("idempotency_request_hash" IS NULL) OR ("octet_length"("idempotency_request_hash") = 32))),
    CONSTRAINT "trips_title_check" CHECK (("length"(TRIM(BOTH FROM "title")) > 0)),
    CONSTRAINT "trips_workspace_revision_check" CHECK (("workspace_revision" > 0))
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trips"."idempotency_key" IS 'Case-sensitive, owner-scoped opaque key for an idempotent trip-graph creation request.';



COMMENT ON COLUMN "public"."trips"."idempotency_request_hash" IS 'SHA-256 of PostgreSQL canonical JSONB text used to distinguish a retry from key reuse with a different payload.';



COMMENT ON COLUMN "public"."trips"."workspace_revision" IS 'Server-controlled optimistic-concurrency revision. Every trip starts at 1; T003 mutations must compare an expected revision and atomically update this owner-scoped trip row.';



ALTER TABLE ONLY "public"."itinerary_days"
    ADD CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itinerary_days"
    ADD CONSTRAINT "itinerary_days_trip_day_number_key" UNIQUE ("trip_id", "day_number") DEFERRABLE;



ALTER TABLE ONLY "public"."itinerary_item_source_links"
    ADD CONSTRAINT "itinerary_item_source_links_item_position_key" UNIQUE ("itinerary_item_id", "position");



ALTER TABLE ONLY "public"."itinerary_item_source_links"
    ADD CONSTRAINT "itinerary_item_source_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."itinerary_items"
    ADD CONSTRAINT "itinerary_items_day_position_key" UNIQUE ("itinerary_day_id", "position") DEFERRABLE;



ALTER TABLE ONLY "public"."itinerary_items"
    ADD CONSTRAINT "itinerary_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_places"
    ADD CONSTRAINT "saved_places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_places"
    ADD CONSTRAINT "saved_places_user_google_place_unique" UNIQUE ("user_id", "google_place_id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



CREATE INDEX "itinerary_days_trip_id_idx" ON "public"."itinerary_days" USING "btree" ("trip_id");



CREATE INDEX "itinerary_item_source_links_item_id_idx" ON "public"."itinerary_item_source_links" USING "btree" ("itinerary_item_id", "position");



CREATE INDEX "itinerary_items_itinerary_day_id_idx" ON "public"."itinerary_items" USING "btree" ("itinerary_day_id");



CREATE INDEX "saved_places_user_created_id_idx" ON "public"."saved_places" USING "btree" ("user_id", "created_at" DESC, "id" DESC);



CREATE INDEX "trips_user_created_id_idx" ON "public"."trips" USING "btree" ("user_id", "created_at" DESC, "id" DESC);



CREATE UNIQUE INDEX "trips_user_id_idempotency_key_key" ON "public"."trips" USING "btree" ("user_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "trips_user_id_idx" ON "public"."trips" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "itinerary_days_bump_workspace_revision" AFTER INSERT OR DELETE OR UPDATE ON "public"."itinerary_days" FOR EACH ROW EXECUTE FUNCTION "public"."bump_workspace_revision_from_day"();



CREATE CONSTRAINT TRIGGER "itinerary_days_enforce_contiguous_numbers" AFTER INSERT OR DELETE OR UPDATE OF "trip_id", "day_number" ON "public"."itinerary_days" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."enforce_itinerary_day_numbers_contiguous"();



CREATE OR REPLACE TRIGGER "itinerary_item_source_links_bump_workspace_revision" AFTER INSERT OR DELETE OR UPDATE ON "public"."itinerary_item_source_links" FOR EACH ROW EXECUTE FUNCTION "public"."bump_workspace_revision_from_source_link"();



CREATE OR REPLACE TRIGGER "itinerary_item_source_links_enforce_limit" BEFORE INSERT OR UPDATE OF "itinerary_item_id" ON "public"."itinerary_item_source_links" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_itinerary_item_source_link_limit"();



CREATE OR REPLACE TRIGGER "itinerary_items_bump_workspace_revision" AFTER INSERT OR DELETE OR UPDATE ON "public"."itinerary_items" FOR EACH ROW EXECUTE FUNCTION "public"."bump_workspace_revision_from_item"();



CREATE CONSTRAINT TRIGGER "itinerary_items_enforce_contiguous_positions" AFTER INSERT OR DELETE OR UPDATE OF "itinerary_day_id", "position" ON "public"."itinerary_items" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."enforce_itinerary_item_positions_contiguous"();



CREATE OR REPLACE TRIGGER "itinerary_items_enforce_place_provenance" BEFORE INSERT OR UPDATE ON "public"."itinerary_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_itinerary_item_place_provenance"();



CREATE OR REPLACE TRIGGER "itinerary_items_enforce_status_transition" BEFORE INSERT OR UPDATE OF "activity_status", "completed_at", "skipped_at" ON "public"."itinerary_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_itinerary_item_status_transition"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trips_enforce_idempotency_immutable" BEFORE UPDATE OF "idempotency_key", "idempotency_request_hash" ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_trip_idempotency_immutable"();



CREATE OR REPLACE TRIGGER "trips_increment_workspace_revision" BEFORE INSERT OR UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."increment_trip_workspace_revision"();



CREATE OR REPLACE TRIGGER "trips_set_updated_at" BEFORE UPDATE ON "public"."trips" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."itinerary_days"
    ADD CONSTRAINT "itinerary_days_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."itinerary_item_source_links"
    ADD CONSTRAINT "itinerary_item_source_links_itinerary_item_id_fkey" FOREIGN KEY ("itinerary_item_id") REFERENCES "public"."itinerary_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."itinerary_items"
    ADD CONSTRAINT "itinerary_items_itinerary_day_id_fkey" FOREIGN KEY ("itinerary_day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_places"
    ADD CONSTRAINT "saved_places_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."itinerary_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "itinerary_days_delete_own" ON "public"."itinerary_days" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "itinerary_days"."trip_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_days_insert_own" ON "public"."itinerary_days" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "itinerary_days"."trip_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_days_select_own" ON "public"."itinerary_days" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "itinerary_days"."trip_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_days_update_own" ON "public"."itinerary_days" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "itinerary_days"."trip_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trips"
  WHERE (("trips"."id" = "itinerary_days"."trip_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."itinerary_item_source_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "itinerary_item_source_links_delete_own" ON "public"."itinerary_item_source_links" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."itinerary_items" "item"
     JOIN "public"."itinerary_days" "day" ON (("day"."id" = "item"."itinerary_day_id")))
     JOIN "public"."trips" "trip" ON (("trip"."id" = "day"."trip_id")))
  WHERE (("item"."id" = "itinerary_item_source_links"."itinerary_item_id") AND ("trip"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_item_source_links_insert_own" ON "public"."itinerary_item_source_links" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."itinerary_items" "item"
     JOIN "public"."itinerary_days" "day" ON (("day"."id" = "item"."itinerary_day_id")))
     JOIN "public"."trips" "trip" ON (("trip"."id" = "day"."trip_id")))
  WHERE (("item"."id" = "itinerary_item_source_links"."itinerary_item_id") AND ("trip"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_item_source_links_select_own" ON "public"."itinerary_item_source_links" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."itinerary_items" "item"
     JOIN "public"."itinerary_days" "day" ON (("day"."id" = "item"."itinerary_day_id")))
     JOIN "public"."trips" "trip" ON (("trip"."id" = "day"."trip_id")))
  WHERE (("item"."id" = "itinerary_item_source_links"."itinerary_item_id") AND ("trip"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_item_source_links_update_own" ON "public"."itinerary_item_source_links" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."itinerary_items" "item"
     JOIN "public"."itinerary_days" "day" ON (("day"."id" = "item"."itinerary_day_id")))
     JOIN "public"."trips" "trip" ON (("trip"."id" = "day"."trip_id")))
  WHERE (("item"."id" = "itinerary_item_source_links"."itinerary_item_id") AND ("trip"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."itinerary_items" "item"
     JOIN "public"."itinerary_days" "day" ON (("day"."id" = "item"."itinerary_day_id")))
     JOIN "public"."trips" "trip" ON (("trip"."id" = "day"."trip_id")))
  WHERE (("item"."id" = "itinerary_item_source_links"."itinerary_item_id") AND ("trip"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."itinerary_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "itinerary_items_delete_own" ON "public"."itinerary_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."itinerary_days"
     JOIN "public"."trips" ON (("trips"."id" = "itinerary_days"."trip_id")))
  WHERE (("itinerary_days"."id" = "itinerary_items"."itinerary_day_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_items_insert_own" ON "public"."itinerary_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."itinerary_days"
     JOIN "public"."trips" ON (("trips"."id" = "itinerary_days"."trip_id")))
  WHERE (("itinerary_days"."id" = "itinerary_items"."itinerary_day_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_items_select_own" ON "public"."itinerary_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."itinerary_days"
     JOIN "public"."trips" ON (("trips"."id" = "itinerary_days"."trip_id")))
  WHERE (("itinerary_days"."id" = "itinerary_items"."itinerary_day_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "itinerary_items_update_own" ON "public"."itinerary_items" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."itinerary_days"
     JOIN "public"."trips" ON (("trips"."id" = "itinerary_days"."trip_id")))
  WHERE (("itinerary_days"."id" = "itinerary_items"."itinerary_day_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."itinerary_days"
     JOIN "public"."trips" ON (("trips"."id" = "itinerary_days"."trip_id")))
  WHERE (("itinerary_days"."id" = "itinerary_items"."itinerary_day_id") AND ("trips"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."saved_places" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "saved_places_delete_own" ON "public"."saved_places" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "saved_places_insert_own" ON "public"."saved_places" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "saved_places_select_own" ON "public"."saved_places" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "saved_places_update_own" ON "public"."saved_places" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trips_delete_own" ON "public"."trips" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "trips_insert_own" ON "public"."trips" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "trips_select_own" ON "public"."trips" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "trips_update_own" ON "public"."trips" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_verified_place_snapshot"("p_owner_id" "uuid", "p_item_id" "uuid", "p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_verified_place_snapshot"("p_owner_id" "uuid", "p_item_id" "uuid", "p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_workspace_revision_from_day"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_workspace_revision_from_day"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_workspace_revision_from_item"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_workspace_revision_from_item"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_workspace_revision_from_source_link"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_workspace_revision_from_source_link"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_profile_for_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_travel_workspace_item"("p_command" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_travel_workspace_item"("p_command" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_travel_workspace_item"("p_command" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_trip_graph"("p_graph" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_trip_graph"("p_graph" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_trip_graph"("p_idempotency_key" "text", "p_graph" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_trip_graph"("p_idempotency_key" "text", "p_graph" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_graph"("p_idempotency_key" "text", "p_graph" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_saved_trip"("p_trip_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_saved_trip"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_saved_trip"("p_trip_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_user_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enforce_itinerary_day_numbers_contiguous"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_itinerary_day_numbers_contiguous"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_itinerary_item_place_provenance"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_itinerary_item_place_provenance"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_itinerary_item_positions_contiguous"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_itinerary_item_positions_contiguous"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_itinerary_item_source_link_limit"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_itinerary_item_source_link_limit"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_itinerary_item_status_transition"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_itinerary_item_status_transition"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_trip_idempotency_immutable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_trip_idempotency_immutable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_saved_trip_detail"("p_trip_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_saved_trip_detail"("p_trip_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_saved_trip_detail"("p_trip_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_trip_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_trip_stats"() TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_trip_stats"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."increment_trip_workspace_revision"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_trip_workspace_revision"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_saved_places"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid", "p_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_saved_places"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid", "p_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_saved_places"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid", "p_category" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_saved_trips"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_saved_trips"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_saved_trips"("p_limit" integer, "p_cursor_created_at" timestamp with time zone, "p_cursor_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mutate_travel_workspace"("p_command" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mutate_travel_workspace"("p_command" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mutate_travel_workspace"("p_command" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "anon";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_place"("p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_place"("p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_place"("p_google_place_id" "text", "p_place_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_place_address" "text", "p_place_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."unsave_place"("p_google_place_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."unsave_place"("p_google_place_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unsave_place"("p_google_place_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_itinerary_item_note"("p_item_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_itinerary_item_note"("p_item_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_itinerary_item_note"("p_item_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON TABLE "public"."itinerary_days" TO "authenticated";
GRANT ALL ON TABLE "public"."itinerary_days" TO "service_role";



GRANT ALL ON TABLE "public"."itinerary_item_source_links" TO "authenticated";
GRANT ALL ON TABLE "public"."itinerary_item_source_links" TO "service_role";



GRANT ALL ON TABLE "public"."itinerary_items" TO "authenticated";
GRANT ALL ON TABLE "public"."itinerary_items" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."saved_places" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_places" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







