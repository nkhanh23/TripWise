const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "afterEach(() => {",
  "afterEach(() => {\nconsole.log('afterEach START');"
);
text = text.replace(
  "jest.clearAllMocks();",
  "jest.clearAllMocks();\nconsole.log('afterEach END');"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected afterEach logs');
