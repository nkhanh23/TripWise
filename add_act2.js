const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());\n  });",
  "await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());\n    await act(async () => { await Promise.resolve(); });\n  });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added await act to Test 2');
