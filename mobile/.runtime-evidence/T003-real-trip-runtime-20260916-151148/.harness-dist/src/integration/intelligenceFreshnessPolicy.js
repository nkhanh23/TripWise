"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedCandidateDiscoveryRepository = exports.CachedEventIntelligenceRepository = exports.CachedPlaceIntelligenceRepository = exports.InFlightCoalescer = exports.BoundedLruCache = exports.CANDIDATE_DISCOVERY_STALE_TTL_MS = exports.CANDIDATE_DISCOVERY_FRESH_TTL_MS = exports.EVENT_INTELLIGENCE_STALE_TTL_MS = exports.EVENT_INTELLIGENCE_FRESH_TTL_MS = exports.PLACE_METADATA_LEGACY_TTL_MS = exports.PLACE_INTELLIGENCE_STALE_TTL_MS = exports.PLACE_INTELLIGENCE_FRESH_TTL_MS = void 0;
exports.deepClone = deepClone;
exports.getPlaceIntelligenceCacheKey = getPlaceIntelligenceCacheKey;
exports.getPlaceMetadataCacheKey = getPlaceMetadataCacheKey;
exports.getEventIntelligenceCacheKey = getEventIntelligenceCacheKey;
exports.getCandidateDiscoveryCacheKey = getCandidateDiscoveryCacheKey;
exports.classifyPlaceIntelligence = classifyPlaceIntelligence;
exports.evaluateEventTemporalExpiry = evaluateEventTemporalExpiry;
exports.classifyEventIntelligence = classifyEventIntelligence;
exports.classifyCandidateDiscovery = classifyCandidateDiscovery;
exports.canServeStaleFallback = canServeStaleFallback;
const validation_1 = require("./validation");
const eventIntelligenceContract_1 = require("./eventIntelligenceContract");
const candidateDiscoveryContract_1 = require("./candidateDiscoveryContract");
const errors_1 = require("./errors");
const reliability_1 = require("./reliability");
/** TTL constants (milliseconds) chosen according to fact volatility and provider terms. */
exports.PLACE_INTELLIGENCE_FRESH_TTL_MS = 30 * 60 * 1000; // 30 minutes
exports.PLACE_INTELLIGENCE_STALE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
exports.PLACE_METADATA_LEGACY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
exports.EVENT_INTELLIGENCE_FRESH_TTL_MS = 15 * 60 * 1000; // 15 minutes (Ticketmaster terms compliant)
exports.EVENT_INTELLIGENCE_STALE_TTL_MS = 60 * 60 * 1000; // 1 hour (no long-term event archival)
exports.CANDIDATE_DISCOVERY_FRESH_TTL_MS = 5 * 60 * 1000; // 5 minutes
exports.CANDIDATE_DISCOVERY_STALE_TTL_MS = 15 * 60 * 1000; // 15 minutes
/** Deep clones a JSON-compatible object to guarantee cache immutability. */
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
/**
 * Generic, memory-bounded LRU cache with explicit TTL expiry, eviction, and disposal.
 */
class BoundedLruCache {
    capacity;
    entries = new Map();
    isDisposed = false;
    constructor(capacity = 64) {
        this.capacity = capacity;
        if (!Number.isInteger(capacity) || capacity < 1) {
            throw new errors_1.IntegrationError('invalidRequest');
        }
    }
    get size() {
        return this.entries.size;
    }
    get disposed() {
        return this.isDisposed;
    }
    get(key) {
        if (this.isDisposed)
            return undefined;
        const value = this.entries.get(key);
        if (value !== undefined) {
            this.entries.delete(key);
            this.entries.set(key, value);
        }
        return value;
    }
    peek(key) {
        if (this.isDisposed)
            return undefined;
        return this.entries.get(key);
    }
    set(key, value) {
        if (this.isDisposed)
            return;
        this.entries.delete(key);
        this.entries.set(key, value);
        if (this.entries.size > this.capacity) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey !== undefined) {
                this.entries.delete(oldestKey);
            }
        }
    }
    has(key) {
        if (this.isDisposed)
            return false;
        return this.entries.has(key);
    }
    delete(key) {
        if (this.isDisposed)
            return false;
        return this.entries.delete(key);
    }
    cleanup(isExpired) {
        if (this.isDisposed)
            return 0;
        let evicted = 0;
        for (const [key, value] of this.entries.entries()) {
            if (isExpired(value)) {
                this.entries.delete(key);
                evicted++;
            }
        }
        return evicted;
    }
    clear() {
        this.entries.clear();
    }
    dispose() {
        this.isDisposed = true;
        this.entries.clear();
    }
}
exports.BoundedLruCache = BoundedLruCache;
/**
 * In-flight request coalescing manager with underlying operation cancellation.
 * Tracks per key: shared promise, underlying AbortController, and active subscriber count.
 */
class InFlightCoalescer {
    operations = new Map();
    isDisposed = false;
    get activeCount() {
        return this.operations.size;
    }
    has(key) {
        return this.operations.has(key);
    }
    async run(key, operation, callerSignal) {
        if (this.isDisposed || callerSignal?.aborted) {
            throw new errors_1.IntegrationError('cancelled');
        }
        let entry = this.operations.get(key);
        if (!entry) {
            const controller = new AbortController();
            const subscribers = new Set();
            const promise = operation(controller.signal).finally(() => {
                if (this.operations.get(key) === entry) {
                    this.operations.delete(key);
                }
            });
            entry = { promise, controller, subscribers };
            this.operations.set(key, entry);
        }
        const currentEntry = entry;
        let unregisterSubscriber;
        const onCallerAbort = () => {
            if (unregisterSubscriber) {
                unregisterSubscriber();
            }
        };
        unregisterSubscriber = () => {
            if (callerSignal) {
                callerSignal.removeEventListener('abort', onCallerAbort);
            }
            currentEntry.subscribers.delete(unregisterSubscriber);
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
            let p = (0, reliability_1.raceWithAbort)(currentEntry.promise, currentEntry.controller.signal);
            if (callerSignal) {
                p = (0, reliability_1.raceWithAbort)(p, callerSignal);
            }
            return await p;
        }
        catch (err) {
            if (callerSignal?.aborted || currentEntry.controller.signal.aborted) {
                throw new errors_1.IntegrationError('cancelled');
            }
            throw err;
        }
        finally {
            if (unregisterSubscriber) {
                unregisterSubscriber();
            }
        }
    }
    cancel(key) {
        const entry = this.operations.get(key);
        if (entry) {
            entry.controller.abort();
            this.operations.delete(key);
        }
    }
    cancelAll() {
        for (const entry of this.operations.values()) {
            entry.controller.abort();
        }
        this.operations.clear();
    }
    dispose() {
        this.isDisposed = true;
        this.cancelAll();
    }
}
exports.InFlightCoalescer = InFlightCoalescer;
// ---------------------------------------------------------
// Cache Keys
// ---------------------------------------------------------
function getPlaceIntelligenceCacheKey(googlePlaceId) {
    return `place:${(0, validation_1.asGooglePlaceId)(googlePlaceId)}`;
}
function getPlaceMetadataCacheKey(googlePlaceId) {
    return `metadata:${(0, validation_1.asGooglePlaceId)(googlePlaceId)}`;
}
function getEventIntelligenceCacheKey(request) {
    return `events:${request.countryCode.toUpperCase()}:${request.city.toLowerCase().trim()}:${request.startDateTime}:${request.endDateTime}:${request.limit}`;
}
function getCandidateDiscoveryCacheKey(request) {
    return `candidate:${request.center.latitude.toFixed(5)},${request.center.longitude.toFixed(5)}:${request.radiusMeters}:${request.category}:${request.limit}`;
}
// ---------------------------------------------------------
// Temporal & Freshness Evaluators
// ---------------------------------------------------------
function classifyPlaceIntelligence(entry, now = Date.now()) {
    const ageMs = Math.max(0, now - entry.cachedAt);
    let state;
    if (now <= entry.freshUntil) {
        state = 'FRESH';
    }
    else if (now <= entry.staleUntil) {
        state = 'STALE';
    }
    else {
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
function evaluateEventTemporalExpiry(events, query, now = Date.now()) {
    const queryEnd = Date.parse(query.endDateTime);
    let cutoff = Number.isFinite(queryEnd) ? queryEnd : now;
    let hasPastEvent = false;
    for (const event of events) {
        if (event.end?.kind === 'UTC' && event.end.dateTime) {
            const endMs = Date.parse(event.end.dateTime);
            if (Number.isFinite(endMs)) {
                cutoff = Math.min(cutoff, endMs);
                if (now >= endMs)
                    hasPastEvent = true;
            }
        }
        else if (event.start.kind === 'UTC' && event.start.dateTime) {
            const startMs = Date.parse(event.start.dateTime);
            if (Number.isFinite(startMs)) {
                cutoff = Math.min(cutoff, startMs);
                if (now >= startMs)
                    hasPastEvent = true;
            }
        }
        // For PROVIDER_LOCAL: conservative policy: do not derive an absolute event-time cutoff;
        // retain standard query window end and normal cache TTL without guessing timezone offsets or appending Z.
    }
    return { temporalExpiryCutoff: cutoff, hasPastEvent };
}
function classifyEventIntelligence(entry, query, now = Date.now()) {
    const ageMs = Math.max(0, now - entry.cachedAt);
    const { temporalExpiryCutoff, hasPastEvent } = evaluateEventTemporalExpiry(entry.data.events, query, now);
    let state;
    const effectiveFreshUntil = Math.min(entry.freshUntil, temporalExpiryCutoff);
    if (hasPastEvent || now > temporalExpiryCutoff) {
        if (now <= entry.staleUntil) {
            state = 'STALE';
        }
        else {
            state = 'EXPIRED';
        }
    }
    else if (now <= effectiveFreshUntil) {
        state = 'FRESH';
    }
    else if (now <= entry.staleUntil) {
        state = 'STALE';
    }
    else {
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
function classifyCandidateDiscovery(entry, now = Date.now()) {
    const ageMs = Math.max(0, now - entry.cachedAt);
    let state;
    if (now <= entry.freshUntil) {
        state = 'FRESH';
    }
    else if (now <= entry.staleUntil) {
        state = 'STALE';
    }
    else {
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
function canServeStaleFallback(error, classification) {
    if (!classification || classification.state !== 'STALE') {
        return false;
    }
    if (error instanceof errors_1.IntegrationError) {
        if (error.code === 'invalidRequest' ||
            error.code === 'unauthorized' ||
            error.code === 'forbidden' ||
            error.code === 'cancelled') {
            return false;
        }
        return (error.code === 'timeout' ||
            error.code === 'providerUnavailable' ||
            error.code === 'rateLimited' ||
            error.code === 'invalidResponse' ||
            error.code === 'network');
    }
    return false;
}
// ---------------------------------------------------------
// Cached Repositories
// ---------------------------------------------------------
class CachedPlaceIntelligenceRepository {
    delegate;
    nowProvider;
    cache;
    coalescer = new InFlightCoalescer();
    authUnsubscribe;
    isDisposed = false;
    constructor(delegate, capacity = 64, nowProvider = () => Date.now(), authSource) {
        this.delegate = delegate;
        this.nowProvider = nowProvider;
        this.cache = new BoundedLruCache(capacity);
        if (authSource) {
            const { data: { subscription } } = authSource.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    this.clearCache();
                }
            });
            this.authUnsubscribe = () => subscription.unsubscribe();
        }
    }
    get cacheSize() {
        return this.cache.size;
    }
    clearCache() {
        this.cache.clear();
        this.coalescer.cancelAll();
    }
    dispose() {
        this.isDisposed = true;
        this.authUnsubscribe?.();
        this.cache.dispose();
        this.coalescer.dispose();
    }
    async getIntelligence(googlePlaceId, signal) {
        const classification = await this.getIntelligenceWithFreshness(googlePlaceId, signal);
        return deepClone(classification.data);
    }
    async getIntelligenceWithFreshness(googlePlaceId, signal) {
        if (this.isDisposed || signal?.aborted) {
            throw new errors_1.IntegrationError('cancelled');
        }
        const id = (0, validation_1.asGooglePlaceId)(googlePlaceId);
        const key = getPlaceIntelligenceCacheKey(id);
        const now = this.nowProvider();
        const cached = this.cache.get(key);
        let classification = cached ? classifyPlaceIntelligence(cached, now) : undefined;
        if (classification && classification.state === 'FRESH') {
            return deepClone(classification);
        }
        try {
            const freshData = await this.coalescer.run(key, (coalescedSignal) => this.delegate.getIntelligence(id, coalescedSignal), signal);
            const fetchNow = this.nowProvider();
            const newEntry = {
                key,
                data: deepClone(freshData),
                cachedAt: fetchNow,
                freshUntil: fetchNow + exports.PLACE_INTELLIGENCE_FRESH_TTL_MS,
                staleUntil: fetchNow + exports.PLACE_INTELLIGENCE_STALE_TTL_MS,
            };
            this.cache.set(key, newEntry);
            return classifyPlaceIntelligence(newEntry, fetchNow);
        }
        catch (rawError) {
            if (signal?.aborted) {
                throw new errors_1.IntegrationError('cancelled');
            }
            if (cached) {
                classification = classifyPlaceIntelligence(cached, this.nowProvider());
            }
            if (canServeStaleFallback(rawError, classification)) {
                return {
                    ...deepClone(classification),
                    isFallback: true,
                };
            }
            throw rawError;
        }
    }
}
exports.CachedPlaceIntelligenceRepository = CachedPlaceIntelligenceRepository;
class CachedEventIntelligenceRepository {
    delegate;
    nowProvider;
    cache;
    coalescer = new InFlightCoalescer();
    activeKey;
    authUnsubscribe;
    isDisposed = false;
    constructor(delegate, capacity = 32, nowProvider = () => Date.now(), authSource) {
        this.delegate = delegate;
        this.nowProvider = nowProvider;
        this.cache = new BoundedLruCache(capacity);
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
    get cacheSize() {
        return this.cache.size;
    }
    clearCache() {
        this.cache.clear();
        this.coalescer.cancelAll();
    }
    cancel() {
        this.coalescer.cancelAll();
        this.delegate.cancel();
        this.activeKey = undefined;
    }
    dispose() {
        this.isDisposed = true;
        this.authUnsubscribe?.();
        this.cancel();
        this.cache.dispose();
        this.coalescer.dispose();
    }
    async discover(request, signal) {
        const classification = await this.discoverWithFreshness(request, signal);
        return deepClone(classification.data);
    }
    async discoverWithFreshness(request, signal) {
        if (this.isDisposed || signal?.aborted) {
            throw new errors_1.IntegrationError('cancelled');
        }
        const body = (0, eventIntelligenceContract_1.validateEventIntelligenceRequest)(request);
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
            const freshData = await this.coalescer.run(key, (coalescedSignal) => {
                return this.delegate.discover(body, coalescedSignal);
            }, signal);
            const fetchNow = this.nowProvider();
            const newEntry = {
                key,
                data: deepClone(freshData),
                cachedAt: fetchNow,
                freshUntil: fetchNow + exports.EVENT_INTELLIGENCE_FRESH_TTL_MS,
                staleUntil: fetchNow + exports.EVENT_INTELLIGENCE_STALE_TTL_MS,
            };
            this.cache.set(key, newEntry);
            return classifyEventIntelligence(newEntry, body, fetchNow);
        }
        catch (rawError) {
            if (signal?.aborted || (rawError instanceof errors_1.IntegrationError && rawError.code === 'cancelled')) {
                throw new errors_1.IntegrationError('cancelled');
            }
            if (cached) {
                classification = classifyEventIntelligence(cached, body, this.nowProvider());
            }
            if (canServeStaleFallback(rawError, classification)) {
                return {
                    ...deepClone(classification),
                    isFallback: true,
                };
            }
            throw rawError;
        }
        finally {
            if (this.activeKey === key && !this.coalescer.has(key)) {
                this.activeKey = undefined;
            }
        }
    }
}
exports.CachedEventIntelligenceRepository = CachedEventIntelligenceRepository;
class CachedCandidateDiscoveryRepository {
    delegate;
    nowProvider;
    cache;
    coalescer = new InFlightCoalescer();
    authUnsubscribe;
    isDisposed = false;
    constructor(delegate, capacity = 16, nowProvider = () => Date.now(), authSource) {
        this.delegate = delegate;
        this.nowProvider = nowProvider;
        this.cache = new BoundedLruCache(capacity);
        if (authSource) {
            const { data: { subscription } } = authSource.onAuthStateChange((event) => {
                if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                    this.clearCache();
                }
            });
            this.authUnsubscribe = () => subscription.unsubscribe();
        }
    }
    get cacheSize() {
        return this.cache.size;
    }
    clearCache() {
        this.cache.clear();
        this.coalescer.cancelAll();
    }
    dispose() {
        this.isDisposed = true;
        this.authUnsubscribe?.();
        this.cache.dispose();
        this.coalescer.dispose();
    }
    async discover(request, signal) {
        const classification = await this.discoverWithFreshness(request, signal);
        return deepClone(classification.data);
    }
    async discoverWithFreshness(request, signal) {
        if (this.isDisposed || signal?.aborted) {
            throw new errors_1.IntegrationError('cancelled');
        }
        const body = (0, candidateDiscoveryContract_1.validateCandidateDiscoveryRequest)(request);
        const key = getCandidateDiscoveryCacheKey(body);
        const now = this.nowProvider();
        const cached = this.cache.get(key);
        let classification = cached ? classifyCandidateDiscovery(cached, now) : undefined;
        if (classification && classification.state === 'FRESH') {
            return deepClone(classification);
        }
        try {
            const freshData = await this.coalescer.run(key, (coalescedSignal) => this.delegate.discover(body, coalescedSignal), signal);
            const fetchNow = this.nowProvider();
            const newEntry = {
                key,
                data: deepClone(freshData),
                cachedAt: fetchNow,
                freshUntil: fetchNow + exports.CANDIDATE_DISCOVERY_FRESH_TTL_MS,
                staleUntil: fetchNow + exports.CANDIDATE_DISCOVERY_STALE_TTL_MS,
            };
            this.cache.set(key, newEntry);
            return classifyCandidateDiscovery(newEntry, fetchNow);
        }
        catch (rawError) {
            if (signal?.aborted) {
                throw new errors_1.IntegrationError('cancelled');
            }
            if (cached) {
                classification = classifyCandidateDiscovery(cached, this.nowProvider());
            }
            if (canServeStaleFallback(rawError, classification)) {
                return {
                    ...deepClone(classification),
                    isFallback: true,
                };
            }
            throw rawError;
        }
    }
}
exports.CachedCandidateDiscoveryRepository = CachedCandidateDiscoveryRepository;
