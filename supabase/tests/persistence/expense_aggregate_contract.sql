\set ON_ERROR_STOP on
-- Isolated fixtures; existing T001 regressions run unchanged before this suite.
insert into public.trips(id,user_id,title,destination,start_date,end_date) values
('82000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Accounting','Hue','2028-01-01','2028-01-02'),
('82000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Other owner','Hue','2028-01-01','2028-01-02'),
('82000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','Empty','Hue','2028-01-01','2028-01-02');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('82000000-0000-4000-8000-000000000011','82000000-0000-4000-8000-000000000001',1,'2028-01-01'),
('82000000-0000-4000-8000-000000000012','82000000-0000-4000-8000-000000000001',2,'2028-01-02'),
('82000000-0000-4000-8000-000000000013','82000000-0000-4000-8000-000000000002',1,'2028-01-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name) values
('82000000-0000-4000-8000-000000000021','82000000-0000-4000-8000-000000000011',1,'One'),
('82000000-0000-4000-8000-000000000022','82000000-0000-4000-8000-000000000012',1,'Two'),
('82000000-0000-4000-8000-000000000023','82000000-0000-4000-8000-000000000013',1,'Foreign');
set role anon;
do $$ begin
  begin perform public.get_trip_expense_aggregate('{}'); raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','',false);
do $$ begin
  begin perform public.get_trip_expense_aggregate('{}'); raise exception 'JWT-less accepted';
  exception when sqlstate '28000' then null; end;
end $$;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.trip_expenses(trip_id,category,origin,amount,currency,itinerary_item_id,spent_at) values
('82000000-0000-4000-8000-000000000001','food','planned',0.10,'USD','82000000-0000-4000-8000-000000000021','2029-01-01'),
('82000000-0000-4000-8000-000000000001','food','planned',0.20,'USD','82000000-0000-4000-8000-000000000021',null),
('82000000-0000-4000-8000-000000000001','food','actual',0.20,'USD','82000000-0000-4000-8000-000000000022',null),
('82000000-0000-4000-8000-000000000001','food','unplanned',0.10,'USD',null,'2028-01-03T00:30:00+07'),
('82000000-0000-4000-8000-000000000001','transport','actual',2.00,'USD',null,null),
('82000000-0000-4000-8000-000000000001','food','planned',100,'VND',null,null);
do $$
declare
  t uuid := '82000000-0000-4000-8000-000000000001';
  q jsonb := jsonb_build_object('tripId',t,'groupBy','currency');
  r jsonb; x jsonb; first_page jsonb; bad jsonb; k text; eid uuid;
begin
  foreach k in array array['ownerId','userId','provider','unknown'] loop
    begin perform public.get_trip_expense_aggregate(q||jsonb_build_object(k,'spoof')); raise exception 'Unknown/spoof accepted';
    exception when sqlstate '22023' then null; end;
  end loop;
  foreach bad in array array['null'::jsonb,'[]','{}','{"tripId":"bad","groupBy":"currency"}'] loop
    begin perform public.get_trip_expense_aggregate(bad); raise exception 'Invalid request accepted';
    exception when sqlstate '22023' then null; end;
  end loop;
  foreach bad in array array['{"limit":0}'::jsonb,'{"limit":51}','{"limit":1.5}','{"limit":null}','{"cursor":null}','{"cursor":"bad"}','{"groupBy":"risk"}'] loop
    begin perform public.get_trip_expense_aggregate(q||bad); raise exception 'Invalid option accepted';
    exception when sqlstate '22023' then null; end;
  end loop;
  begin perform public.get_trip_expense_aggregate(q||'{"tripId":"82000000-0000-4000-8000-000000000002"}'); raise exception 'Foreign trip accepted';
  exception when sqlstate 'P0002' then null; end;
  r := public.get_trip_expense_aggregate(q);
  if jsonb_array_length(r->'items')<>2 or r->'items'->0->>'currency'<>'USD' or r->'items'->1->>'currency'<>'VND'
    or r->'items'->0->>'planned'<>'0.30' or r->'items'->0->>'actual'<>'2.20'
    or r->'items'->0->>'unplanned'<>'0.10' or r->'items'->0->>'actualPlusUnplanned'<>'2.30'
    or r->'items'->0->>'variance'<>'2.00' or r->'items'->1->>'variance'<>'-100.00' then
    raise exception 'Exact original-currency accounting failed: %',r;
  end if;
  raise notice 'ACCOUNTING_EXACTNESS USD planned=0.10+0.20=0.30 actual=2.20 unplanned=0.10 combined=2.30 variance=2.00; VND planned=100.00 variance=-100.00';
  first_page := public.get_trip_expense_aggregate(q||'{"limit":1}');
  x := public.get_trip_expense_aggregate(q||jsonb_build_object('limit',1,'cursor',first_page->>'nextCursor'));
  if x->'items'->0 <> r->'items'->1 or x->'nextCursor'<>'null'::jsonb then raise exception 'Aggregate pagination failed'; end if;
  r := public.get_trip_expense_aggregate(q||'{"groupBy":"category"}');
  if jsonb_array_length(r->'items')<>3 or r->'items'->0->>'key'<>'k:food|USD'
    or r->'items'->0->>'actual'<>'0.20' or r->'items'->0->>'planned'<>'0.30'
    or r->'items'->0->>'unplanned'<>'0.10' or r->'items'->2->>'category'<>'transport' then raise exception 'Category/origin breakdown failed: %',r; end if;
  set local timezone='Pacific/Honolulu';
  r := public.get_trip_expense_aggregate(q||'{"groupBy":"day"}');
  if jsonb_array_length(r->'items')<>5 or r->'items'->0->'day'->>'date'<>'2028-01-01'
    or r->'items'->0->>'planned'<>'0.30' or r->'items'->1->'day'->>'date'<>'2028-01-02'
    or r->'items'->2->>'key'<>'s:2028-01-02|USD' or r->'items'->3->>'key'<>'u|USD'
    or r->'items'->4->>'key'<>'u|VND' then raise exception 'Day precedence/UTC/unassigned failed: %',r; end if;
  if (select sum((v->>'planned')::numeric) from jsonb_array_elements(r->'items') v where v->>'currency'='USD')<>0.30
    or (select sum((v->>'actual')::numeric) from jsonb_array_elements(r->'items') v where v->>'currency'='USD')<>2.20 then raise exception 'Duplicate or missing day accounting'; end if;
  foreach k in array array['currency','category','day'] loop
    r := public.get_trip_expense_aggregate(jsonb_build_object('tripId','82000000-0000-4000-8000-000000000003','groupBy',k));
    if r->'items'<>'[]'::jsonb or r->'nextCursor'<>'null'::jsonb then raise exception 'Empty failed'; end if;
  end loop;
  begin
    perform public.create_trip_expense(jsonb_build_object('tripId',t,'category','food','origin','actual','amount',1,'currency','USD','itineraryItemId','82000000-0000-4000-8000-000000000023'));
    raise exception 'Cross-trip contamination accepted';
  exception when sqlstate '22023' then null; end;
  select id into eid from public.trip_expenses where trip_id=t and category='transport';
  perform public.update_trip_expense(jsonb_build_object('tripId',t,'expenseId',eid,'patch',jsonb_build_object('amount',3.00)));
  r := public.get_trip_expense_aggregate(q);
  if r->'items'->0->>'actual'<>'3.20' then raise exception 'Update not reflected'; end if;
  perform public.delete_trip_expense(t,eid);
  r := public.get_trip_expense_aggregate(q);
  if r->'items'->0->>'actual'<>'0.20' then raise exception 'Delete not reflected'; end if;
  -- Sum beyond individual numeric(12,2) row bounds without overflow/truncation.
  insert into public.trip_expenses(trip_id,category,origin,amount,currency)
    select t,'other','planned',9999999999.99,'EUR' from generate_series(1,2);
  r := public.get_trip_expense_aggregate(q);
  if r->'items'->0->>'planned'<>'19999999999.98' then raise exception 'Aggregate above row bound failed'; end if;
  -- Explicit numeric(24,2) representation bound (not feasible to seed 10^12 rows).
  if (9999999999999999999999.99::numeric(24,2))::text<>'9999999999999999999999.99' then raise exception 'Max bound failed'; end if;
  begin perform 10000000000000000000000::numeric(24,2); raise exception 'Overflow not rejected';
  exception when numeric_value_out_of_range then null; end;
end $$;
-- Same session, new identity: no cached owner aggregate and no ledger visibility.
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$ begin
  begin perform public.get_trip_expense_aggregate('{"tripId":"82000000-0000-4000-8000-000000000001","groupBy":"currency"}'); raise exception 'Stale owner leaked';
  exception when sqlstate 'P0002' then null; end;
  if exists(select 1 from public.trip_expenses where trip_id='82000000-0000-4000-8000-000000000001') then raise exception 'Ledger RLS leaked'; end if;
end $$;
reset role;
do $$ begin
  if (select prosecdef from pg_proc where oid='public.get_trip_expense_aggregate(jsonb)'::regprocedure) then raise exception 'Invoker required'; end if;
end $$;
select 'expense_aggregate_contract_pass' as result;

-- Bounded output with more than 50 original-currency groups and 3,000 rows.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
insert into public.trip_expenses(trip_id,category,origin,amount,currency,itinerary_item_id)
select '82000000-0000-4000-8000-000000000003','food','actual',0.10,
  'A'||chr(65+(n%60)/26)||chr(65+(n%60)%26),
  null from generate_series(1,3000) n;
do $$ declare r jsonb; second_page jsonb; begin
  r := public.get_trip_expense_aggregate('{"tripId":"82000000-0000-4000-8000-000000000003","groupBy":"currency","limit":50}');
  second_page := public.get_trip_expense_aggregate(jsonb_build_object('tripId','82000000-0000-4000-8000-000000000003','groupBy','currency','limit',50,'cursor',r->>'nextCursor'));
  if jsonb_array_length(r->'items')<>50 or jsonb_array_length(second_page->'items')<>10
     or second_page->'nextCursor'<>'null'::jsonb or r->'items'->0->>'actual'<>'5.00' then
    raise exception 'Bounded 60-currency page failed';
  end if;
end $$;
reset role;
analyze public.trip_expenses;
-- Extract the exact installed RPC aggregate statement, then EXPLAIN under owner RLS.
-- No hand-maintained substitute query: same CTE, joins, aggregates and page limit.
create temporary table expense_plan_sql(q text);
insert into expense_plan_sql
select replace(replace(replace(replace(
  split_part(substr(def,strpos(def,'  with source as (')),'  into v_result from page;',1)||' from page',
  'v_group',quote_literal('day')),'v_trip',quote_literal('82000000-0000-4000-8000-000000000003')||'::uuid'),
  'v_cursor','null::text'),'v_limit','50')
from (select pg_get_functiondef('public.get_trip_expense_aggregate(jsonb)'::regprocedure) def) f;
grant select on expense_plan_sql to authenticated;
set role authenticated;
do $$ declare line record; q text; begin
  select expense_plan_sql.q into q from expense_plan_sql;
  raise notice 'EXPENSE_AGGREGATE_EXPLAIN_BEGIN: exact installed day query, 3000 ledger rows, authenticated RLS';
  for line in execute 'explain (analyze, buffers, costs, timing off) '||q loop
    raise notice '%',line."QUERY PLAN";
  end loop;
  raise notice 'EXPENSE_AGGREGATE_EXPLAIN_END';
end $$;
reset role;
drop table expense_plan_sql;
select 'expense_aggregate_bounded_plan_pass' as result;
