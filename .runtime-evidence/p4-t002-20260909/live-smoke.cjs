// Evidence harness only for FEATURE-P4-T002. No credential output/storage.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const mobileRequire = createRequire(path.join(root, 'mobile/package.json'));
const ts = mobileRequire('typescript');
const { createClient } = mobileRequire('@supabase/supabase-js');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
const parseEnv = (text) => Object.fromEntries(text.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
  return match ? [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]] : [];
}));
const cache = new Map();
const moduleHashes = {};
function load(file) {
  const absolute = path.resolve(file.endsWith('.ts') ? file : file + '.ts');
  if (!absolute.startsWith(path.join(root, 'mobile/src/integration') + path.sep)) throw Error('MODULE_SCOPE');
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8');
  moduleHashes[path.relative(root, absolute)] = sha(source);
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} }; cache.set(absolute, module);
  new Function('require', 'module', 'exports', compiled)((id) => {
    if (!id.startsWith('.')) throw Error('NONLOCAL_MODULE');
    return load(path.resolve(path.dirname(absolute), id));
  }, module, module.exports);
  return module.exports;
}
const canonical = (v) => v === null || typeof v !== 'object' ? v : Array.isArray(v) ? v.map(canonical)
  : Object.fromEntries(Object.keys(v).sort().map(key => [key, canonical(v[key])]));

async function main() {
  const equivalence = JSON.parse(fs.readFileSync(path.join(__dirname, 'dev-source-comparison-after.json'), 'utf8').replace(/^\uFEFF/, ''));
  if (equivalence.length !== 6 || equivalence.some(item => !item.Identical)) throw Error('EDGE_EQUIVALENCE_REQUIRED');
  const env = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(root, 'mobile', name);
    if (fs.existsSync(file)) Object.assign(env, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  if (new URL(url).hostname !== 'bvblyrzbkyhcreimuumu.supabase.co') throw Error('PROJECT_MISMATCH');
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw Error('PUBLIC_CONFIG_MISSING');
  const credentialPath = process.env.P4_DEV_CREDENTIALS_FILE;
  let credentials = {};
  if (credentialPath) {
    const text = fs.readFileSync(credentialPath, 'utf8').replace(/^\uFEFF/, '');
    credentials = text.trim().startsWith('{') ? JSON.parse(text) : parseEnv(text);
  }
  const email = credentials.email || credentials.P4_DEV_EMAIL || process.env.P4_DEV_EMAIL;
  const password = credentials.password || credentials.P4_DEV_PASSWORD || process.env.P4_DEV_PASSWORD;
  if (!email || !password) throw Error('NORMAL_DEV_CREDENTIALS_UNAVAILABLE');
  const network = [];
  let phase = 'auth';
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: {
    fetch: async (input, init) => {
      const target = new URL(typeof input === 'string' ? input : input.url || String(input));
      const method = init?.method || 'GET';
      if (target.origin !== new URL(url).origin) throw Error('UNEXPECTED_ORIGIN');
      if (target.pathname.startsWith('/rest/v1/') && method !== 'GET') throw Error('OWNER_MUTATION_BLOCKED');
      const entry = { phase, method, path: target.pathname, startedAt: new Date().toISOString() };
      network.push(entry);
      try {
        const response = await fetch(input, { ...init, signal: init?.signal || AbortSignal.timeout(15000) });
        entry.status = response.status;
        entry.requestId = response.headers.get('sb-request-id');
        entry.executionId = response.headers.get('x-deno-execution-id');
        entry.completedAt = new Date().toISOString();
        return response;
      } catch (e) { entry.outcome = init?.signal?.aborted ? 'ABORTED' : 'NETWORK_ERROR'; throw e; }
    },
  } });
  const auth = await client.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.user) throw Error('NORMAL_AUTH_FAILED');
  const ownerId = auth.data.user.id;
  const ownerHash = sha(ownerId);
  write('live-auth.json', { authenticated: true, method: 'signInWithPassword', ownerHash, privilegedClient: false });
  async function snapshot() {
    const tables = {};
    for (const table of ['trips', 'itinerary_days', 'itinerary_items', 'saved_places', 'trip_expenses']) {
      let query = client.from(table).select('*', { count: 'exact' }).order('id').limit(501);
      if (table === 'trips' || table === 'saved_places') query = query.eq('user_id', ownerId);
      const { data, error, count } = await query;
      if (error || !Array.isArray(data) || count !== data.length || data.length > 500) throw Error('OWNER_SNAPSHOT_INCOMPLETE');
      tables[table] = { count, sha256: sha(JSON.stringify(canonical(data))) };
    }
    return { ownerHash, tables };
  }
  const { SupabasePlaceMetadataRepository } = load(path.join(root, 'mobile/src/integration/remote/supabasePlaceMetadataRepository.ts'));
  const { validatePlaceIntelligence } = load(path.join(root, 'mobile/src/integration/placeIntelligenceContract.ts'));
  write('live-loaded-source-hashes.json', moduleHashes);
  const repository = new SupabasePlaceMetadataRepository(client);
  const placeId = 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY'; // Wat Arun
  const request = { googlePlaceId: placeId };
  write('live-smoke-request.json', request);
  phase = 'before';
  const before = await snapshot(); write('owner-data-before.json', before);
  let failure;
  try {
    phase = 'intelligence';
    const intelligence = await repository.getIntelligence(placeId);
    write('live-smoke-sanitized-response.json', {
      requestedGooglePlaceId: placeId,
      returnedProviderBoundGooglePlaceId: intelligence.googlePlaceId,
      identityBoundMatch: intelligence.googlePlaceId === placeId,
      intelligence,
    });
    if (!intelligence || !intelligence.businessStatus || !intelligence.provenance || intelligence.googlePlaceId !== placeId) {
      throw Error('INTELLIGENCE_INVALID');
    }
    phase = 'cancellation';
    const abortController = new AbortController();
    const cancellationPromise = repository.getIntelligence(placeId, abortController.signal);
    abortController.abort();
    let resultReturned = false;
    let code;
    try { await cancellationPromise; resultReturned = true; } catch (error) { code = error.code; }
    write('live-cancellation.json', {
      resultReturned,
      code,
      method: 'immediate abort after dispatch',
      clientRequestAttempts: 1,
      confirmedEdgeExecutions: 0,
      serverReceiptProven: false,
      exactUpstreamProviderTotal: 'UNKNOWN',
    });
    if (resultReturned || code !== 'cancelled') throw Error('CANCELLATION_RESULT_UNEXPECTED');
  } catch (error) { failure = error; }
  finally {
    phase = 'after';
    const after = await snapshot(); write('owner-data-after.json', after);
    const equal = JSON.stringify(before) === JSON.stringify(after);
    write('owner-data-comparison.json', { equal, resources: Object.keys(before.tables) });
    write('live-network-sanitized.json', network);
    if (!equal) throw Error('OWNER_DATA_CHANGED_STOP');
  }
  if (failure) throw failure;
  console.log('LIVE_PLACE_INTELLIGENCE_SMOKE_PASS; owner data unchanged; credentials not emitted');
}
main().catch(error => {
  const allowed = ['EDGE_EQUIVALENCE_REQUIRED', 'PROJECT_MISMATCH', 'PUBLIC_CONFIG_MISSING', 'NORMAL_DEV_CREDENTIALS_UNAVAILABLE', 'NORMAL_AUTH_FAILED', 'OWNER_SNAPSHOT_INCOMPLETE', 'INTELLIGENCE_INVALID', 'CANCELLATION_RESULT_UNEXPECTED', 'OWNER_DATA_CHANGED_STOP'];
  const code = allowed.includes(error.message) ? error.message : (['cancelled', 'unauthorized', 'providerUnavailable', 'rateLimited', 'invalidResponse', 'timeout'].includes(error.code) ? error.code : (error.message || 'HARNESS_FAILED_SAFE'));
  write('live-harness-status.json', { status: 'INCOMPLETE', code });
  console.error(code); process.exitCode = 1;
});
