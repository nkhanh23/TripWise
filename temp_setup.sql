
      DELETE FROM public.trip_progress_events WHERE trip_id = '71000000-0000-4000-8000-000000000001';
      DELETE FROM public.itinerary_items WHERE id = '73000000-0000-4000-8000-000000000001';
      DELETE FROM public.itinerary_days WHERE id = '72000000-0000-4000-8000-000000000001';
      DELETE FROM public.trips WHERE id = '71000000-0000-4000-8000-000000000001';

      INSERT INTO public.trips (id, user_id, title, destination, start_date, end_date) VALUES ('71000000-0000-4000-8000-000000000001', '8bd1a4d4-0605-43be-a895-85a98322242f', 'Remote Test', 'Hue', '2028-01-01', '2028-01-01');
      INSERT INTO public.itinerary_days (id, trip_id, day_number, date) VALUES ('72000000-0000-4000-8000-000000000001', '71000000-0000-4000-8000-000000000001', 1, '2028-01-01');
      INSERT INTO public.itinerary_items (id, itinerary_day_id, position, place_name, activity_status) VALUES ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 1, 'Test', 'scheduled');
    