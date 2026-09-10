const fs = require('fs');
const xml = fs.readFileSync('android-current.xml', 'utf8');
const regex = /content-desc="([^"]*)"[^>]*bounds="([^"]+)"/g;
let match;
while ((match = regex.exec(xml)) !== null) {
  if (match[1]) console.log(`${match[1]} => ${match[2]}`);
}
