import { assertEquals } from 'jsr:@std/assert@1.0.15';
import { handleSearchDestinations, maximumBodyBytes } from './handler.ts';

const valid = { googlePlaceId: 'id', name: 'Singapore', formattedAddress: 'Singapore', destinationType: 'CITY', latitude: 1.35, longitude: 103.82 };
const request = (body = '', headers?: HeadersInit, method = 'POST') => method === 'GET' ? new Request('http://test', { method, headers }) : new Request('http://test', { method, headers, body });
const run = (req: Request, search = async () => [valid]) => handleSearchDestinations(req, { authenticate: async () => true, search });
const code = async (response: Response) => (await response.json()).error?.code;

for (const [name, req, status] of [
  ['rejects GET', request('', undefined, 'GET'), 405], ['rejects malformed JSON', request('{'), 400],
  ['rejects null', request('null'), 400], ['rejects array', request('[]'), 400], ['rejects missing query', request('{}'), 400],
  ['rejects extra key', request('{"query":"Oslo","extra":true}'), 400], ['rejects short query', request('{"query":"x"}'), 400],
  ['rejects long query', request(JSON.stringify({ query: 'x'.repeat(101) })), 400],
  ['rejects declared large body', request('{"query":"Oslo"}', { 'content-length': String(maximumBodyBytes + 1) }), 413],
  ['rejects actual large body', request(JSON.stringify({ query: 'x'.repeat(maximumBodyBytes) })), 413],
] as const) Deno.test(name, async () => assertEquals((await run(req)).status, status));
Deno.test('rejects unauthenticated and auth errors', async () => { for (const auth of [async () => false, async () => { throw new Error('no'); }]) assertEquals((await handleSearchDestinations(request('{"query":"Oslo"}'), { authenticate: auth, search: async () => [valid] })).status, 401); });
Deno.test('valid request trims query and bounds filtered output', async () => { let query = ''; const response = await run(request('{"query":" Oslo "}'), async (value) => { query = value; return [...Array(7).fill(valid), { ...valid, googlePlaceId: '' }]; }); assertEquals(query, 'Oslo'); assertEquals(response.status, 200); assertEquals((await response.json()).data.length, 6); });
Deno.test('dependency failure remains sanitized', async () => { const response = await run(request('{"query":"Oslo"}'), async () => { throw new Error('provider secret body'); }); assertEquals(response.status, 500); assertEquals(await code(response), 'INTERNAL_ERROR'); });