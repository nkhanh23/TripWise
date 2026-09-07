-- FEATURE-P2-T002 atomic same-day/cross-day move matrix.
create table if not exists workspace_move_state (name text primary key, value_uuid uuid not null);

insert into public.trips(id,user_id,title,destination,start_date,end_date)
values ('92000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Move contract','Hue','2028-02-01','2028-02-02');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('92000000-0000-4000-8000-000000000011','92000000-0000-4000-8000-000000000001',1,'2028-02-01'),
('92000000-0000-4000-8000-000000000012','92000000-0000-4000-8000-000000000001',2,'2028-02-02');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name,google_place_id,latitude,longitude,place_address,place_category,place_resolved_at) values
('92000000-0000-4000-8000-000000000021','92000000-0000-4000-8000-000000000011',1,'A','place-a',16.1,107.1,'A address','museum','2028-01-01T00:00:00Z'),
('92000000-0000-4000-8000-000000000022','92000000-0000-4000-8000-000000000011',2,'B',null,null,null,null,null,null),
('92000000-0000-4000-8000-000000000023','92000000-0000-4000-8000-000000000011',3,'C',null,null,null,null,null,null),
('92000000-0000-4000-8000-000000000024','92000000-0000-4000-8000-000000000011',4,'D',null,null,null,null,null,null),
('92000000-0000-4000-8000-000000000025','92000000-0000-4000-8000-000000000012',1,'B1',null,null,null,null,null,null),
('92000000-0000-4000-8000-000000000026','92000000-0000-4000-8000-000000000012',2,'B2',null,null,null,null,null,null);
insert into workspace_move_state(name,value_uuid) values
('trip','92000000-0000-4000-8000-000000000001'),('day1','92000000-0000-4000-8000-000000000011'),('day2','92000000-0000-4000-8000-000000000012'),('verified','92000000-0000-4000-8000-000000000021'),('move','92000000-0000-4000-8000-000000000022');
grant select on workspace_move_state to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare v_revision integer; v_result jsonb; v_before record; v_after record;
begin
  select google_place_id, latitude, longitude, place_address, place_category, place_resolved_at, place_name, item_kind, activity_status into v_before from public.itinerary_items where id=(select value_uuid from workspace_move_state where name='verified');
  select workspace_revision into v_revision from public.trips where id=(select value_uuid from workspace_move_state where name='trip');
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId','92000000-0000-4000-8000-000000000024','expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day1'),'targetPosition',2));
  if (v_result->>'revision')::integer <= v_revision or (select array_agg(place_name order by position) from public.itinerary_items where itinerary_day_id=(select value_uuid from workspace_move_state where name='day1')) <> array['A','D','B','C'] then raise exception 'Same-day reorder contract failed.'; end if;
  v_revision := (v_result->>'revision')::integer;
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId','92000000-0000-4000-8000-000000000024','expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day1'),'targetPosition',2));
  if v_result->>'noOp' <> 'true' or (v_result->>'revision')::integer <> v_revision then raise exception 'Same-position no-op changed revision.'; end if;
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId','92000000-0000-4000-8000-000000000021','expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day1'),'targetPosition',4));
  v_revision := (v_result->>'revision')::integer;
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId','92000000-0000-4000-8000-000000000021','expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day1'),'targetPosition',1));
  v_revision := (v_result->>'revision')::integer;
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='move'),'expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day2'),'targetPosition',2));
  v_revision := (v_result->>'revision')::integer;
  if (select array_agg(position order by position) from public.itinerary_items where itinerary_day_id=(select value_uuid from workspace_move_state where name='day1')) <> array[1,2,3]
     or (select array_agg(position order by position) from public.itinerary_items where itinerary_day_id=(select value_uuid from workspace_move_state where name='day2')) <> array[1,2,3]
     or not exists (select 1 from public.itinerary_items where id=(select value_uuid from workspace_move_state where name='move') and itinerary_day_id=(select value_uuid from workspace_move_state where name='day2') and position=2) then raise exception 'Cross-day move did not preserve stable/contiguous graph.'; end if;
  select google_place_id, latitude, longitude, place_address, place_category, place_resolved_at, place_name, item_kind, activity_status into v_after from public.itinerary_items where id=(select value_uuid from workspace_move_state where name='verified');
  if v_after is distinct from v_before then raise exception 'Move changed verified provider provenance.'; end if;
  -- Move the VERIFIED item itself across days, then back, and compare the
  -- snapshot captured before any same-day or cross-day movement.
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='verified'),'expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day2'),'targetPosition',1));
  v_revision := (v_result->>'revision')::integer;
  select google_place_id, latitude, longitude, place_address, place_category, place_resolved_at, place_name, item_kind, activity_status into v_after from public.itinerary_items where id=(select value_uuid from workspace_move_state where name='verified');
  if v_after is distinct from v_before or not exists(select 1 from public.itinerary_items where id=(select value_uuid from workspace_move_state where name='verified') and itinerary_day_id=(select value_uuid from workspace_move_state where name='day2') and position=1) then raise exception 'Moving verified item changed identity/provenance.'; end if;
  v_result := public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='verified'),'expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day1'),'targetPosition',1));
  v_revision := (v_result->>'revision')::integer;
  begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='move'),'expectedRevision',v_revision,'targetDayId',(select value_uuid from workspace_move_state where name='day2'),'targetPosition',5)); raise exception 'Expected invalid target position rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='move'),'expectedRevision',v_revision,'targetDayId','92000000-0000-4000-8000-000000000099','targetPosition',1)); raise exception 'Expected invalid target day rejection.';
  exception when sqlstate 'TW008' then null; end;
  begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='move'),'expectedRevision',v_revision-1,'targetDayId',(select value_uuid from workspace_move_state where name='day2'),'targetPosition',1)); raise exception 'Expected stale move conflict.';
  exception when sqlstate 'TW009' then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin begin perform public.move_travel_workspace_item(jsonb_build_object('type','move_item','tripId',(select value_uuid from workspace_move_state where name='trip'),'itemId',(select value_uuid from workspace_move_state where name='move'),'expectedRevision',1,'targetDayId',(select value_uuid from workspace_move_state where name='day1'),'targetPosition',1)); raise exception 'Cross-user move disclosed workspace.'; exception when sqlstate 'TW008' then null; end; end $$;
reset role;
do $$ begin
  if to_regprocedure('public.move_travel_workspace_item(jsonb)') is null or not has_function_privilege('authenticated','public.move_travel_workspace_item(jsonb)','EXECUTE') or has_function_privilege('anon','public.move_travel_workspace_item(jsonb)','EXECUTE') or exists (select 1 from pg_proc where oid='public.move_travel_workspace_item(jsonb)'::regprocedure and prosecdef) then raise exception 'P2 T002 SECURITY INVOKER move RPC privilege contract is invalid.'; end if;
end $$;
select 'workspace_move_contract_pass' as result;
