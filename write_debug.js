const fs = require('fs');
const content = `import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
describe('keys', () => {
  it('B', () => {
    const result = render(<View />);
    console.log(Object.keys(result));
  });
});`;
fs.writeFileSync('mobile/tests/debug.test.tsx', content);
