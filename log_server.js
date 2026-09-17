const http = require('http');
const fs = require('fs');

fs.writeFileSync('native_logs.txt', '');

const server = http.createServer((req, res) => {
  if (req.url === '/log' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const line = payload.tag + ': ' + JSON.stringify(payload.data) + '\n';
        fs.appendFileSync('native_logs.txt', line);
      } catch(e) {}
      res.writeHead(200);
      res.end('ok');
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3000, '0.0.0.0', () => {
  console.log('Log server listening on port 3000');
});
