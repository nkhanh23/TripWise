import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'data', 'vietnam-places.ndjson');

const lines = [];
const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
});

rl.on('line', (line) => {
  lines.push(line);
  if (lines.length >= 3) rl.close();
});

rl.on('close', () => {
  for (const l of lines) {
    const r = JSON.parse(l);
    console.log(JSON.stringify({
      name: r.name,
      province: r.province,
      city: r.city,
      rawTags: r.rawTags,
      lat: r.latitude?.toFixed(4),
      lng: r.longitude?.toFixed(4),
    }, null, 2));
    console.log('---');
  }
  const size = fs.statSync(filePath).size;
  console.log(`File size: ${(size / 1024 / 1024).toFixed(1)} MB`);
});

rl.on('error', (err) => console.error(err));
