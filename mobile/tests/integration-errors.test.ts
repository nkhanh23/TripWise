import {
  mapGenerateTripError, mapPersistenceError, mapResolvePlaceError,
} from '../src/integration/errors';

describe('integration error mapping', () => {
  it.each([
    ['INVALID_REQUEST', 'invalidRequest'], ['UNAUTHORIZED', 'unauthorized'], ['AI_TIMEOUT', 'timeout'],
    ['AI_UNAVAILABLE', 'providerUnavailable'], ['AI_INVALID_RESPONSE', 'invalidResponse'], ['INTERNAL_ERROR', 'unknown'],
  ])('maps generate-trip %s', (remote, local) => {
    expect(mapGenerateTripError({ error: { code: remote } }).code).toBe(local);
  });

  it.each([
    ['TW001', 'invalidRequest'], ['TW002', 'unauthorized'], ['TW003', 'forbidden'],
    ['TW004', 'conflict'], ['TW005', 'persistenceFailed'],
  ])('maps persistence %s', (remote, local) => {
    expect(mapPersistenceError({ code: remote }).code).toBe(local);
  });

  it.each([
    ['PLACE_INPUT_INVALID', 'invalidRequest'], ['PLACE_NOT_FOUND', 'notFound'],
    ['PLACE_AMBIGUOUS', 'ambiguousPlace'], ['PLACE_PROVIDER_AUTH', 'forbidden'],
    ['PLACE_PROVIDER_RATE_LIMITED', 'rateLimited'], ['PLACE_PROVIDER_UNAVAILABLE', 'providerUnavailable'],
    ['PLACE_PERSISTENCE_FAILED', 'persistenceFailed'], ['UNAUTHORIZED', 'unauthorized'], ['INTERNAL_ERROR', 'unknown'],
  ])('maps resolve-place %s', (remote, local) => {
    expect(mapResolvePlaceError({ error: { code: remote } }).code).toBe(local);
  });

  it('uses a safe unknown fallback without reflecting remote internals', () => {
    const error = mapGenerateTripError({ error: { code: 'NEW_CODE', message: 'SQL and token details' } });
    expect(error).toMatchObject({ code: 'unknown', message: 'The operation failed.' });
    expect(error.message).not.toContain('SQL');
  });
});
