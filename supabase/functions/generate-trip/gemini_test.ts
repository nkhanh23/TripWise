import assert from 'node:assert/strict';

import {
  buildGeminiHeaders,
  defaultGeminiTimeoutMilliseconds,
  readInteractionOutputText,
  resolveGeminiTimeoutMilliseconds,
} from './gemini.ts';

Deno.test('uses the Gemini x-goog-api-key header without bearer auth', () => {
  const headers = buildGeminiHeaders('test-key');
  assert.equal(headers['x-goog-api-key'], 'test-key');
  assert.equal('authorization' in headers, false);
});

Deno.test('reads structured text from the raw REST steps response', () => {
  const result = readInteractionOutputText({
    steps: [
      { type: 'thought', signature: 'not-returned' },
      {
        type: 'model_output',
        content: [
          { type: 'text', text: '{"title":"Bangkok",' },
          { type: 'text', text: '"days":[]}' },
        ],
      },
    ],
  });

  assert.equal(result, '{"title":"Bangkok","days":[]}');
});

Deno.test('keeps compatibility with the SDK convenience response shape', () => {
  assert.equal(readInteractionOutputText({ output_text: '{"ok":true}' }), '{"ok":true}');
});

Deno.test('rejects responses without model text content', () => {
  assert.equal(readInteractionOutputText({ steps: [{ type: 'thought' }] }), null);
});

Deno.test('keeps the provider timeout bounded with enough margin for observed generation latency', () => {
  assert.equal(defaultGeminiTimeoutMilliseconds, 40_000);
  assert.equal(resolveGeminiTimeoutMilliseconds(undefined), 40_000);
  assert.equal(resolveGeminiTimeoutMilliseconds('45000'), 45_000);
  assert.equal(resolveGeminiTimeoutMilliseconds('45001'), 40_000);
});
