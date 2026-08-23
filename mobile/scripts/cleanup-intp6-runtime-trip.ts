import { createClient } from '@supabase/supabase-js';

import { loadLocalEnv } from './load-local-env';
import type { Database } from '../src/lib/supabase/database.types';

loadLocalEnv();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tripId = process.env.INTP6_RUNTIME_TRIP_ID;

if (!url || !serviceRoleKey || !tripId) {
  throw new Error('Required names: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INTP6_RUNTIME_TRIP_ID.');
}

const admin = createClient<Database>(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main(): Promise<void> {
  const { data, error } = await admin.from('trips').select('user_id').eq('id', tripId).maybeSingle();
  if (error) throw new Error('Could not locate runtime trip for cleanup.');
  if (!data) {
    process.stdout.write('PASS runtime trip already absent\n');
    return;
  }
  const deleted = await admin.from('trips').delete().eq('id', tripId);
  if (deleted.error) throw new Error('Runtime trip cleanup failed.');
  const removed = await admin.auth.admin.deleteUser(data.user_id);
  if (removed.error) throw new Error('Runtime auth user cleanup failed.');
  process.stdout.write('PASS runtime trip and disposable user cleaned up\n');
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Cleanup failed.'}\n`);
  process.exitCode = 1;
});
