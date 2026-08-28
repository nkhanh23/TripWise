const fs = require('fs');
const text = fs.readFileSync('mobile/tests/ExploreMapCanvas.test.tsx', 'utf8');

const newMock = `
jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return (props: any) => <Text {...props}>{props.name}</Text>;
});
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: (props: any) => <Text {...props}>{props.name}</Text>
  };
});
`;

let result = text;
if (text.includes('jest.mock(\'@expo/vector-icons/MaterialIcons\'')) {
  result = text.replace(/jest\.mock\('@expo\/vector-icons\/MaterialIcons', \(\) => \{[\s\S]*?\}\);/, newMock);
} else {
  result = newMock + text;
}

fs.writeFileSync('mobile/tests/ExploreMapCanvas.test.tsx', result);
