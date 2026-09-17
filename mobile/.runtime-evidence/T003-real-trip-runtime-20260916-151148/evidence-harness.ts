import { createClient } from '@supabase/supabase-js';
import { SupabaseSavedTripsRepository, SupabaseTripPersistenceRepository } from '../../src/integration/remote/supabaseTripRepositories';
import { generateReminderCandidates } from '../../src/integration/reminderEngine';

import type { Database } from '../../src/lib/supabase/database.types';
import { readFileSync } from 'node:fs';

function readEnv(name: string): string {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    const line = readFileSync(file, 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim();
  }
  throw new Error(`Missing ${name}`);
}

function localDate(timezone: string, offsetDays: number): string {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + offsetDays));
  return date.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  // The Android production client reaches the local DEV gateway through 10.0.2.2;
  // this evidence harness runs on the host and reaches the same gateway loopback.
  const url = readEnv('EXPO_PUBLIC_SUPABASE_URL').replace('10.0.2.2', '127.0.0.1');
  const key = readEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const credentialsSource = readFileSync('../setup_valid_db.js', 'utf8');
  const password = /crypt\('([^']+)'/.exec(credentialsSource)?.[1];
  const email = /email\s*=\s*'([^']+)'/.exec(credentialsSource)?.[1];
  if (!email || !password) throw new Error('Existing local DEV evidence credential unavailable');
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await client.auth.signInWithPassword({ email, password });
  if (authError || !auth.session || !auth.user) throw new Error('Real local Supabase authentication failed');

  const timezone = 'Asia/Bangkok';
  const startDate = localDate(timezone, 1);
  const endDate = startDate;
  const command = {
    idempotencyKey: `t003-evidence-${Date.now()}`,
    graph: {
      title: 'Disposable T003 evidence trip', destination: 'User-authored evidence destination', startDate, endDate,
      days: [{ dayNumber: 1, date: startDate, items: [{ position: 1, placeName: 'User-authored reminder anchor' }] }],
    },
  };
  const persistence = new SupabaseTripPersistenceRepository(client);
  const id = await persistence.persist(command);
  const saved = new SupabaseSavedTripsRepository(client);
  const beforeTimezone = await saved.getDetail(id);
  if (!beforeTimezone) throw new Error('Created owner trip was not readable');
  const { data: timezoneData, error: timezoneError } = await client.rpc('set_trip_timezone', {
    p_command: { tripId: id, expectedRevision: beforeTimezone.workspaceRevision, timezone },
  });
  if (timezoneError || !timezoneData) throw new Error('Owner timezone mutation failed');
  const detail = await saved.getDetail(id);
  if (!detail || detail.timezone?.timezone !== timezone) throw new Error('Parser-valid timezone readback failed');
  const candidates = generateReminderCandidates({ ownerId: auth.user.id, trips: [detail], now: Date.now() });
  process.stdout.write(JSON.stringify({
    ownerId: auth.user.id, tripId: id, creationPath: 'SupabaseTripPersistenceRepository.persist -> public.create_trip_graph',
    timezoneMutationPath: 'public.set_trip_timezone owner-scoped RPC', startDate, endDate,
    workspaceRevision: detail.workspaceRevision, timezone: detail.timezone, days: detail.days,
    candidateTypes: candidates.map((candidate) => candidate.type), candidates,
  }));
}

void main();
