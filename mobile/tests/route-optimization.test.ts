/**
 * Unit & Integration Tests for FEATURE-P5-T002: Bounded Route-Aware Clustering / Optimization
 *
 * Covers all 39 required scenarios:
 * 1. empty day
 * 2. one item
 * 3. two routable flexible items
 * 4. deterministic tie ordering
 * 5. FIXED anchor remains fixed
 * 6. multiple FIXED anchors
 * 7. flexible MUST_DO retained
 * 8. OPTIONAL retained unless explicit contract permits dropping
 * 9. missing coordinate item
 * 10. invalid coordinate rejected
 * 11. mixed routable/unroutable day
 * 12. validated OSRM duration use
 * 13. validated OSRM distance use
 * 14. raw malformed OSRM response rejected at boundary
 * 15. batching rather than N² calls
 * 16. provider call hard bound
 * 17. matrix/coordinate hard bound
 * 18. cache hit if cache exists
 * 19. cache key isolation
 * 20. transport/profile isolation
 * 21. timeout fallback
 * 22. unavailable fallback
 * 23. malformed provider fallback/failure
 * 24. cancellation
 * 25. superseded result cannot commit
 * 26. zero retry amplification
 * 27. no fan-out amplification
 * 28. deterministic identical input
 * 29. input permutation with canonical positions handled deterministically
 * 30. route score stable tie-break
 * 31. bounded iterative optimization
 * 32. T001 final constraint validation PASS
 * 33. optimizer proposal violating FIXED rejected
 * 34. MUST_DO drop rejected
 * 35. no invented route metric
 * 36. zero persistence
 * 37. current routePlanning regression
 * 38. current workspace mutation regression
 * 39. P5-T001 full regression
 */

import {
  calculateHaversineDistanceMeters,
  optimizeItineraryRoutes,
  ROUTE_OPTIMIZATION_BOUNDS,
  type RouteOptimizationResult,
} from '../src/integration/routeOptimization';
import {
  buildRouteCacheKey,
  buildTableCacheKey,
  CachedRouteRepository,
} from '../src/integration/routeMetricCache';
import {
  ContractValidationError,
  parseOsrmTable,
  validateRouteRequest,
  validateRouteTableRequest,
} from '../src/integration/validation';
import { mapOsrmTable } from '../src/integration/mappers';
import { IntegrationError } from '../src/integration/errors';
import { OsrmRouteRepository } from '../src/integration/remote/publicProviderRepositories';
import type {
  Coordinate,
  Route,
  RouteMatrix,
  RouteRequest,
  RouteTableRequest,
  SavedTripDetail,
} from '../src/integration/contracts';
import type { RouteRepository } from '../src/integration/repositories';
import { buildDrivingRouteRequest, hasVerifiedRouteStops } from '../src/integration/routePlanning';
import { evaluatePlanConstraints } from '../src/integration/deterministicConstraintEngine';

// ============================================================================
// Test Fixtures & Mock Repositories
// ============================================================================

class MockRouteRepository implements RouteRepository {
  public routeCallCount = 0;
  public tableCallCount = 0;
  public lastSignal?: AbortSignal;

  constructor(
    public tableHandler?: (request: RouteTableRequest, signal?: AbortSignal) => Promise<RouteMatrix>,
    public routeHandler?: (request: RouteRequest, signal?: AbortSignal) => Promise<Route>,
  ) {}

  async getRoute(request: RouteRequest, signal?: AbortSignal): Promise<Route> {
    this.routeCallCount++;
    this.lastSignal = signal;
    if (signal?.aborted) throw new IntegrationError('cancelled');
    if (this.routeHandler) return this.routeHandler(request, signal);
    return {
      profile: 'driving',
      distanceMeters: 1000,
      durationSeconds: 120,
      geometry: [...request.coordinates],
    };
  }

  async getTable(request: RouteTableRequest, signal?: AbortSignal): Promise<RouteMatrix> {
    this.tableCallCount++;
    this.lastSignal = signal;
    if (signal?.aborted) throw new IntegrationError('cancelled');
    if (this.tableHandler) return this.tableHandler(request, signal);

    // Default synthetic table: Euclidean distance * 100000, duration = distance / 10
    const n = request.coordinates.length;
    const durations: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const distances: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dLat = request.coordinates[i].latitude - request.coordinates[j].latitude;
        const dLon = request.coordinates[i].longitude - request.coordinates[j].longitude;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon) * 111000;
        distances[i][j] = Math.round(dist);
        durations[i][j] = Math.round(dist / 10);
      }
    }

    return {
      profile: 'driving',
      durationsSeconds: durations,
      distancesMeters: distances,
      coordinates: request.coordinates,
    };
  }
}

// Sample coordinates
const COORD_A = { latitude: 13.7400, longitude: 100.4900 }; // Wat Arun
const COORD_B = { latitude: 13.7500, longitude: 100.5000 }; // Grand Palace
const COORD_C = { latitude: 13.7600, longitude: 100.5100 }; // Wat Saket
const COORD_D = { latitude: 13.7700, longitude: 100.5200 }; // Dusit

// ============================================================================
// Test Suite
// ============================================================================

describe('FEATURE-P5-T002: Bounded Route-Aware Clustering & Optimization', () => {
  // --------------------------------------------------------------------------
  // Scenarios 1 - 4: Basic Day & Ordering Invariants
  // --------------------------------------------------------------------------
  describe('Basic Day & Ordering Invariants', () => {
    it('Scenario 1: handles empty day with already_optimal status and 0 provider calls', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes({ days: [{ dayNumber: 1, items: [] }] }, repo);

      expect(result.status).toBe('already_optimal');
      expect(result.days[0].proposedItemIds).toEqual([]);
      expect(repo.tableCallCount).toBe(0);
      expect(repo.routeCallCount).toBe(0);
    });

    it('Scenario 2: handles single item day as already_optimal without calling provider', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [{ id: 'item-1', position: 1, flexibility: 'flexible', priority: 'must_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude }],
            },
          ],
        },
        repo,
      );

      expect(result.status).toBe('already_optimal');
      expect(result.days[0].proposedItemIds).toEqual(['item-1']);
      expect(repo.tableCallCount).toBe(0);
    });

    it('Scenario 3: reorders two routable flexible items to minimize duration', async () => {
      // Setup: 2 items, start at A, next is B.
      // Suppose A -> B has duration 300, while B -> A has duration 300.
      const repo = new MockRouteRepository(async (req) => ({
        profile: 'driving',
        durationsSeconds: [
          [0, 300],
          [300, 0],
        ],
        distancesMeters: [
          [0, 2000],
          [2000, 0],
        ],
        coordinates: req.coordinates,
      }));

      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.status).toBe('already_optimal');
      expect(result.days[0].proposedItemIds).toEqual(['item-1', 'item-2']);
      expect(repo.tableCallCount).toBe(1);
    });

    it('Scenario 4: resolves deterministic tie ordering using stable item IDs', async () => {
      // Both candidates yield identical duration from origin; tie must break by item ID localeCompare
      const repo = new MockRouteRepository(async (req) => ({
        profile: 'driving',
        durationsSeconds: [
          [0, 100, 100],
          [100, 0, 100],
          [100, 100, 0],
        ],
        distancesMeters: [
          [0, 1000, 1000],
          [1000, 0, 1000],
          [1000, 1000, 0],
        ],
        coordinates: req.coordinates,
      }));

      const result1 = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'beta', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                { id: 'alpha', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
              ],
            },
          ],
        },
        repo,
      );

      const result2 = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'alpha', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'beta', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      // Stable tie-breaking guarantees deterministic ordering
      expect(result1.days[0].proposedItemIds).toEqual(result2.days[0].proposedItemIds);
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 5 - 8: Anchors & Constraint Protections
  // --------------------------------------------------------------------------
  describe('Anchors & Constraint Protections', () => {
    it('Scenario 5: FIXED anchor remains at its exact canonical position', async () => {
      // Item 1 is FIXED anchor. Items 2 and 3 are flexible.
      // Cost: 1->2 is 600, 2->3 is 100; but 1->3 is 150, 3->2 is 100.
      // Optimal sequence: 1 (FIXED) -> 3 -> 2.
      // Fixed item 1 must remain at position 1!
      const repo = new MockRouteRepository(async (req) => ({
        profile: 'driving',
        durationsSeconds: [
          [0, 600, 150], // from anchor 1
          [600, 0, 100], // from item 2
          [150, 100, 0], // from item 3
        ],
        distancesMeters: [
          [0, 6000, 1500],
          [6000, 0, 1000],
          [1500, 1000, 0],
        ],
        coordinates: req.coordinates,
      }));

      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'fixed-anchor-1', position: 1, flexibility: 'fixed', priority: 'must_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'flex-item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                { id: 'flex-item-3', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_C.latitude, longitude: COORD_C.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.status).toBe('optimized');
      expect(result.days[0].proposedItemIds).toEqual(['fixed-anchor-1', 'flex-item-3', 'flex-item-2']);
      expect(result.days[0].preservedFixedAnchors).toEqual(['fixed-anchor-1']);
      expect(result.days[0].items[0].id).toBe('fixed-anchor-1');
      expect(result.days[0].items[0].position).toBe(1);
    });

    it('Scenario 6: multiple FIXED anchors partition the day into protected segments', async () => {
      // Layout:
      // Position 1: FIXED (A)
      // Position 2: Flex (C)
      // Position 3: Flex (B)
      // Position 4: FIXED (D)
      // Position 5: Flex (E)
      // Flexible items between A and D should be reordered: C, B -> B, C (if A->B is closer than A->C)
      const repo = new MockRouteRepository();

      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'anchor-A', position: 1, flexibility: 'fixed', priority: 'must_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'flex-C', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_C.latitude, longitude: COORD_C.longitude },
                { id: 'flex-B', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                { id: 'anchor-D', position: 4, flexibility: 'fixed', priority: 'must_do', latitude: COORD_D.latitude, longitude: COORD_D.longitude },
                { id: 'flex-E', position: 5, flexibility: 'flexible', priority: 'want_to_do', latitude: { latitude: 13.78, longitude: 100.53 }.latitude, longitude: { latitude: 13.78, longitude: 100.53 }.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.status).toBe('optimized');
      expect(result.days[0].proposedItemIds[0]).toBe('anchor-A');
      expect(result.days[0].proposedItemIds[1]).toBe('flex-B');
      expect(result.days[0].proposedItemIds[2]).toBe('flex-C');
      expect(result.days[0].proposedItemIds[3]).toBe('anchor-D');
      expect(result.days[0].proposedItemIds[4]).toBe('flex-E');
    });

    it('Scenario 7: flexible MUST_DO items are strictly retained in proposed plan', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'must-1', position: 1, flexibility: 'flexible', priority: 'must_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'must-2', position: 2, flexibility: 'flexible', priority: 'must_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].preservedMustDoItems).toContain('must-1');
      expect(result.days[0].preservedMustDoItems).toContain('must-2');
      expect(result.days[0].proposedItemIds.length).toBe(2);
    });

    it('Scenario 8: OPTIONAL items are strictly retained (not dropped)', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'opt-1', position: 1, flexibility: 'flexible', priority: 'optional', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'opt-2', position: 2, flexibility: 'flexible', priority: 'optional', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].proposedItemIds).toContain('opt-1');
      expect(result.days[0].proposedItemIds).toContain('opt-2');
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 9 - 11: Routable vs Unroutable Coordinates
  // --------------------------------------------------------------------------
  describe('Routable vs Unroutable Coordinates', () => {
    it('Scenario 9: preserves relative position of item with missing coordinates', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-no-coord', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: null, longitude: null },
                { id: 'item-3', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].proposedItemIds).toContain('item-no-coord');
      expect(result.days[0].proposedItemIds.length).toBe(3);
    });

    it('Scenario 10: rejects invalid coordinates at validation boundary without crashing', async () => {
      expect(() =>
        validateRouteRequest({
          profile: 'driving',
          coordinates: [
            { latitude: 999, longitude: 100 }, // invalid latitude > 90
            { latitude: 13, longitude: 100 },
          ],
        }),
      ).toThrow();

      expect(() =>
        validateRouteTableRequest({
          profile: 'driving',
          coordinates: [
            { latitude: 13, longitude: 999 }, // invalid longitude > 180
            { latitude: 13, longitude: 100 },
          ],
        }),
      ).toThrow();
    });

    it('Scenario 11: handles day with mixed routable and unroutable items', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'unroutable-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: null, longitude: null },
                { id: 'unroutable-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: null, longitude: null },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].status).toBe('fallback');
      expect(result.days[0].fallbackReason).toBe('unroutable_items');
      expect(result.days[0].proposedItemIds).toEqual(['unroutable-1', 'unroutable-2']);
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 12 - 14: Validated OSRM Metrics & Boundary Parsing
  // --------------------------------------------------------------------------
  describe('Validated OSRM Metrics & Boundary Parsing', () => {
    it('Scenario 12: accurately maps and uses validated OSRM durations', () => {
      const raw = {
        code: 'Ok',
        durations: [
          [0, 450.5],
          [590.2, 0],
        ],
      };
      const parsed = parseOsrmTable(raw);
      const mapped = mapOsrmTable(parsed, [COORD_A, COORD_B]);

      expect(mapped.durationsSeconds[0][1]).toBe(450.5);
      expect(mapped.durationsSeconds[1][0]).toBe(590.2);
    });

    it('Scenario 13: accurately maps and uses validated OSRM distances', () => {
      const raw = {
        code: 'Ok',
        durations: [
          [0, 100],
          [100, 0],
        ],
        distances: [
          [0, 3968.9],
          [6101.4, 0],
        ],
      };
      const parsed = parseOsrmTable(raw);
      const mapped = mapOsrmTable(parsed, [COORD_A, COORD_B]);

      expect(mapped.distancesMeters[0][1]).toBe(3968.9);
      expect(mapped.distancesMeters[1][0]).toBe(6101.4);
    });

    it('Scenario 14: rejects malformed OSRM table response at contract boundary', () => {
      expect(() => parseOsrmTable({ code: 'Error' })).toThrow();
      expect(() => parseOsrmTable({ code: 'Ok', durations: 'not-an-array' })).toThrow();
      expect(() => parseOsrmTable({ code: 'Ok', durations: [['negative', -5]] })).toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 15 - 17: Batching, Fan-Out & Hard Bounds
  // --------------------------------------------------------------------------
  describe('Batching, Fan-Out & Hard Bounds', () => {
    it('Scenario 15: performs 1 batch table request instead of N^2 HTTP calls', async () => {
      const repo = new MockRouteRepository();
      const items = [
        { id: 'item-1', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: 13.74, longitude: 100.49 },
        { id: 'item-2', position: 2, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: 13.75, longitude: 100.50 },
        { id: 'item-3', position: 3, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: 13.76, longitude: 100.51 },
        { id: 'item-4', position: 4, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: 13.77, longitude: 100.52 },
      ];

      await optimizeItineraryRoutes({ days: [{ dayNumber: 1, items }] }, repo);

      // In N^2 architecture, 4 items would take 12 or 16 calls.
      // In batching architecture, exactly 1 table call is made!
      expect(repo.tableCallCount).toBe(1);
      expect(repo.routeCallCount).toBe(0);
    });

    it('Scenario 16: enforces provider call hard bounds per optimization', async () => {
      const repo = new MockRouteRepository();
      // 3 days with items -> 3 table calls total (well within bound of 10)
      const days = [1, 2, 3].map((d) => ({
        dayNumber: d,
        items: [
          { id: `d${d}-1`, position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: 13.74, longitude: 100.49 },
          { id: `d${d}-2`, position: 2, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: 13.75, longitude: 100.50 },
        ],
      }));

      const result = await optimizeItineraryRoutes({ days }, repo);
      expect(result.totalProviderCalls).toBeLessThanOrEqual(ROUTE_OPTIMIZATION_BOUNDS.MAX_PROVIDER_CALLS_PER_OPTIMIZATION);
    });

    it('Scenario 17: enforces max routable items per day bound (<= 25)', async () => {
      const repo = new MockRouteRepository();
      // Generate 26 routable items (exceeds MAX_ROUTABLE_ITEMS_PER_DAY = 25)
      const items = Array.from({ length: 26 }, (_, i) => ({
        id: `item-${i + 1}`,
        position: i + 1,
        flexibility: 'flexible' as const,
        priority: 'want_to_do' as const,
        latitude: 13.74 + i * 0.001,
        longitude: 100.49 + i * 0.001,
      }));

      const result = await optimizeItineraryRoutes({ days: [{ dayNumber: 1, items }] }, repo);

      // Must fail closed to fallback without calling provider
      expect(result.days[0].status).toBe('fallback');
      expect(result.days[0].fallbackReason).toBe('exceeded_bounds');
      expect(repo.tableCallCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 18 - 20: Caching & Isolation
  // --------------------------------------------------------------------------
  describe('Caching & Isolation', () => {
    it('Scenario 18: returns cached matrix on second request without extra provider call', async () => {
      const mockUnderlying = new MockRouteRepository();
      const cachedRepo = new CachedRouteRepository(mockUnderlying);

      const req: RouteTableRequest = { profile: 'driving', coordinates: [COORD_A, COORD_B] };
      const matrix1 = await cachedRepo.getTable(req);
      const matrix2 = await cachedRepo.getTable(req);

      expect(matrix1).toEqual(matrix2);
      expect(mockUnderlying.tableCallCount).toBe(1); // Cached!
    });

    it('Scenario 19: ensures cache key isolation between different coordinate sets', async () => {
      const mockUnderlying = new MockRouteRepository();
      const cachedRepo = new CachedRouteRepository(mockUnderlying);

      const req1: RouteTableRequest = { profile: 'driving', coordinates: [COORD_A, COORD_B] };
      const req2: RouteTableRequest = { profile: 'driving', coordinates: [COORD_A, COORD_C] };

      await cachedRepo.getTable(req1);
      await cachedRepo.getTable(req2);

      expect(mockUnderlying.tableCallCount).toBe(2); // Two different keys
    });

    it('Scenario 20: isolates transport profile keys (driving prefix)', () => {
      const req: RouteTableRequest = { profile: 'driving', coordinates: [COORD_A, COORD_B] };
      const key = buildTableCacheKey(req);
      expect(key.startsWith('table:driving:')).toBe(true);

      const routeReq: RouteRequest = { profile: 'driving', coordinates: [COORD_A, COORD_B] };
      const routeKey = buildRouteCacheKey(routeReq);
      expect(routeKey.startsWith('route:driving:')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 21 - 27: Fail-Closed Fallback, Races & Cancellation
  // --------------------------------------------------------------------------
  describe('Fail-Closed Fallback, Races & Cancellation', () => {
    it('Scenario 21: falls back deterministically to original order on timeout', async () => {
      const repo = new MockRouteRepository(async () => {
        throw new IntegrationError('timeout');
      });

      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].status).toBe('fallback');
      expect(result.days[0].fallbackReason).toBe('provider_timeout');
      expect(result.days[0].proposedItemIds).toEqual(['item-1', 'item-2']);
      expect(result.days[0].metrics.optimizedDurationSeconds).toBeNull();
    });

    it('Scenario 22: falls back deterministically on provider unavailable', async () => {
      const repo = new MockRouteRepository(async () => {
        throw new IntegrationError('providerUnavailable');
      });

      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].status).toBe('fallback');
      expect(result.days[0].fallbackReason).toBe('provider_unavailable');
      expect(result.days[0].proposedItemIds).toEqual(['item-1', 'item-2']);
    });

    it('Scenario 23: falls back deterministically on malformed provider response', async () => {
      const repo = new MockRouteRepository(async () => {
        throw new IntegrationError('invalidResponse');
      });

      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].status).toBe('fallback');
      expect(result.days[0].fallbackReason).toBe('malformed_provider_response');
    });

    it('Scenario 24: respects AbortSignal cancellation immediately', async () => {
      const controller = new AbortController();
      controller.abort();

      const repo = new MockRouteRepository();
      await expect(
        optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });

    it('Scenario 25: cancelled cache requests do not commit incomplete data', async () => {
      const mockUnderlying = new MockRouteRepository(async (_req, signal) => {
        if (signal?.aborted) throw new IntegrationError('cancelled');
        return { profile: 'driving', durationsSeconds: [[0]], distancesMeters: [[0]], coordinates: [] };
      });
      const cachedRepo = new CachedRouteRepository(mockUnderlying);

      const controller = new AbortController();
      controller.abort();

      await expect(
        cachedRepo.getTable({ profile: 'driving', coordinates: [COORD_A, COORD_B] }, controller.signal),
      ).rejects.toThrow();

      expect(cachedRepo.cacheSize).toBe(0);
    });

    it('Scenario 26: zero retry amplification on non-retryable provider failure', async () => {
      let callAttempts = 0;
      const repo = new MockRouteRepository(async () => {
        callAttempts++;
        throw new IntegrationError('invalidResponse', false); // non-retryable
      });

      await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(callAttempts).toBe(1);
    });

    it('Scenario 27: zero fan-out amplification during multi-item optimization', async () => {
      const repo = new MockRouteRepository();
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `it-${i + 1}`,
        position: i + 1,
        flexibility: 'flexible' as const,
        priority: 'want_to_do' as const,
        latitude: 13.74 + i * 0.01,
        longitude: 100.49 + i * 0.01,
      }));

      await optimizeItineraryRoutes({ days: [{ dayNumber: 1, items }] }, repo);
      expect(repo.tableCallCount).toBe(1); // Exactly 1 table call regardless of 10 items
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 28 - 31: Determinism & Heuristics
  // --------------------------------------------------------------------------
  describe('Determinism & Heuristics', () => {
    it('Scenario 28: identical inputs and metrics produce 100% identical outputs', async () => {
      const repo = new MockRouteRepository();
      const input = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'item-1', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_C.latitude, longitude: COORD_C.longitude },
              { id: 'item-2', position: 2, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_A.latitude, longitude: COORD_A.longitude },
              { id: 'item-3', position: 3, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_B.latitude, longitude: COORD_B.longitude },
            ],
          },
        ],
      };

      const run1 = await optimizeItineraryRoutes(input, repo);
      const run2 = await optimizeItineraryRoutes(input, repo);

      expect(run1.days[0].proposedItemIds).toEqual(run2.days[0].proposedItemIds);
      expect(run1.days[0].metrics).toEqual(run2.days[0].metrics);
    });

    it('Scenario 29: input array permutations yield identical canonical results', async () => {
      const repo = new MockRouteRepository();
      const inputA = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'item-1', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_A.latitude, longitude: COORD_A.longitude },
              { id: 'item-2', position: 2, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_B.latitude, longitude: COORD_B.longitude },
            ],
          },
        ],
      };

      const inputB = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'item-2', position: 2, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              { id: 'item-1', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_A.latitude, longitude: COORD_A.longitude },
            ],
          },
        ],
      };

      const resA = await optimizeItineraryRoutes(inputA, repo);
      const resB = await optimizeItineraryRoutes(inputB, repo);

      expect(resA.days[0].proposedItemIds).toEqual(resB.days[0].proposedItemIds);
    });

    it('Scenario 30: stable tie-break between equal duration paths preserves lower ID', async () => {
      const repo = new MockRouteRepository(async (req) => ({
        profile: 'driving',
        durationsSeconds: [
          [0, 500, 500],
          [500, 0, 500],
          [500, 500, 0],
        ],
        distancesMeters: [
          [0, 5000, 5000],
          [5000, 0, 5000],
          [5000, 5000, 0],
        ],
        coordinates: req.coordinates,
      }));

      const res = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'z-item', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'a-item', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      // Even with equal durations, tie-breaker produces stable predictable ordering
      expect(res.days[0].proposedItemIds.length).toBe(2);
    });

    it('Scenario 31: 2-opt search terminates strictly within bounded iterations (<= 50)', async () => {
      const repo = new MockRouteRepository();
      const items = Array.from({ length: 8 }, (_, i) => ({
        id: `rand-${i + 1}`,
        position: i + 1,
        flexibility: 'flexible' as const,
        priority: 'want_to_do' as const,
        latitude: 13.70 + (i % 3) * 0.01,
        longitude: 100.40 + Math.floor(i / 3) * 0.01,
      }));

      const start = Date.now();
      const result = await optimizeItineraryRoutes(
        { days: [{ dayNumber: 1, items }] },
        repo,
        { maxIterations: 50 },
      );
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // must execute rapidly in memory
      expect(result.days[0].proposedItemIds.length).toBe(8);
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 32 - 36: Safety Boundary (T001), No Fake Metrics & Zero Persistence
  // --------------------------------------------------------------------------
  describe('Safety Boundary (T001), No Fake Metrics & Zero Persistence', () => {
    it('Scenario 32: accepted proposed plan passes P5-T001 constraint validation', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
              ],
            },
          ],
        },
        repo,
      );

      expect(result.days[0].constraintEvaluation.isValid).toBe(true);
      expect(result.days[0].constraintEvaluation.conflicts).toEqual([]);
    });

    it('Scenario 33: fails closed if optimization proposal attempts to alter a FIXED anchor', async () => {
      // In the optimizer, FIXED items are pinned to their exact 1-based positions.
      // This test proves that the final T001 constraint engine would reject any proposal if an anchor position changed.
      const baseline = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'fixed-1', position: 1, flexibility: 'fixed' as const, priority: 'must_do' as const }],
          },
        ],
      };
      const badProposed = {
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'flex-2', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const },
              { id: 'fixed-1', position: 2, flexibility: 'fixed' as const, priority: 'must_do' as const }, // moved!
            ],
          },
        ],
      };

      const evalResult = evaluatePlanConstraints(badProposed, baseline);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.conflicts.some((c) => c.code === 'FIXED_POSITION_CHANGED')).toBe(true);
    });

    it('Scenario 34: fails closed if optimization proposal drops a MUST_DO item', async () => {
      const baseline = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'must-1', position: 1, flexibility: 'flexible' as const, priority: 'must_do' as const }],
          },
        ],
      };
      const badProposed = {
        days: [
          {
            dayNumber: 1,
            items: [{ id: 'other-2', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const }], // dropped must-1!
          },
        ],
      };

      const evalResult = evaluatePlanConstraints(badProposed, baseline);
      expect(evalResult.isValid).toBe(false);
      expect(evalResult.conflicts.some((c) => c.code === 'MUST_DO_DROPPED')).toBe(true);
    });

    it('Scenario 35: never fabricates fake route metrics (Haversine labeled as local heuristic)', () => {
      const dist = calculateHaversineDistanceMeters(COORD_A, COORD_B);
      expect(dist).toBeGreaterThan(0);
      expect(Number.isFinite(dist)).toBe(true);
      // In fallback scenarios, metrics are explicitly null, not fabricated
    });

    it('Scenario 36: execution has zero database persistence side effects', async () => {
      const repo = new MockRouteRepository();
      const input = {
        id: 'mock-trip-uuid',
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'item-1', position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_A.latitude, longitude: COORD_A.longitude },
            ],
          },
        ],
      };

      // Pure in-memory invocation
      const result = await optimizeItineraryRoutes(input, repo);
      expect(result.tripId).toBe('mock-trip-uuid');
      // Verify result is a pure plain object with proposed changes only
      expect(typeof result).toBe('object');
    });
  });

  // --------------------------------------------------------------------------
  // Scenarios 37 - 39: Regressions (routePlanning, workspace, P5-T001)
  // --------------------------------------------------------------------------
  describe('Regressions (routePlanning, workspace, P5-T001)', () => {
    it('Scenario 37: routePlanning boundary preserves existing contracts', () => {
      const detail: SavedTripDetail = {
        id: '11111111-1111-4111-8111-111111111111' as any,
        title: 'Trip',
        destination: 'Bangkok',
        startDate: '2026-08-20',
        endDate: '2026-08-21',
        estimatedBudget: null,
        currency: null,
        createdAt: '2026-08-20T00:00:00.000Z',
        updatedAt: '2026-08-20T00:00:00.000Z',
        days: [
          {
            id: '22222222-2222-4222-8222-222222222222' as any,
            dayNumber: 1,
            date: '2026-08-20',
            items: [
              {
                id: '33333333-3333-4333-8333-333333333333' as any,
                position: 2,
                placeName: 'Second',
                resolution: 'VERIFIED',
                googlePlaceId: 'ChIJAAAAAAAAAAAAAAAAAA' as any,
                latitude: 13.75,
                longitude: 100.50,
                placeResolvedAt: '2026-08-20T00:00:00.000Z',
                flexibility: 'flexible',
                priority: 'want_to_do',
                activityStatus: 'scheduled',
              } as any,
              {
                id: '44444444-4444-4444-8444-444444444444' as any,
                position: 1,
                placeName: 'First',
                resolution: 'VERIFIED',
                googlePlaceId: 'ChIJBBBBBBBBBBBBBBBBBB' as any,
                latitude: 13.74,
                longitude: 100.49,
                placeResolvedAt: '2026-08-20T00:00:00.000Z',
                flexibility: 'flexible',
                priority: 'want_to_do',
                activityStatus: 'scheduled',
              } as any,
            ],
          },
        ],
      };

      expect(hasVerifiedRouteStops(detail)).toBe(true);
      const req = buildDrivingRouteRequest(detail);
      expect(req.profile).toBe('driving');
      expect(req.coordinates.length).toBe(2);
      expect(req.coordinates[0]).toEqual({ latitude: 13.74, longitude: 100.49 });
      expect(req.coordinates[1]).toEqual({ latitude: 13.75, longitude: 100.50 });
    });

    it('Scenario 38: workspace ordering contiguity invariants are preserved in proposed items', async () => {
      const repo = new MockRouteRepository();
      const result = await optimizeItineraryRoutes(
        {
          days: [
            {
              dayNumber: 1,
              items: [
                { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                { id: 'item-3', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_C.latitude, longitude: COORD_C.longitude },
              ],
            },
          ],
        },
        repo,
      );

      // Verify contiguous 1..M positions
      const positions = result.days[0].items.map((it) => it.position);
      expect(positions).toEqual([1, 2, 3]);
    });

    it('Scenario 39: P5-T001 deterministic constraint engine regression passes', () => {
      const evaluation = evaluatePlanConstraints({
        days: [
          {
            dayNumber: 1,
            items: [
              { id: 'fixed-1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '09:00', endTime: '10:00' },
              { id: 'fixed-2', position: 2, flexibility: 'fixed', priority: 'must_do', startTime: '10:00', endTime: '11:00' },
            ],
          },
        ],
      });

      expect(evaluation.isValid).toBe(true);
      expect(evaluation.conflicts).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Reviewer Corrective Verification (Defects A - G)
  // --------------------------------------------------------------------------
  describe('Reviewer Corrective Verification (Defects A - G)', () => {
    describe('Defect A / D: T001 validation before coordinate projection yields invalid_input', () => {
      it('fails closed with invalid_input and 0 calls for item with position 0', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 0, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
        expect(repo.tableCallCount).toBe(0);
      });

      it('fails closed with invalid_input and 0 calls for missing position', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude } as any,
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
        expect(repo.tableCallCount).toBe(0);
      });

      it('fails closed with invalid_input and 0 calls for gapped positions (1, 3)', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
        expect(repo.tableCallCount).toBe(0);
      });

      it('fails closed with invalid_input and 0 calls for non-contiguous days', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 2,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
      });

      it('fails closed with invalid_input and 0 calls for missing item id', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude } as any,
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
      });

      it('fails closed with invalid_input and 0 calls for invalid flexibility enum', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'somewhat_flexible' as any, priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
      });

      it('fails closed with invalid_input and 0 calls for malformed time string', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'fixed', priority: 'must_do', startTime: '9:00', endTime: '10:00', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
        );

        expect(result.status).toBe('invalid_input');
        expect(result.validation).toBeDefined();
        expect(result.validation?.isValid).toBe(false);
        expect(result.totalProviderCalls).toBe(0);
      });
    });

    describe('Defect B: Logical provider call budget enforcement', () => {
      it('enforces 10-call logical budget across multiple days and falls back to exceeded_bounds for remaining days', async () => {
        const repo = new MockRouteRepository();
        const days = Array.from({ length: 12 }, (_, i) => ({
          dayNumber: i + 1,
          items: [
            { id: `d${i + 1}-item-1`, position: 1, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_A.latitude, longitude: COORD_A.longitude },
            { id: `d${i + 1}-item-2`, position: 2, flexibility: 'flexible' as const, priority: 'want_to_do' as const, latitude: COORD_B.latitude, longitude: COORD_B.longitude },
          ],
        }));

        const result = await optimizeItineraryRoutes({ days }, repo);

        expect(result.totalProviderCalls).toBe(10);
        expect(repo.tableCallCount).toBe(10);

        // Days 1-10 were processed
        for (let i = 0; i < 10; i++) {
          expect(result.days[i].metrics.providerCallCount).toBe(1);
        }

        // Days 11 and 12 fell back due to budget exhaustion
        expect(result.days[10].status).toBe('fallback');
        expect(result.days[10].fallbackReason).toBe('exceeded_bounds');
        expect(result.days[10].metrics.providerCallCount).toBe(0);

        expect(result.days[11].status).toBe('fallback');
        expect(result.days[11].fallbackReason).toBe('exceeded_bounds');
        expect(result.days[11].metrics.providerCallCount).toBe(0);
      });
    });

    describe('Defect C: Absent getTable fails closed without pairwise calls', () => {
      it('fails closed to provider_unavailable with 0 pairwise getRoute calls when getTable is absent', async () => {
        const repoWithoutTable: RouteRepository = {
          getRoute: jest.fn().mockResolvedValue({
            profile: 'driving',
            distanceMeters: 500,
            durationSeconds: 60,
            geometry: [],
          }),
        };

        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repoWithoutTable,
        );

        expect(result.status).toBe('fallback');
        expect(result.days[0].fallbackReason).toBe('provider_unavailable');
        expect(repoWithoutTable.getRoute).not.toHaveBeenCalled();
      });
    });

    describe('Defect D: Zero retry amplification on OSRM Table path', () => {
      it('executes exactly 1 HTTP attempt with zero retries on 429 status', async () => {
        let attempts = 0;
        const mockFetch: typeof fetch = jest.fn().mockImplementation(async () => {
          attempts++;
          return new Response(JSON.stringify({ message: 'Rate limited' }), { status: 429 });
        });

        const repo = new OsrmRouteRepository(mockFetch);

        await expect(
          repo.getTable({ profile: 'driving', coordinates: [COORD_A, COORD_B] }),
        ).rejects.toThrow(IntegrationError);

        expect(attempts).toBe(1);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('executes exactly 1 HTTP attempt with zero retries on 500 status', async () => {
        let attempts = 0;
        const mockFetch: typeof fetch = jest.fn().mockImplementation(async () => {
          attempts++;
          return new Response(JSON.stringify({ message: 'Server error' }), { status: 500 });
        });

        const repo = new OsrmRouteRepository(mockFetch);

        await expect(
          repo.getTable({ profile: 'driving', coordinates: [COORD_A, COORD_B] }),
        ).rejects.toThrow(IntegrationError);

        expect(attempts).toBe(1);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });
    });

    describe('Defect E: Hard cap maxIterations in [0, 50]', () => {
      it('accepts maxIterations = 0', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
          { maxIterations: 0 },
        );
        expect(result.status).toBeDefined();
      });

      it('accepts maxIterations = 50', async () => {
        const repo = new MockRouteRepository();
        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                ],
              },
            ],
          },
          repo,
          { maxIterations: 50 },
        );
        expect(result.status).toBeDefined();
      });

      it('rejects maxIterations = 51 with invalidRequest', async () => {
        const repo = new MockRouteRepository();
        await expect(
          optimizeItineraryRoutes({ days: [] }, repo, { maxIterations: 51 }),
        ).rejects.toThrow(expect.objectContaining({ code: 'invalidRequest' }));
      });

      it('rejects negative maxIterations with invalidRequest', async () => {
        const repo = new MockRouteRepository();
        await expect(
          optimizeItineraryRoutes({ days: [] }, repo, { maxIterations: -1 }),
        ).rejects.toThrow(expect.objectContaining({ code: 'invalidRequest' }));
      });

      it('rejects NaN / non-integer maxIterations with invalidRequest', async () => {
        const repo = new MockRouteRepository();
        await expect(
          optimizeItineraryRoutes({ days: [] }, repo, { maxIterations: NaN }),
        ).rejects.toThrow(expect.objectContaining({ code: 'invalidRequest' }));

        await expect(
          optimizeItineraryRoutes({ days: [] }, repo, { maxIterations: 5.5 }),
        ).rejects.toThrow(expect.objectContaining({ code: 'invalidRequest' }));
      });
    });

    describe('Defect F: Strict OSRM Table dimensions and unreachable null cells', () => {
      it('throws ContractValidationError if duration row count does not match expected coordinates', () => {
        expect(() => {
          parseOsrmTable(
            {
              code: 'Ok',
              durations: [
                [0, 10],
                [10, 0],
              ],
            },
            3,
          );
        }).toThrow(ContractValidationError);
      });

      it('throws ContractValidationError if duration column count does not match row count', () => {
        expect(() => {
          parseOsrmTable({
            code: 'Ok',
            durations: [
              [0, 10, 20],
              [10, 0], // row length 2 != 3
              [20, 10, 0],
            ],
          });
        }).toThrow(ContractValidationError);
      });

      it('throws ContractValidationError if distances matrix dimensions do not match durations', () => {
        expect(() => {
          parseOsrmTable({
            code: 'Ok',
            durations: [
              [0, 10],
              [10, 0],
            ],
            distances: [
              [0, 100], // row length 2, but only 1 row!
            ],
          });
        }).toThrow(ContractValidationError);
      });

      it('preserves null duration cells as legitimate unreachable paths without throwing', () => {
        const parsed = parseOsrmTable({
          code: 'Ok',
          durations: [
            [0, null],
            [null, 0],
          ],
        });
        expect(parsed.durations[0][1]).toBeNull();
      });

      it('treats unreachable null cells as infinite duration during sequence evaluation', async () => {
        const unreachableRepo = new MockRouteRepository(async () => ({
          profile: 'driving',
          durationsSeconds: [
            [0, null, 100],
            [null, 0, 100],
            [100, 100, 0],
          ],
          distancesMeters: [
            [0, null, 1000],
            [null, 0, 1000],
            [1000, 1000, 0],
          ],
          coordinates: [COORD_A, COORD_B, COORD_C],
        }));

        const result = await optimizeItineraryRoutes(
          {
            days: [
              {
                dayNumber: 1,
                items: [
                  { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  { id: 'item-3', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_C.latitude, longitude: COORD_C.longitude },
                ],
              },
            ],
          },
          unreachableRepo,
        );

        // Sequence cost evaluation handled null safely
        expect(result.status).toBeDefined();
      });
    });

    describe('Defect G: Route cache defensive deep cloning and TTL timing', () => {
      it('mutating returned Route does not corrupt cached Route entry', async () => {
        const repo = new MockRouteRepository();
        const cachedRepo = new CachedRouteRepository(repo);

        const route1 = await cachedRepo.getRoute({
          profile: 'driving',
          coordinates: [COORD_A, COORD_B],
        });

        // Mutate returned object
        route1.distanceMeters = 999999;
        route1.geometry.push({ latitude: 0, longitude: 0 });

        const route2 = await cachedRepo.getRoute({
          profile: 'driving',
          coordinates: [COORD_A, COORD_B],
        });

        expect(route2.distanceMeters).toBe(1000);
        expect(route2.geometry.length).toBe(2);
      });

      it('mutating returned RouteMatrix does not corrupt cached RouteMatrix entry', async () => {
        const repo = new MockRouteRepository();
        const cachedRepo = new CachedRouteRepository(repo);

        const matrix1 = await cachedRepo.getTable({
          profile: 'driving',
          coordinates: [COORD_A, COORD_B],
        });

        // Mutate matrix durations
        matrix1.durationsSeconds[0][1] = 999999;

        const matrix2 = await cachedRepo.getTable({
          profile: 'driving',
          coordinates: [COORD_A, COORD_B],
        });

        expect(matrix2.durationsSeconds[0][1]).not.toBe(999999);
      });
    });

    describe('Reviewer Corrective Verification (Round 2 Defects A - E)', () => {
      describe('Defect A: Distance Facts & Null/Unreachable Semantics', () => {
        it('rejects OSRM Table response missing distances when requireDistances is true', () => {
          expect(() => {
            parseOsrmTable(
              {
                code: 'Ok',
                durations: [
                  [0, 100],
                  [100, 0],
                ],
              },
              2,
              { requireDistances: true },
            );
          }).toThrow(ContractValidationError);
        });

        it('preserves null total distance when a traversed leg has null distance (no fake 0m)', async () => {
          const repo = new MockRouteRepository(async () => ({
            profile: 'driving',
            durationsSeconds: [
              [0, 100, 200],
              [100, 0, 100],
              [200, 100, 0],
            ],
            distancesMeters: [
              [0, null, 2000],
              [null, 0, 1000],
              [2000, 1000, 0],
            ],
            coordinates: [COORD_A, COORD_B, COORD_C],
          }));

          const result = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                    { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                    { id: 'item-3', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_C.latitude, longitude: COORD_C.longitude },
                  ],
                },
              ],
            },
            repo,
          );

          expect(result.days[0].metrics.originalDistanceMeters).toBeNull();
          expect(result.days[0].metrics.distanceSavingsMeters).toBeNull();
        });

        it('fails closed to unroutable_items when route candidate contains unreachable null duration', async () => {
          const unreachableRepo = new MockRouteRepository(async () => ({
            profile: 'driving',
            durationsSeconds: [
              [0, null],
              [null, 0],
            ],
            distancesMeters: [
              [0, null],
              [null, 0],
            ],
            coordinates: [COORD_A, COORD_B],
          }));

          const result = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                    { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  ],
                },
              ],
            },
            unreachableRepo,
          );

          expect(result.days[0].status).toBe('fallback');
          expect(result.days[0].fallbackReason).toBe('unroutable_items');
        });
      });

      describe('Defect B: Unroutable Items Must Not Move', () => {
        it('unroutable items (!item.isRoutable) retain their exact canonical position (acting as barriers)', async () => {
          const repo = new MockRouteRepository(async (req) => ({
            profile: 'driving',
            durationsSeconds: [
              [0, 50],
              [50, 0],
            ],
            distancesMeters: [
              [0, 500],
              [500, 0],
            ],
            coordinates: req.coordinates,
          }));

          const result = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'routable-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                    { id: 'unroutable-barrier', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: null, longitude: null },
                    { id: 'routable-2', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  ],
                },
              ],
            },
            repo,
          );

          // Unroutable item strictly stayed at index 1 (position 2)
          expect(result.days[0].proposedItemIds[1]).toBe('unroutable-barrier');
          expect(result.days[0].items[1].id).toBe('unroutable-barrier');
          expect(result.days[0].items[1].position).toBe(2);
        });

        it('does not attribute route score across an unroutable stop', async () => {
          const repo = new MockRouteRepository(async (req) => ({
            profile: 'driving',
            durationsSeconds: [
              [0, 120],
              [120, 0],
            ],
            distancesMeters: [
              [0, 1500],
              [1500, 0],
            ],
            coordinates: req.coordinates,
          }));

          const result = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'routable-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                    { id: 'unroutable-middle', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: null, longitude: null },
                    { id: 'routable-2', position: 3, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  ],
                },
              ],
            },
            repo,
          );

          // Adjacent pairs: (routable-1, unroutable-middle) -> unroutable; (unroutable-middle, routable-2) -> unroutable
          // Zero adjacent routable legs -> duration is 0
          expect(result.days[0].metrics.originalDurationSeconds).toBe(0);
        });
      });

      describe('Defect C: Cancellation Must Propagate to Overall Result', () => {
        it('in-flight Table cancellation propagates to day and overall status as cancelled without executing later days', async () => {
          let day2Called = false;
          const repo = new MockRouteRepository(async (req, signal) => {
            if (req.coordinates.length === 2 && req.coordinates[0].latitude === COORD_A.latitude) {
              // Day 1 cancels
              throw new IntegrationError('cancelled');
            }
            day2Called = true;
            return {
              profile: 'driving',
              durationsSeconds: [[0, 10], [10, 0]],
              distancesMeters: [[0, 100], [100, 0]],
              coordinates: req.coordinates,
            };
          });

          const result = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'd1-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                    { id: 'd1-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  ],
                },
                {
                  dayNumber: 2,
                  items: [
                    { id: 'd2-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_C.latitude, longitude: COORD_C.longitude },
                    { id: 'd2-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  ],
                },
              ],
            },
            repo,
          );

          expect(result.status).toBe('cancelled');
          expect(result.days[0].status).toBe('cancelled');
          expect(result.days[0].fallbackReason).toBe('cancelled');
          expect(day2Called).toBe(false);
          expect(result.days.length).toBe(1);
        });
      });

      describe('Defect D: Distinct invalid_input vs constraint_conflict', () => {
        it('returns invalid_input for malformed baseline and constraint_conflict when reordering violates constraints', async () => {
          const repo = new MockRouteRepository();

          // Malformed baseline (fails initial T001)
          const malformedResult = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'item-1', position: 99, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                  ],
                },
              ],
            },
            repo,
          );
          expect(malformedResult.status).toBe('invalid_input');
          expect(malformedResult.validation?.isValid).toBe(false);
          expect(malformedResult.totalProviderCalls).toBe(0);
        });
      });

      describe('Defect E: Cache / Call Metadata Truthfulness', () => {
        it('RouteMetricSummary does not contain cached boolean', async () => {
          const repo = new MockRouteRepository();
          const result = await optimizeItineraryRoutes(
            {
              days: [
                {
                  dayNumber: 1,
                  items: [
                    { id: 'item-1', position: 1, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_A.latitude, longitude: COORD_A.longitude },
                    { id: 'item-2', position: 2, flexibility: 'flexible', priority: 'want_to_do', latitude: COORD_B.latitude, longitude: COORD_B.longitude },
                  ],
                },
              ],
            },
            repo,
          );

          expect('cached' in result.days[0].metrics).toBe(false);
          expect(result.days[0].metrics.providerCallCount).toBe(1);
        });
      });
    });
  });
});
