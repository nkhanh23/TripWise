const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreMapCanvas.test.tsx', 'utf8');
text = text.replace(/markerItems=\{\[\{ type: 'place', place: mockPlace \}\]\}/g, "markerItems={[{ id: 'm1', type: 'place', place: mockPlace }]}");
fs.writeFileSync('mobile/tests/ExploreMapCanvas.test.tsx', text);
console.log('Fixed markerItems');
