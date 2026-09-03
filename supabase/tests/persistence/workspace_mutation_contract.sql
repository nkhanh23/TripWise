\set ON_ERROR_STOP on

create temporary table workspace_mutation_state(name text primary key, value_uuid uuid not null);

insert into public.trips(id,user_id,title,destination,start_date,end_date)
values
  ('71000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Workspace A','Hue','2028-01-01','2028-01-01'),
  ('71000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Workspace B','Da Nang','2028-01-01','2028-01-01');
insert into public.itinerary_days(id,trip_id,day_number,date)
values
  ('71000000-0000-4000-8000-000000000011','71000000-0000-4000-8000-000000000001',1,'2028-01-01'),
  ('71000000-0000-4000-8000-000000000012','71000000-0000-4000-8000-000000000002',1,'2028-01-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name)
values
  ('71000000-0000-4000-8000-000000000021','71000000-0000-4000-8000-000000000011',1,'Owner item'),
  ('71000000-0000-4000-8000-000000000023','71000000-0000-4000-8000-000000000011',2,'Verified item'),
  ('71000000-0000-4000-8000-000000000022','71000000-0000-4000-8000-000000000012',1,'Other owner item');
update public.itinerary_items set google_place_id='verified-place-id', latitude=16.4, longitude=107.5, place_resolved_at=clock_timestamp()
where id='71000000-0000-4000-8000-000000000023';
insert into workspace_mutation_state values ('trip','71000000-0000-4000-8000-000000000001'), ('item','71000000-0000-4000-8000-000000000021');
grant select on workspace_mutation_state to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

do $$
declare v_result jsonb; v_revision integer;
begin
  select workspace_revision into v_revision from public.trips where id=(select value_uuid from workspace_mutation_state where name='trip');
  v_result := public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',v_revision,'patch',jsonb_build_object('note','Owner edit','flexibility','flexible')));
  if (v_result->>'revision')::integer <= v_revision or (select note from public.itinerary_items where id=(select value_uuid from workspace_mutation_state where name='item')) <> 'Owner edit' then raise exception 'T003 owner CAS mutation did not persist.'; end if;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',v_revision,'patch',jsonb_build_object('note','Stale')));
    raise exception 'Expected stale revision conflict.';
  exception when sqlstate 'TW009' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch','{}'::jsonb));
    raise exception 'Expected empty patch rejection.';
  exception when sqlstate 'TW010' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId','71000000-0000-4000-8000-000000000023','expectedRevision',(select workspace_revision from public.trips where id=(select value_uuid from workspace_mutation_state where name='trip')),'patch',jsonb_build_object('placeName','Forged replacement')));
    raise exception 'Expected verified placeName rejection.';
  exception when sqlstate 'TW013' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('transport',jsonb_build_object('mode','drive','departureAt','2028-01-01T10:00:00Z'))));
    raise exception 'Expected incomplete transport timestamp rejection.';
  exception when sqlstate 'TW011' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('accommodation',jsonb_build_object('checkInAt','2028-01-03T15:00:00Z','checkOutAt','2028-01-01T11:00:00Z','nights',2))));
    raise exception 'Expected invalid accommodation rejection.';
  exception when sqlstate 'TW011' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('contact',jsonb_build_object('websiteUrl','javascript:alert(1)'))));
    raise exception 'Expected unsafe contact URL rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('googlePlaceId','forged')));
    raise exception 'Expected provider field rejection.';
  exception when sqlstate 'TW013' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('ownerId','forged')));
    raise exception 'Expected server-owned owner rejection.';
  exception when sqlstate 'TW013' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('completedAt','2028-01-01T10:00:00Z')));
    raise exception 'Expected server-owned lifecycle timestamp rejection.';
  exception when sqlstate 'TW013' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision','1','patch',jsonb_build_object('note','wrong revision type')));
    raise exception 'Expected strict expectedRevision type rejection.';
  exception when sqlstate 'TW007' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('placeName',42)));
    raise exception 'Expected strict placeName type rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('note',true)));
    raise exception 'Expected strict note type rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('contact',jsonb_build_object('phone',123))));
    raise exception 'Expected strict contact type rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('transport',jsonb_build_object('plannedCostAmount','123'))));
    raise exception 'Expected strict transport amount type rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('accommodation',jsonb_build_object('nights','2'))));
    raise exception 'Expected strict accommodation nights type rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','replace_source_links','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'links',jsonb_build_array(jsonb_build_object('type',42,'url',true))));
    raise exception 'Expected strict source-link scalar rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('ordinaryUnknown','x')));
    raise exception 'Expected ordinary unknown field rejection.';
  exception when sqlstate 'TW010' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('kind','note')));
    raise exception 'Expected immutable-kind rejection.';
  exception when sqlstate 'TW010' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','replace_source_links','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'links',jsonb_build_array(jsonb_build_object('type','website','url','javascript:alert(1)'))));
    raise exception 'Expected unsafe link rejection.';
  exception when sqlstate 'TW014' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','replace_source_links','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'links',(select jsonb_agg(jsonb_build_object('type','website','url','https://example.test/' || value)) from generate_series(1,13) value)));
    raise exception 'Expected source-link cap rejection.';
  exception when sqlstate 'TW014' then null; end;
  v_result := public.mutate_travel_workspace(jsonb_build_object('type','replace_source_links','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'links',jsonb_build_array(jsonb_build_object('type','website','url','https://example.test/one'),jsonb_build_object('type','other','url','https://example.test/two','label','Two'))));
  if (select count(*) from public.itinerary_item_source_links where itinerary_item_id=(select value_uuid from workspace_mutation_state where name='item')) <> 2 then raise exception 'T003 source-link replacement was not atomic.'; end if;
  v_result := public.mutate_travel_workspace(jsonb_build_object('type','transition_item_status','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'status','completed'));
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','transition_item_status','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'status','skipped'));
    raise exception 'Expected invalid lifecycle transition.';
  exception when sqlstate 'TW012' then null; end;
end $$;

do $$
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',1,'patch',jsonb_build_object('note','cross-user')));
    raise exception 'Expected cross-user non-disclosure.';
  exception when sqlstate 'TW008' then null; end;
end $$;

reset role;
do $$ begin
  if has_function_privilege('anon','public.mutate_travel_workspace(jsonb)','EXECUTE') or not has_function_privilege('authenticated','public.mutate_travel_workspace(jsonb)','EXECUTE') then raise exception 'T003 RPC privilege contract is invalid.'; end if;
end $$;

select 'workspace_mutation_contract_pass' as result;
