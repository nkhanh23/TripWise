const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  'try { render(<ExploreScreen repository={{ discover }} />); } catch(e) { console.error("RENDER ERROR: ", e); }',
  'render(<ExploreScreen repository={{ discover }} />);'
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Removed try catch');
