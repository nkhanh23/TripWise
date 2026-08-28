const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');
text = text.replace(
  "fireEvent.press(screen.getByLabelText('Move start'));",
  "await act(async () => { fireEvent.press(screen.getByLabelText('Move start')); });"
);
fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed fireEvent');
