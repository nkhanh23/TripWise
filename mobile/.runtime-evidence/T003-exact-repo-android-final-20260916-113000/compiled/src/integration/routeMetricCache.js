"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedRouteRepository = exports.DEFAULT_ROUTE_CACHE_TTL_MS = exports.DEFAULT_ROUTE_CACHE_CAPACITY = void 0;
exports.buildRouteCacheKey = buildRouteCacheKey;
exports.buildTableCacheKey = buildTableCacheKey;
exports.cloneRoute = cloneRoute;
exports.cloneRouteMatrix = cloneRouteMatrix;
const errors_1 = require("./errors");
const intelligenceFreshnessPolicy_1 = require("./intelligenceFreshnessPolicy");
exports.DEFAULT_ROUTE_CACHE_CAPACITY = 64;
exports.DEFAULT_ROUTE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
function buildRouteCacheKey(request) {
    const coords = request.coordinates
        .map((c) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`)
        .join(';');
    return `route:${request.profile}:${coords}`;
}
function buildTableCacheKey(request) {
    const coords = request.coordinates
        .map((c) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`)
        .join(';');
    return `table:${request.profile}:${coords}`;
}
function cloneRoute(route) {
    return {
        profile: route.profile,
        distanceMeters: route.distanceMeters,
        durationSeconds: route.durationSeconds,
        geometry: route.geometry.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
    };
}
function cloneRouteMatrix(matrix) {
    return {
        profile: matrix.profile,
        durationsSeconds: matrix.durationsSeconds.map((row) => [...row]),
        distancesMeters: matrix.distancesMeters.map((row) => [...row]),
        coordinates: matrix.coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
    };
}
class CachedRouteRepository {
    underlying;
    ttlMs;
    nowProvider;
    routeCache;
    tableCache;
    isDisposed = false;
    constructor(underlying, capacity = exports.DEFAULT_ROUTE_CACHE_CAPACITY, ttlMs = exports.DEFAULT_ROUTE_CACHE_TTL_MS, nowProvider = () => Date.now()) {
        this.underlying = underlying;
        this.ttlMs = ttlMs;
        this.nowProvider = nowProvider;
        if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(ttlMs) || ttlMs <= 0) {
            throw new errors_1.IntegrationError('invalidRequest');
        }
        this.routeCache = new intelligenceFreshnessPolicy_1.BoundedLruCache(capacity);
        this.tableCache = new intelligenceFreshnessPolicy_1.BoundedLruCache(capacity);
    }
    get cacheSize() {
        return this.routeCache.size + this.tableCache.size;
    }
    get disposed() {
        return this.isDisposed;
    }
    clearCache() {
        this.routeCache.clear();
        this.tableCache.clear();
    }
    dispose() {
        this.isDisposed = true;
        this.routeCache.dispose();
        this.tableCache.dispose();
    }
    async getRoute(request, signal) {
        if (this.isDisposed)
            throw new errors_1.IntegrationError('providerUnavailable');
        if (signal?.aborted)
            throw new errors_1.IntegrationError('cancelled');
        const key = buildRouteCacheKey(request);
        const now = this.nowProvider();
        const cached = this.routeCache.get(key);
        if (cached && now - cached.cachedAt <= this.ttlMs) {
            return cloneRoute(cached.value);
        }
        const fresh = await this.underlying.getRoute(request, signal);
        const receivedAt = this.nowProvider();
        if (!this.isDisposed && !signal?.aborted) {
            this.routeCache.set(key, { value: cloneRoute(fresh), cachedAt: receivedAt });
        }
        return cloneRoute(fresh);
    }
    async getTable(request, signal) {
        return (await this.getTableEntry(request, signal)).value;
    }
    /** Exposes cache provenance for consumers whose durable identity must include metric freshness. */
    async getTableEntry(request, signal) {
        if (this.isDisposed)
            throw new errors_1.IntegrationError('providerUnavailable');
        if (signal?.aborted)
            throw new errors_1.IntegrationError('cancelled');
        if (typeof this.underlying.getTable !== 'function') {
            throw new errors_1.IntegrationError('invalidRequest');
        }
        const key = buildTableCacheKey(request);
        const now = this.nowProvider();
        const cached = this.tableCache.get(key);
        if (cached && now - cached.cachedAt <= this.ttlMs) {
            return { value: cloneRouteMatrix(cached.value), cachedAt: cached.cachedAt };
        }
        const fresh = await this.underlying.getTable(request, signal);
        const receivedAt = this.nowProvider();
        if (!this.isDisposed && !signal?.aborted) {
            this.tableCache.set(key, { value: cloneRouteMatrix(fresh), cachedAt: receivedAt });
        }
        return { value: cloneRouteMatrix(fresh), cachedAt: receivedAt };
    }
}
exports.CachedRouteRepository = CachedRouteRepository;
