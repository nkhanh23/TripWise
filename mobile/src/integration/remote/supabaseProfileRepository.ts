import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase/client";
import type { Database } from "../../lib/supabase/database.types";
import type { Profile, ProfileUpdate, UserId } from "../contracts";
import { IntegrationError, mapPostgrestError } from "../errors";
import { mapProfile } from "../mappers";
import type { ProfileRepository } from "../repositories";
import {
  executeWithReliability,
  supabaseMutationPolicy,
  supabaseReadPolicy,
} from "../reliability";
import { parseProfileTransport } from "../validation";

const profileColumns =
  "id,display_name,avatar_url,home_country,created_at,updated_at";

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async getOwnProfile(
    userId: UserId,
    signal?: AbortSignal,
  ): Promise<Profile | null> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .from("profiles")
          .select(profileColumns)
          .eq("id", userId)
          .abortSignal(attemptSignal)
          .maybeSingle();
        if (error) throw mapPostgrestError(error);
        return data ? mapProfile(parseProfileTransport(data)) : null;
      },
      supabaseReadPolicy,
      signal,
    );
  }

  async updateOwnProfile(
    userId: UserId,
    update: ProfileUpdate,
    signal?: AbortSignal,
  ): Promise<Profile> {
    const displayName = normalizeNullable(update.displayName, 160);
    const avatarUrl = normalizeNullable(update.avatarUrl, 2_048);
    const homeCountry = update.homeCountry?.trim();
    if (
      displayName === undefined &&
      avatarUrl === undefined &&
      homeCountry === undefined
    )
      throw new IntegrationError("invalidRequest");
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await this.client
          .from("profiles")
          .update({
            ...(displayName === undefined ? {} : { display_name: displayName }),
            ...(avatarUrl === undefined ? {} : { avatar_url: avatarUrl }),
            ...(homeCountry === undefined ? {} : { home_country: homeCountry }),
          })
          .eq("id", userId)
          .select(profileColumns)
          .abortSignal(attemptSignal)
          .single();
        if (error) throw mapPostgrestError(error);
        return mapProfile(parseProfileTransport(data));
      },
      supabaseMutationPolicy,
      signal,
    );
  }
}

function normalizeNullable(
  value: string | null | undefined,
  maximumLength: number,
): string | null | undefined {
  if (value === undefined || value === null) return value;
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > maximumLength)
    throw new IntegrationError("invalidRequest");
  return trimmed;
}
