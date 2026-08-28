const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

// Remove imports from top
text = text.replace("import { ExploreMotionHint } from '../src/features/explore/components/ExploreMotionHint';\n", "");
text = text.replace("import { buildExplorationHints } from '../src/features/explore/components/ExploreMapCanvas';\n", "");
text = text.replace("import { ExploreScreen } from '../src/features/explore/ExploreScreen';\n", "");
text = text.replace("import { ExploreMotionHint } from '../src/features/explore/components/ExploreMotionHint';\r\n", "");
text = text.replace("import { buildExplorationHints } from '../src/features/explore/components/ExploreMapCanvas';\r\n", "");
text = text.replace("import { ExploreScreen } from '../src/features/explore/ExploreScreen';\r\n", "");


// Append imports after mocks
text = text.replace(
  "describe('production Explore discovery', () => {",
  `import { ExploreMotionHint } from '../src/features/explore/components/ExploreMotionHint';
import { buildExplorationHints } from '../src/features/explore/components/ExploreMapCanvas';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';

describe('production Explore discovery', () => {`
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed import order');
