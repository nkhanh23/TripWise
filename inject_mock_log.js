const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(
  '<MockPressable accessibilityLabel="Move start" onPress={() => onMovementStateChange?.(true)} />',
  "<MockPressable accessibilityLabel=\"Move start\" onPress={() => { console.log('Move start pressed!'); onMovementStateChange?.(true); }} />"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Injected logging into mock');
