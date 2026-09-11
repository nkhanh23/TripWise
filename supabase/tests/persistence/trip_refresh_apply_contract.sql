\set ON_ERROR_STOP on

create or replace function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if coalesce(p_condition, false) is not true then raise exception '%', p_message; end if;
end;
$$;

-- Public surface and the idempotency table must not expose a bypass around the
-- owner-scoped RPC. All fixture writes below occur before switching roles.
do $$
begin
  if has_function_privilege('anon', 'public.apply_trip_refresh(jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.apply_trip_refresh(jsonb)', 'EXECUTE')
     or (select prosecdef from pg_proc where oid = 'public.apply_trip_refresh(jsonb)'::regprocedure) then
    raise exception 'Refresh RPC privileges or SECURITY INVOKER contract is invalid.';
  end if;
end;
$$;

insert into public.trips(id,user_id,title,destination,start_date,end_date)
values ('85000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Refresh apply','Hue','2028-08-01','2028-08-02');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('85000000-0000-4000-8000-000000000011','85000000-0000-4000-8000-000000000001',1,'2028-08-01'),
('85000000-0000-4000-8000-000000000012','85000000-0000-4000-8000-000000000001',2,'2028-08-02');
insert into public.itinerary_items(
  id,itinerary_day_id,position,place_name,item_kind,flexibility,priority,activity_status,
  google_place_id,latitude,longitude,place_address,place_category,place_resolved_at
) values
('85000000-0000-4000-8000-000000000021','85000000-0000-4000-8000-000000000011',1,'Fixed','place','fixed','must_do','scheduled',null,null,null,null,null,null),
('85000000-0000-4000-8000-000000000022','85000000-0000-4000-8000-000000000011',2,'Verified A','place','flexible','want_to_do','scheduled','google-a',16.1,108.1,'A','museum','2028-01-01T00:00:00Z'),
('85000000-0000-4000-8000-000000000023','85000000-0000-4000-8000-000000000011',3,'Verified B','place','flexible','must_do','scheduled','google-b',16.2,108.2,'B','park','2028-01-01T00:00:00Z'),
('85000000-0000-4000-8000-000000000024','85000000-0000-4000-8000-000000000011',4,'Timed','custom_activity','flexible','optional','scheduled',null,null,null,null,null,null),
('85000000-0000-4000-8000-000000000025','85000000-0000-4000-8000-000000000012',1,'Reserved','reservation','flexible','must_do','scheduled',null,null,null,null,null,null);
update public.itinerary_items set start_time='09:00' where id='85000000-0000-4000-8000-000000000024';
update public.itinerary_items set reservation_code='CONFIRMED-001' where id='85000000-0000-4000-8000-000000000025';
insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position)
values('85000000-0000-4000-8000-000000000022','booking','https://example.test/booking',1);

create temporary table refresh_fixture(revision integer not null);
insert into refresh_fixture select workspace_revision from public.trips where id='85000000-0000-4000-8000-000000000001';
create temporary table refresh_idempotency_before as
select count(*)::integer as total from public.trip_refresh_apply_idempotency;
grant select, update on refresh_fixture, refresh_idempotency_before to authenticated;

-- No authenticated caller can use a direct durable-idempotency table write.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
begin
  begin
    insert into public.trip_refresh_apply_idempotency(owner_id,confirmation_id,request_hash,trip_id,expected_revision)
    values('11111111-1111-4111-8111-111111111111','direct-write-01',decode(repeat('00',32),'hex'),'85000000-0000-4000-8000-000000000001',1);
    raise exception 'Direct idempotency write unexpectedly succeeded.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

do $$
declare
  v_before integer := (select revision from refresh_fixture);
  v_result jsonb;
  v_after integer;
  v_command jsonb := jsonb_build_object(
    'tripId','85000000-0000-4000-8000-000000000001','expectedRevision',v_before,
    'proposalId','refresh-v1-atomic-apply-01','confirmationId','confirm-v1-atomic-apply-01','idempotencyKey','confirm-v1-atomic-apply-01',
    'items',jsonb_build_array(
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000022','dayId','85000000-0000-4000-8000-000000000011','position',3),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000023','dayId','85000000-0000-4000-8000-000000000011','position',2),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000024','dayId','85000000-0000-4000-8000-000000000011','position',4),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000025','dayId','85000000-0000-4000-8000-000000000012','position',1)
    ));
begin
  v_result := public.apply_trip_refresh(v_command);
  select workspace_revision into v_after from public.trips where id='85000000-0000-4000-8000-000000000001';
  perform pg_temp.assert_true((v_result->>'noOp')::boolean is false and (v_result->>'revision')::integer=v_after and v_after>v_before, 'Effective refresh did not advance and return the final revision.');
  perform pg_temp.assert_true((select array_agg(id order by position) from public.itinerary_items where itinerary_day_id='85000000-0000-4000-8000-000000000011') = array['85000000-0000-4000-8000-000000000021'::uuid,'85000000-0000-4000-8000-000000000023'::uuid,'85000000-0000-4000-8000-000000000022'::uuid,'85000000-0000-4000-8000-000000000024'::uuid], 'Atomic refresh order did not match the reviewed schedule.');
  perform pg_temp.assert_true(exists(select 1 from public.itinerary_items where id='85000000-0000-4000-8000-000000000022' and google_place_id='google-a' and latitude=16.1 and longitude=108.1 and place_address='A' and place_category='museum' and place_resolved_at='2028-01-01T00:00:00Z'), 'Verified snapshot was not preserved.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_item_source_links where itinerary_item_id='85000000-0000-4000-8000-000000000022')=1, 'Source links changed during schedule-only refresh.');
  update refresh_fixture set revision=v_after;

  -- Durable retry returns the stored response and causes no further graph write.
  perform pg_temp.assert_true(public.apply_trip_refresh(v_command)=v_result, 'Same confirmation and payload was not idempotent.');
  perform pg_temp.assert_true((select workspace_revision from public.trips where id='85000000-0000-4000-8000-000000000001')=v_after, 'Idempotent retry advanced revision.');

  begin
    perform public.apply_trip_refresh(v_command || jsonb_build_object('items', jsonb_build_array(jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1))));
    raise exception 'Same confirmation with a different payload was accepted.';
  exception when sqlstate 'TW019' then null;
  end;
end;
$$;

-- No-op is explicit, retains its revision, and still stores a durable result.
do $$
declare
  v_revision integer := (select revision from refresh_fixture);
  v_result jsonb;
begin
  v_result := public.apply_trip_refresh(jsonb_build_object(
    'tripId','85000000-0000-4000-8000-000000000001','expectedRevision',v_revision,
    'proposalId','refresh-v1-no-op-01','confirmationId','confirm-v1-no-op-01','idempotencyKey','confirm-v1-no-op-01',
    'items',jsonb_build_array(
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000022','dayId','85000000-0000-4000-8000-000000000011','position',3),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000023','dayId','85000000-0000-4000-8000-000000000011','position',2),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000024','dayId','85000000-0000-4000-8000-000000000011','position',4),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000025','dayId','85000000-0000-4000-8000-000000000012','position',1)
    )));
  perform pg_temp.assert_true((v_result->>'noOp')::boolean and (v_result->>'revision')::integer=v_revision, 'No-op refresh did not retain an explicit revision.');
end;
$$;

-- Stale/fixed/provider/lifecycle/unknown fields fail closed and create no graph write.
do $$
declare
  v_revision integer := (select revision from refresh_fixture);
  v_before_count integer := (select total from refresh_idempotency_before);
  v_base jsonb := jsonb_build_object(
    'tripId','85000000-0000-4000-8000-000000000001','expectedRevision',v_revision,
    'proposalId','refresh-v1-reject-01','confirmationId','confirm-v1-reject-01','idempotencyKey','confirm-v1-reject-01',
    'items',jsonb_build_array(
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000022','dayId','85000000-0000-4000-8000-000000000011','position',3),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000023','dayId','85000000-0000-4000-8000-000000000011','position',2),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000024','dayId','85000000-0000-4000-8000-000000000011','position',4),
      jsonb_build_object('itemId','85000000-0000-4000-8000-000000000025','dayId','85000000-0000-4000-8000-000000000012','position',1)
    ));
begin
  begin perform public.apply_trip_refresh(v_base || jsonb_build_object('expectedRevision',v_revision-1,'confirmationId','confirm-v1-stale-01','idempotencyKey','confirm-v1-stale-01')); raise exception 'Stale refresh was accepted.'; exception when sqlstate 'TW018' then null; end;
  begin perform public.apply_trip_refresh(v_base || jsonb_build_object('ownerId','22222222-2222-4222-8222-222222222222')); raise exception 'Owner field was accepted.'; exception when sqlstate 'TW016' then null; end;
  begin perform public.apply_trip_refresh(v_base || jsonb_build_object('activityStatus','completed')); raise exception 'Lifecycle field was accepted.'; exception when sqlstate 'TW016' then null; end;
  begin perform public.apply_trip_refresh(v_base || jsonb_build_object('googlePlaceId','forged')); raise exception 'Provider field was accepted.'; exception when sqlstate 'TW016' then null; end;
  begin perform public.apply_trip_refresh(v_base || jsonb_build_object('items',jsonb_build_array(
    jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',2),
    jsonb_build_object('itemId','85000000-0000-4000-8000-000000000023','dayId','85000000-0000-4000-8000-000000000011','position',1),
    jsonb_build_object('itemId','85000000-0000-4000-8000-000000000022','dayId','85000000-0000-4000-8000-000000000011','position',3),
    jsonb_build_object('itemId','85000000-0000-4000-8000-000000000024','dayId','85000000-0000-4000-8000-000000000011','position',4),
    jsonb_build_object('itemId','85000000-0000-4000-8000-000000000025','dayId','85000000-0000-4000-8000-000000000012','position',1)))); raise exception 'Fixed item moved.'; exception when sqlstate 'TW020' then null; end;
  perform pg_temp.assert_true((select workspace_revision from public.trips where id='85000000-0000-4000-8000-000000000001')=v_revision, 'Rejected requests changed the workspace revision.');
  perform pg_temp.assert_true(v_before_count >= 0, 'Idempotency fixture was unavailable.');
end;
$$;

-- A trigger failure after the RPC has claimed its key must roll back all graph
-- and idempotency effects; retrying the same key remains possible.
reset role;
create function public.trip_refresh_test_fail_update() returns trigger language plpgsql as $$
begin
  if new.id='85000000-0000-4000-8000-000000000022'::uuid then raise exception 'test apply failure'; end if;
  return new;
end;
$$;
create trigger itinerary_items_trip_refresh_test_fail before update on public.itinerary_items for each row execute function public.trip_refresh_test_fail_update();
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare v_revision integer := (select revision from refresh_fixture);
begin
  begin
    perform public.apply_trip_refresh(jsonb_build_object(
      'tripId','85000000-0000-4000-8000-000000000001','expectedRevision',v_revision,
      'proposalId','refresh-v1-rollback-01','confirmationId','confirm-v1-rollback-01','idempotencyKey','confirm-v1-rollback-01',
      'items',jsonb_build_array(
        jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1),
        jsonb_build_object('itemId','85000000-0000-4000-8000-000000000022','dayId','85000000-0000-4000-8000-000000000011','position',2),
        jsonb_build_object('itemId','85000000-0000-4000-8000-000000000023','dayId','85000000-0000-4000-8000-000000000011','position',3),
        jsonb_build_object('itemId','85000000-0000-4000-8000-000000000024','dayId','85000000-0000-4000-8000-000000000011','position',4),
        jsonb_build_object('itemId','85000000-0000-4000-8000-000000000025','dayId','85000000-0000-4000-8000-000000000012','position',1))));
    raise exception 'Mid-apply test failure was accepted.';
  exception when sqlstate 'TW021' then null;
  end;
  perform pg_temp.assert_true((select workspace_revision from public.trips where id='85000000-0000-4000-8000-000000000001')=v_revision, 'Mid-apply failure advanced revision.');
  perform pg_temp.assert_true(not exists(select 1 from public.trip_refresh_apply_idempotency where confirmation_id='confirm-v1-rollback-01'), 'Mid-apply failure retained idempotency state.');
end;
$$;
reset role;
drop trigger itinerary_items_trip_refresh_test_fail on public.itinerary_items;
drop function public.trip_refresh_test_fail_update();

set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
begin
  begin perform public.apply_trip_refresh(jsonb_build_object('tripId','85000000-0000-4000-8000-000000000001','expectedRevision',1,'proposalId','refresh-v1-foreign-01','confirmationId','confirm-v1-foreign-01','idempotencyKey','confirm-v1-foreign-01','items',jsonb_build_array(jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1)))); raise exception 'Foreign trip was accepted.'; exception when sqlstate 'TW017' then null; end;
end;
$$;
select set_config('request.jwt.claim.sub','',false);
do $$
begin
  begin perform public.apply_trip_refresh(jsonb_build_object('tripId','85000000-0000-4000-8000-000000000001','expectedRevision',1,'proposalId','refresh-v1-noauth-01','confirmationId','confirm-v1-noauth-01','idempotencyKey','confirm-v1-noauth-01','items',jsonb_build_array(jsonb_build_object('itemId','85000000-0000-4000-8000-000000000021','dayId','85000000-0000-4000-8000-000000000011','position',1)))); raise exception 'Missing JWT was accepted.'; exception when sqlstate 'TW015' then null; end;
end;
$$;
reset role;
do $$
begin
  perform pg_temp.assert_true(
    (select count(*) from public.trip_refresh_apply_idempotency) = (select total + 2 from refresh_idempotency_before),
    'Rejected or rolled-back refresh requests left durable idempotency rows.'
  );
end;
$$;
select 'trip_refresh_apply_contract_pass' as result;
