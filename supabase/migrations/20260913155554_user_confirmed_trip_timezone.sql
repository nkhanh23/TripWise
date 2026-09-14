-- Explicit owner schedule authority only. No geographic/provider assertion.
create function public.is_supported_trip_timezone(p_timezone text)
returns boolean language sql stable strict set search_path = pg_catalog as $$
  select length(p_timezone) between 3 and 100
    and p_timezone ~ '^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific)/[A-Za-z_]+([-][A-Za-z_]+)*(/[A-Za-z_]+([-][A-Za-z_]+)*)?$'
    and exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone);
$$;
revoke all on function public.is_supported_trip_timezone(text) from public, anon, authenticated;
grant execute on function public.is_supported_trip_timezone(text) to authenticated, service_role;

alter table public.trips
  add column schedule_timezone text,
  add column timezone_provenance text,
  add column timezone_confirmed_at timestamptz,
  add constraint trips_timezone_tuple_check check (
    (schedule_timezone is null and timezone_provenance is null and timezone_confirmed_at is null)
    or (schedule_timezone is not null and timezone_provenance is not null
      and timezone_provenance = 'USER_CONFIRMED' and timezone_confirmed_at is not null
      and isfinite(timezone_confirmed_at) and public.is_supported_trip_timezone(schedule_timezone))
  );

-- Existing raw trip writes must not bypass CAS or manufacture confirmation.
-- This invoker trigger sees the private mutation's definer role, not a spoofable GUC.
create function public.guard_trip_timezone()
returns trigger language plpgsql security invoker set search_path = pg_catalog as $$
begin
  if current_user in ('authenticated', 'anon') then
    if (tg_op = 'INSERT' and num_nonnulls(new.schedule_timezone,new.timezone_provenance,new.timezone_confirmed_at)>0)
      or (tg_op = 'UPDATE' and
        (new.schedule_timezone,new.timezone_provenance,new.timezone_confirmed_at)
          is distinct from (old.schedule_timezone,old.timezone_provenance,old.timezone_confirmed_at)) then
      raise exception 'Timezone confirmation requires the owner mutation.' using errcode='TW013';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.destination is distinct from old.destination then
    new.schedule_timezone := null;
    new.timezone_provenance := null;
    new.timezone_confirmed_at := null;
  end if;
  return new;
end $$;
revoke all on function public.guard_trip_timezone() from public,anon,authenticated;
create trigger trips_guard_timezone before insert or update on public.trips
for each row execute function public.guard_trip_timezone();

create function tripwise_private.set_trip_timezone(p_command jsonb)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  v_owner uuid := (select auth.uid());
  v_trip public.trips%rowtype;
  v_id uuid;
  v_revision integer;
  v_timezone text;
begin
  if v_owner is null then raise exception 'Authentication required.' using errcode='TW006'; end if;
  if p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>1024
    or not (p_command - 'tripId' - 'expectedRevision' - 'timezone' = '{}'::jsonb)
    or not (p_command ?& array['tripId','expectedRevision','timezone'])
    or jsonb_typeof(p_command->'tripId')<>'string'
    or p_command->>'tripId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or jsonb_typeof(p_command->'expectedRevision')<>'number'
    or p_command->>'expectedRevision' !~ '^[1-9][0-9]{0,9}$'
    or jsonb_typeof(p_command->'timezone') not in ('string','null') then
    raise exception 'Timezone command is invalid.' using errcode='TW007';
  end if;
  v_id := (p_command->>'tripId')::uuid;
  v_revision := (p_command->>'expectedRevision')::integer;
  v_timezone := p_command->>'timezone';
  if v_timezone is not null and not public.is_supported_trip_timezone(v_timezone) then
    raise exception 'Timezone command is invalid.' using errcode='TW007';
  end if;
  -- No child locks: this operation changes only the canonical trip row.
  select * into v_trip from public.trips where id=v_id and user_id=v_owner for update;
  if not found then raise exception 'Trip not found.' using errcode='TW008'; end if;
  if v_trip.workspace_revision <> v_revision then
    raise exception 'Workspace revision conflict.' using errcode='TW009';
  end if;
  if v_trip.schedule_timezone is distinct from v_timezone then
    update public.trips set schedule_timezone=v_timezone,
      timezone_provenance=case when v_timezone is not null then 'USER_CONFIRMED' end,
      timezone_confirmed_at=case when v_timezone is not null then clock_timestamp() end
    where id=v_id and user_id=v_owner returning * into v_trip;
  end if;
  return jsonb_build_object('tripId',v_trip.id,'revision',v_trip.workspace_revision,
    'timezone',v_trip.schedule_timezone,'provenance',v_trip.timezone_provenance,
    'confirmedAt',v_trip.timezone_confirmed_at);
exception
  when sqlstate 'TW006' or sqlstate 'TW007' or sqlstate 'TW008' or sqlstate 'TW009' then raise;
  when data_exception then raise exception 'Timezone command is invalid.' using errcode='TW007';
  when others then raise exception 'Timezone mutation failed.' using errcode='TW010';
end $$;
revoke all on function tripwise_private.set_trip_timezone(jsonb) from public,anon,authenticated;
grant execute on function tripwise_private.set_trip_timezone(jsonb) to authenticated;

create function public.set_trip_timezone(p_command jsonb)
returns jsonb language sql security invoker set search_path = pg_catalog as $$
  select tripwise_private.set_trip_timezone(p_command);
$$;
revoke all on function public.set_trip_timezone(jsonb) from public,anon,authenticated;
grant execute on function public.set_trip_timezone(jsonb) to authenticated;

comment on column public.trips.schedule_timezone is
  'One owner-confirmed IANA schedule timezone, not provider/geographic truth. NULL until explicit saved-trip confirmation. Destination change clears the tuple.';

-- FEATURE-P2-T004: expose the already-persisted workspace metadata through the
-- owner-scoped detail read. Mutation/RLS/CAS contracts remain unchanged.

create or replace function public.get_saved_trip_detail(p_trip_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with owned_trip as (
    select trip.* from public.trips as trip
    where trip.id = p_trip_id and trip.user_id = (select auth.uid())
  ), source_link_groups as (
    select link.itinerary_item_id,
      jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'type', link.link_type, 'url', link.url, 'label', link.label
      )) order by link.position) as links
    from public.itinerary_item_source_links as link
    join public.itinerary_items as source_item on source_item.id = link.itinerary_item_id
    join public.itinerary_days as source_day on source_day.id = source_item.itinerary_day_id
    join owned_trip as source_trip on source_trip.id = source_day.trip_id
    group by link.itinerary_item_id
  ), item_groups as (
    select item.itinerary_day_id,
      jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', item.id, 'position', item.position, 'itemKind', item.item_kind,
        'flexibility', item.flexibility, 'priority', item.priority, 'activityStatus', item.activity_status,
        'placeName', item.place_name, 'placeQuery', item.place_query,
        'resolution', case when item.place_resolved_at is null then 'UNRESOLVED' else 'VERIFIED' end,
        'googlePlaceId', case when item.place_resolved_at is not null then item.google_place_id end,
        'latitude', case when item.place_resolved_at is not null then item.latitude end,
        'longitude', case when item.place_resolved_at is not null then item.longitude end,
        'placeAddress', case when item.place_resolved_at is not null then item.place_address end,
        'placeCategory', case when item.place_resolved_at is not null then item.place_category end,
        'placeResolvedAt', item.place_resolved_at,
        'startTime', to_char(item.start_time, 'HH24:MI'), 'endTime', to_char(item.end_time, 'HH24:MI'), 'note', item.note,
        'contact', case when num_nonnulls(item.contact_name, item.contact_phone, item.contact_address,
          item.contact_website_url, item.contact_booking_url, item.reservation_code) > 0 then
          jsonb_strip_nulls(jsonb_build_object(
            'name', item.contact_name, 'phone', item.contact_phone, 'address', item.contact_address,
            'websiteUrl', item.contact_website_url, 'bookingUrl', item.contact_booking_url,
            'reservationCode', item.reservation_code)) end,
        'transport', case when item.item_kind = 'transport' then
          jsonb_strip_nulls(jsonb_build_object(
            'mode', item.transport_mode, 'originLabel', item.transport_origin_label,
            'destinationLabel', item.transport_destination_label, 'operatorName', item.transport_operator_name,
            'departureAt', item.transport_departure_at, 'arrivalAt', item.transport_arrival_at,
            'plannedCostAmount', item.transport_planned_cost_amount,
            'plannedCostCurrency', btrim(item.transport_planned_cost_currency))) end,
        'accommodation', case when item.item_kind = 'accommodation' then
          jsonb_strip_nulls(jsonb_build_object(
            'checkInAt', item.accommodation_check_in_at, 'checkOutAt', item.accommodation_check_out_at,
            'nights', item.accommodation_nights)) end,
        'sourceLinks', coalesce(source_links.links, '[]'::jsonb)
      )) order by item.position) as items
    from public.itinerary_items as item
    join public.itinerary_days as day on day.id = item.itinerary_day_id
    join owned_trip as trip on trip.id = day.trip_id
    left join source_link_groups as source_links on source_links.itinerary_item_id = item.id
    group by item.itinerary_day_id
  ), day_graph as (
    select day.trip_id, jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', day.id, 'dayNumber', day.day_number, 'date', day.date, 'summary', day.summary,
      'items', coalesce(item_group.items, '[]'::jsonb)
    )) order by day.day_number) as days
    from public.itinerary_days as day join owned_trip as trip on trip.id = day.trip_id
    left join item_groups as item_group on item_group.itinerary_day_id = day.id
    group by day.trip_id
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'id', trip.id, 'title', trip.title, 'destination', trip.destination,
    'startDate', trip.start_date, 'endDate', trip.end_date, 'estimatedBudget', trip.estimated_budget,
    'currency', btrim(trip.currency), 'createdAt', trip.created_at, 'updatedAt', trip.updated_at,
    'workspaceRevision', trip.workspace_revision, 'days', coalesce(day_graph.days, '[]'::jsonb)
  )) || jsonb_build_object('timezone',jsonb_build_object('timezone',trip.schedule_timezone,
    'provenance',trip.timezone_provenance,'confirmedAt',trip.timezone_confirmed_at))
  from owned_trip as trip left join day_graph on day_graph.trip_id = trip.id;
$$;

comment on function public.get_saved_trip_detail(uuid) is
  'FEATURE-P2-T004 SECURITY INVOKER owner-scoped saved-trip detail including contact, transport, accommodation, and ordered source-link metadata.';

create or replace function public.read_trip_progress(p_request jsonb)
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
      'timezone',jsonb_build_object('timezone',t.schedule_timezone,'provenance',t.timezone_provenance,'confirmedAt',t.timezone_confirmed_at),
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
