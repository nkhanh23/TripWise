\set ON_ERROR_STOP on

insert into public.trips (
  id, user_id, title, destination, start_date, end_date, estimated_budget, currency
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111',
  'Legacy trip', 'Hue', '2026-09-01', '2026-09-01', 500.00, 'VND'
);

insert into public.itinerary_days (id, trip_id, day_number, date, summary)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, '2026-09-01', 'Legacy day'
);

insert into public.itinerary_items (
  id, itinerary_day_id, position, place_name, latitude, longitude, note
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1,
  'Imperial City', 16.463700, 107.590900, 'Legacy resolved item'
);

