import { IntegrationError, mapUnknownTransportError } from './errors';

export type ReliabilityPolicy = {
  timeoutMs: number;
  maximumAttempts: number;
  retryDelayMs?: number;
  retryTimeout?: boolean;
};

export const supabaseReadPolicy: ReliabilityPolicy = {
  timeoutMs: 10_000,
  maximumAttempts: 2,
  retryDelayMs: 100,
  retryTimeout: true,
};

export const authOperationPolicy: ReliabilityPolicy = { timeoutMs: 15_000, maximumAttempts: 1 };

export function raceWithAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
      return;
    }
    const cancel = () => reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
    signal.addEventListener('abort', cancel, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener('abort', cancel);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', cancel);
        reject(error);
      },
    );
  });
}

export const supabaseMutationPolicy: ReliabilityPolicy = {
  timeoutMs: 10_000,
  maximumAttempts: 1,
};

export const idempotentPersistencePolicy: ReliabilityPolicy = {
  timeoutMs: 15_000,
  maximumAttempts: 2,
  retryDelayMs: 100,
  retryTimeout: true,
};

export const tripGenerationPolicy: ReliabilityPolicy = {
  timeoutMs: 50_000,
  maximumAttempts: 1,
};

export const publicProviderPolicy: ReliabilityPolicy = {
  timeoutMs: 8_000,
  maximumAttempts: 2,
  retryDelayMs: 100,
  retryTimeout: true,
};

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new IntegrationError('cancelled'));
      return;
    }
    const finish = () => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    };
    const timeout = setTimeout(finish, milliseconds);
    const cancel = () => {
      clearTimeout(timeout);
      reject(new IntegrationError('cancelled'));
    };
    signal?.addEventListener('abort', cancel, { once: true });
  });
}

export async function executeWithReliability<T>(
  operation: (signal: AbortSignal, attempt: number) => Promise<T>,
  policy: ReliabilityPolicy,
  externalSignal?: AbortSignal,
): Promise<T> {
  if (!Number.isInteger(policy.maximumAttempts) || policy.maximumAttempts < 1
    || !Number.isFinite(policy.timeoutMs) || policy.timeoutMs <= 0) {
    throw new IntegrationError('invalidRequest');
  }

  let lastError: IntegrationError = new IntegrationError('unknown');

  for (let attempt = 1; attempt <= policy.maximumAttempts; attempt += 1) {
    if (externalSignal?.aborted) throw new IntegrationError('cancelled');

    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    externalSignal?.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, policy.timeoutMs);

    try {
      return await raceWithAbort(operation(controller.signal, attempt), controller.signal);
    } catch (rawError) {
      if (externalSignal?.aborted) {
        throw new IntegrationError('cancelled');
      }
      lastError = timedOut
        ? new IntegrationError('timeout', policy.retryTimeout === true)
        : mapUnknownTransportError(rawError);
    } finally {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', cancel);
    }

    if (attempt >= policy.maximumAttempts || !lastError.retryable) throw lastError;
    await wait(policy.retryDelayMs ?? 0, externalSignal);
  }

  throw lastError;
}
