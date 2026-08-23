import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { ResolvePlaceError } from './errors.ts';
import { handleResolvePlace } from './handler.ts';
import { resolveWithGooglePlaces } from './places.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function adminHeaders(): HeadersInit {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new ResolvePlaceError('PLACE_PERSISTENCE_FAILED', 'Server persistence is not configured.', 503);
  }
  return { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}`, 'content-type': 'application/json' };
}

function readContext(value: unknown, itemId: string) {
  if (!Array.isArray(value) || value.length !== 1) return null;
  const item = value[0] as Record<string, unknown>;
  const day = item.itinerary_days as Record<string, unknown> | null;
  const trip = day?.trips as Record<string, unknown> | null;
  if (typeof item.id !== 'string' || typeof item.place_name !== 'string' || typeof trip?.destination !== 'string') return null;
  return {
    itemId,
    placeName: item.place_name,
    placeQuery: typeof item.place_query === 'string' ? item.place_query : undefined,
    destination: trip.destination,
    wasResolved: typeof item.place_resolved_at === 'string',
  };
}

Deno.serve((request) => handleResolvePlace(request, {
  authenticate: async (incoming) => {
    const { data, error } = await createSupabaseContext(incoming, { auth: 'user' });
    const subject = data?.userClaims?.id;
    return !error && typeof subject === 'string' ? subject : null;
  },
  loadContext: async (ownerId, itemId) => {
    const query = new URLSearchParams({ select: 'id,place_name,place_query,place_resolved_at,itinerary_days!inner(trips!inner(user_id,destination))', id: `eq.${itemId}`, 'itinerary_days.trips.user_id': `eq.${ownerId}` });
    const response = await fetch(`${supabaseUrl}/rest/v1/itinerary_items?${query}`, { headers: adminHeaders() });
    if (!response.ok) throw new ResolvePlaceError('PLACE_PERSISTENCE_FAILED', 'Itinerary item could not be loaded.', 500);
    return readContext(await response.json(), itemId);
  },
  resolve: resolveWithGooglePlaces,
  persist: async (ownerId, itemId, snapshot) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/apply_verified_place_snapshot`, {
      method: 'POST', headers: adminHeaders(), body: JSON.stringify({
      p_owner_id: ownerId, p_item_id: itemId, p_google_place_id: snapshot.googlePlaceId, p_place_name: snapshot.placeName,
      p_latitude: snapshot.latitude, p_longitude: snapshot.longitude, p_place_address: snapshot.placeAddress ?? null, p_place_category: snapshot.placeCategory ?? null,
    }) });
    const data = await response.json().catch(() => null);
    if (!response.ok || typeof data !== 'string') throw new ResolvePlaceError('PLACE_PERSISTENCE_FAILED', 'Verified place snapshot could not be saved.', 500);
    return data;
  },
}));
