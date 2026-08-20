import assert from 'node:assert/strict';

import { readInteractionOutputText } from './gemini.ts';

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
