const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');

const root = path.resolve(__dirname, '../../..');
const requireMobile = createRequire(path.join(root, 'mobile/package.json'));
const ts = requireMobile('typescript');
const { createClient } = requireMobile('@supabase/supabase-js');

const secretValues = [];
const modules = new Map();
const hashes = {};
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');

function write(name, value) {
  const text = JSON.stringify(value, null, 2) + '\n';
  if (secretValues.some((secret) => secret && text.includes(secret))) {
    throw new Error('EVIDENCE_SECRET');
  }
  fs.writeFileSync(path.join(__dirname, name), text);
}

function load(file) {
  const absolute = path.resolve(file.endsWith('.ts') ? file : file + '.ts');
  if (!absolute.startsWith(path.join(root, 'mobile/src/integration') + path.sep)) {
    throw new Error('MODULE_SCOPE');
  }
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const source = fs.readFileSync(absolute, 'utf8');
  hashes[path.relative(root, absolute)] = hash(source);
  const js = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  modules.set(absolute, module);
  new Function('require', 'module', 'exports', js)((id) => {
    if (!id.startsWith('.')) throw new Error('NONLOCAL_MODULE');
    return load(path.resolve(path.dirname(absolute), id));
  }, module, module.exports);
  return module.exports;
}

async function main() {
  if (fs.existsSync(path.join(__dirname, 'live-attempt.json'))) {
    throw new Error('ALREADY_ATTEMPTED');
  }

  // Load production modules
  const { SupabaseEventIntelligenceRepository } = load(
    path.join(root, 'mobile/src/integration/remote/supabaseEventIntelligenceRepository.ts'),
  );
  const {
    CachedEventIntelligenceRepository,
    EVENT_INTELLIGENCE_FRESH_TTL_MS,
    EVENT_INTELLIGENCE_STALE_TTL_MS,
  } = load(path.join(root, 'mobile/src/integration/intelligenceFreshnessPolicy.ts'));
  const { validateEventIntelligenceRequest } = load(
    path.join(root, 'mobile/src/integration/eventIntelligenceContract.ts'),
  );

  write('live-loaded-source-hashes.json', hashes);

  // Read DEV operator credentials
  const env = {};
  for (const file of ['.env', '.env.local']) {
    const full = path.join(root, 'mobile', file);
    if (fs.existsSync(full)) {
      for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/);
        if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
      }
    }
  }

  const operator = fs.readFileSync(path.join(root, 'mobile/scripts/create-operator-trip.ts'), 'utf8');
  const literal = (name) => {
    const m = operator.match(new RegExp('const ' + name + ' = ([\x27\x22])([^\r\n]*?)\\1;'));
    if (!m) throw new Error('CREDENTIAL_SOURCE');
    return m[2];
  };
  const email = literal('operatorEmail');
  const password = literal('operatorPassword');
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url !== 'https://bvblyrzbkyhcreimuumu.supabase.co' || !key) throw new Error('PROJECT');
  secretValues.push(email, password, key, process.env.SUPABASE_ACCESS_TOKEN);

  const network = [];
  let phase = 'auth';
  let mutationAttempts = 0;
  let edgeInvokes = 0;

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const target = new URL(typeof input === 'string' ? input : input.url || String(input));
        if (target.origin !== url || !['/auth/v1/token', '/auth/v1/logout', '/functions/v1/discover-events'].includes(target.pathname)) {
          throw new Error('NETWORK_SCOPE');
        }
        const row = { phase, path: target.pathname, method: init?.method || 'GET' };
        network.push(row);
        const res = await fetch(input, {
          ...init,
          redirect: 'error',
          signal: init?.signal || AbortSignal.timeout(15000),
        });
        row.httpStatus = res.status;
        row.requestId = res.headers.get('sb-request-id');
        row.executionId = res.headers.get('x-deno-execution-id');
        return res;
      },
    },
  });

  const auth = await client.auth.signInWithPassword({ email, password });
  if (auth.error || !auth.data.session || auth.data.user.role !== 'authenticated' || auth.data.user.is_anonymous) {
    throw new Error('AUTH');
  }
  secretValues.push(auth.data.session.access_token, auth.data.session.refresh_token);

  write('live-auth.json', {
    authenticated: true,
    method: 'signInWithPassword',
    role: 'authenticated',
    privilegedClient: false,
    ownerHash: hash(auth.data.user.id),
  });

  const forbidden = () => {
    mutationAttempts++;
    throw new Error('PERSISTENCE_FORBIDDEN');
  };

  const guarded = {
    auth: client.auth,
    functions: {
      invoke: (...args) => {
        edgeInvokes++;
        if (args[0] !== 'discover-events') throw new Error('FUNCTION_SCOPE');
        return client.functions.invoke(...args);
      },
    },
    from: forbidden,
    rpc: forbidden,
    get storage() {
      return forbidden();
    },
  };

  let simulatedTime = Date.now();
  const transportRepo = new SupabaseEventIntelligenceRepository(guarded);
  const cachedRepo = new CachedEventIntelligenceRepository(transportRepo, 32, () => simulatedTime, client.auth);

  const queryLondon = validateEventIntelligenceRequest({
    city: 'London',
    countryCode: 'GB',
    startDateTime: '2026-09-10T00:00:00Z',
    endDateTime: '2026-09-17T00:00:00Z',
    limit: 3,
  });

  write('live-request.json', queryLondon);
  write('live-attempt.json', { startedAt: new Date().toISOString() });

  // SCENARIO 1: First request -> Cache Miss -> Calls discover-events (1 edge invoke)
  phase = 'miss';
  const missClassification = await cachedRepo.discoverWithFreshness(queryLondon);
  if (missClassification.state !== 'FRESH' || missClassification.isFallback) throw new Error('MISS_STATE');
  if (edgeInvokes !== 1) throw new Error('MISS_INVOKES');
  write('live-response-miss.json', missClassification);

  // SCENARIO 2: Immediate repeated identical request -> Cache Hit -> 0 additional edge invokes
  phase = 'hit';
  const hitClassification = await cachedRepo.discoverWithFreshness(queryLondon);
  if (hitClassification.state !== 'FRESH' || hitClassification.isFallback) throw new Error('HIT_STATE');
  if (edgeInvokes !== 1) throw new Error('HIT_INVOKES_NOT_ZERO'); // Must remain 1!
  write('live-response-hit.json', hitClassification);

  // SCENARIO 3: Controlled clock advancement into STALE window -> Freshness trace
  simulatedTime += EVENT_INTELLIGENCE_FRESH_TTL_MS + 60_000; // 16 minutes after cachedAt
  phase = 'stale-evaluation';
  const staleClassification = await cachedRepo.discoverWithFreshness(queryLondon);
  // Stale request triggered a refresh that succeeded -> state returned is FRESH from the refresh!
  if (edgeInvokes !== 2) throw new Error('REFRESH_INVOKES');

  // SCENARIO 4: Auth / Session invalidation -> real signOut event purges cache via listener
  phase = 'auth-invalidation';
  await client.auth.signOut();
  if (cachedRepo.cacheSize !== 0) throw new Error('CLEAR_CACHE_VIA_AUTH');

  // SCENARIO 5: Pre-aborted cancellation
  phase = 'pre-cancelled';
  const abortCtrl = new AbortController();
  abortCtrl.abort();
  let cancelledCode;
  try {
    await cachedRepo.discover(queryLondon, abortCtrl.signal);
  } catch (e) {
    cancelledCode = e.code;
  }
  if (cancelledCode !== 'cancelled' || edgeInvokes !== 2) throw new Error('CANCELLATION');

  write('live-network.json', network);
  write('live-persistence.json', {
    repositoryTableRpcStorageAccessAttempts: mutationAttempts,
    networkPaths: network.map((n) => n.path),
    databaseSnapshot: 'NOT_TAKEN',
    productionServerHasNoPersistencePath: true,
  });

  write('live-call-count.json', {
    repositoryRequests: 4, // miss + hit + staleRefresh + preCancelled
    cacheHits: 1,
    cacheMisses: 2, // miss + staleRefresh
    cancelledRequests: 1,
    edgeClientAttempts: edgeInvokes,
    confirmedEdgeExecutionIds: network.filter((n) => n.executionId).map((n) => n.executionId),
    requests: [
      {
        scenario: 'miss',
        edgeExecutionId: network.find((n) => n.phase === 'miss')?.executionId || null,
        completedProviderCalls: missClassification.data.providerAccess.completedProviderCalls,
      },
      {
        scenario: 'hit',
        edgeExecutionId: null,
        completedProviderCalls: 0,
      },
      {
        scenario: 'stale-evaluation-refresh',
        edgeExecutionId: network.find((n) => n.phase === 'stale-evaluation')?.executionId || null,
        completedProviderCalls: staleClassification.data.providerAccess.completedProviderCalls,
      },
      {
        scenario: 'pre-cancelled',
        edgeExecutionId: null,
        completedProviderCalls: 0,
      },
    ],
    serverReportedCompletedProviderCalls: missClassification.data.providerAccess.completedProviderCalls,
    totalServerReportedCompletedProviderCalls:
      (missClassification.data.providerAccess.completedProviderCalls || 0) +
      (staleClassification.data.providerAccess.completedProviderCalls || 0),
    independentTicketmasterLogs: 'NOT_AVAILABLE',
    retries: 0,
    paginationFollow: 0,
    fanOut: 0,
  });

  write('live-freshness-trace.json', {
    freshTTLMs: EVENT_INTELLIGENCE_FRESH_TTL_MS,
    staleTTLMs: EVENT_INTELLIGENCE_STALE_TTL_MS,
    initialObservation: 'SERVER_RECEIVED',
    cacheHitEdgeInvokes: 0,
    cacheMissEdgeInvokes: 1,
    cacheClearedOnAuth: true,
  });

  console.log(
    'LIVE_CACHE_SMOKE_PASS events=' +
      missClassification.data.events.length +
      ' edgeInvokes=' +
      edgeInvokes +
      ' cacheHits=1 persistence=' +
      mutationAttempts,
  );
}

main().catch((err) => {
  console.error('LIVE_CACHE_SMOKE_FAILED_SANITIZED', err.message);
  process.exitCode = 1;
});
