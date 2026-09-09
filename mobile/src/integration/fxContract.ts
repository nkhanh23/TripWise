/** T003 standalone exact-decimal/provenance boundary. No provider or private-data I/O. */
export const FX_CURRENCIES = ['USD', 'VND', 'THB', 'JPY', 'EUR', 'GBP', 'SGD', 'KRW'] as const;
export const FX_CACHE_TTL_MS = 60 * 60 * 1000;
export const FX_FRESH_MS = 4 * 24 * 60 * 60 * 1000;
export const FX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const FX_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
export const FX_FAILURE_COOLDOWN_MS = 60 * 1000;
export const FX_ATTRIBUTION = 'Rates By Exchange Rate API';
export const FX_ATTRIBUTION_URL = 'https://www.exchangerate-api.com';
export const FX_SOURCE_ID = 'exchangerate-api-composite-usd';
export type FxPair = { sourceCurrency: string; destinationCurrency: string | null };
export type FxProviderId = 'exchangerate-api-open' | 'identity';
export type FxQuote = FxPair & {
  destinationCurrency: string;
  rate: string;
  provider: FxProviderId;
  quotedAt: string | null;
  fetchedAt: string | null;
  timestampPrecision: 'second' | 'identity';
  sourceId: typeof FX_SOURCE_ID | null;
  rateBasis: 'usd-cross-half-up-18dp' | 'identity';
  attribution: string;
};
export type FxReason = 'missingDestination' | 'unsupportedCurrency' | 'expired' | 'timeout' | 'network' | 'providerUnavailable' | 'invalidResponse' | 'busy';
export type FxResult = FxPair & {
  state: 'fresh' | 'stale' | 'unavailable';
  reason: FxReason | null;
  quote: FxQuote | null;
};
export type FxConversion = {
  originalAmount: string;
  originalCurrency: string;
  displayCurrency: string | null;
  convertedAmount: string | null;
  displayFractionDigits: number | null;
  fx: FxResult;
};
export type TripFxContext = {
  tripId: string;
  originalBudget: {
    amount: string | null;
    currency: string | null;
  };
  homeCurrency: string | null;
  homeCurrencySource: 'originalBudget';
  destinationCurrency: string | null;
  destinationCurrencySource: 'unavailable';
};
export type FxQuotesRequest = {
  pairs: FxPair[];
};
export interface TripFxContextRepository {
  getTripFxContext(tripId: string, signal?: AbortSignal): Promise<TripFxContext>;
}
export interface FxRateRepository {
  getQuotes(request: FxQuotesRequest, signal?: AbortSignal): Promise<FxResult[]>;
  getQuote(pair: FxPair, signal?: AbortSignal): Promise<FxResult>;
}

export class FxContractError extends Error {
  constructor() { super('Invalid FX contract.'); this.name = 'FxContractError'; }
}
const invalid = (): never => { throw new FxContractError(); };
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function fxObject(v: unknown, keys: string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) return invalid();
  return v as Record<string, unknown>;
}
export function fxCurrency(v: unknown): v is string { return typeof v === 'string' && /^[A-Z]{3}$/.test(v); }
export function supportsFx(v: string): boolean { return (FX_CURRENCIES as readonly string[]).includes(v); }
export function validateFxPair(v: unknown): FxPair {
  const p = fxObject(v, ['sourceCurrency', 'destinationCurrency']);
  if (!fxCurrency(p.sourceCurrency) || (p.destinationCurrency !== null && !fxCurrency(p.destinationCurrency))) return invalid();
  return { sourceCurrency: p.sourceCurrency, destinationCurrency: p.destinationCurrency };
}
export function validateFxRequest(v: unknown): { pairs: FxPair[] } {
  const r = fxObject(v, ['pairs']);
  if (!Array.isArray(r.pairs) || r.pairs.length < 1 || r.pairs.length > 8) return invalid();
  const pairs = r.pairs.map(validateFxPair);
  return { pairs: [...new Map(pairs.map(p => [JSON.stringify(p), p])).values()] };
}
export function fxUnavailable(pair: FxPair, reason: FxReason): FxResult {
  return { sourceCurrency: pair.sourceCurrency, destinationCurrency: pair.destinationCurrency, state: 'unavailable', quote: null, reason };
}
export function parseFxRate(v: unknown): string {
  if (typeof v !== 'string' || !/^(0|[1-9]\d{0,11})(\.\d{1,18})?$/.test(v) || BigInt(v.replace('.', '')) <= BigInt(0)) return invalid();
  return v;
}
function timestamp(v: unknown, now: number): number {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)) return invalid();
  const t = Date.parse(v);
  if (!Number.isFinite(t) || new Date(t).toISOString() !== v || t < Date.UTC(2000, 0, 1) || t > now + FX_FUTURE_TOLERANCE_MS) return invalid();
  return t;
}
export function parseFxQuote(value: unknown, pair: FxPair, now: number): FxQuote {
  const q = fxObject(value, ['sourceCurrency', 'destinationCurrency', 'rate', 'provider', 'quotedAt', 'fetchedAt', 'timestampPrecision', 'attribution', 'sourceId', 'rateBasis']);
  if (!Number.isFinite(now) || q.sourceCurrency !== pair.sourceCurrency || q.destinationCurrency !== pair.destinationCurrency
    || !fxCurrency(q.destinationCurrency) || !supportsFx(pair.sourceCurrency) || !supportsFx(q.destinationCurrency)) return invalid();
  const rate = parseFxRate(q.rate);
  if (q.provider === 'identity') {
    if (q.sourceCurrency !== q.destinationCurrency || rate !== '1' || q.quotedAt !== null || q.fetchedAt !== null || q.timestampPrecision !== 'identity' || q.attribution !== 'Identity conversion; no external quote' || q.sourceId !== null || q.rateBasis !== 'identity') return invalid();
  } else if (q.provider === 'exchangerate-api-open') {
    if (q.sourceCurrency === q.destinationCurrency || q.timestampPrecision !== 'second' || q.attribution !== FX_ATTRIBUTION || q.sourceId !== FX_SOURCE_ID || q.rateBasis !== 'usd-cross-half-up-18dp') return invalid();
    const quoted = timestamp(q.quotedAt, now); const fetched = timestamp(q.fetchedAt, now);
    if (!(q.quotedAt as string).endsWith('.000Z') || quoted > fetched + FX_FUTURE_TOLERANCE_MS) return invalid();
  } else return invalid();
  return { ...q, rate } as FxQuote;
}
export function classifyFxQuote(q: FxQuote, now: number): FxResult {
  const quote = parseFxQuote(q, q, now);
  if (quote.provider === 'identity') {
    return {
      sourceCurrency: quote.sourceCurrency,
      destinationCurrency: quote.destinationCurrency,
      state: 'fresh',
      reason: null,
      quote,
    };
  }
  const age = now - Date.parse(quote.quotedAt!);
  const retrievalAge = now - Date.parse(quote.fetchedAt!);
  if (age > FX_MAX_AGE_MS) return fxUnavailable(q, 'expired');
  return {
    sourceCurrency: q.sourceCurrency,
    destinationCurrency: q.destinationCurrency,
    state: age <= FX_FRESH_MS && retrievalAge <= FX_CACHE_TTL_MS ? 'fresh' : 'stale',
    reason: null,
    quote,
  };
}
export function identityFx(pair: FxPair, now: number): FxResult {
  return classifyFxQuote({ ...pair, destinationCurrency: pair.sourceCurrency, rate: '1', provider: 'identity', quotedAt: null, fetchedAt: null, timestampPrecision: 'identity', attribution: 'Identity conversion; no external quote', sourceId: null, rateBasis: 'identity' }, now);
}
export function parseFxResult(value: unknown, pair: FxPair, now: number): FxResult {
  const r = fxObject(value, ['sourceCurrency', 'destinationCurrency', 'state', 'reason', 'quote']);
  if (r.sourceCurrency !== pair.sourceCurrency || r.destinationCurrency !== pair.destinationCurrency) return invalid();
  if (r.state === 'unavailable') {
    if (r.quote !== null || !['missingDestination', 'unsupportedCurrency', 'expired', 'timeout', 'network', 'providerUnavailable', 'invalidResponse', 'busy'].includes(String(r.reason))) return invalid();
    return { ...pair, state: 'unavailable', reason: r.reason as FxReason, quote: null };
  }
  const q = parseFxQuote(r.quote, pair, now); const current = classifyFxQuote(q, now);
  if (r.state !== current.state || r.reason !== null || current.state === 'unavailable') return invalid();
  return current;
}

/** JSON numbers become strings before JSON.parse can round them. Strings/escapes remain untouched. */
export function parseProviderJson(text: string): unknown {
  if (text.length > 16_384) return invalid();
  // Validate the original JSON grammar before token replacement. The temporary
  // parsed numbers are discarded and never used as rates/accounting values.
  try { JSON.parse(text); } catch { return invalid(); }
  let out = ''; let i = 0;
  while (i < text.length) {
    if (text[i] === '"') {
      const start = i++;
      while (i < text.length) { if (text[i] === '\\') i += 2; else if (text[i++] === '"') break; }
      out += text.slice(start, i);
    } else if (/[-0-9]/.test(text[i])) {
      const match = text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (!match || match[0].length > 64) return invalid();
      out += JSON.stringify(match[0]); i += match[0].length;
    } else out += text[i++];
  }
  try { return JSON.parse(out) as unknown; } catch { return invalid(); }
}
export type FxSnapshot = { rates: Record<string, string>; quotedAt: string; fetchedAt: string };

/** Vendor publication timestamp, not the observation date of individual inputs. */
export function parseExchangeRateSnapshot(value: unknown, now: number): FxSnapshot {
  const r = fxObject(value, ['result', 'provider', 'documentation', 'terms_of_use', 'time_last_update_unix', 'time_last_update_utc', 'time_next_update_unix', 'time_next_update_utc', 'time_eol_unix', 'base_code', 'rates']);
  if (r.result !== 'success' || r.provider !== FX_ATTRIBUTION_URL || r.base_code !== 'USD'
    || r.documentation !== `${FX_ATTRIBUTION_URL}/docs/free` || r.terms_of_use !== `${FX_ATTRIBUTION_URL}/terms`
    || typeof r.time_last_update_unix !== 'string' || !/^\d{9,10}$/.test(r.time_last_update_unix)) return invalid();
  const quotedAt = new Date(Number(r.time_last_update_unix) * 1000).toISOString();
  timestamp(quotedAt, now);
  const rawRates = fxObject(r.rates, Object.keys((r.rates && typeof r.rates === 'object') ? r.rates : {}));
  if (Object.keys(rawRates).length > 200) return invalid();
  const rates: Record<string, string> = {};
  for (const code of FX_CURRENCIES) rates[code] = parseFxRate(rawRates[code]);
  if (rates.USD !== '1') return invalid();
  return { rates, quotedAt, fetchedAt: new Date(now).toISOString() };
}

/** Exact integer division, explicitly rounded half-up to 18 fractional digits. */
export function divideFxRates(destination: string, source: string): string {
  const d = parseFxRate(destination); const s = parseFxRate(source);
  const dScale = d.split('.')[1]?.length ?? 0; const sScale = s.split('.')[1]?.length ?? 0;
  const numerator = BigInt(d.replace('.', '')) * BigInt(10) ** BigInt(sScale + 18);
  const denominator = BigInt(s.replace('.', '')) * BigInt(10) ** BigInt(dScale);
  const rounded = (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
  const raw = rounded.toString().padStart(19, '0');
  return parseFxRate(`${raw.slice(0, -18)}.${raw.slice(-18)}`.replace(/0+$/, '').replace(/\.$/, ''));
}

export function quoteFromSnapshot(snapshot: FxSnapshot, pair: FxPair, now: number): FxQuote {
  if (pair.destinationCurrency === null) return invalid();
  return parseFxQuote({ ...pair, rate: divideFxRates(snapshot.rates[pair.destinationCurrency], snapshot.rates[pair.sourceCurrency]),
    provider: 'exchangerate-api-open', sourceId: FX_SOURCE_ID, rateBasis: 'usd-cross-half-up-18dp',
    quotedAt: snapshot.quotedAt, fetchedAt: snapshot.fetchedAt, timestampPrecision: 'second', attribution: FX_ATTRIBUTION }, pair, now);
}
export function convertFx(originalAmount: string, originalCurrency: string, result: FxResult, now: number): FxConversion {
  if (!/^-?(0|[1-9]\d{0,21})\.\d{2}$/.test(originalAmount) || originalAmount === '-0.00' || !fxCurrency(originalCurrency) || result.sourceCurrency !== originalCurrency) return invalid();
  const fx = parseFxResult(result, { sourceCurrency: originalCurrency, destinationCurrency: result.destinationCurrency }, now);
  if (fx.state === 'unavailable') return { originalAmount, originalCurrency, displayCurrency: fx.destinationCurrency, convertedAmount: null, displayFractionDigits: null, fx };
  const q = fx.quote!;
  const digits = ['VND', 'JPY', 'KRW'].includes(q.destinationCurrency) ? 0 : 2;
  const scale = q.rate.split('.')[1]?.length ?? 0;
  const negative = originalAmount.startsWith('-');
  const amount = BigInt(originalAmount.replace('-', '').replace('.', ''));
  const numerator = amount * BigInt(q.rate.replace('.', '')) * (BigInt(10) ** BigInt(digits));
  const denominator = BigInt(10) ** BigInt(2 + scale);
  const rounded = (numerator + denominator / BigInt(2)) / denominator;
  const raw = rounded.toString().padStart(digits + 1, '0');
  const convertedAmount = (negative && rounded !== BigInt(0) ? '-' : '') + (digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw);
  return { originalAmount, originalCurrency, displayCurrency: q.destinationCurrency, convertedAmount, displayFractionDigits: digits, fx };
}
export function parseFxConversion(value: unknown, now: number): FxConversion {
  const r = fxObject(value, ['originalAmount', 'originalCurrency', 'displayCurrency', 'convertedAmount', 'displayFractionDigits', 'fx']);
  if (typeof r.originalAmount !== 'string' || !fxCurrency(r.originalCurrency)) return invalid();
  const fx = parseFxResult(r.fx, { sourceCurrency: r.originalCurrency, destinationCurrency: r.displayCurrency as string | null }, now);
  const expected = convertFx(r.originalAmount, r.originalCurrency, fx, now);
  if (r.convertedAmount !== expected.convertedAmount || r.displayFractionDigits !== expected.displayFractionDigits) return invalid();
  return expected;
}
export function parseTripFxContext(value: unknown): TripFxContext {
  const r = fxObject(value, ['tripId', 'originalBudget', 'homeCurrency', 'homeCurrencySource', 'destinationCurrency', 'destinationCurrencySource']);
  if (typeof r.tripId !== 'string' || !uuidRegex.test(r.tripId)) return invalid();
  const budget = fxObject(r.originalBudget, ['amount', 'currency']);
  if ((budget.amount !== null && (typeof budget.amount !== 'string' || !/^(0|[1-9]\d{0,11})(\.\d{2})?$/.test(budget.amount)))
    || (budget.currency !== null && !fxCurrency(budget.currency))) return invalid();
  if (r.homeCurrency !== budget.currency || r.homeCurrencySource !== 'originalBudget') return invalid();
  if (r.destinationCurrency !== null || r.destinationCurrencySource !== 'unavailable') return invalid();
  return {
    tripId: r.tripId.toLowerCase(),
    originalBudget: { amount: budget.amount, currency: budget.currency },
    homeCurrency: budget.currency,
    homeCurrencySource: 'originalBudget',
    destinationCurrency: null,
    destinationCurrencySource: 'unavailable',
  };
}
