const fs = require('fs');
const file = 'mobile/src/features/explore/components/ExploreMapCanvas.tsx';
let text = fs.readFileSync(file, 'utf8');

const search = `<NativeMarker
                calloutEnabled={false}
                coordinate={hint.coordinate}`;

const replace = `<NativeMarker
                accessibilityElementsHidden
                accessible={false}
                importantForAccessibility="no-hide-descendants"
                calloutEnabled={false}
                coordinate={hint.coordinate}`;

const searchCRLF = search.replace(/\n/g, '\r\n');
const replaceCRLF = replace.replace(/\n/g, '\r\n');

text = text.replace(search, replace).replace(searchCRLF, replaceCRLF);
fs.writeFileSync(file, text);
console.log('Fixed accessibility props');
