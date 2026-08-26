const fs = require('fs');

function trimTrailing(file) {
  const code = fs.readFileSync(file, 'utf8');
  const lines = code.split('\\n').map(l => l.trimEnd());
  fs.writeFileSync(file, lines.join('\\n'));
}

trimTrailing('src/features/auth/AuthProvider.tsx');
trimTrailing('tests/AuthProvider.test.tsx');
console.log('Done');
