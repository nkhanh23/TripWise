const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Real');\n    fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), '');",
  "await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), 'Real'); });\n    await act(async () => { fireEvent.changeText(screen.getByPlaceholderText('Search Tokyo, Bangkok...'), ''); });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Wrapped changeText in act');
