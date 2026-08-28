const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "await waitFor(() => expect(screen.getByTestId('map-status').props.children).toBe('moving'));",
  "await waitFor(() => { console.log('STATUS IS:', screen.getByTestId('map-status').props.children); expect(screen.getByTestId('map-status').props.children).toBe('moving'); });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected logging');
