-- BE-P5-T003: only the server-side resolver may create or refresh a verified
-- Google Places snapshot. Existing pre-hardening values deliberately remain
-- untrusted because place_resolved_at is NULL.
alter table public.itinerary_items
  add column place_resolved_at timestamptz;

alter table public.itinerary_items
  add constraint itinerary_items_verified_snapshot_check
  check (
    place_resolved_at is null
    or (
      google_place_id is not null
      and length(btrim(google_place_id)) between 1 and 255
      and length(btrim(place_name)) between 1 and 160
      and latitude is not null
      and longitude is not null
    )
  );

comment on column public.itinerary_items.place_resolved_at is
  'Trusted server-side Google Places snapshot provenance/freshness marker. NULL means provider-looking columns are not verified.';

comment on constraint itinerary_items_verified_snapshot_check on public.itinerary_items is
  'A verified marker requires a complete provider identity and coordinate pair; NULL marker denotes unresolved or legacy-untrusted data.';

create function public.enforce_itinerary_item_place_provenance()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  -- PostgREST clients execute as authenticated/anon. The Edge Function writes
  -- through the service-role-only RPC below, so an owner cannot self-certify.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' and (
      new.google_place_id is not null
      or new.latitude is not null
      or new.longitude is not null
      or new.place_address is not null
      or new.place_category is not null
      or new.place_resolved_at is not null
    ) then
      raise exception 'Provider-owned place metadata requires server-side verification.'
        using errcode = '22023';
    end if;

    if tg_op = 'UPDATE' and (
      new.google_place_id is distinct from old.google_place_id
      or new.latitude is distinct from old.latitude
      or new.longitude is distinct from old.longitude
      or new.place_address is distinct from old.place_address
      or new.place_category is distinct from old.place_category
      or new.place_resolved_at is distinct from old.place_resolved_at
      or (old.place_resolved_at is not null and new.place_name is distinct from old.place_name)
    ) then
      raise exception 'Provider-owned place metadata requires server-side verification.'
        using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_itinerary_item_place_provenance() from public, anon, authenticated;

create trigger itinerary_items_enforce_place_provenance
before insert or update on public.itinerary_items
for each row execute function public.enforce_itinerary_item_place_provenance();

create function public.apply_verified_place_snapshot(
  p_owner_id uuid,
  p_item_id uuid,
  p_google_place_id text,
  p_place_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_place_address text default null,
  p_place_category text default null
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_resolved_at timestamptz := clock_timestamp();
begin
  if p_owner_id is null or p_item_id is null
     or length(btrim(coalesce(p_google_place_id, ''))) not between 1 and 255
     or length(btrim(coalesce(p_place_name, ''))) not between 1 and 160
     or p_latitude not between -90 and 90
     or p_longitude not between -180 and 180
     or (p_place_address is not null and length(btrim(p_place_address)) > 500)
     or (p_place_category is not null and length(btrim(p_place_category)) > 100) then
    raise exception 'Verified place snapshot is invalid.' using errcode = '22023';
  end if;

  update public.itinerary_items as item
  set google_place_id = btrim(p_google_place_id),
      place_name = btrim(p_place_name),
      latitude = p_latitude,
      longitude = p_longitude,
      place_address = nullif(btrim(p_place_address), ''),
      place_category = nullif(btrim(p_place_category), ''),
      place_resolved_at = v_resolved_at
  from public.itinerary_days as day
  join public.trips as trip on trip.id = day.trip_id
  where item.id = p_item_id
    and item.itinerary_day_id = day.id
    and trip.user_id = p_owner_id;

  if not found then
    raise exception 'Itinerary item was not found for the authenticated owner.' using errcode = 'P0002';
  end if;

  return v_resolved_at;
end;
$$;

comment on function public.apply_verified_place_snapshot(uuid, uuid, text, text, double precision, double precision, text, text) is
  'Service-role-only atomic Google Places snapshot writer. p_owner_id must be derived from a verified Edge Function JWT, never client input.';

revoke all on function public.apply_verified_place_snapshot(uuid, uuid, text, text, double precision, double precision, text, text) from public, anon, authenticated;
grant execute on function public.apply_verified_place_snapshot(uuid, uuid, text, text, double precision, double precision, text, text) to service_role;
