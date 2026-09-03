import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9445);
const APP_URL = process.env.APP_URL || 'http://192.168.86.75:8813/?review=pause-guide-navigation';

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
await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });
const evaluate = async (expression) => { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
for (let i = 0; i < 30; i += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') break; if (i === 29) throw new Error('Game did not initialize.'); }

await evaluate(`window.__resetMatch('medium'); window.__guideText = []; window.__guideOriginalFillText = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { if (window.__uiState.paused && window.__uiState.guideOpen) window.__guideText.push(String(text)); return window.__guideOriginalFillText.call(this, text, ...args); };`);
const click = (x, y) => send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }).then(() => send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }));
// Pause -> Guide -> Escape must return to paused landing, then close/reopen pause must still land there.
await click(1307, 24);
if (JSON.stringify(await evaluate('({ paused: window.__uiState.paused, guideOpen: window.__uiState.guideOpen })')) !== JSON.stringify({ paused: true, guideOpen: false })) throw new Error('Opening pause must show its landing page.');
await click(700, 377);
if (JSON.stringify(await evaluate('({ paused: window.__uiState.paused, guideOpen: window.__uiState.guideOpen })')) !== JSON.stringify({ paused: true, guideOpen: true })) throw new Error('Game Guide click did not enter the paused guide.');
await new Promise((resolve) => setTimeout(resolve, 120));
const guideText = await evaluate('window.__guideText');
if (!guideText.includes('Vision & scouting') || guideText.includes('BLUE VISION') || guideText.includes('UNSEEN RED')) throw new Error(`Guide legend contract failed: ${JSON.stringify(guideText)}`);
mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(join('artifacts', 'screenshots', 'pause-guide-clean-browser.png'), screenshot.data, 'base64');
await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
if (JSON.stringify(await evaluate('({ paused: window.__uiState.paused, guideOpen: window.__uiState.guideOpen })')) !== JSON.stringify({ paused: true, guideOpen: false })) throw new Error('Escape from guide must return to paused landing.');
await click(1307, 24); await click(1307, 24);
if (JSON.stringify(await evaluate('({ paused: window.__uiState.paused, guideOpen: window.__uiState.guideOpen })')) !== JSON.stringify({ paused: true, guideOpen: false })) throw new Error('Reopening pause must reset to paused landing.');
await evaluate('CanvasRenderingContext2D.prototype.fillText = window.__guideOriginalFillText; delete window.__guideOriginalFillText;');
ws.close();
if (errors.length) throw new Error(`Browser runtime errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ appUrl: APP_URL, guideText, screenshotPath: 'artifacts/screenshots/pause-guide-clean-browser.png' }, null, 2));
