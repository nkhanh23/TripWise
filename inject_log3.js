const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

text = text.replace(
  'if (controller.signal.aborted || requestSequence !== sequence.current) return;',
  "console.log('Sequence check: requestSequence=', requestSequence, 'sequence.current=', sequence.current, 'aborted=', controller.signal.aborted); if (controller.signal.aborted || requestSequence !== sequence.current) return;"
);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Injected logging');
