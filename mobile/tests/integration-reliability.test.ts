import { IntegrationError } from '../src/integration/errors';
import { IdempotencyKeyFactory } from '../src/integration/idempotency';
import { executeWithReliability, tripGenerationPolicy } from '../src/integration/reliability';

describe('integration idempotency and reliability', () => {
  it('preserves a key for one intent and creates a new key for another intent', () => {
    const keys = ['intent-key-0001', 'intent-key-0002'];
    const factory = new IdempotencyKeyFactory(() => keys.shift() ?? 'intent-key-fallback');
    const first = factory.createSaveIntent();
    expect(first.key()).toBe(first.key());
    const second = factory.createSaveIntent();
    expect(second.key()).not.toBe(first.key());
    first.complete();
    expect(() => first.key()).toThrow('Invalid completed save intent contract.');
  });

  it('retries transient failures within a bounded attempt count', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new IntegrationError('network', true))
      .mockResolvedValue('ok');
    await expect(executeWithReliability(operation, {
      timeoutMs: 100, maximumAttempts: 2, retryDelayMs: 0,
    })).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it.each(['invalidRequest', 'unauthorized', 'conflict'] as const)('does not retry %s', async (code) => {
    const operation = jest.fn().mockRejectedValue(new IntegrationError(code));
    await expect(executeWithReliability(operation, { timeoutMs: 100, maximumAttempts: 3 })).rejects.toMatchObject({ code });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('maps timeout and supports external cancellation', async () => {
    const never = (signal: AbortSignal) => new Promise<void>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(Object.assign(new Error('stopped'), { name: 'AbortError' })));
    });
    await expect(executeWithReliability(never, { timeoutMs: 5, maximumAttempts: 1 })).rejects.toMatchObject({ code: 'timeout' });

    const controller = new AbortController();
    const pending = executeWithReliability(never, { timeoutMs: 100, maximumAttempts: 1 }, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
  });

  it('keeps one bounded client attempt with margin above the Edge provider timeout', () => {
    expect(tripGenerationPolicy).toEqual({ timeoutMs: 50_000, maximumAttempts: 1 });
  });
});
