import { randomBytes } from 'node:crypto';
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

function assert(condition, label) {
  if (!condition) throw new Error(`Smoke assertion failed: ${label}`);
  process.stdout.write(`PASS ${label}\n`);
}

const fileEnvironment = parseEnvironment(await readFile(resolve('.env'), 'utf8'));
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnvironment.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? fileEnvironment.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSeed = process.env.INT_P2_ADMIN_SEED === 'true';
const publicSignupOnly = process.env.INT_P2_PUBLIC_SIGNUP_ONLY === 'true';

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error('Live smoke requires mobile public config plus an ephemeral SUPABASE_SERVICE_ROLE_KEY environment variable.');
}

const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anonymous = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
const users = [];
const suffix = `${Date.now()}-${randomBytes(6).toString('hex')}`;
const password = `Tw!${randomBytes(18).toString('base64url')}`;

function newUserClient() {
  return createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function register(label) {
  const email = `tripwise-int-p2-${label}-${suffix}@gmail.com`;
  const client = newUserClient();
  const { data, error } = adminSeed
    ? await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { display_name: `INT P2 ${label}` },
    })
    : await client.auth.signUp({
      email, password, options: { data: { display_name: `INT P2 ${label}` } },
    });
  if (error || !data.user) throw error ?? new Error(`No auth user returned for ${label}`);
  users.push(data.user.id);
  assert(Boolean(data.user.id), adminSeed
    ? `${label} admin-seeded for partial login/profile/RLS smoke (public signup not exercised)`
    : `${label} registered through public Auth API`);

  if (!adminSeed && !data.session) {
    const { error: confirmError } = await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
    if (confirmError) throw confirmError;
  }
  const { data: login, error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError || !login.session) throw loginError ?? new Error(`No login session returned for ${label}`);
  assert(login.user.id === data.user.id, `${label} login returned the created auth identity`);
  return { client, email, id: data.user.id };
}

async function ownProfile(account) {
  const { data, error } = await account.client.from('profiles')
    .select('id,display_name,avatar_url,created_at,updated_at').eq('id', account.id).single();
  if (error) throw error;
  return data;
}

async function verifyPublicSignupLifecycle() {
  const email = `tripwise-int-p2-signup-${suffix}@gmail.com`;
  const client = newUserClient();
  const { data, error } = await client.auth.signUp({
    email, password, options: { data: { display_name: 'INT P2 public signup' } },
  });
  if (error || !data.user) throw error ?? new Error('Public signup returned no auth user.');
  users.push(data.user.id);
  assert(Boolean(data.user.id), 'public signUp returned an auth user');
  assert(
    data.session === null || data.session.user.id === data.user.id,
    'public signUp returned a valid nullable session contract',
  );
  if (data.session) {
    assert(data.session.user.id === data.user.id, 'public signUp returned an immediate authenticated session');
  } else {
    assert(true, 'public signUp returned a confirmation-required no-session response');
  }

  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('id,display_name').eq('id', data.user.id).single();
  if (profileError) throw profileError;
  assert(profile.id === data.user.id, 'public signup trigger created the matching profile');
  assert(profile.display_name === 'INT P2 public signup', 'public signup profile preserved display-name metadata');
}

let smokeFailure;
try {
  if (publicSignupOnly) {
    await verifyPublicSignupLifecycle();
  } else {
    const userA = await register('a');
    const userB = await register('b');

    const profileA = await ownProfile(userA);
    const profileB = await ownProfile(userB);
    assert(profileA.id === userA.id && profileB.id === userB.id, 'signup trigger created matching profiles');
    assert(profileA.display_name === 'INT P2 a', 'profile metadata lifecycle preserved display name');

    const updatedName = `INT P2 verified ${suffix}`;
    const { data: updated, error: updateError } = await userA.client.from('profiles')
      .update({ display_name: updatedName }).eq('id', userA.id).select('id,display_name').single();
    if (updateError) throw updateError;
    assert(updated.display_name === updatedName, 'User A updated own profile through RLS');
    assert((await ownProfile(userA)).display_name === updatedName, 'remote read observed User A profile update');

    const { data: aReadsB, error: aReadsBError } = await userA.client.from('profiles')
      .select('id').eq('id', userB.id);
    assert(!aReadsBError && aReadsB.length === 0, 'User A cannot read User B profile');
    const { data: aUpdatesB, error: aUpdatesBError } = await userA.client.from('profiles')
      .update({ display_name: 'forbidden-write' }).eq('id', userB.id).select('id');
    assert(!aUpdatesBError && aUpdatesB.length === 0, 'User A cannot update User B profile');
    assert((await ownProfile(userB)).display_name === 'INT P2 b', 'User B profile remained unchanged');

    const { data: bReadsA, error: bReadsAError } = await userB.client.from('profiles')
      .select('id').eq('id', userA.id);
    assert(!bReadsAError && bReadsA.length === 0, 'User B cannot read User A profile');
    const { data: anonymousRead } = await anonymous.from('profiles').select('id').eq('id', userA.id);
    assert(!anonymousRead || anonymousRead.length === 0, 'anonymous profile access is blocked');

    const { error: signOutError } = await userA.client.auth.signOut();
    if (signOutError) throw signOutError;
    const { data: afterSignOut } = await userA.client.from('profiles').select('id').eq('id', userA.id);
    assert(!afterSignOut || afterSignOut.length === 0, 'authenticated profile access stops after sign-out');

    const { data: loginAgain, error: loginAgainError } = await userA.client.auth.signInWithPassword({
      email: userA.email, password,
    });
    if (loginAgainError || !loginAgain.session) throw loginAgainError ?? new Error('No second login session');
    assert((await ownProfile(userA)).id === userA.id, 'login again restores authenticated profile access');
  }
} catch (error) {
  smokeFailure = error;
} finally {
  let cleanupSucceeded = true;
  for (const id of users.reverse()) {
    const { error } = await admin.auth.admin.deleteUser(id);
    cleanupSucceeded = cleanupSucceeded && !error;
  }
  if (users.length > 0) {
    const { data, error } = await admin.from('profiles').select('id').in('id', users);
    cleanupSucceeded = cleanupSucceeded && !error && data.length === 0;
  }
  if (users.length > 0) assert(cleanupSucceeded, 'disposable auth users and profile data cleaned up exactly');
}

if (smokeFailure) {
  const status = typeof smokeFailure === 'object' && smokeFailure !== null && 'status' in smokeFailure
    ? String(smokeFailure.status)
    : 'unknown';
  const code = typeof smokeFailure === 'object' && smokeFailure !== null && 'code' in smokeFailure
    ? String(smokeFailure.code)
    : 'unknown';
  process.stderr.write(`FAIL live smoke: status=${status} code=${code}\n`);
  process.exitCode = 1;
}
