const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "const discover = jest.fn().mockImplementation(() => new Promise(() => {}));",
  "const discover = jest.fn().mockImplementation((req, signal) => new Promise((resolve, reject) => { signal?.addEventListener('abort', () => reject(new Error('Aborted'))); }));"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed Test 1 mock');
