const fs = require('fs');
const xml = fs.readFileSync('android-current.xml', 'utf8');
const regex = /text="([^"]+)"/g;
let match;
const texts = [];
while ((match = regex.exec(xml)) !== null) {
  if (match[1].trim()) texts.push(match[1]);
}
console.log(texts.join(' | '));
