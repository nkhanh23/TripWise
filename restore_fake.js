const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "beforeEach(() => {",
  "beforeEach(() => {\n    jest.useFakeTimers();"
);
text = text.replace(
  "afterEach(async () => {",
  "afterEach(async () => {\n    jest.useRealTimers();"
);
text = text.replace(
  "await new Promise(r => setTimeout(r, ms));",
  "jest.advanceTimersByTime(ms);"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Restored fake timers');
