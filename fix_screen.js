const fs = require('fs');
const file = 'mobile/src/features/explore/ExploreScreen.tsx';
let text = fs.readFileSync(file, 'utf8');

// Fix accessibilityLabel for initial-loading
text = text.replace(/accessibilityLabel=".*?"/g, (match) => {
  if (match.includes('ang t')) return 'accessibilityLabel="Đang tải dữ liệu bản đồ"';
  return match;
});

// Remove refreshing block
const search1 = text.indexOf("{normalizedStatus === 'refreshing' ? (");
if (search1 !== -1) {
  let startIdx = text.lastIndexOf('      ', search1);
  if (startIdx === -1) startIdx = search1;
  const endSearch = ") : null}";
  let endIdx = text.indexOf(endSearch, search1);
  if (endIdx !== -1) {
    let finalEnd = text.indexOf('\n', endIdx);
    if (finalEnd === -1) finalEnd = endIdx + endSearch.length;
    else finalEnd += 1;
    text = text.slice(0, startIdx) + text.slice(finalEnd);
  }
}

// Remove background error clearing which was:
// The current background error path clears places.
// wait, that's in useExploreDiscovery.ts.

fs.writeFileSync(file, text);
console.log('Fixed ExploreScreen encoding and removed refreshing block');
