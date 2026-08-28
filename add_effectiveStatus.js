const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /const normalizedStatus = normalizeStatus\(networkStatus\);/,
  "const normalizedStatus = normalizeStatus(networkStatus);\n  const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Added effectiveStatus');
