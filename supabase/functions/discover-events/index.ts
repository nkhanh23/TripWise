import { createSupabaseContext } from "npm:@supabase/server@1.4.1";
import { handleRequest, searchEvents } from "./events.ts";

Deno.serve((request) =>
  handleRequest(request, {
    authenticate: async (incoming) => {
      const { data, error } = await createSupabaseContext(incoming, {
        auth: "user",
      });
      return !error && typeof data?.userClaims?.id === "string"
        ? data.userClaims.id
        : null;
    },
    search: (query, signal) =>
      searchEvents(query, fetch, {
        apiKey: Deno.env.get("TICKETMASTER_API_KEY"),
        signal,
      }),
  })
);
