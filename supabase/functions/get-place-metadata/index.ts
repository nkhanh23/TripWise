import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { PlaceMetadataError } from './errors.ts';
import { handleGetPlaceMetadata } from './handler.ts';
import { fetchPlaceMetadataFromGoogle } from './metadata.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function adminHeaders(): HeadersInit {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new PlaceMetadataError('PLACE_PROVIDER_UNAVAILABLE', 'Server persistence is not configured.', 503);
  }
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    'content-type': 'application/json',
  };
}

Deno.serve((request) =>
  handleGetPlaceMetadata(request, {
    authenticate: async (incoming) => {
      const { data, error } = await createSupabaseContext(incoming, { auth: 'user' });
      const subject = data?.userClaims?.id;
      return !error && typeof subject === 'string' ? subject : null;
    },
    verifyOwnership: async (ownerId, googlePlaceId) => {
      // Check itinerary_items
      const itemQuery = new URLSearchParams({
        select: 'id',
        google_place_id: `eq.${googlePlaceId}`,
        'itinerary_days.trips.user_id': `eq.${ownerId}`,
        place_resolved_at: 'not.is.null',
      });
      const itemResponse = await fetch(`${supabaseUrl}/rest/v1/itinerary_items?${itemQuery}`, {
        headers: adminHeaders(),
      });
      if (itemResponse.ok) {
        const itemData = await itemResponse.json().catch(() => null);
        if (Array.isArray(itemData) && itemData.length > 0) return true;
      }

      // Check saved_places
      const savedQuery = new URLSearchParams({
        select: 'id',
        google_place_id: `eq.${googlePlaceId}`,
        user_id: `eq.${ownerId}`,
      });
      const savedResponse = await fetch(`${supabaseUrl}/rest/v1/saved_places?${savedQuery}`, {
        headers: adminHeaders(),
      });
      if (savedResponse.ok) {
        const savedData = await savedResponse.json().catch(() => null);
        if (Array.isArray(savedData) && savedData.length > 0) return true;
      }

      return false;
    },
    fetchMetadata: fetchPlaceMetadataFromGoogle,
  })
);
