import { createSupabaseContext } from 'npm:@supabase/server@1.4.1';
import { WikimediaImageError } from './errors.ts';
import { handleGetWikimediaImage } from './handler.ts';
import type { TrustedPlaceContext } from './types.ts';
import {
  fetchDestinationCoverFromWikimedia,
  fetchExactPlaceImageFromWikimedia,
} from './wikimedia.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function adminHeaders(): HeadersInit {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new WikimediaImageError('WIKIMEDIA_UNAVAILABLE', 'Server persistence is unavailable.', 503);
  }
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    'content-type': 'application/json',
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return record(value[0]);
  return record(value);
}

function trustedContext(row: Record<string, unknown>, destination?: string): TrustedPlaceContext | null {
  if (typeof row.place_name !== 'string'
    || typeof row.latitude !== 'number'
    || typeof row.longitude !== 'number') return null;
  return {
    placeName: row.place_name,
    latitude: row.latitude,
    longitude: row.longitude,
    ...(typeof row.place_query === 'string' ? { placeQuery: row.place_query } : {}),
    ...(typeof row.place_address === 'string' ? { placeAddress: row.place_address } : {}),
    ...(destination ? { destination } : {}),
  };
}

async function loadOwnedPlace(ownerId: string, googlePlaceId: string): Promise<TrustedPlaceContext | null> {
  const itemQuery = new URLSearchParams({
    select: 'place_name,place_query,place_address,latitude,longitude,itinerary_days!inner(trips!inner(user_id,destination))',
    google_place_id: `eq.${googlePlaceId}`,
    'itinerary_days.trips.user_id': `eq.${ownerId}`,
    place_resolved_at: 'not.is.null',
    limit: '1',
  });
  const itemResponse = await fetch(`${supabaseUrl}/rest/v1/itinerary_items?${itemQuery}`, { headers: adminHeaders() });
  if (itemResponse.ok) {
    const rows = await itemResponse.json().catch(() => null);
    const row = Array.isArray(rows) ? record(rows[0]) : null;
    const day = firstRecord(row?.itinerary_days);
    const trip = firstRecord(day?.trips);
    const context = row ? trustedContext(row, typeof trip?.destination === 'string' ? trip.destination : undefined) : null;
    if (context) return context;
  }

  const savedQuery = new URLSearchParams({
    select: 'place_name,place_address,latitude,longitude',
    google_place_id: `eq.${googlePlaceId}`,
    user_id: `eq.${ownerId}`,
    limit: '1',
  });
  const savedResponse = await fetch(`${supabaseUrl}/rest/v1/saved_places?${savedQuery}`, { headers: adminHeaders() });
  if (!savedResponse.ok) return null;
  const savedRows = await savedResponse.json().catch(() => null);
  const savedRow = Array.isArray(savedRows) ? record(savedRows[0]) : null;
  return savedRow ? trustedContext(savedRow) : null;
}

Deno.serve((request) => handleGetWikimediaImage(request, {
  authenticate: async (incoming) => {
    const { data, error } = await createSupabaseContext(incoming, { auth: 'user' });
    const subject = data?.userClaims?.id;
    return !error && typeof subject === 'string' ? subject : null;
  },
  loadOwnedPlace,
  fetchPlaceImage: fetchExactPlaceImageFromWikimedia,
  fetchDestinationCover: fetchDestinationCoverFromWikimedia,
}));
