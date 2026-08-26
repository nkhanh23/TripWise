const fs = require('fs');
function fixTrailing(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/[ \\t]+(\\r?\\n)/g, '$1');
  fs.writeFileSync(file, content);
}
fixTrailing('src/features/auth/AuthProvider.tsx');
fixTrailing('tests/AuthProvider.test.tsx');
console.log('Fixed trailing spaces');
