const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "const discover = jest.fn((req) => \n      Promise.resolve(req.category === 'restaurants' ? [restaurant] : [attraction])\n    );",
  "const discover = jest.fn((req) => new Promise(r => setTimeout(() => r(req.category === 'restaurants' ? [restaurant] : [attraction]), 10)));"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed test 8 mock');
