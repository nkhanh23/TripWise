const { execSync } = require('child_process');
const fs = require('fs');

const sqls = [
  "DELETE FROM public.itinerary_days WHERE trip_id IN (SELECT id FROM public.trips WHERE title = 'Prod Evidence Trip');",
  "DELETE FROM public.trips WHERE title = 'Prod Evidence Trip';",
  "DELETE FROM auth.users WHERE email = 'prod_evid@example.com';",
  `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prod_evid@example.com', crypt('Password123!', gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"email_verified":true}', now(), now(), '', '', '', '');`,
  `INSERT INTO public.trips (id, user_id, title, destination, start_date, end_date, schedule_timezone, timezone_provenance, timezone_confirmed_at, workspace_revision) VALUES ('14008a24-f3e6-4cbd-90b8-ff38588072c7', (SELECT id FROM auth.users WHERE email = 'prod_evid@example.com'), 'Prod Evidence Trip', '{"name":"London"}', (CURRENT_DATE + INTERVAL '1 day')::date, (CURRENT_DATE + INTERVAL '2 days')::date, 'Europe/London', 'USER_CONFIRMED', now(), 1);`,
  `INSERT INTO public.itinerary_days (id, trip_id, day_number, date) VALUES (gen_random_uuid(), '14008a24-f3e6-4cbd-90b8-ff38588072c7', 1, (CURRENT_DATE + INTERVAL '1 day')::date);`,
  `INSERT INTO public.itinerary_days (id, trip_id, day_number, date) VALUES (gen_random_uuid(), '14008a24-f3e6-4cbd-90b8-ff38588072c7', 2, (CURRENT_DATE + INTERVAL '2 days')::date);`,
  "UPDATE public.notification_preferences SET trip_reminders=false WHERE user_id=(SELECT id FROM auth.users WHERE email='prod_evid@example.com');"
];

for (let i = 0; i < sqls.length; i++) {
  fs.writeFileSync(`s${i}.sql`, sqls[i]);
  try {
    const res = execSync(`npx supabase db query -f s${i}.sql`, { encoding: 'utf-8' });
    console.log(res);
  } catch (e) {
    console.error(e.stderr || e.stdout);
  }
}
