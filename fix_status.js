const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  'const normalizedStatus = normalizeStatus(networkStatus);',
  "const normalizedStatus = initialPlaces && networkStatus === 'ready' ? 'ready' : networkStatus;"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed normalizedStatus');
