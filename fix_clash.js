const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
`  initialPlaces,
  initialViewMode = 'map',
  onNavigatePlaceDetail,
  initialPlaces,
  initialViewMode = 'map',
  onNavigatePlaceDetail,`,
`  initialPlaces,
  initialViewMode = 'map',
  onNavigatePlaceDetail,`
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed argument name clash');
