const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(/import \{ ExploreMotionHint \} from '\.\.\/src\/features\/explore\/components\/ExploreMotionHint';/g, '');
text = text.replace(/import \{ buildExplorationHints \} from '\.\.\/src\/features\/explore\/components\/ExploreMapCanvas';/g, '');
text = text.replace(/import \{ ExploreScreen \} from '\.\.\/src\/features\/explore\/ExploreScreen';/g, '');

const newImports = `import { ExploreMotionHint } from '../src/features/explore/components/ExploreMotionHint';
import { buildExplorationHints } from '../src/features/explore/components/ExploreMapCanvas';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';\n`;

text = text.replace(/import React from 'react';/, "import React from 'react';\n" + newImports);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed prod test imports');
