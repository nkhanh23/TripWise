"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.weatherSchedulingProviderPolicy = exports.routeMetricProviderPolicy = exports.publicProviderPolicy = exports.tripGenerationPolicy = exports.tripRefreshApplyPolicy = exports.idempotentPersistencePolicy = exports.supabaseMutationPolicy = exports.authOperationPolicy = exports.supabaseReadPolicy = void 0;
exports.raceWithAbort = raceWithAbort;
exports.executeWithReliability = executeWithReliability;
const errors_1 = require("./errors");
exports.supabaseReadPolicy = {
    timeoutMs: 10_000,
    maximumAttempts: 2,
    retryDelayMs: 100,
    retryTimeout: true,
};
exports.authOperationPolicy = { timeoutMs: 15_000, maximumAttempts: 1 };
function raceWithAbort(operation, signal) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
            return;
        }
        const cancel = () => reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
        signal.addEventListener('abort', cancel, { once: true });
        operation.then((value) => {
            signal.removeEventListener('abort', cancel);
            resolve(value);
        }, (error) => {
            signal.removeEventListener('abort', cancel);
            reject(error);
        });
    });
}
exports.supabaseMutationPolicy = {
    timeoutMs: 10_000,
    maximumAttempts: 1,
};
exports.idempotentPersistencePolicy = {
    timeoutMs: 15_000,
    maximumAttempts: 2,
    retryDelayMs: 100,
    retryTimeout: true,
};
exports.tripRefreshApplyPolicy = {
    timeoutMs: 15_000,
    maximumAttempts: 2,
    retryDelayMs: 100,
    retryTimeout: true,
};
exports.tripGenerationPolicy = {
    timeoutMs: 50_000,
    maximumAttempts: 1,
};
exports.publicProviderPolicy = {
    timeoutMs: 8_000,
    maximumAttempts: 2,
    retryDelayMs: 100,
    retryTimeout: true,
};
exports.routeMetricProviderPolicy = {
    timeoutMs: 8_000,
    maximumAttempts: 1,
};
/** Optional planning weather must not amplify generation latency through retries. */
exports.weatherSchedulingProviderPolicy = {
    timeoutMs: 8_000,
    maximumAttempts: 1,
};
function wait(milliseconds, signal) {
    if (milliseconds <= 0)
        return Promise.resolve();
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new errors_1.IntegrationError('cancelled'));
            return;
        }
        const finish = () => {
            signal?.removeEventListener('abort', cancel);
            resolve();
        };
        const timeout = setTimeout(finish, milliseconds);
        const cancel = () => {
            clearTimeout(timeout);
            reject(new errors_1.IntegrationError('cancelled'));
        };
        signal?.addEventListener('abort', cancel, { once: true });
    });
}
async function executeWithReliability(operation, policy, externalSignal) {
    if (!Number.isInteger(policy.maximumAttempts) || policy.maximumAttempts < 1
        || !Number.isFinite(policy.timeoutMs) || policy.timeoutMs <= 0) {
        throw new errors_1.IntegrationError('invalidRequest');
    }
    let lastError = new errors_1.IntegrationError('unknown');
    for (let attempt = 1; attempt <= policy.maximumAttempts; attempt += 1) {
        if (externalSignal?.aborted)
            throw new errors_1.IntegrationError('cancelled');
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
        }
        catch (rawError) {
            if (externalSignal?.aborted) {
                throw new errors_1.IntegrationError('cancelled');
            }
            lastError = timedOut
                ? new errors_1.IntegrationError('timeout', policy.retryTimeout === true)
                : (0, errors_1.mapUnknownTransportError)(rawError);
        }
        finally {
            clearTimeout(timeout);
            externalSignal?.removeEventListener('abort', cancel);
        }
        if (attempt >= policy.maximumAttempts || !lastError.retryable)
            throw lastError;
        await wait(policy.retryDelayMs ?? 0, externalSignal);
    }
    throw lastError;
}
