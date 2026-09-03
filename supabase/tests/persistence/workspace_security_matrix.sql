\set ON_ERROR_STOP on

-- FEATURE-P1-T004: executable acceptance matrix for the frozen T001 contract.
create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then raise exception '%', p_message; end if;
end $$;

insert into public.trips(id,user_id,title,destination,start_date,end_date) values
  ('74000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','T004 Owner','Hue','2028-05-01','2028-05-01'),
  ('74000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','T004 Other','Da Nang','2028-05-01','2028-05-01');
insert into public.itinerary_days(id,trip_id,day_number,date) values
  ('74000000-0000-4000-8000-000000000011','74000000-0000-4000-8000-000000000001',1,'2028-05-01'),
  ('74000000-0000-4000-8000-000000000012','74000000-0000-4000-8000-000000000002',1,'2028-05-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name,item_kind,transport_mode,accommodation_details_present) values
  ('74000000-0000-4000-8000-000000000021','74000000-0000-4000-8000-000000000011',1,'Place item','place',null,false),
  ('74000000-0000-4000-8000-000000000022','74000000-0000-4000-8000-000000000011',2,'Custom item','custom_activity',null,false),
  ('74000000-0000-4000-8000-000000000023','74000000-0000-4000-8000-000000000011',3,'Restaurant item','restaurant',null,false),
  ('74000000-0000-4000-8000-000000000024','74000000-0000-4000-8000-000000000011',4,'Transport item','transport','walk',false),
  ('74000000-0000-4000-8000-000000000025','74000000-0000-4000-8000-000000000011',5,'Accommodation item','accommodation',null,true),
  ('74000000-0000-4000-8000-000000000026','74000000-0000-4000-8000-000000000011',6,'Reservation item','reservation',null,false),
  ('74000000-0000-4000-8000-000000000027','74000000-0000-4000-8000-000000000011',7,'Note item','note',null,false),
  ('74000000-0000-4000-8000-000000000028','74000000-0000-4000-8000-000000000012',1,'Other item','place',null,false);
insert into public.itinerary_item_source_links(id,itinerary_item_id,link_type,url,label,position)
values ('74000000-0000-4000-8000-000000000031','74000000-0000-4000-8000-000000000021','website','https://example.test/existing','Existing',1);

-- Anonymous receives neither table privileges nor RPC execution. Authenticated
-- without a JWT is separately mapped to the stable T003 authentication code.
set role anon;
do $$
begin
  begin perform public.mutate_travel_workspace('{}'::jsonb); raise exception 'Anonymous RPC unexpectedly executed.';
  exception when sqlstate '42501' then null; end;
  begin update public.trips set title='anonymous' where id='74000000-0000-4000-8000-000000000001'; raise exception 'Anonymous direct trip write unexpectedly executed.';
  exception when sqlstate '42501' then null; end;
  begin insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position) values('74000000-0000-4000-8000-000000000021','website','https://example.test/anon',2); raise exception 'Anonymous source-link write unexpectedly executed.';
  exception when sqlstate '42501' then null; end;
  begin perform public.apply_verified_place_snapshot('11111111-1111-4111-8111-111111111111','74000000-0000-4000-8000-000000000021','forged','Forged',1,1); raise exception 'Anonymous resolver unexpectedly executed.';
  exception when sqlstate '42501' then null; end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','',false);
do $$
begin
  begin perform public.mutate_travel_workspace('{}'::jsonb); raise exception 'JWT-less workspace RPC unexpectedly executed.';
  exception when sqlstate 'TW006' then null; end;
end $$;
reset role;

set role service_role;
select public.apply_verified_place_snapshot(
  '11111111-1111-4111-8111-111111111111','74000000-0000-4000-8000-000000000021',
  'verified-t004','Verified Place',16.46,107.59,'Hue','landmark'
);
do $$
begin
  begin
    perform public.apply_verified_place_snapshot(
      '22222222-2222-4222-8222-222222222222','74000000-0000-4000-8000-000000000021',
      'wrong-owner','Wrong owner',1,1);
    raise exception 'Cross-owner resolver write unexpectedly succeeded.';
  exception when sqlstate 'P0002' then null; end;
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

create function pg_temp.mutate_current(p_trip uuid, p_item uuid, p_type text, p_payload jsonb)
returns jsonb language plpgsql as $$
declare v_revision integer;
begin
  select workspace_revision into v_revision from public.trips where id=p_trip;
  return public.mutate_travel_workspace(
    p_payload || jsonb_build_object('type',p_type,'tripId',p_trip,'itemId',p_item,'expectedRevision',v_revision)
  );
end $$;

do $$
declare
  v_trip constant uuid := '74000000-0000-4000-8000-000000000001';
  v_place constant uuid := '74000000-0000-4000-8000-000000000021';
  v_custom constant uuid := '74000000-0000-4000-8000-000000000022';
  v_restaurant constant uuid := '74000000-0000-4000-8000-000000000023';
  v_transport constant uuid := '74000000-0000-4000-8000-000000000024';
  v_accommodation constant uuid := '74000000-0000-4000-8000-000000000025';
  v_reservation constant uuid := '74000000-0000-4000-8000-000000000026';
  v_note constant uuid := '74000000-0000-4000-8000-000000000027';
  v_before integer;
  v_result jsonb;
  v_mode text;
begin
  select workspace_revision into v_before from public.trips where id=v_trip;
  v_result := pg_temp.mutate_current(v_trip,v_place,'update_item',jsonb_build_object('patch',jsonb_build_object('placeQuery','Hue citadel','note','Owner edit')));
  perform pg_temp.assert_true((v_result->>'revision')::integer=v_before+1, 'Successful owner command did not return the authoritative next revision.');
  perform pg_temp.assert_true((select place_resolved_at is not null and google_place_id='verified-t004' and latitude=16.46 and longitude=107.59 and place_name='Verified Place' from public.itinerary_items where id=v_place), 'Verified snapshot changed after an allowed user-owned edit.');

  -- All seven kinds have an allowed representative mutation. Kind changes are
  -- intentionally rejected by the immutable T003 command surface.
  perform pg_temp.mutate_current(v_trip,v_custom,'update_item',jsonb_build_object('patch',jsonb_build_object('note','Custom text','flexibility','flexible')));
  perform pg_temp.mutate_current(v_trip,v_restaurant,'update_item',jsonb_build_object('patch',jsonb_build_object('placeQuery','Restaurant query')));
  perform pg_temp.mutate_current(v_trip,v_reservation,'update_item',jsonb_build_object('patch',jsonb_build_object('contact',jsonb_build_object('name','Reservation contact','phone','+84 (123) 456-789','websiteUrl','https://example.test/reservation','bookingUrl','https://example.test/booking','reservationCode','RES-123'))));
  perform pg_temp.mutate_current(v_trip,v_note,'update_item',jsonb_build_object('patch',jsonb_build_object('note','Note text','priority','optional')));
  perform pg_temp.assert_true((select place_resolved_at is null and google_place_id is null and latitude is null and longitude is null from public.itinerary_items where id=v_custom), 'Ordinary custom-activity edit fabricated provider provenance.');

  foreach v_mode in array array['walk','drive','transit','bus','train','flight','motorbike','ferry','other'] loop
    perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('mode',v_mode))));
  end loop;
  perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('originLabel','Hue','destinationLabel','Da Nang','operatorName','Operator','departureAt','2028-05-01T08:00:00Z','arrivalAt','2028-05-01T10:00:00Z','plannedCostAmount',0,'plannedCostCurrency','USD'))));
  perform pg_temp.mutate_current(v_trip,v_accommodation,'update_item',jsonb_build_object('patch',jsonb_build_object('accommodation',jsonb_build_object('checkInAt','2028-05-01T15:00:00Z','checkOutAt','2028-05-03T11:00:00Z','nights',2))));

  begin perform pg_temp.mutate_current(v_trip,v_custom,'update_item',jsonb_build_object('patch',jsonb_build_object('placeQuery','forbidden'))); raise exception 'Custom activity accepted place query.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_note,'update_item',jsonb_build_object('patch',jsonb_build_object('startTime','09:00'))); raise exception 'Note accepted schedule.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('startTime','09:00'))); raise exception 'Transport accepted generic schedule.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_reservation,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('mode','drive')))); raise exception 'Reservation accepted transport metadata.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_reservation,'update_item',jsonb_build_object('patch',jsonb_build_object('accommodation',jsonb_build_object('nights',1)))); raise exception 'Reservation accepted accommodation metadata.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_note,'update_item',jsonb_build_object('patch',jsonb_build_object('kind','place'))); raise exception 'Immutable kind unexpectedly changed.';
  exception when sqlstate 'TW010' then null; end;

  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('mode','invalid')))); raise exception 'Invalid transport mode accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('originLabel','')))); raise exception 'Empty transport label accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('operatorName',repeat('x',161))))); raise exception 'Overlong transport operator accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('departureAt',null,'arrivalAt','2028-05-01T10:00:00Z')))); raise exception 'Half transport time pair accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('departureAt','2028-05-01T12:00:00Z','arrivalAt','2028-05-01T10:00:00Z')))); raise exception 'Reverse transport time pair accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('plannedCostAmount',10,'plannedCostCurrency',null)))); raise exception 'Unpaired transport cost accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('plannedCostAmount',-1,'plannedCostCurrency','USD')))); raise exception 'Negative transport cost accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_transport,'update_item',jsonb_build_object('patch',jsonb_build_object('transport',jsonb_build_object('plannedCostAmount',10,'plannedCostCurrency','usd')))); raise exception 'Lowercase transport currency accepted.';
  exception when sqlstate 'TW011' then null; end;

  begin perform pg_temp.mutate_current(v_trip,v_accommodation,'update_item',jsonb_build_object('patch',jsonb_build_object('accommodation',jsonb_build_object('checkInAt',null,'checkOutAt','2028-05-03T11:00:00Z')))); raise exception 'Half accommodation time pair accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_accommodation,'update_item',jsonb_build_object('patch',jsonb_build_object('accommodation',jsonb_build_object('checkInAt','2028-05-03T11:00:00Z','checkOutAt','2028-05-03T11:00:00Z','nights',0)))); raise exception 'Non-increasing accommodation range accepted.';
  exception when sqlstate 'TW011' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_accommodation,'update_item',jsonb_build_object('patch',jsonb_build_object('accommodation',jsonb_build_object('nights',1.5)))); raise exception 'Fractional accommodation nights accepted.';
  exception when sqlstate 'TW014' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_accommodation,'update_item',jsonb_build_object('patch',jsonb_build_object('accommodation',jsonb_build_object('nights',3)))); raise exception 'Mismatched accommodation nights accepted.';
  exception when sqlstate 'TW011' then null; end;

  begin perform pg_temp.mutate_current(v_trip,v_reservation,'update_item',jsonb_build_object('patch',jsonb_build_object('contact',jsonb_build_object('phone','abc')))); raise exception 'Unsafe contact phone accepted.';
  exception when sqlstate 'TW014' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_reservation,'update_item',jsonb_build_object('patch',jsonb_build_object('contact',jsonb_build_object('websiteUrl','http://example.test')))); raise exception 'Non-HTTPS contact URL accepted.';
  exception when sqlstate 'TW014' then null; end;

  foreach v_mode in array array['google_maps','facebook','instagram','tiktok','website','booking','other'] loop
    -- The all-types replace is performed below, after the negative link checks.
    null;
  end loop;
  begin perform pg_temp.mutate_current(v_trip,v_place,'replace_source_links',jsonb_build_object('links',jsonb_build_array(jsonb_build_object('type','other','url','https://example.test/other')))); raise exception 'Other link without label accepted.';
  exception when sqlstate 'TW014' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_place,'replace_source_links',jsonb_build_object('links',jsonb_build_array(jsonb_build_object('type','website','url','/relative')))); raise exception 'Relative source URL accepted.';
  exception when sqlstate 'TW014' then null; end;
  perform pg_temp.mutate_current(v_trip,v_place,'replace_source_links',jsonb_build_object('links',jsonb_build_array(
    jsonb_build_object('type','google_maps','url','https://example.test/maps'), jsonb_build_object('type','facebook','url','https://example.test/facebook'),
    jsonb_build_object('type','instagram','url','https://example.test/instagram'), jsonb_build_object('type','tiktok','url','https://example.test/tiktok'),
    jsonb_build_object('type','website','url','https://example.test/website'), jsonb_build_object('type','booking','url','https://example.test/booking'),
    jsonb_build_object('type','other','url','https://example.test/other','label','Other'))));
  perform pg_temp.assert_true((select array_agg(position order by position) from public.itinerary_item_source_links where itinerary_item_id=v_place)=array[1,2,3,4,5,6,7], 'Source-link replacement did not produce deterministic positions.');

  -- Lifecycle is server controlled; ARRIVED is deliberately absent.
  perform pg_temp.mutate_current(v_trip,v_reservation,'transition_item_status',jsonb_build_object('status','completed'));
  perform pg_temp.assert_true((select completed_at is not null and skipped_at is null from public.itinerary_items where id=v_reservation), 'Completed transition did not generate a server timestamp.');
  perform pg_temp.mutate_current(v_trip,v_reservation,'transition_item_status',jsonb_build_object('status','scheduled'));
  perform pg_temp.assert_true((select completed_at is null and skipped_at is null from public.itinerary_items where id=v_reservation), 'Completed-to-scheduled did not clear timestamps.');
  perform pg_temp.mutate_current(v_trip,v_reservation,'transition_item_status',jsonb_build_object('status','skipped'));
  perform pg_temp.mutate_current(v_trip,v_reservation,'transition_item_status',jsonb_build_object('status','scheduled'));
  begin perform pg_temp.mutate_current(v_trip,v_reservation,'transition_item_status',jsonb_build_object('status','arrived')); raise exception 'ARRIVED was accepted.';
  exception when sqlstate 'TW012' then null; end;
  begin update public.itinerary_items set completed_at=clock_timestamp() where id=v_reservation; raise exception 'Direct lifecycle timestamp edit accepted.';
  exception when sqlstate '22023' then null; end;

  -- T003 protected/provider taxonomy is stable and no failed command mutates.
  begin perform pg_temp.mutate_current(v_trip,v_place,'update_item',jsonb_build_object('patch',jsonb_build_object('latitude',1))); raise exception 'Provider latitude accepted.';
  exception when sqlstate 'TW013' then null; end;
  begin perform pg_temp.mutate_current(v_trip,v_place,'update_item',jsonb_build_object('patch',jsonb_build_object('placeName','Forged verified name'))); raise exception 'Verified placeName accepted.';
  exception when sqlstate 'TW013' then null; end;
  begin perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId','invalid','itemId',v_place,'expectedRevision',1,'patch',jsonb_build_object('note','x'))); raise exception 'Malformed UUID accepted.';
  exception when sqlstate 'TW007' then null; end;
  begin perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',v_trip,'itemId',v_place,'expectedRevision',0,'patch',jsonb_build_object('note','x'))); raise exception 'Zero revision accepted.';
  exception when sqlstate 'TW007' then null; end;
  begin perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',v_trip,'itemId',v_place,'expectedRevision',1.5,'patch',jsonb_build_object('note','x'))); raise exception 'Fractional revision accepted.';
  exception when sqlstate 'TW007' then null; end;
  begin perform public.mutate_travel_workspace(jsonb_build_object('type','update_item','tripId',v_trip,'itemId',v_place,'expectedRevision',(select workspace_revision from public.trips where id=v_trip),'patch',jsonb_build_object('note',repeat('x',50001)))); raise exception 'Oversized payload accepted.';
  exception when sqlstate 'TW007' then null; end;
end $$;

-- Cross-user reads/writes are silent at RLS and non-disclosing at the RPC.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
declare v_rows integer;
begin
  perform pg_temp.assert_true((select count(*) from public.trips where id='74000000-0000-4000-8000-000000000001')=0, 'Cross-user trip read leaked.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_days where id='74000000-0000-4000-8000-000000000011')=0, 'Cross-user day read leaked.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_items where id='74000000-0000-4000-8000-000000000021')=0, 'Cross-user item read leaked.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_item_source_links where itinerary_item_id='74000000-0000-4000-8000-000000000021')=0, 'Cross-user source-link read leaked.');
  update public.itinerary_items set note='cross-user' where id='74000000-0000-4000-8000-000000000021'; get diagnostics v_rows = row_count;
  perform pg_temp.assert_true(v_rows=0, 'Cross-user direct item update wrote a row.');
  begin perform public.mutate_travel_workspace(jsonb_build_object('type','transition_item_status','tripId','74000000-0000-4000-8000-000000000001','itemId','74000000-0000-4000-8000-000000000026','expectedRevision',1,'status','completed')); raise exception 'Cross-user RPC disclosed/mutated an item.';
  exception when sqlstate 'TW008' then null; end;
end $$;

-- Switching the same database role back to A proves every command derives the
-- current auth.uid() rather than retaining identity B.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
begin
  perform pg_temp.mutate_current('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000022','update_item',jsonb_build_object('patch',jsonb_build_object('note','A after B')));
  perform pg_temp.assert_true((select note='A after B' from public.itinerary_items where id='74000000-0000-4000-8000-000000000022'), 'Stale-session identity was retained after JWT change.');
  begin
    insert into public.itinerary_days(trip_id,day_number,date) values('74000000-0000-4000-8000-000000000001',1,'2028-05-01');
    raise exception 'Duplicate day number accepted.';
  exception when unique_violation then null; end;
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name) values('74000000-0000-4000-8000-000000000011',1,'Duplicate position');
    raise exception 'Duplicate item position accepted.';
  exception when unique_violation then null; end;
end $$;

-- T004 ordering corrective: direct owner writes cannot commit a gap, but a
-- deferred transaction can atomically renumber to another contiguous state.
insert into public.trips(id,user_id,title,destination,start_date,end_date)
values('74000000-0000-4000-8000-000000000041','11111111-1111-4111-8111-111111111111','Ordering direct','Hue','2028-06-01','2028-06-01');
insert into public.itinerary_days(id,trip_id,day_number,date) values
  ('74000000-0000-4000-8000-000000000042','74000000-0000-4000-8000-000000000041',1,'2028-06-01'),
  ('74000000-0000-4000-8000-000000000043','74000000-0000-4000-8000-000000000041',2,'2028-06-02'),
  ('74000000-0000-4000-8000-000000000044','74000000-0000-4000-8000-000000000041',3,'2028-06-03');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name) values
  ('74000000-0000-4000-8000-000000000045','74000000-0000-4000-8000-000000000042',1,'Order one'),
  ('74000000-0000-4000-8000-000000000046','74000000-0000-4000-8000-000000000042',2,'Order two'),
  ('74000000-0000-4000-8000-000000000047','74000000-0000-4000-8000-000000000042',3,'Order three');
create temporary table ordering_revision_state(day_revision integer not null, item_revision integer);
insert into ordering_revision_state(day_revision,item_revision)
select workspace_revision, workspace_revision from public.trips where id='74000000-0000-4000-8000-000000000041';

do $$
declare v_revision integer;
begin
  select workspace_revision into v_revision from public.trips where id='74000000-0000-4000-8000-000000000041';
  begin
    insert into public.itinerary_days(trip_id,day_number,date) values('74000000-0000-4000-8000-000000000041',5,'2028-06-05');
    set constraints all immediate;
    raise exception 'Gap day insert committed.';
  exception when check_violation then null; end;
  perform pg_temp.assert_true((select array_agg(day_number order by day_number) from public.itinerary_days where trip_id='74000000-0000-4000-8000-000000000041')=array[1,2,3], 'Rejected day gap left partial state.');
  perform pg_temp.assert_true((select workspace_revision from public.trips where id='74000000-0000-4000-8000-000000000041')=v_revision, 'Rejected day gap advanced revision.');
  begin
    delete from public.itinerary_days where id='74000000-0000-4000-8000-000000000043';
    set constraints all immediate;
    raise exception 'Middle day delete committed.';
  exception when check_violation then null; end;
  perform pg_temp.assert_true((select count(*) from public.itinerary_days where trip_id='74000000-0000-4000-8000-000000000041')=3, 'Rejected middle-day delete left partial state.');
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name) values('74000000-0000-4000-8000-000000000042',5,'Gap item');
    set constraints all immediate;
    raise exception 'Gap item insert committed.';
  exception when check_violation then null; end;
  perform pg_temp.assert_true((select array_agg(position order by position) from public.itinerary_items where itinerary_day_id='74000000-0000-4000-8000-000000000042')=array[1,2,3], 'Rejected item gap left partial state.');
  begin
    delete from public.itinerary_items where id='74000000-0000-4000-8000-000000000046';
    set constraints all immediate;
    raise exception 'Middle item delete committed.';
  exception when check_violation then null; end;
  begin
    update public.itinerary_items set position=9 where id='74000000-0000-4000-8000-000000000047';
    set constraints all immediate;
    raise exception 'Item position jump committed.';
  exception when check_violation then null; end;
  perform pg_temp.assert_true((select workspace_revision from public.trips where id='74000000-0000-4000-8000-000000000041')=v_revision, 'Rejected item ordering write advanced revision.');
end $$;

begin;
set constraints all deferred;
update public.itinerary_days set day_number=4-day_number where trip_id='74000000-0000-4000-8000-000000000041';
commit;
do $$
declare v_revision integer;
begin
  perform pg_temp.assert_true((select array_agg(day_number order by day_number) from public.itinerary_days where trip_id='74000000-0000-4000-8000-000000000041')=array[1,2,3], 'Atomic day renumber was not contiguous.');
  select workspace_revision into v_revision from public.trips where id='74000000-0000-4000-8000-000000000041';
  perform pg_temp.assert_true(v_revision > (select day_revision from ordering_revision_state), 'Accepted day renumber did not advance workspace revision.');
  update ordering_revision_state set item_revision=v_revision;
end $$;

begin;
set constraints all deferred;
update public.itinerary_items set position=4-position where itinerary_day_id='74000000-0000-4000-8000-000000000042';
commit;
do $$
begin
  perform pg_temp.assert_true((select array_agg(position order by position) from public.itinerary_items where itinerary_day_id='74000000-0000-4000-8000-000000000042')=array[1,2,3], 'Atomic item renumber was not contiguous.');
  perform pg_temp.assert_true((select workspace_revision from public.trips where id='74000000-0000-4000-8000-000000000041') > (select item_revision from ordering_revision_state), 'Accepted item renumber did not advance workspace revision.');
end $$;

reset role;
select 'workspace_security_matrix_pass' as result;
select 'workspace_ordering_matrix_pass' as result;
