const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  "const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;",
  "console.log('RENDER ExploreScreen. isMapMoving=', isMapMoving, 'normalizedStatus=', normalizedStatus); const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Injected logging');
