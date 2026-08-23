\set ON_ERROR_STOP on

insert into public.profiles (id, display_name)
values ('11111111-1111-4111-8111-111111111111', 'Upgrade Owner');

insert into public.trips (id, user_id, title, destination, start_date, end_date)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9',
  '11111111-1111-4111-8111-111111111111',
  'Upgrade trip',
  'Hue',
  '2027-04-01',
  '2027-04-01'
);

insert into public.saved_places (user_id, google_place_id, place_name, latitude, longitude)
values (
  '11111111-1111-4111-8111-111111111111',
  'upgrade-saved-place',
  'Upgrade saved place',
  10,
  106
);
