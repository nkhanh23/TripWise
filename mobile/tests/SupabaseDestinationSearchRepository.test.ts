const invoke = jest.fn();
jest.mock('../src/lib/supabase/client', () => ({ supabase: { functions: { invoke } } }));
import { IntegrationError } from '../src/integration/errors';
import { SupabaseDestinationSearchRepository } from '../src/integration/remote/SupabaseDestinationSearchRepository';

const item = { googlePlaceId: 'id', name: 'Tokyo', formattedAddress: 'Japan', latitude: 35.6, longitude: 139.7 };
const functionError = (code: string) => ({ name: 'FunctionsHttpError', context: { clone: () => ({ json: async () => ({ error: { code } }) }) } });
describe('SupabaseDestinationSearchRepository', () => {
  beforeEach(() => invoke.mockReset());
  it('maps a valid bounded response', async () => { invoke.mockResolvedValue({ data: { data: [item] }, error: null }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).resolves.toEqual([{ id: 'id', name: 'Tokyo', formattedAddress: 'Japan', latitude: 35.6, longitude: 139.7, imageUrl: '' }]); });
  it.each([{ data: {} }, { data: { data: [{ ...item, name: '' }] } }, { data: { data: Array.from({ length: 11 }, () => item) } }])('rejects malformed success %#', async (value) => { invoke.mockResolvedValue({ ...value, error: null }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).rejects.toMatchObject({ code: 'invalidResponse' }); });
  it.each([['INVALID_REQUEST','invalidRequest'],['UNAUTHORIZED','unauthorized'],['PLACE_PROVIDER_RATE_LIMITED','rateLimited'],['PLACE_PROVIDER_AUTH','providerUnavailable'],['PLACE_PROVIDER_UNAVAILABLE','providerUnavailable'],['INTERNAL_ERROR','unknown']])('maps %s safely', async (edge, code) => { invoke.mockResolvedValue({ data: null, error: functionError(edge) }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).rejects.toMatchObject({ code }); });
  it('preserves abort errors', async () => { const error = Object.assign(new Error('aborted'), { name: 'AbortError' }); invoke.mockResolvedValue({ data: null, error }); await expect(new SupabaseDestinationSearchRepository().search('Tokyo')).rejects.toBe(error); });
});