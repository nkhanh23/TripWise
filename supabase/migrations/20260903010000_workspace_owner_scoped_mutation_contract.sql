-- FEATURE-P1-T003: narrow, owner-derived, CAS-protected workspace writes.
-- KIND_MUTABILITY = IMMUTABLE. Reclassification needs a dedicated future command
-- with explicit metadata/provenance semantics; it is not a partial general edit.
-- Move/reorder also remains owned by FEATURE-P2-T002.
create function public.mutate_travel_workspace(p_command jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_type text;
  v_trip_id uuid;
  v_item_id uuid;
  v_expected_revision integer;
  v_current_revision integer;
  v_original public.itinerary_items%rowtype;
  v_final public.itinerary_items%rowtype;
  v_patch jsonb;
  v_contact jsonb;
  v_transport jsonb;
  v_accommodation jsonb;
  v_links jsonb;
  v_link jsonb;
  v_index integer;
  v_status text;
begin
  if (select auth.uid()) is null then
    raise exception 'Workspace authentication is required.' using errcode = 'TW006';
  end if;
  if p_command is null or octet_length(p_command::text) > 50000 or jsonb_typeof(p_command) <> 'object' then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end if;

  -- Server/provider-owned keys are reported before generic allowlist failures,
  -- including when a malicious client places one at the command root.
  if p_command ?| array['ownerId', 'userId', 'workspaceRevision', 'googlePlaceId', 'latitude', 'longitude', 'placeAddress', 'placeCategory', 'placeResolvedAt', 'completedAt', 'skippedAt'] then
    raise exception 'Provider or server-owned field is not writable.' using errcode = 'TW013';
  end if;
  if not (p_command - 'type' - 'tripId' - 'itemId' - 'expectedRevision' - 'patch' - 'status' - 'links' = '{}'::jsonb)
     or not (p_command ? 'type') or not (p_command ? 'tripId') or not (p_command ? 'itemId') or not (p_command ? 'expectedRevision')
     or jsonb_typeof(p_command->'type') <> 'string'
     or jsonb_typeof(p_command->'tripId') <> 'string'
     or jsonb_typeof(p_command->'itemId') <> 'string'
     or jsonb_typeof(p_command->'expectedRevision') <> 'number' then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end if;

  v_type := p_command->>'type';
  begin
    v_trip_id := (p_command->>'tripId')::uuid;
    v_item_id := (p_command->>'itemId')::uuid;
    if (p_command->>'expectedRevision')::numeric <> trunc((p_command->>'expectedRevision')::numeric) then
      raise exception 'Workspace command is invalid.' using errcode = 'TW007';
    end if;
    v_expected_revision := (p_command->>'expectedRevision')::integer;
  exception when others then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end;
  if coalesce(v_type not in ('update_item', 'transition_item_status', 'replace_source_links'), true)
     or v_trip_id is null or v_item_id is null or v_expected_revision is null or v_expected_revision < 1 then
    raise exception 'Workspace command is invalid.' using errcode = 'TW007';
  end if;

  -- Canonical order is item -> trip for item/status commands. A source-link
  -- replacement first locks every existing child row by stable ID, then follows
  -- item -> trip. Direct UPDATE/DELETE hold a source-link row before their
  -- revision trigger locks the trip, so this avoids a trip -> source-link cycle.
  -- Direct INSERT uses item -> trip and can finish before this command acquires
  -- the item lock; the following CAS check then returns TW009 rather than retrying.
  if v_type = 'replace_source_links' then
    perform source_link.id
    from public.itinerary_item_source_links as source_link
    where source_link.itinerary_item_id = v_item_id
    order by source_link.id
    for update;
  end if;

  select item.* into v_original
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  where item.id = v_item_id and day.trip_id = v_trip_id
  for update of item;
  if not found then
    raise exception 'Workspace resource was not found.' using errcode = 'TW008';
  end if;
  select trip.workspace_revision into v_current_revision
  from public.trips as trip
  where trip.id = v_trip_id and trip.user_id = (select auth.uid())
  for update;
  if not found then
    raise exception 'Workspace resource was not found.' using errcode = 'TW008';
  end if;
  if v_current_revision <> v_expected_revision then
    raise exception 'Workspace revision conflict.' using errcode = 'TW009';
  end if;

  if v_type = 'update_item' then
    if not (p_command ? 'patch') or jsonb_typeof(p_command->'patch') <> 'object'
       or p_command ? 'status' or p_command ? 'links' then
      raise exception 'Workspace command is invalid.' using errcode = 'TW007';
    end if;
    v_patch := p_command->'patch';
    if v_patch ?| array['ownerId', 'userId', 'workspaceRevision', 'googlePlaceId', 'latitude', 'longitude', 'placeAddress', 'placeCategory', 'placeResolvedAt', 'completedAt', 'skippedAt'] then
      raise exception 'Provider or server-owned field is not writable.' using errcode = 'TW013';
    end if;
    if not exists (select 1 from jsonb_object_keys(v_patch))
       or not (v_patch - 'placeName' - 'placeQuery' - 'flexibility' - 'priority' - 'startTime' - 'endTime' - 'note' - 'contact' - 'transport' - 'accommodation' = '{}'::jsonb) then
      raise exception 'Workspace field is invalid.' using errcode = 'TW010';
    end if;
    if v_original.place_resolved_at is not null and v_patch ? 'placeName' then
      raise exception 'Provider or server-owned field is not writable.' using errcode = 'TW013';
    end if;
    v_contact := coalesce(v_patch->'contact', '{}'::jsonb);
    v_transport := coalesce(v_patch->'transport', '{}'::jsonb);
    v_accommodation := coalesce(v_patch->'accommodation', '{}'::jsonb);
    if jsonb_typeof(v_contact) <> 'object' or jsonb_typeof(v_transport) <> 'object' or jsonb_typeof(v_accommodation) <> 'object'
       or not (v_contact - 'name' - 'phone' - 'address' - 'websiteUrl' - 'bookingUrl' - 'reservationCode' = '{}'::jsonb)
       or not (v_transport - 'mode' - 'originLabel' - 'destinationLabel' - 'operatorName' - 'departureAt' - 'arrivalAt' - 'plannedCostAmount' - 'plannedCostCurrency' = '{}'::jsonb)
       or not (v_accommodation - 'checkInAt' - 'checkOutAt' - 'nights' = '{}'::jsonb) then
      raise exception 'Workspace field is invalid.' using errcode = 'TW010';
    end if;
    -- jsonb_populate_record must not coerce hostile JSON scalars. Validate the
    -- exact JSON type before mapping the explicit allowlist onto the row.
    if (v_patch ? 'placeName' and jsonb_typeof(v_patch->'placeName') <> 'string')
       or (v_patch ? 'placeQuery' and jsonb_typeof(v_patch->'placeQuery') not in ('string', 'null'))
       or (v_patch ? 'flexibility' and jsonb_typeof(v_patch->'flexibility') <> 'string')
       or (v_patch ? 'priority' and jsonb_typeof(v_patch->'priority') <> 'string')
       or (v_patch ? 'startTime' and jsonb_typeof(v_patch->'startTime') not in ('string', 'null'))
       or (v_patch ? 'endTime' and jsonb_typeof(v_patch->'endTime') not in ('string', 'null'))
       or (v_patch ? 'note' and jsonb_typeof(v_patch->'note') not in ('string', 'null'))
       or (v_contact ? 'name' and jsonb_typeof(v_contact->'name') not in ('string', 'null'))
       or (v_contact ? 'phone' and jsonb_typeof(v_contact->'phone') not in ('string', 'null'))
       or (v_contact ? 'address' and jsonb_typeof(v_contact->'address') not in ('string', 'null'))
       or (v_contact ? 'websiteUrl' and jsonb_typeof(v_contact->'websiteUrl') not in ('string', 'null'))
       or (v_contact ? 'bookingUrl' and jsonb_typeof(v_contact->'bookingUrl') not in ('string', 'null'))
       or (v_contact ? 'reservationCode' and jsonb_typeof(v_contact->'reservationCode') not in ('string', 'null'))
       or (v_transport ? 'mode' and jsonb_typeof(v_transport->'mode') not in ('string', 'null'))
       or (v_transport ? 'originLabel' and jsonb_typeof(v_transport->'originLabel') not in ('string', 'null'))
       or (v_transport ? 'destinationLabel' and jsonb_typeof(v_transport->'destinationLabel') not in ('string', 'null'))
       or (v_transport ? 'operatorName' and jsonb_typeof(v_transport->'operatorName') not in ('string', 'null'))
       or (v_transport ? 'departureAt' and jsonb_typeof(v_transport->'departureAt') not in ('string', 'null'))
       or (v_transport ? 'arrivalAt' and jsonb_typeof(v_transport->'arrivalAt') not in ('string', 'null'))
       or (v_transport ? 'plannedCostAmount' and jsonb_typeof(v_transport->'plannedCostAmount') not in ('number', 'null'))
       or (v_transport ? 'plannedCostCurrency' and jsonb_typeof(v_transport->'plannedCostCurrency') not in ('string', 'null'))
       or (v_accommodation ? 'checkInAt' and jsonb_typeof(v_accommodation->'checkInAt') not in ('string', 'null'))
       or (v_accommodation ? 'checkOutAt' and jsonb_typeof(v_accommodation->'checkOutAt') not in ('string', 'null'))
       or (v_accommodation ? 'nights' and jsonb_typeof(v_accommodation->'nights') not in ('number', 'null'))
       or (v_accommodation ? 'nights' and jsonb_typeof(v_accommodation->'nights') = 'number' and (v_accommodation->>'nights')::numeric <> trunc((v_accommodation->>'nights')::numeric)) then
      raise exception 'Workspace payload is invalid.' using errcode = 'TW014';
    end if;

    -- Populate only the explicit allowlist. JSON null deliberately clears a nullable field.
    v_final := jsonb_populate_record(v_original, jsonb_build_object(
      'item_kind', to_jsonb(v_original.item_kind),
      'place_name', case when v_patch ? 'placeName' then v_patch->'placeName' else to_jsonb(v_original.place_name) end,
      'place_query', case when v_patch ? 'placeQuery' then v_patch->'placeQuery' else to_jsonb(v_original.place_query) end,
      'flexibility', case when v_patch ? 'flexibility' then v_patch->'flexibility' else to_jsonb(v_original.flexibility) end,
      'priority', case when v_patch ? 'priority' then v_patch->'priority' else to_jsonb(v_original.priority) end,
      'start_time', case when v_patch ? 'startTime' then v_patch->'startTime' else to_jsonb(v_original.start_time) end,
      'end_time', case when v_patch ? 'endTime' then v_patch->'endTime' else to_jsonb(v_original.end_time) end,
      'note', case when v_patch ? 'note' then v_patch->'note' else to_jsonb(v_original.note) end,
      'contact_name', case when v_contact ? 'name' then v_contact->'name' else to_jsonb(v_original.contact_name) end,
      'contact_phone', case when v_contact ? 'phone' then v_contact->'phone' else to_jsonb(v_original.contact_phone) end,
      'contact_address', case when v_contact ? 'address' then v_contact->'address' else to_jsonb(v_original.contact_address) end,
      'contact_website_url', case when v_contact ? 'websiteUrl' then v_contact->'websiteUrl' else to_jsonb(v_original.contact_website_url) end,
      'contact_booking_url', case when v_contact ? 'bookingUrl' then v_contact->'bookingUrl' else to_jsonb(v_original.contact_booking_url) end,
      'reservation_code', case when v_contact ? 'reservationCode' then v_contact->'reservationCode' else to_jsonb(v_original.reservation_code) end,
      'transport_mode', case when v_transport ? 'mode' then v_transport->'mode' else to_jsonb(v_original.transport_mode) end,
      'transport_origin_label', case when v_transport ? 'originLabel' then v_transport->'originLabel' else to_jsonb(v_original.transport_origin_label) end,
      'transport_destination_label', case when v_transport ? 'destinationLabel' then v_transport->'destinationLabel' else to_jsonb(v_original.transport_destination_label) end,
      'transport_operator_name', case when v_transport ? 'operatorName' then v_transport->'operatorName' else to_jsonb(v_original.transport_operator_name) end,
      'transport_departure_at', case when v_transport ? 'departureAt' then v_transport->'departureAt' else to_jsonb(v_original.transport_departure_at) end,
      'transport_arrival_at', case when v_transport ? 'arrivalAt' then v_transport->'arrivalAt' else to_jsonb(v_original.transport_arrival_at) end,
      'transport_planned_cost_amount', case when v_transport ? 'plannedCostAmount' then v_transport->'plannedCostAmount' else to_jsonb(v_original.transport_planned_cost_amount) end,
      'transport_planned_cost_currency', case when v_transport ? 'plannedCostCurrency' then v_transport->'plannedCostCurrency' else to_jsonb(v_original.transport_planned_cost_currency) end,
      'accommodation_details_present', case when v_patch ? 'accommodation' then 'true'::jsonb else to_jsonb(v_original.accommodation_details_present) end,
      'accommodation_check_in_at', case when v_accommodation ? 'checkInAt' then v_accommodation->'checkInAt' else to_jsonb(v_original.accommodation_check_in_at) end,
      'accommodation_check_out_at', case when v_accommodation ? 'checkOutAt' then v_accommodation->'checkOutAt' else to_jsonb(v_original.accommodation_check_out_at) end,
      'accommodation_nights', case when v_accommodation ? 'nights' then v_accommodation->'nights' else to_jsonb(v_original.accommodation_nights) end
    ));
    if length(btrim(coalesce(v_final.place_name, ''))) not between 1 and 160
       or (v_final.place_query is not null and length(btrim(v_final.place_query)) > 200)
       or (v_final.note is not null and length(btrim(v_final.note)) > 500)
       or (v_final.contact_name is not null and length(btrim(v_final.contact_name)) not between 1 and 120)
       or (v_final.contact_phone is not null and (length(btrim(v_final.contact_phone)) not between 1 and 64 or btrim(v_final.contact_phone) !~ '^[+0-9 ()\.-]+$'))
       or (v_final.contact_address is not null and length(btrim(v_final.contact_address)) not between 1 and 500)
       or (v_final.reservation_code is not null and length(btrim(v_final.reservation_code)) not between 1 and 128)
       or (v_final.contact_website_url is not null and (length(v_final.contact_website_url) > 2048 or v_final.contact_website_url !~ '^https://[^[:space:]]+$'))
       or (v_final.contact_booking_url is not null and (length(v_final.contact_booking_url) > 2048 or v_final.contact_booking_url !~ '^https://[^[:space:]]+$')) then
      raise exception 'Workspace payload is invalid.' using errcode = 'TW014';
    end if;
    if v_final.item_kind not in ('place', 'custom_activity', 'restaurant', 'transport', 'accommodation', 'reservation', 'note')
       or v_final.flexibility not in ('fixed', 'flexible') or v_final.priority not in ('must_do', 'want_to_do', 'optional')
       or (v_final.item_kind not in ('place', 'restaurant', 'accommodation') and v_final.place_query is not null)
       or (v_final.item_kind = 'note' and (v_final.place_query is not null or v_final.start_time is not null or v_final.end_time is not null))
       or (v_final.item_kind = 'transport' and v_final.transport_mode not in ('walk', 'drive', 'transit', 'bus', 'train', 'flight', 'motorbike', 'ferry', 'other'))
       or (v_final.item_kind = 'transport' and (v_final.start_time is not null or v_final.end_time is not null))
       or (v_final.item_kind <> 'transport' and (v_final.transport_mode is not null or v_final.transport_origin_label is not null or v_final.transport_destination_label is not null or v_final.transport_operator_name is not null or v_final.transport_departure_at is not null or v_final.transport_arrival_at is not null or v_final.transport_planned_cost_amount is not null or v_final.transport_planned_cost_currency is not null))
       or (v_final.item_kind = 'accommodation' and not v_final.accommodation_details_present)
       or (v_final.item_kind <> 'accommodation' and (v_final.accommodation_details_present or v_final.accommodation_check_in_at is not null or v_final.accommodation_check_out_at is not null or v_final.accommodation_nights is not null)) then
      raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
    end if;
    if (v_final.transport_departure_at is null) <> (v_final.transport_arrival_at is null)
       or (v_final.transport_arrival_at is not null and v_final.transport_arrival_at < v_final.transport_departure_at)
       or (v_final.transport_origin_label is not null and length(btrim(v_final.transport_origin_label)) not between 1 and 160)
       or (v_final.transport_destination_label is not null and length(btrim(v_final.transport_destination_label)) not between 1 and 160)
       or (v_final.transport_operator_name is not null and length(btrim(v_final.transport_operator_name)) not between 1 and 160)
       or ((v_final.transport_planned_cost_amount is null) <> (v_final.transport_planned_cost_currency is null))
       or (v_final.transport_planned_cost_amount is not null and (v_final.transport_planned_cost_amount < 0 or v_final.transport_planned_cost_amount > 1000000000))
       or (v_final.transport_planned_cost_currency is not null and v_final.transport_planned_cost_currency !~ '^[A-Z]{3}$')
       or (v_final.accommodation_check_in_at is null) <> (v_final.accommodation_check_out_at is null)
       or (v_final.accommodation_check_out_at is not null and v_final.accommodation_check_out_at <= v_final.accommodation_check_in_at)
       or (v_final.accommodation_nights is not null and v_final.accommodation_nights not between 0 and 365)
       or (v_final.accommodation_nights is not null and (v_final.accommodation_check_out_at at time zone 'UTC')::date - (v_final.accommodation_check_in_at at time zone 'UTC')::date <> v_final.accommodation_nights) then
      raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
    end if;
    update public.itinerary_items as item set
      item_kind=v_final.item_kind, place_name=nullif(btrim(v_final.place_name), ''), place_query=nullif(btrim(v_final.place_query), ''), flexibility=v_final.flexibility, priority=v_final.priority,
      start_time=v_final.start_time, end_time=v_final.end_time, note=nullif(btrim(v_final.note), ''), contact_name=nullif(btrim(v_final.contact_name), ''), contact_phone=nullif(btrim(v_final.contact_phone), ''), contact_address=nullif(btrim(v_final.contact_address), ''), contact_website_url=nullif(btrim(v_final.contact_website_url), ''), contact_booking_url=nullif(btrim(v_final.contact_booking_url), ''), reservation_code=nullif(btrim(v_final.reservation_code), ''),
      transport_mode=v_final.transport_mode, transport_origin_label=nullif(btrim(v_final.transport_origin_label), ''), transport_destination_label=nullif(btrim(v_final.transport_destination_label), ''), transport_operator_name=nullif(btrim(v_final.transport_operator_name), ''), transport_departure_at=v_final.transport_departure_at, transport_arrival_at=v_final.transport_arrival_at, transport_planned_cost_amount=v_final.transport_planned_cost_amount, transport_planned_cost_currency=v_final.transport_planned_cost_currency,
      accommodation_details_present=v_final.accommodation_details_present, accommodation_check_in_at=v_final.accommodation_check_in_at, accommodation_check_out_at=v_final.accommodation_check_out_at, accommodation_nights=v_final.accommodation_nights
    where item.id=v_item_id;

  elsif v_type = 'transition_item_status' then
    if not (p_command ? 'status') or p_command ? 'patch' or p_command ? 'links' then raise exception 'Workspace command is invalid.' using errcode = 'TW007'; end if;
    v_status := p_command->>'status';
    if v_status not in ('scheduled', 'completed', 'skipped')
       or (v_original.activity_status = 'completed' and v_status = 'skipped')
       or (v_original.activity_status = 'skipped' and v_status = 'completed') then
      raise exception 'Workspace lifecycle transition is invalid.' using errcode = 'TW012';
    end if;
    update public.itinerary_items set activity_status=v_status where id=v_item_id;

  else
    if not (p_command ? 'links') or p_command ? 'patch' or p_command ? 'status' or jsonb_typeof(p_command->'links') <> 'array' or jsonb_array_length(p_command->'links') > 12 then
      raise exception 'Workspace source-link payload is invalid.' using errcode = 'TW014';
    end if;
    v_links := p_command->'links';
    for v_index in 0..jsonb_array_length(v_links)-1 loop
      v_link := v_links->v_index;
      if jsonb_typeof(v_link) <> 'object' or not (v_link - 'type' - 'url' - 'label' = '{}'::jsonb)
         or jsonb_typeof(v_link->'type') <> 'string' or jsonb_typeof(v_link->'url') <> 'string'
         or (v_link ? 'label' and jsonb_typeof(v_link->'label') <> 'string')
         or v_link->>'type' not in ('google_maps', 'facebook', 'instagram', 'tiktok', 'website', 'booking', 'other')
         or length(coalesce(v_link->>'url','')) > 2048 or coalesce(v_link->>'url','') !~ '^https://[^[:space:]]+$'
         or (v_link ? 'label' and length(btrim(coalesce(v_link->>'label',''))) not between 1 and 120)
         or (v_link->>'type' = 'other' and length(btrim(coalesce(v_link->>'label',''))) not between 1 and 120) then
        raise exception 'Workspace source-link payload is invalid.' using errcode = 'TW014';
      end if;
    end loop;
    delete from public.itinerary_item_source_links where itinerary_item_id=v_item_id;
    for v_index in 0..jsonb_array_length(v_links)-1 loop
      v_link := v_links->v_index;
      insert into public.itinerary_item_source_links(itinerary_item_id,link_type,url,label,position)
      values(v_item_id, v_link->>'type', btrim(v_link->>'url'), nullif(btrim(v_link->>'label'), ''), v_index+1);
    end loop;
  end if;

  select workspace_revision into v_current_revision from public.trips where id=v_trip_id;
  return jsonb_build_object('revision', v_current_revision);
exception
  when sqlstate 'TW006' then raise;
  when sqlstate 'TW007' then raise;
  when sqlstate 'TW008' then raise;
  when sqlstate 'TW009' then raise;
  when sqlstate 'TW010' then raise;
  when sqlstate 'TW011' then raise;
  when sqlstate 'TW012' then raise;
  when sqlstate 'TW013' then raise;
  when sqlstate 'TW014' then raise;
  when data_exception then
    raise exception 'Workspace payload is invalid.' using errcode = 'TW014';
  when check_violation then
    raise exception 'Workspace field-kind combination is invalid.' using errcode = 'TW011';
  when others then
    raise exception 'Workspace mutation failed.' using errcode = 'TW007';
end;
$$;

comment on function public.mutate_travel_workspace(jsonb) is
  'FEATURE-P1-T003 SECURITY INVOKER owner-scoped workspace mutation boundary. It derives owner from auth.uid(), atomically compares trips.workspace_revision, validates a field/kind whitelist, and returns the trigger-controlled revision.';

revoke all on function public.mutate_travel_workspace(jsonb) from public, anon;
grant execute on function public.mutate_travel_workspace(jsonb) to authenticated;
