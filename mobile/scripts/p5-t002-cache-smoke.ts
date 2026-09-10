/**
 * Cache Verification Smoke Script for FEATURE-P5-T002
 *
 * Verifies the CachedRouteRepository wrapper:
 * 1. 1st Table request executes exactly 1 HTTP attempt via underlying OsrmRouteRepository
 * 2. 2nd identical Table request serves from cache with 0 HTTP attempts
 * 3. Deep-cloned mutation safety: mutating cached result does not corrupt cache
 *
 * NOTE ON PROVENANCE & WIRING:
 * CachedRouteRepository is an opt-in caching wrapper provided for caller reuse.
 * It is tested and verified here at the unit/smoke boundary.
 * Production default wiring currently calls route repositories directly without forced caching.
 */

import { OsrmRouteRepository } from '../src/integration/remote/publicProviderRepositories';
import { CachedRouteRepository } from '../src/integration/routeMetricCache';
import type { Coordinate } from '../src/integration/contracts';

const COORD_A: Coordinate = { latitude: 13.7437, longitude: 100.4889 };
const COORD_B: Coordinate = { latitude: 13.7500, longitude: 100.4913 };

async function runCacheSmoke() {
  console.log('=== FEATURE-P5-T002 CACHED ROUTE REPOSITORY SMOKE ===\n');

  let httpAttempts = 0;
  const mockFetch: typeof fetch = async (input, init) => {
    httpAttempts++;
    console.log(`[HTTP Transport] Attempt ${httpAttempts}: GET ${String(input).slice(0, 80)}...`);
    return new Response(
      JSON.stringify({
        code: 'Ok',
        durations: [
          [0, 150],
          [150, 0],
        ],
        distances: [
          [0, 2100],
          [2100, 0],
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const underlying = new OsrmRouteRepository(mockFetch);
  const cachedRepo = new CachedRouteRepository(underlying);

  console.log('1. First Table Request (Cache Miss):');
  const matrix1 = await cachedRepo.getTable({
    profile: 'driving',
    coordinates: [COORD_A, COORD_B],
  });
  console.log(`   HTTP Attempts after Request 1: ${httpAttempts} (Expected: 1)`);
  console.log(`   Matrix durations: [${matrix1.durationsSeconds.map((r) => r.join(', ')).join(' | ')}]`);
  console.log(`   Cache Size: ${cachedRepo.cacheSize}`);

  if (httpAttempts !== 1) {
    throw new Error(`Expected 1 HTTP attempt on cache miss, got ${httpAttempts}`);
  }

  console.log('\n2. Second Identical Table Request (Cache Hit):');
  const matrix2 = await cachedRepo.getTable({
    profile: 'driving',
    coordinates: [COORD_A, COORD_B],
  });
  console.log(`   HTTP Attempts after Request 2: ${httpAttempts} (Expected: 1, 0 new HTTP calls)`);
  console.log(`   Matrix durations: [${matrix2.durationsSeconds.map((r) => r.join(', ')).join(' | ')}]`);

  if (httpAttempts !== 1) {
    throw new Error(`Expected 0 new HTTP attempts on cache hit, total attempts: ${httpAttempts}`);
  }

  console.log('\n3. Deep Cloning Mutation Safety:');
  matrix2.durationsSeconds[0][1] = 999999;
  console.log(`   Mutated matrix2 duration to: ${matrix2.durationsSeconds[0][1]}`);

  const matrix3 = await cachedRepo.getTable({
    profile: 'driving',
    coordinates: [COORD_A, COORD_B],
  });
  console.log(`   matrix3 duration from cache: ${matrix3.durationsSeconds[0][1]} (Expected: 150)`);

  if (matrix3.durationsSeconds[0][1] !== 150) {
    throw new Error('Mutation leaked into cache! Deep cloning verification failed.');
  }

  console.log('\n=== CACHE VERIFICATION SUCCESSFUL ===');
}

runCacheSmoke().catch((err) => {
  console.error('Smoke failed:', err);
  process.exit(1);
});
