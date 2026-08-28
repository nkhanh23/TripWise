const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

// 1. Remove fake timers
text = text.replace(/jest\.useFakeTimers\(\);\n?/g, '');
text = text.replace(/jest\.useRealTimers\(\);\n?/g, '');
text = text.replace(
  'jest.advanceTimersByTime(ms);',
  'await new Promise(r => setTimeout(r, ms));'
);
text = text.replace(
  "async function advanceDebounce(ms = 400) {\n  await act(async () => {\n    await new Promise(r => setTimeout(r, ms));\n    await Promise.resolve();\n  });\n}",
  "async function advanceDebounce(ms = 400) {\n  await act(async () => {\n    await new Promise(r => setTimeout(r, ms));\n  });\n}"
);

// 2. Fix Test 1
text = text.replace(
  "const discover = jest.fn().mockImplementation(() => new Promise(() => {}));",
  "const discover = jest.fn().mockImplementation((req, signal) => new Promise((resolve, reject) => { signal?.addEventListener('abort', () => reject(new Error('Aborted'))); }));"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Removed fake timers and fixed Test 1');
