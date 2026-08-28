const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(/status === 'loading'/g, "normalizedStatus === 'loading'");
text = text.replace(/status !== 'loading'/g, "normalizedStatus !== 'loading'");

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed status variable');
