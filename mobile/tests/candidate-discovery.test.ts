import { mapCandidateRankingInput, validateCandidateDiscoveryRequest, validateDiscoveryCandidate, validateDiscoveryCandidates } from '../src/integration/candidateDiscoveryContract';
import { CandidateDiscoverySession } from '../src/integration/candidateDiscoverySession';
import { SupabaseCandidateDiscoveryRepository } from '../src/integration/remote/supabaseCandidateDiscoveryRepository';

const request = { center: { latitude: 13.76, longitude: 100.52 }, radiusMeters: 500, category: 'all' as const, limit: 12 };
const raw = { googlePlaceId: 'ChIJfixture12345', name: 'Test provider place', latitude: 13.76, longitude: 100.52, category: 'attractions', categoryLabel: 'Attraction' };
const candidate = {
  kind: 'google-place-candidate', status: 'DISCOVERED', review: 'REVIEW_REQUIRED', googlePlaceId: raw.googlePlaceId,
  name: raw.name, coordinate: request.center, category: raw.category,
  provenance: { provider: 'google-places', boundary: 'explore-places', observation: 'CLIENT_RECEIVED', receivedAt: '2026-09-09T00:00:00.000Z' },
};
const context = { origin: request.center, preferredCategories: ['coffee', 'attractions'] };

function setup() {
  let authChanged: (event: string) => void = () => undefined;
  const invoke = jest.fn().mockResolvedValue({ data: { data: { places: [raw] } }, error: null });
  const unsubscribe = jest.fn();
  const mutation = jest.fn(() => { throw new Error('Persistence forbidden'); });
  const client = { functions: { invoke }, from: mutation, rpc: mutation, storage: mutation, auth: {
    onAuthStateChange: jest.fn((callback) => { authChanged = callback; return { data: { subscription: { unsubscribe } } }; }),
  } };
  return { repository: new SupabaseCandidateDiscoveryRepository(client as never), invoke, unsubscribe, mutation,
    changeUser: () => authChanged('SIGNED_OUT') };
}

describe('candidate discovery request', () => {
  test.each([
    { center: { latitude: NaN, longitude: 0 } }, { center: { latitude: 91, longitude: 0 } },
    { center: { latitude: 0, longitude: Infinity } }, { center: { latitude: 0, longitude: -181 } },
    { radiusMeters: 99 }, { radiusMeters: 5001 }, { radiusMeters: Infinity },
    { limit: 0 }, { limit: 13 }, { limit: undefined }, { limit: 1.5 },
    { category: 'nightlife' }, { types: ['cafe'] }, { query: 'x' }, { tripId: 'private' },
    { providerUrl: 'http://localhost/secrets' }, { center: { ...request.center, extra: true } },
  ])('rejects invalid/unknown input %j', (patch) => {
    expect(() => validateCandidateDiscoveryRequest({ ...request, ...patch })).toThrow();
  });
});

describe('candidate facts and review boundary', () => {
  test.each([
    { googlePlaceId: 'bad' }, { googlePlaceId: 'x'.repeat(201) }, { name: ' ' }, { name: 'x'.repeat(201) },
    { coordinate: { latitude: -91, longitude: 0 } }, { coordinate: { latitude: 0, longitude: NaN } },
    { category: 'all' }, { category: 'invented' }, { rating: 5.1 }, { rating: NaN },
    { userRatingCount: -1 }, { userRatingCount: 0.5 }, { userRatingCount: Number.MAX_SAFE_INTEGER + 1 },
    { address: 'x'.repeat(501) }, { status: 'ACCEPTED' }, { review: 'ACCEPTED' }, { kind: 'custom_activity' },
    { provenance: { ...candidate.provenance, provider: 'gemini' } },
    { provenance: { ...candidate.provenance, receivedAt: '2026-02-30T00:00:00.000Z' } },
    { provenance: { ...candidate.provenance, receivedAt: 'yesterday' } },
    { provenance: { ...candidate.provenance, observation: 'LIVE_HOURS' } }, { businessStatus: 'OPERATIONAL' },
  ])('rejects malformed or accepted candidate %j', (patch) => {
    expect(() => validateDiscoveryCandidate({ ...candidate, ...patch })).toThrow();
  });

  it('rejects count overflow and duplicates; empty is honest', () => {
    expect(() => validateDiscoveryCandidates(Array(13).fill(candidate))).toThrow();
    expect(() => validateDiscoveryCandidates([candidate, candidate])).toThrow();
    expect(validateDiscoveryCandidates([])).toEqual([]);
  });

  it('preserves facts, omits unavailable metadata, and performs zero persistence', async () => {
    const { repository, invoke, mutation, unsubscribe } = setup();
    const result = await repository.discover(request);
    expect(result[0]).toMatchObject({ ...candidate, provenance: { ...candidate.provenance, receivedAt: expect.any(String) } });
    expect(result[0]).not.toHaveProperty('rating');
    expect(result[0]).not.toHaveProperty('address');
    expect(result[0]).not.toHaveProperty('categoryLabel');
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke.mock.calls[0][0]).toBe('explore-places');
    expect(mutation).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('rejects extra transport/provider data and request-specific overflow/category mismatch', async () => {
    const { repository, invoke } = setup();
    for (const places of [[{ ...raw, rawProviderJson: {} }], [raw, { ...raw, googlePlaceId: 'ChIJfixture67890' }]]) {
      invoke.mockResolvedValueOnce({ data: { data: { places } }, error: null });
      await expect(repository.discover({ ...request, limit: 1 })).rejects.toThrow();
    }
    await expect(repository.discover({ ...request, category: 'hotels' })).rejects.toThrow();
  });
});

describe('deterministic ranking input', () => {
  it('canonicalizes identities and preferences without sorting by score or reading provider JSON', () => {
    const second = { ...candidate, googlePlaceId: 'ChIJfixture67890' };
    const first = mapCandidateRankingInput([second, candidate], context);
    expect(mapCandidateRankingInput([candidate, second], { ...context, preferredCategories: ['attractions', 'coffee', 'coffee'] })).toEqual(first);
    expect(mapCandidateRankingInput([second, candidate], context)).toEqual(first);
    expect(first.review).toBe('REVIEW_REQUIRED');
    expect(first).not.toHaveProperty('score');
    expect(() => mapCandidateRankingInput([raw], context)).toThrow();
  });
  test.each([{ ...context, origin: { latitude: 91, longitude: 0 } }, { ...context, tripId: 'owner' },
    { ...context, preferredCategories: Array(6).fill('coffee') }, { ...context, preferredCategories: ['made-up'] },
    { ...context, rawGoogleJson: {} }])('rejects unsupported context', (value) => {
    expect(() => mapCandidateRankingInput([candidate], value)).toThrow();
  });
});

describe('cancellation and stale isolation', () => {
  it('coalesces at the actual transport boundary and does not retry provider errors', async () => {
    const { repository, invoke, mutation } = setup();
    const session = new CandidateDiscoverySession(repository);
    const first = session.discover(request);
    const duplicate = session.discover(request);
    expect(first).toBe(duplicate);
    await first;
    expect(invoke).toHaveBeenCalledTimes(1);
    invoke.mockResolvedValueOnce({ data: null, error: { context: new Response(JSON.stringify({ error: { code: 'EXPLORE_PROVIDER_RATE_LIMITED', message: 'secret' } }), { status: 429 }) } });
    await expect(session.discover(request)).rejects.toThrow();
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(mutation).not.toHaveBeenCalled();
    session.dispose();
  });
  it('propagates caller abort to transport, with zero retry and zero persistence', async () => {
    const { repository, invoke, mutation } = setup();
    invoke.mockImplementation(() => new Promise(() => undefined));
    const controller = new AbortController();
    const promise = repository.discover(request, controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
    expect(invoke.mock.calls[0][1].signal.aborted).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(mutation).not.toHaveBeenCalled();
  });
  it('session transition aborts old-user work even if transport never settles', async () => {
    const { repository, invoke, changeUser, unsubscribe } = setup();
    invoke.mockImplementation(() => new Promise(() => undefined));
    const promise = repository.discover(request);
    changeUser();
    await expect(promise).rejects.toMatchObject({ code: 'cancelled' });
    expect(invoke.mock.calls[0][1].signal.aborted).toBe(true);
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('coalesces equivalent queries; newer query rejects old work; dispose cancels unmount', async () => {
    const resolvers: ((value: never[]) => void)[] = [];
    const discover = jest.fn(() => new Promise<never[]>((resolve) => resolvers.push(resolve)));
    const session = new CandidateDiscoverySession({ discover });
    const old = session.discover(request);
    const rejected = expect(old).rejects.toMatchObject({ code: 'cancelled' });
    expect(session.discover({ ...request, center: { longitude: 100.52, latitude: 13.76 } })).toBe(old);
    expect(discover).toHaveBeenCalledTimes(1);
    const latest = session.discover({ ...request, radiusMeters: 1000 });
    resolvers[1]([]);
    await expect(latest).resolves.toEqual([]);
    resolvers[0]([]);
    await rejected;
    const pending = session.discover(request);
    session.dispose();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
    await expect(session.discover(request)).rejects.toMatchObject({ code: 'cancelled' });
    expect(discover).toHaveBeenCalledTimes(3);
  });
});
