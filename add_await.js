const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

text = text.replace(/render\(<ExploreScreen/g, 'await render(<ExploreScreen');

// I also have render(<ExploreMotionHint...
text = text.replace(/render\(<ExploreMotionHint/g, 'await render(<ExploreMotionHint');

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Added await to render');
