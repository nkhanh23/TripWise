const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');

text = text.replace(
  /import type \{ ClusterMarkerModel, ExploreMapPlace, ExploreMarkerItem \} from '\.\.\/types';/,
  "import type { ClusterMarkerModel, ExploreMapPlace, ExploreMarkerItem, ExploreUIStatus } from '../types';"
);

fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', text);
console.log('Fixed import');
