const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "onMovementStateChange?.(true)",
  "{ console.log('MOVE START BUTTON CLICKED'); onMovementStateChange?.(true); }"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added log to mock');
