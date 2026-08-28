const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  /fireEvent\.press\((.*?)\);/g,
  (match, p1) => {
    if (p1.includes('Restaurants') || p1.includes('Retry')) {
      return match; // Leave intermediate-state tests alone
    }
    return `await act(async () => { fireEvent.press(${p1}); });`;
  }
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Wrapped most fireEvent.press');
