const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "jest.clearAllMocks();\nconsole.log('afterEach END');",
  "jest.clearAllMocks();\nawait cleanup();\nconsole.log('afterEach END');"
);
text = text.replace(
  "afterEach(() => {",
  "afterEach(async () => {"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added await cleanup');
