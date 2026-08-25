import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase/client";
import type { Database } from "../../lib/supabase/database.types";
import type { AuthenticatedSession } from "../contracts";
import { IntegrationError, mapAuthError } from "../errors";
import { mapAuthenticatedSession } from "../mappers";
import {
  authOperationPolicy,
  executeWithReliability,
  raceWithAbort,
} from "../reliability";
import type { AuthRepository, SignUpResult } from "../repositories";

export class SupabaseAuthRepository implements AuthRepository {
  constructor(private readonly client: SupabaseClient<Database> = supabase) {}

  async restoreSession(
    signal?: AbortSignal,
  ): Promise<AuthenticatedSession | null> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await raceWithAbort(
          this.client.auth.getSession(),
          attemptSignal,
        );
        if (error) throw mapAuthError(error);
        return data.session ? mapAuthenticatedSession(data.session) : null;
      },
      authOperationPolicy,
      signal,
    );
  }

  async signIn(
    email: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<AuthenticatedSession> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await raceWithAbort(
          this.client.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          }),
          attemptSignal,
        );
        if (error) throw mapAuthError(error);
        if (!data.session) throw new IntegrationError("unauthorized");
        return mapAuthenticatedSession(data.session);
      },
      authOperationPolicy,
      signal,
    );
  }

  async signUp(
    displayName: string,
    email: string,
    password: string,
    signal?: AbortSignal,
  ): Promise<SignUpResult> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { data, error } = await raceWithAbort(
          this.client.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: { data: { display_name: displayName.trim() } },
          }),
          attemptSignal,
        );
        if (error) throw mapAuthError(error);
        return {
          session: data.session ? mapAuthenticatedSession(data.session) : null,
          confirmationRequired: data.session === null,
        };
      },
      authOperationPolicy,
      signal,
    );
  }

  async resetPassword(email: string, signal?: AbortSignal): Promise<void> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { error } = await raceWithAbort(
          this.client.auth.resetPasswordForEmail(email.trim().toLowerCase()),
          attemptSignal,
        );
        if (error) throw mapAuthError(error);
      },
      authOperationPolicy,
      signal,
    );
  }

  async deleteAccount(signal?: AbortSignal): Promise<void> {
    const { error } = await this.client
      .rpc("delete_user_account" as any)
      .abortSignal(signal ?? new AbortController().signal);
    if (error) throw mapAuthError(error);
    await this.signOut(signal);
  }

  async signOut(signal?: AbortSignal): Promise<void> {
    return executeWithReliability(
      async (attemptSignal) => {
        const { error } = await raceWithAbort(
          this.client.auth.signOut(),
          attemptSignal,
        );
        if (error) throw mapAuthError(error);
      },
      authOperationPolicy,
      signal,
    );
  }

  subscribe(
    listener: (session: AuthenticatedSession | null) => void,
  ): () => void {
    const subscription = this.client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) =>
        listener(session ? mapAuthenticatedSession(session) : null),
    ).data.subscription;
    return () => subscription.unsubscribe();
  }
}
