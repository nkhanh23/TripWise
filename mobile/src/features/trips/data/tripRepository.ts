import { supabase } from "../../../lib/supabase/client";
import type { Database } from "../../../lib/supabase/database.types";

/**
 * @deprecated INT-P4 production paths use SupabaseSavedTripsRepository and
 * keyset RPCs. Retained only for legacy fixtures/tests until INT-P8 cleanup.
 */

export type TripSummary = Pick<
  Database["public"]["Tables"]["trips"]["Row"],
  | "id"
  | "title"
  | "destination"
  | "start_date"
  | "end_date"
  | "estimated_budget"
  | "currency"
  | "created_at"
  | "updated_at"
>;

const tripListColumns =
  "id,title,destination,start_date,end_date,estimated_budget,currency,created_at,updated_at" as const;

export async function listTrips(
  page = 0,
  pageSize = 20,
): Promise<TripSummary[]> {
  if (
    !Number.isInteger(page) ||
    page < 0 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    throw new RangeError(
      "Trip pagination must use a non-negative page and a page size from 1 to 100.",
    );
  }

  const from = page * pageSize;
  const { data, error } = await supabase
    .from("trips")
    .select(tripListColumns)
    .order("start_date", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    throw error;
  }

  return data;
}

export async function getTripById(id: string): Promise<TripSummary | null> {
  const { data, error } = await supabase
    .from("trips")
    .select(tripListColumns)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
