import { parseEventIntelligenceResponse, validateEventIntelligenceRequest } from '../src/integration/eventIntelligenceContract';
import { mapEventIntelligenceError, SupabaseEventIntelligenceRepository } from '../src/integration/remote/supabaseEventIntelligenceRepository';

const query = { city: 'London', countryCode: 'GB', startDateTime: '2026-09-10T00:00:00Z', endDateTime: '2026-09-17T00:00:00Z', limit: 3 };
const event = () => ({ provider: 'ticketmaster', providerEventId: 'test-event', title: 'Test only event', start: { kind: 'UTC', dateTime: '2026-09-12T09:00:00Z' }, review: 'REVIEW_REQUIRED', attribution: { providerName: 'Ticketmaster', displayRequirement: 'REQUIRES_FINAL_T005_REVIEW' }, provenance: { provider: 'ticketmaster', providerEventId: 'test-event', boundary: 'discover-events', observation: 'SERVER_RECEIVED', observedAt: '2026-09-09T12:00:00.000Z' } });
const envelope = (events: unknown[] = [event()]) => ({ data: { events, pagination: { size: 3, number: 0, totalElements: events.length, totalPages: events.length ? 1 : 0 }, providerAccess: { httpStatus: 200, completedProviderCalls: 1, rateLimitHeaders: { 'rate-limit': '5000' } } } });
const parse = (events: unknown[]) => parseEventIntelligenceResponse(envelope(events), 3);
function setup() {
  let changed: (event: string) => void = () => undefined;
  const invoke = jest.fn().mockResolvedValue({ data: envelope(), error: null });
  const unsubscribe = jest.fn(), mutation = jest.fn(() => { throw Error('No persistence'); });
  const client = { functions: { invoke }, from: mutation, rpc: mutation, storage: mutation, auth: { onAuthStateChange: jest.fn(callback => { changed = callback; return { data: { subscription: { unsubscribe } } }; }) } };
  return { repository: new SupabaseEventIntelligenceRepository(client as never), invoke, mutation, unsubscribe, changed: (event: string) => changed(event) };
}
test('exact valid request copied', () => { expect(validateEventIntelligenceRequest(query)).toEqual(query); expect(validateEventIntelligenceRequest(query)).not.toBe(query); });
test.each([{ extra: true }, { userId: 'private' }, { url: 'https://invalid.example' }, { city: '' }, { city: 'x'.repeat(101) }, { city: ' London' }, { city: 'a&apikey=x' }, { countryCode: 'gb' }, { countryCode: 'GBR' }, { startDateTime: '2026-02-30T00:00:00Z' }, { startDateTime: '2026-09-10T00:00:00+00:00' }, { endDateTime: query.startDateTime }, { endDateTime: '2026-09-18T00:00:00Z' }, { limit: 0 }, { limit: 4 }, { limit: 1.5 }, { limit: undefined }])('invalid request %j', patch => expect(() => validateEventIntelligenceRequest({ ...query, ...patch })).toThrow());
test('valid UTC attribution provenance optional fields preserved and copied', () => {
  const raw = event(); const result = parse([raw]).events[0];
  expect(result).toEqual({ ...raw, kind: 'live-event-candidate' });
  expect(result).not.toHaveProperty('end'); expect(result).not.toHaveProperty('venues');
  expect(result.attribution).not.toBe(raw.attribution); expect(result.start).not.toBe(raw.start);
});
test.each([
  { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', localTime: '10:00:00' },
  { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', timezone: 'Europe/London', noSpecificTime: true },
  { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', dateTBD: true, dateTBA: false, timeTBA: true },
  { kind: 'UTC', dateTime: '2026-09-12T09:00:00Z', localDate: '2026-09-12', localTime: '10:00:00', timezone: 'Europe/London' },
])('time facts preserved without timezone invention %j', start => { const result = parse([{ ...event(), start }]).events[0]; expect(result.start).toEqual(start); });
test.each([
  { kind: 'LOCAL', localDate: '2026-09-12' }, { kind: 'UTC' }, { kind: 'UTC', dateTime: '2026-02-30T00:00:00Z' },
  { kind: 'UTC', dateTime: '2026-09-12T24:00:00Z' }, { kind: 'UTC', dateTime: '2026-09-12T09:00:00' },
  { kind: 'UTC', dateTime: '2026-09-12T09:00:00Z', timeTBA: true },
  { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', dateTime: '2026-09-12T09:00:00Z' },
  { kind: 'PROVIDER_LOCAL', localDate: '2026-02-30' }, { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', localTime: '25:00:00' },
  { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', timezone: 'Imaginary/Zone' },
  { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', timeTBA: 'true' },
  { kind: 'UTC', dateTime: '2026-09-12T09:00:00Z', deviceTimezone: 'UTC' },
])('malformed time rejected %j', start => expect(() => parse([{ ...event(), start }])).toThrow());
test('chronology checked where comparable; valid optional end', () => {
  expect(() => parse([{ ...event(), end: { kind: 'UTC', dateTime: '2026-09-11T00:00:00Z' } }])).toThrow();
  expect(() => parse([{ ...event(), start: { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', localTime: '10:00:00' }, end: { kind: 'PROVIDER_LOCAL', localDate: '2026-09-12', localTime: '09:00:00' } }])).toThrow();
  expect(parse([{ ...event(), end: { kind: 'UTC', dateTime: '2026-09-12T12:00:00Z' } }]).events[0].end).toEqual({ kind: 'UTC', dateTime: '2026-09-12T12:00:00Z' });
});
test.each([
  { providerEventId: undefined }, { providerEventId: '' }, { providerEventId: '../bad' }, { providerEventId: 'x'.repeat(201) },
  { title: '' }, { title: 'x'.repeat(301) }, { provider: 'google' }, { kind: 'poison' }, { review: 'ACCEPTED' }, { sourceUrl: 'https://bad' },
  { attribution: { ...event().attribution, providerName: 'TripWise' } }, { attribution: { ...event().attribution, logo: 'bad' } },
  { provenance: { ...event().provenance, providerEventId: 'other' } }, { provenance: { ...event().provenance, observation: 'UPDATED_AT' } },
  { provenance: { ...event().provenance, observedAt: '2026-02-30T00:00:00.000Z' } }, { provenance: { ...event().provenance, raw: 'poison' } },
])('identity/title/attribution/provenance poisoning fails %j', patch => expect(() => parse([{ ...event(), ...patch }])).toThrow());
test('venue identity and unavailable location', () => {
  const venues = [{ providerVenueId: 'venue-1', name: 'Venue' }, { location: { latitude: 51.5, longitude: -0.1 } }];
  const result = parse([{ ...event(), venues }]).events[0]; expect(result.venues).toEqual(venues); expect(result.venues?.[0]).not.toHaveProperty('location');
});
test.each([
  { providerVenueId: '../bad' }, { providerVenueId: 'x'.repeat(201) }, { name: 'x'.repeat(201) }, { googlePlaceId: 'fake' },
  { location: { latitude: 91, longitude: 0 } }, { location: { latitude: 0, longitude: -181 } },
  { location: { latitude: NaN, longitude: 0 } }, { location: { latitude: '51', longitude: 0 } },
  { location: { latitude: 0, longitude: 0, verified: true } }, { location: null },
])('invalid venue %j', venue => expect(() => parse([{ ...event(), venues: [venue] }])).toThrow());
test('counts and duplicate IDs; empty valid', () => {
  expect(parse([]).events).toEqual([]); expect(() => parse([event(), event()])).toThrow();
  expect(() => parse(Array(4).fill(event()))).toThrow(); expect(() => parse([{ ...event(), venues: Array(4).fill({}) }])).toThrow();
});
test.each([{ number: 1 }, { size: 4 }, { size: 0 }, { totalElements: -1 }, { totalElements: 0 }, { totalPages: 0 }, { totalPages: 1.5 }, { cursor: 'poison' }])('pagination validation %j', patch => {
  const body = envelope(); expect(() => parseEventIntelligenceResponse({ data: { ...body.data, pagination: { ...body.data.pagination, ...patch } } }, 3)).toThrow();
});
test('strict outer/access envelope and bounded metadata', () => {
  for (const body of [{}, { ...envelope(), error: {} }, { data: { ...envelope().data, extra: true } }, { data: { ...envelope().data, providerAccess: { ...envelope().data.providerAccess, completedProviderCalls: 2 } } }, { data: { ...envelope().data, providerAccess: { ...envelope().data.providerAccess, rateLimitHeaders: { 'set-cookie': 'secret' } } } }]) expect(() => parseEventIntelligenceResponse(body, 3)).toThrow();
});
test.each([
  ['EVENT_INPUT_INVALID','invalidRequest'], ['UNAUTHORIZED','unauthorized'], ['EVENT_PROVIDER_CONFIG_MISSING','providerUnavailable'], ['EVENT_PROVIDER_AUTH','providerUnavailable'], ['EVENT_PROVIDER_RATE_LIMITED','rateLimited'], ['EVENT_PROVIDER_UNAVAILABLE','providerUnavailable'], ['EVENT_PROVIDER_TIMEOUT','timeout'], ['EVENT_CANCELLED','cancelled'], ['EVENT_PROVIDER_INVALID_RESPONSE','invalidResponse'],
])('safe mapping %s', (code, expected) => { const error = mapEventIntelligenceError({ error: { code, message: 'secret body' } }); expect(error.code).toBe(expected); expect(error.message).not.toContain('secret'); });
test.each([[401,'unauthorized'],[403,'forbidden'],[429,'rateLimited'],[500,'providerUnavailable'],[504,'timeout']])('HTTP mapping %s', (status, expected) => expect(mapEventIntelligenceError(null, status as number).code).toBe(expected));
test('repository invokes normalized path once per call, no cache or persistence', async () => {
  const s = setup(); const one = await s.repository.discover(query); one.events[0].title = 'modified';
  const two = await s.repository.discover(query); expect(two.events[0].title).toBe('Test only event');
  expect(s.invoke).toHaveBeenCalledTimes(2); expect(s.invoke.mock.calls[0][0]).toBe('discover-events');
  expect(s.invoke.mock.calls[0][1].body).toEqual(query); expect(s.mutation).not.toHaveBeenCalled(); expect(s.unsubscribe).toHaveBeenCalledTimes(2);
});
test('invalid request and pre-abort avoid network', async () => {
  const s = setup(), c = new AbortController(); c.abort();
  await expect(s.repository.discover({ ...query, limit: 4 })).rejects.toMatchObject({ code: 'invalidRequest' });
  await expect(s.repository.discover(query, c.signal)).rejects.toMatchObject({ code: 'cancelled' }); expect(s.invoke).not.toHaveBeenCalled();
});
test('malformed success fails safely', async () => {
  const s = setup(); s.invoke.mockResolvedValue({ data: { data: { secret: 'bad' } }, error: null });
  await expect(s.repository.discover(query)).rejects.toMatchObject({ code: 'invalidResponse' }); expect(s.invoke).toHaveBeenCalledTimes(1);
});
test('provider error envelope via invoke safely mapped once', async () => {
  const s = setup(); s.invoke.mockResolvedValue({ data: null, error: { context: { status: 502, json: async () => ({ error: { code: 'EVENT_PROVIDER_AUTH', message: 'secret' } }) } } });
  await expect(s.repository.discover(query)).rejects.toMatchObject({ code: 'providerUnavailable' }); expect(s.invoke).toHaveBeenCalledTimes(1);
});
test('timeout settles non-cooperative transport and never retries', async () => {
  jest.useFakeTimers(); const s = setup(); s.invoke.mockImplementation(() => new Promise(() => undefined));
  const pending = expect(s.repository.discover(query)).rejects.toMatchObject({ code: 'timeout' });
  await jest.advanceTimersByTimeAsync(10001); await pending; expect(s.invoke).toHaveBeenCalledTimes(1); expect(s.invoke.mock.calls[0][1].signal.aborted).toBe(true); jest.useRealTimers();
});
test.each(['SIGNED_OUT','SIGNED_IN','USER_UPDATED'])('session invalidation rejects late result %s', async change => {
  const s = setup(); let resolve!: (v: unknown) => void; s.invoke.mockImplementation(() => new Promise(r => { resolve = r; }));
  const pending = expect(s.repository.discover(query)).rejects.toMatchObject({ code: 'cancelled' }); s.changed(change); resolve({ data: envelope(), error: null }); await pending; expect(s.unsubscribe).toHaveBeenCalled();
});
test('supersession cancels old operation without cancelling new one', async () => {
  const s = setup(); s.invoke.mockImplementationOnce(() => new Promise(() => undefined));
  const old = expect(s.repository.discover(query)).rejects.toMatchObject({ code: 'cancelled' });
  const latest = await s.repository.discover(query); await old; expect(latest.events).toHaveLength(1); expect(s.invoke.mock.calls[0][1].signal.aborted).toBe(true);
});
test('explicit external cancellation and repository cancel', async () => {
  const s = setup(); s.invoke.mockImplementation(() => new Promise(() => undefined)); const controller = new AbortController();
  const first = expect(s.repository.discover(query, controller.signal)).rejects.toMatchObject({ code: 'cancelled' }); controller.abort(); await first;
  const second = expect(s.repository.discover(query)).rejects.toMatchObject({ code: 'cancelled' }); s.repository.cancel(); await second;
});
test('token refresh does not invalidate same-owner request', async () => {
  const s = setup(); const pending = s.repository.discover(query); s.changed('TOKEN_REFRESHED'); expect((await pending).events).toHaveLength(1);
});
