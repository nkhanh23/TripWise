do $$ begin
  if exists(select 1 from public.trip_progress_events where trip_id='77000000-0000-4000-8000-000000000001')
    or exists(select 1 from auth.progress_legacy_timestamps old join public.itinerary_items i using(id)
      where (old.completed_at,old.skipped_at) is distinct from (i.completed_at,i.skipped_at)) then
    raise exception 'Legacy facts fabricated or modified';
  end if;
end $$;
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$ declare s jsonb; begin
  s := public.read_trip_progress('{"tripId":"77000000-0000-4000-8000-000000000001","kind":"state"}');
  if s->'days'->0->>'completed'<>'1' or s->'days'->0->>'skipped'<>'1' then raise exception 'Legacy projection lost facts'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',false);
select 'trip_progress_legacy_no_backfill_pass' as result;
