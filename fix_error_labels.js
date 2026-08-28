const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(/accessibilityHint=".*?"/g, (match) => {
  if (match.includes('i d')) return 'accessibilityHint="Thử tải lại dữ liệu địa điểm"';
  return match;
});

text = text.replace(/accessibilityLabel=".*?"/g, (match) => {
  if (match.includes('i t')) return 'accessibilityLabel="Thử lại tải dữ liệu bản đồ"';
  return match;
});

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed backgroundError labels');
