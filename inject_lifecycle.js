const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  "const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;",
  "useEffect(() => { console.log('ExploreScreen MOUNTED'); return () => console.log('ExploreScreen UNMOUNTED'); }, []); const effectiveStatus: ExploreUIStatus = isMapMoving ? 'moving' : normalizedStatus;"
);
text = `import { useEffect } from 'react';\n` + text.replace(/import \{ useEffect \} from 'react';\n/g, '');

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Injected lifecycle logs');
