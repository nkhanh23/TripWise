import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createClient } from '@supabase/supabase-js';

function readEnvironment(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/u).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return [];
    const separator = trimmed.indexOf('=');
    return separator < 1 ? [] : [[trimmed.slice(0, separator), trimmed.slice(separator + 1)]];
  }));
}

function fail(label, error) {
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? String(error.status)
    : 'unknown';
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code)
    : 'unknown';
  throw new Error(`${label} failed (status=${status}, code=${code}).`);
}

function assert(condition, label) {
  if (!condition) throw new Error(`Assertion failed: ${label}.`);
  process.stdout.write(`PASS ${label}\n`);
}

const root = process.cwd();
const publicEnvironment = {
  ...readEnvironment(resolve(root, 'mobile/.env')),
  ...readEnvironment(resolve(root, 'mobile/.env.local')),
};
const privateEnvironment = readEnvironment(resolve(root, '.env.codex.local'));
const url = privateEnvironment.SUPABASE_URL ?? publicEnvironment.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = publicEnvironment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = privateEnvironment.SUPABASE_SERVICE_ROLE_KEY ?? privateEnvironment.SUPABASE_SECRET_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error('Required local-only Supabase configuration is missing.');
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function userClient() {
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function newPassword() {
  return `Tw!${randomBytes(24).toString('base64url')}`;
}

const suffix = `${Date.now()}-${randomBytes(8).toString('hex')}`;
const accounts = [];

async function createAccount(label) {
  const email = `tripwise-intp7-${label}-${suffix}@example.invalid`;
  const password = newPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: `INT-P7 ${label}` },
  });
  if (error || !data.user) fail(`create disposable ${label}`, error);

  const account = { id: data.user.id, email, password, client: userClient() };
  accounts.push(account);
  assert(Boolean(account.id), `disposable ${label} created and confirmed`);

  const { data: session, error: loginError } = await account.client.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });
  if (loginError || !session.session || session.user?.id !== account.id) {
    fail(`authenticate disposable ${label}`, loginError);
  }
  assert(true, `disposable ${label} authenticated`);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id,home_country')
    .eq('id', account.id)
    .single();
  if (profileError || profile?.id !== account.id) fail(`profile lifecycle ${label}`, profileError);
  assert(true, `disposable ${label} profile lifecycle exists`);
  return account;
}

async function createTrip(account, ordinal) {
  const graph = {
    title: `INT-P7 verification ${ordinal}`,
    destination: 'Bangkok',
    startDate: '2027-12-01',
    endDate: '2027-12-01',
    days: [{
      dayNumber: 1,
      date: '2027-12-01',
      items: [{ position: 1, placeName: `INT-P7 stop ${ordinal}` }],
    }],
  };
  const { data, error } = await account.client.rpc('create_trip_graph', {
    p_idempotency_key: `intp7-${suffix}-${ordinal}`,
    p_graph: graph,
  });
  if (error || typeof data !== 'string') fail(`create trip ${ordinal}`, error);
  return data;
}

async function savePlace(account, label) {
  const { error } = await account.client.rpc('save_place', {
    p_google_place_id: `intp7-place-${suffix}-${label}`,
    p_place_name: `INT-P7 saved place ${label}`,
    p_latitude: 13.7563,
    p_longitude: 100.5018,
    p_place_address: 'Bangkok',
    p_place_category: 'attraction',
  });
  if (error) fail(`save place ${label}`, error);
}

async function stats(account, label) {
  const { data, error } = await account.client.rpc('get_user_trip_stats');
  if (error || !data || typeof data !== 'object') fail(`read ${label} stats`, error);
  return data;
}

async function count(table, filter) {
  const { count: rowCount, error } = await admin.from(table)
    .select('id', { count: 'exact', head: true })
    .eq(filter.column, filter.value);
  if (error) fail(`count ${table}`, error);
  return rowCount ?? 0;
}

async function collectItineraryItemIds(tripIds) {
  const itemIds = [];
  for (const tripId of tripIds) {
    const { data: days, error: daysError } = await admin
      .from('itinerary_days')
      .select('id')
      .eq('trip_id', tripId);
    if (daysError) fail('collect itinerary days', daysError);
    for (const day of days) {
      const { data: items, error: itemsError } = await admin
        .from('itinerary_items')
        .select('id')
        .eq('itinerary_day_id', day.id);
      if (itemsError) fail('collect itinerary items', itemsError);
      itemIds.push(...items.map((item) => item.id));
    }
  }
  return itemIds;
}

async function assertAccountRemoved(account, tripIds, itemIds) {
  const { data: authResult, error: authError } = await admin.auth.admin.getUserById(account.id);
  assert(Boolean(authError) || !authResult.user, 'A auth user removed');
  assert(await count('profiles', { column: 'id', value: account.id }) === 0, 'A profile cascade removed');
  assert(await count('trips', { column: 'user_id', value: account.id }) === 0, 'A trip cascade removed');
  assert(await count('saved_places', { column: 'user_id', value: account.id }) === 0, 'A Saved Places cascade removed');

  for (const tripId of tripIds) {
    const { data: days, error: daysError } = await admin
      .from('itinerary_days')
      .select('id')
      .eq('trip_id', tripId);
    if (daysError) fail('verify A itinerary days', daysError);
    assert(days.length === 0, 'A itinerary-day cascade removed');
  }
  for (const itemId of itemIds) {
    assert(await count('itinerary_items', { column: 'id', value: itemId }) === 0,
      'A itinerary-item cascade removed');
  }
}

async function cleanup(account, label) {
  if (!account) return;
  const { error } = await admin.auth.admin.deleteUser(account.id, false);
  if (error) fail(`cleanup ${label}`, error);
  const { data, error: lookupError } = await admin.auth.admin.getUserById(account.id);
  assert(Boolean(lookupError) || !data.user, `cleanup ${label}`);
}

let primaryFailure;
try {
  const userA = await createAccount('a');
  const userB = await createAccount('b');
  assert(userA.id !== userB.id, 'A/B identities distinct');

  const aTripIds = [await createTrip(userA, 'a-1')];
  await savePlace(userA, 'a');
  const bTripIds = [await createTrip(userB, 'b-1'), await createTrip(userB, 'b-2')];
  await savePlace(userB, 'b');

  const aStats = await stats(userA, 'A');
  const bStats = await stats(userB, 'B');
  assert(aStats.trips_count === 1 && aStats.saved_places_count === 1,
    'A stats isolation trips=1 saved=1');
  assert(bStats.trips_count === 2 && bStats.saved_places_count === 1,
    'B stats isolation trips=2 saved=1');

  const aItemIds = await collectItineraryItemIds(aTripIds);
  assert(aItemIds.length > 0, 'A trip contains itinerary child graph');
  const { error: deleteError } = await userA.client.rpc('delete_user_account');
  if (deleteError) fail('delete A through caller-only RPC', deleteError);
  assert(true, 'delete A through caller-only RPC');
  await assertAccountRemoved(userA, aTripIds, aItemIds);

  const { data: deletedUser, error: deletedUserError } = await userA.client.auth.getUser();
  assert(Boolean(deletedUserError) || !deletedUser.user, 'deleted A session rejected');
  const { data: oldAccess, error: oldAccessError } = await userA.client
    .from('profiles')
    .select('id')
    .eq('id', userA.id);
  assert(Boolean(oldAccessError) || oldAccess.length === 0, 'deleted A cannot access protected profile data');

  const { data: bAuth, error: bAuthError } = await userB.client.auth.getUser();
  if (bAuthError || bAuth.user?.id !== userB.id) fail('verify B auth after A deletion', bAuthError);
  assert(true, 'B remains authenticated after A deletion');
  const bAfterDelete = await stats(userB, 'B after A deletion');
  assert(bAfterDelete.trips_count === 2 && bAfterDelete.saved_places_count === 1,
    'B data preserved after A deletion trips=2 saved=1');
  assert(await count('trips', { column: 'id', value: bTripIds[0] }) === 1,
    'B trip graph preserved after A deletion');
} catch (error) {
  primaryFailure = error;
} finally {
  for (const [index, account] of accounts.entries()) {
    try {
      const { data } = await admin.auth.admin.getUserById(account.id);
      if (data.user) await cleanup(account, index === 0 ? 'A residual' : 'B');
    } catch (cleanupError) {
      primaryFailure ??= cleanupError;
    }
  }
}

if (primaryFailure) {
  const message = primaryFailure instanceof Error ? primaryFailure.message : 'unknown failure';
  process.stderr.write(`FAIL profile/settings live verification: ${message}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write('PASS disposable cleanup complete\n');
}
