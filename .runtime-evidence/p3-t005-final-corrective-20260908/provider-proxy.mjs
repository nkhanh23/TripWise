// Device-only CONNECT tunnel. No TLS decryption, headers, tokens or payload capture.
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
const root = new URL('./', import.meta.url);
const log = row => {
  const line = JSON.stringify({ at: new Date().toISOString(), ...row }) + '\n';
  fs.appendFileSync(new URL('provider-tunnel.jsonl', root), line);
  fs.appendFileSync(new URL('provider-only-tunnel.jsonl', root), line);
};
const server = http.createServer((req, res) => {
  const url = new URL(req.url);
  if (!['127.0.0.1', 'localhost', '10.0.2.2', '172.30.240.1'].includes(url.hostname) && !url.hostname.startsWith('192.168.')) { res.writeHead(502); res.end(); return; }
  const forward = http.request({hostname: '127.0.0.1', port: url.port || 8081, path: url.pathname + url.search, method: req.method, headers: req.headers}, upstream => {
    res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
  });
  forward.on('error', () => { res.writeHead(502); res.end(); });
  req.pipe(forward);
});
server.on('connect', (req, client, head) => {
  const [host, port] = req.url.split(':');
  client.on('error', () => {});
  if (host === 'open.er-api.com' && fs.existsSync(new URL('provider-block.enabled', root))) {
    log({ host, action: 'provider-only-reject', status: 502 });
    client.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n');
    return;
  }
  const upstream = net.connect(Number(port) || 443, host, () => {
    log({ host, action: 'tunnel-connected' });
    client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
    if (head.length) upstream.write(head);
    upstream.pipe(client); client.pipe(upstream);
  });
  upstream.on('error', e => { log({ host, action: 'upstream-error', code: e.code }); client.destroy(); });
  client.on('close', () => upstream.destroy());
});
server.listen(8899, '127.0.0.1', () => console.log('Provider test tunnel ready on 8899'));
fs.writeFileSync(new URL('proxy-process-id.txt', root), String(process.pid));
