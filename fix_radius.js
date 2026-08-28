const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');
text = text.replace("import { spacing } from '../../theme/tokens';", "import { radius, spacing } from '../../theme/tokens';");
fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed missing radius import');
