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
begin
  perform pg_temp.assert_saved_trip(public.update_itinerary_item_note(v_item, 'Updated note'), 'Owner note update failed.');
  perform pg_temp.assert_saved_trip((select note from public.itinerary_items where id=v_item)='Updated note', 'Updated note did not persist.');
  perform pg_temp.assert_saved_trip(public.update_itinerary_item_note(v_item, '   '), 'Owner note clear failed.');
  perform pg_temp.assert_saved_trip((select note is null from public.itinerary_items where id=v_item), 'Blank note did not normalize to NULL.');
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
