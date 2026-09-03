\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

create temporary table saved_trip_test_state(name text primary key, value_uuid uuid);

create function pg_temp.assert_saved_trip(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then raise exception '%', p_message; end if;
end
$$;

-- The initial optimistic-concurrency revision is server-owned for both the
-- default path and an attempted client override.
do $$
declare
  v_default_trip uuid;
  v_override_trip uuid;
  v_revision integer;
begin
  insert into public.trips(user_id,title,destination,start_date,end_date)
  values(auth.uid(),'Revision default','Hue','2027-12-01','2027-12-01')
  returning id, workspace_revision into v_default_trip, v_revision;
  perform pg_temp.assert_saved_trip(v_revision = 1, 'Direct owner insert did not use canonical initial revision 1.');

  insert into public.trips(user_id,title,destination,start_date,end_date,workspace_revision)
  values(auth.uid(),'Revision override','Hue','2027-12-02','2027-12-02',999)
  returning id, workspace_revision into v_override_trip, v_revision;
  perform pg_temp.assert_saved_trip(v_revision = 1, 'Client selected a non-canonical initial workspace revision.');

  update public.trips set title='Revision default updated' where id=v_default_trip;
  perform pg_temp.assert_saved_trip(
    (select workspace_revision from public.trips where id=v_default_trip) = 2,
    'Authorized mutation did not advance exactly from the server-controlled revision.'
  );

  delete from public.trips where id in (v_default_trip, v_override_trip);
end
$$;

insert into saved_trip_test_state(name, value_uuid)
select 'detail', public.create_trip_graph('saved-detail-01', '{
  "title":"Bangkok detail","destination":"Bangkok","startDate":"2028-01-01","endDate":"2028-01-02","currency":"USD","days":[
    {"dayNumber":1,"date":"2028-01-01","items":[
      {"position":1,"placeName":"Unresolved A","placeQuery":"Unresolved A Bangkok","note":"Before"},
      {"position":2,"placeName":"Verified B"}
    ]},
    {"dayNumber":2,"date":"2028-01-02","items":[
      {"position":1,"placeName":"Legacy C"}
    ]}
  ]
}'::jsonb);

insert into saved_trip_test_state(name, value_uuid)
select 'list-2', public.create_trip_graph('saved-list-002', '{"title":"List 2","destination":"Hue","startDate":"2028-02-01","endDate":"2028-02-01","days":[{"dayNumber":1,"date":"2028-02-01","items":[{"position":1,"placeName":"A"}]}]}'::jsonb);
insert into saved_trip_test_state(name, value_uuid)
select 'list-3', public.create_trip_graph('saved-list-003', '{"title":"List 3","destination":"Hue","startDate":"2028-03-01","endDate":"2028-03-01","days":[{"dayNumber":1,"date":"2028-03-01","items":[{"position":1,"placeName":"A"}]}]}'::jsonb);
insert into saved_trip_test_state(name, value_uuid)
select 'delete', public.create_trip_graph('saved-delete-01', '{"title":"Delete me","destination":"Hue","startDate":"2028-04-01","endDate":"2028-04-01","days":[{"dayNumber":1,"date":"2028-04-01","items":[{"position":1,"placeName":"A"}]}]}'::jsonb);

reset role;
update public.trips set created_at = case id
  when (select value_uuid from saved_trip_test_state where name='detail') then '2028-01-01T00:00:00Z'::timestamptz
  when (select value_uuid from saved_trip_test_state where name='list-2') then '2028-02-01T00:00:00Z'::timestamptz
  when (select value_uuid from saved_trip_test_state where name='list-3') then '2028-03-01T00:00:00Z'::timestamptz
  when (select value_uuid from saved_trip_test_state where name='delete') then '2028-04-01T00:00:00Z'::timestamptz
  else created_at end;

do $$
declare
  v_trip uuid := (select value_uuid from saved_trip_test_state where name='detail');
  v_verified uuid;
  v_legacy uuid;
begin
  select item.id into v_verified from public.itinerary_items item join public.itinerary_days day on day.id=item.itinerary_day_id where day.trip_id=v_trip and item.place_name='Verified B';
  perform public.apply_verified_place_snapshot('11111111-1111-4111-8111-111111111111', v_verified, 'google-verified-b', 'Verified B Canonical', 13.75, 100.49, 'Bangkok', 'landmark');
  select item.id into v_legacy from public.itinerary_items item join public.itinerary_days day on day.id=item.itinerary_day_id where day.trip_id=v_trip and item.place_name='Legacy C';
  update public.itinerary_items set google_place_id='legacy-untrusted', latitude=13.70, longitude=100.50, place_address='Legacy address', place_category='landmark' where id=v_legacy;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

do $$
declare
  v_page1 jsonb := public.list_saved_trips(2, null, null);
  v_page2 jsonb;
  v_cursor jsonb;
  v_ids1 uuid[];
  v_ids2 uuid[];
begin
  perform pg_temp.assert_saved_trip(jsonb_array_length(v_page1->'items')=2, 'First page size mismatch.');
  perform pg_temp.assert_saved_trip(v_page1->'nextCursor' is not null and jsonb_typeof(v_page1->'nextCursor')='object', 'First page cursor missing.');
  perform pg_temp.assert_saved_trip(not (v_page1::text like '%idempotency%') and not (v_page1::text like '%userId%'), 'List leaked internal metadata.');
  v_cursor := v_page1->'nextCursor';
  v_page2 := public.list_saved_trips(2, (v_cursor->>'createdAt')::timestamptz, (v_cursor->>'id')::uuid);
  select array_agg((value->>'id')::uuid) into v_ids1 from jsonb_array_elements(v_page1->'items');
  select array_agg((value->>'id')::uuid) into v_ids2 from jsonb_array_elements(v_page2->'items');
  perform pg_temp.assert_saved_trip(jsonb_array_length(v_page2->'items')=2, 'Second page size mismatch.');
  perform pg_temp.assert_saved_trip(not (v_ids1 && v_ids2), 'Cursor pagination duplicated a trip.');
  perform pg_temp.assert_saved_trip((v_page1#>>'{items,0,title}')='Delete me' and (v_page1#>>'{items,1,title}')='List 3', 'List ordering is not deterministic.');
  perform pg_temp.assert_saved_trip(
    (select listed->'coverGooglePlaceIds'
     from jsonb_array_elements(public.list_saved_trips(50, null, null)->'items') as listed
     where listed->>'title' = 'Bangkok detail') = '["google-verified-b"]'::jsonb,
    'List cover candidates must contain only ordered provenance-verified Google Place IDs.'
  );
end
$$;

do $$
declare
  v_detail jsonb := public.get_saved_trip_detail((select value_uuid from saved_trip_test_state where name='detail'));
  v_unresolved jsonb;
  v_verified jsonb;
  v_legacy jsonb;
begin
  perform pg_temp.assert_saved_trip(v_detail->>'title'='Bangkok detail' and jsonb_array_length(v_detail->'days')=2, 'Detail graph shape mismatch.');
  perform pg_temp.assert_saved_trip((v_detail#>>'{days,0,dayNumber}')='1' and (v_detail#>>'{days,1,dayNumber}')='2', 'Day ordering mismatch.');
  perform pg_temp.assert_saved_trip((v_detail#>>'{days,0,items,0,position}')='1' and (v_detail#>>'{days,0,items,1,position}')='2', 'Item ordering mismatch.');
  v_unresolved := v_detail#>'{days,0,items,0}';
  v_verified := v_detail#>'{days,0,items,1}';
  v_legacy := v_detail#>'{days,1,items,0}';
  perform pg_temp.assert_saved_trip(v_unresolved->>'resolution'='UNRESOLVED' and not (v_unresolved ? 'googlePlaceId'), 'Unresolved detail leaked provider metadata.');
  perform pg_temp.assert_saved_trip(v_verified->>'resolution'='VERIFIED' and v_verified->>'googlePlaceId'='google-verified-b' and v_verified ? 'placeResolvedAt', 'Verified detail snapshot mismatch.');
  perform pg_temp.assert_saved_trip(v_legacy->>'resolution'='UNRESOLVED' and not (v_legacy ? 'googlePlaceId') and not (v_legacy ? 'latitude'), 'Legacy untrusted provider-looking row was certified.');
end
$$;

do $$
declare
  v_trip uuid := (select value_uuid from saved_trip_test_state where name='detail');
  v_item uuid := (select item.id from public.itinerary_items item join public.itinerary_days day on day.id=item.itinerary_day_id where day.trip_id=v_trip and item.position=1 and day.day_number=1);
  v_revision integer;
begin
  select workspace_revision into v_revision from public.trips where id = v_trip;
  perform pg_temp.assert_saved_trip(v_revision > 0, 'New trip workspace revision must be positive.');
  perform pg_temp.assert_saved_trip(
    exists (
      select 1 from public.itinerary_items
      where id = v_item
        and item_kind = 'place'
        and flexibility = 'fixed'
        and priority = 'must_do'
        and activity_status = 'scheduled'
        and completed_at is null
        and skipped_at is null
    ),
    'New trip workspace item defaults mismatch.'
  );
  perform pg_temp.assert_saved_trip(public.update_itinerary_item_note(v_item, 'Updated note'), 'Owner note update failed.');
  perform pg_temp.assert_saved_trip((select note from public.itinerary_items where id=v_item)='Updated note', 'Updated note did not persist.');
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Owner note update did not advance workspace revision.');
  v_revision := v_revision + 1;
  perform pg_temp.assert_saved_trip(public.update_itinerary_item_note(v_item, '   '), 'Owner note clear failed.');
  perform pg_temp.assert_saved_trip((select note is null from public.itinerary_items where id=v_item), 'Blank note did not normalize to NULL.');
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Owner note clear did not advance workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_items set flexibility='flexible', priority='want_to_do' where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Flexibility/priority write bypassed workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_items set start_time='09:00', end_time='10:00' where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Schedule write bypassed workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_items
  set contact_name='Local contact', contact_phone='+84 123 456', contact_address='Hue',
      contact_website_url='https://example.test/contact', contact_booking_url='https://example.test/booking',
      reservation_code='LOCAL-123'
  where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Contact/reservation write bypassed workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_items set activity_status='completed', completed_at='2000-01-01T00:00:00Z' where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Status write bypassed workspace revision.');
  perform pg_temp.assert_saved_trip(
    (select completed_at > '2000-01-01T00:00:00Z'::timestamptz and skipped_at is null from public.itinerary_items where id=v_item),
    'Completed transition did not persist a server-generated lifecycle timestamp.'
  );
  v_revision := v_revision + 1;

  begin
    update public.itinerary_items set completed_at='2000-01-01T00:00:00Z' where id=v_item;
    raise exception 'Expected direct completed_at mutation rejection.';
  exception when sqlstate '22023' then null;
  end;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision, 'Rejected completed_at mutation changed workspace revision.');

  begin
    update public.itinerary_items
    set activity_status='skipped', completed_at=null, skipped_at=clock_timestamp()
    where id=v_item;
    raise exception 'Expected COMPLETED to SKIPPED transition rejection.';
  exception when sqlstate '22023' then null;
  end;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision, 'Rejected status transition changed workspace revision.');

  update public.itinerary_items set activity_status='scheduled' where id=v_item;
  perform pg_temp.assert_saved_trip(
    (select completed_at is null and skipped_at is null from public.itinerary_items where id=v_item),
    'Return to scheduled did not clear lifecycle timestamps.'
  );
  v_revision := v_revision + 1;

  update public.itinerary_items set activity_status='skipped', skipped_at='2000-01-01T00:00:00Z' where id=v_item;
  perform pg_temp.assert_saved_trip(
    (select skipped_at > '2000-01-01T00:00:00Z'::timestamptz and completed_at is null from public.itinerary_items where id=v_item),
    'Skipped transition did not persist a server-generated lifecycle timestamp.'
  );
  v_revision := v_revision + 1;
  begin
    update public.itinerary_items set skipped_at='2000-01-01T00:00:00Z' where id=v_item;
    raise exception 'Expected direct skipped_at mutation rejection.';
  exception when sqlstate '22023' then null;
  end;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision, 'Rejected skipped_at mutation changed workspace revision.');
  update public.itinerary_items set activity_status='scheduled' where id=v_item;
  perform pg_temp.assert_saved_trip(
    (select completed_at is null and skipped_at is null from public.itinerary_items where id=v_item),
    'Skipped-to-scheduled transition did not clear lifecycle timestamps.'
  );
  v_revision := v_revision + 1;

  update public.itinerary_items
  set item_kind='transport', place_query=null, start_time=null, end_time=null, transport_mode='drive'
  where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Transport kind write bypassed workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_items
  set transport_origin_label='Hue', transport_destination_label='Da Nang', transport_operator_name='Local operator',
      transport_departure_at='2028-01-01T08:00:00Z', transport_arrival_at='2028-01-01T10:00:00Z',
      transport_planned_cost_amount=50, transport_planned_cost_currency='USD'
  where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Transport metadata write bypassed workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_items
  set item_kind='accommodation', accommodation_details_present=true,
      accommodation_check_in_at='2028-01-01T15:00:00Z', accommodation_check_out_at='2028-01-03T11:00:00Z',
      accommodation_nights=2, transport_mode=null, transport_origin_label=null, transport_destination_label=null,
      transport_operator_name=null, transport_departure_at=null, transport_arrival_at=null,
      transport_planned_cost_amount=null, transport_planned_cost_currency=null
  where id=v_item;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Accommodation metadata write bypassed workspace revision.');
  v_revision := v_revision + 1;

  begin
    update public.itinerary_items set accommodation_nights=1 where id=v_item;
    raise exception 'Expected inconsistent accommodation nights rejection.';
  exception when check_violation then null;
  end;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision, 'Rejected accommodation write changed workspace revision.');
end
$$;

do $$
declare
  v_day uuid := (select day.id from public.itinerary_days day where day.trip_id=(select value_uuid from saved_trip_test_state where name='detail') and day.day_number=1);
begin
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name,activity_status,completed_at)
    values(v_day,3,'Invalid initially completed','completed',clock_timestamp());
    raise exception 'Expected initially completed item rejection.';
  exception when sqlstate '22023' then null;
  end;
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name,activity_status,skipped_at)
    values(v_day,3,'Invalid initially skipped','skipped',clock_timestamp());
    raise exception 'Expected initially skipped item rejection.';
  exception when sqlstate '22023' then null;
  end;
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name,item_kind,start_time)
    values(v_day,3,'Invalid note start','note','09:00');
    raise exception 'Expected NOTE start_time rejection.';
  exception when check_violation then null;
  end;
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name,item_kind,end_time)
    values(v_day,3,'Invalid note end','note','10:00');
    raise exception 'Expected NOTE end_time rejection.';
  exception when check_violation then null;
  end;
end
$$;

do $$
declare
  v_trip uuid := (select value_uuid from saved_trip_test_state where name='detail');
  v_item uuid := (select item.id from public.itinerary_items item join public.itinerary_days day on day.id=item.itinerary_day_id where day.trip_id=v_trip and item.position=1 and day.day_number=1);
  v_revision integer;
  v_position integer;
begin
  select workspace_revision into v_revision from public.trips where id=v_trip;
  insert into public.itinerary_item_source_links (itinerary_item_id, link_type, url, position)
  values (v_item, 'website', 'https://example.test/workspace', 1);
  perform pg_temp.assert_saved_trip(
    (select count(*) from public.itinerary_item_source_links where itinerary_item_id = v_item) = 1,
    'Owner source link did not persist.'
  );
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Source-link insert bypassed workspace revision.');
  v_revision := v_revision + 1;

  update public.itinerary_item_source_links set label='Updated' where itinerary_item_id=v_item and position=1;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Source-link update bypassed workspace revision.');
  v_revision := v_revision + 1;

  for v_position in 2..12 loop
    insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position)
    values(v_item,'website','https://example.test/link-' || v_position,v_position);
  end loop;
  perform pg_temp.assert_saved_trip((select count(*) from public.itinerary_item_source_links where itinerary_item_id=v_item)=12, 'Twelve source links did not persist.');
  begin
    insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position)
    values(v_item,'website','https://example.test/link-13',13);
    raise exception 'Expected thirteenth source-link rejection.';
  exception when sqlstate '22023' then null;
  end;

  select workspace_revision into v_revision from public.trips where id=v_trip;
  delete from public.itinerary_item_source_links where itinerary_item_id=v_item and position=12;
  perform pg_temp.assert_saved_trip((select workspace_revision from public.trips where id=v_trip) = v_revision + 1, 'Source-link delete bypassed workspace revision.');
end
$$;

do $$
declare
  v_delete uuid := (select value_uuid from saved_trip_test_state where name='delete');
begin
  perform pg_temp.assert_saved_trip(public.delete_saved_trip(v_delete), 'Owner delete failed.');
  perform pg_temp.assert_saved_trip(not public.delete_saved_trip(v_delete), 'Repeated delete was not idempotent.');
  perform pg_temp.assert_saved_trip(not exists(select 1 from public.itinerary_days where trip_id=v_delete), 'Delete did not cascade to days.');
end
$$;

do $$
declare
  v_trip uuid := (select value_uuid from saved_trip_test_state where name='detail');
  v_item uuid := (select item.id from public.itinerary_items item join public.itinerary_days day on day.id=item.itinerary_day_id where day.trip_id=v_trip limit 1);
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  perform pg_temp.assert_saved_trip(not exists(
    select 1 from jsonb_array_elements(public.list_saved_trips(50,null,null)->'items') listed
    where (listed->>'id')::uuid in (select value_uuid from saved_trip_test_state)
  ), 'User B list exposed user A trips.');
  perform pg_temp.assert_saved_trip(public.get_saved_trip_detail(v_trip) is null, 'User B detail exposed user A trip.');
  perform pg_temp.assert_saved_trip(not public.update_itinerary_item_note(v_item,'Cross-user'), 'User B updated user A note.');
  begin
    insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,position)
    values(v_item,'website','https://example.test/cross-user',99);
    raise exception 'Expected cross-user source-link rejection.';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.assert_saved_trip(not public.delete_saved_trip(v_trip), 'User B deleted user A trip.');
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
end
$$;

do $$
begin
  begin perform public.list_saved_trips(0,null,null); raise exception 'Expected invalid page size.'; exception when data_exception then null; end;
  begin perform public.list_saved_trips(51,null,null); raise exception 'Expected invalid page size.'; exception when data_exception then null; end;
  begin perform public.list_saved_trips(20,now(),null); raise exception 'Expected incomplete cursor rejection.'; exception when data_exception then null; end;
  begin perform public.update_itinerary_item_note(gen_random_uuid(),repeat('x',501)); raise exception 'Expected note bound rejection.'; exception when data_exception then null; end;
end
$$;

reset role;
do $$
begin
  if has_function_privilege('anon','public.list_saved_trips(integer,timestamptz,uuid)','EXECUTE')
     or has_function_privilege('anon','public.get_saved_trip_detail(uuid)','EXECUTE')
     or has_function_privilege('anon','public.update_itinerary_item_note(uuid,text)','EXECUTE')
     or has_function_privilege('anon','public.delete_saved_trip(uuid)','EXECUTE') then
    raise exception 'Anonymous saved-trip RPC privilege is exposed.';
  end if;
  if not has_function_privilege('authenticated','public.list_saved_trips(integer,timestamptz,uuid)','EXECUTE') then
    raise exception 'Authenticated list RPC privilege missing.';
  end if;
  if not exists(select 1 from pg_indexes where schemaname='public' and indexname='trips_user_created_id_idx' and indexdef like '%(user_id, created_at DESC, id DESC)%') then
    raise exception 'Saved-trip keyset index missing.';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
set enable_seqscan = off;
explain select id from public.trips
where user_id=(select auth.uid())
order by created_at desc, id desc limit 20;
explain select day.id, item.id
from public.trips trip
join public.itinerary_days day on day.trip_id=trip.id
left join public.itinerary_items item on item.itinerary_day_id=day.id
where trip.id=(select value_uuid from saved_trip_test_state where name='detail')
  and trip.user_id=(select auth.uid())
order by day.day_number, item.position;
explain select item.id
from public.itinerary_items item
join public.itinerary_days day on day.id=item.itinerary_day_id
join public.trips trip on trip.id=day.trip_id
where item.id=(
  select candidate.id
  from public.itinerary_items candidate
  join public.itinerary_days candidate_day on candidate_day.id=candidate.itinerary_day_id
  where candidate_day.trip_id=(select value_uuid from saved_trip_test_state where name='detail')
  limit 1
)
  and trip.user_id=(select auth.uid());
reset enable_seqscan;
reset role;

select 'saved_trip_contract_pass' as result;
