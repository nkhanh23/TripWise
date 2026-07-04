import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PBF_URL = 'https://download.geofabrik.de/asia/vietnam-latest.osm.pbf';
const OUTPUT = path.resolve('data/vietnam-latest.osm.pbf');

function followRedirect(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, { headers: { 'User-Agent': 'TripWise/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).href;
        console.log(`Redirecting to ${next}`);
        followRedirect(next, redirects + 1).then(resolve, reject);
      } else if (res.statusCode === 200) {
        resolve(res);
      } else {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
    }).on('error', reject);
  });
}

async function download() {
  console.log(`Downloading ${PBF_URL} ...`);
  const res = await followRedirect(PBF_URL);
  const total = parseInt(res.headers['content-length'], 10);
  console.log(`File size: ${(total / 1024 / 1024).toFixed(1)} MB`);

  const ws = fs.createWriteStream(OUTPUT);
  let downloaded = 0;
  let lastLog = 0;

  res.on('data', (chunk) => {
    downloaded += chunk.length;
    const pct = (downloaded / total * 100).toFixed(1);
    const now = Date.now();
    if (now - lastLog >= 5000) {
      console.log(`Progress: ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB / ${(total / 1024 / 1024).toFixed(1)} MB)`);
      lastLog = now;
    }
  });

  res.pipe(ws);

  return new Promise((resolve, reject) => {
    ws.on('finish', resolve);
    ws.on('error', reject);
    res.on('error', reject);
  });
}

download()
  .then(() => console.log(`\nDone! Saved to ${OUTPUT}`))
  .catch((err) => { console.error(`Download failed: ${err.message}`); process.exit(1); });
