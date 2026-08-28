const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(
  /import \{ StyleSheet, View \} from 'react-native';/,
  "import { StyleSheet, View, Pressable } from 'react-native';\nimport { MaterialIcons } from '@expo/vector-icons';"
);

text = text.replace(
  /import \{ colors, spacing \} from '\.\.\/\.\.\/\.\.\/theme\/tokens';/,
  "import { colors, spacing, radius } from '../../../theme/tokens';"
);

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed imports');
