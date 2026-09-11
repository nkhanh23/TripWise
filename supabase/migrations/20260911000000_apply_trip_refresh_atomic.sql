-- FEATURE-P5-T004: one reviewed, schedule-only refresh apply. The public RPC
-- is SECURITY INVOKER; durable idempotency is held in a private definer helper
-- so authenticated clients never receive direct table privileges.

create table public.trip_refresh_apply_idempotency (
  owner_id uuid not null references auth.users(id) on delete cascade,
  confirmation_id text not null,
  request_hash bytea not null,
  trip_id uuid not null,
  expected_revision integer not null check (expected_revision > 0),
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (owner_id, confirmation_id),
  constraint trip_refresh_apply_idempotency_confirmation_check check (
    confirmation_id = btrim(confirmation_id)
    and length(confirmation_id) between 8 and 128
    and confirmation_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  constraint trip_refresh_apply_idempotency_hash_check check (octet_length(request_hash) = 32)
);

create index trip_refresh_apply_idempotency_trip_id_idx
  on public.trip_refresh_apply_idempotency (trip_id);

alter table public.trip_refresh_apply_idempotency enable row level security;
revoke all on public.trip_refresh_apply_idempotency from public, anon;
grant select on public.trip_refresh_apply_idempotency to authenticated;

create policy "trip_refresh_apply_idempotency_select_own"
  on public.trip_refresh_apply_idempotency
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

comment on table public.trip_refresh_apply_idempotency is
  'Private durable owner-scoped exactly-once records for reviewed trip refresh application. It is only reachable through public.apply_trip_refresh(jsonb).';

create function public.cleanup_trip_refresh_apply_idempotency()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  delete from public.trip_refresh_apply_idempotency where trip_id = old.id;
  return old;
end;
$$;

revoke all on function public.cleanup_trip_refresh_apply_idempotency() from public, anon, authenticated;

create trigger trips_cleanup_refresh_apply_idempotency
after delete on public.trips
for each row execute function public.cleanup_trip_refresh_apply_idempotency();

create function tripwise_private.apply_trip_refresh(p_command jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_trip_id uuid;
  v_expected_revision integer;
  v_proposal_id text;
  v_confirmation_id text;
  v_idempotency_key text;
  v_current_revision integer;
  v_final_revision integer;
  v_items jsonb;
  v_request jsonb;
  v_request_hash bytea;
  v_existing_hash bytea;
  v_existing_result jsonb;
  v_inserted_owner uuid;
  v_failure_message text;
begin
  if v_owner_id is null then
    raise exception 'Refresh authentication is required.' using errcode = 'TW015';
  end if;

  if p_command is null
     or jsonb_typeof(p_command) <> 'object'
     or octet_length(p_command::text) > 65536
     or not (p_command - 'tripId' - 'expectedRevision' - 'proposalId' - 'confirmationId' - 'idempotencyKey' - 'items' = '{}'::jsonb)
     or jsonb_typeof(p_command->'tripId') <> 'string'
     or jsonb_typeof(p_command->'expectedRevision') <> 'number'
     or jsonb_typeof(p_command->'proposalId') <> 'string'
     or jsonb_typeof(p_command->'confirmationId') <> 'string'
     or jsonb_typeof(p_command->'idempotencyKey') <> 'string'
     or jsonb_typeof(p_command->'items') <> 'array' then
    raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  end if;

  v_proposal_id := p_command->>'proposalId';
  v_confirmation_id := p_command->>'confirmationId';
  v_idempotency_key := p_command->>'idempotencyKey';
  if length(v_proposal_id) not between 8 and 128
     or length(v_confirmation_id) not between 8 and 128
     or v_proposal_id <> btrim(v_proposal_id)
     or v_confirmation_id <> btrim(v_confirmation_id)
     or v_proposal_id !~ '^[A-Za-z0-9._:-]+$'
     or v_confirmation_id !~ '^[A-Za-z0-9._:-]+$'
     or v_idempotency_key <> v_confirmation_id
     or jsonb_array_length(p_command->'items') not between 1 and 400 then
    raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_command->'items') as input(value)
    where jsonb_typeof(input.value) <> 'object'
       or not (input.value - 'itemId' - 'dayId' - 'position' = '{}'::jsonb)
       or jsonb_typeof(input.value->'itemId') <> 'string'
       or jsonb_typeof(input.value->'dayId') <> 'string'
       or jsonb_typeof(input.value->'position') <> 'number'
       or input.value->>'itemId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or input.value->>'dayId' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or input.value->>'position' !~ '^[1-9][0-9]*$'
       or (input.value->>'position')::numeric > 400
  ) then
    raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  end if;

  begin
    v_trip_id := (p_command->>'tripId')::uuid;
    v_expected_revision := (p_command->>'expectedRevision')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  end;
  if (p_command->>'expectedRevision') !~ '^[1-9][0-9]*$' then
    raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'item_id', input.value->>'itemId',
      'day_id', input.value->>'dayId',
      'position', (input.value->>'position')::integer
    ) order by input.value->>'itemId'
  ) into v_items
  from jsonb_array_elements(p_command->'items') as input(value);

  if (select count(*) from jsonb_array_elements(v_items) as input(value))
       <> (select count(distinct input.value->>'item_id') from jsonb_array_elements(v_items) as input(value)) then
    raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  end if;

  v_request := jsonb_build_object(
    'tripId', v_trip_id::text,
    'expectedRevision', v_expected_revision,
    'proposalId', v_proposal_id,
    'confirmationId', v_confirmation_id,
    'items', v_items
  );
  v_request_hash := sha256(convert_to(v_request::text, 'UTF8'));

  -- The unique key serializes concurrent retries before any graph lock. A
  -- failed graph transaction rolls this insert back, leaving the retry safe.
  insert into public.trip_refresh_apply_idempotency (
    owner_id, confirmation_id, request_hash, trip_id, expected_revision
  ) values (
    v_owner_id, v_confirmation_id, v_request_hash, v_trip_id, v_expected_revision
  ) on conflict (owner_id, confirmation_id) do nothing
  returning owner_id into v_inserted_owner;

  if v_inserted_owner is null then
    select idempotency.request_hash, idempotency.result
      into v_existing_hash, v_existing_result
    from public.trip_refresh_apply_idempotency as idempotency
    where idempotency.owner_id = v_owner_id
      and idempotency.confirmation_id = v_confirmation_id
    for update;
    if not found then
      raise exception 'Refresh persistence failed.' using errcode = 'TW021';
    end if;
    if v_existing_hash <> v_request_hash then
      raise exception 'Refresh confirmation identity was reused.' using errcode = 'TW019';
    end if;
    if v_existing_result is null then
      raise exception 'Refresh persistence failed.' using errcode = 'TW021';
    end if;
    return v_existing_result;
  end if;

  -- Match the established direct-writer lock order: every item, every day,
  -- then the trip row. The bounded graph is locked in stable UUID order.
  perform item.id
  from public.itinerary_items as item
  join public.itinerary_days as day on day.id = item.itinerary_day_id
  where day.trip_id = v_trip_id
  order by item.id
  for update of item;

  perform day.id
  from public.itinerary_days as day
  where day.trip_id = v_trip_id
  order by day.id
  for update;

  select trip.workspace_revision
    into v_current_revision
  from public.trips as trip
  where trip.id = v_trip_id
    and trip.user_id = v_owner_id
  for update;
  if not found then
    raise exception 'Refresh trip was not found.' using errcode = 'TW017';
  end if;
  if v_current_revision <> v_expected_revision then
    raise exception 'Refresh baseline is stale.' using errcode = 'TW018';
  end if;

  -- The reviewed payload must name every existing stable item exactly once and
  -- may target only an existing day of the same owned trip. Adds/removals are
  -- deliberately unsupported by this narrow atomic contract.
  if (select count(*) from public.itinerary_items as item join public.itinerary_days as day on day.id = item.itinerary_day_id where day.trip_id = v_trip_id)
       <> jsonb_array_length(v_items)
     or (select count(*) from jsonb_to_recordset(v_items) as input(item_id uuid, day_id uuid, position integer)
         join public.itinerary_items as item on item.id = input.item_id
         join public.itinerary_days as day on day.id = item.itinerary_day_id and day.trip_id = v_trip_id)
       <> jsonb_array_length(v_items)
     or exists (
       select 1
       from jsonb_to_recordset(v_items) as input(item_id uuid, day_id uuid, position integer)
       left join public.itinerary_days as day on day.id = input.day_id and day.trip_id = v_trip_id
       where day.id is null
     )
     or exists (
       select 1
       from (
         select input.position,
           row_number() over (partition by input.day_id order by input.position) as expected_position
         from jsonb_to_recordset(v_items) as input(item_id uuid, day_id uuid, position integer)
       ) as ordered
       where ordered.position <> ordered.expected_position
     ) then
    raise exception 'Reviewed refresh workspace is invalid.' using errcode = 'TW020';
  end if;

  -- T001 and established workspace protection: no fixed, timed, transport,
  -- accommodation, reservation, completed, skipped or confirmed-reservation
  -- item can be moved by refresh. Other fields cannot be supplied at all.
  if exists (
    select 1
    from jsonb_to_recordset(v_items) as input(item_id uuid, day_id uuid, position integer)
    join public.itinerary_items as item on item.id = input.item_id
    where (item.flexibility = 'fixed'
           or item.start_time is not null
           or item.end_time is not null
           or item.item_kind in ('transport', 'accommodation', 'reservation')
           or item.activity_status in ('completed', 'skipped')
           or nullif(btrim(item.reservation_code), '') is not null)
      and (item.itinerary_day_id is distinct from input.day_id or item.position is distinct from input.position)
  ) then
    raise exception 'Reviewed refresh violates protected workspace state.' using errcode = 'TW020';
  end if;

  if not exists (
    select 1
    from jsonb_to_recordset(v_items) as input(item_id uuid, day_id uuid, position integer)
    join public.itinerary_items as item on item.id = input.item_id
    where item.itinerary_day_id is distinct from input.day_id
       or item.position is distinct from input.position
  ) then
    v_existing_result := jsonb_build_object('revision', v_current_revision, 'noOp', true);
    update public.trip_refresh_apply_idempotency
    set result = v_existing_result
    where owner_id = v_owner_id and confirmation_id = v_confirmation_id;
    return v_existing_result;
  end if;

  set constraints itinerary_items_day_position_key deferred;
  update public.itinerary_items as item
  set itinerary_day_id = input.day_id,
      position = input.position
  from jsonb_to_recordset(v_items) as input(item_id uuid, day_id uuid, position integer)
  where item.id = input.item_id
    and (item.itinerary_day_id is distinct from input.day_id or item.position is distinct from input.position);

  select trip.workspace_revision into v_final_revision
  from public.trips as trip
  where trip.id = v_trip_id;
  if v_final_revision <= v_expected_revision then
    raise exception 'Refresh revision did not advance.' using errcode = 'TW021';
  end if;

  v_existing_result := jsonb_build_object('revision', v_final_revision, 'noOp', false);
  update public.trip_refresh_apply_idempotency
  set result = v_existing_result
  where owner_id = v_owner_id and confirmation_id = v_confirmation_id;
  return v_existing_result;
exception
  when sqlstate 'TW015' then raise;
  when sqlstate 'TW016' then raise;
  when sqlstate 'TW017' then raise;
  when sqlstate 'TW018' then raise;
  when sqlstate 'TW019' then raise;
  when sqlstate 'TW020' then raise;
  when sqlstate 'TW021' then raise;
  when unique_violation or check_violation or foreign_key_violation then
    raise exception 'Reviewed refresh workspace is invalid.' using errcode = 'TW020';
  when others then
    get stacked diagnostics v_failure_message = message_text;
    raise notice 'refresh_internal_failure=%', v_failure_message;
    raise exception 'Refresh persistence failed.' using errcode = 'TW021';
end;
$$;

revoke all on function tripwise_private.apply_trip_refresh(jsonb) from public, anon;
grant execute on function tripwise_private.apply_trip_refresh(jsonb) to authenticated;

create function public.apply_trip_refresh(p_command jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  return tripwise_private.apply_trip_refresh(p_command);
exception
  when sqlstate 'TW015' then raise exception 'Refresh authentication is required.' using errcode = 'TW015';
  when sqlstate 'TW016' then raise exception 'Refresh request is invalid.' using errcode = 'TW016';
  when sqlstate 'TW017' then raise exception 'Refresh trip was not found.' using errcode = 'TW017';
  when sqlstate 'TW018' then raise exception 'Refresh baseline is stale.' using errcode = 'TW018';
  when sqlstate 'TW019' then raise exception 'Refresh confirmation identity conflicts.' using errcode = 'TW019';
  when sqlstate 'TW020' then raise exception 'Reviewed refresh workspace is invalid.' using errcode = 'TW020';
  when others then raise exception 'Refresh persistence failed.' using errcode = 'TW021';
end;
$$;

comment on function public.apply_trip_refresh(jsonb) is
  'FEATURE-P5-T004 SECURITY INVOKER owner-scoped atomic schedule-only refresh apply. It derives auth.uid(), performs CAS and returns durable exactly-once results.';

revoke all on function public.apply_trip_refresh(jsonb) from public, anon;
grant execute on function public.apply_trip_refresh(jsonb) to authenticated;
