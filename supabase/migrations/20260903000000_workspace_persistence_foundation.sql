-- FEATURE-P1-T002: additive, forward-only persistence foundation for the
-- live editable workspace. Existing graph/read contracts remain unchanged.

alter table public.trips
  add column workspace_revision integer not null default 1,
  add constraint trips_workspace_revision_check check (workspace_revision > 0);

create function public.increment_trip_workspace_revision()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  -- New trips always begin at the canonical server-controlled revision.
  -- Never accept a client-selected initial or subsequent revision. T003 must
  -- compare an expected revision in its owner-scoped transaction.
  if tg_op = 'INSERT' then
    new.workspace_revision := 1;
    return new;
  end if;

  new.workspace_revision := old.workspace_revision + 1;
  return new;
end;
$$;

revoke all on function public.increment_trip_workspace_revision() from public, anon, authenticated;

create trigger trips_increment_workspace_revision
before insert or update on public.trips
for each row execute function public.increment_trip_workspace_revision();

alter table public.itinerary_items
  add column item_kind text not null default 'place',
  add column flexibility text not null default 'fixed',
  add column priority text not null default 'must_do',
  add column activity_status text not null default 'scheduled',
  add column completed_at timestamptz,
  add column skipped_at timestamptz,
  add column contact_name text,
  add column contact_phone text,
  add column contact_address text,
  add column contact_website_url text,
  add column contact_booking_url text,
  add column reservation_code text,
  add column transport_mode text,
  add column transport_origin_label text,
  add column transport_destination_label text,
  add column transport_operator_name text,
  add column transport_departure_at timestamptz,
  add column transport_arrival_at timestamptz,
  add column transport_planned_cost_amount numeric(12, 2),
  add column transport_planned_cost_currency char(3),
  add column accommodation_details_present boolean not null default false,
  add column accommodation_check_in_at timestamptz,
  add column accommodation_check_out_at timestamptz,
  add column accommodation_nights integer;

alter table public.itinerary_items add constraint itinerary_items_kind_check
  check (item_kind in ('place', 'custom_activity', 'restaurant', 'transport', 'accommodation', 'reservation', 'note'));
alter table public.itinerary_items add constraint itinerary_items_flexibility_check
  check (flexibility in ('fixed', 'flexible'));
alter table public.itinerary_items add constraint itinerary_items_priority_check
  check (priority in ('must_do', 'want_to_do', 'optional'));
alter table public.itinerary_items add constraint itinerary_items_activity_status_check
  check (activity_status in ('scheduled', 'completed', 'skipped'));
alter table public.itinerary_items add constraint itinerary_items_activity_status_timestamp_check
  check (
    (activity_status = 'scheduled' and completed_at is null and skipped_at is null)
    or (activity_status = 'completed' and completed_at is not null and skipped_at is null)
    or (activity_status = 'skipped' and skipped_at is not null and completed_at is null)
  );
alter table public.itinerary_items add constraint itinerary_items_place_like_provider_fields_check
  check (
    item_kind in ('place', 'restaurant', 'accommodation')
    or (
      google_place_id is null and latitude is null and longitude is null
      and place_address is null and place_category is null and place_resolved_at is null
    )
  );
alter table public.itinerary_items add constraint itinerary_items_place_query_kind_check
  check (place_query is null or item_kind in ('place', 'restaurant', 'accommodation'));
alter table public.itinerary_items add constraint itinerary_items_note_schedule_check
  check (item_kind <> 'note' or (start_time is null and end_time is null));
alter table public.itinerary_items add constraint itinerary_items_transport_details_check
  check (
    (item_kind = 'transport'
      and transport_mode in ('walk', 'drive', 'transit', 'bus', 'train', 'flight', 'motorbike', 'ferry', 'other')
      and start_time is null and end_time is null)
    or
    (item_kind <> 'transport'
      and transport_mode is null and transport_origin_label is null
      and transport_destination_label is null and transport_operator_name is null
      and transport_departure_at is null and transport_arrival_at is null
      and transport_planned_cost_amount is null and transport_planned_cost_currency is null)
  );
alter table public.itinerary_items add constraint itinerary_items_transport_timestamp_check
  check (
    num_nonnulls(transport_departure_at, transport_arrival_at) in (0, 2)
    and (transport_arrival_at is null or transport_arrival_at >= transport_departure_at)
  );
alter table public.itinerary_items add constraint itinerary_items_transport_text_bounds_check
  check (
    (transport_origin_label is null or length(btrim(transport_origin_label)) between 1 and 160)
    and (transport_destination_label is null or length(btrim(transport_destination_label)) between 1 and 160)
    and (transport_operator_name is null or length(btrim(transport_operator_name)) between 1 and 160)
  );
alter table public.itinerary_items add constraint itinerary_items_transport_planned_cost_check
  check (
    (transport_planned_cost_amount is null and transport_planned_cost_currency is null)
    or (transport_planned_cost_amount is not null and transport_planned_cost_amount >= 0 and transport_planned_cost_currency ~ '^[A-Z]{3}$')
  );
alter table public.itinerary_items add constraint itinerary_items_accommodation_details_check
  check (
    (item_kind = 'accommodation' and accommodation_details_present)
    or (item_kind <> 'accommodation' and not accommodation_details_present
      and accommodation_check_in_at is null and accommodation_check_out_at is null and accommodation_nights is null)
  );
alter table public.itinerary_items add constraint itinerary_items_accommodation_timestamp_check
  check (
    num_nonnulls(accommodation_check_in_at, accommodation_check_out_at) in (0, 2)
    and (accommodation_check_out_at is null or accommodation_check_out_at > accommodation_check_in_at)
  );
alter table public.itinerary_items add constraint itinerary_items_accommodation_nights_check
  check (
    accommodation_nights is null
    or (accommodation_nights between 0 and 365
      and accommodation_check_in_at is not null and accommodation_check_out_at is not null
      and accommodation_nights = (
        (accommodation_check_out_at at time zone 'UTC')::date
        - (accommodation_check_in_at at time zone 'UTC')::date
      ))
  );
alter table public.itinerary_items add constraint itinerary_items_contact_bounds_check
  check (
    (contact_name is null or length(btrim(contact_name)) between 1 and 120)
    and (contact_phone is null or (length(btrim(contact_phone)) between 1 and 64 and btrim(contact_phone) ~ '^[+0-9 ()\.-]+$'))
    and (contact_address is null or length(btrim(contact_address)) between 1 and 500)
    and (contact_website_url is null or (length(contact_website_url) <= 2048 and contact_website_url ~ '^https://[^[:space:]]+$'))
    and (contact_booking_url is null or (length(contact_booking_url) <= 2048 and contact_booking_url ~ '^https://[^[:space:]]+$'))
    and (reservation_code is null or length(btrim(reservation_code)) between 1 and 128)
  );

create table public.itinerary_item_source_links (
  id uuid primary key default gen_random_uuid(),
  itinerary_item_id uuid not null references public.itinerary_items (id) on delete cascade,
  link_type text not null check (link_type in ('google_maps', 'facebook', 'instagram', 'tiktok', 'website', 'booking', 'other')),
  url text not null check (length(url) <= 2048 and url ~ '^https://[^[:space:]]+$'),
  label text,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  constraint itinerary_item_source_links_label_check check (label is null or length(btrim(label)) between 1 and 120),
  constraint itinerary_item_source_links_other_label_check check (link_type <> 'other' or label is not null),
  constraint itinerary_item_source_links_item_position_key unique (itinerary_item_id, position)
);

create index itinerary_item_source_links_item_id_idx
  on public.itinerary_item_source_links (itinerary_item_id, position);

create function public.enforce_itinerary_item_source_link_limit()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  -- Serialize only writers for the same parent item. This prevents two
  -- concurrent 12th-link inserts from both observing a count of 11.
  if tg_op = 'INSERT' then
    perform 1
    from public.itinerary_items as item
    where item.id = new.itinerary_item_id
    for update;
  else
    perform 1
    from public.itinerary_items as item
    where item.id in (new.itinerary_item_id, old.itinerary_item_id)
    order by item.id
    for update;
  end if;

  if (
    select count(*)
    from public.itinerary_item_source_links as link
    where link.itinerary_item_id = new.itinerary_item_id
      and (tg_op = 'INSERT' or link.id <> new.id)
  ) >= 12 then
    raise exception 'An itinerary item may have at most 12 source links.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_itinerary_item_source_link_limit() from public, anon, authenticated;

create trigger itinerary_item_source_links_enforce_limit
before insert or update of itinerary_item_id on public.itinerary_item_source_links
for each row execute function public.enforce_itinerary_item_source_link_limit();

create function public.enforce_itinerary_item_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  -- Every newly persisted item begins scheduled. Historical rows already
  -- received the additive defaults before this trigger is installed.
  if tg_op = 'INSERT' then
    if new.activity_status <> 'scheduled'
       or new.completed_at is not null
       or new.skipped_at is not null then
      raise exception 'A new itinerary activity must begin scheduled.' using errcode = '22023';
    end if;
    return new;
  end if;

  if new.activity_status is distinct from old.activity_status then
    if old.activity_status = 'scheduled' and new.activity_status = 'completed' then
      new.completed_at := clock_timestamp();
      new.skipped_at := null;
    elsif old.activity_status = 'scheduled' and new.activity_status = 'skipped' then
      new.skipped_at := clock_timestamp();
      new.completed_at := null;
    elsif old.activity_status in ('completed', 'skipped') and new.activity_status = 'scheduled' then
      new.completed_at := null;
      new.skipped_at := null;
    else
      raise exception 'Itinerary activity status transition is invalid.' using errcode = '22023';
    end if;
  elsif new.completed_at is distinct from old.completed_at
     or new.skipped_at is distinct from old.skipped_at then
    -- Lifecycle timestamps are server-owned transition evidence, not editable
    -- client metadata.
    raise exception 'Itinerary activity status transition is invalid.' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_itinerary_item_status_transition() from public, anon, authenticated;

create trigger itinerary_items_enforce_status_transition
before insert or update of activity_status, completed_at, skipped_at on public.itinerary_items
for each row execute function public.enforce_itinerary_item_status_transition();

create function public.bump_workspace_revision_from_day()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    update public.trips set workspace_revision = workspace_revision where id = new.trip_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.trips set workspace_revision = workspace_revision where id = old.trip_id;
    return old;
  end if;

  update public.trips set workspace_revision = workspace_revision where id in (new.trip_id, old.trip_id);
  return new;
end;
$$;

create function public.bump_workspace_revision_from_item()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    from public.itinerary_days as day
    where day.id = new.itinerary_day_id and trip.id = day.trip_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    from public.itinerary_days as day
    where day.id = old.itinerary_day_id and trip.id = day.trip_id;
    return old;
  end if;

  update public.trips as trip
  set workspace_revision = trip.workspace_revision
  where trip.id in (
    select day.trip_id from public.itinerary_days as day
    where day.id in (new.itinerary_day_id, old.itinerary_day_id)
  );
  return new;
end;
$$;

create function public.bump_workspace_revision_from_source_link()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    where trip.id in (
      select day.trip_id
      from public.itinerary_items as item
      join public.itinerary_days as day on day.id = item.itinerary_day_id
      where item.id = new.itinerary_item_id
    );
    return new;
  elsif tg_op = 'DELETE' then
    update public.trips as trip
    set workspace_revision = trip.workspace_revision
    where trip.id in (
      select day.trip_id
      from public.itinerary_items as item
      join public.itinerary_days as day on day.id = item.itinerary_day_id
      where item.id = old.itinerary_item_id
    );
    return old;
  end if;

  update public.trips as trip
  set workspace_revision = trip.workspace_revision
  where trip.id in (
    select day.trip_id
    from public.itinerary_items as item
    join public.itinerary_days as day on day.id = item.itinerary_day_id
    where item.id in (new.itinerary_item_id, old.itinerary_item_id)
  );
  return new;
end;
$$;

revoke all on function public.bump_workspace_revision_from_day() from public, anon, authenticated;
revoke all on function public.bump_workspace_revision_from_item() from public, anon, authenticated;
revoke all on function public.bump_workspace_revision_from_source_link() from public, anon, authenticated;

create trigger itinerary_days_bump_workspace_revision
after insert or update or delete on public.itinerary_days
for each row execute function public.bump_workspace_revision_from_day();

create trigger itinerary_items_bump_workspace_revision
after insert or update or delete on public.itinerary_items
for each row execute function public.bump_workspace_revision_from_item();

create trigger itinerary_item_source_links_bump_workspace_revision
after insert or update or delete on public.itinerary_item_source_links
for each row execute function public.bump_workspace_revision_from_source_link();

alter table public.itinerary_item_source_links enable row level security;

revoke all on public.itinerary_item_source_links from public, anon;
grant select, insert, update, delete on public.itinerary_item_source_links to authenticated;

create policy "itinerary_item_source_links_select_own"
on public.itinerary_item_source_links for select to authenticated
using (exists (
  select 1
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  join public.trips as trip on trip.id = day.trip_id
  where item.id = itinerary_item_source_links.itinerary_item_id
    and trip.user_id = (select auth.uid())
));

create policy "itinerary_item_source_links_insert_own"
on public.itinerary_item_source_links for insert to authenticated
with check (exists (
  select 1
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  join public.trips as trip on trip.id = day.trip_id
  where item.id = itinerary_item_source_links.itinerary_item_id
    and trip.user_id = (select auth.uid())
));

create policy "itinerary_item_source_links_update_own"
on public.itinerary_item_source_links for update to authenticated
using (exists (
  select 1
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  join public.trips as trip on trip.id = day.trip_id
  where item.id = itinerary_item_source_links.itinerary_item_id
    and trip.user_id = (select auth.uid())
))
with check (exists (
  select 1
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  join public.trips as trip on trip.id = day.trip_id
  where item.id = itinerary_item_source_links.itinerary_item_id
    and trip.user_id = (select auth.uid())
));

create policy "itinerary_item_source_links_delete_own"
on public.itinerary_item_source_links for delete to authenticated
using (exists (
  select 1
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  join public.trips as trip on trip.id = day.trip_id
  where item.id = itinerary_item_source_links.itinerary_item_id
    and trip.user_id = (select auth.uid())
));

create or replace function public.update_itinerary_item_note(p_item_id uuid, p_note text)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_item_id is null or (p_note is not null and length(btrim(p_note)) > 500) then
    raise exception 'Itinerary note input is invalid.' using errcode = '22023';
  end if;

  update public.itinerary_items as item
  set note = nullif(btrim(p_note), '')
  from public.itinerary_days as day
  join public.trips as trip on trip.id = day.trip_id
  where item.id = p_item_id
    and item.itinerary_day_id = day.id
    and trip.user_id = (select auth.uid());
  return found;
end;
$$;

comment on column public.trips.workspace_revision is
  'Server-controlled optimistic-concurrency revision. Every trip starts at 1; T003 mutations must compare an expected revision and atomically update this owner-scoped trip row.';

comment on column public.itinerary_items.completed_at is
  'Server-generated timestamp for an explicit scheduled-to-completed transition; clients cannot set or edit it directly.';

comment on column public.itinerary_items.skipped_at is
  'Server-generated timestamp for an explicit scheduled-to-skipped transition; clients cannot set or edit it directly.';

comment on table public.itinerary_item_source_links is
  'Owner-scoped, bounded HTTPS source links. T003 validates URL semantics and field-kind compatibility before persistence.';
