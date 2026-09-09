\set ON_ERROR_STOP on
-- FEATURE-P3-T003 persistence test contract

-- Isolated fixtures inserted as superuser (postgres) before role switches.
insert into public.trips(id,user_id,title,destination,start_date,end_date,estimated_budget,currency) values
('83000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Budgeted Trip','Tokyo','2028-05-01','2028-05-05',1250.50,'USD'),
('83000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','No Budget Trip','Danang','2028-06-01','2028-06-03',null,'VND'),
('83000000-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222','Foreign Trip','Seoul','2028-07-01','2028-07-04',500.00,'KRW'),
('83000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','Unknown Currency','Tokyo','2028-05-01','2028-05-05',0.10,null);

-- Anonymous access must be blocked.
set role anon;
do $$ begin
  begin perform public.get_trip_fx_context('{}'); raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- JWT-less authenticated access must be blocked.
set role authenticated;
select set_config('request.jwt.claim.sub','',false);
do $$ begin
  begin perform public.get_trip_fx_context('{}'); raise exception 'JWT-less accepted';
  exception when sqlstate '28000' then null; end;
end $$;

-- Authenticated owner tests.
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);

do $$
declare
  r jsonb;
  k text;
  bad jsonb;
  before_trips jsonb;
  before_expenses jsonb;
begin
  select jsonb_agg(to_jsonb(t) order by id) into before_trips from public.trips t;
  select jsonb_agg(to_jsonb(e) order by id) into before_expenses from public.trip_expenses e;
  -- Strict whitelist: reject unexpected keys.
  foreach k in array array['ownerId','userId','provider','unknown','amount','destinationCurrency'] loop
    begin
      perform public.get_trip_fx_context(jsonb_build_object('tripId','83000000-0000-4000-8000-000000000001',k,'spoof'));
      raise exception 'Unknown/spoof field % accepted', k;
    exception when sqlstate '22023' then null; end;
  end loop;

  -- Invalid shapes rejected.
  foreach bad in array array['null'::jsonb,'[]','{}','{"tripId":123}','{"tripId":null}','{"tripId":"bad-uuid"}'] loop
    begin
      perform public.get_trip_fx_context(bad);
      raise exception 'Invalid request % accepted', bad;
    exception when sqlstate '22023' then null; end;
  end loop;

  -- Foreign trip non-disclosing P0002.
  begin
    perform public.get_trip_fx_context('{"tripId":"83000000-0000-4000-8000-000000000003"}');
    raise exception 'Foreign trip accepted';
  exception when sqlstate 'P0002' then null; end;

  -- Non-existent trip P0002.
  begin
    perform public.get_trip_fx_context('{"tripId":"83000000-0000-4000-8000-ffffffffffff"}');
    raise exception 'Non-existent trip accepted';
  exception when sqlstate 'P0002' then null; end;

  -- Owner budgeted trip: exact decimal string and preserved home currency.
  r := public.get_trip_fx_context('{"tripId":"83000000-0000-4000-8000-000000000001"}');
  if r->>'tripId' <> '83000000-0000-4000-8000-000000000001'
     or r->'originalBudget'->>'amount' <> '1250.50'
     or r->'originalBudget'->>'currency' <> 'USD'
     or r->>'homeCurrency' <> 'USD'
     or r->>'homeCurrencySource' <> 'originalBudget'
     or r->>'destinationCurrency' is not null
     or r->>'destinationCurrencySource' <> 'unavailable' then
    raise exception 'Budgeted trip context validation failed: %', r;
  end if;

  -- Owner unbudgeted trip: amount is null, home currency preserved.
  r := public.get_trip_fx_context('{"tripId":"83000000-0000-4000-8000-000000000002"}');
  if r->>'tripId' <> '83000000-0000-4000-8000-000000000002'
     or (r->'originalBudget'->>'amount') is not null
     or r->'originalBudget'->>'currency' <> 'VND'
     or r->>'homeCurrency' <> 'VND'
     or r->>'homeCurrencySource' <> 'originalBudget'
     or r->>'destinationCurrency' is not null
     or r->>'destinationCurrencySource' <> 'unavailable' then
    raise exception 'Unbudgeted trip context validation failed: %', r;
  end if;

  -- Nullable currency is schema-valid; preserve the original, never guess.
  r := public.get_trip_fx_context('{"tripId":"83000000-0000-4000-8000-000000000004"}');
  if r->'originalBudget'->>'amount' is distinct from '0.10'
     or r->'originalBudget'->'currency' is distinct from 'null'::jsonb
     or r->'homeCurrency' is distinct from 'null'::jsonb
     or r->'destinationCurrency' is distinct from 'null'::jsonb then
    raise exception 'Unknown currency was guessed or budget lost';
  end if;
  if (select array_agg(key order by key) from jsonb_object_keys(r) key)
     is distinct from array['destinationCurrency','destinationCurrencySource','homeCurrency','homeCurrencySource','originalBudget','tripId'] then
    raise exception 'Unexpected FX context keys';
  end if;
  if (select jsonb_agg(to_jsonb(t) order by id) from public.trips t) is distinct from before_trips
     or (select jsonb_agg(to_jsonb(e) order by id) from public.trip_expenses e) is distinct from before_expenses then
    raise exception 'FX context mutated original trips or expenses';
  end if;
  -- Ensure read-only invariant: trips table untouched.
  if (select estimated_budget from public.trips where id='83000000-0000-4000-8000-000000000001') <> 1250.50
     or (select currency from public.trips where id='83000000-0000-4000-8000-000000000001') <> 'USD' then
    raise exception 'Budget or currency mutated!';
  end if;
end $$;

select 'trip_fx_context_contract_pass' as result;
