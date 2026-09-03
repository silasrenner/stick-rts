import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const CDP_PORT = Number(process.env.CDP_PORT || 9445);
const APP_URL = process.env.APP_URL || `http://192.168.86.75:8813/?catapult-visual-density=${Date.now()}`;

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
  const resourceErrors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) {
      if (message.method === 'Runtime.exceptionThrown') pageErrors.push(message.params.exceptionDetails.text);
      if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') pageErrors.push(message.params.entry.text);
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400) resourceErrors.push({ status: message.params.response.status, url: message.params.response.url });
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
  return { ws, ready, send, pageErrors, resourceErrors };
}

const target = await openTarget('about:blank');
const { ws, ready, send, pageErrors, resourceErrors } = connect(target.webSocketDebuggerUrl);
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

for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate('typeof window.__resetMatch') === 'function') break;
  if (attempt === 29) throw new Error(`Game module did not initialize: ${JSON.stringify(pageErrors)}`);
}

const result = await evaluate(`(async () => {
  window.__resetMatch('medium');
  const { createProjectile, createUnit } = await import('/src/sim/world.js');
  const { updateFormationSlots } = await import('/src/sim/systems/formation.js');
  const { getBuildButtonRowRect, getQueueChipRowRect } = await import('/src/render/ui.js');
  const { CONFIG } = await import('/src/config.js');
  const world = window.__world;
  world.teams.player.gold = 10_000;
  const warrior = createUnit('warrior', 'player', 0, CONFIG.GROUND_Y);
  const archer = createUnit('archer', 'player', 0, CONFIG.GROUND_Y);
  const catapultA = createUnit('catapult', 'player', 0, CONFIG.GROUND_Y);
  const catapultB = createUnit('catapult', 'player', 0, CONFIG.GROUND_Y);
  const catapultC = createUnit('catapult', 'player', 0, CONFIG.GROUND_Y);
  const catapultD = createUnit('catapult', 'player', 0, CONFIG.GROUND_Y);
  const catapultE = createUnit('catapult', 'player', 0, CONFIG.GROUND_Y);
  const catapults = [catapultA, catapultB, catapultC, catapultD, catapultE];
  world.units.push(warrior, archer, ...catapults);
  updateFormationSlots(world);
  for (const unit of [warrior, archer, ...catapults]) {
    unit.x = unit.slotX;
    unit.y = unit.slotY;
  }
  const projectile = createProjectile('player', catapultA.x, catapultA.y - 65, catapultA.x + 220, catapultA.y - 65, null, catapultA.damage, catapultA.projectileSpeed, null, catapultA.projectileRadius);
  projectile.elapsed = projectile.duration / 2;
  world.projectiles.push(projectile);
  world.teams.player.productionQueue = [{ action: 'unit', kind: 'catapult', remaining: 12, total: 24 }];
  window.__camera.zoom = 1;
  window.__camera.x = 500;
  window.__camera.targetX = 500;
  const canvas = document.getElementById('game');
  return {
    scale: CONFIG.UNIT_STATS.catapult.renderScale,
    projectileSpeed: CONFIG.UNIT_STATS.catapult.projectileSpeed,
    projectileDuration: projectile.duration,
    catapultSlots: catapults.map(({ slotX, slotY }) => ({ slotX, slotY })),
    verticalSpacing: Math.abs(catapultA.slotY - catapultB.slotY),
    buildIconScale: CONFIG.BUILD_BUTTON_ICON_SCALE,
    queueChip: { width: CONFIG.QUEUE_CHIP_WIDTH, height: CONFIG.QUEUE_CHIP_HEIGHT },
    buildRow: getBuildButtonRowRect(canvas),
    queueRow: getQueueChipRowRect(canvas),
    queue: world.teams.player.productionQueue.map(({ action, kind, remaining, total }) => ({ action, kind, remaining, total })),
  };
})()`);

const expected = { scale: 2.25, projectileSpeed: 180, verticalSpacing: 52, buildIconScale: 0.24, queueChip: { width: 40, height: 24 } };
for (const [key, value] of Object.entries(expected)) {
  if (JSON.stringify(result[key]) !== JSON.stringify(value)) throw new Error(`Browser Catapult visual-density contract failed for ${key}: ${JSON.stringify(result)}`);
}
if (result.catapultSlots.length !== 5 || new Set(result.catapultSlots.slice(0, 4).map(({ slotX }) => slotX)).size !== 1 || new Set(result.catapultSlots.slice(0, 4).map(({ slotY }) => slotY)).size !== 4 || result.catapultSlots[4].slotX === result.catapultSlots[0].slotX || result.catapultSlots[4].slotY !== result.catapultSlots[0].slotY) throw new Error(`Browser Catapult four-per-rank fixture failed: ${JSON.stringify(result)}`);
if (result.queueRow.h !== 24 || result.queueRow.y !== result.buildRow.y - 28 || result.queue[0]?.kind !== 'catapult') throw new Error(`Browser queue presentation fixture failed: ${JSON.stringify(result)}`);

mkdirSync(join('artifacts', 'screenshots'), { recursive: true });
const screenshotPath = join('artifacts', 'screenshots', 'catapult-visual-density-browser.png');
const screenshot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(screenshotPath, screenshot.data, 'base64');
ws.close();
const unexpectedResources = resourceErrors.filter(({ url }) => !url.endsWith('/favicon.ico'));
const unexpectedLogs = pageErrors.filter((error) => error !== 'Failed to load resource: the server responded with a status of 404 (File not found)');
if (unexpectedResources.length || unexpectedLogs.length) throw new Error(`Browser errors: ${JSON.stringify({ unexpectedResources, unexpectedLogs })}`);
console.log(JSON.stringify({ appUrl: APP_URL, result, screenshotPath, knownFavicon404: resourceErrors.filter(({ url }) => url.endsWith('/favicon.ico')) }, null, 2));
