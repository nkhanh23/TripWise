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
  )) from owned_trip as trip left join day_graph on day_graph.trip_id = trip.id;
$$;

comment on function public.get_saved_trip_detail(uuid) is
  'FEATURE-P2-T004 SECURITY INVOKER owner-scoped saved-trip detail including contact, transport, accommodation, and ordered source-link metadata.';
