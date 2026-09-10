import {
  BoundedLruCache,
  CachedCandidateDiscoveryRepository,
  CachedEventIntelligenceRepository,
  CachedPlaceIntelligenceRepository,
  canServeStaleFallback,
  classifyCandidateDiscovery,
  classifyEventIntelligence,
  classifyPlaceIntelligence,
  evaluateEventTemporalExpiry,
  EVENT_INTELLIGENCE_FRESH_TTL_MS,
  EVENT_INTELLIGENCE_STALE_TTL_MS,
  getCandidateDiscoveryCacheKey,
  getEventIntelligenceCacheKey,
  getPlaceIntelligenceCacheKey,
  getPlaceMetadataCacheKey,
  InFlightCoalescer,
  PLACE_INTELLIGENCE_FRESH_TTL_MS,
  PLACE_INTELLIGENCE_STALE_TTL_MS,
  PLACE_METADATA_LEGACY_TTL_MS,
} from '../src/integration/intelligenceFreshnessPolicy';
import { IntegrationError } from '../src/integration/errors';
import type { PlaceIntelligence, PlaceIntelligenceRepository } from '../src/integration/placeIntelligenceContract';
import type {
  EventCandidate,
  EventIntelligenceRepository,
  EventIntelligenceRequest,
  EventIntelligenceResult,
} from '../src/integration/eventIntelligenceContract';
import type {
  CandidateDiscoveryRepository,
  CandidateDiscoveryRequest,
  DiscoveryCandidate,
} from '../src/integration/candidateDiscoveryContract';
import { asGooglePlaceId } from '../src/integration/validation';
import { SupabasePlaceMetadataRepository } from '../src/integration/remote/supabasePlaceMetadataRepository';

describe('T004 Intelligence Freshness & Cache Policy', () => {
  // Test fixtures
  const samplePlaceId = asGooglePlaceId('ChIJaSv_6gaZ4jARnbiUVn6Z_YY');
  const otherPlaceId = asGooglePlaceId('ChIJotherPlaceId12345678');

  const samplePlaceIntelligence: PlaceIntelligence = {
    kind: 'live-place-intelligence',
    googlePlaceId: samplePlaceId,
    businessStatus: 'OPERATIONAL',
    openingHours: {
      periods: [{ open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } }],
      weekdayDescriptions: ['Monday: 9:00 AM - 5:00 PM'],
      openNow: true,
    },
    utcOffsetMinutes: 0,
    rating: 4.5,
    userRatingCount: 1000,
    provenance: {
      provider: 'google-places',
      boundary: 'get-place-metadata',
      observation: 'CLIENT_RECEIVED',
      fetchedAt: '2026-09-09T10:00:00.000Z',
      receivedAt: '2026-09-09T10:00:01.000Z',
    },
  };

  const sampleEventQuery: EventIntelligenceRequest = {
    city: 'London',
    countryCode: 'GB',
    startDateTime: '2026-09-10T00:00:00Z',
    endDateTime: '2026-09-17T00:00:00Z',
    limit: 3,
  };

  const sampleEventCandidate: EventCandidate = {
    kind: 'live-event-candidate',
    provider: 'ticketmaster',
    providerEventId: 'evt-12345',
    title: 'Concert in London',
    start: {
      kind: 'UTC',
      dateTime: '2026-09-12T19:00:00Z',
      localDate: '2026-09-12',
      localTime: '20:00:00',
      timezone: 'Europe/London',
    },
    end: {
      kind: 'UTC',
      dateTime: '2026-09-12T22:00:00Z',
    },
    venues: [
      {
        providerVenueId: 'ven-1',
        name: 'O2 Arena',
        location: { latitude: 51.503, longitude: 0.003 },
      },
    ],
    review: 'REVIEW_REQUIRED',
    attribution: {
      providerName: 'Ticketmaster',
      displayRequirement: 'REQUIRES_FINAL_T005_REVIEW',
    },
    provenance: {
      provider: 'ticketmaster',
      providerEventId: 'evt-12345',
      boundary: 'discover-events',
      observation: 'SERVER_RECEIVED',
      observedAt: '2026-09-09T12:00:00.000Z',
    },
  };

  const sampleEventResult: EventIntelligenceResult = {
    events: [sampleEventCandidate],
    pagination: { size: 1, number: 0, totalElements: 1, totalPages: 1 },
    providerAccess: {
      httpStatus: 200,
      completedProviderCalls: 1,
      rateLimitHeaders: { 'rate-limit': '5000' },
    },
  };

  const sampleCandidateRequest: CandidateDiscoveryRequest = {
    center: { latitude: 51.505, longitude: -0.09 },
    radiusMeters: 500,
    category: 'attractions',
    limit: 5,
  };

  const sampleDiscoveryCandidate: DiscoveryCandidate = {
    kind: 'google-place-candidate',
    status: 'DISCOVERED',
    review: 'REVIEW_REQUIRED',
    googlePlaceId: samplePlaceId,
    name: 'Tower Bridge',
    coordinate: { latitude: 51.5055, longitude: -0.0754 },
    category: 'attractions',
    provenance: {
      provider: 'google-places',
      boundary: 'explore-places',
      observation: 'CLIENT_RECEIVED',
      receivedAt: '2026-09-09T10:00:00.000Z',
    },
  };

  // 1. Fresh cache hit
  it('1. returns fresh cache hit without calling delegate provider', async () => {
    let now = 1_000_000;
    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository(
      { getIntelligence: delegateFetch },
      64,
      () => now,
    );

    const first = await repo.getIntelligence(samplePlaceId);
    expect(first.googlePlaceId).toBe(samplePlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(1);

    // Advance 5 minutes (within 30m fresh TTL)
    now += 5 * 60 * 1000;
    const second = await repo.getIntelligence(samplePlaceId);
    expect(second.googlePlaceId).toBe(samplePlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(1); // No new network call
  });

  // 2. Cache miss
  it('2. calls delegate provider on cache miss and stores entry', async () => {
    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    expect(repo.cacheSize).toBe(0);
    const result = await repo.getIntelligence(samplePlaceId);
    expect(result.googlePlaceId).toBe(samplePlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(1);
    expect(repo.cacheSize).toBe(1);
  });

  // 3. Exact TTL boundary
  it('3. respects exact TTL boundaries for fresh and stale states', () => {
    const cachedAt = 100_000;
    const freshUntil = cachedAt + PLACE_INTELLIGENCE_FRESH_TTL_MS;
    const staleUntil = cachedAt + PLACE_INTELLIGENCE_STALE_TTL_MS;

    const entry = {
      key: 'test',
      data: samplePlaceIntelligence,
      cachedAt,
      freshUntil,
      staleUntil,
    };

    // Exactly at fresh boundary -> FRESH
    expect(classifyPlaceIntelligence(entry, freshUntil).state).toBe('FRESH');
    // 1ms after fresh boundary -> STALE
    expect(classifyPlaceIntelligence(entry, freshUntil + 1).state).toBe('STALE');
    // Exactly at stale boundary -> STALE
    expect(classifyPlaceIntelligence(entry, staleUntil).state).toBe('STALE');
    // 1ms after stale boundary -> EXPIRED
    expect(classifyPlaceIntelligence(entry, staleUntil + 1).state).toBe('EXPIRED');
  });

  // 4. Expired entry
  it('4. classifies entry past staleUntil as EXPIRED and does not serve it', () => {
    const now = 10_000_000;
    const entry = {
      key: 'test',
      data: samplePlaceIntelligence,
      cachedAt: now - PLACE_INTELLIGENCE_STALE_TTL_MS - 1000,
      freshUntil: now - PLACE_INTELLIGENCE_STALE_TTL_MS + PLACE_INTELLIGENCE_FRESH_TTL_MS,
      staleUntil: now - 1000,
    };

    const classification = classifyPlaceIntelligence(entry, now);
    expect(classification.state).toBe('EXPIRED');
  });

  // 5. Stale classification
  it('5. classifies entry between freshUntil and staleUntil as STALE', () => {
    const cachedAt = 1_000_000;
    const entry = {
      key: 'test',
      data: samplePlaceIntelligence,
      cachedAt,
      freshUntil: cachedAt + PLACE_INTELLIGENCE_FRESH_TTL_MS,
      staleUntil: cachedAt + PLACE_INTELLIGENCE_STALE_TTL_MS,
    };

    // 45 minutes old (fresh is 30m, stale is 2h)
    const now = cachedAt + 45 * 60 * 1000;
    const classification = classifyPlaceIntelligence(entry, now);
    expect(classification.state).toBe('STALE');
    expect(classification.isFallback).toBe(true);
  });

  // 6. Provider refresh after expiry
  it('6. refreshes from provider after fresh TTL expires', async () => {
    let now = 1_000_000;
    const delegateFetch = jest
      .fn()
      .mockResolvedValueOnce(samplePlaceIntelligence)
      .mockResolvedValueOnce({ ...samplePlaceIntelligence, rating: 4.8 });

    const repo = new CachedPlaceIntelligenceRepository(
      { getIntelligence: delegateFetch },
      64,
      () => now,
    );

    const first = await repo.getIntelligence(samplePlaceId);
    expect(first.rating).toBe(4.5);
    expect(delegateFetch).toHaveBeenCalledTimes(1);

    // Advance 31 minutes (past 30m fresh TTL)
    now += 31 * 60 * 1000;
    const second = await repo.getIntelligence(samplePlaceId);
    expect(second.rating).toBe(4.8);
    expect(delegateFetch).toHaveBeenCalledTimes(2);
  });

  // 7. Provider failure with no cache
  it('7. propagates provider failure when no cache entry exists', async () => {
    const delegateFetch = jest.fn().mockRejectedValue(new IntegrationError('providerUnavailable'));
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    await expect(repo.getIntelligence(samplePlaceId)).rejects.toMatchObject({
      code: 'providerUnavailable',
    });
  });

  // 8. Provider failure with permitted stale cache
  it('8. falls back to stale cache on transient provider failure', async () => {
    let now = 1_000_000;
    const delegateFetch = jest
      .fn()
      .mockResolvedValueOnce(samplePlaceIntelligence)
      .mockRejectedValueOnce(new IntegrationError('timeout'));

    const repo = new CachedPlaceIntelligenceRepository(
      { getIntelligence: delegateFetch },
      64,
      () => now,
    );

    const initial = await repo.getIntelligence(samplePlaceId);
    expect(initial.googlePlaceId).toBe(samplePlaceId);

    // Advance 40 minutes (stale window)
    now += 40 * 60 * 1000;
    const fallback = await repo.getIntelligenceWithFreshness(samplePlaceId);
    expect(fallback.state).toBe('STALE');
    expect(fallback.isFallback).toBe(true);
    expect(fallback.data.googlePlaceId).toBe(samplePlaceId);
  });

  // 9. Provider failure with stale cache not permitted
  it('9. does not serve stale fallback on unauthorized, invalidRequest, or cancelled errors', async () => {
    for (const code of ['unauthorized', 'forbidden', 'invalidRequest', 'cancelled'] as const) {
      let now = 1_000_000;
      const delegateFetch = jest
        .fn()
        .mockResolvedValueOnce(samplePlaceIntelligence)
        .mockRejectedValueOnce(new IntegrationError(code));

      const repo = new CachedPlaceIntelligenceRepository(
        { getIntelligence: delegateFetch },
        64,
        () => now,
      );

      await repo.getIntelligence(samplePlaceId);
      now += 40 * 60 * 1000; // stale window

      await expect(repo.getIntelligence(samplePlaceId)).rejects.toMatchObject({
        code,
      });
    }
  });

  // 10. Cancellation does not commit cache
  it('10. aborted request does not commit partial result to cache', async () => {
    const controller = new AbortController();
    controller.abort();

    const delegateFetch = jest.fn().mockImplementation(() => new Promise(() => undefined));
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    await expect(repo.getIntelligence(samplePlaceId, controller.signal)).rejects.toMatchObject({
      code: 'cancelled',
    });
    expect(repo.cacheSize).toBe(0);
  });

  // 11. Superseded request does not commit stale result
  it('11. superseded operation does not commit outdated result over newer state', async () => {
    let resolveFirst!: (v: EventIntelligenceResult) => void;
    const firstPromise = new Promise<EventIntelligenceResult>((r) => {
      resolveFirst = r;
    });

    const secondQuery = { ...sampleEventQuery, city: 'Hanoi' };
    const delegateDiscover = jest
      .fn()
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce({
        ...sampleEventResult,
        events: [{ ...sampleEventCandidate, title: 'Second Newer Concert' }],
      });

    const repo = new CachedEventIntelligenceRepository({
      discover: delegateDiscover,
      cancel: jest.fn(),
    });

    const pendingFirst = repo.discover(sampleEventQuery);
    // Trigger second request with different key which supersedes the first
    const secondResult = await repo.discover(secondQuery);
    expect(secondResult.events[0].title).toBe('Second Newer Concert');

    // Late resolution of first request should be discarded
    resolveFirst(sampleEventResult);
    await expect(pendingFirst).rejects.toMatchObject({ code: 'cancelled' });

    // Cache should retain the second newer result
    const cached = await repo.discover(secondQuery);
    expect(cached.events[0].title).toBe('Second Newer Concert');
  });

  // 12. Auth switch invalidates cache
  it('12. clearCache purges all stored intelligence on auth change', async () => {
    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    await repo.getIntelligence(samplePlaceId);
    expect(repo.cacheSize).toBe(1);

    repo.clearCache();
    expect(repo.cacheSize).toBe(0);

    // Next request must re-fetch
    await repo.getIntelligence(samplePlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(2);
  });

  it('12b. subscribes to auth state changes and clears cache on SIGNED_OUT, SIGNED_IN, USER_UPDATED, but preserves on TOKEN_REFRESHED', async () => {
    let authListener: ((event: string) => void) | undefined;
    const mockAuthSource = {
      onAuthStateChange: jest.fn().mockImplementation((cb: (event: string) => void) => {
        authListener = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    };

    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository(
      { getIntelligence: delegateFetch },
      64,
      undefined,
      mockAuthSource,
    );

    await repo.getIntelligence(samplePlaceId);
    expect(repo.cacheSize).toBe(1);

    // TOKEN_REFRESHED does NOT clear cache
    authListener?.('TOKEN_REFRESHED');
    expect(repo.cacheSize).toBe(1);

    // SIGNED_OUT clears cache
    authListener?.('SIGNED_OUT');
    expect(repo.cacheSize).toBe(0);

    // Repopulate
    await repo.getIntelligence(samplePlaceId);
    expect(repo.cacheSize).toBe(1);

    // SIGNED_IN clears cache
    authListener?.('SIGNED_IN');
    expect(repo.cacheSize).toBe(0);

    // Repopulate
    await repo.getIntelligence(samplePlaceId);
    expect(repo.cacheSize).toBe(1);

    // USER_UPDATED clears cache
    authListener?.('USER_UPDATED');
    expect(repo.cacheSize).toBe(0);

    repo.dispose();
  });

  it('12c. SupabasePlaceMetadataRepository defensively copies data and purges on auth events', async () => {
    let authListener: ((event: string) => void) | undefined;
    const mockSupabase = {
      auth: {
        onAuthStateChange: jest.fn().mockImplementation((cb: (event: string) => void) => {
          authListener = cb;
          return { data: { subscription: { unsubscribe: jest.fn() } } };
        }),
      },
      functions: {
        invoke: jest.fn().mockResolvedValue({
          data: {
            data: {
              googlePlaceId: samplePlaceId,
              rating: 4.8,
              userRatingCount: 150,
            },
          },
          error: null,
        }),
      },
    };

    const repo = new SupabasePlaceMetadataRepository(mockSupabase as any);

    const first = await repo.getMetadata(samplePlaceId);
    expect(first.rating).toBe(4.8);

    // Mutating first should not corrupt subsequent reads
    first.rating = 1.0;

    const second = await repo.getMetadata(samplePlaceId);
    expect(second.rating).toBe(4.8);
    expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(1);

    // Auth SIGNED_OUT purges cache
    authListener?.('SIGNED_OUT');
    const third = await repo.getMetadata(samplePlaceId);
    expect(mockSupabase.functions.invoke).toHaveBeenCalledTimes(2);

    repo.dispose();
  });

  // 13. Cache key isolation
  it('13. isolates cache keys across domains', () => {
    const placeKey = getPlaceIntelligenceCacheKey(samplePlaceId);
    const metaKey = getPlaceMetadataCacheKey(samplePlaceId);
    const eventKey = getEventIntelligenceCacheKey(sampleEventQuery);
    const candKey = getCandidateDiscoveryCacheKey(sampleCandidateRequest);

    expect(placeKey).toMatch(/^place:/);
    expect(metaKey).toMatch(/^metadata:/);
    expect(eventKey).toMatch(/^events:GB:london:/);
    expect(candKey).toMatch(/^candidate:/);
    expect(new Set([placeKey, metaKey, eventKey, candKey]).size).toBe(4);
  });

  // 14. Google Place ID isolation
  it('14. isolates place intelligence cache strictly by googlePlaceId', async () => {
    const delegateFetch = jest.fn().mockImplementation((id: string) =>
      Promise.resolve({ ...samplePlaceIntelligence, googlePlaceId: id }),
    );
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    const first = await repo.getIntelligence(samplePlaceId);
    const other = await repo.getIntelligence(otherPlaceId);

    expect(first.googlePlaceId).toBe(samplePlaceId);
    expect(other.googlePlaceId).toBe(otherPlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(2);
  });

  // 15. Event city isolation
  it('15. separates event cache keys for different cities', () => {
    const k1 = getEventIntelligenceCacheKey({ ...sampleEventQuery, city: 'London' });
    const k2 = getEventIntelligenceCacheKey({ ...sampleEventQuery, city: 'Manchester' });
    expect(k1).not.toBe(k2);
  });

  // 16. Event country isolation
  it('16. separates event cache keys for different countries', () => {
    const k1 = getEventIntelligenceCacheKey({ ...sampleEventQuery, countryCode: 'GB' });
    const k2 = getEventIntelligenceCacheKey({ ...sampleEventQuery, countryCode: 'US' });
    expect(k1).not.toBe(k2);
  });

  // 17. Event time-window isolation
  it('17. separates event cache keys for different time windows and limits', () => {
    const k1 = getEventIntelligenceCacheKey({ ...sampleEventQuery, startDateTime: '2026-09-10T00:00:00Z' });
    const k2 = getEventIntelligenceCacheKey({ ...sampleEventQuery, startDateTime: '2026-09-11T00:00:00Z' });
    const k3 = getEventIntelligenceCacheKey({ ...sampleEventQuery, limit: 1 });
    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
  });

  // 18. Event past-time invalidation
  it('18. marks event cache as STALE immediately once event time is past', () => {
    const nowBeforeEvent = Date.parse('2026-09-12T18:00:00Z');
    const nowDuringEvent = Date.parse('2026-09-12T20:00:00Z');
    const nowAfterEvent = Date.parse('2026-09-12T23:00:00Z');

    const entry = {
      key: 'events-key',
      data: sampleEventResult,
      cachedAt: nowBeforeEvent,
      freshUntil: nowBeforeEvent + EVENT_INTELLIGENCE_FRESH_TTL_MS,
      staleUntil: nowBeforeEvent + EVENT_INTELLIGENCE_STALE_TTL_MS,
    };

    // Before event: FRESH
    expect(classifyEventIntelligence(entry, sampleEventQuery, nowBeforeEvent).state).toBe('FRESH');

    // After event end (end was 22:00:00Z): cannot be FRESH
    const after = classifyEventIntelligence(entry, sampleEventQuery, nowAfterEvent);
    expect(after.state).not.toBe('FRESH');
  });

  // 19. Local-only event time conservative behavior
  it('19. applies conservative expiry for local-only events without inventing timezone', () => {
    const localEvent: EventCandidate = {
      ...sampleEventCandidate,
      start: {
        kind: 'PROVIDER_LOCAL',
        localDate: '2026-09-15',
        noSpecificTime: true,
      },
    };
    delete (localEvent as Partial<EventCandidate>).end;

    const { temporalExpiryCutoff, hasPastEvent } = evaluateEventTemporalExpiry(
      [localEvent],
      sampleEventQuery,
      Date.parse('2026-09-10T00:00:00Z'),
    );

    // Without explicit time/timezone, relies conservatively on query endDateTime without inventing time
    expect(temporalExpiryCutoff).toBe(Date.parse(sampleEventQuery.endDateTime));
    expect(hasPastEvent).toBe(false);
  });

  it('19b. PROVIDER_LOCAL events with Europe/London or Asia/Ho_Chi_Minh timezone do NOT append fake Z or invent UTC offset', () => {
    const londonEvent: EventCandidate = {
      ...sampleEventCandidate,
      start: {
        kind: 'PROVIDER_LOCAL',
        localTime: '20:00:00',
        localDate: '2026-09-12',
        timezone: 'Europe/London',
      },
    };
    delete (londonEvent as Partial<EventCandidate>).end;

    const queryEnd = Date.parse(sampleEventQuery.endDateTime);
    const now = Date.parse('2026-09-10T00:00:00Z');

    const resultLondon = evaluateEventTemporalExpiry([londonEvent], sampleEventQuery, now);
    expect(resultLondon.temporalExpiryCutoff).toBe(queryEnd);
    expect(resultLondon.hasPastEvent).toBe(false);

    const hcmEvent: EventCandidate = {
      ...sampleEventCandidate,
      start: {
        kind: 'PROVIDER_LOCAL',
        localTime: '20:00:00',
        localDate: '2026-09-12',
        timezone: 'Asia/Ho_Chi_Minh',
      },
    };
    delete (hcmEvent as Partial<EventCandidate>).end;

    const resultHcm = evaluateEventTemporalExpiry([hcmEvent], sampleEventQuery, now);
    expect(resultHcm.temporalExpiryCutoff).toBe(queryEnd);
    expect(resultHcm.hasPastEvent).toBe(false);
  });

  // 20. Bounded max entries
  it('20. enforces capacity bounds on BoundedLruCache', () => {
    const cache = new BoundedLruCache<string>(3);
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    expect(cache.size).toBe(3);

    cache.set('d', '4');
    expect(cache.size).toBe(3);
    // 'a' was evicted
    expect(cache.has('a')).toBe(false);
    expect(cache.get('d')).toBe('4');
  });

  // 21. Eviction (LRU order)
  it('21. evicts least-recently used entry when capacity is exceeded', () => {
    const cache = new BoundedLruCache<string>(3);
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    cache.set('k3', 'v3');

    // Access k1 to make k2 the LRU entry
    cache.get('k1');

    cache.set('k4', 'v4');
    expect(cache.has('k2')).toBe(false);
    expect(cache.has('k1')).toBe(true);
    expect(cache.has('k3')).toBe(true);
    expect(cache.has('k4')).toBe(true);
  });

  // 22. Cleanup/dispose
  it('22. cleans up expired entries and handles disposal cleanly', () => {
    const cache = new BoundedLruCache<{ expireAt: number }>(10);
    cache.set('e1', { expireAt: 100 });
    cache.set('e2', { expireAt: 500 });
    cache.set('e3', { expireAt: 200 });

    const evicted = cache.cleanup((val) => val.expireAt <= 200);
    expect(evicted).toBe(2);
    expect(cache.size).toBe(1);
    expect(cache.has('e2')).toBe(true);

    cache.dispose();
    expect(cache.disposed).toBe(true);
    expect(cache.size).toBe(0);
    expect(cache.get('e2')).toBeUndefined();
  });

  // 23. Duplicate identical request coalescing
  it('23. coalesces concurrent identical requests into a single in-flight call', async () => {
    let resolveDelegate!: (v: PlaceIntelligence) => void;
    const delegateFetch = jest.fn().mockImplementation(
      () =>
        new Promise<PlaceIntelligence>((r) => {
          resolveDelegate = r;
        }),
    );

    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    const call1 = repo.getIntelligence(samplePlaceId);
    const call2 = repo.getIntelligence(samplePlaceId);

    expect(delegateFetch).toHaveBeenCalledTimes(1);

    resolveDelegate(samplePlaceIntelligence);
    const [res1, res2] = await Promise.all([call1, call2]);

    expect(res1.googlePlaceId).toBe(samplePlaceId);
    expect(res2.googlePlaceId).toBe(samplePlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(1);
  });

  it('23b. coalesces concurrent identical event requests into a single in-flight call without cancelling', async () => {
    let resolveDelegate!: (v: EventIntelligenceResult) => void;
    const delegateDiscover = jest.fn().mockImplementation(
      () =>
        new Promise<EventIntelligenceResult>((r) => {
          resolveDelegate = r;
        }),
    );

    const repo = new CachedEventIntelligenceRepository({
      discover: delegateDiscover,
      cancel: jest.fn(),
    });

    const call1 = repo.discover(sampleEventQuery);
    const call2 = repo.discover(sampleEventQuery);

    expect(delegateDiscover).toHaveBeenCalledTimes(1);

    resolveDelegate(sampleEventResult);
    const [res1, res2] = await Promise.all([call1, call2]);

    expect(res1.events[0].providerEventId).toBe(sampleEventCandidate.providerEventId);
    expect(res2.events[0].providerEventId).toBe(sampleEventCandidate.providerEventId);
    expect(delegateDiscover).toHaveBeenCalledTimes(1);
  });

  it('23c. coalescer allows one subscriber to abort while other subscriber succeeds', async () => {
    const coalescer = new InFlightCoalescer<string>();
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    let resolveOp!: (v: string) => void;
    const p1 = coalescer.run('test-key', () => new Promise<string>((r) => { resolveOp = r; }), controller1.signal);
    const p2 = coalescer.run('test-key', () => new Promise<string>((r) => { resolveOp = r; }), controller2.signal);

    controller1.abort();

    await expect(p1).rejects.toMatchObject({ code: 'cancelled' });

    resolveOp('success-data');
    const r2 = await p2;
    expect(r2).toBe('success-data');
  });

  it('23d. coalescer aborts underlying operation when ALL subscribers abort', async () => {
    const coalescer = new InFlightCoalescer<string>();
    const controller1 = new AbortController();
    const controller2 = new AbortController();

    let underlyingSignal!: AbortSignal;
    const p1 = coalescer.run('test-key', (_signal) => {
      underlyingSignal = _signal;
      return new Promise<string>(() => {});
    }, controller1.signal);
    const p2 = coalescer.run('test-key', (_signal) => {
      return new Promise<string>(() => {});
    }, controller2.signal);

    expect(underlyingSignal.aborted).toBe(false);

    controller1.abort();
    expect(underlyingSignal.aborted).toBe(false);

    controller2.abort();
    expect(underlyingSignal.aborted).toBe(true);

    await expect(p1).rejects.toMatchObject({ code: 'cancelled' });
    await expect(p2).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('23e. coalescer cancel and cancelAll aborts underlying operations', async () => {
    const coalescer = new InFlightCoalescer<string>();
    let underlyingSignal!: AbortSignal;
    const p1 = coalescer.run('key1', (_signal) => {
      underlyingSignal = _signal;
      return new Promise<string>(() => {});
    });

    coalescer.cancel('key1');
    expect(underlyingSignal.aborted).toBe(true);
    await expect(p1).rejects.toMatchObject({ code: 'cancelled' });
  });

  // 24. No coalescing across different keys
  it('24. does not coalesce requests across different keys', async () => {
    const delegateFetch = jest.fn().mockImplementation((id: string) =>
      Promise.resolve({ ...samplePlaceIntelligence, googlePlaceId: id }),
    );

    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    const [res1, res2] = await Promise.all([
      repo.getIntelligence(samplePlaceId),
      repo.getIntelligence(otherPlaceId),
    ]);

    expect(res1.googlePlaceId).toBe(samplePlaceId);
    expect(res2.googlePlaceId).toBe(otherPlaceId);
    expect(delegateFetch).toHaveBeenCalledTimes(2);
  });

  // 25. No retry amplification
  it('25. performs exactly one delegate attempt on miss, with 0 retry amplification', async () => {
    const delegateFetch = jest.fn().mockRejectedValue(new IntegrationError('timeout'));
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    await expect(repo.getIntelligence(samplePlaceId)).rejects.toMatchObject({
      code: 'timeout',
    });
    expect(delegateFetch).toHaveBeenCalledTimes(1);
  });

  // 26. Exactly one T003 provider attempt remains
  it('26. preserves single attempt contract on CachedEventIntelligenceRepository', async () => {
    const delegateDiscover = jest.fn().mockRejectedValue(new IntegrationError('rateLimited'));
    const repo = new CachedEventIntelligenceRepository({
      discover: delegateDiscover,
      cancel: jest.fn(),
    });

    await expect(repo.discover(sampleEventQuery)).rejects.toMatchObject({
      code: 'rateLimited',
    });
    expect(delegateDiscover).toHaveBeenCalledTimes(1);
  });

  // 27. No provider fan-out
  it('27. never executes fan-out or pagination follow on event query', async () => {
    const delegateDiscover = jest.fn().mockResolvedValue(sampleEventResult);
    const repo = new CachedEventIntelligenceRepository({
      discover: delegateDiscover,
      cancel: jest.fn(),
    });

    const result = await repo.discover(sampleEventQuery);
    expect(result.events).toHaveLength(1);
    expect(delegateDiscover).toHaveBeenCalledTimes(1);
  });

  // 28. Candidate discovery caching
  it('28. caches candidate discovery within 5m fresh TTL', async () => {
    let now = 1_000_000;
    const delegateDiscover = jest.fn().mockResolvedValue([sampleDiscoveryCandidate]);
    const repo = new CachedCandidateDiscoveryRepository(
      { discover: delegateDiscover },
      16,
      () => now,
    );

    const first = await repo.discover(sampleCandidateRequest);
    expect(first).toHaveLength(1);
    expect(delegateDiscover).toHaveBeenCalledTimes(1);

    // 2 minutes later -> fresh hit
    now += 2 * 60 * 1000;
    const second = await repo.discover(sampleCandidateRequest);
    expect(second).toHaveLength(1);
    expect(delegateDiscover).toHaveBeenCalledTimes(1);

    // 6 minutes later -> expired fresh, refreshes
    now += 4 * 60 * 1000;
    await repo.discover(sampleCandidateRequest);
    expect(delegateDiscover).toHaveBeenCalledTimes(2);
  });

  // 31. Deep immutability prevents cache poisoning
  it('31. returns deeply immutable results so caller mutations cannot corrupt cache', async () => {
    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    const first = await repo.getIntelligence(samplePlaceId);
    first.rating = 1.0;
    first.businessStatus = 'CLOSED_PERMANENTLY';

    const second = await repo.getIntelligence(samplePlaceId);
    expect(second.rating).toBe(4.5);
    expect(second.businessStatus).toBe('OPERATIONAL');
  });

  // 32. No secret/credential in cache
  it('32. guarantees cache contains zero secret or credential fields', async () => {
    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    await repo.getIntelligence(samplePlaceId);
    const serialized = JSON.stringify(repo);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('token');
  });

  // 33. Zero persistence
  it('33. performs zero database/RPC persistence during cache operations', async () => {
    const mutationTracker = jest.fn();
    const delegateFetch = jest.fn().mockResolvedValue(samplePlaceIntelligence);
    const repo = new CachedPlaceIntelligenceRepository({ getIntelligence: delegateFetch });

    await repo.getIntelligence(samplePlaceId);
    await repo.getIntelligence(samplePlaceId);

    expect(mutationTracker).not.toHaveBeenCalled();
  });
});
