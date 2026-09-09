// Evidence only. Reads user-authorized credentials; never executes the trip-creation script.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const mobileRequire = createRequire(path.join(root, 'mobile/package.json'));
const { createClient } = mobileRequire('@supabase/supabase-js');
const sensitive = [];
function write(name, data) {
  const text = JSON.stringify(data, null, 2) + '\n';
  if (sensitive.some(v => v && text.includes(v))) throw Error('EVIDENCE_SECRET_REJECTED');
  fs.writeFileSync(path.join(__dirname, name), text);
}
async function main() {
  if (fs.existsSync(path.join(__dirname, 'checkpoint-live-attempt.json'))) throw Error('SINGLE_ATTEMPT_ALREADY_RECORDED');
  const equivalence = JSON.parse(fs.readFileSync(path.join(__dirname, 'checkpoint-source-equivalence.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (equivalence.length !== 2 || equivalence.some(e => !e.identical)) throw Error('SOURCE_EQUIVALENCE_REQUIRED');
  const env = {};
  for (const name of ['.env', '.env.local']) {
    const text = fs.readFileSync(path.join(root, 'mobile', name), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  const source = fs.readFileSync(path.join(root, 'mobile/scripts/create-operator-trip.ts'), 'utf8');
  const literal = name => { const m = source.match(new RegExp('const ' + name + ' = ([\x27\x22])([^\r\n]*?)\\1;')); if (!m) throw Error('CREDENTIAL_SOURCE_UNSUPPORTED'); return m[2]; };
  const email = literal('operatorEmail'), password = literal('operatorPassword');
  sensitive.push(password, email, process.env.SUPABASE_ACCESS_TOKEN);
  const url = env.EXPO_PUBLIC_SUPABASE_URL, key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== 'https://bvblyrzbkyhcreimuumu.supabase.co' || !key) throw Error('PUBLIC_CONFIG_INVALID');
  sensitive.push(key);
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) } });
  const auth = await client.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.session || !auth.data.user || auth.data.user.is_anonymous || auth.data.user.role !== 'authenticated') throw Error('NORMAL_USER_AUTH_FAILED');
  sensitive.push(auth.data.session.access_token, auth.data.session.refresh_token);
  write('checkpoint-live-auth.json', { authenticated: true, method: 'signInWithPassword', role: 'authenticated', anonymous: false, privilegedClient: false, ownerHash: crypto.createHash('sha256').update(auth.data.user.id).digest('hex') });
  const query = { city: 'London', countryCode: 'GB', startDateTime: '2026-09-10T00:00:00Z', endDateTime: '2026-09-17T00:00:00Z', limit: 3 };
  write('checkpoint-live-request.json', query);
  write('checkpoint-live-attempt.json', { clientAttempts: 1, startedAt: new Date().toISOString(), function: 'discover-events', providerRetries: 0 });
  const result = await fetch(url + '/functions/v1/discover-events', { method: 'POST', headers: { apikey: key, authorization: 'Bearer ' + auth.data.session.access_token, 'content-type': 'application/json' }, body: JSON.stringify(query), signal: AbortSignal.timeout(20000), redirect: 'error' });
  const raw = await result.text();
  if (Buffer.byteLength(raw) > 16384) throw Error('EDGE_RESPONSE_OVERSIZED');
  let body; try { body = JSON.parse(raw); } catch { throw Error('EDGE_RESPONSE_NOT_JSON'); }
  const network = { clientAttempts: 1, httpStatus: result.status, requestId: result.headers.get('sb-request-id'), executionId: result.headers.get('x-deno-execution-id'), completedAt: new Date().toISOString() };
  write('checkpoint-live-network.json', network);
  if (!result.ok) {
    const allowed = ['EVENT_PROVIDER_AUTH','EVENT_PROVIDER_CONFIG_MISSING','EVENT_PROVIDER_RATE_LIMITED','EVENT_PROVIDER_UNAVAILABLE','EVENT_PROVIDER_TIMEOUT','EVENT_CANCELLED','EVENT_PROVIDER_INVALID_RESPONSE','UNAUTHORIZED','EVENT_INPUT_INVALID','INTERNAL_ERROR'];
    const code = allowed.includes(body?.error?.code) ? body.error.code : 'UNCLASSIFIED_EDGE_ERROR';
    write('checkpoint-live-response.json', { error: { code } });
    console.log('LIVE_HTTP=' + result.status + ' CODE=' + code); process.exitCode = 1; return;
  }
  if (!Array.isArray(body?.data?.events) || body.data.events.length > 3 || body.data.providerAccess?.completedProviderCalls !== 1) throw Error('NORMALIZED_RESPONSE_INVALID');
  write('checkpoint-live-response.json', body);
  write('checkpoint-call-count.json', { edgeClientAttempts: 1, confirmedEdgeExecutions: network.executionId ? 1 : null, completedProviderCallsReportedByVerifiedServerSource: body.data.providerAccess.completedProviderCalls, providerHttpStatus: body.data.providerAccess.httpStatus, providerIndependentAccessLog: 'NOT_AVAILABLE', cancellationLiveTest: 'NOT_RUN', automaticRetries: 0, paginationLoops: 0, perEventFanOut: 0 });
  console.log('LIVE_HTTP=' + result.status + ' EVENTS=' + body.data.events.length);
}
main().catch(() => { console.error('CHECKPOINT_SMOKE_FAILED_NO_SECRET_DETAILS'); process.exitCode = 1; });
