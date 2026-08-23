-- BE-P6: compact owner-scoped saved-trip query and mutation contracts.
create index trips_user_created_id_idx
  on public.trips (user_id, created_at desc, id desc);

create function public.list_saved_trips(
  p_limit integer default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_items jsonb;
  v_has_more boolean;
  v_last_created_at timestamptz;
  v_last_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_limit is null or p_limit not between 1 and 50
     or ((p_cursor_created_at is null) <> (p_cursor_id is null)) then
    raise exception 'Saved-trip pagination input is invalid.' using errcode = '22023';
  end if;

  with page_rows as materialized (
    select
      trip.id,
      trip.title,
      trip.destination,
      trip.start_date,
      trip.end_date,
      trip.estimated_budget,
      trip.currency,
      trip.created_at,
      count(distinct day.id)::integer as day_count,
      count(item.id)::integer as item_count,
      row_number() over (order by trip.created_at desc, trip.id desc) as row_number
    from public.trips as trip
    left join public.itinerary_days as day on day.trip_id = trip.id
    left join public.itinerary_items as item on item.itinerary_day_id = day.id
    where trip.user_id = v_user_id
      and (
        p_cursor_created_at is null
        or (trip.created_at, trip.id) < (p_cursor_created_at, p_cursor_id)
      )
    group by trip.id
    order by trip.created_at desc, trip.id desc
    limit p_limit + 1
  ), visible_rows as (
    select * from page_rows where row_number <= p_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'id', row.id,
      'title', row.title,
      'destination', row.destination,
      'startDate', row.start_date,
      'endDate', row.end_date,
      'estimatedBudget', row.estimated_budget,
      'currency', btrim(row.currency),
      'createdAt', row.created_at,
      'dayCount', row.day_count,
      'itemCount', row.item_count
    ) order by row.created_at desc, row.id desc), '[]'::jsonb),
    exists(select 1 from page_rows where row_number = p_limit + 1),
    (array_agg(row.created_at order by row.created_at desc, row.id desc))[p_limit],
    (array_agg(row.id order by row.created_at desc, row.id desc))[p_limit]
  into v_items, v_has_more, v_last_created_at, v_last_id
  from visible_rows as row;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', case when v_has_more then jsonb_build_object(
      'createdAt', v_last_created_at,
      'id', v_last_id
    ) else null end
  );
end;
$$;

comment on function public.list_saved_trips(integer, timestamptz, uuid) is
  'Owner-derived, keyset-paginated compact saved-trip list ordered by created_at DESC, id DESC. Internal idempotency metadata is never returned.';

create function public.get_saved_trip_detail(p_trip_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with owned_trip as (
    select trip.*
    from public.trips as trip
    where trip.id = p_trip_id
      and trip.user_id = (select auth.uid())
  ), item_groups as (
    select
      item.itinerary_day_id,
      jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', item.id,
        'position', item.position,
        'placeName', item.place_name,
        'placeQuery', item.place_query,
        'resolution', case when item.place_resolved_at is null then 'UNRESOLVED' else 'VERIFIED' end,
        'googlePlaceId', case when item.place_resolved_at is not null then item.google_place_id end,
        'latitude', case when item.place_resolved_at is not null then item.latitude end,
        'longitude', case when item.place_resolved_at is not null then item.longitude end,
        'placeAddress', case when item.place_resolved_at is not null then item.place_address end,
        'placeCategory', case when item.place_resolved_at is not null then item.place_category end,
        'placeResolvedAt', item.place_resolved_at,
        'startTime', to_char(item.start_time, 'HH24:MI'),
        'endTime', to_char(item.end_time, 'HH24:MI'),
        'note', item.note
      )) order by item.position) as items
    from public.itinerary_items as item
    join public.itinerary_days as day on day.id = item.itinerary_day_id
    join owned_trip as trip on trip.id = day.trip_id
    group by item.itinerary_day_id
  ), day_graph as (
    select
      day.trip_id,
      jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', day.id,
        'dayNumber', day.day_number,
        'date', day.date,
        'summary', day.summary,
        'items', coalesce(item_group.items, '[]'::jsonb)
      )) order by day.day_number) as days
    from public.itinerary_days as day
    join owned_trip as trip on trip.id = day.trip_id
    left join item_groups as item_group on item_group.itinerary_day_id = day.id
    group by day.trip_id
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'id', trip.id,
    'title', trip.title,
    'destination', trip.destination,
    'startDate', trip.start_date,
    'endDate', trip.end_date,
    'estimatedBudget', trip.estimated_budget,
    'currency', btrim(trip.currency),
    'createdAt', trip.created_at,
    'updatedAt', trip.updated_at,
    'days', coalesce(day_graph.days, '[]'::jsonb)
  ))
  from owned_trip as trip
  left join day_graph on day_graph.trip_id = trip.id;
$$;

comment on function public.get_saved_trip_detail(uuid) is
  'Compact owner-scoped trip/day/item graph in one SQL statement. Provider fields are emitted only when protected place_resolved_at provenance exists.';

create function public.update_itinerary_item_note(p_item_id uuid, p_note text)
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

comment on function public.update_itinerary_item_note(uuid, text) is
  'Owner-scoped note-only mutation. It cannot mutate provider-owned snapshot fields.';

create function public.delete_saved_trip(p_trip_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '28000';
  end if;
  if p_trip_id is null then
    raise exception 'Trip ID is required.' using errcode = '22023';
  end if;

  delete from public.trips
  where id = p_trip_id
    and user_id = (select auth.uid());
  return found;
end;
$$;

comment on function public.delete_saved_trip(uuid) is
  'Owner-scoped idempotent delete. Returns true once; false for missing, repeated, or cross-owner deletion. Child rows cascade.';

revoke all on function public.list_saved_trips(integer, timestamptz, uuid) from public, anon;
revoke all on function public.get_saved_trip_detail(uuid) from public, anon;
revoke all on function public.update_itinerary_item_note(uuid, text) from public, anon;
revoke all on function public.delete_saved_trip(uuid) from public, anon;

grant execute on function public.list_saved_trips(integer, timestamptz, uuid) to authenticated;
grant execute on function public.get_saved_trip_detail(uuid) to authenticated;
grant execute on function public.update_itinerary_item_note(uuid, text) to authenticated;
grant execute on function public.delete_saved_trip(uuid) to authenticated;
