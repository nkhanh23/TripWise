const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

text = text.replace(
  'if (currentSequence !== sequence.current) return;',
  "console.log('Sequence check: currentSequence=', currentSequence, 'sequence.current=', sequence.current); if (currentSequence !== sequence.current) return;"
);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Injected logging');
