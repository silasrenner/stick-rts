import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9225);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8812/?match-telemetry-browser-check=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target failed: ${response.status}`);
  return response.json();
}
function connect(url) {
  const ws = new WebSocket(url); let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (!message.id) { if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); return; } const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); });
  return { ws, ready, send, errors };
}
const target = await openTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
await ready; await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const original = CanvasRenderingContext2D.prototype.fillText; window.__telemetryText = []; CanvasRenderingContext2D.prototype.fillText = function(text, ...rest) { window.__telemetryText.push(String(text)); return original.call(this, text, ...rest); }; })()` });
await send('Page.navigate', { url: APP_URL });
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
async function click(x, y) { for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); }
for (let i = 0; i < 30; i += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') break; if (i === 29) throw new Error('Game did not initialize'); }
await evaluate(`window.__telemetryText = []; const originalFillText = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function(text, ...rest) { window.__telemetryText.push(String(text)); return originalFillText.call(this, text, ...rest); }; window.__resetMatch('medium'); window.__world.teams.player.losses = 2; window.__world.teams.ai.losses = 5; window.__world.teams.player.goldSpent = 100; window.__world.matchElapsedTime = 625;`);
await new Promise((resolve) => setTimeout(resolve, 100));
const telemetry = await evaluate(`window.__telemetryText.slice(-500)`);
for (const label of ['BLUE 5', '2 RED', '02:05']) if (!telemetry.includes(label)) throw new Error(`Player-vs-AI telemetry missing ${label}: ${JSON.stringify(telemetry.slice(-80))}`);
await click(1307, 24);
if (!await evaluate('window.__uiState.paused')) throw new Error('Top-right Player-vs-AI pause button did not pause');
await click(1307, 24);
if (await evaluate('window.__uiState.paused')) throw new Error('Top-right Player-vs-AI pause button did not resume');
const zoomBefore = await evaluate('window.__camera.zoom');
await click(1375, 27);
const zoomAfter = await evaluate('window.__camera.zoom');
if (!(zoomAfter > zoomBefore)) throw new Error(`Zoom-in adjacent to Player-vs-AI pause regressed: ${JSON.stringify({ zoomBefore, zoomAfter })}`);
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
const screenshotPath = join('artifacts', 'screenshots', 'player-telemetry-kills-browser.png');
mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ appUrl: APP_URL, telemetry: ['BLUE 5', '02:05', '2 RED'], pause: 'passed', zoom: { zoomBefore, zoomAfter }, screenshotPath }, null, 2));
