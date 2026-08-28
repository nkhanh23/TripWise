const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "it('real initial success', async () => {",
  "it('real initial success', async () => { console.log('TEST 2 START');"
);
text = text.replace(
  "const discover = jest.fn().mockResolvedValue([attraction]);",
  "const discover = jest.fn().mockImplementation(async () => { console.log('DISCOVER CALLED!'); return [attraction]; });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected logging into Test 2');
