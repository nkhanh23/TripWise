import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { discoverGooglePlaces } from './googlePlaces.ts';
import { handleExplorePlaces } from './handler.ts';

Deno.serve((request) => handleExplorePlaces(request, {
  authenticate: async (incoming) => {
    const { data, error } = await createSupabaseContext(incoming, { auth: 'user' });
    return !error && typeof data?.userClaims?.id === 'string' ? data.userClaims.id : null;
  },
  discover: discoverGooglePlaces,
}));
