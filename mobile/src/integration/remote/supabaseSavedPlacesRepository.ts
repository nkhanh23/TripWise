import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../lib/supabase/database.types";
import type {
  SavePlaceCommand,
  SavedPlace,
  SavedPlacesPage,
} from "../contracts";
import { mapPostgrestError } from "../errors";
import { mapSavedPlace } from "../mappers";
import type { SavedPlacesRepository } from "../repositories";
import {
  executeWithReliability,
  supabaseMutationPolicy,
  supabaseReadPolicy,
} from "../reliability";
import {
  parseSavedPlaceTransport,
  parseSavedPlacesPage,
  validateSavePlaceCommand,
} from "../validation";

export class SupabaseSavedPlacesRepository implements SavedPlacesRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listSavedPlaces(
    params?: {
      limit?: number;
      cursor?: { createdAt: string; id: string } | null;
      category?: string | null;
    },
    signal?: AbortSignal,
  ): Promise<SavedPlacesPage> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("list_saved_places", {
            p_limit: params?.limit ?? 20,
            p_cursor_created_at: params?.cursor?.createdAt,
            p_cursor_id: params?.cursor?.id,
            p_category: params?.category ?? undefined,
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        const parsed = parseSavedPlacesPage(data);
        return {
          items: parsed.items.map(mapSavedPlace),
          nextCursor: parsed.nextCursor,
        };
      },
      supabaseReadPolicy,
      signal,
    );
  }

  async savePlace(
    command: SavePlaceCommand,
    signal?: AbortSignal,
  ): Promise<SavedPlace> {
    const validated = validateSavePlaceCommand(command);
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("save_place", {
            p_google_place_id: validated.googlePlaceId,
            p_place_name: validated.name,
            p_latitude: validated.latitude,
            p_longitude: validated.longitude,
            p_place_address: validated.address ?? undefined,
            p_place_category: validated.category ?? undefined,
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        const parsed = parseSavedPlaceTransport(data);
        return mapSavedPlace(parsed);
      },
      supabaseMutationPolicy,
      signal,
    );
  }

  async unsavePlace(
    googlePlaceId: string,
    signal?: AbortSignal,
  ): Promise<boolean> {
    if (!googlePlaceId || typeof googlePlaceId !== "string") return false;
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .rpc("unsave_place", {
            p_google_place_id: googlePlaceId.trim(),
          })
          .abortSignal(attemptSignal);

        if (error) throw mapPostgrestError(error);
        return Boolean(data);
      },
      supabaseMutationPolicy,
      signal,
    );
  }
}
