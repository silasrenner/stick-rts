// Mobile regression check. Requires a local server on 8034 and Chrome CDP on 9223.
const CDP_PORT = Number(process.env.CDP_PORT || 9223);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8034/?mobile-ux-check=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not open CDP target: ${response.status}`);
  return response.json();
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (!message.id) { if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); return; } const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); };
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
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function load(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
  await send('Page.navigate', { url: APP_URL });
  for (let i = 0; i < 20; i++) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') return; }
  throw new Error('Game did not initialize');
}

await load(390, 844);
const portrait = await evaluate(`(() => ({ rotate: getComputedStyle(document.querySelector('#rotate-device')).display, canvas: getComputedStyle(document.querySelector('#game-shell')).visibility }))()`);
if (portrait.rotate === 'none' || portrait.canvas !== 'hidden') throw new Error(`Portrait must show rotation guidance: ${JSON.stringify(portrait)}`);

await load(844, 390);
const landscape = await evaluate(`(() => { const canvas = document.querySelector('#game'); const rect = canvas.getBoundingClientRect(); return { rotate: getComputedStyle(document.querySelector('#rotate-device')).display, width: rect.width, height: rect.height, ratio: rect.width / rect.height }; })()`);
if (landscape.rotate !== 'none' || landscape.width > 844 || Math.abs(landscape.ratio - 1400 / 540) > 0.02) throw new Error(`Landscape canvas is not fitted correctly: ${JSON.stringify(landscape)}`);

await evaluate(`window.__resetMatch('medium'); window.__camera.x = 900; window.__camera.targetX = 900; window.__camera.zoom = 0.7;`);
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: 550, y: 180 }, { id: 2, x: 650, y: 180 }] });
await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x: 500, y: 180 }, { id: 2, x: 700, y: 180 }] });
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const gesture = await evaluate(`window.__forceTicks(10); ({ x: window.__camera.x, zoom: window.__camera.zoom })`);
ws.close();
if (!(gesture.x !== 900 && gesture.zoom > 0.7)) throw new Error(`Pinch gesture did not update the camera: ${JSON.stringify(gesture)}`);
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ portrait, landscape, gesture }, null, 2));
