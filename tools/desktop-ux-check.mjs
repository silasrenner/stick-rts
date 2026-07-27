// Desktop regression check. Requires a local server on 8034 and Chrome CDP on 9223.
const CDP_PORT = Number(process.env.CDP_PORT || 9223);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8034/?desktop-ux-check=${Date.now()}`;
async function openTarget(url) { const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (!response.ok) throw new Error(`CDP target failed: ${response.status}`); return response.json(); }
function connect(url) { const ws = new WebSocket(url); let id = 0; const pending = new Map(); const errors = []; ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (!message.id) { if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); return; } const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }; const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; }); const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }); return { ws, ready, send, errors }; }
const target = await openTarget('about:blank'); const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl); await ready;
await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
async function evaluate(code) { const result = await send('Runtime.evaluate', { expression: code, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
for (let i = 0; i < 30; i++) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') break; if (i === 29) throw new Error('Game did not initialize'); }
const surface = await evaluate(`(() => { const r = document.querySelector('#game').getBoundingClientRect(); return { width: r.width, height: r.height, overlay: getComputedStyle(document.querySelector('#rotate-device')).display }; })()`);
if (surface.width !== 1400 || surface.height !== 540 || surface.overlay !== 'none') throw new Error(`Desktop surface regressed: ${JSON.stringify(surface)}`);
const resetStates = await evaluate(`(() => { window.__camera.x = 777; window.__camera.targetX = 777; window.__startWatchAiMatch('easy', 'hard', 1); const watch = { x: window.__camera.x, targetX: window.__camera.targetX }; window.__camera.x = 555; window.__camera.targetX = 555; window.__backToMenu(); return { watch, menu: { x: window.__camera.x, targetX: window.__camera.targetX } }; })()`);
if (resetStates.watch.x !== 0 || resetStates.watch.targetX !== 0 || resetStates.menu.x !== 0 || resetStates.menu.targetX !== 0) throw new Error(`Camera reset leaked between game modes: ${JSON.stringify(resetStates)}`);
await evaluate(`window.__startWatchAiMatch('easy', 'hard', 1)`);
const speedLabels = [];
for (let i = 0; i < 5; i += 1) {
  speedLabels.push(await evaluate('window.__uiState.watchSpeed'));
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1290, y: 28, button: 'left', buttons: 1, clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1290, y: 28, button: 'left', buttons: 0, clickCount: 1 });
}
if (speedLabels.join(',') !== '1,5,10,20,1') throw new Error(`Watch speed must cycle 1→5→10→20→1: ${speedLabels}`);
await evaluate(`window.__resetMatch('medium'); window.__camera.x = 900; window.__camera.targetX = 900; window.__camera.zoom = 0.7;`);
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 900, y: 200, button: 'left', buttons: 1, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 700, y: 200, button: 'left', buttons: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 200, button: 'left', buttons: 0, clickCount: 1 });
const pan = await evaluate(`window.__forceTicks(1); ({ x: window.__camera.x, targetX: window.__camera.targetX })`);
if (!(pan.targetX < 900 && pan.x < 900 && pan.x > pan.targetX)) throw new Error(`Desktop pan must be smoothly settling: ${JSON.stringify(pan)}`);
const zoomBefore = await evaluate('window.__camera.zoom');
await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 700, y: 200, deltaY: -120, deltaX: 0 });
const zoomAfterWheel = await evaluate('window.__camera.zoom');
if (!(zoomAfterWheel > zoomBefore)) throw new Error(`Desktop wheel zoom regressed: ${JSON.stringify({ zoomBefore, zoomAfterWheel })}`);
const buttonZoomBefore = await evaluate('window.__camera.zoom');
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1373, y: 27, button: 'left', buttons: 1, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1373, y: 27, button: 'left', buttons: 0, clickCount: 1 });
const buttonZoomAfter = await evaluate('window.__camera.zoom');
ws.close();
if (!(buttonZoomAfter > buttonZoomBefore)) throw new Error(`Desktop + zoom button regressed: ${JSON.stringify({ buttonZoomBefore, buttonZoomAfter })}`);
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ surface, resetStates, pan, zoomBefore, zoomAfterWheel, buttonZoomBefore, buttonZoomAfter }, null, 2));
