const fs = require('fs');
let text = fs.readFileSync('mobile/../recovered_useExploreDiscovery.txt', 'utf8');

const startIdx = text.indexOf('import {');
text = text.substring(startIdx);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Restored useExploreDiscovery');
