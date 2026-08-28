import { createClient } from '@supabase/supabase-js';

import type { Database } from '../src/lib/supabase/database.types';
import { mapGeneratedTripToPlannerPreview, mapWizardStateToGenerateTripRequest } from '../src/features/planner/generationContracts';
import { SupabaseTripGenerationRepository } from '../src/integration/remote/supabaseTripRepositories';

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`Smoke assertion failed: ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error('Live smoke configuration is missing.');
}

const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const email = `tripwise-int-p3-${suffix}@gmail.com`;
const password = `Tw!${suffix}A1`;
const admin = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
let userId: string | null = null;

async function run(): Promise<void> {
try {
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { display_name: 'INT P3 smoke' },
  });
  if (createError || !created.user) throw createError ?? new Error('Disposable user was not created.');
  userId = created.user.id;
  assert(Boolean(userId), 'disposable authenticated user created');

  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) throw signInError ?? new Error('Disposable user could not sign in.');
  assert(signIn.user.id === userId, 'authenticated client session belongs to disposable user');

  const { count: beforeCount, error: beforeError } = await client.from('trips').select('id', { count: 'exact', head: true });
  if (beforeError) throw beforeError;
  const repository = new SupabaseTripGenerationRepository(client);
  const generated = await repository.generate(mapWizardStateToGenerateTripRequest({
    destination: { id: 'smoke-bangkok', name: 'Bangkok', formattedAddress: 'Thailand', imageUrl: '' },
    customDestinationName: 'Bangkok', startDate: '2026-09-10', endDate: '2026-09-11', durationDays: 2,
    selectedStyles: ['culture', 'food'], pace: 'moderate', budget: 'moderate', groupType: 'couple', tripTitle: 'Smoke title',
  }));
  const preview = mapGeneratedTripToPlannerPreview(generated);
  assert(preview.days.length === 2, 'production validator accepted the generated inclusive day count');
  assert(preview.days.every((day, dayIndex) => day.dayNumber === dayIndex + 1
    && day.items.every((item, itemIndex) => item.position === itemIndex + 1 && item.resolution === 'UNRESOLVED')),
  'production mapper preserved ordered unresolved suggestions');

  const { count: afterCount, error: afterError } = await client.from('trips').select('id', { count: 'exact', head: true });
  if (afterError) throw afterError;
  assert(afterCount === beforeCount, 'generate-trip made zero database trip writes');
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    process.stdout.write('PASS disposable auth user cleaned up\n');
  }
}
}

void run().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError';
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : 'unknown';
  process.stderr.write(`FAIL live generation smoke: ${name} code=${code}\n`);
  process.exitCode = 1;
});
