const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace('jest.useRealTimers();', '// jest.useRealTimers();');

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Removed useRealTimers');
