\set ON_ERROR_STOP on
begin;
insert into public.trips(id,user_id,title,destination,start_date,end_date) values
('77000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Timezone','Free text','2028-03-12','2028-03-12');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('77000000-0000-4000-8000-000000000011','77000000-0000-4000-8000-000000000001',1,'2028-03-12');
create function pg_temp.tz_assert(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'Timezone assertion failed: %',label; end if; end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$
declare id uuid := '77000000-0000-4000-8000-000000000001'; r integer; c jsonb; result jsonb; before_row jsonb; bad text; extra jsonb;
begin
  select workspace_revision,to_jsonb(t) into r,before_row from public.trips t where t.id=id;
  c := jsonb_build_object('tripId',id,'expectedRevision',r,'timezone','Asia/Ho_Chi_Minh');
  perform pg_temp.tz_assert(before_row->'schedule_timezone'='null'::jsonb,'legacy null');
  perform pg_temp.tz_assert(public.get_saved_trip_detail(id)->'timezone'=
    '{"timezone":null,"provenance":null,"confirmedAt":null}'::jsonb,'legacy detail tuple');
  result := public.set_trip_timezone(c);
  perform pg_temp.tz_assert(result->>'timezone'='Asia/Ho_Chi_Minh' and result->>'provenance'='USER_CONFIRMED'
    and (result->>'revision')::integer=r+1 and (result->>'confirmedAt')::timestamptz>=transaction_timestamp(),'owner valid set and server stamp');
  perform pg_temp.tz_assert(public.get_saved_trip_detail(id)->'timezone' = result-'tripId'-'revision','read back');
  perform pg_temp.tz_assert(public.read_trip_progress(jsonb_build_object('tripId',id,'kind','state'))->'timezone'
    = result-'tripId'-'revision','progress read back');
  raise notice 'TIMEZONE_RUNTIME_OWNER_SET_READBACK=%',result;
  select to_jsonb(t) into before_row from public.trips t where t.id=id;
  begin perform public.set_trip_timezone(c || '{"timezone":null}'); raise exception 'Stale accepted';
  exception when sqlstate 'TW009' then null; end;
  perform pg_temp.tz_assert((select to_jsonb(t)=before_row from public.trips t where t.id=id),'stale zero side effects');
  raise notice 'TIMEZONE_RUNTIME_STALE_CAS_REJECTED=TW009';
  r:=r+1; c:=c || jsonb_build_object('expectedRevision',r);
  perform pg_temp.tz_assert(public.set_trip_timezone(c)=result,'same zone no-op');
  foreach bad in array array['',' ','PST','EST','UTC','GMT','+07:00','UTC+7','Etc/GMT-7','EST5EDT',
    'posix/Asia/Tokyo','Asia/Unknown','asia/tokyo','Asia/Tokyo ','Asia/Tokyo'||chr(10),repeat('A',2000)] loop
    begin perform public.set_trip_timezone(c || jsonb_build_object('timezone',bad)); raise exception 'Invalid accepted: %',bad;
    exception when sqlstate 'TW007' then null; end;
  end loop;
  foreach extra in array array['{"provenance":"USER_CONFIRMED"}'::jsonb,'{"confirmedAt":"2028-01-01T00:00:00Z"}',
    '{"ownerId":"forged"}','{"timezone":42}','{"expectedRevision":null}','{"expectedRevision":2147483648}',
    '{"expectedRevision":1.5}','{"tripId":"bad"}'] loop
    begin perform public.set_trip_timezone(c || extra); raise exception 'Invalid envelope accepted';
    exception when sqlstate 'TW007' then null; end;
  end loop;
  begin perform public.set_trip_timezone(c-'timezone'); raise exception 'Omitted clear accepted';
  exception when sqlstate 'TW007' then null; end;
  begin update public.trips set timezone_confirmed_at=now() where public.trips.id=id; raise exception 'Raw timestamp accepted';
  exception when sqlstate 'TW013' then null; end;
  begin update public.trips set timezone_provenance='GOOGLE' where public.trips.id=id; raise exception 'Raw provenance accepted';
  exception when sqlstate 'TW013' then null; end;
  begin update public.trips set schedule_timezone='Europe/London' where public.trips.id=id; raise exception 'Raw timezone accepted';
  exception when sqlstate 'TW013' then null; end;
  begin
    insert into public.trips(user_id,title,destination,start_date,end_date,schedule_timezone,timezone_provenance,timezone_confirmed_at)
    values('11111111-1111-4111-8111-111111111111','Forged','Country','2028-01-01','2028-01-01','Asia/Tokyo','USER_CONFIRMED',now());
    raise exception 'Raw insert accepted';
  exception when sqlstate 'TW013' then null; end;
  perform pg_temp.tz_assert((select to_jsonb(t)=before_row from public.trips t where t.id=id),'invalid zero side effects');
  result:=public.set_trip_timezone(c || '{"timezone":"America/New_York"}');
  perform pg_temp.tz_assert((result->>'revision')::integer=r+1 and result->>'timezone'='America/New_York','DST zone');
  r:=r+1;
  result:=public.set_trip_timezone(c || jsonb_build_object('expectedRevision',r,'timezone',null));
  perform pg_temp.tz_assert(result-'tripId'-'revision'='{"timezone":null,"provenance":null,"confirmedAt":null}'::jsonb
    and (result->>'revision')::integer=r+1,'clear tuple and revision');
  raise notice 'TIMEZONE_RUNTIME_CLEAR=%',result;
  r:=r+1;
  result:=public.set_trip_timezone(c || jsonb_build_object('expectedRevision',r,'timezone','Europe/Paris'));
  r:=r+1;
  -- Guard invariant for the first future destination-edit flow; no app feature is invented.
  update public.trips set destination='New destination' where public.trips.id=id;
  perform pg_temp.tz_assert((select schedule_timezone is null and timezone_provenance is null
    and timezone_confirmed_at is null and workspace_revision=r+1 from public.trips t where t.id=id),'destination invalidation');
  perform pg_temp.tz_assert((select count(*)=0 from public.trip_progress_events where trip_id=id),'no lifecycle events');
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
  begin perform public.set_trip_timezone('{"tripId":"77000000-0000-4000-8000-000000000001","expectedRevision":1,"timezone":"Asia/Tokyo"}');
    raise exception 'Foreign accepted'; exception when sqlstate 'TW008' then null; end;
  perform pg_temp.tz_assert(public.get_saved_trip_detail('77000000-0000-4000-8000-000000000001') is null,'foreign read');
  raise notice 'TIMEZONE_RUNTIME_FOREIGN_DENIED=TW008';
end $$;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
  begin perform public.set_trip_timezone('{}'); raise exception 'Missing auth accepted';
  exception when sqlstate 'TW006' then null; end;
end $$;
set local role anon;
do $$ begin
  begin perform public.set_trip_timezone('{}'); raise exception 'Anonymous accepted';
  exception when insufficient_privilege then null; end;
  begin perform tripwise_private.set_trip_timezone('{}'); raise exception 'Private anonymous accepted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  begin update public.trips set schedule_timezone='Asia/Tokyo' where id='77000000-0000-4000-8000-000000000001';
    raise exception 'Partial tuple accepted'; exception when check_violation then null; end;
  begin update public.trips set schedule_timezone='Asia/Unknown',timezone_provenance='USER_CONFIRMED',timezone_confirmed_at=now()
    where id='77000000-0000-4000-8000-000000000001';
    raise exception 'Unknown catalog accepted'; exception when check_violation then null; end;
  perform pg_temp.tz_assert(not has_function_privilege('anon','public.set_trip_timezone(jsonb)','EXECUTE'),'anon grant');
end $$;
select 'TRIP_TIMEZONE_CONTRACT_PASS' as result;
rollback;
