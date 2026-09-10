import { supabase } from '../lib/supabase/client';
import {
  CachedCandidateDiscoveryRepository,
  CachedEventIntelligenceRepository,
  CachedPlaceIntelligenceRepository,
} from './intelligenceFreshnessPolicy';
import { SupabaseCandidateDiscoveryRepository } from './remote/supabaseCandidateDiscoveryRepository';
import { SupabaseEventIntelligenceRepository } from './remote/supabaseEventIntelligenceRepository';
import { SupabasePlaceMetadataRepository } from './remote/supabasePlaceMetadataRepository';

let cachedCandidateRepo: CachedCandidateDiscoveryRepository | undefined;
let cachedPlaceRepo: CachedPlaceIntelligenceRepository | undefined;
let cachedEventRepo: CachedEventIntelligenceRepository | undefined;

/**
 * Returns the production-ready singleton CachedCandidateDiscoveryRepository,
 * wired to Supabase transport and Supabase auth source for automated cache clearing.
 */
export function getCachedCandidateDiscoveryRepository(): CachedCandidateDiscoveryRepository {
  if (!cachedCandidateRepo || (cachedCandidateRepo as unknown as { isDisposed?: boolean }).isDisposed) {
    const delegate = new SupabaseCandidateDiscoveryRepository(supabase);
    cachedCandidateRepo = new CachedCandidateDiscoveryRepository(
      delegate,
      16,
      () => Date.now(),
      supabase.auth,
    );
  }
  return cachedCandidateRepo;
}

/**
 * Returns the production-ready singleton CachedPlaceIntelligenceRepository,
 * wired to Supabase transport and Supabase auth source for automated cache clearing.
 */
export function getCachedPlaceIntelligenceRepository(): CachedPlaceIntelligenceRepository {
  if (!cachedPlaceRepo || (cachedPlaceRepo as unknown as { isDisposed?: boolean }).isDisposed) {
    const delegate = new SupabasePlaceMetadataRepository(supabase);
    cachedPlaceRepo = new CachedPlaceIntelligenceRepository(
      delegate,
      64,
      () => Date.now(),
      supabase.auth,
    );
  }
  return cachedPlaceRepo;
}

/**
 * Returns the production-ready singleton CachedEventIntelligenceRepository,
 * wired to Supabase transport and Supabase auth source for automated cache clearing.
 */
export function getCachedEventIntelligenceRepository(): CachedEventIntelligenceRepository {
  if (!cachedEventRepo || (cachedEventRepo as unknown as { isDisposed?: boolean }).isDisposed) {
    const delegate = new SupabaseEventIntelligenceRepository(supabase);
    cachedEventRepo = new CachedEventIntelligenceRepository(
      delegate,
      32,
      () => Date.now(),
      supabase.auth,
    );
  }
  return cachedEventRepo;
}

/**
 * Clears in-memory caches across all live intelligence repositories.
 */
export function clearAllIntelligenceCaches(): void {
  cachedCandidateRepo?.clearCache();
  cachedPlaceRepo?.clearCache();
  cachedEventRepo?.clearCache();
}

/**
 * Test & teardown helper: disposes and unlinks active singletons.
 */
export function resetIntelligenceComposition(): void {
  cachedCandidateRepo?.dispose();
  cachedCandidateRepo = undefined;
  cachedPlaceRepo?.dispose();
  cachedPlaceRepo = undefined;
  cachedEventRepo?.dispose();
  cachedEventRepo = undefined;
}

/**
 * Test injection helpers.
 */
export function setCachedCandidateDiscoveryRepository(repo?: CachedCandidateDiscoveryRepository): void {
  cachedCandidateRepo = repo;
}

export function setCachedPlaceIntelligenceRepository(repo?: CachedPlaceIntelligenceRepository): void {
  cachedPlaceRepo = repo;
}

export function setCachedEventIntelligenceRepository(repo?: CachedEventIntelligenceRepository): void {
  cachedEventRepo = repo;
}
