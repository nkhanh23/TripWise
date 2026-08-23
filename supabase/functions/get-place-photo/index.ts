import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { PlacePhotoError } from './errors.ts';
import { handleGetPlacePhoto } from './handler.ts';
import { fetchPlacePhotoFromGoogle } from './photos.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function adminHeaders(): HeadersInit {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new PlacePhotoError('PHOTO_PROVIDER_UNAVAILABLE', 'Server persistence is not configured.', 503);
  }
  return {
    apikey: serviceRoleKey,
    authorization: \Bearer \\,
    'content-type': 'application/json',
  };
}

Deno.serve((request) =>
  handleGetPlacePhoto(request, {
    authenticate: async (incoming) => {
      const { data, error } = await createSupabaseContext(incoming, { auth: 'user' });
      const subject = data?.userClaims?.id;
      return !error && typeof subject === 'string' ? subject : null;
    },
    verifyOwnership: async (ownerId, googlePlaceId) => {
      const itemQuery = new URLSearchParams({
        select: 'id',
        google_place_id: \eq.\\,
        'itinerary_days.trips.user_id': \eq.\\,
        place_resolved_at: 'not.is.null',
      });
      const itemResponse = await fetch(\\/rest/v1/itinerary_items?\\, {
        headers: adminHeaders(),
      });
      if (itemResponse.ok) {
        const itemData = await itemResponse.json().catch(() => null);
        if (Array.isArray(itemData) && itemData.length > 0) return true;
      }

      const savedQuery = new URLSearchParams({
        select: 'id',
        google_place_id: \eq.\\,
        user_id: \eq.\\,
      });
      const savedResponse = await fetch(\\/rest/v1/saved_places?\\, {
        headers: adminHeaders(),
      });
      if (savedResponse.ok) {
        const savedData = await savedResponse.json().catch(() => null);
        if (Array.isArray(savedData) && savedData.length > 0) return true;
      }

      return false;
    },
    fetchPhoto: fetchPlacePhotoFromGoogle,
  })
);
