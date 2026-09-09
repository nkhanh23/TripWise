import {
  validatePlaceBusinessStatus,
  validatePlaceOpeningHours,
  validatePlaceIntelligence,
  validatePlaceIntelligenceRequest,
} from '../src/integration/placeIntelligenceContract';
import { SupabasePlaceMetadataRepository } from '../src/integration/remote/supabasePlaceMetadataRepository';

const validPlaceId = 'ChIJaSv_6gaZ4jARnbiUVn6Z_YY';

const validOpeningHours = {
  periods: [
    {
      open: { day: 1, hour: 8, minute: 0 },
      close: { day: 1, hour: 18, minute: 0 },
    },
    {
      open: { day: 2, hour: 8, minute: 0 },
      close: { day: 2, hour: 18, minute: 0 },
    },
  ],
  weekdayDescriptions: [
    'Monday: 8:00 AM – 6:00 PM',
    'Tuesday: 8:00 AM – 6:00 PM',
  ],
  openNow: true,
};

const validEnvelopeData = {
  googlePlaceId: validPlaceId,
  rating: 4.6,
  userRatingCount: 68420,
  businessStatus: 'OPERATIONAL' as const,
  openingHours: validOpeningHours,
  utcOffsetMinutes: 420,
  provenance: {
    provider: 'google-places' as const,
    boundary: 'get-place-metadata' as const,
    fetchedAt: '2026-09-09T03:00:00.000Z',
  },
};

describe('place intelligence request validation', () => {
  it('accepts valid googlePlaceId', () => {
    const parsed = validatePlaceIntelligenceRequest({ googlePlaceId: validPlaceId });
    expect(parsed.googlePlaceId).toBe(validPlaceId);
  });

  test.each([
    { googlePlaceId: '' },
    { googlePlaceId: 'abc' },
    { googlePlaceId: 'x'.repeat(201) },
    { googlePlaceId: 'invalid place with spaces' },
    { googlePlaceId: null },
    { googlePlaceId: undefined },
    { googlePlaceId: 12345 },
    { googlePlaceId: validPlaceId, extraField: 'prohibited' },
  ])('rejects invalid request: %j', (req) => {
    expect(() => validatePlaceIntelligenceRequest(req)).toThrow();
  });
});

describe('place business status normalization', () => {
  it('preserves known business status enum values', () => {
    expect(validatePlaceBusinessStatus('OPERATIONAL')).toBe('OPERATIONAL');
    expect(validatePlaceBusinessStatus('CLOSED_TEMPORARILY')).toBe('CLOSED_TEMPORARILY');
    expect(validatePlaceBusinessStatus('CLOSED_PERMANENTLY')).toBe('CLOSED_PERMANENTLY');
    expect(validatePlaceBusinessStatus('UNKNOWN')).toBe('UNKNOWN');
  });

  it('returns UNKNOWN when status is absent or null', () => {
    expect(validatePlaceBusinessStatus(undefined)).toBe('UNKNOWN');
    expect(validatePlaceBusinessStatus(null)).toBe('UNKNOWN');
  });

  test.each([
    '',
    'OPEN',
    'PERMANENTLY_CLOSED',
    'operational',
    'CLOSED',
    123,
    {},
  ])('fails closed for present but unsupported status: %j', (raw) => {
    expect(() => validatePlaceBusinessStatus(raw)).toThrow();
  });
});

describe('place opening hours validation', () => {
  it('returns null for null or undefined hours', () => {
    expect(validatePlaceOpeningHours(null)).toBeNull();
    expect(validatePlaceOpeningHours(undefined)).toBeNull();
  });

  it('validates and normalizes structured opening hours', () => {
    const parsed = validatePlaceOpeningHours(validOpeningHours);
    expect(parsed).not.toBeNull();
    expect(parsed?.periods).toHaveLength(2);
    expect(parsed?.periods[0].open).toEqual({ day: 1, hour: 8, minute: 0 });
    expect(parsed?.periods[0].close).toEqual({ day: 1, hour: 18, minute: 0 });
    expect(parsed?.weekdayDescriptions).toHaveLength(2);
    expect(parsed?.openNow).toBe(true);
  });

  it('supports 24/7 locations with open time point but no close', () => {
    const hours24_7 = {
      periods: [{ open: { day: 0, hour: 0, minute: 0 } }],
      weekdayDescriptions: ['Open 24 hours'],
    };
    const parsed = validatePlaceOpeningHours(hours24_7);
    expect(parsed?.periods[0].open).toEqual({ day: 0, hour: 0, minute: 0 });
    expect(parsed?.periods[0].close).toBeUndefined();
    expect(parsed?.openNow).toBeUndefined();
  });

  test.each([
    { ...validOpeningHours, periods: 'not-an-array' },
    { ...validOpeningHours, periods: Array(29).fill(validOpeningHours.periods[0]) },
    { ...validOpeningHours, periods: [{ open: { day: -1, hour: 10, minute: 0 } }] },
    { ...validOpeningHours, periods: [{ open: { day: 7, hour: 10, minute: 0 } }] },
    { ...validOpeningHours, periods: [{ open: { day: 1, hour: 24, minute: 0 } }] },
    { ...validOpeningHours, periods: [{ open: { day: 1, hour: -1, minute: 0 } }] },
    { ...validOpeningHours, periods: [{ open: { day: 1, hour: 10, minute: 60 } }] },
    { ...validOpeningHours, periods: [{ open: { day: 1, hour: 10, minute: -1 } }] },
    { ...validOpeningHours, periods: [{ open: { day: 1, hour: 10, minute: 0, extraKey: 1 } }] },
    { ...validOpeningHours, weekdayDescriptions: Array(8).fill('Monday: 9-5') },
    { ...validOpeningHours, weekdayDescriptions: ['x'.repeat(201)] },
    { ...validOpeningHours, openNow: 'yes' },
    { ...validOpeningHours, extraPayload: 'not-allowed' },
  ])('fails closed on malformed opening hours: %j', (malformed) => {
    expect(() => validatePlaceOpeningHours(malformed)).toThrow();
  });
});

describe('place intelligence validation and provenance', () => {
  it('validates full place intelligence payload and attaches client provenance', () => {
    const clientReceivedAt = '2026-09-09T03:01:00.000Z';
    const intelligence = validatePlaceIntelligence(validEnvelopeData, clientReceivedAt);

    expect(intelligence.kind).toBe('live-place-intelligence');
    expect(intelligence.googlePlaceId).toBe(validPlaceId);
    expect(intelligence.businessStatus).toBe('OPERATIONAL');
    expect(intelligence.openingHours).not.toBeNull();
    expect(intelligence.rating).toBe(4.6);
    expect(intelligence.userRatingCount).toBe(68420);
    expect(intelligence.utcOffsetMinutes).toBe(420);
    expect(intelligence.provenance).toEqual({
      provider: 'google-places',
      boundary: 'get-place-metadata',
      observation: 'CLIENT_RECEIVED',
      fetchedAt: '2026-09-09T03:00:00.000Z',
      receivedAt: clientReceivedAt,
    });
  });

  it('accepts minimal payload with missing optional attributes', () => {
    const minimal = {
      googlePlaceId: validPlaceId,
      businessStatus: 'UNKNOWN',
      openingHours: null,
      provenance: {
        provider: 'google-places',
        boundary: 'get-place-metadata',
        fetchedAt: '2026-09-09T03:00:00.000Z',
      },
    };
    const intelligence = validatePlaceIntelligence(minimal);
    expect(intelligence.businessStatus).toBe('UNKNOWN');
    expect(intelligence.openingHours).toBeNull();
    expect(intelligence.rating).toBeUndefined();
    expect(intelligence.userRatingCount).toBeUndefined();
    expect(intelligence.utcOffsetMinutes).toBeUndefined();
    expect(intelligence.provenance.provider).toBe('google-places');
    expect(intelligence.provenance.observation).toBe('CLIENT_RECEIVED');
  });

  test.each([
    { ...validEnvelopeData, kind: 'invented-kind' },
    { ...validEnvelopeData, businessStatus: 'OPEN' },
    { ...validEnvelopeData, businessStatus: 'INVALID' },
    { ...validEnvelopeData, rating: -0.1 },
    { ...validEnvelopeData, rating: 5.1 },
    { ...validEnvelopeData, rating: NaN },
    { ...validEnvelopeData, userRatingCount: -1 },
    { ...validEnvelopeData, userRatingCount: 1.5 },
    { ...validEnvelopeData, utcOffsetMinutes: -841 },
    { ...validEnvelopeData, utcOffsetMinutes: 841 },
    { ...validEnvelopeData, extraField: 'forbidden' },
    { ...validEnvelopeData, provenance: { ...validEnvelopeData.provenance, provider: 'gemini' } },
    { ...validEnvelopeData, provenance: { ...validEnvelopeData.provenance, boundary: 'explore-places' } },
    { ...validEnvelopeData, provenance: { ...validEnvelopeData.provenance, fetchedAt: 'invalid-date' } },
  ])('rejects invalid or poisoned intelligence payload: %j', (poisoned) => {
    expect(() => validatePlaceIntelligence(poisoned)).toThrow();
  });
});

describe('SupabasePlaceMetadataRepository / SupabasePlaceIntelligenceRepository', () => {
  function createMockSupabase(invokeResult: { data: unknown; error: unknown }) {
    const invoke = jest.fn().mockResolvedValue(invokeResult);
    const mutation = jest.fn(() => { throw new Error('Persistence forbidden in Place Intelligence'); });
    const client = {
      functions: { invoke },
      from: mutation,
      rpc: mutation,
      storage: mutation,
    };
    return { client, invoke, mutation };
  }

  it('getIntelligence successfully fetches and parses live place intelligence', async () => {
    const { client, invoke, mutation } = createMockSupabase({
      data: { data: validEnvelopeData },
      error: null,
    });

    const repo = new SupabasePlaceMetadataRepository(client as never);
    const result = await repo.getIntelligence(validPlaceId as never);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('get-place-metadata', {
      body: { googlePlaceId: validPlaceId },
    });
    expect(mutation).not.toHaveBeenCalled();
    expect(result.kind).toBe('live-place-intelligence');
    expect(result.googlePlaceId).toBe(validPlaceId);
    expect(result.businessStatus).toBe('OPERATIONAL');
    expect(result.provenance.provider).toBe('google-places');
  });

  it('forwards AbortSignal for cancellation', async () => {
    const { client, invoke } = createMockSupabase({
      data: { data: validEnvelopeData },
      error: null,
    });
    const controller = new AbortController();
    const repo = new SupabasePlaceMetadataRepository(client as never);

    await repo.getIntelligence(validPlaceId as never, controller.signal);
    expect(invoke).toHaveBeenCalledWith('get-place-metadata', {
      body: { googlePlaceId: validPlaceId },
      signal: controller.signal,
    });
  });

  it('maps 401/403 error safely to unauthorized without leaking provider internals', async () => {
    const { client } = createMockSupabase({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 401,
          json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } }),
        },
      },
    });

    const repo = new SupabasePlaceMetadataRepository(client as never);
    await expect(repo.getIntelligence(validPlaceId as never)).rejects.toMatchObject({
      code: 'unauthorized',
    });
  });

  it('maps 429 rate limit safely to rateLimited', async () => {
    const { client } = createMockSupabase({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 429,
          json: async () => ({ error: { code: 'PLACE_PROVIDER_RATE_LIMITED', message: 'Rate limit' } }),
        },
      },
    });

    const repo = new SupabasePlaceMetadataRepository(client as never);
    await expect(repo.getIntelligence(validPlaceId as never)).rejects.toMatchObject({
      code: 'rateLimited',
    });
  });

  it('maps 5xx provider failure safely to providerUnavailable', async () => {
    const { client } = createMockSupabase({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 502,
          json: async () => ({ error: { code: 'PLACE_PROVIDER_UNAVAILABLE', message: 'Upstream failed' } }),
        },
      },
    });

    const repo = new SupabasePlaceMetadataRepository(client as never);
    await expect(repo.getIntelligence(validPlaceId as never)).rejects.toMatchObject({
      code: 'providerUnavailable',
    });
  });

  it('maps malformed response envelope to invalidResponse', async () => {
    const { client } = createMockSupabase({
      data: { wrongKey: 'missing-data-envelope' },
      error: null,
    });

    const repo = new SupabasePlaceMetadataRepository(client as never);
    await expect(repo.getIntelligence(validPlaceId as never)).rejects.toMatchObject({
      code: 'invalidResponse',
    });
  });

  it('preserves backwards-compatible getMetadata with caching', async () => {
    const { client, invoke } = createMockSupabase({
      data: {
        data: {
          googlePlaceId: 'ChIJcachedPlace123',
          rating: 4.8,
          userRatingCount: 1200,
        },
      },
      error: null,
    });

    const repo = new SupabasePlaceMetadataRepository(client as never);
    const meta1 = await repo.getMetadata('ChIJcachedPlace123');
    expect(meta1.rating).toBe(4.8);
    expect(invoke).toHaveBeenCalledTimes(1);

    // Second call should hit memory cache within TTL
    const meta2 = await repo.getMetadata('ChIJcachedPlace123');
    expect(meta2.rating).toBe(4.8);
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});
