import {
  classifyFxQuote,
  convertFx,
  fxCurrency,
  fxUnavailable,
  identityFx,
  parseExchangeRateSnapshot,
  quoteFromSnapshot,
  divideFxRates,
  FX_SOURCE_ID,
  parseFxConversion,
  parseFxQuote,
  parseFxRate,
  parseFxResult,
  parseProviderJson,
  parseTripFxContext,
  supportsFx,
  validateFxPair,
  validateFxRequest,
  FxContractError,
  FX_ATTRIBUTION,
  FX_CACHE_TTL_MS,
  FX_FRESH_MS,
  FX_MAX_AGE_MS,
  FX_CURRENCIES,
  type FxPair,
  type FxQuote,
} from '../src/integration/fxContract';
import { fxFixture, fxNow } from './fxFixture';

describe('Final provider exact normalization and regressions', () => {
  const pair = { sourceCurrency: 'USD', destinationCurrency: 'EUR' };
  const snapshot = () => parseExchangeRateSnapshot(parseProviderJson(fxFixture()), fxNow);
  it('records vendor composite source, publication seconds and explicit cross-rate basis', () => {
    const quote = quoteFromSnapshot(snapshot(), pair, fxNow);
    expect(quote.sourceId).toBe(FX_SOURCE_ID);
    expect(quote.timestampPrecision).toBe('second');
    expect(quote.rateBasis).toBe('usd-cross-half-up-18dp');
    expect(quote.quotedAt).toBe(new Date(fxNow).toISOString());
    expect(quote.rate).toBe('0.86101');
  });
  it.each([['1', '3', '0.333333333333333333'], ['2', '3', '0.666666666666666667'], ['26048', '1', '26048'], ['1', '26048', '0.000038390663390663']])('normalizes %s / %s using exact half-up division', (d, s, expected) => {
    expect(divideFxRates(d, s)).toBe(expected);
  });
  it('expired result has strict keys and can preserve original through conversion', () => {
    const quote = quoteFromSnapshot(snapshot(), pair, fxNow);
    const now = fxNow + FX_MAX_AGE_MS + 1;
    const result = classifyFxQuote(quote, now);
    expect(Object.keys(result).sort()).toEqual(['destinationCurrency', 'quote', 'reason', 'sourceCurrency', 'state']);
    expect(convertFx('0.10', 'USD', result, now).originalAmount).toBe('0.10');
  });
  it.each(['JPY', 'VND', 'KRW'])('rounds %s half-up to zero decimals without changing original', destinationCurrency => {
    const quote = { ...quoteFromSnapshot(snapshot(), { ...pair, destinationCurrency }, fxNow), rate: '5' };
    const conversion = convertFx('0.10', 'USD', classifyFxQuote(quote, fxNow), fxNow);
    expect(conversion.convertedAmount).toBe('1'); expect(conversion.originalAmount).toBe('0.10');
    expect(parseFxConversion(conversion, fxNow)).toEqual(conversion);
  });
  it.each(['USD', 'EUR', 'GBP', 'SGD', 'THB'])('rounds %s to two decimals', destinationCurrency => {
    const p = { sourceCurrency: 'VND', destinationCurrency };
    const quote = { ...quoteFromSnapshot(snapshot(), p, fxNow), rate: '0.05' };
    expect(convertFx('0.10', 'VND', classifyFxQuote(quote, fxNow), fxNow).convertedAmount).toBe('0.01');
  });
  it('rejects input and rate overflow instead of binary float conversion', () => {
    expect(() => divideFxRates('999999999999', '0.000000000000000001')).toThrow();
    expect(() => convertFx('10000000000000000000000.00', 'USD', identityFx({ sourceCurrency: 'USD', destinationCurrency: 'USD' }, fxNow), fxNow)).toThrow();
  });
  it('allows eight requested pairs and classifies exact freshness boundaries', () => {
    expect(validateFxRequest({ pairs: Array(8).fill(pair) }).pairs).toEqual([pair]);
    const q = quoteFromSnapshot(snapshot(), pair, fxNow);
    expect(classifyFxQuote({ ...q, fetchedAt: new Date(fxNow + FX_FRESH_MS).toISOString() }, fxNow + FX_FRESH_MS).state).toBe('fresh');
    expect(classifyFxQuote(q, fxNow + FX_MAX_AGE_MS).state).toBe('stale');
  });
  it.each(['{1:2}', '{"x":01}', '{"x":+1}', '{"x":.1}', '{"x":1.}', '{"x":"truncated\\', '{"x":"\\q"}', '{"x":1e}', '{"x":NaN}'])('rejects malformed original JSON %s', raw => {
    expect(() => parseProviderJson(raw)).toThrow();
  });
  it('preserves all legal escapes, unicode, nested arrays, negatives and exponents lexically', () => {
    const note = 'rate 123 "quoted" \\ backslash \n newline';
    const raw = ` { "note": ${JSON.stringify(note)}, "unicode":"\\u20ac", "nested":[-1.20,1e-7,{"rate":0.123456789012345678}] } `;
    expect(parseProviderJson(raw)).toEqual({ note, unicode: '€', nested: ['-1.20', '1e-7', { rate: '0.123456789012345678' }] });
  });
  it.each(['missingDestination', 'unsupportedCurrency', 'expired', 'timeout', 'network', 'providerUnavailable', 'invalidResponse', 'busy'] as const)('preserves originals for unavailable %s', reason => {
    const result = convertFx('1250.50', 'USD', fxUnavailable(pair, reason), fxNow);
    expect(result.originalAmount).toBe('1250.50'); expect(result.originalCurrency).toBe('USD'); expect(result.convertedAmount).toBeNull();
  });
  it('preserves nullable persisted home currency without inventing Settings currency', () => {
    const context = parseTripFxContext({ tripId: '83000000-0000-4000-8000-000000000001', originalBudget: { amount: '1.00', currency: null }, homeCurrency: null, homeCurrencySource: 'originalBudget', destinationCurrency: null, destinationCurrencySource: 'unavailable' });
    expect(context.originalBudget.amount).toBe('1.00'); expect(context.homeCurrency).toBeNull();
  });
});

describe('FEATURE-P3-T003 FX contract', () => {
  const now = Date.UTC(2026, 8, 7, 12, 0, 0); // 2026-09-07T12:00:00.000Z
  const usdEurPair: FxPair = { sourceCurrency: 'USD', destinationCurrency: 'EUR' };
  const usdVndPair: FxPair = { sourceCurrency: 'USD', destinationCurrency: 'VND' };
  const validProviderQuote: FxQuote = {
    sourceCurrency: 'USD',
    destinationCurrency: 'EUR',
    rate: '0.86101',
    provider: 'exchangerate-api-open',
    quotedAt: '2026-09-07T00:00:00.000Z',
    fetchedAt: '2026-09-07T12:00:00.000Z',
    timestampPrecision: 'second', sourceId: FX_SOURCE_ID, rateBasis: 'usd-cross-half-up-18dp',
    attribution: FX_ATTRIBUTION,
  };

  describe('Pair and request validation', () => {
    it('validates pairs and deduplicates requests', () => {
      const request = {
        pairs: [
          { sourceCurrency: 'USD', destinationCurrency: 'EUR' },
          { sourceCurrency: 'USD', destinationCurrency: 'EUR' },
          { sourceCurrency: 'USD', destinationCurrency: 'VND' },
        ],
      };
      const validated = validateFxRequest(request);
      expect(validated.pairs).toHaveLength(2);
      expect(validated.pairs[0]).toEqual({ sourceCurrency: 'USD', destinationCurrency: 'EUR' });
      expect(validated.pairs[1]).toEqual({ sourceCurrency: 'USD', destinationCurrency: 'VND' });
    });

    it('allows null destinationCurrency representing unavailable destination', () => {
      const pair = validateFxPair({ sourceCurrency: 'USD', destinationCurrency: null });
      expect(pair).toEqual({ sourceCurrency: 'USD', destinationCurrency: null });
    });

    it.each([
      { pairs: [] },
      { pairs: Array(9).fill({ sourceCurrency: 'USD', destinationCurrency: 'EUR' }) },
      { pairs: [{ sourceCurrency: 'invalid', destinationCurrency: 'EUR' }] },
      { pairs: [{ sourceCurrency: 'USD', destinationCurrency: 'TOOLONG' }] },
      { pairs: 'not-an-array' },
      { extraKey: true, pairs: [{ sourceCurrency: 'USD', destinationCurrency: 'EUR' }] },
    ])('rejects invalid request: %j', invalidReq => {
      expect(() => validateFxRequest(invalidReq)).toThrow(FxContractError);
    });

    it('validates supported currencies correctly', () => {
      const supported = ['USD', 'VND', 'THB', 'JPY', 'EUR', 'GBP', 'SGD', 'KRW'];
      for (const curr of supported) {
        expect(supportsFx(curr)).toBe(true);
      }
      expect(supportsFx('CAD')).toBe(false);
      expect(supportsFx('AUD')).toBe(false);
      expect(supportsFx('XYZ')).toBe(false);
      expect(fxCurrency('USD')).toBe(true);
      expect(fxCurrency('usd')).toBe(false);
      expect(fxCurrency('123')).toBe(false);
    });
  });

  describe('Quote parsing & rate validation', () => {
    it('parses valid vendor quote with second precision', () => {
      const parsed = parseFxQuote(validProviderQuote, usdEurPair, now);
      expect(parsed.rate).toBe('0.86101');
      expect(parsed.provider).toBe('exchangerate-api-open');
      expect(parsed.timestampPrecision).toBe('second');
      expect(parsed.attribution).toBe(FX_ATTRIBUTION);
    });

    it('rejects quotes with wrong currency pair or unapproved provider', () => {
      expect(() => parseFxQuote({ ...validProviderQuote, sourceCurrency: 'EUR' }, usdEurPair, now)).toThrow(FxContractError);
      expect(() => parseFxQuote({ ...validProviderQuote, destinationCurrency: 'GBP' }, usdEurPair, now)).toThrow(FxContractError);
      expect(() => parseFxQuote({ ...validProviderQuote, provider: 'frankfurter-bdi' as any }, usdEurPair, now)).toThrow(FxContractError);
      expect(() => parseFxQuote({ ...validProviderQuote, timestampPrecision: 'hour' as any }, usdEurPair, now)).toThrow(FxContractError);
      expect(() => parseFxQuote({ ...validProviderQuote, attribution: 'Wrong attribution' }, usdEurPair, now)).toThrow(FxContractError);
    });

    it.each([
      '0',
      '-1.0',
      '-0.86',
      '0.000',
      'NaN',
      'Infinity',
      '1e-5',
      '1E5',
      '1.2.3',
      'abc',
      null,
      undefined,
      0.86,
    ])('rejects non-standard or non-positive rate: %j', invalidRate => {
      expect(() => parseFxRate(invalidRate)).toThrow(FxContractError);
    });

    it('parses rates up to 18 decimal places without loss', () => {
      const rate18 = '0.123456789012345678';
      expect(parseFxRate(rate18)).toBe(rate18);
      const largeIntRate = '26048';
      expect(parseFxRate(largeIntRate)).toBe(largeIntRate);
    });

    it('tolerates timestamps up to 5 minutes in future and rejects beyond', () => {
      const futureOk = new Date(now + 4 * 60 * 1000).toISOString();
      const futureBad = new Date(now + 6 * 60 * 1000).toISOString();
      expect(() => parseFxQuote({ ...validProviderQuote, fetchedAt: futureOk }, usdEurPair, now)).not.toThrow();
      expect(() => parseFxQuote({ ...validProviderQuote, fetchedAt: futureBad }, usdEurPair, now)).toThrow(FxContractError);
    });
  });

  describe('Identity conversion & regression against top-level spread bug', () => {
    it('produces an identity FxResult with strict top-level keys that passes parseFxResult', () => {
      const identityResult = identityFx({ sourceCurrency: 'USD', destinationCurrency: 'USD' }, now);

      // Must strictly have only the declared top-level keys
      const topLevelKeys = Object.keys(identityResult).sort();
      expect(topLevelKeys).toEqual(['destinationCurrency', 'quote', 'reason', 'sourceCurrency', 'state']);

      // Proves no spread of quote fields onto the top-level FxResult
      expect((identityResult as any).rate).toBeUndefined();
      expect((identityResult as any).provider).toBeUndefined();
      expect((identityResult as any).quotedAt).toBeUndefined();
      expect((identityResult as any).fetchedAt).toBeUndefined();
      expect((identityResult as any).timestampPrecision).toBeUndefined();
      expect((identityResult as any).attribution).toBeUndefined();

      // Regression: passes parseFxResult without throwing
      const parsed = parseFxResult(identityResult, { sourceCurrency: 'USD', destinationCurrency: 'USD' }, now);
      expect(parsed.state).toBe('fresh');
      expect(parsed.reason).toBeNull();
      expect(parsed.quote).not.toBeNull();
      expect(parsed.quote?.provider).toBe('identity');
      expect(parsed.quote?.rate).toBe('1');
      expect(parsed.quote?.quotedAt).toBeNull();
      expect(parsed.quote?.fetchedAt).toBeNull();
      expect(parsed.quote?.timestampPrecision).toBe('identity');
      expect(parsed.quote?.attribution).toBe('Identity conversion; no external quote');
    });

    it('convertFx accepts identity result and preserves exact amount', () => {
      const identityResult = identityFx({ sourceCurrency: 'USD', destinationCurrency: 'USD' }, now);
      const conversion = convertFx('150.25', 'USD', identityResult, now);
      expect(conversion.originalAmount).toBe('150.25');
      expect(conversion.originalCurrency).toBe('USD');
      expect(conversion.displayCurrency).toBe('USD');
      expect(conversion.convertedAmount).toBe('150.25');
      expect(conversion.displayFractionDigits).toBe(2);
    });

    it('rejects identity if source !== destination', () => {
      expect(() => parseFxQuote({
        sourceCurrency: 'USD',
        destinationCurrency: 'EUR',
        rate: '1',
        provider: 'identity',
        quotedAt: null,
        fetchedAt: null,
        timestampPrecision: 'identity', sourceId: null, rateBasis: 'identity',
        attribution: 'Identity conversion; no external quote',
      }, usdEurPair, now)).toThrow(FxContractError);
    });
  });

  describe('Freshness and staleness policy', () => {
    it('classifies quote as fresh when <= 4 days old and retrieved <= 1h ago', () => {
      const freshQuote: FxQuote = {
        ...validProviderQuote,
        quotedAt: '2026-09-05T00:00:00.000Z', // 2.5 days old
        fetchedAt: new Date(now - 30 * 60 * 1000).toISOString(), // 30m ago
      };
      const classified = classifyFxQuote(freshQuote, now);
      expect(classified.state).toBe('fresh');
      expect(classified.reason).toBeNull();
    });

    it('classifies quote as stale when > 4 days old but <= 7 days old', () => {
      const staleQuote: FxQuote = {
        ...validProviderQuote,
        quotedAt: '2026-09-02T00:00:00.000Z', // 5.5 days old
        fetchedAt: new Date(now - 30 * 60 * 1000).toISOString(),
      };
      const classified = classifyFxQuote(staleQuote, now);
      expect(classified.state).toBe('stale');
      expect(classified.reason).toBeNull();
    });

    it('classifies quote as stale when retrieved > 1h ago even if quote date is recent', () => {
      const staleRetrievalQuote: FxQuote = {
        ...validProviderQuote,
        quotedAt: '2026-09-07T00:00:00.000Z',
        fetchedAt: new Date(now - (FX_CACHE_TTL_MS + 1000)).toISOString(), // 61m ago
      };
      const classified = classifyFxQuote(staleRetrievalQuote, now);
      expect(classified.state).toBe('stale');
      expect(classified.reason).toBeNull();
    });

    it('marks quote as unavailable with expired reason when > 7 days old', () => {
      const expiredQuote: FxQuote = {
        ...validProviderQuote,
        quotedAt: '2026-08-25T00:00:00.000Z', // 13 days old
        fetchedAt: new Date(now - 10 * 1000).toISOString(),
      };
      const classified = classifyFxQuote(expiredQuote, now);
      expect(classified.state).toBe('unavailable');
      expect(classified.reason).toBe('expired');
      expect(classified.quote).toBeNull();
    });
  });

  describe('Exact decimal conversion & rounding', () => {
    it('converts USD to EUR with 2 fractional digits using half-up rounding', () => {
      const result = classifyFxQuote(validProviderQuote, now);
      // 10.55 * 0.86101 = 9.0836555 -> 9.08
      const conversion = convertFx('10.55', 'USD', result, now);
      expect(conversion.originalAmount).toBe('10.55');
      expect(conversion.originalCurrency).toBe('USD');
      expect(conversion.displayCurrency).toBe('EUR');
      expect(conversion.convertedAmount).toBe('9.08');
      expect(conversion.displayFractionDigits).toBe(2);
    });

    it('converts USD to VND with 0 fractional digits (zero-decimal currency)', () => {
      const vndQuote: FxQuote = {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        rate: '26048',
        provider: 'exchangerate-api-open',
        quotedAt: '2026-09-07T00:00:00.000Z',
        fetchedAt: '2026-09-07T12:00:00.000Z',
        timestampPrecision: 'second', sourceId: FX_SOURCE_ID, rateBasis: 'usd-cross-half-up-18dp',
        attribution: FX_ATTRIBUTION,
      };
      const result = classifyFxQuote(vndQuote, now);
      // 100.00 * 26048 = 2604800
      const conversion = convertFx('100.00', 'USD', result, now);
      expect(conversion.originalAmount).toBe('100.00');
      expect(conversion.displayCurrency).toBe('VND');
      expect(conversion.convertedAmount).toBe('2604800');
      expect(conversion.displayFractionDigits).toBe(0);

      // 0.05 * 26048 = 1302.4 -> 1302
      const smallConversion = convertFx('0.05', 'USD', result, now);
      expect(smallConversion.convertedAmount).toBe('1302');
    });

    it('handles negative amounts and never produces -0 or -0.00', () => {
      const result = classifyFxQuote(validProviderQuote, now);
      const negativeConversion = convertFx('-50.00', 'USD', result, now);
      expect(negativeConversion.originalAmount).toBe('-50.00');
      expect(negativeConversion.convertedAmount).toBe('-43.05');

      // Zero-rounding from small negative should produce '0.00' not '-0.00'
      const tinyRate: FxQuote = {
        ...validProviderQuote,
        rate: '0.000000000000000001',
      };
      const tinyResult = classifyFxQuote(tinyRate, now);
      const roundedZero = convertFx('-0.01', 'USD', tinyResult, now);
      expect(roundedZero.convertedAmount).toBe('0.00');
    });

    it('handles large amounts without overflow', () => {
      const result = classifyFxQuote(validProviderQuote, now);
      const hugeAmount = '9999999999999999999999.99';
      const conversion = convertFx(hugeAmount, 'USD', result, now);
      expect(conversion.originalAmount).toBe(hugeAmount);
      expect(typeof conversion.convertedAmount).toBe('string');
      expect(conversion.convertedAmount).toBe('8610099999999999999999.99');
    });

    it('returns null convertedAmount when FX is unavailable, preserving original amount and currency', () => {
      const unavailable = fxUnavailable(usdEurPair, 'timeout');
      const conversion = convertFx('1250.00', 'USD', unavailable, now);
      expect(conversion.originalAmount).toBe('1250.00');
      expect(conversion.originalCurrency).toBe('USD');
      expect(conversion.displayCurrency).toBe('EUR');
      expect(conversion.convertedAmount).toBeNull();
      expect(conversion.displayFractionDigits).toBeNull();
      expect(conversion.fx.state).toBe('unavailable');
      expect(conversion.fx.reason).toBe('timeout');
    });
  });

  describe('Provider JSON parser (numeric token preservation)', () => {
    it('preserves numeric tokens as exact strings before float conversion', () => {
      const rawJson = '[{"date":"2026-09-07","base":"USD","quote":"EUR","rate":0.86101,"providers":[{"key":"RBA","date":"2026-09-07","rate":0.86101}]}]';
      const parsed = parseProviderJson(rawJson) as any;
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].rate).toBe('0.86101');
      expect(parsed[0].providers[0].rate).toBe('0.86101');
    });

    it('preserves 18-digit fractional precision', () => {
      const rawJson = '{"rate": 0.123456789012345678}';
      const parsed = parseProviderJson(rawJson) as any;
      expect(parsed.rate).toBe('0.123456789012345678');
    });

    it('preserves strings containing numbers and escaped characters', () => {
      const rawJson = '{"note": "Rates for 2026-09-07 with \\"escaped\\" quotes and \\\\ backslash", "value": 42}';
      const parsed = parseProviderJson(rawJson) as any;
      expect(parsed.note).toBe('Rates for 2026-09-07 with "escaped" quotes and \\ backslash');
      expect(parsed.value).toBe('42');
    });

    it('rejects oversized responses (> 16,384 bytes)', () => {
      const largeText = '{"data": "' + 'a'.repeat(16_385) + '"}';
      expect(() => parseProviderJson(largeText)).toThrow(FxContractError);
    });

    it('rejects malformed JSON', () => {
      expect(() => parseProviderJson('{ not json }')).toThrow(FxContractError);
      expect(() => parseProviderJson('{"rate": }')).toThrow(FxContractError);
    });
  });

  describe('parseTripFxContext', () => {
    const validContext = {
      tripId: '83000000-0000-4000-8000-000000000001',
      originalBudget: {
        amount: '1250.50',
        currency: 'USD',
      },
      homeCurrency: 'USD',
      homeCurrencySource: 'originalBudget',
      destinationCurrency: null,
      destinationCurrencySource: 'unavailable',
    };

    it('parses budgeted trip context correctly', () => {
      const parsed = parseTripFxContext(validContext);
      expect(parsed.tripId).toBe('83000000-0000-4000-8000-000000000001');
      expect(parsed.originalBudget.amount).toBe('1250.50');
      expect(parsed.originalBudget.currency).toBe('USD');
      expect(parsed.homeCurrency).toBe('USD');
      expect(parsed.destinationCurrency).toBeNull();
      expect(parsed.destinationCurrencySource).toBe('unavailable');
    });

    it('parses unbudgeted trip context (amount is null)', () => {
      const unbudgeted = {
        ...validContext,
        originalBudget: { amount: null, currency: 'VND' },
        homeCurrency: 'VND',
      };
      const parsed = parseTripFxContext(unbudgeted);
      expect(parsed.originalBudget.amount).toBeNull();
      expect(parsed.originalBudget.currency).toBe('VND');
      expect(parsed.homeCurrency).toBe('VND');
    });

    it.each([
      { ...validContext, extraField: 'spoof' },
      { ...validContext, tripId: 'bad-uuid' },
      { ...validContext, destinationCurrency: 'EUR' },
      { ...validContext, homeCurrency: 'EUR' }, // mismatch with budget.currency
      { ...validContext, homeCurrencySource: 'inferred' },
      { ...validContext, destinationCurrencySource: 'guessed' },
      { ...validContext, originalBudget: { amount: '100.000', currency: 'USD' } }, // invalid decimal format
    ])('rejects invalid trip fx context: %j', invalidCtx => {
      expect(() => parseTripFxContext(invalidCtx)).toThrow(FxContractError);
    });
  });

  describe('parseExchangeRateSnapshot and cross-rate regressions', () => {
    it('parses valid snapshot and verifies all eight required currencies exist with exact rates', () => {
      const snap = parseExchangeRateSnapshot(parseProviderJson(fxFixture()), fxNow);
      for (const code of FX_CURRENCIES) {
        expect(snap.rates[code]).toBeDefined();
        expect(typeof snap.rates[code]).toBe('string');
      }
      expect(snap.rates.USD).toBe('1');
    });

    it.each(FX_CURRENCIES)('rejects snapshot missing required currency %s', missingCode => {
      const valid = JSON.parse(fxFixture());
      delete valid.rates[missingCode];
      expect(() => parseExchangeRateSnapshot(valid, fxNow)).toThrow(FxContractError);
    });

    it('rejects snapshot when USD rate is not exactly 1', () => {
      const valid = JSON.parse(fxFixture());
      valid.rates.USD = '1.05';
      expect(() => parseExchangeRateSnapshot(valid, fxNow)).toThrow(FxContractError);
    });

    it('rejects snapshot with too many rates (> 200)', () => {
      const valid = JSON.parse(fxFixture());
      const tooManyRates: Record<string, string> = { ...valid.rates };
      for (let i = 0; i < 201; i++) {
        tooManyRates[`C${String(i).padStart(2, '0')}`] = '1.23';
      }
      expect(() => parseExchangeRateSnapshot({ ...valid, rates: tooManyRates }, fxNow)).toThrow(FxContractError);
    });

    it.each([
      { result: 'error' },
      { provider: 'https://unapproved-provider.com' },
      { documentation: 'https://wrong-doc.com' },
      { terms_of_use: 'https://wrong-terms.com' },
      { base_code: 'EUR' },
      { time_last_update_unix: 'not-a-number' },
      { time_last_update_unix: '123' },
      { unexpectedKey: 'malicious' },
    ])('rejects snapshot with invalid metadata: %j', patch => {
      const bad = { ...JSON.parse(fxFixture()), ...patch };
      expect(() => parseExchangeRateSnapshot(bad, fxNow)).toThrow(FxContractError);
    });

    it.each(['0', '-1.5', 'NaN', 'abc', '1e-5'])('rejects snapshot containing invalid rate %s', invalidRate => {
      const valid = JSON.parse(fxFixture());
      valid.rates.EUR = invalidRate;
      expect(() => parseExchangeRateSnapshot(valid, fxNow)).toThrow(FxContractError);
    });

    it('derives accurate cross-rate for non-USD pair (e.g. EUR to VND)', () => {
      const snap = parseExchangeRateSnapshot(parseProviderJson(fxFixture()), fxNow);
      const quote = quoteFromSnapshot(snap, { sourceCurrency: 'EUR', destinationCurrency: 'VND' }, fxNow);
      expect(quote.sourceCurrency).toBe('EUR');
      expect(quote.destinationCurrency).toBe('VND');
      expect(quote.rateBasis).toBe('usd-cross-half-up-18dp');
      expect(quote.rate).toBe(divideFxRates('26048', '0.86101'));
      const conv = convertFx('10.00', 'EUR', classifyFxQuote(quote, fxNow), fxNow);
      expect(conv.convertedAmount).toBe('302528');
      expect(conv.originalAmount).toBe('10.00');
    });
  });
});

