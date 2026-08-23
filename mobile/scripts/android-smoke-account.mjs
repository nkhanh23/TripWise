import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

function parseEnvironment(text) {
  return Object.fromEntries(text.split(/\r?\n/u).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [];
    const separator = trimmed.indexOf('=');
    return separator < 1 ? [] : [[trimmed.slice(0, separator), trimmed.slice(separator + 1)]];
  }));
}

const fileEnvironment = parseEnvironment(await readFile(resolve('.env'), 'utf8'));
const url = fileEnvironment.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('Ephemeral Android smoke admin configuration is missing.');

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const action = process.argv[2];

if (action === 'create') {
  const email = process.env.INT_P2_ANDROID_EMAIL;
  const password = process.env.INT_P2_ANDROID_PASSWORD;
  if (!email || !password) throw new Error('Ephemeral Android smoke credentials are missing.');
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: 'Android Smoke Owner' },
  });
  if (error || !data.user) throw error ?? new Error('Android smoke user was not created.');
  process.stdout.write(data.user.id);
} else if (action === 'delete') {
  const userId = process.argv[3];
  if (!userId) throw new Error('Android smoke user id is missing.');
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
  process.stdout.write('deleted');
} else {
  throw new Error('Unknown Android smoke account action.');
}
