-- FEATURE-P1-T004 corrective: committed workspace ordering is gap-free while
-- still permitting a future atomic reorder/move transaction to use a deferred
-- unique check and a deferred final-state assertion.
-- Historical schemas permitted gaps. Never silently renumber or delete an
-- existing graph during upgrade: fail closed so a reviewed repair can preserve
-- stable IDs and provenance before this invariant is enabled.
do $$
begin
  if exists (
    select 1
    from (
      select day.day_number, row_number() over (partition by day.trip_id order by day.day_number) as expected_number
      from public.itinerary_days as day
    ) as numbered
    where numbered.day_number <> numbered.expected_number
  ) or exists (
    select 1
    from (
      select item.position, row_number() over (partition by item.itinerary_day_id order by item.position) as expected_position
      from public.itinerary_items as item
    ) as numbered
    where numbered.position <> numbered.expected_position
  ) then
    raise exception 'Workspace ordering contains a gap; repair it before applying the contiguous-ordering invariant.' using errcode = '23514';
  end if;
end;
$$;

alter table public.itinerary_days
  drop constraint itinerary_days_trip_day_number_key;
alter table public.itinerary_days
  add constraint itinerary_days_trip_day_number_key
  unique (trip_id, day_number) deferrable initially immediate;

alter table public.itinerary_items
  drop constraint itinerary_items_day_position_key;
alter table public.itinerary_items
  add constraint itinerary_items_day_position_key
  unique (itinerary_day_id, position) deferrable initially immediate;

create function public.enforce_itinerary_day_numbers_contiguous()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_trip record;
  v_new_trip_id uuid;
  v_old_trip_id uuid;
begin
  -- Lock only each affected trip in a stable order. Direct day/item writers
  -- already advance this same trip's workspace_revision, so there is no global
  -- serialization and concurrent writers for one workspace are coordinated.
  if tg_op <> 'DELETE' then v_new_trip_id := new.trip_id; end if;
  if tg_op <> 'INSERT' then v_old_trip_id := old.trip_id; end if;
  for v_trip in
    select trip.id
    from public.trips as trip
    where trip.id = any(array[v_new_trip_id, v_old_trip_id])
    order by trip.id
    for update
  loop
    if exists (
      select 1
      from (
        select day.day_number, row_number() over (order by day.day_number) as expected_number
        from public.itinerary_days as day
        where day.trip_id = v_trip.id
      ) as numbered
      where numbered.day_number <> numbered.expected_number
    ) then
      raise exception 'Itinerary day ordering must remain contiguous.' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;

create function public.enforce_itinerary_item_positions_contiguous()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_day record;
  v_new_day_id uuid;
  v_old_day_id uuid;
begin
  -- Parent trips, rather than every table row, are locked in stable order.
  -- This validates the transaction's final day state and remains compatible
  -- with an atomic future cross-day move.
  if tg_op <> 'DELETE' then v_new_day_id := new.itinerary_day_id; end if;
  if tg_op <> 'INSERT' then v_old_day_id := old.itinerary_day_id; end if;
  for v_day in
    select day.id as day_id
    from public.itinerary_days as day
    join public.trips as trip on trip.id = day.trip_id
    where day.id = any(array[v_new_day_id, v_old_day_id])
    order by trip.id, day.id
    for update of trip
  loop
    if exists (
      select 1
      from (
        select item.position, row_number() over (order by item.position) as expected_position
        from public.itinerary_items as item
        where item.itinerary_day_id = v_day.day_id
      ) as numbered
      where numbered.position <> numbered.expected_position
    ) then
      raise exception 'Itinerary item ordering must remain contiguous.' using errcode = '23514';
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function public.enforce_itinerary_day_numbers_contiguous() from public, anon, authenticated;
revoke all on function public.enforce_itinerary_item_positions_contiguous() from public, anon, authenticated;

create constraint trigger itinerary_days_enforce_contiguous_numbers
after insert or update of trip_id, day_number or delete on public.itinerary_days
deferrable initially deferred
for each row execute function public.enforce_itinerary_day_numbers_contiguous();

create constraint trigger itinerary_items_enforce_contiguous_positions
after insert or update of itinerary_day_id, position or delete on public.itinerary_items
deferrable initially deferred
for each row execute function public.enforce_itinerary_item_positions_contiguous();

comment on function public.enforce_itinerary_day_numbers_contiguous() is
  'T004 deferred final-state invariant: each committed trip has day_number 1..N.';
comment on function public.enforce_itinerary_item_positions_contiguous() is
  'T004 deferred final-state invariant: each committed itinerary day has position 1..N.';
