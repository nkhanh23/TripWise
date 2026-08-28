const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "expect(screen.getByText('Wat Arun')).toBeTruthy();\n  });",
  "expect(screen.getByText('Wat Arun')).toBeTruthy();\n    await act(async () => { await Promise.resolve(); });\n  });"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected act');
