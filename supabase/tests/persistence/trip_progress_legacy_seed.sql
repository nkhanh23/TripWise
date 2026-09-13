-- Executes immediately BEFORE the P6 migration in the upgrade chain.
insert into public.trips(id,user_id,title,destination,start_date,end_date) values
('77000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Pre P6','Hue','2028-01-01','2028-01-01');
insert into public.itinerary_days(id,trip_id,day_number,date) values
('77000000-0000-4000-8000-000000000011','77000000-0000-4000-8000-000000000001',1,'2028-01-01');
insert into public.itinerary_items(id,itinerary_day_id,position,place_name) values
('77000000-0000-4000-8000-000000000021','77000000-0000-4000-8000-000000000011',1,'Completed before P6'),
('77000000-0000-4000-8000-000000000022','77000000-0000-4000-8000-000000000011',2,'Skipped before P6');
update public.itinerary_items set activity_status='completed' where id='77000000-0000-4000-8000-000000000021';
update public.itinerary_items set activity_status='skipped' where id='77000000-0000-4000-8000-000000000022';
create temporary table progress_legacy_timestamps as select id,completed_at,skipped_at from public.itinerary_items
where itinerary_day_id='77000000-0000-4000-8000-000000000011';
-- Persist the comparison across psql sessions using a test-only schema table.
create table auth.progress_legacy_timestamps as table progress_legacy_timestamps;
