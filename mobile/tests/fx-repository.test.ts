import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import { IntegrationError } from '../src/integration/errors';
import { FX_ATTRIBUTION, FX_CACHE_TTL_MS, FX_FAILURE_COOLDOWN_MS, FX_MAX_AGE_MS, FX_CURRENCIES, type FxPair } from '../src/integration/fxContract';
import { ExchangeRateFxRepository, FxLruCache } from '../src/integration/remote/exchangeRateFxRepository';
import { SupabaseTripFxContextRepository } from '../src/integration/remote/supabaseTripFxContextRepository';
import { ContractValidationError } from '../src/integration/validation';
import { fxFixture, fxNow, fxResponse } from './fxFixture';

describe('ExchangeRateFxRepository refresh and resilience', () => {
  const pair: FxPair = { sourceCurrency: 'USD', destinationCurrency: 'EUR' };
  const setup = () => {
    let now = fxNow;
    const transport = jest.fn().mockResolvedValue(fxResponse());
    const repo = new ExchangeRateFxRepository(transport, () => now);
    return { repo, transport, advance: (ms: number) => { now += ms; }, now: () => now };
  };
  it('sends one public USD-only snapshot request for all eight currencies', async () => {
    const { repo, transport } = setup();
    const results = await repo.getQuotes({ pairs: FX_CURRENCIES.map(destinationCurrency => ({ sourceCurrency: 'USD', destinationCurrency })) });
    expect(results).toHaveLength(8);
    expect(results.every(r => r.state === 'fresh')).toBe(true);
    expect(results.find(r => r.destinationCurrency === 'VND')?.quote?.rate).toBe('26048');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe('https://open.er-api.com/v6/latest/USD');
    expect(transport.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
    expect(results[1].quote?.attribution).toBe(FX_ATTRIBUTION);
  });
  it('hits cache through TTL inclusive, then refreshes and replaces quote', async () => {
    const h = setup(); await h.repo.getQuote(pair);
    h.advance(FX_CACHE_TTL_MS);
    expect((await h.repo.getQuote(pair)).state).toBe('fresh');
    expect(h.transport).toHaveBeenCalledTimes(1);
    h.advance(1); h.transport.mockResolvedValue(fxResponse(fxFixture(h.now(), '0.9')));
    const result = await h.repo.getQuote(pair);
    expect(result.quote?.rate).toBe('0.9');
    expect(result.quote?.fetchedAt).toBe(new Date(h.now()).toISOString());
    expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it('coalesces concurrent TTL refresh across identical and different pairs', async () => {
    const h = setup(); await h.repo.getQuote(pair); h.advance(FX_CACHE_TTL_MS + 1);
    let finish!: (r: Response) => void;
    h.transport.mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const calls = Array.from({ length: 30 }, (_, i) => h.repo.getQuote({ ...pair, destinationCurrency: i % 2 ? 'VND' : 'EUR' }));
    expect(h.transport).toHaveBeenCalledTimes(2);
    finish(fxResponse(fxFixture(h.now(), '0.9')));
    expect((await Promise.all(calls)).every(r => r.state === 'fresh')).toBe(true);
  });
  it('failed refresh retains stale quote through cooldown and resumes afterward', async () => {
    const h = setup(); const first = await h.repo.getQuote(pair); h.advance(FX_CACHE_TTL_MS + 1);
    h.transport.mockResolvedValue(fxResponse('private provider body', 503));
    const stale = await h.repo.getQuote(pair);
    expect(stale.state).toBe('stale'); expect(stale.quote).toEqual(first.quote);
    await Promise.all(Array.from({ length: 40 }, () => h.repo.getQuote(pair)));
    expect(h.transport).toHaveBeenCalledTimes(2);
    h.advance(FX_FAILURE_COOLDOWN_MS); h.transport.mockResolvedValue(fxResponse(fxFixture(h.now(), '0.95')));
    expect((await h.repo.getQuote(pair)).quote?.rate).toBe('0.95');
    expect(h.transport).toHaveBeenCalledTimes(3);
  });
  it('never falls back beyond seven days, including crossing expiry during cooldown', async () => {
    const h = setup(); await h.repo.getQuote(pair); h.advance(FX_MAX_AGE_MS);
    h.transport.mockResolvedValue(fxResponse('', 503));
    expect((await h.repo.getQuote(pair)).state).toBe('stale');
    h.advance(1);
    expect((await h.repo.getQuote(pair)).state).toBe('unavailable');
    expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it('expired provider publication enters cooldown without a request storm', async () => {
    const h = setup(); h.transport.mockResolvedValue(fxResponse(fxFixture(fxNow - FX_MAX_AGE_MS - 1000)));
    expect((await h.repo.getQuote(pair)).reason).toBe('expired');
    await h.repo.getQuote(pair); expect(h.transport).toHaveBeenCalledTimes(1);
  });
  it.each([[429, 'busy'], [400, 'invalidResponse'], [401, 'invalidResponse'], [404, 'invalidResponse'], [500, 'providerUnavailable'], [503, 'providerUnavailable']])('sanitizes HTTP %s', async (status, reason) => {
    const h = setup(); h.transport.mockResolvedValue(fxResponse('sensitive provider response', Number(status)));
    expect(await h.repo.getQuote(pair)).toEqual({ ...pair, state: 'unavailable', reason, quote: null });
  });
  it('uses twenty-minute global cooldown on provider 429', async () => {
    const h = setup(); h.transport.mockResolvedValue(fxResponse('', 429)); await h.repo.getQuote(pair);
    h.advance(60_001); await h.repo.getQuote({ ...pair, destinationCurrency: 'VND' });
    expect(h.transport).toHaveBeenCalledTimes(1);
    h.advance(20 * 60_000); await h.repo.getQuote(pair); expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it.each(['{bad', '{1:2}', 'x'.repeat(16_385), fxFixture().replace('"base_code":"USD"', '"base_code":"EUR"'), fxFixture().replace('26048', '0')])('rejects invalid body without raw errors', async body => {
    const h = setup(); h.transport.mockResolvedValue(fxResponse(body));
    expect((await h.repo.getQuote(pair)).reason).toBe('invalidResponse');
  });
  it('maps offline/DNS transport TypeError to network and recovers', async () => {
    const h = setup(); h.transport.mockRejectedValue(new TypeError('DNS private details'));
    expect((await h.repo.getQuote(pair)).reason).toBe('network');
    h.advance(FX_FAILURE_COOLDOWN_MS); h.transport.mockResolvedValue(fxResponse());
    expect((await h.repo.getQuote(pair)).state).toBe('fresh');
  });
  it('pre-cancelled calls and identity/missing/unsupported paths do not fetch', async () => {
    const h = setup(); const controller = new AbortController(); controller.abort();
    await expect(h.repo.getQuote(pair, controller.signal)).rejects.toBeInstanceOf(IntegrationError);
    await expect(h.repo.getQuotes({ pairs: [pair] }, controller.signal)).rejects.toThrow();
    expect((await h.repo.getQuote({ ...pair, destinationCurrency: 'USD' })).quote?.provider).toBe('identity');
    expect((await h.repo.getQuote({ ...pair, destinationCurrency: null })).reason).toBe('missingDestination');
    expect((await h.repo.getQuote({ ...pair, destinationCurrency: 'CAD' })).reason).toBe('unsupportedCurrency');
    expect(h.transport).not.toHaveBeenCalled();
  });
  it('consumer cancellation during refresh leaves shared work usable', async () => {
    const h = setup(); await h.repo.getQuote(pair); h.advance(FX_CACHE_TTL_MS + 1);
    let finish!: (r: Response) => void; h.transport.mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const controller = new AbortController(); const a = h.repo.getQuote(pair, controller.signal); const b = h.repo.getQuote(pair);
    controller.abort(); await expect(a).rejects.toThrow(); finish(fxResponse(fxFixture(h.now())));
    expect((await b).state).toBe('fresh'); expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it('bounds all distinct pair callers to one active fetch (below the maximum of two)', async () => {
    const h = setup(); let finish!: (r: Response) => void;
    h.transport.mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
    const calls = FX_CURRENCIES.flatMap(sourceCurrency => FX_CURRENCIES.map(destinationCurrency => h.repo.getQuote({ sourceCurrency, destinationCurrency })));
    expect(h.transport).toHaveBeenCalledTimes(1); finish(fxResponse());
    expect((await Promise.all(calls)).every(r => r.state === 'fresh')).toBe(true);
  });
  it('timeout settles consumers and a late response cannot publish cache', async () => {
    jest.useFakeTimers();
    try {
      const h = setup(); let finish!: (r: Response) => void;
      h.transport.mockReturnValue(new Promise<Response>(resolve => { finish = resolve; }));
      const call = h.repo.getQuote(pair); await jest.advanceTimersByTimeAsync(6001);
      expect((await call).reason).toBe('timeout');
      finish(fxResponse()); await jest.advanceTimersByTimeAsync(0);
      expect((await h.repo.getQuote(pair)).reason).toBe('timeout');
      h.advance(FX_FAILURE_COOLDOWN_MS); h.transport.mockResolvedValue(fxResponse());
      expect((await h.repo.getQuote(pair)).state).toBe('fresh'); expect(h.transport).toHaveBeenCalledTimes(2);
    } finally { jest.useRealTimers(); }
  });
  it('reads streaming response within byte bounds', async () => {
    const h = setup();
    const fixtureText = fxFixture();
    const encoder = new TextEncoder();
    const bytes = encoder.encode(fixtureText);
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: bytes.slice(0, 100) })
        .mockResolvedValueOnce({ done: false, value: bytes.slice(100) })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    h.transport.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: { getReader: () => mockReader },
    } as unknown as Response);
    const result = await h.repo.getQuote(pair);
    expect(result.state).toBe('fresh');
    expect(mockReader.cancel).toHaveBeenCalled();
  });
  it('rejects streaming response exceeding maximum bytes', async () => {
    const h = setup();
    const largeChunk = new Uint8Array(8200);
    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: largeChunk })
        .mockResolvedValueOnce({ done: false, value: largeChunk })
        .mockResolvedValueOnce({ done: true, value: undefined }),
      cancel: jest.fn().mockResolvedValue(undefined),
    };
    h.transport.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      body: { getReader: () => mockReader },
    } as unknown as Response);
    const result = await h.repo.getQuote(pair);
    expect(result.reason).toBe('invalidResponse');
    expect(mockReader.cancel).toHaveBeenCalled();
  });
  it('rejects response if content-length header exceeds maximum bytes', async () => {
    const h = setup();
    const headers = new Map([['content-length', '20000']]);
    h.transport.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (k: string) => headers.get(k) ?? null },
      text: async () => fxFixture(),
    } as unknown as Response);
    const result = await h.repo.getQuote(pair);
    expect(result.reason).toBe('invalidResponse');
  });
  it('verifies no private request data (user, trip, JWT, budget) is passed to provider', async () => {
    const h = setup();
    await h.repo.getQuote(pair);
    expect(h.transport).toHaveBeenCalledTimes(1);
    const [url, init] = h.transport.mock.calls[0];
    expect(url).toBe('https://open.er-api.com/v6/latest/USD');
    expect(init.method).toBe('GET');
    expect(init.headers).toEqual({ Accept: 'application/json' });
    expect(init.body).toBeUndefined();
    expect(init.headers?.Authorization).toBeUndefined();
    expect(init.headers?.Cookie).toBeUndefined();
  });
});

describe('64-entry actual LRU', () => {
  it('promotes hits and replacements and evicts least recently used', () => {
    const cache = new FxLruCache<number>();
    for (let i = 0; i < 64; i++) cache.set(String(i), i);
    expect(cache.get('0')).toBe(0); cache.set('64', 64);
    expect(cache.get('1')).toBeUndefined(); expect(cache.get('0')).toBe(0);
    cache.set('2', 999); cache.set('65', 65);
    expect(cache.get('3')).toBeUndefined(); expect(cache.get('2')).toBe(999);
    for (let i = 66; i < 200; i++) { cache.set(String(i), i); expect(cache.size).toBeLessThanOrEqual(64); }
  });
});

describe('FEATURE-P3-T003 FX repositories', () => {
  describe('SupabaseTripFxContextRepository', () => {
    const tripId = '83000000-0000-4000-8000-000000000001';
    const validContextPayload = {
      tripId,
      originalBudget: { amount: '1250.50', currency: 'USD' },
      homeCurrency: 'USD',
      homeCurrencySource: 'originalBudget',
      destinationCurrency: null,
      destinationCurrencySource: 'unavailable',
    };

    function mockContextRepository(response: unknown) {
      const abortSignal = jest.fn().mockResolvedValue(response);
      const rpc = jest.fn().mockReturnValue({ abortSignal });
      return {
        repo: new SupabaseTripFxContextRepository({ rpc } as unknown as SupabaseClient<Database>),
        rpc,
        abortSignal,
      };
    }

    it('reads and parses budgeted trip context accurately', async () => {
      const { repo, rpc } = mockContextRepository({ data: validContextPayload, error: null });
      const context = await repo.getTripFxContext(tripId);

      expect(rpc).toHaveBeenCalledWith('get_trip_fx_context', {
        p_request: { tripId },
      });
      expect(context.tripId).toBe(tripId);
      expect(context.originalBudget.amount).toBe('1250.50');
      expect(context.originalBudget.currency).toBe('USD');
      expect(context.homeCurrency).toBe('USD');
      expect(context.destinationCurrency).toBeNull();
      expect(context.destinationCurrencySource).toBe('unavailable');
    });

    it('rejects invalid tripId format before calling RPC', async () => {
      const { repo, rpc } = mockContextRepository({ data: validContextPayload, error: null });
      await expect(repo.getTripFxContext('not-a-uuid')).rejects.toThrow(ContractValidationError);
      expect(rpc).not.toHaveBeenCalled();
    });

    it('rejects a response bound to another trip', async () => {
      const { repo } = mockContextRepository({ data: { ...validContextPayload, tripId: '83000000-0000-4000-8000-000000000002' }, error: null });
      await expect(repo.getTripFxContext(tripId)).rejects.toMatchObject({ code: 'invalidResponse' });
    });

    it('pre-cancelled context does not call RPC', async () => {
      const { repo, rpc } = mockContextRepository({ data: validContextPayload, error: null });
      const controller = new AbortController(); controller.abort();
      await expect(repo.getTripFxContext(tripId, controller.signal)).rejects.toMatchObject({ code: 'cancelled' });
      expect(rpc).not.toHaveBeenCalled();
    });

    it('maps P0002 to notFound', async () => {
      const { repo } = mockContextRepository({ data: null, error: { code: 'P0002', message: 'Trip not found.' } });
      await expect(repo.getTripFxContext(tripId)).rejects.toMatchObject({ code: 'notFound' });
    });

    it('maps 28000 to unauthorized', async () => {
      const { repo } = mockContextRepository({ data: null, error: { code: '28000', message: 'Authentication required.' } });
      await expect(repo.getTripFxContext(tripId)).rejects.toMatchObject({ code: 'unauthorized' });
    });

    it('maps 22023 to invalidRequest', async () => {
      const { repo } = mockContextRepository({ data: null, error: { code: '22023', message: 'Invalid FX context request.' } });
      await expect(repo.getTripFxContext(tripId)).rejects.toMatchObject({ code: 'invalidRequest' });
    });
  });
});
