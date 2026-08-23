\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);

create temporary table test_state (
  name text primary key,
  value_text text,
  value_uuid uuid
);

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not coalesce(p_condition, false) then
    raise exception '%', p_message;
  end if;
end
$$;

create function pg_temp.expect_rpc_error(
  p_key text,
  p_graph jsonb,
  p_code text,
  p_message text
) returns void language plpgsql as $$
declare
  v_trips bigint := (select count(*) from public.trips);
  v_days bigint := (select count(*) from public.itinerary_days);
  v_items bigint := (select count(*) from public.itinerary_items);
  v_code text;
  v_message text;
  v_detail text;
  v_hint text;
begin
  begin
    perform public.create_trip_graph(p_key, p_graph);
    raise exception 'Expected RPC failure did not occur.';
  exception when others then
    get stacked diagnostics
      v_code = returned_sqlstate,
      v_message = message_text,
      v_detail = pg_exception_detail,
      v_hint = pg_exception_hint;
    if v_code <> p_code or v_message <> p_message then
      raise exception 'Unexpected stable error: code=%, message=%', v_code, v_message;
    end if;
    if coalesce(v_detail, '') <> '' or coalesce(v_hint, '') <> '' then
      raise exception 'Stable error leaked DETAIL or HINT.';
    end if;
  end;

  perform pg_temp.assert_true((select count(*) from public.trips) = v_trips, 'Trip rollback failed.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_days) = v_days, 'Day rollback failed.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_items) = v_items, 'Item rollback failed.');
  raise notice 'atomicity code=% before=%/%/% after=%/%/%',
    p_code, v_trips, v_days, v_items,
    (select count(*) from public.trips),
    (select count(*) from public.itinerary_days),
    (select count(*) from public.itinerary_items);
end
$$;

-- Happy path: graph creation persists suggestions only. Provider metadata is
-- deliberately unavailable at this public boundary.
insert into test_state (name, value_uuid)
select 'happy_trip', public.create_trip_graph(
  'fresh-happy-001',
  '{
    "title":"Nha Trang escape",
    "destination":"Nha Trang",
    "startDate":"2026-10-01",
    "endDate":"2026-10-03",
    "estimatedBudget":1500.25,
    "currency":"USD",
    "days":[
      {"dayNumber":1,"date":"2026-10-01","summary":"Arrival","items":[
        {"position":1,"placeName":"Po Nagar","placeQuery":"Po Nagar Nha Trang","startTime":"09:00","endTime":"10:30","note":"Unresolved suggestion"},
        {"position":2,"placeName":"Dam Market","placeQuery":"Dam Market Nha Trang","startTime":"11:00","endTime":"12:00","note":"Unresolved suggestion"}
      ]},
      {"dayNumber":2,"date":"2026-10-02","summary":"Island day","items":[
        {"position":1,"placeName":"Hon Mun","placeQuery":"Hon Mun marine park"},
        {"position":2,"placeName":"Hon Tam"}
      ]},
      {"dayNumber":3,"date":"2026-10-03","summary":"Departure","items":[
        {"position":1,"placeName":"Long Son Pagoda"}
      ]}
    ]
  }'::jsonb
);

do $$
declare v_trip uuid := (select value_uuid from test_state where name = 'happy_trip');
begin
  perform pg_temp.assert_true((select count(*) from public.trips where id = v_trip) = 1, 'Trip missing.');
  perform pg_temp.assert_true((select user_id from public.trips where id = v_trip) = auth.uid(), 'Owner was not derived from auth.uid().');
  perform pg_temp.assert_true((select title = 'Nha Trang escape' and destination = 'Nha Trang' and start_date = '2026-10-01' and end_date = '2026-10-03' and estimated_budget = 1500.25 and currency = 'USD' from public.trips where id = v_trip), 'Trip fields mismatch.');
  perform pg_temp.assert_true((select idempotency_key='fresh-happy-001' and octet_length(idempotency_request_hash)=32 from public.trips where id=v_trip), 'Idempotency metadata mismatch.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_days where trip_id = v_trip) = 3, 'Day count mismatch.');
  perform pg_temp.assert_true((select array_agg(day_number order by day_number) from public.itinerary_days where trip_id = v_trip) = array[1,2,3], 'Day ordering mismatch.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id where d.trip_id=v_trip) = 5, 'Item count mismatch.');
  perform pg_temp.assert_true(exists(select 1 from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id where d.trip_id=v_trip and i.place_name='Po Nagar' and i.place_query='Po Nagar Nha Trang' and i.latitude is null and i.longitude is null and i.start_time='09:00' and i.end_time='10:30' and i.note='Unresolved suggestion'), 'Unresolved item fields mismatch.');
  perform pg_temp.assert_true(exists(select 1 from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id where d.trip_id=v_trip and i.place_name='Dam Market' and i.google_place_id is null and i.latitude is null and i.longitude is null and i.place_resolved_at is null), 'Graph creation created provider-looking metadata.');
end
$$;

-- Sequential retry is stable and does not duplicate rows.
insert into test_state(name, value_uuid)
select 'retry_trip', public.create_trip_graph(
  'retry-key-0001',
  '{"title":"Retry","destination":"Hue","startDate":"2026-11-01","endDate":"2026-11-01","days":[{"dayNumber":1,"date":"2026-11-01","items":[{"position":1,"placeName":"Citadel"}]}]}'::jsonb
);
do $$
declare
  v_original uuid := (select value_uuid from test_state where name='retry_trip');
  v_retry uuid;
  v_count bigint := (select count(*) from public.trips);
begin
  v_retry := public.create_trip_graph('retry-key-0001', '{"title":"Retry","destination":"Hue","startDate":"2026-11-01","endDate":"2026-11-01","days":[{"dayNumber":1,"date":"2026-11-01","items":[{"position":1,"placeName":"Citadel"}]}]}'::jsonb);
  perform pg_temp.assert_true(v_retry = v_original, 'Retry returned a different trip ID.');
  perform pg_temp.assert_true((select count(*) from public.trips) = v_count, 'Retry duplicated the trip.');
end
$$;

-- Same graph under a different key creates an independent graph.
do $$
declare
  v_before bigint := (select count(*) from public.trips);
  v_id uuid;
begin
  v_id := public.create_trip_graph('retry-key-0002', '{"title":"Retry","destination":"Hue","startDate":"2026-11-01","endDate":"2026-11-01","days":[{"dayNumber":1,"date":"2026-11-01","items":[{"position":1,"placeName":"Citadel"}]}]}'::jsonb);
  perform pg_temp.assert_true(v_id <> (select value_uuid from test_state where name='retry_trip'), 'Different key reused the prior trip ID.');
  perform pg_temp.assert_true((select count(*) from public.trips)=v_before+1, 'Different key did not create one trip.');
end
$$;

-- Idempotency keys are owner-scoped.
do $$
declare
  v_user_a_id uuid := (select value_uuid from test_state where name='retry_trip');
  v_user_b_id uuid;
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  v_user_b_id := public.create_trip_graph('retry-key-0001', '{"title":"Retry","destination":"Hue","startDate":"2026-11-01","endDate":"2026-11-01","days":[{"dayNumber":1,"date":"2026-11-01","items":[{"position":1,"placeName":"Citadel"}]}]}'::jsonb);
  perform pg_temp.assert_true(v_user_b_id <> v_user_a_id, 'Different owner reused user A trip ID.');
  perform pg_temp.assert_true((select user_id from public.trips where id=v_user_b_id)=auth.uid(), 'Different-owner trip has wrong owner.');
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
end
$$;

select pg_temp.expect_rpc_error(
  'retry-key-0001',
  '{"title":"Different","destination":"Hue","startDate":"2026-11-01","endDate":"2026-11-01","days":[{"dayNumber":1,"date":"2026-11-01","items":[{"position":1,"placeName":"Citadel"}]}]}'::jsonb,
  'TW004', 'The idempotency key is already associated with a different request.'
);

-- Validation/type/allow-list/date/order/coordinate/atomicity matrix.
select pg_temp.expect_rpc_error('err-unknown-001', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","user_id":"22222222-2222-4222-8222-222222222222","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-missing-001', '{"title":"A","startDate":"2026-01-01","endDate":"2026-01-01","days":[]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-type-00001', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":"wrong"}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-date-00001', '{"title":"A","destination":"B","startDate":"2026-01-02","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-02","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-day-gap-001', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-02","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]},{"dayNumber":3,"date":"2026-01-02","items":[{"position":1,"placeName":"Y"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-item-dup-01', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"},{"position":1,"placeName":"Y"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-coord-half1', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","latitude":10}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-coord-range', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","latitude":91,"longitude":0}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-time-range1', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","startTime":"12:00","endTime":"11:00"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-time-format', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","startTime":"25:00"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-day-outside', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-02","days":[{"dayNumber":1,"date":"2026-01-02","items":[{"position":1,"placeName":"X"}]},{"dayNumber":2,"date":"2026-01-01","items":[{"position":1,"placeName":"Y"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-position-0', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":0,"placeName":"X"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-budget-neg1', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","estimatedBudget":-1,"days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-currency-01', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","currency":"US","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-title-long1', jsonb_build_object('title',repeat('x',161),'destination','B','startDate','2026-01-01','endDate','2026-01-01','days',jsonb_build_array(jsonb_build_object('dayNumber',1,'date','2026-01-01','items',jsonb_build_array(jsonb_build_object('position',1,'placeName','X'))))), 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-place-long1', jsonb_build_object('title','A','destination','B','startDate','2026-01-01','endDate','2026-01-01','days',jsonb_build_array(jsonb_build_object('dayNumber',1,'date','2026-01-01','items',jsonb_build_array(jsonb_build_object('position',1,'placeName',repeat('x',161)))))), 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-payload-big1', jsonb_build_object('title','A','destination','B','startDate','2026-01-01','endDate','2026-01-01','days',jsonb_build_array(jsonb_build_object('dayNumber',1,'date','2026-01-01','summary',repeat('x',270000),'items',jsonb_build_array(jsonb_build_object('position',1,'placeName','X'))))), 'TW001', 'Trip persistence input is invalid.');

-- Every supported string at its exact maximum remains valid.
do $$
declare v_id uuid;
begin
  v_id := public.create_trip_graph('string-max-0001', jsonb_build_object(
    'title',repeat('t',160), 'destination',repeat('d',120),
    'startDate','2026-12-01','endDate','2026-12-01','currency','USD',
    'days',jsonb_build_array(jsonb_build_object(
      'dayNumber',1,'date','2026-12-01','summary',repeat('s',500),
      'items',jsonb_build_array(jsonb_build_object(
        'position',1,'placeName',repeat('p',160),
        'placeQuery',repeat('q',200),'note',repeat('n',500)
      ))
    ))
  ));
  perform pg_temp.assert_true(v_id is not null, 'Exact string maxima were rejected.');
end
$$;

-- Every string limit rejects max + 1, not only required fields.
do $$
declare
  v_base jsonb := '{"title":"A","destination":"B","startDate":"2026-12-02","endDate":"2026-12-02","days":[{"dayNumber":1,"date":"2026-12-02","summary":"S","items":[{"position":1,"googlePlaceId":"G","placeName":"P","placeQuery":"Q","placeAddress":"A","placeCategory":"C","note":"N"}]}]}'::jsonb;
  v_case record;
  v_index integer := 0;
begin
  for v_case in
    select * from (values
      (array['title']::text[],161),
      (array['destination']::text[],121),
      (array['days','0','summary']::text[],501),
      (array['days','0','items','0','googlePlaceId']::text[],256),
      (array['days','0','items','0','placeName']::text[],161),
      (array['days','0','items','0','placeQuery']::text[],201),
      (array['days','0','items','0','placeAddress']::text[],501),
      (array['days','0','items','0','placeCategory']::text[],101),
      (array['days','0','items','0','note']::text[],501)
    ) as limits(path, invalid_length)
  loop
    v_index := v_index + 1;
    perform pg_temp.expect_rpc_error(
      format('string-over-%s',v_index),
      jsonb_set(v_base,v_case.path,to_jsonb(repeat('x',v_case.invalid_length))),
      'TW001','Trip persistence input is invalid.'
    );
  end loop;
end
$$;

-- Leap-day, single-day, coordinate edges, and Vietnamese UTF-8 smoke.
do $$
declare v_id uuid;
begin
  v_id := public.create_trip_graph('edge-valid-0001', '{"title":"Hành trình Việt Nam","destination":"Đà Nẵng","startDate":"2028-02-29","endDate":"2028-02-29","days":[{"dayNumber":1,"date":"2028-02-29","summary":"Ngày nhuận","items":[{"position":1,"placeName":"Điểm cực trị","startTime":"00:00","endTime":"23:59"}]}]}'::jsonb);
  perform pg_temp.assert_true(v_id is not null, 'Valid leap-day/UTF-8 graph failed.');
end
$$;
select pg_temp.expect_rpc_error('err-date-invalid', '{"title":"A","destination":"B","startDate":"2027-02-29","endDate":"2027-02-29","days":[{"dayNumber":1,"date":"2027-02-29","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-coord-half2', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","longitude":10}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-lat-under1', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","latitude":-91,"longitude":0}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-lng-under1', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","latitude":0,"longitude":-181}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('err-lng-over01', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X","latitude":0,"longitude":181}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');

-- Minimum and maximum graph sizes; validation remains linear and bounded.
do $$
declare
  v_days jsonb;
  v_graph jsonb;
  v_started timestamptz;
  v_elapsed_ms numeric;
  v_id uuid;
begin
  select jsonb_agg(jsonb_build_object(
    'dayNumber', d,
    'date', to_char(date '2027-01-01' + (d - 1), 'YYYY-MM-DD'),
    'items', (select jsonb_agg(jsonb_build_object('position',i,'placeName',format('Place %s-%s',d,i)) order by i) from generate_series(1,6) i)
  ) order by d) into v_days from generate_series(1,14) d;
  v_graph := jsonb_build_object('title','Maximum graph','destination','Vietnam','startDate','2027-01-01','endDate','2027-01-14','days',v_days);
  v_started := clock_timestamp();
  v_id := public.create_trip_graph('maximum-graph-01', v_graph);
  v_elapsed_ms := extract(epoch from clock_timestamp() - v_started) * 1000;
  perform pg_temp.assert_true((select count(*) from public.itinerary_days where trip_id=v_id)=14, 'Maximum day count mismatch.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id where d.trip_id=v_id)=84, 'Maximum item count mismatch.');
  perform pg_temp.assert_true(v_elapsed_ms < 5000, 'Maximum graph persistence exceeded 5 seconds locally.');
  raise notice 'maximum_graph_elapsed_ms=%', round(v_elapsed_ms,2);
end
$$;

select pg_temp.expect_rpc_error('too-many-days1', jsonb_build_object('title','A','destination','B','startDate','2027-02-01','endDate','2027-02-15','days',(select jsonb_agg(jsonb_build_object('dayNumber',d,'date',to_char(date '2027-02-01'+(d-1),'YYYY-MM-DD'),'items',jsonb_build_array(jsonb_build_object('position',1,'placeName','X'))) order by d) from generate_series(1,15)d)), 'TW001', 'Trip persistence input is invalid.');
select pg_temp.expect_rpc_error('too-many-items', '{"title":"A","destination":"B","startDate":"2027-03-01","endDate":"2027-03-01","days":[{"dayNumber":1,"date":"2027-03-01","items":[{"position":1,"placeName":"1"},{"position":2,"placeName":"2"},{"position":3,"placeName":"3"},{"position":4,"placeName":"4"},{"position":5,"placeName":"5"},{"position":6,"placeName":"6"},{"position":7,"placeName":"7"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');

-- GeneratedTrip -> persistence representability: AI-only summary/cost are intentionally omitted.
do $$
declare
  v_generated jsonb := '{"title":"Generated","destination":"Da Nang","startDate":"2027-04-01","endDate":"2027-04-01","summary":"AI trip summary","days":[{"dayNumber":1,"date":"2027-04-01","summary":"Day summary","items":[{"position":1,"placeName":"Dragon Bridge","placeQuery":"Dragon Bridge Da Nang","startTime":"19:00","endTime":"20:00","note":"Generated note","estimatedCost":10}]}]}'::jsonb;
  v_graph jsonb;
  v_id uuid;
begin
  v_graph := jsonb_build_object(
    'title',v_generated->'title','destination',v_generated->'destination',
    'startDate',v_generated->'startDate','endDate',v_generated->'endDate',
    'days',(select jsonb_agg(jsonb_build_object(
      'dayNumber',d->'dayNumber','date',d->'date','summary',d->'summary',
      'items',(select jsonb_agg((i - 'estimatedCost')) from jsonb_array_elements(d->'items') i)
    )) from jsonb_array_elements(v_generated->'days') d)
  );
  v_id := public.create_trip_graph('generated-map-01', v_graph);
  perform pg_temp.assert_true(exists(select 1 from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id where d.trip_id=v_id and i.place_name='Dragon Bridge' and i.place_query='Dragon Bridge Da Nang' and i.latitude is null and i.longitude is null), 'Generated unresolved item mapping failed.');
end
$$;

-- RLS isolation and ownership spoof protection.
do $$
declare v_trip uuid := (select value_uuid from test_state where name='happy_trip');
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  perform pg_temp.assert_true((select count(*) from public.trips where id=v_trip)=0, 'User B can read user A trip.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_days where trip_id=v_trip)=0, 'User B can read user A days.');
  perform pg_temp.assert_true((select count(*) from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id where d.trip_id=v_trip)=0, 'User B can read user A items.');
  update public.trips set title='spoofed' where id=v_trip;
  perform pg_temp.assert_true(not found, 'User B updated user A trip.');
  delete from public.trips where id=v_trip;
  perform pg_temp.assert_true(not found, 'User B deleted user A trip.');
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
  perform pg_temp.assert_true((select title from public.trips where id=v_trip)='Nha Trang escape', 'User A graph changed during RLS test.');
end
$$;

-- Missing authentication has a stable error and no writes.
select set_config('request.jwt.claim.sub','',false);
select pg_temp.expect_rpc_error('missing-auth-01', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW002', 'Authentication is required.');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

-- Direct table writes remain owner-scoped, but cannot self-certify provider metadata.
do $$
declare
  v_trip uuid;
  v_day uuid;
begin
  insert into public.trips(user_id,title,destination,start_date,end_date)
  values(auth.uid(),'Direct write audit','Audit','2027-05-01','2027-05-01')
  returning id into v_trip;
  insert into public.itinerary_days(trip_id,day_number,date,summary)
  values(v_trip,1,'2027-05-01','Direct day') returning id into v_day;
  insert into public.itinerary_items(itinerary_day_id,position,place_name,latitude,longitude)
  values(v_day,1,'Direct unresolved',null,null);
end
$$;

-- Client-supplied provider fields are rejected and cannot create VERIFIED.
select pg_temp.expect_rpc_error('provider-spoof-01', '{"title":"A","destination":"B","startDate":"2027-05-02","endDate":"2027-05-02","days":[{"dayNumber":1,"date":"2027-05-02","items":[{"position":1,"placeName":"Fake","googlePlaceId":"fake-id","latitude":13.7,"longitude":100.4,"placeAddress":"Fake address","placeCategory":"landmark"}]}]}'::jsonb, 'TW001', 'Trip persistence input is invalid.');

do $$
declare
  v_item uuid := (
    select i.id from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id
    where d.trip_id=(select value_uuid from test_state where name='happy_trip') and i.place_name='Dam Market'
  );
begin
  begin
    update public.itinerary_items set google_place_id='client-fake', latitude=13.7, longitude=100.4, place_resolved_at=clock_timestamp() where id=v_item;
    raise exception 'Expected direct provider spoof rejection.';
  exception when data_exception then null;
  end;
  perform pg_temp.assert_true((select place_resolved_at is null and google_place_id is null from public.itinerary_items where id=v_item), 'Direct write created a trusted snapshot.');
end
$$;

-- The service-only writer updates every trusted snapshot field atomically and
-- rejects a mismatched owner. This models the Edge Function after JWT ownership
-- verification; ordinary authenticated callers have no EXECUTE grant.
reset role;
do $$
declare
  v_item uuid := (
    select i.id from public.itinerary_items i join public.itinerary_days d on d.id=i.itinerary_day_id
    where d.trip_id=(select value_uuid from test_state where name='happy_trip') and i.place_name='Dam Market'
  );
  v_resolved timestamptz;
begin
  v_resolved := public.apply_verified_place_snapshot('11111111-1111-4111-8111-111111111111', v_item, 'google-dam-market', 'Dam Market', 12.2549, 109.1915, 'Ben Cho', 'market');
  perform pg_temp.assert_true(v_resolved is not null and exists(select 1 from public.itinerary_items where id=v_item and google_place_id='google-dam-market' and latitude=12.2549 and longitude=109.1915 and place_resolved_at=v_resolved), 'Protected snapshot writer was not atomic.');
  begin
    perform public.apply_verified_place_snapshot('22222222-2222-4222-8222-222222222222', v_item, 'wrong-owner', 'Wrong', 1, 1);
    raise exception 'Expected owner mismatch rejection.';
  exception when no_data_found then null;
  end;
end
$$;
reset role;

do $$
begin
  if has_function_privilege('authenticated', 'public.apply_verified_place_snapshot(uuid,uuid,text,text,double precision,double precision,text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.apply_verified_place_snapshot(uuid,uuid,text,text,double precision,double precision,text,text)', 'EXECUTE') then
    raise exception 'Protected snapshot writer is exposed to a client role.';
  end if;
end
$$;

set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

-- User B cannot spoof A ownership or attach children to A's graph through direct writes.
do $$
declare
  v_a_trip uuid := (select value_uuid from test_state where name='happy_trip');
  v_a_day uuid := (select id from public.itinerary_days where trip_id=v_a_trip and day_number=1);
begin
  perform set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
  begin
    insert into public.trips(user_id,title,destination,start_date,end_date)
    values('11111111-1111-4111-8111-111111111111','Spoof','X','2027-05-01','2027-05-01');
    raise exception 'Expected owner-spoof insert failure.';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  begin
    insert into public.itinerary_days(trip_id,day_number,date) values(v_a_trip,99,'2027-05-01');
    raise exception 'Expected foreign-owner day insert failure.';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  begin
    insert into public.itinerary_items(itinerary_day_id,position,place_name) values(v_a_day,99,'Spoof child');
    raise exception 'Expected foreign-owner item insert failure.';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
end
$$;

reset role;

do $$
begin
  if has_function_privilege('anon','public.create_trip_graph(text,jsonb)','EXECUTE')
     or has_function_privilege('public','public.create_trip_graph(text,jsonb)','EXECUTE') then
    raise exception 'Anonymous/public RPC execute privilege is exposed.';
  end if;
  if not has_function_privilege('authenticated','public.create_trip_graph(text,jsonb)','EXECUTE') then
    raise exception 'Authenticated RPC execute privilege is missing.';
  end if;
  if has_function_privilege('authenticated','public.create_trip_graph(jsonb)','EXECUTE') then
    raise exception 'Old non-idempotent RPC remains executable.';
  end if;
  if (select prosecdef from pg_proc where oid='public.create_trip_graph(text,jsonb)'::regprocedure) then
    raise exception 'Public RPC is not SECURITY INVOKER.';
  end if;
  if (select prosecdef from pg_proc where oid='tripwise_private.create_trip_graph(text,jsonb)'::regprocedure) then
    raise exception 'Private implementation is not SECURITY INVOKER.';
  end if;
  if exists(select 1 from pg_class where oid in ('public.trips'::regclass,'public.itinerary_days'::regclass,'public.itinerary_items'::regclass) and not relrowsecurity) then
    raise exception 'RLS is disabled on a persistence table.';
  end if;
  if not exists (
    select 1 from pg_indexes
    where schemaname='public' and indexname='trips_user_id_idempotency_key_key'
      and indexdef like '%(user_id, idempotency_key)%WHERE (idempotency_key IS NOT NULL)%'
  ) then
    raise exception 'Owner-scoped partial idempotency index is missing or malformed.';
  end if;
  if (select count(*) from pg_indexes where schemaname='public' and indexname in ('trips_user_id_idx','itinerary_days_trip_id_idx','itinerary_items_itinerary_day_id_idx')) <> 3 then
    raise exception 'One or more ownership/FK lookup indexes are missing.';
  end if;
  if (select count(*) from pg_constraint where conrelid in ('public.trips'::regclass,'public.itinerary_days'::regclass,'public.itinerary_items'::regclass) and contype='f') <> 3 then
    raise exception 'Persistence foreign-key contract is incomplete.';
  end if;
end
$$;

set enable_seqscan = off;
explain select id from public.trips
where user_id='11111111-1111-4111-8111-111111111111'
  and idempotency_key='fresh-happy-001';
reset enable_seqscan;

-- Known authorization failure maps to TW003.
revoke insert on public.trips from authenticated;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.expect_rpc_error('forbidden-key01', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW003', 'Trip persistence is not permitted.');
reset role;
grant insert on public.trips to authenticated;

-- Test-only CHECK violation exercises constraint fallback without leaking internals.
create function pg_temp.inject_check_failure() returns trigger language plpgsql as $$
begin
  raise exception 'sensitive_constraint_name' using errcode='23514';
end
$$;
create trigger test_check_failure before insert on public.itinerary_items
for each row execute function pg_temp.inject_check_failure();
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.expect_rpc_error('constraint-fail', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW005', 'Unable to persist trip.');
reset role;
drop trigger test_check_failure on public.itinerary_items;

-- Test-only injected unexpected failure maps safely to TW005 and rolls back.
create function pg_temp.inject_unexpected_failure() returns trigger language plpgsql as $$
begin
  raise exception 'internal table/constraint/query must never escape';
end
$$;
create trigger test_unexpected_failure before insert on public.trips
for each row execute function pg_temp.inject_unexpected_failure();
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select pg_temp.expect_rpc_error('database-fail-01', '{"title":"A","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb, 'TW005', 'Unable to persist trip.');
reset role;
drop trigger test_unexpected_failure on public.trips;

-- A failed first attempt does not consume the key; retry succeeds after failure removal.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare v_id uuid;
begin
  v_id := public.create_trip_graph('database-fail-01', '{"title":"Recovered","destination":"B","startDate":"2026-01-01","endDate":"2026-01-01","days":[{"dayNumber":1,"date":"2026-01-01","items":[{"position":1,"placeName":"X"}]}]}'::jsonb);
  perform pg_temp.assert_true(v_id is not null, 'Retry after failed first attempt did not recover.');
end
$$;
reset role;

select 'fresh_contract_pass' as result;
