-- FEATURE-P2-T002: a single owner-scoped command for same-day reorder and
-- cross-day move.  The committed-order invariant remains the P1 deferred
-- constraint trigger; this function never deletes or recreates an item.
create function public.move_travel_workspace_item(p_command jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_trip_id uuid;
  v_item_id uuid;
  v_target_day_id uuid;
  v_expected_revision integer;
  v_current_revision integer;
  v_source_day_id uuid;
  v_source_position integer;
  v_source_count integer;
  v_target_count integer;
  v_target_position integer;
  v_current_day_id uuid;
begin
  if v_user_id is null then
    raise exception 'Workspace authentication is required.' using errcode = 'TW006';
  end if;
  if p_command is null or jsonb_typeof(p_command) <> 'object' or octet_length(p_command::text) > 50000
     or not (p_command - 'type' - 'tripId' - 'itemId' - 'expectedRevision' - 'targetDayId' - 'targetPosition' = '{}'::jsonb)
     or p_command->>'type' <> 'move_item'
     or jsonb_typeof(p_command->'tripId') <> 'string'
     or jsonb_typeof(p_command->'itemId') <> 'string'
     or jsonb_typeof(p_command->'targetDayId') <> 'string'
     or jsonb_typeof(p_command->'expectedRevision') <> 'number'
     or jsonb_typeof(p_command->'targetPosition') <> 'number' then
    raise exception 'Workspace move command is invalid.' using errcode = 'TW007';
  end if;
  begin
    v_trip_id := (p_command->>'tripId')::uuid;
    v_item_id := (p_command->>'itemId')::uuid;
    v_target_day_id := (p_command->>'targetDayId')::uuid;
    if (p_command->>'expectedRevision') !~ '^[1-9][0-9]*$'
       or (p_command->>'targetPosition') !~ '^[1-9][0-9]*$' then
      raise exception 'Workspace move command is invalid.' using errcode = 'TW007';
    end if;
    v_expected_revision := (p_command->>'expectedRevision')::integer;
    v_target_position := (p_command->>'targetPosition')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Workspace move command is invalid.' using errcode = 'TW007';
  end;

  -- 1. Optimistically read source day
  select itinerary_day_id into v_source_day_id
  from public.itinerary_items
  where id = v_item_id;
  if not found then raise exception 'Workspace resource was not found.' using errcode = 'TW008'; end if;

  -- 2. Lock ALL affected items in deterministic UUID order to prevent deadlocks
  -- with direct sibling mutations (which lock item -> trip -> day)
  perform 1
  from public.itinerary_items
  where itinerary_day_id in (v_source_day_id, v_target_day_id)
  order by id
  for update;

  -- 3. Re-verify the source item is still in v_source_day_id and part of the trip
  select item.itinerary_day_id, item.position into v_current_day_id, v_source_position
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  where item.id = v_item_id and day.trip_id = v_trip_id;
  if not found then raise exception 'Workspace resource was not found.' using errcode = 'TW008'; end if;
  if v_current_day_id <> v_source_day_id then
    -- It was concurrently moved to another day before we locked it.
    -- The revision must have bumped, so a conflict is accurate.
    raise exception 'Workspace revision conflict.' using errcode = 'TW009';
  end if;

  -- 4. Lock affected days in deterministic UUID order BEFORE the trip.
  -- This prevents deadlocks with direct day mutations (which lock day -> trip).
  perform 1
  from public.itinerary_days
  where trip_id = v_trip_id and id in (v_source_day_id, v_target_day_id)
  order by id
  for update;

  if (select count(*) from public.itinerary_days where trip_id = v_trip_id and id in (v_source_day_id, v_target_day_id))
     <> (case when v_source_day_id = v_target_day_id then 1 else 2 end) then
    raise exception 'Workspace resource was not found.' using errcode = 'TW008';
  end if;

  -- 5. Finally, lock the trip and check the revision.
  select trip.workspace_revision into v_current_revision
  from public.trips as trip
  where trip.id = v_trip_id and trip.user_id = v_user_id
  for update;
  if not found then raise exception 'Workspace resource was not found.' using errcode = 'TW008'; end if;
  if v_current_revision <> v_expected_revision then
    raise exception 'Workspace revision conflict.' using errcode = 'TW009';
  end if;

  select count(*) into v_source_count from public.itinerary_items where itinerary_day_id = v_source_day_id;
  if v_target_day_id = v_source_day_id then
    if v_target_position > v_source_count then
      raise exception 'Workspace target position is invalid.' using errcode = 'TW014';
    end if;
    if v_target_position = v_source_position then
      return jsonb_build_object('revision', v_current_revision, 'noOp', true);
    end if;
    set constraints itinerary_items_day_position_key deferred;
    update public.itinerary_items
    set position = case
      when id = v_item_id then v_target_position
      when v_source_position < v_target_position and position > v_source_position and position <= v_target_position then position - 1
      when v_source_position > v_target_position and position >= v_target_position and position < v_source_position then position + 1
      else position
    end
    where itinerary_day_id = v_source_day_id;
  else
    select count(*) into v_target_count from public.itinerary_items where itinerary_day_id = v_target_day_id;
    if v_target_position > v_target_count + 1 then
      raise exception 'Workspace target position is invalid.' using errcode = 'TW014';
    end if;
    set constraints itinerary_items_day_position_key deferred;
    update public.itinerary_items
    set position = position - 1
    where itinerary_day_id = v_source_day_id and position > v_source_position;
    update public.itinerary_items
    set position = position + 1
    where itinerary_day_id = v_target_day_id and position >= v_target_position;
    update public.itinerary_items
    set itinerary_day_id = v_target_day_id, position = v_target_position
    where id = v_item_id;
  end if;

  select workspace_revision into v_current_revision from public.trips where id = v_trip_id;
  return jsonb_build_object('revision', v_current_revision);
exception
  when sqlstate 'TW006' then raise;
  when sqlstate 'TW007' then raise;
  when sqlstate 'TW008' then raise;
  when sqlstate 'TW009' then raise;
  when sqlstate 'TW014' then raise;
  when check_violation then raise exception 'Workspace target is invalid.' using errcode = 'TW014';
  when others then raise exception 'Workspace move failed: %', sqlerrm using errcode = 'TW007';
end;
$$;

comment on function public.move_travel_workspace_item(jsonb) is
  'FEATURE-P2-T002 SECURITY INVOKER owner-scoped atomic reorder/move. Locks all source/destination items by UUID, then both days by UUID, then trip; compares trips.workspace_revision; preserves stable item identity and provider fields.';

revoke all on function public.move_travel_workspace_item(jsonb) from public, anon;
grant execute on function public.move_travel_workspace_item(jsonb) to authenticated;

