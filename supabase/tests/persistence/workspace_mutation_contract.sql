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
  ('71000000-0000-4000-8000-000000000022','71000000-0000-4000-8000-000000000012',1,'Other owner item');
insert into workspace_mutation_state values ('trip','71000000-0000-4000-8000-000000000001'), ('item','71000000-0000-4000-8000-000000000021');

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
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('googlePlaceId','forged')));
    raise exception 'Expected provider field rejection.';
  exception when sqlstate 'TW010' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'patch',jsonb_build_object('kind','note','placeQuery','forbidden')));
    raise exception 'Expected invalid field-kind rejection.';
  exception when sqlstate 'TW011' then null; end;
  begin
    perform public.mutate_travel_workspace(jsonb_build_object('type','replace_source_links','tripId',(select value_uuid from workspace_mutation_state where name='trip'),'itemId',(select value_uuid from workspace_mutation_state where name='item'),'expectedRevision',(v_result->>'revision')::integer,'links',jsonb_build_array(jsonb_build_object('type','website','url','javascript:alert(1)'))));
    raise exception 'Expected unsafe link rejection.';
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
