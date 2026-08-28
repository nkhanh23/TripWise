const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace('afterEach(() => {\\n    cleanup();', 'afterEach(() => {\n    cleanup();');

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed literal backslash n');
