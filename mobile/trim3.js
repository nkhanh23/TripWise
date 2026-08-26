const fs = require('fs');
function fixTrailing(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/^[ \\t]+$/gm, '');
  content = content.replace(/[ \\t]+$/gm, '');
  fs.writeFileSync(file, content);
}
fixTrailing('src/features/auth/AuthProvider.tsx');
fixTrailing('tests/AuthProvider.test.tsx');
console.log('Fixed trailing spaces aggressively');
