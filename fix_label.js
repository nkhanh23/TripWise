const fs = require('fs');
let text = fs.readFileSync('mobile/src/features/explore/ExploreScreen.tsx', 'utf8');
const search = 'accessibilityRole="progressbar"';
const lines = text.split('\n');
const progressIdx = lines.findIndex(l => l.includes(search));
if (progressIdx !== -1) {
  lines[progressIdx - 1] = '          accessibilityLabel="Đang tải dữ liệu bản đồ"';
  text = lines.join('\n');
  fs.writeFileSync('mobile/src/features/explore/ExploreScreen.tsx', text);
  console.log('Fixed accessibilityLabel line directly');
}
