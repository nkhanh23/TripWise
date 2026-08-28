const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "fireEvent.press(screen.getByText('Restaurants'));",
  "await act(async () => { fireEvent.press(screen.getByText('Restaurants')); });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added await act to Test 8');
