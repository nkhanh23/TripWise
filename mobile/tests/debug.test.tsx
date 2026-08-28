import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
describe('keys', () => {
  it('B', () => {
    const result = render(<View />);
    console.log('KEYS:', Object.keys(result));
  });
});
