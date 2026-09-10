import type { Route, RouteMatrix, RouteRequest, RouteTableRequest } from './contracts';
import { IntegrationError } from './errors';
import { BoundedLruCache } from './intelligenceFreshnessPolicy';
import type { RouteRepository } from './repositories';

export type CachedRouteEntry<T> = {
  value: T;
  cachedAt: number;
};

export const DEFAULT_ROUTE_CACHE_CAPACITY = 64;
export const DEFAULT_ROUTE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export function buildRouteCacheKey(request: RouteRequest): string {
  const coords = request.coordinates
    .map((c) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`)
    .join(';');
  return `route:${request.profile}:${coords}`;
}

export function buildTableCacheKey(request: RouteTableRequest): string {
  const coords = request.coordinates
    .map((c) => `${c.latitude.toFixed(6)},${c.longitude.toFixed(6)}`)
    .join(';');
  return `table:${request.profile}:${coords}`;
}

export function cloneRoute(route: Route): Route {
  return {
    profile: route.profile,
    distanceMeters: route.distanceMeters,
    durationSeconds: route.durationSeconds,
    geometry: route.geometry.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
  };
}

export function cloneRouteMatrix(matrix: RouteMatrix): RouteMatrix {
  return {
    profile: matrix.profile,
    durationsSeconds: matrix.durationsSeconds.map((row) => [...row]),
    distancesMeters: matrix.distancesMeters.map((row) => [...row]),
    coordinates: matrix.coordinates.map((c) => ({ latitude: c.latitude, longitude: c.longitude })),
  };
}

export class CachedRouteRepository implements RouteRepository {
  private readonly routeCache: BoundedLruCache<CachedRouteEntry<Route>>;
  private readonly tableCache: BoundedLruCache<CachedRouteEntry<RouteMatrix>>;
  private isDisposed = false;

  constructor(
    private readonly underlying: RouteRepository,
    capacity: number = DEFAULT_ROUTE_CACHE_CAPACITY,
    private readonly ttlMs: number = DEFAULT_ROUTE_CACHE_TTL_MS,
    private readonly nowProvider: () => number = () => Date.now(),
  ) {
    if (!Number.isInteger(capacity) || capacity < 1 || !Number.isFinite(ttlMs) || ttlMs <= 0) {
      throw new IntegrationError('invalidRequest');
    }
    this.routeCache = new BoundedLruCache<CachedRouteEntry<Route>>(capacity);
    this.tableCache = new BoundedLruCache<CachedRouteEntry<RouteMatrix>>(capacity);
  }

  get cacheSize(): number {
    return this.routeCache.size + this.tableCache.size;
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  clearCache(): void {
    this.routeCache.clear();
    this.tableCache.clear();
  }

  dispose(): void {
    this.isDisposed = true;
    this.routeCache.dispose();
    this.tableCache.dispose();
  }

  async getRoute(request: RouteRequest, signal?: AbortSignal): Promise<Route> {
    if (this.isDisposed) throw new IntegrationError('providerUnavailable');
    if (signal?.aborted) throw new IntegrationError('cancelled');

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

  async getTable(request: RouteTableRequest, signal?: AbortSignal): Promise<RouteMatrix> {
    if (this.isDisposed) throw new IntegrationError('providerUnavailable');
    if (signal?.aborted) throw new IntegrationError('cancelled');

    if (typeof this.underlying.getTable !== 'function') {
      throw new IntegrationError('invalidRequest');
    }

    const key = buildTableCacheKey(request);
    const now = this.nowProvider();
    const cached = this.tableCache.get(key);

    if (cached && now - cached.cachedAt <= this.ttlMs) {
      return cloneRouteMatrix(cached.value);
    }

    const fresh = await this.underlying.getTable(request, signal);
    const receivedAt = this.nowProvider();
    if (!this.isDisposed && !signal?.aborted) {
      this.tableCache.set(key, { value: cloneRouteMatrix(fresh), cachedAt: receivedAt });
    }
    return cloneRouteMatrix(fresh);
  }
}
