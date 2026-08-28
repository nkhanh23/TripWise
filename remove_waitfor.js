const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());",
  "expect(screen.getByText('Wat Arun')).toBeTruthy();"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Removed waitFor in Test 2');
