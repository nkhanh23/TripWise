import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const WebSocket = require('ws');
const pages = await (await fetch('http://localhost:8081/json/list')).json();
const page = pages.find(p => p.appId === 'com.anonymous.tripwisemobile');
if (!page) throw new Error('Android runtime unavailable');
const socket = new WebSocket(page.webSocketDebuggerUrl.replace('localhost', '127.0.0.1'), { origin: 'http://127.0.0.1:8081' });
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let id = 0;
const pending = new Map();
socket.onclose = e => console.error('SOCKET_CLOSED', e.code, e.reason);
socket.onmessage = e => {
  const m = JSON.parse(e.data);
  if (process.env.CDP_DIAGNOSTIC) console.error(JSON.stringify({id:m.id, method:m.method, error:m.error}));
  if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params) {
  return new Promise(resolve => { pending.set(++id, resolve); socket.send(JSON.stringify({ id, method, params })); });
}
const expression = fs.readFileSync(process.argv[2], 'utf8');
const timer = setTimeout(() => { console.error('CDP_TIMEOUT'); socket.close(); process.exit(2); }, 20000);
console.error('SOCKET_OPEN', socket.readyState);

void send('Runtime.enable', {});


const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
console.log(JSON.stringify(result));
clearTimeout(timer);
socket.close();
