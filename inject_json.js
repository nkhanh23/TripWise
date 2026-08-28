const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "it('local search with zero provider calls', async () => {",
  "it('local search with zero provider calls', async () => {\n  console.log('TEST 3 JSON:', screen.toJSON());"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected JSON log');
