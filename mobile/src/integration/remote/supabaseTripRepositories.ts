import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "../../lib/supabase/database.types";
import type {
  GenerateTripRequest,
  GeneratedTrip,
  ItineraryItemId,
  PersistTripCommand,
  ProfileStatistics,
  SavedTripDetail,
  SavedTripsPage,
  SavedTripsPageRequest,
  TripId,
} from "../contracts";
import {
  IntegrationError,
  mapGenerateTripError,
  mapPersistenceError,
  mapPostgrestError,
  readFunctionErrorPayload,
} from "../errors";
import type {
  SavedTripsRepository,
  TripGenerationRepository,
  TripPersistenceRepository,
} from "../repositories";
import {
  executeWithReliability,
  idempotentPersistencePolicy,
  supabaseMutationPolicy,
  supabaseReadPolicy,
  tripGenerationPolicy,
} from "../reliability";
import {
  asTripId,
  parseGenerateTripSuccess,
  parseProfileStatistics,
  parseSavedTripDetail,
  parseSavedTripsPage,
  validateGenerateTripRequest,
  validatePersistTripCommand,
  validateSavedTripsPageRequest,
} from "../validation";

export class SupabaseTripGenerationRepository implements TripGenerationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async generate(
    request: GenerateTripRequest,
    signal?: AbortSignal,
  ): Promise<GeneratedTrip> {
    const body = validateGenerateTripRequest(request);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client.functions.invoke(
          "generate-trip",
          { body, signal: attemptSignal },
        );
        if (error)
          throw mapGenerateTripError(await readFunctionErrorPayload(error));
        return parseGenerateTripSuccess(data).data;
      },
      tripGenerationPolicy,
      signal,
    );
  }
}

export class SupabaseTripPersistenceRepository implements TripPersistenceRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async persist(
    command: PersistTripCommand,
    signal?: AbortSignal,
  ): Promise<TripId> {
    const stableCommand = validatePersistTripCommand(command);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("create_trip_graph", {
            p_idempotency_key: stableCommand.idempotencyKey,
            p_graph: stableCommand.graph as unknown as Json,
          })
          .abortSignal(attemptSignal);
        if (error) throw mapPersistenceError(error);
        return asTripId(data);
      },
      idempotentPersistencePolicy,
      signal,
    );
  }
}

export class SupabaseSavedTripsRepository implements SavedTripsRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async list(
    request: SavedTripsPageRequest = {},
    signal?: AbortSignal,
  ): Promise<SavedTripsPage> {
    const normalized = validateSavedTripsPageRequest(request);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("list_saved_trips", {
            p_limit: normalized.limit,
            p_cursor_created_at: normalized.cursor?.createdAt,
            p_cursor_id: normalized.cursor?.id,
          })
          .abortSignal(attemptSignal);
        if (error) throw mapPostgrestError(error);
        return parseSavedTripsPage(data);
      },
      supabaseReadPolicy,
      signal,
    );
  }

  async getDetail(
    tripId: TripId,
    signal?: AbortSignal,
  ): Promise<SavedTripDetail | null> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("get_saved_trip_detail", { p_trip_id: tripId })
          .abortSignal(attemptSignal);
        if (error) throw mapPostgrestError(error);
        return parseSavedTripDetail(data);
      },
      supabaseReadPolicy,
      signal,
    );
  }

  async updateItemNote(
    itemId: ItineraryItemId,
    note: string | null,
    signal?: AbortSignal,
  ): Promise<boolean> {
    const normalized = note === null ? null : note.trim();
    if (normalized !== null && normalized.length > 500)
      throw new IntegrationError("invalidRequest");
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("update_itinerary_item_note", {
            p_item_id: itemId,
            p_note: (normalized === ""
              ? null
              : normalized) as unknown as string,
          })
          .abortSignal(attemptSignal);
        if (error) throw mapPostgrestError(error);
        return data;
      },
      supabaseMutationPolicy,
      signal,
    );
  }

  async getStats(signal?: AbortSignal): Promise<ProfileStatistics> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("get_user_trip_stats")
          .abortSignal(attemptSignal);
        if (error) throw mapPostgrestError(error);
        return parseProfileStatistics(data);
      },
      supabaseReadPolicy,
      signal,
    );
  }

  async deleteTrip(tripId: TripId, signal?: AbortSignal): Promise<boolean> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("delete_saved_trip", { p_trip_id: tripId })
          .abortSignal(attemptSignal);
        if (error) throw mapPostgrestError(error);
        return data;
      },
      supabaseMutationPolicy,
      signal,
    );
  }
}
