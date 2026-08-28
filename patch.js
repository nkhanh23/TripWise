const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', 'utf8');
text = text.replace(/if \(Platform\.OS !== 'web' && !process\.env\.JEST_WORKER_ID\) \{/, "if (Platform.OS !== 'web') {");
fs.writeFileSync('mobile/src/features/explore/components/ExploreMapCanvas.tsx', text);
console.log('Patched');
