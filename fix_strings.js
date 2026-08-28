const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace(/accessibilityLabel="[^"]*"/g, (match) => {
  if (match.includes('ang t')) return 'accessibilityLabel="Đang tải dữ liệu bản đồ"';
  if (match.includes('m m')) return 'accessibilityLabel="Đang làm mới dữ liệu bản đồ"';
  if (match.includes('Th')) return 'accessibilityLabel="Thử lại tải dữ liệu bản đồ"';
  return match;
});

text = text.replace(/accessibilityHint="[^"]*"/g, (match) => {
  if (match.includes('Th')) return 'accessibilityHint="Thử tải lại dữ liệu địa điểm"';
  return match;
});

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed strings');
