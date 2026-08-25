/** @jest-environment node */

jest.mock("../src/lib/supabase/client", () => ({ supabase: {} }));

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../src/lib/supabase/database.types";
import {
  mapGeneratedTripToPlannerPreview,
  mapWizardStateToGenerateTripRequest,
} from "../src/features/planner/generation";
import { SupabaseTripGenerationRepository } from "../src/integration/remote/supabaseTripRepositories";

const runLive = process.env.RUN_INT_P3_LIVE_SMOKE === "true";
const liveTest = runLive ? test : test.skip;

liveTest(
  "authenticated generate-trip validates, maps, and makes zero trip writes",
  async () => {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !publishableKey || !serviceRoleKey)
      throw new Error("Live smoke configuration is missing.");

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const email = `tripwise-int-p3-${suffix}@gmail.com`;
    const password = `Tw!${suffix}A1`;
    const admin = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const client = createClient<Database>(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let userId: string | null = null;

    try {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { display_name: "INT P3 smoke" },
        });
      if (createError || !created.user)
        throw createError ?? new Error("Disposable user was not created.");
      userId = created.user.id;

      const { error: signInError } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      const { count: beforeCount, error: beforeError } = await client
        .from("trips")
        .select("id", { count: "exact", head: true });
      if (beforeError) throw beforeError;

      const repository = new SupabaseTripGenerationRepository(client);
      const generated = await repository.generate(
        mapWizardStateToGenerateTripRequest({
          destination: {
            id: "smoke-bangkok",
            name: "Bangkok",
            country: "Thailand",
            imageUrl: "",
          },
          customDestinationName: "Bangkok",
          startDate: "2026-09-10",
          endDate: "2026-09-11",
          durationDays: 2,
          selectedStyles: ["culture", "food"],
          pace: "moderate",
          budget: "moderate",
          groupType: "couple",
          tripTitle: "Smoke title",
        }),
      );
      const preview = mapGeneratedTripToPlannerPreview(generated);
      expect(preview.days).toHaveLength(2);
      expect(
        preview.days.every(
          (day, dayIndex) =>
            day.dayNumber === dayIndex + 1 &&
            day.items.every(
              (item, itemIndex) =>
                item.position === itemIndex + 1 &&
                item.resolution === "UNRESOLVED",
            ),
        ),
      ).toBe(true);

      const { count: afterCount, error: afterError } = await client
        .from("trips")
        .select("id", { count: "exact", head: true });
      if (afterError) throw afterError;
      expect(afterCount).toBe(beforeCount);
    } finally {
      if (userId) await admin.auth.admin.deleteUser(userId);
    }
  },
  60_000,
);
