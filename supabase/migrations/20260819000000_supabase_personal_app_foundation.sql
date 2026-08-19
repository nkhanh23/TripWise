create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  destination text not null check (length(trim(destination)) > 0),
  start_date date not null,
  end_date date not null,
  estimated_budget numeric(12, 2) check (estimated_budget is null or estimated_budget >= 0),
  currency char(3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_date_range_check check (end_date >= start_date)
);

create table public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  date date,
  summary text,
  created_at timestamptz not null default now(),
  constraint itinerary_days_trip_day_number_key unique (trip_id, day_number)
);

create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days (id) on delete cascade,
  position integer not null check (position > 0),
  google_place_id text,
  place_name text not null check (length(trim(place_name)) > 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  place_address text,
  place_category text,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now(),
  constraint itinerary_items_day_position_key unique (itinerary_day_id, position),
  constraint itinerary_items_time_range_check check (end_time is null or start_time is null or end_time >= start_time)
);

create index trips_user_id_idx on public.trips (user_id);
create index itinerary_days_trip_id_idx on public.itinerary_days (trip_id);
create index itinerary_items_itinerary_day_id_idx on public.itinerary_items (itinerary_day_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.itinerary_days enable row level security;
alter table public.itinerary_items enable row level security;

revoke all on public.profiles, public.trips, public.itinerary_days, public.itinerary_items from public, anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.trips, public.itinerary_days, public.itinerary_items to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "trips_select_own" on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "trips_insert_own" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "trips_update_own" on public.trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "trips_delete_own" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);

create policy "itinerary_days_select_own" on public.itinerary_days for select to authenticated using (exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = (select auth.uid())));
create policy "itinerary_days_insert_own" on public.itinerary_days for insert to authenticated with check (exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = (select auth.uid())));
create policy "itinerary_days_update_own" on public.itinerary_days for update to authenticated using (exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = (select auth.uid()))) with check (exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = (select auth.uid())));
create policy "itinerary_days_delete_own" on public.itinerary_days for delete to authenticated using (exists (select 1 from public.trips where trips.id = itinerary_days.trip_id and trips.user_id = (select auth.uid())));

create policy "itinerary_items_select_own" on public.itinerary_items for select to authenticated using (exists (select 1 from public.itinerary_days join public.trips on trips.id = itinerary_days.trip_id where itinerary_days.id = itinerary_items.itinerary_day_id and trips.user_id = (select auth.uid())));
create policy "itinerary_items_insert_own" on public.itinerary_items for insert to authenticated with check (exists (select 1 from public.itinerary_days join public.trips on trips.id = itinerary_days.trip_id where itinerary_days.id = itinerary_items.itinerary_day_id and trips.user_id = (select auth.uid())));
create policy "itinerary_items_update_own" on public.itinerary_items for update to authenticated using (exists (select 1 from public.itinerary_days join public.trips on trips.id = itinerary_days.trip_id where itinerary_days.id = itinerary_items.itinerary_day_id and trips.user_id = (select auth.uid()))) with check (exists (select 1 from public.itinerary_days join public.trips on trips.id = itinerary_days.trip_id where itinerary_days.id = itinerary_items.itinerary_day_id and trips.user_id = (select auth.uid())));
create policy "itinerary_items_delete_own" on public.itinerary_items for delete to authenticated using (exists (select 1 from public.itinerary_days join public.trips on trips.id = itinerary_days.trip_id where itinerary_days.id = itinerary_items.itinerary_day_id and trips.user_id = (select auth.uid())));
