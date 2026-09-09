import { IntegrationError } from '../errors';
import { classifyFxQuote, fxUnavailable, identityFx, parseExchangeRateSnapshot, parseProviderJson, quoteFromSnapshot,
  supportsFx, validateFxPair, validateFxRequest, FX_CACHE_TTL_MS, FX_FAILURE_COOLDOWN_MS, FX_MAX_AGE_MS,
  type FxPair, type FxQuote, type FxQuotesRequest, type FxRateRepository, type FxReason, type FxResult, type FxSnapshot } from '../fxContract';
import { executeWithReliability, raceWithAbort } from '../reliability';
import type { FetchTransport } from './publicProviderRepositories';

/** Small reusable cache; public currency inputs only reach 56 nonidentity pairs. */
export class FxLruCache<T> {
  private readonly entries = new Map<string, T>();
  constructor(private readonly capacity = 64) {
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 64) throw new IntegrationError('invalidRequest');
  }
  get size(): number { return this.entries.size; }
  get(key: string): T | undefined {
    const value = this.entries.get(key);
    if (value !== undefined) { this.entries.delete(key); this.entries.set(key, value); }
    return value;
  }
  set(key: string, value: T): void {
    this.entries.delete(key); this.entries.set(key, value);
    if (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
  }
}

const endpoint = 'https://open.er-api.com/v6/latest/USD';
const maximumBodyBytes = 16_384;

async function readBody(response: Response, signal: AbortSignal): Promise<string> {
  const length = response.headers?.get('content-length');
  if (length && Number(length) > maximumBodyBytes) throw new IntegrationError('invalidResponse');
  // Streaming environments enforce the bound during receipt. Native fetch may
  // buffer before text(); its memory use is not a streaming-bound guarantee.
  const reader = response.body?.getReader?.();
  if (reader) {
    let bytes = 0; let text = ''; const decoder = new TextDecoder();
    try {
      while (true) {
        const chunk = await raceWithAbort(reader.read(), signal);
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > maximumBodyBytes) throw new IntegrationError('invalidResponse');
        text += decoder.decode(chunk.value, { stream: true });
      }
      return text + decoder.decode();
    } finally { await reader.cancel().catch(() => undefined); }
  }
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maximumBodyBytes) throw new IntegrationError('invalidResponse');
  return text;
}

/** One USD snapshot supplies every pair: no per-expense or per-pair HTTP fan-out. */
export class ExchangeRateFxRepository implements FxRateRepository {
  private readonly cache = new FxLruCache<FxQuote>();
  private snapshot: FxSnapshot | null = null;
  private refresh: Promise<void> | null = null;
  private cooldown: { reason: FxReason; expiresAt: number } | null = null;

  constructor(private readonly fetchTransport: FetchTransport = fetch, private readonly nowProvider = () => Date.now()) {}

  async getQuotes(request: FxQuotesRequest, signal?: AbortSignal): Promise<FxResult[]> {
    if (signal?.aborted) throw new IntegrationError('cancelled');
    return Promise.all(validateFxRequest(request).pairs.map(pair => this.getQuote(pair, signal)));
  }

  async getQuote(input: FxPair, signal?: AbortSignal): Promise<FxResult> {
    if (signal?.aborted) throw new IntegrationError('cancelled');
    const pair = validateFxPair(input);
    if (pair.destinationCurrency === null) return fxUnavailable(pair, 'missingDestination');
    if (!supportsFx(pair.sourceCurrency) || !supportsFx(pair.destinationCurrency)) return fxUnavailable(pair, 'unsupportedCurrency');
    if (pair.sourceCurrency === pair.destinationCurrency) return identityFx(pair, this.nowProvider());
    const key = `${pair.sourceCurrency}:${pair.destinationCurrency}`;
    const cached = this.cache.get(key);
    const now = this.nowProvider();
    if (cached && now - Date.parse(cached.fetchedAt!) <= FX_CACHE_TTL_MS) {
      const result = classifyFxQuote(cached, now);
      if (result.state !== 'unavailable') return result;
    }
    if (this.snapshot && now - Date.parse(this.snapshot.fetchedAt) <= FX_CACHE_TTL_MS
      && now - Date.parse(this.snapshot.quotedAt) <= FX_MAX_AGE_MS) return this.result(pair, key);
    if (!this.cooldown || now >= this.cooldown.expiresAt) {
      // Assignment occurs before async work resumes; all pairs/consumers share
      // one attempt. There is no semaphore wait queue or cancelled queued work.
      this.refresh ??= this.fetchSnapshot().finally(() => { this.refresh = null; });
      if (signal) await raceWithAbort(this.refresh, signal); else await this.refresh;
    }
    return this.result(pair, key);
  }

  private result(pair: FxPair, key: string): FxResult {
    const now = this.nowProvider();
    if (this.snapshot && now - Date.parse(this.snapshot.quotedAt) <= FX_MAX_AGE_MS) {
      const quote = quoteFromSnapshot(this.snapshot, pair, now);
      this.cache.set(key, quote);
      const result = classifyFxQuote(quote, now);
      // Failed refresh never advances fetchedAt. With expired retrieval TTL the
      // normal strict FxResult parser also classifies this fallback as stale.
      return result;
    }
    return fxUnavailable(pair, this.cooldown?.reason ?? 'expired');
  }

  private async fetchSnapshot(): Promise<void> {
    try {
      const snapshot = await executeWithReliability(async signal => {
        const response = await this.fetchTransport(endpoint, { method: 'GET', headers: { Accept: 'application/json' }, signal });
        if (response.status === 429) throw new IntegrationError('rateLimited');
        if (response.status >= 500) throw new IntegrationError('providerUnavailable');
        if (!response.ok) throw new IntegrationError('invalidResponse');
        const payload = parseProviderJson(await readBody(response, signal));
        if (signal.aborted) throw new IntegrationError('cancelled');
        return parseExchangeRateSnapshot(payload, this.nowProvider());
      }, { timeoutMs: 6_000, maximumAttempts: 1 });
      if (this.nowProvider() - Date.parse(snapshot.quotedAt) > FX_MAX_AGE_MS) {
        this.cooldown = { reason: 'expired', expiresAt: this.nowProvider() + FX_FAILURE_COOLDOWN_MS };
        return;
      }
      this.snapshot = snapshot;
      this.cooldown = null;
    } catch (error) {
      let reason: FxReason = 'invalidResponse';
      if (error instanceof IntegrationError) {
        if (error.code === 'rateLimited') reason = 'busy';
        else if (error.code === 'network') reason = 'network';
        else if (error.code === 'timeout') reason = 'timeout';
        else if (error.code === 'providerUnavailable') reason = 'providerUnavailable';
      }
      this.cooldown = { reason, expiresAt: this.nowProvider() + (reason === 'busy' ? 20 * 60_000 : FX_FAILURE_COOLDOWN_MS) };
    }
  }
}
