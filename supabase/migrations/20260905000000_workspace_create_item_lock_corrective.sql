-- T001 Corrective: Re-align create item lock order to match direct writers (day -> trip).
-- We CREATE OR REPLACE this function safely as requested in T002 to avoid a deadlock
-- between direct day updates (day -> trip trigger) and the original create (trip -> day for key share).

create or replace function public.create_travel_workspace_item(p_command jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
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
  
    -- CORRECTIVE: Lock day FIRST to match direct writer (day -> trip trigger) lock order
    perform 1 from public.itinerary_days where id = v_day_id and trip_id = v_trip_id for update;
    if not found then raise exception 'Day was not found.' using errcode = 'TW008'; end if;
    
    select workspace_revision into v_current_revision from public.trips
    where id = v_trip_id and user_id = v_user_id for update;
    if not found then raise exception 'Trip was not found.' using errcode = 'TW008'; end if;
    if v_current_revision <> v_revision then raise exception 'Trip was updated elsewhere.' using errcode = 'TW009'; end if;
    
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
$$;

comment on function public.create_travel_workspace_item(jsonb) is
  'FEATURE-P2-T001 SECURITY INVOKER owner-scoped CAS creation; lock order ensures no deadlocks with trigger-based updates. Only appends CUSTOM_ACTIVITY items; the trip row lock serializes append position and revision.';
