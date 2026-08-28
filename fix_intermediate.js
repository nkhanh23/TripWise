const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "const discover = jest.fn()\n      .mockResolvedValueOnce([attraction])\n      .mockRejectedValueOnce(new Error('network'));",
  "const discover = jest.fn()\n      .mockImplementationOnce(() => new Promise(r => setTimeout(() => r([attraction]), 10)))\n      .mockImplementationOnce(() => new Promise((_, rej) => setTimeout(() => rej(new Error('network')), 10)));"
);

text = text.replace(
  /await render\(<ExploreScreen repository=\{\{ discover \}\} \/>\);/g,
  "await render(<ExploreScreen repository={{ discover }} />);\n    jest.advanceTimersByTime(10);"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed intermediate state tests');
