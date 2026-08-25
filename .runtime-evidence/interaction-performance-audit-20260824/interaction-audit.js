const fs = require('fs');
const net = require('net');
const path = require('path');

const SERIAL = 'emulator-5554';
const PACKAGE = 'com.anonymous.tripwisemobile';

function adbFrame(command) {
  return Buffer.from(`${Buffer.byteLength(command).toString(16).padStart(4, '0')}${command}`, 'ascii');
}

function readExactly(socket, length) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const onData = (chunk) => {
      chunks.push(chunk);
      size += chunk.length;
      if (size < length) return;
      cleanup();
      const all = Buffer.concat(chunks);
      if (all.length > length) socket.unshift(all.subarray(length));
      resolve(all.subarray(0, length));
    };
    const onEnd = () => { cleanup(); reject(new Error('ADB socket ended early')); };
    const onError = (error) => { cleanup(); reject(error); };
    const cleanup = () => {
      socket.off('data', onData);
      socket.off('end', onEnd);
      socket.off('error', onError);
    };
    socket.on('data', onData);
    socket.on('end', onEnd);
    socket.on('error', onError);
  });
}

async function sendService(socket, service) {
  socket.write(adbFrame(service));
  const status = (await readExactly(socket, 4)).toString('ascii');
  if (status !== 'OKAY') throw new Error(`ADB ${service} returned ${status}`);
}

async function adbExec(command) {
  const socket = net.createConnection(5037, '127.0.0.1');
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

async function openEventStream(durationSeconds) {
  const socket = net.createConnection(5037, '127.0.0.1');
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });
  await sendService(socket, `host:transport:${SERIAL}`);
  await sendService(socket, `exec:timeout ${durationSeconds} uiautomator events 2>&1`);
  const chunks = [];
  const complete = (async () => {
    for await (const chunk of socket) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
  })();
  return { complete };
}

function parseEvents(raw) {
  return raw.split(/\r?\n/).filter(Boolean).map((line) => {
    const eventType = line.match(/EventType: ([^;]+)/)?.[1] ?? null;
    const eventTime = Number(line.match(/EventTime: (\d+)/)?.[1] ?? NaN);
    const text = line.match(/Text: \[([^\]]*)\]/)?.[1] ?? null;
    const contentDescription = line.match(/ContentDescription: ([^;]+)/)?.[1] ?? null;
    return { eventType, eventTime, text, contentDescription, raw: line };
  });
}

async function probe(name, x, y, durationSeconds = 6) {
  const output = path.resolve(__dirname, name);
  fs.mkdirSync(output, { recursive: true });
  await adbExec(`dumpsys gfxinfo ${PACKAGE} reset`);
  const beforeUptime = Number((await adbExec('cat /proc/uptime')).toString('utf8').split(' ')[0]) * 1000;
  const events = await openEventStream(durationSeconds);
  await new Promise((resolve) => setTimeout(resolve, 350));
  const tapHostStart = performance.now();
  await adbExec(`input tap ${x} ${y}`);
  const tapHostEnd = performance.now();
  const afterTapUptime = Number((await adbExec('cat /proc/uptime')).toString('utf8').split(' ')[0]) * 1000;
  const rawEvents = await events.complete;
  const hierarchy = (await adbExec('uiautomator dump /dev/tty 2>/dev/null')).toString('utf8');
  const gfxinfo = (await adbExec(`dumpsys gfxinfo ${PACKAGE}`)).toString('utf8');
  const parsedEvents = parseEvents(rawEvents);
  const clickEvent = parsedEvents.find((event) => event.eventType === 'TYPE_VIEW_CLICKED');
  const firstPostTapEvent = parsedEvents.find((event) => Number.isFinite(event.eventTime) && event.eventTime >= beforeUptime);
  const report = {
    name,
    device: SERIAL,
    capturedAt: new Date().toISOString(),
    coordinates: { x, y },
    beforeUptimeMs: beforeUptime,
    afterTapUptimeMs: afterTapUptime,
    tapCommandDurationMs: tapHostEnd - tapHostStart,
    clickEvent,
    firstPostTapEvent,
    events: parsedEvents,
    hierarchyTexts: [...hierarchy.matchAll(/(?:text|content-desc)="([^"]+)"/g)]
      .map((match) => match[1]).filter(Boolean),
  };
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(output, 'events.txt'), rawEvents);
  fs.writeFileSync(path.join(output, 'hierarchy.xml'), hierarchy);
  fs.writeFileSync(path.join(output, 'gfxinfo.txt'), gfxinfo);
  process.stdout.write(JSON.stringify({ output, eventCount: parsedEvents.length, tapCommandDurationMs: report.tapCommandDurationMs }));
}

async function benchmarkCapture() {
  const results = [];
  for (const command of ['screencap', 'screencap -p']) {
    const startedAt = performance.now();
    const output = await adbExec(command);
    results.push({ command, durationMs: performance.now() - startedAt, bytes: output.length });
  }
  process.stdout.write(JSON.stringify(results));
}

async function shell(command) {
  process.stdout.write(await adbExec(command));
}

function parseLatency(raw) {
  return raw.trim().split(/\r?\n/).slice(1).map((line) => {
    const [desired, actual, ready] = line.trim().split(/\s+/).map(Number);
    return { desired, actual, ready };
  }).filter((frame) => Number.isFinite(frame.actual) && frame.actual > 0);
}

async function findMainLayer() {
  const layers = (await adbExec('dumpsys SurfaceFlinger --list')).toString('utf8');
  const match = layers.match(/VRI-com\.anonymous\.tripwisemobile\/com\.anonymous\.tripwisemobile\.MainActivity#\d+/);
  if (!match) throw new Error('MainActivity VRI layer not found');
  return match[0];
}

async function surfaceSample(layer, x, y) {
  await adbExec(`dumpsys SurfaceFlinger --latency-clear '${layer}'`);
  await new Promise((resolve) => setTimeout(resolve, 250));
  const bracketRaw = (await adbExec(`sh -c 'cat /proc/uptime; input tap ${x} ${y}; cat /proc/uptime'`)).toString('utf8');
  const uptimeLines = bracketRaw.trim().split(/\r?\n/);
  const beforeTapMs = Number(uptimeLines[0]?.split(/\s+/)[0]) * 1000;
  const afterTapMs = Number(uptimeLines[1]?.split(/\s+/)[0]) * 1000;
  await new Promise((resolve) => setTimeout(resolve, 900));
  const latencyRaw = (await adbExec(`dumpsys SurfaceFlinger --latency '${layer}'`)).toString('utf8');
  const frames = parseLatency(latencyRaw);
  const tapEstimateMs = (beforeTapMs + afterTapMs) / 2;
  const firstPresented = frames.find((frame) => frame.actual / 1e6 >= beforeTapMs);
  return {
    coordinates: { x, y }, beforeTapMs, afterTapMs,
    tapBracketMs: afterTapMs - beforeTapMs,
    firstPresentedNs: firstPresented?.actual ?? null,
    tapToFirstPresentedEstimateMs: firstPresented ? firstPresented.actual / 1e6 - tapEstimateMs : null,
    tapToFirstPresentedBoundsMs: firstPresented
      ? { min: Math.max(0, firstPresented.actual / 1e6 - afterTapMs), max: firstPresented.actual / 1e6 - beforeTapMs }
      : null,
    presentedFrameCount: frames.length,
  };
}

async function surfaceSequence(name, x1, y1, x2, y2, pairs = 5) {
  const output = path.resolve(__dirname, name);
  fs.mkdirSync(output, { recursive: true });
  const layer = await findMainLayer();
  const samples = [];
  for (let index = 0; index < pairs; index += 1) {
    samples.push({ direction: 'A', index: index + 1, ...(await surfaceSample(layer, x1, y1)) });
    samples.push({ direction: 'B', index: index + 1, ...(await surfaceSample(layer, x2, y2)) });
  }
  const report = { name, capturedAt: new Date().toISOString(), layer, pairs, samples };
  fs.writeFileSync(path.join(output, 'surfaceflinger.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report));
}

async function snapshot(name, x, y, waitMs = 1200) {
  const output = path.resolve(__dirname, 'runtime-snapshots');
  fs.mkdirSync(output, { recursive: true });
  await adbExec(`input tap ${x} ${y}`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  const hierarchy = (await adbExec('uiautomator dump /dev/tty 2>/dev/null')).toString('utf8');
  const texts = [...hierarchy.matchAll(/(?:text|content-desc)="([^"]+)"/g)]
    .map((match) => match[1]).filter(Boolean);
  const report = { name, capturedAt: new Date().toISOString(), coordinates: { x, y }, texts };
  fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(output, `${name}.xml`), hierarchy);
  process.stdout.write(JSON.stringify(report));
}

const [command, name, x, y, duration] = process.argv.slice(2);
const action = command === 'probe'
  ? (!name || !x || !y
      ? Promise.reject(new Error('Usage: node interaction-audit.js probe <name> <x> <y> [durationSeconds]'))
      : probe(name, Number(x), Number(y), duration ? Number(duration) : 6))
  : command === 'benchmark-capture'
    ? benchmarkCapture()
    : command === 'shell'
      ? shell(process.argv.slice(3).join(' '))
      : command === 'sf-sequence'
        ? surfaceSequence(name, Number(x), Number(y), Number(duration), Number(process.argv[7]), Number(process.argv[8] ?? 5))
        : command === 'snapshot'
          ? snapshot(name, Number(x), Number(y), Number(duration ?? 1200))
          : Promise.reject(new Error('Expected probe, benchmark-capture, shell, sf-sequence, or snapshot command'));
action.catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
