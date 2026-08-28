const fs = require('fs');

let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(/import \{ ExploreMotionHint \} from '\.\.\/src\/features\/explore\/components\/ExploreMotionHint';\n/, '');
text = text.replace(/import \{ buildExplorationHints \} from '\.\.\/src\/features\/explore\/components\/ExploreMapCanvas';\n/, '');
text = text.replace(/import \{ ExploreScreen \} from '\.\.\/src\/features\/explore\/ExploreScreen';\n/, '');

const newImports = `import { ExploreMotionHint } from '../src/features/explore/components/ExploreMotionHint';
import { buildExplorationHints } from '../src/features/explore/components/ExploreMapCanvas';
import { ExploreScreen } from '../src/features/explore/ExploreScreen';\n`;

text = text.replace(/import React from 'react';/, "import React from 'react';\n" + newImports);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);

let canvasText = fs.readFileSync('mobile/tests/ExploreMapCanvas.test.tsx', 'utf8');
canvasText = canvasText.replace(/const \{ getByTestId \} = render/g, 'render');
canvasText = canvasText.replace(/const \{ getAllByTestId, queryAllByTestId, rerender \} = render/g, 'const { rerender } = render');
canvasText = canvasText.replace(/const \{ getByLabelText, rerender \} = render/g, 'const { rerender } = render');
canvasText = canvasText.replace(/import \{ render, fireEvent, act \} from '@testing-library\/react-native';/, "import { render, fireEvent, act, screen } from '@testing-library/react-native';");

// replace those function calls with screen.*
canvasText = canvasText.replace(/getByTestId\(/g, 'screen.getByTestId(');
canvasText = canvasText.replace(/getAllByTestId\(/g, 'screen.getAllByTestId(');
canvasText = canvasText.replace(/queryAllByTestId\(/g, 'screen.queryAllByTestId(');
canvasText = canvasText.replace(/getByLabelText\(/g, 'screen.getByLabelText(');

fs.writeFileSync('mobile/tests/ExploreMapCanvas.test.tsx', canvasText);
console.log('Fixed tests syntax');
