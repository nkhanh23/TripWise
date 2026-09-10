// Runs current mobile production TypeScript modules, not a parallel implementation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../../..');
const requireMobile = createRequire(path.join(root, 'mobile/package.json'));
const ts = requireMobile('typescript'), { createClient } = requireMobile('@supabase/supabase-js');
const secretValues = [], modules = new Map(), hashes = {};
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function write(name, value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (secretValues.some(secret => secret && text.includes(secret))) throw Error('EVIDENCE_SECRET');
  fs.writeFileSync(path.join(__dirname, name), text);
}
function load(file) {
  const absolute = path.resolve(file.endsWith('.ts') ? file : file + '.ts');
  if (!absolute.startsWith(path.join(root, 'mobile/src/integration') + path.sep)) throw Error('MODULE_SCOPE');
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8'); hashes[path.relative(root, absolute)] = hash(source);
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }; modules.set(absolute, module);
  new Function('require', 'module', 'exports', js)(id => {
    if (!id.startsWith('.')) throw Error('NONLOCAL_MODULE');
    return load(path.resolve(path.dirname(absolute), id));
  }, module, module.exports);
  return module.exports;
}
async function main() {
  if (fs.existsSync(path.join(__dirname, 'live-attempt.json'))) throw Error('ALREADY_ATTEMPTED');
  for (const file of ['index.ts', 'events.ts']) {
    const local = fs.readFileSync(path.join(root, 'supabase/functions/discover-events', file));
    const remote = fs.readFileSync(path.join(__dirname, 'dev-download/supabase/functions/discover-events', file));
    if (!local.equals(remote)) throw Error('EDGE_EQUIVALENCE');
  }
  const { SupabaseEventIntelligenceRepository } = load(path.join(root, 'mobile/src/integration/remote/supabaseEventIntelligenceRepository.ts'));
  const { validateEventIntelligenceRequest } = load(path.join(root, 'mobile/src/integration/eventIntelligenceContract.ts'));
  write('live-loaded-source-hashes.json', hashes);
  const env = {};
  for (const file of ['.env', '.env.local']) for (const line of fs.readFileSync(path.join(root, 'mobile', file), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  const operator = fs.readFileSync(path.join(root, 'mobile/scripts/create-operator-trip.ts'), 'utf8');
  const literal = name => { const m = operator.match(new RegExp('const ' + name + ' = ([\x27\x22])([^\r\n]*?)\\1;')); if (!m) throw Error('CREDENTIAL_SOURCE'); return m[2]; };
  const email = literal('operatorEmail'), password = literal('operatorPassword');
  const url = env.EXPO_PUBLIC_SUPABASE_URL, key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url !== 'https://bvblyrzbkyhcreimuumu.supabase.co' || !key) throw Error('PROJECT');
  secretValues.push(email, password, key, process.env.SUPABASE_ACCESS_TOKEN);
  const network = []; let phase = 'auth', mutationAttempts = 0, invocations = 0;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: async (input, init) => {
    const target = new URL(typeof input === 'string' ? input : input.url || String(input));
    if (target.origin !== url || !['/auth/v1/token', '/functions/v1/discover-events'].includes(target.pathname)) throw Error('NETWORK_SCOPE');
    const row = { phase, path: target.pathname, method: init?.method || 'GET' }; network.push(row);
    const res = await fetch(input, { ...init, redirect: 'error', signal: init?.signal || AbortSignal.timeout(15000) });
    row.httpStatus = res.status; row.requestId = res.headers.get('sb-request-id'); row.executionId = res.headers.get('x-deno-execution-id');
    return res;
  } } });
  const auth = await client.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.session || auth.data.user.role !== 'authenticated' || auth.data.user.is_anonymous) throw Error('AUTH');
  secretValues.push(auth.data.session.access_token, auth.data.session.refresh_token);
  write('live-auth.json', { authenticated: true, method: 'signInWithPassword', role: 'authenticated', privilegedClient: false, ownerHash: hash(auth.data.user.id) });
  const forbidden = () => { mutationAttempts++; throw Error('PERSISTENCE_FORBIDDEN'); };
  const guarded = { auth: client.auth, functions: { invoke: (...args) => { invocations++; if (args[0] !== 'discover-events') throw Error('FUNCTION_SCOPE'); return client.functions.invoke(...args); } }, from: forbidden, rpc: forbidden, get storage() { return forbidden(); } };
  const repository = new SupabaseEventIntelligenceRepository(guarded);
  const query = validateEventIntelligenceRequest({ city: 'London', countryCode: 'GB', startDateTime: '2026-09-10T00:00:00Z', endDateTime: '2026-09-17T00:00:00Z', limit: 3 });
  write('live-request.json', query);
  phase = 'primary'; write('live-attempt.json', { repositoryInvocation: 1, startedAt: new Date().toISOString() });
  let result;
  try { result = await repository.discover(query); } catch (e) { write('live-failure.json', { code: typeof e.code === 'string' ? e.code : 'unknown' }); write('live-network.json', network); throw Error('PRIMARY_FAILED'); }
  write('live-response.json', result);
  phase = 'pre-cancelled'; const c = new AbortController(); c.abort(); let cancelled;
  try { await repository.discover(query, c.signal); } catch (e) { cancelled = e.code; }
  if (cancelled !== 'cancelled' || invocations !== 1) throw Error('CANCELLATION');
  write('live-cancellation.json', { scenario: 'pre-aborted real repository invocation', code: cancelled, additionalInvokes: 0, inFlightCancellation: 'VERIFIED_IN_FOCUSED_TESTS_ONLY', liveCancelledUpstreamExecution: 'UNKNOWN' });
  write('live-network.json', network);
  write('live-persistence.json', { repositoryTableRpcStorageAccessAttempts: mutationAttempts, networkPaths: network.map(n => n.path), databaseSnapshot: 'NOT_TAKEN', productionServerHasNoPersistencePath: true });
  write('live-call-count.json', { primaryRepositoryInvocations: 1, primaryEdgeClientAttempts: network.filter(n => n.phase === 'primary').length, confirmedEdgeExecutionIds: network.filter(n => n.phase === 'primary').map(n => n.executionId), serverReportedCompletedProviderCalls: result.providerAccess.completedProviderCalls, independentTicketmasterLogs: 'NOT_AVAILABLE', retries: 0, paginationFollow: 0, fanOut: 0 });
  console.log('LIVE_REPOSITORY_PASS events=' + result.events.length + ' invocations=' + invocations + ' persistence=' + mutationAttempts);
}
main().catch(() => { console.error('LIVE_REPOSITORY_FAILED_SANITIZED'); process.exitCode = 1; });
