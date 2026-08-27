import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9225);
const APP_URL = process.env.APP_URL || `http://127.0.0.1:8812/?target-saturation-browser-check=${Date.now()}`;

async function openTarget(url) { const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' }); if (!response.ok) throw new Error(`CDP target failed: ${response.status}`); return response.json(); }
function connect(url) { const ws = new WebSocket(url); let id = 0; const pending = new Map(); const errors = []; ws.onmessage = ({ data }) => { const message = JSON.parse(data); if (!message.id) { if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); return; } const request = pending.get(message.id); pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }; const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; }); const send = (method, params = {}) => new Promise((resolve, reject) => { const requestId = ++id; pending.set(requestId, { resolve, reject }); ws.send(JSON.stringify({ id: requestId, method, params })); }); return { ws, ready, send, errors }; }
const target = await openTarget('about:blank'); const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl); await ready;
await send('Runtime.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true }); await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url: APP_URL });
async function evaluate(expression) { const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; }
for (let i = 0; i < 30; i += 1) { await new Promise((resolve) => setTimeout(resolve, 100)); if (await evaluate('typeof window.__resetMatch') === 'function') break; if (i === 29) throw new Error('Game did not initialize'); }
const result = await evaluate(`(async () => {
  window.__resetMatch('medium');
  const { createUnit } = await import('/src/sim/world.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  world.units.length = 0;
  const near = createUnit('warrior', 'ai', 1000, CONFIG.GROUND_Y);
  const far = createUnit('warrior', 'ai', 1060, CONFIG.GROUND_Y);
  const attackers = ['warrior', 'warrior', 'archer', 'archer'].map((kind) => createUnit(kind, 'player', 900, CONFIG.GROUND_Y));
  world.units.push(near, far, ...attackers);
  window.__forceTicks(1);
  window.__togglePause();
  return { nearId: near.id, farId: far.id, targets: attackers.map(({ kind, targetId }) => ({ kind, targetId })) };
})()`);
const counts = { near: result.targets.filter(({ targetId }) => targetId === result.nearId).length, far: result.targets.filter(({ targetId }) => targetId === result.farId).length };
if (counts.near !== 2 || counts.far !== 2) throw new Error(`Expected 2/2 distributed warrior/archer targets, got ${JSON.stringify({ result, counts })}`);
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
const screenshotPath = join('artifacts', 'screenshots', 'target-saturation-browser.png'); mkdirSync(join('artifacts', 'screenshots'), { recursive: true }); writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close(); if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`); console.log(JSON.stringify({ appUrl: APP_URL, ...result, counts, screenshotPath }, null, 2));
