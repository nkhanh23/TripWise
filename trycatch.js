const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  'render(<ExploreScreen repository={{ discover }} />);',
  'try { render(<ExploreScreen repository={{ discover }} />); } catch(e) { console.error("RENDER ERROR: ", e); }'
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added try catch');
