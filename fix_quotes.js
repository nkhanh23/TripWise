const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');

text = text.replace('accessibilityLabel="Thử lại tải dữ liệu bản đồ""', 'accessibilityLabel="Thử lại tải dữ liệu bản đồ"');
text = text.replace('accessibilityHint="Thử tải lại dữ liệu địa điểm""', 'accessibilityHint="Thử tải lại dữ liệu địa điểm"');

fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
console.log('Fixed double quotes');
