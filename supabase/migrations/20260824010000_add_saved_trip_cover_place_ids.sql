-- Post-integration remediation: expose at most two trusted cover candidates in the compact trip list.
create or replace function public.list_saved_trips(
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

  with limited_trips as materialized (
    select
      trip.id,
      trip.title,
      trip.destination,
      trip.start_date,
      trip.end_date,
      trip.estimated_budget,
      trip.currency,
      trip.created_at
    from public.trips as trip
    where trip.user_id = v_user_id
      and (
        p_cursor_created_at is null
        or (trip.created_at, trip.id) < (p_cursor_created_at, p_cursor_id)
      )
    order by trip.created_at desc, trip.id desc
    limit p_limit + 1
  ), page_rows as materialized (
    select
      trip.*,
      coalesce(stats.day_count, 0) as day_count,
      coalesce(stats.item_count, 0) as item_count,
      coalesce(cover.google_place_ids, '[]'::jsonb) as cover_google_place_ids,
      row_number() over (order by trip.created_at desc, trip.id desc) as row_number
    from limited_trips as trip
    left join lateral (
      select
        count(distinct day.id)::integer as day_count,
        count(item.id)::integer as item_count
      from public.itinerary_days as day
      left join public.itinerary_items as item on item.itinerary_day_id = day.id
      where day.trip_id = trip.id
    ) as stats on true
    left join lateral (
      select jsonb_agg(candidate.google_place_id order by candidate.day_number, candidate.position, candidate.id)
        as google_place_ids
      from (
        select item.id, item.google_place_id, day.day_number, item.position
        from public.itinerary_days as day
        join public.itinerary_items as item on item.itinerary_day_id = day.id
        where day.trip_id = trip.id
          and item.place_resolved_at is not null
          and item.google_place_id is not null
        order by day.day_number, item.position, item.id
        limit 2
      ) as candidate
    ) as cover on true
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
      'itemCount', row.item_count,
      'coverGooglePlaceIds', row.cover_google_place_ids
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
  'Owner-derived, keyset-paginated compact saved-trip list with at most two provenance-verified Google Place cover candidates. Internal idempotency metadata is never returned.';

revoke all on function public.list_saved_trips(integer, timestamptz, uuid) from public, anon;
grant execute on function public.list_saved_trips(integer, timestamptz, uuid) to authenticated;
