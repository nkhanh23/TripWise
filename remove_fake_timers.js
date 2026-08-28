const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(/jest\.useFakeTimers\(\);/g, '');
text = text.replace(/jest\.useRealTimers\(\);/g, '');
text = text.replace(/jest\.advanceTimersByTime\((.*?)\);/g, 'await new Promise(r => setTimeout(r, $1));');

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Removed fake timers');
