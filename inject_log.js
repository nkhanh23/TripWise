const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  "it('true initial loading', async () => {",
  "it('true initial loading', async () => {\n    const r = render(<ExploreScreen repository={{ discover: jest.fn() }} />);\n    console.log(Object.keys(r));\n    return;"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected console log');
