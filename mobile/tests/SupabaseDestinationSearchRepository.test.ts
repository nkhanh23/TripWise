jest.mock('../src/lib/supabase/client', () => ({ supabase: { functions: { invoke: jest.fn() } } }));
import { supabase } from '../src/lib/supabase/client';
import { IntegrationError } from '../src/integration/errors';
import { SupabaseDestinationSearchRepository } from '../src/integration/remote/SupabaseDestinationSearchRepository';

const mockInvoke = supabase.functions.invoke as jest.Mock;
const item = { googlePlaceId: 'id', name: 'Tokyo', formattedAddress: 'Japan', destinationType: 'CITY', latitude: 35.6, longitude: 139.7 };
const functionError = (code: string) => ({ name: 'FunctionsHttpError', context: { clone: () => ({ json: async () => ({ error: { code } }) }) } });
describe('SupabaseDestinationSearchRepository', () => {
  beforeEach(() => mockInvoke.mockReset());
  it('maps a valid bounded response', async () => { mockInvoke.mockResolvedValue({ data: { data: [item] }, error: null }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).resolves.toEqual([{ id: 'id', name: 'Tokyo', formattedAddress: 'Japan', destinationType: 'CITY', latitude: 35.6, longitude: 139.7, imageUrl: '' }]); });
  it('preserves autocomplete result without coordinates', async () => { mockInvoke.mockResolvedValue({ data: { data: [{ googlePlaceId: 'country', name: 'Vietnam', formattedAddress: 'Vietnam', destinationType: 'COUNTRY' }] }, error: null }); await expect(new SupabaseDestinationSearchRepository().search('viet')).resolves.toEqual([{ id: 'country', name: 'Vietnam', formattedAddress: 'Vietnam', destinationType: 'COUNTRY', imageUrl: '' }]); });
  it.each([{ data: {} }, { data: { data: [{ ...item, name: '' }] } }, { data: { data: Array.from({ length: 7 }, () => item) } }])('rejects malformed success %#', async (value) => { mockInvoke.mockResolvedValue({ ...value, error: null }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).rejects.toMatchObject({ code: 'invalidResponse' }); });
  it('preserves autocomplete result without coordinates', async () => { mockInvoke.mockResolvedValue({ data: { data: [{ googlePlaceId: 'country', name: 'Vietnam', formattedAddress: 'Vietnam', destinationType: 'COUNTRY' }] }, error: null }); await expect(new SupabaseDestinationSearchRepository().search('viet')).resolves.toEqual([{ id: 'country', name: 'Vietnam', formattedAddress: 'Vietnam', destinationType: 'COUNTRY', imageUrl: '' }]); });
  it.each([['INVALID_REQUEST','invalidRequest'],['UNAUTHORIZED','unauthorized'],['PLACE_PROVIDER_RATE_LIMITED','rateLimited'],['PLACE_PROVIDER_AUTH','providerUnavailable'],['PLACE_PROVIDER_UNAVAILABLE','providerUnavailable'],['INTERNAL_ERROR','unknown']])('maps %s safely', async (edge, code) => { mockInvoke.mockResolvedValue({ data: null, error: functionError(edge) }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).rejects.toMatchObject({ code }); });
  it('preserves abort errors', async () => { const error = Object.assign(new Error('aborted'), { name: 'AbortError' }); mockInvoke.mockResolvedValue({ data: null, error }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).rejects.toBe(error); });
});