const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  /fireEvent\.press\((.*?)\);/g,
  "await act(async () => { fireEvent.press($1); });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Wrapped all fireEvent.press');
