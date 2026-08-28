const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /import \{ ActivityIndicator, StyleSheet, View \} from 'react-native';/,
  "import { ActivityIndicator, StyleSheet, View, Pressable } from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';"
);

text = text.replace(
  /import \{ spacing \} from '\.\.\/\.\.\/theme\/tokens';/,
  "import { spacing, radius, colors } from '../../theme/tokens';"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed imports');
