const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', 'utf8');

text = text.replace(
  "} catch {",
  "} catch (err) {\nconsole.log('HOOK CAUGHT ERROR:', err);"
);

fs.writeFileSync('mobile/src/features/explore/hooks/useExploreDiscovery.ts', text);
console.log('Injected catch log');
