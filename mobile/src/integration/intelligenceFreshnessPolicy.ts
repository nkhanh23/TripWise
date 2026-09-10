import type { GooglePlaceId } from './contracts';
import { asGooglePlaceId } from './validation';
import type { PlaceIntelligence, PlaceIntelligenceRepository } from './placeIntelligenceContract';
import {
  type EventCandidate,
  type EventIntelligenceRepository,
  type EventIntelligenceRequest,
  type EventIntelligenceResult,
  validateEventIntelligenceRequest,
} from './eventIntelligenceContract';
import {
  type CandidateDiscoveryRepository,
  type CandidateDiscoveryRequest,
  type DiscoveryCandidate,
  validateCandidateDiscoveryRequest,
} from './candidateDiscoveryContract';
import { IntegrationError } from './errors';
import { raceWithAbort } from './reliability';

/** Canonical freshness states for live intelligence facts. */
export type IntelligenceFreshnessState = 'FRESH' | 'STALE' | 'EXPIRED' | 'UNAVAILABLE';

/** TTL constants (milliseconds) chosen according to fact volatility and provider terms. */
export const PLACE_INTELLIGENCE_FRESH_TTL_MS = 30 * 60 * 1000; // 30 minutes
export const PLACE_INTELLIGENCE_STALE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
export const PLACE_METADATA_LEGACY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const EVENT_INTELLIGENCE_FRESH_TTL_MS = 15 * 60 * 1000; // 15 minutes (Ticketmaster terms compliant)
export const EVENT_INTELLIGENCE_STALE_TTL_MS = 60 * 60 * 1000; // 1 hour (no long-term event archival)

export const CANDIDATE_DISCOVERY_FRESH_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const CANDIDATE_DISCOVERY_STALE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export type CachedEntry<T> = {
  key: string;
  data: T;
  cachedAt: number; // TripWise observation/receipt epoch timestamp
  freshUntil: number; // Epoch timestamp when transition to STALE occurs
  staleUntil: number; // Epoch timestamp when transition to EXPIRED occurs
};

export type FreshnessClassification<T> = {
  state: IntelligenceFreshnessState;
  cachedAt: number;
  freshUntil: number;
  staleUntil: number;
  ageMs: number;
  data: T;
  isFallback: boolean;
};

export type AuthStateChangeSource = {
  onAuthStateChange: (
    callback: (event: string) => void,
  ) => { data: { subscription: { unsubscribe: () => void } } };
};

/** Deep clones a JSON-compatible object to guarantee cache immutability. */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Generic, memory-bounded LRU cache with explicit TTL expiry, eviction, and disposal.
 */
export class BoundedLruCache<T> {
  private readonly entries = new Map<string, T>();
  private isDisposed = false;

  constructor(readonly capacity: number = 64) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new IntegrationError('invalidRequest');
    }
  }

  get size(): number {
    return this.entries.size;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get(key: string): T | undefined {
    if (this.isDisposed) return undefined;
    const value = this.entries.get(key);
    if (value !== undefined) {
      this.entries.delete(key);
      this.entries.set(key, value);
    }
    return value;
  }

  peek(key: string): T | undefined {
    if (this.isDisposed) return undefined;
    return this.entries.get(key);
  }

  set(key: string, value: T): void {
    if (this.isDisposed) return;
    this.entries.delete(key);
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }
  }

  has(key: string): boolean {
    if (this.isDisposed) return false;
    return this.entries.has(key);
  }

  delete(key: string): boolean {
    if (this.isDisposed) return false;
    return this.entries.delete(key);
  }

  cleanup(isExpired: (value: T) => boolean): number {
    if (this.isDisposed) return 0;
    let evicted = 0;
    for (const [key, value] of this.entries.entries()) {
      if (isExpired(value)) {
        this.entries.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  clear(): void {
    this.entries.clear();
  }

  dispose(): void {
    this.isDisposed = true;
    this.entries.clear();
  }
}

type CoalescedOperation<T> = {
  promise: Promise<T>;
  controller: AbortController;
  subscribers: Set<() => void>;
};

/**
 * In-flight request coalescing manager with underlying operation cancellation.
 * Tracks per key: shared promise, underlying AbortController, and active subscriber count.
 */
export class InFlightCoalescer<T> {
  private readonly operations = new Map<string, CoalescedOperation<T>>();
  private isDisposed = false;

  get activeCount(): number {
    return this.operations.size;
  }

  has(key: string): boolean {
    return this.operations.has(key);
  }

  async run(
    key: string,
    operation: (signal: AbortSignal) => Promise<T>,
    callerSignal?: AbortSignal,
  ): Promise<T> {
    if (this.isDisposed || callerSignal?.aborted) {
      throw new IntegrationError('cancelled');
    }

    let entry = this.operations.get(key);
    if (!entry) {
      const controller = new AbortController();
      const subscribers = new Set<() => void>();

      const promise = operation(controller.signal).finally(() => {
        if (this.operations.get(key) === entry) {
          this.operations.delete(key);
        }
      });

      entry = { promise, controller, subscribers };
      this.operations.set(key, entry);
    }

    const currentEntry = entry;
    let unregisterSubscriber: (() => void) | undefined;

    const onCallerAbort = () => {
      if (unregisterSubscriber) {
        unregisterSubscriber();
      }
    };

    unregisterSubscriber = () => {
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onCallerAbort);
      }
      currentEntry.subscribers.delete(unregisterSubscriber!);
      if (currentEntry.subscribers.size === 0) {
        currentEntry.controller.abort();
        if (this.operations.get(key) === currentEntry) {
          this.operations.delete(key);
        }
      }
    };

    currentEntry.subscribers.add(unregisterSubscriber);
    if (callerSignal) {
      callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      let p = raceWithAbort(currentEntry.promise, currentEntry.controller.signal);
      if (callerSignal) {
        p = raceWithAbort(p, callerSignal);
      }
      return await p;
    } catch (err) {
      if (callerSignal?.aborted || currentEntry.controller.signal.aborted) {
        throw new IntegrationError('cancelled');
      }
      throw err;
    } finally {
      if (unregisterSubscriber) {
        unregisterSubscriber();
      }
    }
  }

  cancel(key: string): void {
    const entry = this.operations.get(key);
    if (entry) {
      entry.controller.abort();
      this.operations.delete(key);
    }
  }

  cancelAll(): void {
    for (const entry of this.operations.values()) {
      entry.controller.abort();
    }
    this.operations.clear();
  }

  dispose(): void {
    this.isDisposed = true;
    this.cancelAll();
  }
}

// ---------------------------------------------------------
// Cache Keys
// ---------------------------------------------------------

export function getPlaceIntelligenceCacheKey(googlePlaceId: GooglePlaceId): string {
  return `place:${asGooglePlaceId(googlePlaceId)}`;
}

export function getPlaceMetadataCacheKey(googlePlaceId: string): string {
  return `metadata:${asGooglePlaceId(googlePlaceId)}`;
}

export function getEventIntelligenceCacheKey(request: EventIntelligenceRequest): string {
  return `events:${request.countryCode.toUpperCase()}:${request.city.toLowerCase().trim()}:${request.startDateTime}:${request.endDateTime}:${request.limit}`;
}

export function getCandidateDiscoveryCacheKey(request: CandidateDiscoveryRequest): string {
  return `candidate:${request.center.latitude.toFixed(5)},${request.center.longitude.toFixed(5)}:${request.radiusMeters}:${request.category}:${request.limit}`;
}

// ---------------------------------------------------------
// Temporal & Freshness Evaluators
// ---------------------------------------------------------

export function classifyPlaceIntelligence(
  entry: CachedEntry<PlaceIntelligence>,
  now: number = Date.now(),
): FreshnessClassification<PlaceIntelligence> {
  const ageMs = Math.max(0, now - entry.cachedAt);
  let state: IntelligenceFreshnessState;

  if (now <= entry.freshUntil) {
    state = 'FRESH';
  } else if (now <= entry.staleUntil) {
    state = 'STALE';
  } else {
    state = 'EXPIRED';
  }

  return {
    state,
    cachedAt: entry.cachedAt,
    freshUntil: entry.freshUntil,
    staleUntil: entry.staleUntil,
    ageMs,
    data: entry.data,
    isFallback: state === 'STALE',
  };
}

/**
 * Computes event temporal expiry without inventing end times or guessing local timezones.
 * DEFECT A FIX: PROVIDER_LOCAL events do NOT derive an absolute instant cutoff (no fake "Z" appending).
 */
export function evaluateEventTemporalExpiry(
  events: EventCandidate[],
  query: EventIntelligenceRequest,
  now: number = Date.now(),
): { temporalExpiryCutoff: number; hasPastEvent: boolean } {
  const queryEnd = Date.parse(query.endDateTime);
  let cutoff = Number.isFinite(queryEnd) ? queryEnd : now;
  let hasPastEvent = false;

  for (const event of events) {
    if (event.end?.kind === 'UTC' && event.end.dateTime) {
      const endMs = Date.parse(event.end.dateTime);
      if (Number.isFinite(endMs)) {
        cutoff = Math.min(cutoff, endMs);
        if (now >= endMs) hasPastEvent = true;
      }
    } else if (event.start.kind === 'UTC' && event.start.dateTime) {
      const startMs = Date.parse(event.start.dateTime);
      if (Number.isFinite(startMs)) {
        cutoff = Math.min(cutoff, startMs);
        if (now >= startMs) hasPastEvent = true;
      }
    }
    // For PROVIDER_LOCAL: conservative policy: do not derive an absolute event-time cutoff;
    // retain standard query window end and normal cache TTL without guessing timezone offsets or appending Z.
  }

  return { temporalExpiryCutoff: cutoff, hasPastEvent };
}

export function classifyEventIntelligence(
  entry: CachedEntry<EventIntelligenceResult>,
  query: EventIntelligenceRequest,
  now: number = Date.now(),
): FreshnessClassification<EventIntelligenceResult> {
  const ageMs = Math.max(0, now - entry.cachedAt);
  const { temporalExpiryCutoff, hasPastEvent } = evaluateEventTemporalExpiry(entry.data.events, query, now);

  let state: IntelligenceFreshnessState;
  const effectiveFreshUntil = Math.min(entry.freshUntil, temporalExpiryCutoff);

  if (hasPastEvent || now > temporalExpiryCutoff) {
    if (now <= entry.staleUntil) {
      state = 'STALE';
    } else {
      state = 'EXPIRED';
    }
  } else if (now <= effectiveFreshUntil) {
    state = 'FRESH';
  } else if (now <= entry.staleUntil) {
    state = 'STALE';
  } else {
    state = 'EXPIRED';
  }

  return {
    state,
    cachedAt: entry.cachedAt,
    freshUntil: effectiveFreshUntil,
    staleUntil: entry.staleUntil,
    ageMs,
    data: entry.data,
    isFallback: state === 'STALE',
  };
}

export function classifyCandidateDiscovery(
  entry: CachedEntry<DiscoveryCandidate[]>,
  now: number = Date.now(),
): FreshnessClassification<DiscoveryCandidate[]> {
  const ageMs = Math.max(0, now - entry.cachedAt);
  let state: IntelligenceFreshnessState;

  if (now <= entry.freshUntil) {
    state = 'FRESH';
  } else if (now <= entry.staleUntil) {
    state = 'STALE';
  } else {
    state = 'EXPIRED';
  }

  return {
    state,
    cachedAt: entry.cachedAt,
    freshUntil: entry.freshUntil,
    staleUntil: entry.staleUntil,
    ageMs,
    data: entry.data,
    isFallback: state === 'STALE',
  };
}

/**
 * Determines whether a stale cached entry may be returned following an upstream provider failure.
 */
export function canServeStaleFallback(
  error: unknown,
  classification: FreshnessClassification<unknown> | undefined,
): boolean {
  if (!classification || classification.state !== 'STALE') {
    return false;
  }

  if (error instanceof IntegrationError) {
    if (
      error.code === 'invalidRequest' ||
      error.code === 'unauthorized' ||
      error.code === 'forbidden' ||
      error.code === 'cancelled'
    ) {
      return false;
    }

    return (
      error.code === 'timeout' ||
      error.code === 'providerUnavailable' ||
      error.code === 'rateLimited' ||
      error.code === 'invalidResponse' ||
      error.code === 'network'
    );
  }

  return false;
}

// ---------------------------------------------------------
// Cached Repositories
// ---------------------------------------------------------

export class CachedPlaceIntelligenceRepository implements PlaceIntelligenceRepository {
  private readonly cache: BoundedLruCache<CachedEntry<PlaceIntelligence>>;
  private readonly coalescer = new InFlightCoalescer<PlaceIntelligence>();
  private readonly authUnsubscribe?: () => void;
  private isDisposed = false;

  constructor(
    private readonly delegate: PlaceIntelligenceRepository,
    capacity: number = 64,
    private readonly nowProvider: () => number = () => Date.now(),
    authSource?: AuthStateChangeSource,
  ) {
    this.cache = new BoundedLruCache<CachedEntry<PlaceIntelligence>>(capacity);
    if (authSource) {
      const { data: { subscription } } = authSource.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          this.clearCache();
        }
      });
      this.authUnsubscribe = () => subscription.unsubscribe();
    }
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
    this.coalescer.cancelAll();
  }

  dispose(): void {
    this.isDisposed = true;
    this.authUnsubscribe?.();
    this.cache.dispose();
    this.coalescer.dispose();
  }

  async getIntelligence(googlePlaceId: GooglePlaceId, signal?: AbortSignal): Promise<PlaceIntelligence> {
    const classification = await this.getIntelligenceWithFreshness(googlePlaceId, signal);
    return deepClone(classification.data);
  }

  async getIntelligenceWithFreshness(
    googlePlaceId: GooglePlaceId,
    signal?: AbortSignal,
  ): Promise<FreshnessClassification<PlaceIntelligence>> {
    if (this.isDisposed || signal?.aborted) {
      throw new IntegrationError('cancelled');
    }

    const id = asGooglePlaceId(googlePlaceId);
    const key = getPlaceIntelligenceCacheKey(id);
    const now = this.nowProvider();

    const cached = this.cache.get(key);
    let classification = cached ? classifyPlaceIntelligence(cached, now) : undefined;

    if (classification && classification.state === 'FRESH') {
      return deepClone(classification);
    }

    try {
      const freshData = await this.coalescer.run(
        key,
        (coalescedSignal) => this.delegate.getIntelligence(id, coalescedSignal),
        signal,
      );

      const fetchNow = this.nowProvider();
      const newEntry: CachedEntry<PlaceIntelligence> = {
        key,
        data: deepClone(freshData),
        cachedAt: fetchNow,
        freshUntil: fetchNow + PLACE_INTELLIGENCE_FRESH_TTL_MS,
        staleUntil: fetchNow + PLACE_INTELLIGENCE_STALE_TTL_MS,
      };
      this.cache.set(key, newEntry);

      return classifyPlaceIntelligence(newEntry, fetchNow);
    } catch (rawError) {
      if (signal?.aborted) {
        throw new IntegrationError('cancelled');
      }

      if (cached) {
        classification = classifyPlaceIntelligence(cached, this.nowProvider());
      }

      if (canServeStaleFallback(rawError, classification)) {
        return {
          ...deepClone(classification!),
          isFallback: true,
        };
      }

      throw rawError;
    }
  }
}

export class CachedEventIntelligenceRepository implements EventIntelligenceRepository {
  private readonly cache: BoundedLruCache<CachedEntry<EventIntelligenceResult>>;
  private readonly coalescer = new InFlightCoalescer<EventIntelligenceResult>();
  private activeKey?: string;
  private readonly authUnsubscribe?: () => void;
  private isDisposed = false;

  constructor(
    private readonly delegate: EventIntelligenceRepository,
    capacity: number = 32,
    private readonly nowProvider: () => number = () => Date.now(),
    authSource?: AuthStateChangeSource,
  ) {
    this.cache = new BoundedLruCache<CachedEntry<EventIntelligenceResult>>(capacity);
    if (authSource) {
      const { data: { subscription } } = authSource.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          this.clearCache();
          this.cancel();
        }
      });
      this.authUnsubscribe = () => subscription.unsubscribe();
    }
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
    this.coalescer.cancelAll();
  }

  cancel(): void {
    this.coalescer.cancelAll();
    this.delegate.cancel();
    this.activeKey = undefined;
  }

  dispose(): void {
    this.isDisposed = true;
    this.authUnsubscribe?.();
    this.cancel();
    this.cache.dispose();
    this.coalescer.dispose();
  }

  async discover(request: EventIntelligenceRequest, signal?: AbortSignal): Promise<EventIntelligenceResult> {
    const classification = await this.discoverWithFreshness(request, signal);
    return deepClone(classification.data);
  }

  async discoverWithFreshness(
    request: EventIntelligenceRequest,
    signal?: AbortSignal,
  ): Promise<FreshnessClassification<EventIntelligenceResult>> {
    if (this.isDisposed || signal?.aborted) {
      throw new IntegrationError('cancelled');
    }

    const body = validateEventIntelligenceRequest(request);
    const key = getEventIntelligenceCacheKey(body);
    const now = this.nowProvider();

    const cached = this.cache.get(key);
    let classification = cached ? classifyEventIntelligence(cached, body, now) : undefined;

    if (classification && classification.state === 'FRESH') {
      return deepClone(classification);
    }

    // DEFECT B FIX: Only cancel previous active request if requesting a DIFFERENT key.
    // DEFECT B FIX: Only cancel previous active request if requesting a DIFFERENT key.
    // Identical keys share the active in-flight coalesced operation.
    if (this.activeKey !== undefined && this.activeKey !== key) {
      this.coalescer.cancel(this.activeKey);
      this.delegate.cancel();
    }

    this.activeKey = key;

    try {
      const freshData = await this.coalescer.run(
        key,
        (coalescedSignal) => {
          return this.delegate.discover(body, coalescedSignal);
        },
        signal,
      );

      const fetchNow = this.nowProvider();
      const newEntry: CachedEntry<EventIntelligenceResult> = {
        key,
        data: deepClone(freshData),
        cachedAt: fetchNow,
        freshUntil: fetchNow + EVENT_INTELLIGENCE_FRESH_TTL_MS,
        staleUntil: fetchNow + EVENT_INTELLIGENCE_STALE_TTL_MS,
      };
      this.cache.set(key, newEntry);
      return classifyEventIntelligence(newEntry, body, fetchNow);
    } catch (rawError) {
      if (signal?.aborted || (rawError instanceof IntegrationError && rawError.code === 'cancelled')) {
        throw new IntegrationError('cancelled');
      }

      if (cached) {
        classification = classifyEventIntelligence(cached, body, this.nowProvider());
      }

      if (canServeStaleFallback(rawError, classification)) {
        return {
          ...deepClone(classification!),
          isFallback: true,
        };
      }

      throw rawError;
    } finally {
      if (this.activeKey === key && !this.coalescer.has(key)) {
        this.activeKey = undefined;
      }
    }
  }
}

export class CachedCandidateDiscoveryRepository implements CandidateDiscoveryRepository {
  private readonly cache: BoundedLruCache<CachedEntry<DiscoveryCandidate[]>>;
  private readonly coalescer = new InFlightCoalescer<DiscoveryCandidate[]>();
  private readonly authUnsubscribe?: () => void;
  private isDisposed = false;

  constructor(
    private readonly delegate: CandidateDiscoveryRepository,
    capacity: number = 16,
    private readonly nowProvider: () => number = () => Date.now(),
    authSource?: AuthStateChangeSource,
  ) {
    this.cache = new BoundedLruCache<CachedEntry<DiscoveryCandidate[]>>(capacity);
    if (authSource) {
      const { data: { subscription } } = authSource.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          this.clearCache();
        }
      });
      this.authUnsubscribe = () => subscription.unsubscribe();
    }
  }

  get cacheSize(): number {
    return this.cache.size;
  }

  clearCache(): void {
    this.cache.clear();
    this.coalescer.cancelAll();
  }

  dispose(): void {
    this.isDisposed = true;
    this.authUnsubscribe?.();
    this.cache.dispose();
    this.coalescer.dispose();
  }

  async discover(request: CandidateDiscoveryRequest, signal?: AbortSignal): Promise<DiscoveryCandidate[]> {
    const classification = await this.discoverWithFreshness(request, signal);
    return deepClone(classification.data);
  }

  async discoverWithFreshness(
    request: CandidateDiscoveryRequest,
    signal?: AbortSignal,
  ): Promise<FreshnessClassification<DiscoveryCandidate[]>> {
    if (this.isDisposed || signal?.aborted) {
      throw new IntegrationError('cancelled');
    }

    const body = validateCandidateDiscoveryRequest(request);
    const key = getCandidateDiscoveryCacheKey(body);
    const now = this.nowProvider();

    const cached = this.cache.get(key);
    let classification = cached ? classifyCandidateDiscovery(cached, now) : undefined;

    if (classification && classification.state === 'FRESH') {
      return deepClone(classification);
    }

    try {
      const freshData = await this.coalescer.run(
        key,
        (coalescedSignal) => this.delegate.discover(body, coalescedSignal),
        signal,
      );

      const fetchNow = this.nowProvider();
      const newEntry: CachedEntry<DiscoveryCandidate[]> = {
        key,
        data: deepClone(freshData),
        cachedAt: fetchNow,
        freshUntil: fetchNow + CANDIDATE_DISCOVERY_FRESH_TTL_MS,
        staleUntil: fetchNow + CANDIDATE_DISCOVERY_STALE_TTL_MS,
      };
      this.cache.set(key, newEntry);

      return classifyCandidateDiscovery(newEntry, fetchNow);
    } catch (rawError) {
      if (signal?.aborted) {
        throw new IntegrationError('cancelled');
      }

      if (cached) {
        classification = classifyCandidateDiscovery(cached, this.nowProvider());
      }

      if (canServeStaleFallback(rawError, classification)) {
        return {
          ...deepClone(classification!),
          isFallback: true,
        };
      }

      throw rawError;
    }
  }
}
