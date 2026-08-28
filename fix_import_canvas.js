const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');

text = text.replace(
  /import type \{ ExploreCategory, ExploreMapPlace \} from '\.\.\/types';/,
  "import type { ExploreCategory, ExploreMapPlace, ExploreUIStatus } from '../types';"
);

fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', text);
console.log('Fixed import');
