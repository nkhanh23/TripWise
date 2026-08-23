import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv } from './scripts/load-local-env';

loadLocalEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  await client.auth.signInWithPassword({ email: 'sarah.j@example.com', password: 'password123' });
  const { data, error } = await client.rpc('get_saved_trip_detail', { p_trip_id: 'db5c6e22-ba18-465a-b803-f03702d4e73a' });
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
