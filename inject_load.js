const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

text = text.replace(
  'if (!force && lastRequestKeyRef.current === nextRequestKey) return;',
  "console.log('load check:', lastRequestKeyRef.current, nextRequestKey); if (!force && lastRequestKeyRef.current === nextRequestKey) return;"
);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Injected logging into load');
