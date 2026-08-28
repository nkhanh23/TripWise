const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');
if (!text.includes('function normalizeStatus')) {
  text += "\n\nfunction normalizeStatus(status: ExploreUIStatus): ExploreUIStatus {\n  if (status === 'moving') return 'ready';\n  return status;\n}\n";
  fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
  console.log('Added normalizeStatus');
}
