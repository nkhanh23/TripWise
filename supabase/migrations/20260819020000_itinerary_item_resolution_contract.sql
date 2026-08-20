alter table public.itinerary_items
  add column place_query text,
  alter column latitude drop not null,
  alter column longitude drop not null,
  add constraint itinerary_items_coordinate_pair_check
    check (
      (latitude is null and longitude is null)
      or
      (latitude is not null and longitude is not null)
    );

comment on column public.itinerary_items.place_query is
  'Optional AI-generated search hint for later provider resolution; not verified place metadata.';

comment on constraint itinerary_items_coordinate_pair_check on public.itinerary_items is
  'Coordinates are either both absent for an unresolved item or both present after verification.';
