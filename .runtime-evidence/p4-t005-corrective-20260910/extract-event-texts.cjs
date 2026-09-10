const fs = require('fs');
const xml = fs.readFileSync('android-event-preview-vi-dark.xml', 'utf8');
const regex = /(?:text|content-desc)="([^"]+)"/g;
let match;
const texts = [];
while ((match = regex.exec(xml)) !== null) {
  if (match[1].trim() && !texts.includes(match[1].trim())) texts.push(match[1].trim());
}
console.log(texts.slice(0, 25).join(' | '));
