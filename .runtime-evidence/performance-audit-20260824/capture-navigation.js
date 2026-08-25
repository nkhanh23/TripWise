const fs = require('fs');
const net = require('net');
const path = require('path');
const WebSocket = require('../../mobile/node_modules/ws');

const SERIAL = 'emulator-5554';
const ADB_HOST = '127.0.0.1';
const ADB_PORT = 5037;

function frame(command) {
  return Buffer.from(`${Buffer.byteLength(command).toString(16).padStart(4, '0')}${command}`, 'ascii');
}

function readExactly(socket, length) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    function onData(chunk) {
      chunks.push(chunk);
      total += chunk.length;
      if (total < length) return;
      cleanup();
      const all = Buffer.concat(chunks);
      if (all.length > length) socket.unshift(all.subarray(length));
      resolve(all.subarray(0, length));
    }
    function onError(error) { cleanup(); reject(error); }
    function onEnd() { cleanup(); reject(new Error(`ADB closed before ${length} bytes`)); }
    function cleanup() {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('end', onEnd);
    }
    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('end', onEnd);
  });
}

async function sendService(socket, service) {
  socket.write(frame(service));
  const status = (await readExactly(socket, 4)).toString('ascii');
  if (status !== 'OKAY') throw new Error(`ADB ${service} returned ${status}`);
}

async function adbExec(command) {
  const socket = net.createConnection({ host: ADB_HOST, port: ADB_PORT });
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  await sendService(socket, `host:transport:${SERIAL}`);
  await sendService(socket, `exec:${command}`);
  const chunks = [];
  for await (const chunk of socket) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function findInspector() {
  const response = await fetch('http://127.0.0.1:8081/json/list');
  const targets = await response.json();
  const target = targets.find((item) => item.appId === 'com.anonymous.tripwisemobile');
  if (!target) throw new Error('TripWise Hermes inspector target not found');
  return target.webSocketDebuggerUrl;
}

async function capture({ name, tapX, tapY, durationMs = 5000, intervalMs = 100 }) {
  const outputDir = path.resolve(__dirname, name);
  fs.mkdirSync(outputDir, { recursive: true });
  const network = [];
  const protocolMessages = [];
  const ws = new WebSocket(await findInspector(), { origin: 'http://localhost:8081' });
  let messageId = 0;
  const pending = new Map();
  let runtimeResultId = null;
  let runtimeResult = null;
  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
  ws.on('close', (code, reason) => {
    if (pending.size > 0) {
      const error = new Error(`Hermes inspector closed (${code} ${reason.toString()})`);
      for (const { reject } of pending.values()) reject(error);
      pending.clear();
    }
  });
  ws.on('error', (error) => {
    for (const { reject } of pending.values()) reject(error);
    pending.clear();
  });
  ws.on('message', (raw) => {
    const event = JSON.parse(raw.toString());
    protocolMessages.push(event.id ? { id: event.id, error: event.error?.message } : { method: event.method });
    if (event.id === runtimeResultId) runtimeResult = event.result;
    if (event.id && pending.has(event.id)) {
      const { resolve, reject } = pending.get(event.id);
      pending.delete(event.id);
      if (event.error) reject(new Error(event.error.message));
      else resolve(event.result);
      return;
    }
    if (event.method === 'Network.requestWillBeSent') {
      network.push({
        kind: 'request',
        requestId: event.params.requestId,
        timestamp: event.params.timestamp,
        method: event.params.request.method,
        url: event.params.request.url,
      });
    } else if (event.method === 'Network.responseReceived') {
      network.push({
        kind: 'response',
        requestId: event.params.requestId,
        timestamp: event.params.timestamp,
        status: event.params.response.status,
        url: event.params.response.url,
      });
    } else if (event.method === 'Network.loadingFinished') {
      network.push({ kind: 'finished', requestId: event.params.requestId, timestamp: event.params.timestamp });
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.send(JSON.stringify({ id: ++messageId, method: 'Network.enable', params: {} }));
  ws.send(JSON.stringify({ id: ++messageId, method: 'Runtime.enable', params: {} }));
  ws.send(JSON.stringify({ id: ++messageId, method: 'Runtime.evaluate', params: {
    expression: `(() => {
      if (globalThis.__tripwisePerfSampler) clearInterval(globalThis.__tripwisePerfSampler);
      const audit = globalThis.__tripwisePerfAudit = { requests: [], samples: [] };
      const initialHook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      audit.hook = {
        exists: Boolean(initialHook),
        keys: initialHook ? Object.keys(initialHook) : [],
        rendererCount: initialHook?.renderers?.size ?? null,
        hasGetFiberRoots: typeof initialHook?.getFiberRoots === 'function',
      };
      const safeUrl = (value) => {
        try { const url = new URL(String(value)); return url.origin + url.pathname; }
        catch { return String(value).split('?')[0]; }
      };
      if (!globalThis.__tripwiseOriginalFetch) {
        globalThis.__tripwiseOriginalFetch = globalThis.fetch;
        globalThis.fetch = async function(input, init) {
          const startedAt = performance.now();
          const entry = { transport: 'fetch', method: init?.method || input?.method || 'GET', url: safeUrl(input?.url || input), startedAt };
          audit.requests.push(entry);
          try {
            const response = await globalThis.__tripwiseOriginalFetch.apply(this, arguments);
            entry.status = response.status;
            entry.finishedAt = performance.now();
            return response;
          } catch (error) {
            entry.error = error?.name || 'Error';
            entry.finishedAt = performance.now();
            throw error;
          }
        };
      }
      const watched = new Set([
        'HomeScreen', 'HomeUpcomingCard', 'MyTripsScreen', 'TWTripCard', 'PastTripCard',
        'TripDetailScreen', 'TripDetailHero', 'ItineraryCard', 'SavedPlacesScreen',
        'SavedPlaceCard', 'ProfileScreen', 'SettingsScreen', 'ActivityIndicator', 'Image'
      ]);
      let previous = '';
      const sample = () => {
        const hook = globalThis.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        if (!hook?.renderers || !hook?.getFiberRoots) return;
        const counts = {};
        const visit = (fiber) => {
          if (!fiber) return;
          const type = fiber.type;
          const nested = type && typeof type === 'object' ? type.type : null;
          const name = typeof type === 'string' ? type
            : type?.displayName || type?.name || nested?.displayName || nested?.name;
          if (watched.has(name)) counts[name] = (counts[name] || 0) + 1;
          visit(fiber.child);
          visit(fiber.sibling);
        };
        for (const rendererId of hook.renderers.keys()) {
          for (const root of hook.getFiberRoots(rendererId)) visit(root.current);
        }
        const signature = JSON.stringify(counts);
        if (signature !== previous) {
          previous = signature;
          audit.samples.push({ at: performance.now(), counts });
        }
      };
      sample();
      globalThis.__tripwisePerfSampler = setInterval(sample, 10);
      return true;
    })()`,
  } }));
  await new Promise((resolve) => setTimeout(resolve, 150));

  const startedAt = performance.now();
  const frames = [];
  const initial = await adbExec('screencap -p');
  fs.writeFileSync(path.join(outputDir, 'frame-000.png'), initial);
  frames.push({ file: 'frame-000.png', atMs: performance.now() - startedAt });
  const tapStartedAt = performance.now();
  await adbExec(`input tap ${tapX} ${tapY}`);
  const tapCompletedAt = performance.now();
  let index = 1;
  while (performance.now() - tapStartedAt < durationMs) {
    const targetAt = tapStartedAt + index * intervalMs;
    const wait = targetAt - performance.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    const image = await adbExec('screencap -p');
    const file = `frame-${String(index).padStart(3, '0')}.png`;
    fs.writeFileSync(path.join(outputDir, file), image);
    frames.push({ file, atMs: performance.now() - tapStartedAt });
    index += 1;
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  runtimeResultId = ++messageId;
  ws.send(JSON.stringify({ id: runtimeResultId, method: 'Runtime.evaluate', params: {
    expression: 'clearInterval(globalThis.__tripwisePerfSampler); JSON.stringify(globalThis.__tripwisePerfAudit || { requests: [], samples: [] })',
    returnByValue: true,
  } }));
  await new Promise((resolve) => setTimeout(resolve, 500));
  const runtimeAudit = runtimeResult?.result?.value
    ? JSON.parse(runtimeResult.result.value)
    : { requests: [], samples: [] };
  ws.close();
  const report = {
    name,
    device: SERIAL,
    capturedAt: new Date().toISOString(),
    measurement: 'host performance.now + raw ADB smart-socket screencap + Hermes Network domain',
    tap: { x: tapX, y: tapY, commandDurationMs: tapCompletedAt - tapStartedAt },
    frames,
    network,
    protocolMessages,
    runtimeRequests: runtimeAudit.requests,
    runtimeSamples: runtimeAudit.samples,
    runtimeHook: runtimeAudit.hook,
  };
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify({ outputDir, frameCount: frames.length, networkEventCount: network.length }));
}

const [name, x, y, duration, interval] = process.argv.slice(2);
if (!name || !x || !y) {
  throw new Error('Usage: node capture-navigation.js <name> <tapX> <tapY> [durationMs] [intervalMs]');
}
capture({
  name,
  tapX: Number(x),
  tapY: Number(y),
  durationMs: duration ? Number(duration) : undefined,
  intervalMs: interval ? Number(interval) : undefined,
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
