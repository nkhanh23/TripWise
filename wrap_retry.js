const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "fireEvent.press(screen.getByText('Retry'));",
  "await act(async () => { fireEvent.press(screen.getByText('Retry')); });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Wrapped Retry in await act');
