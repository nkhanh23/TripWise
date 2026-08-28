const fs = require('fs');
const text = fs.readFileSync('mobile/test_output.txt', 'utf16le');
console.log(text.includes("success { category: 'restaurant'"));
