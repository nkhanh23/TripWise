\set ON_ERROR_STOP on
insert into public.trips(id,user_id,title,destination,start_date,end_date) values
('76000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Progress','Hue','2028-01-01','2028-01-01'),
('76000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Foreign','Hue','2028-01-01','2028-01-01');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('76000000-0000-4000-8000-000000000011','76000000-0000-4000-8000-000000000001',1,'2028-01-01'),
('76000000-0000-4000-8000-000000000012','76000000-0000-4000-8000-000000000002',1,'2028-01-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name) values
('76000000-0000-4000-8000-000000000021','76000000-0000-4000-8000-000000000011',1,'Item'),
('76000000-0000-4000-8000-000000000022','76000000-0000-4000-8000-000000000012',1,'Foreign');
create function pg_temp.progress_assert(ok boolean) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Progress assertion failed.'; end if; end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare c jsonb; r integer; s text; n integer; result jsonb;
begin
  c := jsonb_build_object('type','transition_item_status','tripId','76000000-0000-4000-8000-000000000001','itemId','76000000-0000-4000-8000-000000000021');
  foreach s in array array['completed','scheduled','skipped','scheduled'] loop
    select workspace_revision into r from public.trips where id=(c->>'tripId')::uuid;
    perform public.mutate_travel_workspace(c || jsonb_build_object('expectedRevision',r,'status',s));
    perform pg_temp.progress_assert((select count(*)=1 from public.trip_progress_events where trip_id=(c->>'tripId')::uuid and revision=r+1 and to_status=s));
    select count(*) into n from public.trip_progress_events where trip_id=(c->>'tripId')::uuid;
    begin
      perform public.mutate_travel_workspace(c || jsonb_build_object('expectedRevision',r,'status',s));
      raise exception 'Stale command accepted';
    exception when sqlstate 'TW009' then null; end;
    if s in ('completed','skipped') then
      begin
        perform public.mutate_travel_workspace(c || jsonb_build_object('expectedRevision',r+1,'status',case s when 'completed' then 'skipped' else 'completed' end));
        raise exception 'Invalid transition accepted';
      exception when sqlstate 'TW012' then null; end;
      perform pg_temp.progress_assert((select occurred_at=case s when 'completed' then i.completed_at else i.skipped_at end
        from public.trip_progress_events e join public.itinerary_items i on i.id=e.item_id where e.trip_id=(c->>'tripId')::uuid and e.revision=r+1));
    end if;
    perform pg_temp.progress_assert((select count(*)=n from public.trip_progress_events where trip_id=(c->>'tripId')::uuid));
  end loop;
  result := public.read_trip_progress(jsonb_build_object('tripId',c->>'tripId','kind','state'));
  perform pg_temp.progress_assert(result->'days'->0->>'scheduled'='1' and result->'days'->0->>'completed'='0' and result->'days'->0->>'skipped'='0');
  perform pg_temp.progress_assert(jsonb_array_length(public.read_trip_progress(jsonb_build_object('tripId',c->>'tripId','kind','events','limit',2)))=3);
  perform pg_temp.progress_assert(jsonb_array_length(public.read_trip_progress(jsonb_build_object('tripId',c->>'tripId','kind','events','limit',2,'beforeRevision',5)))=1);
  select workspace_revision into r from public.trips where id=(c->>'tripId')::uuid;
  -- Same-state update is not a lifecycle fact, even though baseline advances CAS.
  perform public.mutate_travel_workspace(c || jsonb_build_object('expectedRevision',r,'status','scheduled'));
  perform pg_temp.progress_assert((select count(*)=4 from public.trip_progress_events where trip_id=(c->>'tripId')::uuid));
  begin
    perform public.mutate_travel_workspace(c || jsonb_build_object('expectedRevision',r+1,'status','completed'));
    raise exception 'force rollback' using errcode='ZX001';
  exception when sqlstate 'ZX001' then null; end;
  perform pg_temp.progress_assert((select count(*)=4 from public.trip_progress_events where trip_id=(c->>'tripId')::uuid));
  begin
    perform public.mutate_travel_workspace(c || jsonb_build_object('itemId','76000000-0000-4000-8000-000000000022','expectedRevision',r+1,'status','completed'));
    raise exception 'Foreign item accepted';
  exception when sqlstate 'TW008' then null; end;
  begin
    perform public.mutate_travel_workspace(c || jsonb_build_object('ownerId','11111111-1111-4111-8111-111111111111','expectedRevision',r+1,'status','completed'));
    raise exception 'Forged owner accepted';
  exception when sqlstate 'TW013' then null; end;
  begin
    perform public.read_trip_progress('{"tripId":"76000000-0000-4000-8000-000000000002","kind":"state"}');
    raise exception 'Foreign trip accepted';
  exception when sqlstate 'TW008' then null; end;
  foreach result in array array[
    '{"tripId":"76000000-0000-4000-8000-000000000001","kind":"events","limit":51}'::jsonb,
    '{"tripId":"76000000-0000-4000-8000-000000000001","kind":"events","beforeRevision":null}'::jsonb,
    '{"tripId":"76000000-0000-4000-8000-000000000001","kind":"state","ownerId":"forged"}'::jsonb,
    '{"tripId":"bad","kind":"state"}'::jsonb] loop
    begin perform public.read_trip_progress(result); raise exception 'Bad input accepted';
    exception when sqlstate 'TW022' then null; end;
  end loop;
  begin
    insert into public.trip_progress_events default values;
    raise exception 'Direct insert accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.trip_progress_events set to_status='completed';
    raise exception 'Direct update accepted';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.trip_progress_events;
    raise exception 'Direct delete accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform tripwise_private.record_trip_progress(null,null,1,'scheduled','completed',now());
    raise exception 'Private sink exposed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
select pg_temp.progress_assert((select count(*)=0 from public.trip_progress_events));
select set_config('request.jwt.claim.sub','',false);
do $$ begin
  begin perform public.read_trip_progress('{"tripId":"76000000-0000-4000-8000-000000000001","kind":"state"}'); raise exception 'Missing session accepted';
  exception when sqlstate 'TW006' then null; end;
end $$;
set role anon;
do $$ begin
  begin perform public.read_trip_progress('{"tripId":"76000000-0000-4000-8000-000000000001","kind":"state"}'); raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Internal sink retry identity is durable and payload conflict deterministic.
do $$ declare e public.trip_progress_events%rowtype; v uuid; begin
  select * into strict e from public.trip_progress_events where trip_id='76000000-0000-4000-8000-000000000001' and revision=4;
  v := tripwise_private.record_trip_progress(e.trip_id,e.item_id,e.revision,e.from_status,e.to_status,e.occurred_at);
  perform pg_temp.progress_assert(v=e.id);
  begin
    perform tripwise_private.record_trip_progress(e.trip_id,e.item_id,e.revision,e.from_status,'skipped',e.occurred_at);
    raise exception 'Payload conflict accepted';
  exception when sqlstate 'TW023' then null; end;
  perform pg_temp.progress_assert((select count(*)=4 from public.trip_progress_events where trip_id=e.trip_id));
end $$;
select 'trip_progress_owner_transition_idempotency_pass' as result;

-- Fault injection is transaction-local; original schema survives ROLLBACK.
begin;
alter table public.trip_progress_events add constraint test_progress_sink_failure check (to_status<>'completed') not valid;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$ declare r integer; begin
  select workspace_revision into r from public.trips where id='76000000-0000-4000-8000-000000000001';
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','transition_item_status','tripId','76000000-0000-4000-8000-000000000001',
      'itemId','76000000-0000-4000-8000-000000000021','expectedRevision',r,'status','completed'));
    raise exception 'Sink failure accepted';
  exception when sqlstate 'TW024' then null; end;
  perform pg_temp.progress_assert((select workspace_revision=r from public.trips where id='76000000-0000-4000-8000-000000000001'));
  perform pg_temp.progress_assert((select activity_status='scheduled' from public.itinerary_items where id='76000000-0000-4000-8000-000000000021'));
  perform pg_temp.progress_assert((select count(*)=4 from public.trip_progress_events where trip_id='76000000-0000-4000-8000-000000000001'));
end $$;
rollback;
select 'trip_progress_sink_failure_atomic_rollback_pass' as result;
