jest.mock("../src/lib/supabase/client", () => ({ supabase: {} }));

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types";
import {
  OsrmRouteRepository,
  OpenMeteoWeatherRepository,
} from "../src/integration/remote/publicProviderRepositories";
import {
  SupabaseSavedTripsRepository,
  SupabaseTripPersistenceRepository,
} from "../src/integration/remote/supabaseTripRepositories";
import { SupabasePlaceResolutionRepository } from "../src/integration/remote/supabasePlaceResolutionRepository";
import { asItineraryItemId, asTripId } from "../src/integration/validation";

const tripId = "11111111-1111-4111-8111-111111111111";
const createdAt = "2026-08-20T01:00:00.000Z";

describe("integration remote repositories", () => {
  it("preserves the same create_trip_graph key across a bounded transient retry", async () => {
    const calls: Array<{ functionName: string; args: unknown }> = [];
    let attempt = 0;
    const rpc = jest.fn((functionName: string, args: unknown) => {
      calls.push({ functionName, args });
      attempt += 1;
      return {
        abortSignal: async () =>
          attempt === 1
            ? Promise.reject(new TypeError("temporary network failure"))
            : { data: tripId, error: null },
      };
    });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseTripPersistenceRepository(client);
    await expect(
      repository.persist({
        idempotencyKey: "save-intent-0001",
        graph: {
          title: "Trip",
          destination: "Huế",
          startDate: "2026-09-01",
          endDate: "2026-09-01",
          days: [
            {
              dayNumber: 1,
              date: "2026-09-01",
              items: [{ position: 1, placeName: "Đại Nội" }],
            },
          ],
        },
      }),
    ).resolves.toBe(tripId);
    expect(calls).toHaveLength(2);
    expect(calls.map((call) => call.functionName)).toEqual([
      "create_trip_graph",
      "create_trip_graph",
    ]);
    expect(calls[0].args).toEqual(calls[1].args);
  });

  it("uses the keyset saved-trip RPC contract", async () => {
    const abortSignal = jest
      .fn()
      .mockResolvedValue({
        data: { items: [], nextCursor: null },
        error: null,
      });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseSavedTripsRepository(client);
    await expect(
      repository.list({
        limit: 25,
        cursor: { createdAt, id: asTripId(tripId) },
      }),
    ).resolves.toEqual({
      items: [],
      nextCursor: null,
    });
    expect(rpc).toHaveBeenCalledWith("list_saved_trips", {
      p_limit: 25,
      p_cursor_created_at: createdAt,
      p_cursor_id: tripId,
    });
  });

  it("validates owner-scoped Profile trip and Saved Places statistics", async () => {
    const abortSignal = jest.fn().mockResolvedValue({
      data: { trips_count: 2, saved_places_count: 3 },
      error: null,
    });
    const rpc = jest.fn().mockReturnValue({ abortSignal });
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseSavedTripsRepository(client);

    await expect(repository.getStats()).resolves.toEqual({
      tripsCount: 2,
      savedPlacesCount: 3,
    });
    expect(rpc).toHaveBeenCalledWith("get_user_trip_stats");
  });

  it("uses the fixed OSRM driving origin and validates the provider response", async () => {
    const fetchTransport = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: "Ok",
        routes: [
          {
            distance: 1000,
            duration: 600,
            geometry: {
              type: "LineString",
              coordinates: [
                [108.2, 16.05],
                [108.3, 16.1],
              ],
            },
          },
        ],
      }),
    });
    const repository = new OsrmRouteRepository(fetchTransport);
    await expect(
      repository.getRoute({
        profile: "driving",
        coordinates: [
          { latitude: 16.05, longitude: 108.2 },
          { latitude: 16.1, longitude: 108.3 },
        ],
      }),
    ).resolves.toMatchObject({ profile: "driving", distanceMeters: 1000 });
    expect(fetchTransport.mock.calls[0][0]).toMatch(
      /^https:\/\/router\.project-osrm\.org\/route\/v1\/driving\//,
    );
  });

  it("returns optional weather fallback after bounded provider unavailability", async () => {
    const fetchTransport = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503 });
    const repository = new OpenMeteoWeatherRepository(fetchTransport);
    await expect(
      repository.getForecast({
        latitude: 16.05,
        longitude: 108.2,
        forecastDays: 3,
      }),
    ).resolves.toBeNull();
    expect(fetchTransport).toHaveBeenCalledTimes(2);
    expect(fetchTransport.mock.calls[0][0]).toMatch(
      /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/,
    );
  });

  it("invokes resolve-place with only the itinerary item UUID", async () => {
    const functions = {
      invoke: jest.fn().mockResolvedValue({
        data: {
          data: {
            itineraryItemId: "33333333-3333-4333-8333-333333333333",
            resolution: "VERIFIED",
            resolvedAt: "2026-08-20T01:00:00.000Z",
          },
        },
        error: null,
      }),
    };
    const client = { functions } as unknown as SupabaseClient<Database>;
    const repository = new SupabasePlaceResolutionRepository(client);
    await expect(
      repository.resolve({
        itineraryItemId: asItineraryItemId(
          "33333333-3333-4333-8333-333333333333",
        ),
      }),
    ).resolves.toMatchObject({ resolution: "VERIFIED" });
    expect(functions.invoke).toHaveBeenCalledWith("resolve-place", {
      body: { itineraryItemId: "33333333-3333-4333-8333-333333333333" },
      signal: expect.any(AbortSignal),
    });
  });
});
