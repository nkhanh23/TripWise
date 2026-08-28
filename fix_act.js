const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "await act(async () => { fireEvent.press(screen.getByLabelText('Move start')); });",
  "await act(async () => { fireEvent.press(screen.getByLabelText('Move start')); jest.advanceTimersByTime(1); });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added advanceTimersByTime');
