const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /\{normalizedStatus === 'loading' \? \(/,
  "{normalizedStatus === 'initial-loading' ? ("
);
text = text.replace(
  /normalizedStatus !== 'loading'/,
  "normalizedStatus !== 'initial-loading'"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed loading wheel');
