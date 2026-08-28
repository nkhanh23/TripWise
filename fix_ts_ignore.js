const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreMapCanvas.test.tsx', 'utf8');
text = text.replace(/import TestRenderer, \{ act \} from 'react-test-renderer';/, "// @ts-ignore\nimport TestRenderer, { act } from 'react-test-renderer';");
fs.writeFileSync('mobile/tests/ExploreMapCanvas.test.tsx', text);
console.log('Added ts-ignore');
