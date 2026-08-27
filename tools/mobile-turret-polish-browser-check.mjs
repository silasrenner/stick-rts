import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9225);
const APP_URL = process.env.APP_URL || `http://192.168.0.83:8813/?mobile-turret-polish=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not open CDP target: ${response.status}`);
  return response.json();
}
function connect(wsUrl) {
  const pending = new Map(); let id = 0; const errors = [];
  const ws = new WebSocket(wsUrl);
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) { if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); return; }
    const request = pending.get(message.id); pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); });
  return { ws, ready, send, errors };
}

const target = await openTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
await send('Emulation.setDeviceMetricsOverride', { width: 844, height: 390, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: APP_URL });
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
for (let i = 0; i < 30; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__resetMatch') === 'function') break;
  if (i === 29) throw new Error('Game did not initialize');
}
await evaluate(`window.__resetMatch('medium'); window.__world.teams.player.productionQueue = [
  { action: 'structure', kind: null, remaining: 10, total: 20 },
  { action: 'turret', kind: null, remaining: 15, total: 15 },
];`);
await new Promise((resolve) => setTimeout(resolve, 150));
const layout = await evaluate(`(() => {
  const canvas = document.querySelector('#game'); const rect = canvas.getBoundingClientRect();
  const pause = { x: 1302, y: 136, w: 90, h: 28 }; const controls = [{ x: 1240, y: 10, w: 112, h: 36 }, { x: 1240, y: 52, w: 112, h: 36 }, { x: 1240, y: 94, w: 112, h: 36 }];
  const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  return { canvas: { width: rect.width, height: rect.height }, paused: window.__uiState.paused, queue: window.__world.teams.player.productionQueue.length, overlap: controls.some((control) => overlaps(pause, control)), pause };
})()`);
if (layout.overlap || layout.queue !== 2) throw new Error(`Mobile layout fixture invalid: ${JSON.stringify(layout)}`);
const rect = await evaluate(`(() => { const r = document.querySelector('#game').getBoundingClientRect(); return { x: r.left + (1347 / 1400) * r.width, y: r.top + (150 / 540) * r.height }; })()`);
for (const type of ['touchStart', 'touchEnd']) await send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchStart' ? [{ id: 1, ...rect }] : [] });
await new Promise((resolve) => setTimeout(resolve, 100));
if (!await evaluate('window.__uiState.paused')) throw new Error('Mobile Pause tap did not pause the Player-vs-AI match.');
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
const screenshotPath = join('artifacts', 'screenshots', 'mobile-turret-polish-browser.png');
mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ appUrl: APP_URL, layout, screenshotPath }, null, 2));
