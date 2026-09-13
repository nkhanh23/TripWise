-- P6-T001: lifecycle remains authoritative. No backfill, notification or clock inference.
create table public.trip_progress_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  item_id uuid not null references public.itinerary_items(id) on delete cascade,
  revision integer not null check (revision > 0),
  idempotency_key text not null,
  from_status text not null,
  to_status text not null,
  occurred_at timestamptz not null check (isfinite(occurred_at)),
  created_at timestamptz not null default clock_timestamp(),
  unique (trip_id, revision),
  check (idempotency_key = item_id::text || ':' || revision::text),
  check ((from_status = 'scheduled' and to_status in ('completed', 'skipped'))
    or (from_status in ('completed', 'skipped') and to_status = 'scheduled'))
);
create index trip_progress_events_item_idx on public.trip_progress_events(item_id);
alter table public.trip_progress_events enable row level security;
revoke all on public.trip_progress_events from public, anon, authenticated;
grant select on public.trip_progress_events to authenticated;
create policy trip_progress_events_owner_read on public.trip_progress_events
  for select to authenticated using (exists (
    select 1 from public.trips t
    where t.id = trip_progress_events.trip_id and t.user_id = (select auth.uid())
  ));

-- Internal sink only. No client EXECUTE and no second writable status machine.
create function tripwise_private.record_trip_progress(
  p_trip uuid, p_item uuid, p_revision integer, p_from text, p_to text, p_at timestamptz
) returns uuid language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_event public.trip_progress_events%rowtype;
begin
  insert into public.trip_progress_events(trip_id,item_id,revision,idempotency_key,from_status,to_status,occurred_at)
  values(p_trip,p_item,p_revision,p_item::text || ':' || p_revision::text,p_from,p_to,p_at)
  on conflict (trip_id,revision) do nothing returning * into v_event;
  if not found then
    select * into strict v_event from public.trip_progress_events where trip_id=p_trip and revision=p_revision;
    if (v_event.item_id,v_event.from_status,v_event.to_status,v_event.occurred_at)
      is distinct from (p_item,p_from,p_to,p_at) then
      raise exception 'Progress identity conflicts with an existing fact.' using errcode='TW023';
    end if;
  end if;
  return v_event.id;
end $$;
revoke all on function tripwise_private.record_trip_progress(uuid,uuid,integer,text,text,timestamptz) from public,anon,authenticated;

create function public.record_itinerary_progress_transition()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_trip uuid; v_revision integer;
begin
  -- AFTER triggers run by name: itinerary_items_bump_workspace_revision already
  -- acquired the trip lock and advanced revision. All writes roll back together.
  select t.id,t.workspace_revision into strict v_trip,v_revision
  from public.itinerary_days d join public.trips t on t.id=d.trip_id
  where d.id=new.itinerary_day_id;
  perform tripwise_private.record_trip_progress(v_trip,new.id,v_revision,old.activity_status,new.activity_status,
    case new.activity_status when 'completed' then new.completed_at
      when 'skipped' then new.skipped_at else clock_timestamp() end);
  return new;
exception when others then
  raise exception 'Progress persistence failed.' using errcode='TW024';
end $$;
revoke all on function public.record_itinerary_progress_transition() from public,anon,authenticated;
create trigger itinerary_items_record_progress_transition
after update on public.itinerary_items for each row
when (old.activity_status is distinct from new.activity_status)
execute function public.record_itinerary_progress_transition();

-- Preserve the installed workspace implementation byte-for-byte except for
-- propagation of the new sink-failure SQLSTATE. Refuse unexpected source drift.
do $migration$
declare v_definition text; v_guard text := '  when sqlstate ''TW014'' then raise;';
begin
  v_definition := pg_get_functiondef('public.mutate_travel_workspace(jsonb)'::regprocedure);
  if (length(v_definition)-length(replace(v_definition,v_guard,''))) <> length(v_guard) then
    raise exception 'Workspace error boundary requires review before progress migration.';
  end if;
  execute replace(v_definition,v_guard,v_guard || E'\n  when sqlstate ''TW024'' then raise;');
end $migration$;

-- Both current counts and bounded history use this validated invoker boundary.
create function public.read_trip_progress(p_request jsonb)
returns jsonb language plpgsql security invoker set search_path = pg_catalog, public as $$
declare v_trip uuid; v_limit integer; v_before integer; v_result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required.' using errcode='TW006'; end if;
  if p_request is null or jsonb_typeof(p_request)<>'object' or octet_length(p_request::text)>1024
    or not (p_request - 'tripId' - 'kind' - 'limit' - 'beforeRevision' = '{}'::jsonb)
    or not (p_request ?& array['tripId','kind'])
    or jsonb_typeof(p_request->'tripId')<>'string' or jsonb_typeof(p_request->'kind')<>'string'
    or p_request->>'tripId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_request->>'kind' not in ('state','events') then
    raise exception 'Progress request is invalid.' using errcode='TW022';
  end if;
  v_trip := (p_request->>'tripId')::uuid;
  if not exists(select 1 from public.trips where id=v_trip and user_id=(select auth.uid())) then
    raise exception 'Progress resource was not found.' using errcode='TW008';
  end if;
  if p_request->>'kind'='state' then
    if p_request ?| array['limit','beforeRevision'] then raise exception 'Progress request is invalid.' using errcode='TW022'; end if;
    -- One statement snapshot; zero history reads. Empty days/trips are factual zero.
    select jsonb_build_object('tripId',t.id,'revision',t.workspace_revision,
      'days',coalesce((select jsonb_agg(jsonb_build_object('dayId',counts.id,
        'scheduled',counts.scheduled,'completed',counts.completed,'skipped',counts.skipped) order by counts.id)
        from (select d.id,
          count(*) filter(where i.activity_status='scheduled') as scheduled,
          count(*) filter(where i.activity_status='completed') as completed,
          count(*) filter(where i.activity_status='skipped') as skipped
          from public.itinerary_days d left join public.itinerary_items i on i.itinerary_day_id=d.id
          where d.trip_id=t.id group by d.id) counts),'[]'::jsonb)) into v_result
    from public.trips t where t.id=v_trip;
  else
    if (p_request ? 'limit' and (jsonb_typeof(p_request->'limit')<>'number' or p_request->>'limit' !~ '^[1-9][0-9]?$'))
      or (p_request ? 'beforeRevision' and (jsonb_typeof(p_request->'beforeRevision')<>'number' or p_request->>'beforeRevision' !~ '^[1-9][0-9]{0,9}$')) then
      raise exception 'Progress request is invalid.' using errcode='TW022';
    end if;
    v_limit := coalesce((p_request->>'limit')::integer,25);
    v_before := (p_request->>'beforeRevision')::integer;
    if v_limit>50 then raise exception 'Progress request is invalid.' using errcode='TW022'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'tripId',e.trip_id,'itemId',e.item_id,
      'revision',e.revision,'idempotencyKey',e.idempotency_key,'fromStatus',e.from_status,
      'toStatus',e.to_status,'occurredAt',e.occurred_at) order by e.revision desc),'[]'::jsonb)
    into v_result from (select * from public.trip_progress_events where trip_id=v_trip
      and (v_before is null or revision<v_before) order by revision desc limit v_limit+1) e;
  end if;
  return v_result;
exception
  when sqlstate 'TW006' or sqlstate 'TW008' or sqlstate 'TW022' then raise;
  when data_exception then raise exception 'Progress request is invalid.' using errcode='TW022';
  when others then raise exception 'Progress read failed.' using errcode='TW024';
end $$;
revoke all on function public.read_trip_progress(jsonb) from public,anon,authenticated;
grant execute on function public.read_trip_progress(jsonb) to authenticated;
comment on table public.trip_progress_events is
  'Explicit lifecycle transitions only, atomically recorded after server revision. No historical backfill. Reversals append. Explicit item/trip/account deletion cascades; time-based retention remains future policy.';
