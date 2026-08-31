import { createClient } from '@supabase/supabase-js';
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
async function run() {
  const email = 'tripwise-int-p3-' + Date.now() + '@gmail.com';
  const password = 'Tw!Password123';
  const { data: created } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: 'INT P3 smoke' },
  });
  const { data: signIn } = await client.auth.signInWithPassword({ email, password });
  const token = signIn.session.access_token;
  const res = await fetch(url + '/functions/v1/generate-trip', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({
      destination: 'Nha Trang', startDate: '2026-09-10', endDate: '2026-09-12', travelers: 2, budget: 1000, currency: 'USD',
    })
  });
  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', text);
  await admin.auth.admin.deleteUser(created.user.id);
}
run();

