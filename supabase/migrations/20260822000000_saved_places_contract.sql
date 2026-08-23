-- Migration: 20260822000000_saved_places_contract.sql
-- Description: Creates public.saved_places table, indexes, RLS policies, and owner RPC functions for Saved Places.

create table public.saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_place_id text not null check (length(trim(google_place_id)) >= 10 and length(trim(google_place_id)) <= 200),
  place_name text not null check (length(trim(place_name)) > 0 and length(trim(place_name)) <= 250),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  place_address text check (place_address is null or length(trim(place_address)) <= 500),
  place_category text check (place_category is null or length(trim(place_category)) <= 100),
  created_at timestamptz not null default now(),
  constraint saved_places_user_google_place_unique unique (user_id, google_place_id)
);

create index saved_places_user_created_id_idx on public.saved_places (user_id, created_at desc, id desc);

alter table public.saved_places enable row level security;

revoke all on public.saved_places from public, anon;
grant select, insert, update, delete on public.saved_places to authenticated;

create policy "saved_places_select_own"
on public.saved_places
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "saved_places_insert_own"
on public.saved_places
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "saved_places_update_own"
on public.saved_places
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "saved_places_delete_own"
on public.saved_places
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- RPC: list_saved_places
create or replace function public.list_saved_places(
  p_limit integer default 20,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_category text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_limit integer;
  v_items jsonb;
  v_next_cursor jsonb := null;
  v_last_created_at timestamptz;
  v_last_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  if p_limit is null then
    v_limit := 20;
  elsif p_limit < 1 or p_limit > 50 then
    raise exception 'Limit must be between 1 and 50.' using errcode = '22023';
  else
    v_limit := p_limit;
  end if;

  if (p_cursor_created_at is null and p_cursor_id is not null) or
     (p_cursor_created_at is not null and p_cursor_id is null) then
    raise exception 'Cursor timestamp and ID must be provided together.' using errcode = '22023';
  end if;

  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', sp.id,
        'googlePlaceId', sp.google_place_id,
        'placeName', sp.place_name,
        'latitude', sp.latitude,
        'longitude', sp.longitude,
        'placeAddress', sp.place_address,
        'placeCategory', sp.place_category,
        'createdAt', sp.created_at
      ) order by sp.created_at desc, sp.id desc
    ), '[]'::jsonb)
  into v_items
  from (
    select *
    from public.saved_places
    where user_id = v_user_id
      and (p_category is null or place_category = p_category)
      and (
        p_cursor_created_at is null
        or (created_at, id) < (p_cursor_created_at, p_cursor_id)
      )
    order by created_at desc, id desc
    limit (v_limit + 1)
  ) sp;

  if jsonb_array_length(v_items) > v_limit then
    select
      (v_items->(v_limit - 1)->>'createdAt')::timestamptz,
      (v_items->(v_limit - 1)->>'id')::uuid
    into v_last_created_at, v_last_id;

    v_next_cursor := jsonb_build_object(
      'createdAt', to_char(v_last_created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'id', v_last_id
    );

    v_items := (
      select jsonb_agg(elem)
      from jsonb_array_elements(v_items) with ordinality as arr(elem, idx)
      where idx <= v_limit
    );
  end if;

  return jsonb_build_object(
    'items', v_items,
    'nextCursor', v_next_cursor
  );
end;
$$;

-- RPC: save_place
create or replace function public.save_place(
  p_google_place_id text,
  p_place_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_place_address text default null,
  p_place_category text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_saved public.saved_places;
  v_trimmed_google_id text;
  v_trimmed_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_trimmed_google_id := trim(coalesce(p_google_place_id, ''));
  v_trimmed_name := trim(coalesce(p_place_name, ''));

  if length(v_trimmed_google_id) < 10 or length(v_trimmed_google_id) > 200 then
    raise exception 'Invalid google_place_id.' using errcode = '22023';
  end if;

  if length(v_trimmed_name) = 0 or length(v_trimmed_name) > 250 then
    raise exception 'Invalid place_name.' using errcode = '22023';
  end if;

  if p_latitude is null or p_latitude < -90 or p_latitude > 90 or
     p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates.' using errcode = '22023';
  end if;

  insert into public.saved_places (
    user_id,
    google_place_id,
    place_name,
    latitude,
    longitude,
    place_address,
    place_category
  )
  values (
    v_user_id,
    v_trimmed_google_id,
    v_trimmed_name,
    p_latitude,
    p_longitude,
    nullif(trim(coalesce(p_place_address, '')), ''),
    nullif(trim(coalesce(p_place_category, '')), '')
  )
  on conflict (user_id, google_place_id) do update
  set
    place_name = excluded.place_name,
    latitude = excluded.latitude,
    longitude = excluded.longitude,
    place_address = coalesce(excluded.place_address, public.saved_places.place_address),
    place_category = coalesce(excluded.place_category, public.saved_places.place_category)
  returning * into v_saved;

  return jsonb_build_object(
    'id', v_saved.id,
    'googlePlaceId', v_saved.google_place_id,
    'placeName', v_saved.place_name,
    'latitude', v_saved.latitude,
    'longitude', v_saved.longitude,
    'placeAddress', v_saved.place_address,
    'placeCategory', v_saved.place_category,
    'createdAt', v_saved.created_at
  );
end;
$$;

-- RPC: unsave_place
create or replace function public.unsave_place(
  p_google_place_id text
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_deleted_count integer;
  v_trimmed_google_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  v_trimmed_google_id := trim(coalesce(p_google_place_id, ''));
  if length(v_trimmed_google_id) = 0 then
    return false;
  end if;

  delete from public.saved_places
  where user_id = v_user_id
    and google_place_id = v_trimmed_google_id;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count > 0;
end;
$$;

revoke all on function public.list_saved_places from public, anon;
grant execute on function public.list_saved_places to authenticated;

revoke all on function public.save_place from public, anon;
grant execute on function public.save_place to authenticated;

revoke all on function public.unsave_place from public, anon;
grant execute on function public.unsave_place to authenticated;
