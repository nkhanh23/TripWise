import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { handleSearchDestinations } from './handler.ts';
import { searchGooglePlaces } from './places.ts';

Deno.serve((request: Request) => handleSearchDestinations(request, {
  authenticate: async (incomingRequest) => {
    const { data, error } = await createSupabaseContext(incomingRequest, { auth: 'user' });
    return !error && typeof data?.userClaims?.id === 'string';
  },
  search: (query, signal) => searchGooglePlaces(query, fetch, { signal }),
}));

