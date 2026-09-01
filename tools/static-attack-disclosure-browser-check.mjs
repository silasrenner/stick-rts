import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9444);
const APP_URL = process.env.APP_URL || `http://192.168.86.75:8811/?static-attack-disclosure=${Date.now()}`;

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`CDP target failed: ${response.status}`);
  return response.json();
}

function connect(url) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) {
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') errors.push(message.params.entry.text);
      return;
    }
    const request = pending.get(message.id);
    pending.delete(message.id);
    message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
  };
  const ready = new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const requestId = ++id;
    pending.set(requestId, { resolve, reject });
    ws.send(JSON.stringify({ id: requestId, method, params }));
  });
  return { ws, ready, send, errors };
}

const target = await openTarget('about:blank');
const { ws, ready, send, errors } = connect(target.webSocketDebuggerUrl);
await ready;
await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 540, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP_URL });

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

for (let i = 0; i < 30; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__resetMatch') === 'function') break;
  if (i === 29) throw new Error('Game did not initialize.');
}

const results = [];
for (const kind of ['core', 'structure', 'turret']) {
  const result = await evaluate(`(async () => {
    window.__resetMatch('medium');
    const { createStructure, createTurret, createUnit } = await import('/src/sim/world.js');
    const { getPlayerAttackTargetRevealSources } = await import('/src/render/spectatorVision.js');
    const { CONFIG } = await import('/src/config.js');
    const world = window.__world;
    const targetX = 2700;
    world.units = [];
    world.structures = [];
    world.projectiles = [];
    world.ravens = [];
    world.statues.ai.x = 4900;
    let target;
    if ('${kind}' === 'core') {
      target = world.statues.ai;
      target.x = targetX;
    } else if ('${kind}' === 'structure') {
      target = createStructure('ai', targetX, CONFIG.GROUND_Y);
      world.structures.push(target);
    } else {
      target = createTurret('ai', targetX, CONFIG.GROUND_Y);
      world.structures.push(target);
    }
    const attacker = createUnit('archer', 'player', targetX - 500, CONFIG.GROUND_Y);
    world.units.push(attacker);
    window.__camera.zoom = 1;
    window.__camera.x = targetX - 700;
    window.__camera.targetX = window.__camera.x;
    window.__forceTicks(1);
    const calls = [];
    const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect = function(...args) { calls.push(args); return originalFillRect.apply(this, args); };
    try { window.__forceTicks(1); } finally { CanvasRenderingContext2D.prototype.fillRect = originalFillRect; }
    const healthGeometry = '${kind}' === 'core'
      ? [target.x - 20, target.y - 92, 40, 4]
      : '${kind}' === 'structure'
        ? [target.x - 12, target.y - 44, 24, 4]
        : [target.x - 17, target.y - 64, 34, 4];
    const healthBarDrawn = calls.some((args) => args.length === 4 && args.every((value, index) => value === healthGeometry[index]));
    const sources = getPlayerAttackTargetRevealSources(world);
    return { kind: '${kind}', targetId: target.id, attackerTargetId: attacker.targetId, targetHp: target.hp, source: sources.find((source) => source.entityId === target.id), healthBarDrawn };
  })()`);
  if (result.attackerTargetId !== result.targetId) throw new Error(`${kind} target acquisition failed: ${JSON.stringify(result)}`);
  if (!result.source) throw new Error(`${kind} attack disclosure source missing: ${JSON.stringify(result)}`);
  if (!result.healthBarDrawn) throw new Error(`${kind} health bar was not drawn: ${JSON.stringify(result)}`);
  results.push(result);
}

mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
const screenshotPath = join('artifacts', 'screenshots', 'static-attack-disclosure-browser.png');
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close();
if (errors.length) throw new Error(`Browser errors: ${JSON.stringify(errors)}`);
console.log(JSON.stringify({ appUrl: APP_URL, results, screenshotPath }, null, 2));
