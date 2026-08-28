const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  "const markersDimmed = confirmedCategory !== selectedCategory && (normalizedStatus === 'refreshing' || hasBackgroundError);",
  "const markersDimmed = confirmedCategory !== selectedCategory && (normalizedStatus === 'refreshing' || hasBackgroundError); console.log('TEST 8 CHECK:', confirmedCategory, selectedCategory, normalizedStatus, hasBackgroundError, markersDimmed);"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Injected test 8 check');
