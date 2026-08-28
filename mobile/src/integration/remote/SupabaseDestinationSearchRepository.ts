import { supabase } from '../../lib/supabase/client';
import type { DestinationOption } from '../../features/planner/types';
import { IntegrationError, readFunctionErrorPayload } from '../errors';
import type { DestinationSearchRepository } from '../repositories/DestinationSearchRepository';

type RemoteDestination = {
  googlePlaceId: string;
  name: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDestination(value: unknown): RemoteDestination | null {
  if (!isRecord(value)
    || typeof value.googlePlaceId !== 'string' || !value.googlePlaceId.trim()
    || typeof value.name !== 'string' || !value.name.trim()
    || typeof value.formattedAddress !== 'string'
    || typeof value.latitude !== 'number' || !Number.isFinite(value.latitude) || value.latitude < -90 || value.latitude > 90
    || typeof value.longitude !== 'number' || !Number.isFinite(value.longitude) || value.longitude < -180 || value.longitude > 180) {
    return null;
  }
  return {
    googlePlaceId: value.googlePlaceId.trim(),
    name: value.name.trim(),
    formattedAddress: value.formattedAddress.trim(),
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function parseSearchResponse(value: unknown): RemoteDestination[] {
  if (!isRecord(value) || !Array.isArray(value.data) || value.data.length > 10) {
    throw new IntegrationError('invalidResponse');
  }
  const destinations = value.data.map(parseDestination);
  if (destinations.some((destination) => destination === null)) {
    throw new IntegrationError('invalidResponse');
  }
  return destinations as RemoteDestination[];
}

export class SupabaseDestinationSearchRepository implements DestinationSearchRepository {
  async search(query: string, signal?: AbortSignal): Promise<DestinationOption[]> {
    const { data, error } = await supabase.functions.invoke('search-destinations', {
      body: { query },
      signal,
    });
    if (error) {
      if (error.name === 'AbortError') throw error;
      const payload = await readFunctionErrorPayload(error);
      const code = typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error?: { code?: unknown } }).error?.code === 'string' ? (payload as { error: { code: string } }).error.code : '';
      if (code === 'INVALID_REQUEST') throw new IntegrationError('invalidRequest');
      if (code === 'UNAUTHORIZED') throw new IntegrationError('unauthorized');
      if (code === 'PLACE_PROVIDER_RATE_LIMITED') throw new IntegrationError('rateLimited', true);
      if (code === 'INTERNAL_ERROR') throw new IntegrationError('unknown');
      throw new IntegrationError('providerUnavailable', true);
    }
    return parseSearchResponse(data).map((item) => ({
      id: item.googlePlaceId,
      name: item.name,
      formattedAddress: item.formattedAddress,
      latitude: item.latitude,
      longitude: item.longitude,
      imageUrl: '',
    }));
  }
}