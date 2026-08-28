const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

// 1. Fix generic arrow syntax error
text = text.replace(/repository: \(\).*?=>.*?\{/, 'repository: () => {');
text = text.replace('implementation: (request, signal) => Promise<ExploreDiscoveredPlace[]>', '');

// 2. Remove try/catch (if any) and destructuring from render
// Wait, in my original build_test.js, the test just did:
// await render(<ExploreScreen ... />)
// expect(screen...)

// 3. Rename onPanDrag to onMovementStateChange in mock
text = text.replace(/onPanDrag\?\.\(\)/g, "onMovementStateChange?.(true)");

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed test file');
