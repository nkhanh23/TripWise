const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "const hint = screen.getByTestId('explore-motion-hint');",
  "const hint = screen.getByTestId('explore-motion-hint', { includeHiddenElements: true });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed Test 11');
