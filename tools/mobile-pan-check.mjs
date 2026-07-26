// Browser regression check for touch/pointer-driven camera panning.
// Requires a local static server on 8033 and Chrome CDP on 9223.
const CDP_PORT = Number(process.env.CDP_PORT || 9223);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8033/?mobile-pan-check=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Could not open CDP target: ${response.status}`);
  return response.json();
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const pageErrors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) {
      if (message.method === 'Runtime.exceptionThrown') pageErrors.push(JSON.stringify(message.params.exceptionDetails));
      if (message.method === 'Debugger.scriptFailedToParse') pageErrors.push(`parse:${JSON.stringify(message.params)}`);
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') pageErrors.push(message.params.entry.text);
      return;
    }
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { ws, ready, send, pageErrors };
}

const target = await openTarget('about:blank');
const { ws, ready, send, pageErrors } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Debugger.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await send('Page.navigate', { url: APP_URL });
for (let attempt = 0; attempt < 20; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const ready = await send('Runtime.evaluate', { expression: 'typeof window.__resetMatch', returnByValue: true });
  if (ready.result.value === 'function') break;
  if (attempt === 19) throw new Error(`Game module did not initialize: ${ready.result.value}; page errors: ${JSON.stringify(pageErrors)}`);
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}

await evaluate(`window.__resetMatch('medium'); window.__camera.zoom = 0.7; window.__camera.x = 900;`);
await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 17, x: 300, y: 200 }] });
await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 17, x: 120, y: 200 }] });
await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

const touchResult = await evaluate(`(() => {
  window.__forceTicks(1);
  const canvas = document.querySelector('#game');
  return {
    before: 900,
    after: window.__camera.x,
    touchAction: getComputedStyle(canvas).touchAction,
    viewport: document.querySelector('meta[name="viewport"]')?.content ?? null,
  };
})()`);

await evaluate(`window.__camera.x = 900;`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 300, y: 200, button: 'left', buttons: 1, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 120, y: 200, button: 'left', buttons: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 120, y: 200, button: 'left', buttons: 0, clickCount: 1 });
const mouseAfter = await evaluate(`window.__forceTicks(1); window.__camera.x`);

const result = { ...touchResult, mouseAfter, pageErrors };

ws.close();
if (!(result.after < result.before)) throw new Error(`Touch drag did not pan camera: ${JSON.stringify(result)}`);
if (!(result.mouseAfter < result.before)) throw new Error(`Mouse drag regressed: ${JSON.stringify(result)}`);
if (result.touchAction !== 'none') throw new Error(`Canvas must disable browser touch gestures: ${JSON.stringify(result)}`);
if (!result.viewport) throw new Error(`Missing mobile viewport meta tag: ${JSON.stringify(result)}`);
if (result.pageErrors.length) throw new Error(`Browser reported errors: ${JSON.stringify(result)}`);
console.log(JSON.stringify(result, null, 2));
