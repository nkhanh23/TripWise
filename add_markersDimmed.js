const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /const displayCategory = showConfirmedCategory \? confirmedCategory : selectedCategory;/,
  "const displayCategory = showConfirmedCategory ? confirmedCategory : selectedCategory;\n  const markersDimmed = confirmedCategory !== selectedCategory && (normalizedStatus === 'refreshing' || hasBackgroundError);"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Added markersDimmed');
