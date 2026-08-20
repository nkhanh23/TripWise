import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';

import { generateTripWithGemini } from './gemini.ts';
import { handleGenerateTrip } from './handler.ts';

Deno.serve((request: Request) => handleGenerateTrip(request, {
  authenticate: async (incomingRequest) => {
    const { data, error } = await createSupabaseContext(incomingRequest, { auth: 'user' });
    return !error && Boolean(data?.userClaims);
  },
  generate: generateTripWithGemini,
}));
