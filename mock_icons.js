const fs = require('fs');

const text = fs.readFileSync('mobile/tests/ExploreMapCanvas.test.tsx', 'utf8');

const mockIcon = `jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => <Text {...props}>{props.name}</Text>;
});
`;

const updated = mockIcon + text;

fs.writeFileSync('mobile/tests/ExploreMapCanvas.test.tsx', updated);
console.log('Mocked MaterialIcons');
